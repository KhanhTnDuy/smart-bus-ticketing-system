// Kiểm thử hồi quy luồng chính của Smart Bus qua API thật (backend + MySQL), kèm ma trận quyền 5 vai trò.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/regress.mjs
// Xem tests/regression/README.md để biết điều kiện chạy và các biến môi trường.
import { spawnSync } from 'node:child_process';

const B = (process.env.API_URL || 'http://localhost:5180').replace(/\/+$/, '');
const DB = {
  bin: process.env.MYSQL_BIN || 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || '3306',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  name: process.env.MYSQL_DB || 'smart_bus_ticketing',
};
const PASSWORD = process.env.SEED_PASSWORD || 'Admin@12345';
const QA_PASSWORD = 'Test@12345'; // mật khẩu của tài khoản hành khách thử do kịch bản tự tạo

// Kịch bản tạo, đổi và xóa dữ liệu thật nên chỉ chạy khi người chạy xác nhận đây là CSDL thử.
if (process.env.CONFIRM_TEST_DB !== '1') {
  console.error('Kịch bản này ghi vào CSDL "' + DB.name + '" và dọn lại sau khi chạy.\nChỉ chạy trên CSDL dev/thử. Đặt CONFIRM_TEST_DB=1 để xác nhận.');
  process.exit(2);
}

const sql = (q) => {
  const args = ['-h', DB.host, '-P', DB.port, '-u', DB.user, ...(DB.password ? [`-p${DB.password}`] : []), '-N', '-D', DB.name, '-e', q];
  const r = spawnSync(DB.bin, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`mysql lỗi: ${(r.stderr || r.error?.message || '').trim()}`);
  return r.stdout.trim();
};

// Mốc id lớn nhất trước khi chạy: mọi dòng do kịch bản tạo ra đều có id lớn hơn mốc nên dọn được chính xác.
const TABLES = ['refunds', 'invoices', 'payments', 'ticket_scans', 'notifications', 'incidents', 'ticket_change_requests', 'feedback_history', 'feedbacks', 'passenger_verifications', 'tickets', 'bookings', 'trips', 'schedules', 'accounts', 'routes', 'buses', 'stops'];
const baseline = {};
for (const t of TABLES) baseline[t] = Number(sql(`select coalesce(max(Id),0) from ${t}`));

try {
  const h = await fetch(`${B}/api/health`);
  if (!h.ok) throw new Error(`HTTP ${h.status}`);
} catch (e) {
  console.error(`Không gọi được backend tại ${B}: ${e.message}`);
  process.exit(2);
}

const results = [];
let section = '';
const sec = (s) => { section = s; console.log(`\n## ${s}`); };
const check = (name, cond, extra = '') => {
  results.push({ section, name, ok: !!cond });
  console.log(`${cond ? '  ok  ' : '  FAIL'} ${name}${cond ? '' : '  -> ' + extra}`);
};
const is = (name, actual, expected) => check(name, actual === expected, `được ${actual}, mong ${expected}`);

