// Kiểm thử thanh toán VNPay trên SANDBOX THẬT (khác vnpay-ipn-e2e.mjs: kịch bản kia tự ký IPN bằng khóa thử).
//
// Cần backend ĐANG CHẠY với TmnCode/HashSecret sandbox thật (dotnet user-secrets hoặc biến môi trường
// Payments__VnPay__TmnCode, Payments__VnPay__HashSecret), có mạng internet, và CSDL dev/thử. Kịch bản chỉ gọi API
// của backend, không đọc khóa và không đụng thẳng vào CSDL. Chi tiết cách chạy: docs/VNPAY-SANDBOX.md.
//
//   node tests/payments/vnpay-sandbox-e2e.mjs                 # đặt vé, kiểm tra chữ ký với sandbox, chờ bạn trả tiền
//   node tests/payments/vnpay-sandbox-e2e.mjs --refund        # sau khi trả tiền xong thì hủy vé và kiểm tra hoàn tiền qua API VNPay
//
// Các bước:
//   1. Đặt một ghế rồi bắt đầu thanh toán VNPay, lấy URL sang cổng.
//   2. Gọi thử URL đó vào sandbox: sai chữ ký, sai TmnCode hay sai định dạng thì sandbox chuyển sang trang lỗi
//      (Error.html?code=...) ngay, không cần nhập thẻ. Bước này tự động.
//   3. In URL để BẠN mở trong trình duyệt đã đăng nhập hành khách (frontend), trả tiền bằng thẻ thử của sandbox.
//      Nhập thẻ phải làm tay: đó là trang của VNPay.
//   4. Chờ giao dịch được chốt (IPN hoặc ReturnUrl), rồi kiểm tra giao dịch, hóa đơn và vé.
//   5. Với --refund: hành khách xin hủy vé, quản lý duyệt, chờ hệ thống hoàn tiền qua API hoàn tiền của VNPay.
//
// Biến môi trường: API_URL (mặc định http://localhost:5180), SEED_PASSWORD, PASSENGER_USER, MANAGER_USER.
// Tùy chọn: --wait <phút> (mặc định 10), --from <trạm> --to <trạm> (mặc định 1 và 4, tuyến 1 của bộ demo).

const API = (process.env.API_URL || 'http://localhost:5180').replace(/\/+$/, '');
const PASSWORD = process.env.SEED_PASSWORD || 'Admin@12345';
const PASSENGER = process.env.PASSENGER_USER || 'passenger1';
const MANAGER = process.env.MANAGER_USER || 'manager';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const WAIT_MINUTES = Number(opt('--wait', '10'));
const FROM = opt('--from', '1');
const TO = opt('--to', '4');
const VNPAY_METHOD = 1; // PaymentMethod.VnPay

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg, code = 1) => {
  console.error(`\n  LỖI  ${msg}`);
  process.exit(code);
};
let passed = 0;
const ok = (msg) => {
  passed++;
  console.log(`  ok   ${msg}`);
};

async function call(token, method, path, body) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch { /* không phải JSON */ }
  return { status: res.status, json, text };
}

async function login(identity) {
  const r = await call(null, 'POST', '/api/auth/login', { identity, password: PASSWORD });
  const token = r.json?.token ?? r.json?.accessToken;
  if (!token) fail(`Không đăng nhập được ${identity}: HTTP ${r.status}. Đặt SEED_PASSWORD đúng với CSDL đang dùng.`, 2);
  return token;
}

// Mã lỗi sandbox trả ở trang Error.html khi yêu cầu thanh toán bị từ chối ngay từ đầu.
const SANDBOX_ERRORS = {
  '02': 'TmnCode không hợp lệ: kiểm tra Payments:VnPay:TmnCode khớp email VNPay gửi.',
  '03': 'Dữ liệu gửi sang sai định dạng.',
  '70': 'Sai chữ ký: kiểm tra Payments:VnPay:HashSecret (không thừa dấu cách, đúng khóa của TmnCode này).',
};

