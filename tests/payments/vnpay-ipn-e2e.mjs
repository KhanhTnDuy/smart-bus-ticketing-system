// SCRUM-105: kiểm thử đầu-cuối đường IPN của VNPay.
//
// Kịch bản tự khởi động một backend riêng (cổng 5181) với TmnCode/HashSecret **thử**, đặt một lượt vé, bắt đầu
// thanh toán VNPay, rồi gửi một lời gọi IPN ký đúng như VNPay gửi và kiểm tra giao dịch được chốt đúng.
//
//   CONFIRM_TEST_DB=1 node tests/payments/vnpay-ipn-e2e.mjs
//
// Khi đã dựng địa chỉ công khai (backend/scripts/ipn-tunnel.sh), đặt PUBLIC_BASE_URL để gọi IPN qua đúng
// đường mà VNPay sandbox sẽ đi — đây là phép kiểm chứng minh IPN từ ngoài vào tới được backend:
//
//   CONFIRM_TEST_DB=1 PUBLIC_BASE_URL=https://<đường hầm> IPN_PORT=5180 node tests/payments/vnpay-ipn-e2e.mjs
//
// Có PUBLIC_BASE_URL thì kịch bản dùng backend đang chạy ở IPN_PORT (mặc định 5180) thay vì tự khởi động,
// vì đường hầm trỏ vào cổng đó; backend ấy phải được cấu hình TmnCode/HashSecret và đặt VNPAY_HASH_SECRET
// cho kịch bản để ký đúng.
import { spawn, spawnSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const api = path.join(root, 'backend/SmartBusTicketing.Api');

const PUBLIC_BASE = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, '') || '';
const PORT = Number(process.env.IPN_PORT || (PUBLIC_BASE ? 5180 : 5181));
const LOCAL = `http://127.0.0.1:${PORT}`;
const TMN_CODE = process.env.VNPAY_TMN_CODE || 'TEST0001';
const HASH_SECRET = process.env.VNPAY_HASH_SECRET || 'TESTHASHSECRETFORLOCALIPNCHECK0123456789';

let child = null;
const waitHealth = async (seconds) => {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${LOCAL}/api/health`);
      if (r.ok) return true;
    } catch { /* chưa mở cổng */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};

if (PUBLIC_BASE) {
  if (!(await waitHealth(5))) {
    console.error(`Backend chưa chạy ở ${LOCAL}. Đường hầm trỏ vào cổng này nên phải khởi động nó trước.`);
    process.exit(2);
  }
} else {
  child = spawn('dotnet', ['run', '--no-build', '--no-launch-profile'], {
    cwd: api,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ASPNETCORE_ENVIRONMENT: 'Development',
      ASPNETCORE_URLS: LOCAL,
      Payments__VnPay__TmnCode: TMN_CODE,
      Payments__VnPay__HashSecret: HASH_SECRET,
      Payments__Simulator__Enabled: 'true',
    },
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  if (!(await waitHealth(90))) {
    console.error('Không khởi động được backend thử ở cổng ' + PORT);
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    process.exit(2);
  }
}

const stopChild = () => {
  if (child && child.exitCode === null) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
};

process.env.API_URL = LOCAL;
const { sec, check, is, ok, sql, call, login, createPassengers, futureTrips, freeSeats, endStops, finish } =
  await import('../regression/lib.mjs');

/** Ký chuỗi query đúng cách VNPay làm: sắp khóa theo thứ tự byte, nối key=value đã mã hóa, HMAC-SHA512. */
const sign = (params) => {
  const data = Object.keys(params).sort()
    .filter((k) => params[k] !== '' && params[k] !== undefined)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)
    .join('&');
  const hash = createHmac('sha512', HASH_SECRET).update(data, 'utf8').digest('hex');
  return `${data}&vnp_SecureHash=${hash}`;
};

const vnTime = (d = new Date()) => {
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${vn.getUTCFullYear()}${p(vn.getUTCMonth() + 1)}${p(vn.getUTCDate())}${p(vn.getUTCHours())}${p(vn.getUTCMinutes())}${p(vn.getUTCSeconds())}`;
};

// Địa chỉ gọi IPN: qua đường hầm nếu có, vì đó mới là đường VNPay thật sự đi.
const ipnBase = PUBLIC_BASE || LOCAL;
const callIpn = async (params) => {
  const r = await fetch(`${ipnBase}/api/payments/vnpay/ipn?${sign(params)}`);
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { /* không phải JSON */ }
  return { s: r.status, j, t };
};