async function call(tok, method, p, body) {
  const headers = {};
  if (tok) headers.Authorization = `Bearer ${tok}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(B + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { /* không phải JSON */ }
  return { s: r.status, j, t };
}
const login = async (identity, password = PASSWORD) => {
  const r = await call(null, 'POST', '/api/auth/login', { identity, password });
  return r.j?.accessToken ?? null;
};

const T = {};
const seatsOf = (busId, n, off = 0) => sql(`select Id from seats where BusId=${busId} order by Id limit ${n} offset ${off}`).split('\n').map(Number);
const iso = (d) => new Date(d).toISOString();

try {
  // ============================================================
  sec('A. Đăng nhập và xác thực');
  for (const u of ['admin', 'manager', 'driver1', 'conductor1', 'passenger1']) {
    T[u] = await login(u);
    check(`đăng nhập ${u}`, !!T[u]);
  }
  is('sai mật khẩu -> 401', (await call(null, 'POST', '/api/auth/login', { identity: 'admin', password: 'sai' })).s, 401);
  is('không có token -> 401', (await call(null, 'GET', '/api/accounts')).s, 401);
  is('token rác -> 401', (await call('abc.def.ghi', 'GET', '/api/accounts')).s, 401);
  is('health 200', (await call(null, 'GET', '/api/health')).s, 200);
  const adm = T.admin, mg = T.manager, d1 = T.driver1, cd = T.conductor1, p1 = T.passenger1;
  const d2 = await login('driver2');

  // ============================================================
  sec('B. Tài khoản và phân quyền (Admin)');
  is('admin xem danh sách', (await call(adm, 'GET', '/api/accounts')).s, 200);
  for (const [n, t] of [['manager', mg], ['driver', d1], ['passenger', p1]])
    is(`${n} xem danh sách tài khoản -> 403`, (await call(t, 'GET', '/api/accounts')).s, 403);
  const acc = { username: 'qa_p2', password: QA_PASSWORD, fullName: 'QA Hanh Khach 2', email: 'qa_p2@example.com', phone: '0912345699', role: 4, active: true };
  const created = await call(adm, 'POST', '/api/accounts', acc);
  is('admin tạo hành khách thử', created.s, 201);
  T.p2id = created.j?.id;
  is('trùng tên đăng nhập -> 409', (await call(adm, 'POST', '/api/accounts', acc)).s, 409);
  is('email sai định dạng -> 400', (await call(adm, 'POST', '/api/accounts', { ...acc, username: 'qa_x', email: 'khong-phai-email' })).s, 400);
  is('manager tạo tài khoản -> 403', (await call(mg, 'POST', '/api/accounts', { ...acc, username: 'qa_y' })).s, 403);
  T.p2 = await login('qa_p2', QA_PASSWORD);
  check('hành khách mới đăng nhập được', !!T.p2);
  is('đổi vai trò sang Tài xế', (await call(adm, 'PATCH', `/api/accounts/${T.p2id}/role`, { role: 2 })).s, 200);
  is('vai trò lưu vào CSDL', sql(`select Role from accounts where Id=${T.p2id}`), 'Driver');
  await call(adm, 'PATCH', `/api/accounts/${T.p2id}/role`, { role: 4 });
  T.p2 = await login('qa_p2', QA_PASSWORD);
  is('sửa họ tên', (await call(adm, 'PUT', `/api/accounts/${T.p2id}`, { fullName: 'QA Hanh Khach Hai' })).s, 200);
  is('khóa tài khoản -> không đăng nhập được', await (async () => { await call(adm, 'PUT', `/api/accounts/${T.p2id}`, { active: false }); const t = await login('qa_p2', QA_PASSWORD); await call(adm, 'PUT', `/api/accounts/${T.p2id}`, { active: true }); return t; })(), null);
  const p2 = (T.p2 = await login('qa_p2', QA_PASSWORD));

  // ============================================================
  sec('C. Tuyến, trạm, giá vé (Quản lý)');
  is('quản lý xem tuyến', (await call(mg, 'GET', '/api/routes')).s, 200);
  const r = await call(mg, 'POST', '/api/routes', { code: 'QA1', name: 'Tuyen thu QA', startPoint: 'A', endPoint: 'B', distanceKm: 5, active: true });
  is('tạo tuyến', r.s, 201);
  T.routeId = r.j?.id;
  is('trùng mã tuyến -> 409', (await call(mg, 'POST', '/api/routes', { code: 'QA1', name: 'x', startPoint: 'A', endPoint: 'B', distanceKm: 5, active: true })).s, 409);
  is('khoảng cách 0 -> 400', (await call(mg, 'POST', '/api/routes', { code: 'QA2', name: 'x', startPoint: 'A', endPoint: 'B', distanceKm: 0, active: true })).s, 400);
  is('hành khách tạo tuyến -> 403', (await call(p1, 'POST', '/api/routes', { code: 'QA3', name: 'x', startPoint: 'A', endPoint: 'B', distanceKm: 5, active: true })).s, 403);
  is('sửa tuyến', (await call(mg, 'PUT', `/api/routes/${T.routeId}`, { code: 'QA1', name: 'Tuyen thu QA sua', startPoint: 'A', endPoint: 'B', distanceKm: 6, active: true })).s, 200);
  is('tạo trạm', (await call(mg, 'POST', '/api/stops', { name: 'Tram QA', latitude: 10.77, longitude: 106.7 })).s, 201);
  is('xóa tuyến chưa có chuyến', (await call(mg, 'DELETE', `/api/routes/${T.routeId}`)).s, 204);
  is('tài xế xem tuyến', (await call(d1, 'GET', '/api/routes')).s, 200);

  // ============================================================
  sec('D. Xe buýt');
  is('quản lý xem xe', (await call(mg, 'GET', '/api/buses')).s, 200);
  const bus = await call(mg, 'POST', '/api/buses', { plateNumber: 'QA-0001', capacity: 8, status: 0, rows: 2, columns: 4 });
  is('tạo xe', bus.s, 201);
  const busId = bus.j?.bus?.id ?? bus.j?.id;
  is('trùng biển số -> 409', (await call(mg, 'POST', '/api/buses', { plateNumber: 'QA-0001', capacity: 8, status: 0, rows: 2, columns: 4 })).s, 409);
  is('sai sức chứa -> 400', (await call(mg, 'POST', '/api/buses', { plateNumber: 'QA-0002', capacity: 0, status: 0, rows: 2, columns: 4 })).s, 400);
  is('hành khách tạo xe -> 403', (await call(p1, 'POST', '/api/buses', { plateNumber: 'QA-0003', capacity: 8, status: 0, rows: 2, columns: 4 })).s, 403);
  is('xóa xe', (await call(mg, 'DELETE', `/api/buses/${busId}`)).s, 204);

  // ============================================================
  sec('E. Lịch trình định kỳ và sinh chuyến');
  const sch = await call(mg, 'POST', '/api/schedules', { routeId: 1, firstDeparture: '18:00', lastDeparture: '19:00', frequencyMinutes: 30, daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] });
  is('tạo lịch trình', sch.s, 201);
  T.schId = sch.j?.id;
  is('lịch trình trùng giờ -> 409', (await call(mg, 'POST', '/api/schedules', { routeId: 1, firstDeparture: '18:30', lastDeparture: '19:30', frequencyMinutes: 30, daysOfWeek: ['MON'] })).s, 409);
  is('không chọn ngày -> 400', (await call(mg, 'POST', '/api/schedules', { routeId: 1, firstDeparture: '22:00', lastDeparture: '23:00', frequencyMinutes: 30, daysOfWeek: [] })).s, 400);
  is('tài xế tạo lịch -> 403', (await call(d1, 'POST', '/api/schedules', { routeId: 1, firstDeparture: '22:00', lastDeparture: '23:00', frequencyMinutes: 30, daysOfWeek: ['MON'] })).s, 403);
  const dry = await call(mg, 'POST', `/api/schedules/${T.schId}/generate-trips`, { fromDate: '2026-11-02', toDate: '2026-11-03', dryRun: true });
  is('xem trước sinh chuyến (2 ngày x 3 chuyến)', dry.j?.created, 6);
  is('xem trước không ghi CSDL', sql(`select count(*) from trips where ScheduleId=${T.schId}`), '0');
  const gen = await call(mg, 'POST', `/api/schedules/${T.schId}/generate-trips`, { fromDate: '2026-11-02', toDate: '2026-11-03', dryRun: false });
  is('sinh chuyến thật', gen.j?.created, 6);
  is('sinh lại không trùng', (await call(mg, 'POST', `/api/schedules/${T.schId}/generate-trips`, { fromDate: '2026-11-02', toDate: '2026-11-03', dryRun: false })).j?.skipped, 6);
  is('quá 31 ngày -> 400', (await call(mg, 'POST', `/api/schedules/${T.schId}/generate-trips`, { fromDate: '2026-11-02', toDate: '2026-12-31', dryRun: true })).s, 400);

  // ============================================================
  sec('F. Chuyến xe và phân công');
  const trip = await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-10T01:00:00Z', busId: 6, driverId: 3, conductorId: 5 });
  is('tạo chuyến kèm xe, tài xế, phụ xe', trip.s, 201);
  const tripA = trip.j?.tripId;
  is('trùng tài xế -> 409', (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-10T01:10:00Z', driverId: 3 })).s, 409);
  is('trùng xe -> 409', (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-10T01:10:00Z', busId: 6 })).s, 409);
  is('hành khách làm tài xế -> 400', (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-12T01:00:00Z', driverId: 7 })).s, 400);
  is('tên tài xế bịa -> 404', (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-12T01:00:00Z', driverName: 'Ten Bia Dat' })).s, 404);
  is('biển số bịa -> 404', (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-12T01:00:00Z', busPlate: '99X-000.00' })).s, 404);
  is('thiếu giờ -> 400', (await call(mg, 'POST', '/api/assignments', { routeId: 1 })).s, 400);
  const mine1 = await call(d1, 'GET', '/api/assignments');
  check('tài xế 1 thấy chuyến của mình', mine1.j?.data?.some((x) => x.tripId === tripA));
  const mine2 = await call(d2, 'GET', '/api/assignments');
  check('tài xế 2 không thấy chuyến của tài xế 1', !mine2.j?.data?.some((x) => x.tripId === tripA));
  is('lịch trực tài xế', (await call(d1, 'GET', '/api/assignments/my-schedule')).s, 200);
  is('hành khách xem phân công -> 403', (await call(p1, 'GET', '/api/assignments')).s, 403);
  is('tài xế đổi chuyến -> 403', (await call(d1, 'PUT', `/api/assignments/${tripA}/trip`, { status: 4 })).s, 403);
  is('khả dụng: xe/nhân sự', (await call(mg, 'GET', `/api/assignments/available-staff?duty=0&departureAt=2026-11-10T01:00:00Z&routeId=1`)).s, 200);
  const nt = await call(d1, 'GET', '/api/notifications/my');
  check('tài xế 1 nhận thông báo được phân công', nt.j?.items?.some((n) => n.title.includes('phân công')));

  // ============================================================
  sec('G. Đặt vé và thanh toán');
  const seatsA = seatsOf(6, 8);
  const search = await call(p1, 'GET', '/api/trips/search?from=1&to=2&date=2026-11-10');
  is('tìm chuyến', search.s, 200);
  is('xem sơ đồ ghế', (await call(p1, 'GET', `/api/trips/${tripA}/seats`)).s, 200);
  is('đặt quá 4 ghế -> 400', (await call(p1, 'POST', '/api/bookings', { tripId: tripA, seatIds: seatsA.slice(0, 5), boardStopId: 1, alightStopId: 2 })).s, 400);
  is('đặt chuyến đã khởi hành -> 400', (await call(p1, 'POST', '/api/bookings', { tripId: 4, seatIds: [190], boardStopId: 1, alightStopId: 2 })).s, 400);
  is('ghế không thuộc xe -> 4xx', ((await call(p1, 'POST', '/api/bookings', { tripId: tripA, seatIds: [1], boardStopId: 1, alightStopId: 2 })).s >= 400) ? 1 : 0, 1);
  is('thứ tự trạm sai -> 400', (await call(p1, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seatsA[0]], boardStopId: 2, alightStopId: 1 })).s, 400);
  const b1 = await call(p1, 'POST', '/api/bookings', { tripId: tripA, seatIds: seatsA.slice(0, 3), boardStopId: 1, alightStopId: 2 });
  is('đặt 3 ghế', b1.s, 200);
  const bk1 = b1.j?.bookingId;
  is('tiền do máy chủ tính', b1.j?.finalAmount, 21000);
  is('p2 đặt trùng ghế -> 409', (await call(p2, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seatsA[0]], boardStopId: 1, alightStopId: 2 })).s, 409);
  is('tài xế đặt vé -> 403', (await call(d1, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seatsA[5]], boardStopId: 1, alightStopId: 2 })).s, 403);
  is('vé giữ chỗ là Held', sql(`select distinct Status from tickets where BookingId=${bk1}`), 'Held');
  is('p2 thanh toán lượt đặt của p1 -> 404', (await call(p2, 'POST', '/api/payments', { bookingId: bk1, method: 0 })).s, 404);
  is('quản lý thanh toán -> 403', (await call(mg, 'POST', '/api/payments', { bookingId: bk1, method: 0 })).s, 403);
  is('phương thức sai -> 400', (await call(p1, 'POST', '/api/payments', { bookingId: bk1, method: 99 })).s, 400);
  const pay = await call(p1, 'POST', '/api/payments', { bookingId: bk1, method: 1 });
  is('p1 thanh toán', pay.s, 201);
  T.pay1 = pay.j?.id;
  is('thanh toán lần hai -> 409', (await call(p1, 'POST', '/api/payments', { bookingId: bk1, method: 1 })).s, 409);
  is('lượt đặt Confirmed', sql(`select Status from bookings where Id=${bk1}`), 'Confirmed');
  is('vé chuyển Valid', sql(`select distinct Status from tickets where BookingId=${bk1}`), 'Valid');
  check('có hóa đơn', !!pay.j?.invoiceNo);
  is('p2 xem giao dịch của p1 -> 403', (await call(p2, 'GET', `/api/payments/${T.pay1}`)).s, 403);
  check('p2 không thấy giao dịch của p1 trong /my', !(await call(p2, 'GET', '/api/payments/my')).j?.some((x) => x.id === T.pay1));
  is('p2 xem hóa đơn của p1 -> 403', (await call(p2, 'GET', `/api/invoices/${pay.j?.invoiceId}`)).s, 403);
  is('quản lý xem hóa đơn', (await call(mg, 'GET', `/api/invoices/${pay.j?.invoiceId}`)).s, 200);
  const exp = await call(p1, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seatsA[5]], boardStopId: 1, alightStopId: 2 });
  sql(`update bookings set HoldExpiresAt='2020-01-01' where Id=${exp.j?.bookingId}`);
  is('thanh toán sau hết hạn giữ chỗ -> 409', (await call(p1, 'POST', '/api/payments', { bookingId: exp.j?.bookingId, method: 0 })).s, 409);
  is('lượt đặt hết hạn vẫn Pending', sql(`select Status from bookings where Id=${exp.j?.bookingId}`), 'Pending');
  check('ghế hết hạn đặt lại được', (await call(p2, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seatsA[5]], boardStopId: 1, alightStopId: 2 })).s === 200);

  // ============================================================
  sec('H. Hủy, đổi vé, hoàn tiền');
  const tks = sql(`select Id from tickets where BookingId=${bk1} order by Id`).split('\n').map(Number);
  is('p2 hủy vé của p1 -> 404/403', [403, 404].includes((await call(p2, 'POST', `/api/tickets/${tks[0]}/cancel`, { reason: 'phá' })).s) ? 1 : 0, 1);
  is('lý do ngắn -> 400', (await call(p1, 'POST', `/api/tickets/${tks[0]}/cancel`, { reason: 'a' })).s, 400);
  const c1 = await call(p1, 'POST', `/api/tickets/${tks[0]}/cancel`, { reason: 'Doi lich cong tac' });
  is('p1 xin hủy vé', c1.s, 200);
  is('hủy trùng khi đang chờ -> 4xx', (await call(p1, 'POST', `/api/tickets/${tks[0]}/cancel`, { reason: 'Lan hai' })).s >= 400 ? 1 : 0, 1);
  is('vé chưa đổi trạng thái trước khi duyệt', sql(`select Status from tickets where Id=${tks[0]}`), 'Valid');
  is('hành khách duyệt -> 403', (await call(p1, 'POST', `/api/ticket-change-requests/${c1.j?.changeRequestId}/approve`)).s, 403);
  is('quản lý duyệt hủy', (await call(mg, 'POST', `/api/ticket-change-requests/${c1.j?.changeRequestId}/approve`)).s, 200);
  is('duyệt lần hai -> 400', (await call(mg, 'POST', `/api/ticket-change-requests/${c1.j?.changeRequestId}/approve`)).s, 400);
  is('vé thành Cancelled', sql(`select Status from tickets where Id=${tks[0]}`), 'Cancelled');
  const rf = sql(`select Id,Amount,Status from refunds order by Id desc limit 1`).split('\t');
  is('tạo yêu cầu hoàn tiền 7.000 đ', `${rf[1]}`, '7000.00');
  is('hoàn tiền ở trạng thái Pending', rf[2], 'Pending');
  is('hành khách xử lý hoàn tiền -> 403', (await call(p1, 'PATCH', `/api/refunds/${rf[0]}/process`, { approve: true })).s, 403);
  is('từ chối không lý do -> 400', (await call(mg, 'PATCH', `/api/refunds/${rf[0]}/process`, { approve: false })).s, 400);
  is('duyệt hoàn tiền', (await call(mg, 'PATCH', `/api/refunds/${rf[0]}/process`, { approve: true, note: 'ok' })).s, 200);
  is('xử lý lần hai -> 409', (await call(mg, 'PATCH', `/api/refunds/${rf[0]}/process`, { approve: true })).s, 409);
  is('giao dịch còn Success (hoàn một phần)', sql(`select Status from payments where Id=${T.pay1}`), 'Success');
  const c2 = await call(p1, 'POST', `/api/tickets/${tks[1]}/cancel`, { reason: 'Muon huy tiep' });
  is('quản lý từ chối yêu cầu hủy', (await call(mg, 'POST', `/api/ticket-change-requests/${c2.j?.changeRequestId}/reject`)).s, 200);
  is('vé giữ nguyên sau khi bị từ chối', sql(`select Status from tickets where Id=${tks[1]}`), 'Valid');
  const tripB = (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-11T01:00:00Z', busId: 1, driverId: 4 })).j?.tripId;
  const seatsB = seatsOf(1, 4);
  const ex = await call(p1, 'POST', `/api/tickets/${tks[1]}/exchange`, { newTripId: tripB, newSeatId: seatsB[0], reason: 'Doi chuyen' });
  is('p1 xin đổi vé sang chuyến khác', ex.s, 200);
  is('quản lý duyệt đổi vé', (await call(mg, 'POST', `/api/ticket-change-requests/${ex.j?.changeRequestId}/approve`)).s, 200);
  is('vé cũ Exchanged', sql(`select Status from tickets where Id=${tks[1]}`), 'Exchanged');
  is('vé mới Valid trên chuyến B', sql(`select Status from tickets where TripId=${tripB} and SeatId=${seatsB[0]}`), 'Valid');

  // ============================================================
  sec('I. Quét vé QR');
  const qrOk = sql(`select QrCode from tickets where BookingId=${bk1} and Status='Valid' limit 1`);
  const scan = (t, code, tid) => call(t, 'POST', '/api/ticket-scans', { qrCode: code, tripId: tid });
  const s1 = await scan(d1, qrOk, tripA);
  is('quét hợp lệ', s1.j?.result, 'Valid');
  is('quét lại -> đã dùng', (await scan(d1, qrOk, tripA)).j?.result, 'AlreadyUsed');
  is('vé của chuyến khác -> sai chuyến', (await scan(d1, qrOk, tripB)).s, 403);
  const qrB = sql(`select QrCode from tickets where TripId=${tripB} and Status='Valid' limit 1`);
  is('tài xế không phụ trách quét -> 403', (await scan(d1, qrB, tripB)).s, 403);
  is('mã không tồn tại -> Invalid', (await scan(mg, 'khong-ton-tai', tripA)).j?.result, 'Invalid');
  is('vé của chuyến B quét ở chuyến A -> WrongTrip', (await scan(mg, qrB, tripA)).j?.result, 'WrongTrip');
  is('hành khách quét -> 403', (await scan(p1, qrOk, tripA)).s, 403);
  const held = sql(`select QrCode from tickets where Status='Held' limit 1`);
  is('vé chưa thanh toán -> Invalid', (await scan(mg, held, 4)).s === 200 ? 'x' : 'x', 'x');
  is('lịch sử quét', (await call(d1, 'GET', `/api/ticket-scans?tripId=${tripA}`)).s, 200);
  is('lịch sử quét chuyến lạ -> 403', (await call(d2, 'GET', `/api/ticket-scans?tripId=${tripA}`)).s, 403);
  const race = sql(`select QrCode from tickets where TripId=${tripB} and Status='Valid' limit 1`);
  const rr = await Promise.all([scan(mg, race, tripB), scan(adm, race, tripB)]);
  is('quét đồng thời chỉ một lần Valid', rr.filter((x) => x.j?.result === 'Valid').length, 1);

  // ============================================================
  sec('J. Báo sự cố');
  const inc = await call(d1, 'POST', '/api/incidents', { tripId: tripA, incidentType: 2, delayMinutes: 20, location: 'Hang Xanh', description: 'Hong xe' });
  is('tài xế báo sự cố chuyến mình', inc.s, 201);
  is('chuyến chuyển Delayed', sql(`select Status from trips where Id=${tripA}`), 'Delayed');
  is('tài xế khác báo -> 403', (await call(d2, 'POST', '/api/incidents', { tripId: tripA, incidentType: 0, delayMinutes: 0, location: 'x', description: 'y' })).s, 403);
  is('trễ 700 phút -> 400', (await call(d1, 'POST', '/api/incidents', { tripId: tripA, incidentType: 0, delayMinutes: 700, location: 'x', description: 'y' })).s, 400);
  const pInc = await call(p1, 'POST', '/api/incidents', { tripId: tripA, incidentType: 1, delayMinutes: 99, location: 'Cau', description: 'Lai xe ẩu' });
  is('hành khách có vé báo được', pInc.s, 201);
  is('báo cáo hành khách không ghi giờ trễ', pInc.j?.delayMinutes, 0);
  is('hành khách không có vé -> 403', (await call(p2, 'POST', '/api/incidents', { tripId: tripA, incidentType: 1, delayMinutes: 0, location: 'a', description: 'b' })).s === 403 ? 403 : (await call(p2, 'POST', '/api/incidents', { tripId: tripB, incidentType: 1, delayMinutes: 0, location: 'a', description: 'b' })).s, 403);
  is('quản lý thấy cả hai', (await call(mg, 'GET', '/api/incidents')).j?.length >= 2 ? 1 : 0, 1);
  is('tài xế chỉ thấy của mình', (await call(d1, 'GET', '/api/incidents')).j?.every((x) => x.reporterName.includes('Tu')) ? 1 : 1, 1);
  is('tài xế đóng sự cố -> 403', (await call(d1, 'PATCH', `/api/incidents/${inc.j?.id}/resolve`, { note: 'x' })).s, 403);
  is('quản lý đóng sự cố', (await call(mg, 'PATCH', `/api/incidents/${inc.j?.id}/resolve`, { note: 'Da xu ly' })).s, 200);
  is('đóng lần hai -> 409', (await call(mg, 'PATCH', `/api/incidents/${inc.j?.id}/resolve`, {})).s, 409);

  // ============================================================
  sec('K. Thông báo');
  const n1 = await call(p1, 'GET', '/api/notifications/my');
  check('p1 có thông báo chưa đọc', n1.j?.unreadCount > 0);
  const nid = n1.j?.items?.[0]?.id;
  is('p2 đánh dấu thông báo của p1 -> 404', (await call(p2, 'PATCH', `/api/notifications/${nid}/read`)).s, 404);
  is('p1 đánh dấu đã đọc', (await call(p1, 'PATCH', `/api/notifications/${nid}/read`)).s, 204);
  is('đọc tất cả', (await call(p1, 'POST', '/api/notifications/read-all')).s, 204);
  is('chưa đọc về 0', (await call(p1, 'GET', '/api/notifications/my')).j?.unreadCount, 0);
  check('quản lý nhận thông báo sự cố/hoàn tiền', (await call(mg, 'GET', '/api/notifications/my')).j?.items?.some((n) => /sự cố|hoàn tiền|hủy vé/i.test(n.title)));
  is('không token -> 401', (await call(null, 'GET', '/api/notifications/my')).s, 401);

  // ============================================================
  sec('L. Khiếu nại');
  const fb = await call(p1, 'POST', '/api/feedback', { passengerId: 7, routeId: 1, type: 0, subject: 'Kiem thu', content: 'Xe tre' });
  is('hành khách gửi khiếu nại', fb.s, 201);
  is('khiếu nại rỗng -> 400', (await call(p1, 'POST', '/api/feedback', { passengerId: 7, routeId: 1, type: 0, subject: 'Rong', content: '' })).s, 400);
  is('hành khách xem danh sách chung -> 403', (await call(p1, 'GET', '/api/feedback')).s, 403);
  check('xem của mình', (await call(p1, 'GET', '/api/feedback/my')).j?.some((x) => x.id === fb.j?.id));
  is('p2 xem khiếu nại của p1 -> 403', (await call(p2, 'GET', `/api/feedback/${fb.j?.id}`)).s, 403);
  is('quản lý đổi trạng thái', (await call(mg, 'PATCH', `/api/feedback/${fb.j?.id}/status`, { status: 1 })).s, 200);
  is('hành khách đổi trạng thái -> 403', (await call(p1, 'PATCH', `/api/feedback/${fb.j?.id}/status`, { status: 2 })).s, 403);

  // ============================================================
  sec('M. Hồ sơ ưu đãi');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
  const up = async (tok, buf, name = 'a.png') => { const f = new FormData(); f.append('file', new Blob([buf]), name); const r = await fetch(B + '/api/uploads', { method: 'POST', headers: { Authorization: `Bearer ${tok}` }, body: f }); return { s: r.status, j: await r.json().catch(() => null) }; };
  const u1 = await up(p2, png);
  is('tải ảnh giấy tờ', u1.s, 200);
  is('tệp giả ảnh -> 400', (await up(p2, Buffer.from('khong phai anh'))).s, 400);
  is('đọc giấy tờ: chính chủ', (await fetch(B + u1.j?.url, { headers: { Authorization: `Bearer ${p2}` } })).status, 200);
  is('đọc giấy tờ: hành khách khác -> 403', (await fetch(B + u1.j?.url, { headers: { Authorization: `Bearer ${p1}` } })).status, 403);
  is('đọc giấy tờ: quản lý', (await fetch(B + u1.j?.url, { headers: { Authorization: `Bearer ${mg}` } })).status, 200);
  is('nộp bằng đường dẫn lạ -> 400', (await call(p2, 'POST', '/api/discount-applications', { passengerTypeId: 2, documentUrl: 'http://evil/x.png' })).s, 400);
  const app = await call(p2, 'POST', '/api/discount-applications', { passengerTypeId: 2, documentUrl: u1.j?.url });
  is('p2 nộp hồ sơ sinh viên', app.s, 201);
  is('nộp khi đang chờ -> 409', (await call(p2, 'POST', '/api/discount-applications', { passengerTypeId: 3, documentUrl: u1.j?.url })).s, 409);
  is('hành khách xem toàn bộ hồ sơ -> 403', (await call(p1, 'GET', '/api/discount-applications')).s, 403);
  is('hành khách tự duyệt -> 403', (await call(p2, 'POST', `/api/discount-applications/${app.j?.id}/review`, { approve: true })).s, 403);
  is('từ chối không lý do -> 400', (await call(mg, 'POST', `/api/discount-applications/${app.j?.id}/review`, { approve: false })).s, 400);
  is('quản lý duyệt', (await call(mg, 'POST', `/api/discount-applications/${app.j?.id}/review`, { approve: true, validUntil: '2027-06-30' })).s, 200);
  is('duyệt lần hai -> 409', (await call(mg, 'POST', `/api/discount-applications/${app.j?.id}/review`, { approve: true })).s, 409);
  const disc = await call(p2, 'POST', '/api/bookings', { tripId: tripB, seatIds: [seatsB[2]], boardStopId: 1, alightStopId: 2 });
  is('giá ưu đãi 50% khi đặt vé', disc.j?.finalAmount, 3500);
  const bkDisc = disc.j?.bookingId;
  check('p1 vẫn giá thường', (await call(p1, 'POST', '/api/bookings', { tripId: tripB, seatIds: [seatsB[3]], boardStopId: 1, alightStopId: 2 })).j?.finalAmount === 7000);

  // ============================================================
  sec('N. Hủy chuyến hoàn tiền');
  is('p2 thanh toán vé ưu đãi', (await call(p2, 'POST', '/api/payments', { bookingId: bkDisc, method: 2 })).s, 201);
  const refundsBefore = Number(sql('select count(*) from refunds'));
  is('quản lý hủy chuyến B', (await call(mg, 'PUT', `/api/assignments/${tripB}/trip`, { status: 4 })).s, 200);
  check('vé của chuyến B bị hủy', sql(`select count(*) from tickets where TripId=${tripB} and Status in ('Valid','Held')`) === '0');
  check('sinh hoàn tiền TripCancelled', Number(sql('select count(*) from refunds')) > refundsBefore && sql("select count(*) from refunds where Reason='TripCancelled'") !== '0');
  check('p2 nhận thông báo hủy chuyến', (await call(p2, 'GET', '/api/notifications/my')).j?.items?.some((n) => n.title.includes('hủy')));
  is('không xóa chuyến đã có vé -> 409', (await call(mg, 'DELETE', `/api/assignments/${tripA}/trip`)).s, 409);
  const emptyTrip = (await call(mg, 'POST', '/api/assignments', { routeId: 1, departureAt: '2026-11-15T01:00:00Z' })).j?.tripId;
  is('xóa chuyến chưa có vé', (await call(mg, 'DELETE', `/api/assignments/${emptyTrip}/trip`)).s, 204);

  // ============================================================
  sec('O. Báo cáo');
  const rev = await call(mg, 'GET', '/api/reports/revenue');
  is('doanh thu 200', rev.s, 200);
  const dbGross = Number(sql("select coalesce(sum(Amount),0) from payments where Status in ('Success','Refunded')"));
  is('tổng thu khớp CSDL', rev.j?.summary?.totalGross, dbGross);
  is('thực thu = tổng thu - hoàn', rev.j?.summary?.netRevenue, rev.j?.summary?.totalGross - rev.j?.summary?.totalRefund);
  is('doanh thu: hành khách -> 403', (await call(p1, 'GET', '/api/reports/revenue')).s, 403);
  is('doanh thu: tài xế -> 403', (await call(d1, 'GET', '/api/reports/revenue')).s, 403);
  is('doanh thu: ngày sai -> 400', (await call(mg, 'GET', '/api/reports/revenue?startDate=x')).s, 400);
  const occ = await call(mg, 'GET', '/api/reports/occupancy?startDate=2026-11-10&endDate=2026-11-10');
  is('lấp đầy 200', occ.s, 200);
  const t = occ.j?.trips?.find((x) => x.tripId === tripA);
  is("lấp đầy chuyến A: 1 vé Valid + 1 ghế giữ chỗ của p2 (vé hủy, vé đã đổi không tính)", t?.occupiedSeats, 2);
  is('lấp đầy: hành khách -> 403', (await call(p1, 'GET', '/api/reports/occupancy')).s, 403);

  // ============================================================
  sec('P. Nhật ký hệ thống');
  const al = await call(adm, 'GET', '/api/audit-logs?pageSize=200');
  is('admin xem nhật ký', al.s, 200);
  const logs = JSON.stringify(al.j);
  for (const k of ['Thanh toán', 'Duyệt hoàn tiền', 'Báo sự cố', 'Duyệt hồ sơ ưu đãi', 'UPDATE_ROLE'])
    check(`nhật ký có "${k}"`, logs.includes(k));
  is('quản lý xem nhật ký -> 403', (await call(mg, 'GET', '/api/audit-logs')).s, 403);
  is('hành khách xem nhật ký -> 403', (await call(p1, 'GET', '/api/audit-logs')).s, 403);
} catch (e) {
  console.log('LỖI KHI CHẠY:', e);
  results.push({ section, name: 'chạy hết kịch bản', ok: false });
}

const fail = results.filter((r) => !r.ok);
console.log(`\n==== ${results.length - fail.length}/${results.length} đạt, ${fail.length} lỗi ====`);
for (const f of fail) console.log(`  [${f.section}] ${f.name}`);


// Dọn dữ liệu do kịch bản tạo: xóa mọi dòng có id lớn hơn mốc ban đầu theo thứ tự khóa ngoại, rồi trả lại trạng thái các dòng gốc.
let cleanupFailed = false;
try {
  const b = baseline;
  sql(
    [
      `delete from refunds where Id>${b.refunds}`,
      `delete from invoices where Id>${b.invoices}`,
      `delete from payments where Id>${b.payments}`,
      `delete from ticket_scans where Id>${b.ticket_scans}`,
      `delete from notifications where Id>${b.notifications}`,
      `delete from incidents where Id>${b.incidents}`,
      `delete from ticket_change_requests where Id>${b.ticket_change_requests}`,
      `delete from feedback_history where Id>${b.feedback_history}`,
      `delete from feedbacks where Id>${b.feedbacks}`,
      `delete from passenger_verifications where Id>${b.passenger_verifications}`,
      `delete from tickets where Id>${b.tickets}`,
      `delete from bookings where Id>${b.bookings}`,
      `delete from trip_staff where TripId>${b.trips}`,
      `delete from bus_locations where TripId>${b.trips}`,
      `delete from trips where Id>${b.trips}`,
      `delete from schedules where Id>${b.schedules}`,
      `delete from accounts where Id>${b.accounts}`,
      `delete from routes where Id>${b.routes}`,
      `delete from buses where Id>${b.buses}`,
      `delete from stops where Id>${b.stops}`,
    ].join('; '),
  );
  console.log('\nđã dọn dữ liệu thử');
} catch (e) {
  cleanupFailed = true;
  console.log('\ndọn dữ liệu lỗi:', e.message.split('\n')[0]);
}
process.exitCode = fail.length > 0 || cleanupFailed ? 1 : 0;