console.log(`Backend: ${API}`);
try {
  const health = await fetch(`${API}/api/health`);
  if (!health.ok) throw new Error(`HTTP ${health.status}`);
} catch (e) {
  fail(`Không gọi được backend tại ${API}: ${e.message}`, 2);
}

const passengerToken = await login(PASSENGER);
ok(`Đăng nhập hành khách ${PASSENGER}`);

// --- 1. Đặt vé và bắt đầu thanh toán VNPay ---------------------------------------------------------------------------
let trip = null;
// Từ ngày mai: chuyến trong ngày có thể đã khởi hành (API tìm kiếm vẫn trả về) và khi đó không đặt được.
for (let d = 1; d <= 14 && !trip; d++) {
  const date = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const r = await call(null, 'GET', `/api/trips/search?from=${FROM}&to=${TO}&date=${date}`);
  trip = (r.json ?? []).find((t) => t.availableSeats > 0 && /^scheduled$/i.test(t.status)) ?? null;
}
if (!trip) fail(`Không tìm thấy chuyến còn ghế từ trạm ${FROM} đến trạm ${TO} trong 14 ngày tới (nạp lại dữ liệu demo hoặc đổi --from/--to).`, 2);

const seat = ((await call(null, 'GET', `/api/trips/${trip.tripId}/seats`)).json ?? []).find((s) => s.isAvailable);
if (!seat) fail(`Chuyến ${trip.tripId} không còn ghế trống.`, 2);

const booking = await call(passengerToken, 'POST', '/api/bookings', {
  tripId: trip.tripId, seatIds: [seat.seatId], boardStopId: Number(FROM), alightStopId: Number(TO),
});
if (booking.status >= 300) fail(`Đặt vé lỗi: HTTP ${booking.status} ${booking.text.slice(0, 200)}`);
const bookingId = booking.json.bookingId;
ok(`Đặt ghế ${seat.seatCode} chuyến ${trip.tripCode} (${trip.departureDate} ${trip.departureTime})`);

const pay = await call(passengerToken, 'POST', '/api/payments', { bookingId, method: VNPAY_METHOD });
if (pay.status === 503) {
  await call(passengerToken, 'POST', `/api/bookings/${bookingId}/cancel`);
  fail(`${pay.json?.message ?? 'Backend chưa cấu hình VNPay.'}\nĐặt TmnCode/HashSecret rồi khởi động lại backend (xem docs/VNPAY-SANDBOX.md).`, 2);
}
if (pay.status >= 300 || !pay.json?.paymentUrl) fail(`Bắt đầu thanh toán lỗi: HTTP ${pay.status} ${pay.text.slice(0, 200)}`);
const payment = pay.json;
ok(`Tạo giao dịch VNPay #${payment.id}, mã tham chiếu ${payment.reference}, ${payment.amount} VND`);