try {
  const admin = await login('admin');
  const [pax] = await createPassengers(admin, 1);
  const [TRIP] = futureTrips(1);
  if (!TRIP) { console.error('Không có chuyến nào còn ở tương lai trong CSDL demo.'); finish(); stopChild(); process.exit(2); }

  const [seat] = await freeSeats(TRIP, 1);
  const { board, alight } = endStops(TRIP);

  sec('0. Đường đi của IPN');
  console.log(`  backend ${LOCAL}, IPN gọi qua ${ipnBase}${PUBLIC_BASE ? ' (địa chỉ công khai)' : ' (nội bộ)'}`);
  const health = await fetch(`${ipnBase}/api/health`).then((r) => r.json()).catch(() => null);
  check('Địa chỉ dùng cho IPN tới được backend', health?.status === 'ok', JSON.stringify(health));

  sec('1. Tạo lượt đặt và bắt đầu thanh toán VNPay');
  const b = await call(pax.token, 'POST', '/api/bookings', { tripId: TRIP, seatIds: [seat.seatId], boardStopId: board, alightStopId: alight });
  check('Đặt giữ chỗ thành công', ok(b), `HTTP ${b.s} ${b.t.slice(0, 120)}`);
  const bookingId = b.j.bookingId;

  const pay = await call(pax.token, 'POST', '/api/payments', { bookingId, method: 1 });
  check('Tạo giao dịch VNPay thành công', ok(pay), `HTTP ${pay.s} ${pay.t.slice(0, 160)}`);
  is('Giao dịch ở trạng thái chờ', pay.j?.status, 'Pending');
  check('Có địa chỉ thanh toán của ngân hàng', typeof pay.j?.paymentUrl === 'string' && pay.j.paymentUrl.includes('vnp_SecureHash'),
    String(pay.j?.paymentUrl).slice(0, 80));
  const txnRef = pay.j.reference;
  const amount = Number(pay.j.amount);

  const ipnParams = (over = {}) => ({
    vnp_Amount: String(Math.round(amount) * 100),
    vnp_BankCode: 'NCB',
    vnp_OrderInfo: `SB${bookingId}`,
    vnp_PayDate: vnTime(),
    vnp_ResponseCode: '00',
    vnp_TmnCode: TMN_CODE,
    vnp_TransactionNo: '14200001',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: txnRef,
    ...over,
  });

  sec('2. IPN chốt giao dịch');
  const ipn = await callIpn(ipnParams());
  is('IPN trả HTTP 200', ipn.s, 200);
  is('IPN trả RspCode 00 (Confirm Success)', ipn.j?.RspCode, '00');
  is('Lượt đặt chuyển sang Confirmed', sql(`select Status from bookings where Id=${bookingId}`), 'Confirmed');
  is('Giao dịch chuyển sang Success', sql(`select Status from payments where TxnRef='${txnRef}'`), 'Success');
  is('Vé chuyển sang Valid', sql(`select Status from tickets where BookingId=${bookingId}`), 'Valid');
  is('Có hóa đơn cho giao dịch', sql(`select count(*) from invoices i join payments p on p.Id=i.PaymentId where p.TxnRef='${txnRef}'`), '1');
  is('Ghi đúng mã giao dịch của VNPay', sql(`select ProviderTxnId from payments where TxnRef='${txnRef}'`), '14200001');

  sec('3. VNPay gọi lại cùng một IPN');
  const again = await callIpn(ipnParams());
  is('Lần gọi thứ hai trả RspCode 02 (đã chốt)', again.j?.RspCode, '02');
  is('Không sinh thêm hóa đơn', sql(`select count(*) from invoices i join payments p on p.Id=i.PaymentId where p.TxnRef='${txnRef}'`), '1');
  is('Không sinh thêm vé', sql(`select count(*) from tickets where BookingId=${bookingId}`), '1');

  sec('4. IPN không đáng tin thì không chốt');
  const badHash = await fetch(`${ipnBase}/api/payments/vnpay/ipn?${sign(ipnParams({ vnp_TxnRef: `${txnRef}X` }))}&vnp_SecureHash=sai`)
    .then(async (r) => ({ s: r.status, j: await r.json().catch(() => null) }));
  is('Chữ ký sai -> RspCode 97', badHash.j?.RspCode, '97');
  const unknown = await callIpn(ipnParams({ vnp_TxnRef: `${txnRef}-khong-co-that` }));
  is('Mã giao dịch lạ -> RspCode 01', unknown.j?.RspCode, '01');

  finish();
} finally {
  stopChild();
}