// --- 2. Sandbox có chấp nhận yêu cầu (chữ ký, TmnCode, định dạng) không ---------------------------------------------------
let probe;
try {
  probe = await fetch(payment.paymentUrl, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
} catch (e) {
  await call(passengerToken, 'POST', `/api/bookings/${bookingId}/cancel`);
  fail(`Không gọi được sandbox VNPay (${new URL(payment.paymentUrl).host}): ${e.message}. Kiểm tra mạng.`, 2);
}
const location = probe.headers.get('location') ?? '';
if (/error\.html/i.test(location)) {
  const code = new URL(location, payment.paymentUrl).searchParams.get('code') ?? '?';
  await call(passengerToken, 'POST', `/api/bookings/${bookingId}/cancel`);
  fail(`Sandbox VNPay từ chối yêu cầu thanh toán, mã ${code}: ${SANDBOX_ERRORS[code] ?? 'xem bảng mã lỗi trong tài liệu VNPay.'}`);
}
if (probe.status >= 400) fail(`Sandbox VNPay trả HTTP ${probe.status} cho URL thanh toán.`);
ok('Sandbox VNPay chấp nhận yêu cầu (chữ ký, TmnCode và định dạng đều đúng)');

// --- 3. Chờ khách trả tiền --------------------------------------------------------------------------------------------
console.log(`
  Mở URL dưới đây trong trình duyệt ĐÃ ĐĂNG NHẬP hành khách ${PASSENGER} ở frontend (http://localhost:5173), chọn ngân hàng
  NCB và trả bằng thẻ thử của sandbox (xem docs/VNPAY-SANDBOX.md). Sau khi trả, VNPay đưa trình duyệt về
  /passenger/payment-result để hệ thống chốt giao dịch. Đang chờ tối đa ${WAIT_MINUTES} phút...

${payment.paymentUrl}
`);

const deadline = Date.now() + WAIT_MINUTES * 60000;
let settled = payment;
while (Date.now() < deadline) {
  const r = await call(passengerToken, 'GET', `/api/payments/${payment.id}`);
  if (r.status === 200 && r.json.status !== 'Pending') {
    settled = r.json;
    break;
  }
  await sleep(3000);
}
if (settled.status === 'Pending') fail(`Hết ${WAIT_MINUTES} phút mà giao dịch vẫn chờ. Nếu đã trả tiền, kiểm tra trình duyệt có đăng nhập hành khách không (trang kết quả cần đăng nhập).`);
if (settled.status === 'Failed') fail(`Giao dịch thất bại: ${settled.failureReason ?? 'không rõ lý do'}.`);
if (settled.status !== 'Success') fail(`Trạng thái giao dịch không như mong đợi: ${settled.status}.`);
ok(`Giao dịch được chốt Success, mã VNPay ${settled.providerTxnId}`);

// --- 4. Kiểm tra kết quả sau khi chốt --------------------------------------------------------------------------------
if (settled.invoiceNo) ok(`Đã tạo hóa đơn ${settled.invoiceNo}`);
else fail('Giao dịch Success nhưng chưa có hóa đơn.');

const mine = (await call(passengerToken, 'GET', '/api/bookings/my')).json ?? [];
const ticket = mine.find((t) => t.bookingId === bookingId);
if (!ticket) fail('Không thấy vé của lượt đặt trong /api/bookings/my.');
if (ticket.status !== 'Valid') fail(`Vé có trạng thái ${ticket.status}, mong Valid.`);
ok(`Vé ${ticket.seatCode} đã hiệu lực, có mã QR`);

// --- 5. Hủy vé và hoàn tiền qua API VNPay ------------------------------------------------------------------------------
if (flag('--refund')) {
  const managerToken = await login(MANAGER);
  const cancel = await call(passengerToken, 'POST', `/api/tickets/${ticket.ticketId}/cancel`, { reason: 'Kiểm thử hoàn tiền VNPay sandbox' });
  if (cancel.status >= 300) fail(`Xin hủy vé lỗi: HTTP ${cancel.status} ${cancel.text.slice(0, 200)}`);
  const approve = await call(managerToken, 'POST', `/api/ticket-change-requests/${cancel.json.changeRequestId}/approve`);
  if (approve.status >= 300) fail(`Duyệt hủy vé lỗi: HTTP ${approve.status} ${approve.text.slice(0, 200)}`);
  ok('Hành khách xin hủy vé, quản lý đã duyệt');

  // Vòng nền hoàn tiền chạy mỗi 10 giây, nên chờ đủ vài vòng.
  let refund = null;
  for (let i = 0; i < 40; i++) {
    const list = (await call(managerToken, 'GET', '/api/refunds')).json ?? [];
    refund = list.find((r) => r.paymentId === payment.id) ?? null;
    if (refund && (refund.status !== 'Pending' || refund.needsManual)) break;
    await sleep(3000);
  }
  if (!refund) fail('Chưa thấy khoản hoàn nào cho giao dịch này.');
  if (refund.status === 'Success') ok(`VNPay đã hoàn ${refund.amount} VND (khoản hoàn #${refund.id})`);
  else fail(`Khoản hoàn #${refund.id} ở trạng thái ${refund.status}${refund.needsManual ? ' (cần xử lý tay)' : ''}: ${refund.note ?? 'không có ghi chú'}\nNếu sandbox báo không tìm thấy giao dịch gốc, thử đổi Payments:VnPay:RefundDateSource sang Pay.`);
}

console.log(`\n==== ${passed} bước đạt ====`);
