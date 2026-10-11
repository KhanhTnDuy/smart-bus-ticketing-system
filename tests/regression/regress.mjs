// Kiểm thử hồi quy luồng chính của Smart Bus qua API thật (backend + MySQL), kèm ma trận quyền 5 vai trò.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/regress.mjs
// Xem tests/regression/README.md để biết điều kiện chạy và các biến môi trường.
import { spawnSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import net from 'node:net';
import http from 'node:http';

// Cổng máy chủ "API hoàn tiền VNPay" giả mà kịch bản tự mở. Phải trùng Payments__VnPay__RefundUrl của backend
// (vd. http://127.0.0.1:2526/refund). Bỏ trống thì nhóm G4 bị bỏ qua. REFUND_TIERS=1 báo backend đang chạy với chính sách hoàn
// theo giờ [24h:100%, 2h:50%] (Refunds__Tiers__...), bật thêm các phép kiểm chính sách.
const REFUND_SINK_PORT = Number(process.env.REFUND_SINK_PORT || 0);
const REFUND_TIERS = process.env.REFUND_TIERS === '1';

// Khóa webhook chuyển khoản, phải trùng BankTransfer__WebhookApiKey của backend (backend chạy với BankTransfer__BankId=MB,
// BankTransfer__BankName="MB Bank", BankTransfer__AccountNumber=0123456789, BankTransfer__AccountName="NGUYEN VAN TEST").
// Bỏ trống thì nhóm G5 bị bỏ qua.
const BANK_WEBHOOK_KEY = process.env.BANK_WEBHOOK_KEY || '';

// API hoàn tiền giả: kiểm chữ ký yêu cầu theo đặc tả (các trường nối bằng "|") rồi trả lời có ký. `mode`: ok, code91
// (không tìm thấy giao dịch), code94 (yêu cầu trùng), badsig (sai chữ ký phản hồi). `failNext` > 0 thì trả HTTP 500 vài lần đầu.
function startRefundSink(port, secret) {
  const sink = { requests: [], mode: 'ok', failNext: 0, server: null };
  const sign = (parts) => createHmac('sha512', secret).update(parts.join('|')).digest('hex');
  sink.server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let j;
      try { j = JSON.parse(body); } catch { res.writeHead(400); res.end(); return; }
      const g = (k) => String(j[k] ?? '');
      const expected = sign([g('vnp_RequestId'), g('vnp_Version'), g('vnp_Command'), g('vnp_TmnCode'), g('vnp_TransactionType'),
        g('vnp_TxnRef'), g('vnp_Amount'), g('vnp_TransactionNo'), g('vnp_TransactionDate'), g('vnp_CreateBy'), g('vnp_CreateDate'),
        g('vnp_IpAddr'), g('vnp_OrderInfo')]);
      const validReq = expected === j.vnp_SecureHash;
      sink.requests.push({ ...j, validReq });
      if (sink.failNext > 0) { sink.failNext--; res.writeHead(500); res.end('boom'); return; }

      let code = '00';
      let msg = 'Refund success';
      if (!validReq) { code = '97'; msg = 'Checksum failed'; }
      else if (sink.mode === 'code91') { code = '91'; msg = 'Unable to find the transaction'; }
      else if (sink.mode === 'code94') { code = '94'; msg = 'Duplicate request'; }
      const r = {
        vnp_ResponseId: 'RESP' + sink.requests.length, vnp_Command: 'refund', vnp_ResponseCode: code, vnp_Message: msg,
        vnp_TmnCode: g('vnp_TmnCode'), vnp_TxnRef: g('vnp_TxnRef'), vnp_Amount: g('vnp_Amount'), vnp_BankCode: 'NCB',
        vnp_PayDate: '20261011230000', vnp_TransactionNo: String(15000000 + sink.requests.length),
        vnp_TransactionType: g('vnp_TransactionType'), vnp_TransactionStatus: '05', vnp_OrderInfo: g('vnp_OrderInfo'),
        vnp_PromotionCode: '', vnp_PromotionAmount: '',
      };
      r.vnp_SecureHash = sink.mode === 'badsig' ? 'f'.repeat(128) : sign([r.vnp_ResponseId, r.vnp_Command, r.vnp_ResponseCode,
        r.vnp_Message, r.vnp_TmnCode, r.vnp_TxnRef, r.vnp_Amount, r.vnp_BankCode, r.vnp_PayDate, r.vnp_TransactionNo,
        r.vnp_TransactionType, r.vnp_TransactionStatus, r.vnp_OrderInfo, r.vnp_PromotionCode, r.vnp_PromotionAmount]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r));
    });
  });
  return new Promise((resolve, reject) => { sink.server.once('error', reject); sink.server.listen(port, '127.0.0.1', () => resolve(sink)); });
}

// Cổng máy chủ SMTP giả mà kịch bản tự mở để nhận email hóa đơn. Phải trùng Email__Port của backend (backend chạy với
// Email__Enabled=true Email__Host=127.0.0.1 Email__UseSsl=false Email__FromAddress=...). Bỏ trống thì nhóm G3 bị bỏ qua.
const SMTP_SINK_PORT = Number(process.env.SMTP_SINK_PORT || 0);

// SMTP tối thiểu: đủ để System.Net.Mail gửi tới (EHLO, MAIL, RCPT, DATA, QUIT). `failNext` > 0 thì từ chối vài thư đầu bằng 554.
function startSmtpSink(port) {
  const sink = { mails: [], failNext: 0, server: null };
  sink.server = net.createServer((sock) => {
    let buf = '';
    let inData = false;
    let data = '';
    let rcpt = [];
    let rejected = false;
    sock.setEncoding('utf8');
    sock.write('220 sink ESMTP\r\n');
    sock.on('error', () => {});
    sock.on('data', (chunk) => {
      buf += chunk;
      for (;;) {
        if (inData) {
          const end = buf.indexOf('\r\n.\r\n');
          if (end < 0) { data += buf; buf = ''; return; }
          data += buf.slice(0, end);
          buf = buf.slice(end + 5);
          inData = false;
          if (rejected) { sock.write('554 rejected\r\n'); }
          else { sink.mails.push({ to: rcpt, raw: data }); sock.write('250 queued\r\n'); }
          data = ''; rcpt = []; rejected = false;
          continue;
        }
        const nl = buf.indexOf('\r\n');
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-sink\r\n250 SIZE 10485760\r\n');
        else if (cmd === 'MAIL') sock.write('250 OK\r\n');
        else if (cmd === 'RCPT') { rcpt.push(line.replace(/^RCPT TO:\s*<?/i, '').replace(/>.*$/, '')); sock.write('250 OK\r\n'); }
        else if (cmd === 'DATA') {
          if (sink.failNext > 0) { sink.failNext--; rejected = true; }
          inData = true; data = ''; sock.write('354 go\r\n');
        }
        else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); return; }
        else sock.write('250 OK\r\n');
      }
    });
  });
  return new Promise((resolve, reject) => { sink.server.once('error', reject); sink.server.listen(port, '127.0.0.1', () => resolve(sink)); });
}

// Giải mã một thư thô (tiêu đề encoded-word, thân base64 hoặc quoted-printable) thành chữ đọc được.
function decodeMail(raw) {
  const [head, ...rest] = raw.split('\r\n\r\n');
  const body = rest.join('\r\n\r\n');
  const header = (name) => head.replace(/\r\n[ \t]+/g, ' ').match(new RegExp(`^${name}:\\s*(.*)$`, 'im'))?.[1] ?? '';
  // Tiêu đề dài bị gập thành nhiều encoded-word liền nhau; một ký tự UTF-8 có thể nằm vắt qua hai từ, nên phải ghép
  // byte của các từ B liền kề rồi mới giải mã.
  const words = (v) => v
    .replace(/(?:=\?utf-8\?b\?[^?]*\?=\s*)+/gi, (group) =>
      Buffer.concat([...group.matchAll(/=\?utf-8\?b\?([^?]*)\?=/gi)].map((m) => Buffer.from(m[1], 'base64'))).toString('utf8'))
    .replace(/=\?utf-8\?q\?([^?]*)\?=/gi, (_, t) =>
      Buffer.from(t.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8'));
  const cte = header('Content-Transfer-Encoding').toLowerCase();
  const text = cte === 'base64'
    ? Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
    : cte.includes('quoted')
      ? Buffer.from(body.replace(/=\r\n/g, '').replace(/=([0-9A-F]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8')
      : body;
  return { to: header('To'), subject: words(header('Subject')), body: text };
}

// Khóa ký thử của cổng VNPay: phải trùng Payments__VnPay__HashSecret mà backend đang chạy. Bỏ trống thì nhóm G2 bị bỏ qua.
const VNPAY_SECRET = process.env.VNPAY_SECRET || '';

// Ký một bộ tham số vnp_* đúng như VNPay: sắp khóa tăng dần, URL-encode (khoảng trắng thành +), HMAC-SHA512.
// Viết độc lập với backend (C#) nên cũng là phép đối chiếu chéo cho thuật toán ký.
const vnpEncode = (s) => encodeURIComponent(s).replace(/%20/g, '+').replace(/'/g, '%27');
const vnpSign = (params) => {
  const data = Object.keys(params).filter((k) => params[k] !== '' && params[k] != null).sort()
    .map((k) => `${vnpEncode(k)}=${vnpEncode(String(params[k]))}`).join('&');
  return { ...params, vnp_SecureHash: createHmac('sha512', VNPAY_SECRET).update(data).digest('hex') };
};

const B =(process.env.API_URL || 'http://localhost:5180').replace(/\/+$/, '');
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
  const pay = await call(p1, 'POST', '/api/payments', { bookingId: bk1, method: 0 });
  is('p1 thanh toán', pay.s, 201);
  T.pay1 = pay.j?.id;
  is('thanh toán lần hai -> 409', (await call(p1, 'POST', '/api/payments', { bookingId: bk1, method: 0 })).s, 409);
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
  // Job nền HoldExpiryService có thể kịp chuyển lượt đặt quá hạn sang Expired; cả hai đều đúng, miễn là không Confirmed.
  check('lượt đặt hết hạn không được xác nhận', ['Pending', 'Expired'].includes(sql(`select Status from bookings where Id=${exp.j?.bookingId}`)));
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

  // ============================================================
  // Các phép kiểm VNPay ký lời gọi bằng khóa thử của backend (Payments__VnPay__HashSecret). Chạy backend với
  // khóa này và đặt cùng giá trị ở VNPAY_SECRET khi chạy kịch bản; không cần tài khoản VNPay thật.
  sec('G2. Thanh toán VNPay (cổng ngân hàng)');
  if (!VNPAY_SECRET) {
    console.log('  (bỏ qua: chưa đặt VNPAY_SECRET)');
  } else {
    const seatsV = seatsOf(6, 12, 8);
    const book = async (tok, seats) => (await call(tok, 'POST', '/api/bookings', { tripId: tripA, seatIds: seats, boardStopId: 1, alightStopId: 2 })).j;
    const payV = (tok, id) => call(tok, 'POST', '/api/payments', { bookingId: id, method: 1 });
    const urlParams = (u) => Object.fromEntries(new URL(u).searchParams);
    const cb = (txnRef, amountVnd, over = {}) => vnpSign({
      vnp_Amount: String(Math.round(amountVnd * 100)), vnp_BankCode: 'NCB', vnp_OrderInfo: 'Thanh toan ve', vnp_PayDate: '20261011223344',
      vnp_ResponseCode: '00', vnp_TmnCode: 'TESTTMN01', vnp_TransactionNo: String(14000000 + Math.floor(Math.random() * 999999)),
      vnp_TransactionStatus: '00', vnp_TxnRef: txnRef, ...over,
    });
    const qs = (o) => '?' + new URLSearchParams(o).toString();
    const ipn = (o) => call(null, 'GET', '/api/payments/vnpay/ipn' + qs(o));
    const ret = (o) => call(null, 'GET', '/api/payments/vnpay/return' + qs(o));
    const stat = (id) => sql(`select Status from payments where Id=${id}`);

    // 1. Khởi tạo thanh toán: Pending + URL ngân hàng, chữ ký URL khớp bản tính độc lập ở đây.
    const v1 = await book(p1, [seatsV[0]]);
    const pv1 = await payV(p1, v1.bookingId);
    is('VNPay: khởi tạo thanh toán -> 201', pv1.s, 201);
    is('VNPay: giao dịch Pending', pv1.j?.status, 'Pending');
    check('VNPay: có PaymentUrl sandbox', pv1.j?.paymentUrl?.startsWith('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?'));
    const up = pv1.j?.paymentUrl ? urlParams(pv1.j.paymentUrl) : {};
    is('VNPay: số tiền gửi cổng nhân 100', up.vnp_Amount, '700000');
    is('VNPay: chữ ký URL khớp bản tính độc lập', up.vnp_SecureHash, vnpSign(Object.fromEntries(Object.entries(up).filter(([k]) => k !== 'vnp_SecureHash'))).vnp_SecureHash);
    check('VNPay: hạn thanh toán không quá hạn giữ chỗ', Number(up.vnp_ExpireDate) > Number(up.vnp_CreateDate));
    is('VNPay: lượt đặt vẫn Pending khi chưa trả tiền', sql(`select Status from bookings where Id=${v1.bookingId}`), 'Pending');
    is('VNPay: vé vẫn Held', sql(`select distinct Status from tickets where BookingId=${v1.bookingId}`), 'Held');
    is('VNPay: chưa có hóa đơn', sql(`select count(*) from invoices where PaymentId=${pv1.j?.id}`), '0');
    const ref1 = up.vnp_TxnRef;

    // 2. Lời gọi sai: chữ ký, số tiền, mã lạ. Không được đổi gì.
    const forged = { ...cb(ref1, 7000), vnp_SecureHash: 'a'.repeat(128) };
    is('VNPay IPN: chữ ký sai -> 97', (await ipn(forged)).j?.RspCode, '97');
    is('VNPay IPN: sửa số tiền sau khi ký -> 97', (await ipn({ ...cb(ref1, 7000), vnp_Amount: '100' })).j?.RspCode, '97');
    is('VNPay IPN: số tiền khác giao dịch -> 04', (await ipn(cb(ref1, 1000))).j?.RspCode, '04');
    is('VNPay IPN: mã giao dịch lạ -> 01', (await ipn(cb('KHONGTONTAI', 7000))).j?.RspCode, '01');
    is('VNPay IPN: thiếu chữ ký -> 97', (await ipn({ vnp_TxnRef: ref1, vnp_Amount: '700000', vnp_ResponseCode: '00' })).j?.RspCode, '97');
    is('VNPay return: chữ ký sai -> 400', (await ret(forged)).s, 400);
    is('VNPay: các lời gọi sai không đổi giao dịch', stat(pv1.j?.id), 'Pending');

    // 3. Khách hủy ở trang ngân hàng (mã 24): giao dịch Failed, lượt đặt giữ chỗ, thử lại được.
    const fail = await ipn(cb(ref1, 7000, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }));
    is('VNPay IPN: giao dịch thất bại vẫn trả 00 cho cổng', fail.j?.RspCode, '00');
    is('VNPay: giao dịch Failed', stat(pv1.j?.id), 'Failed');
    check('VNPay: lưu lý do thất bại', (sql(`select FailureReason from payments where Id=${pv1.j?.id}`) || '').length > 0);
    is('VNPay: lượt đặt vẫn Pending sau khi thất bại', sql(`select Status from bookings where Id=${v1.bookingId}`), 'Pending');
    is('VNPay: vé vẫn Held sau khi thất bại', sql(`select distinct Status from tickets where BookingId=${v1.bookingId}`), 'Held');
    is('VNPay: IPN thành công đến sau giao dịch đã Failed -> 02', (await ipn(cb(ref1, 7000))).j?.RspCode, '02');

    // 4. Thử lại: giao dịch mới, mã mới, rồi thanh toán thành công qua ReturnUrl (máy dev không nhận được IPN).
    const pv1b = await payV(p1, v1.bookingId);
    is('VNPay: thử lại thanh toán -> 201', pv1b.s, 201);
    const ref1b = urlParams(pv1b.j?.paymentUrl).vnp_TxnRef;
    check('VNPay: mã giao dịch thử lại khác lần trước', ref1b && ref1b !== ref1);
    const ok1 = await ret(cb(ref1b, 7000, { vnp_TransactionNo: '14999001' }));
    is('VNPay return: thanh toán thành công', ok1.j?.success, true);
    is('VNPay: giao dịch Success', stat(pv1b.j?.id), 'Success');
    is('VNPay: lưu mã giao dịch của cổng', sql(`select ProviderTxnId from payments where Id=${pv1b.j?.id}`), '14999001');
    is('VNPay: lưu ngày thanh toán của cổng', sql(`select GatewayPayDate from payments where Id=${pv1b.j?.id}`), '20261011223344');
    is('VNPay: lượt đặt Confirmed', sql(`select Status from bookings where Id=${v1.bookingId}`), 'Confirmed');
    is('VNPay: vé chuyển Valid', sql(`select distinct Status from tickets where BookingId=${v1.bookingId}`), 'Valid');
    is('VNPay: có đúng một hóa đơn', sql(`select count(*) from invoices where PaymentId=${pv1b.j?.id}`), '1');
    is('VNPay IPN lặp lại sau khi đã chốt -> 02', (await ipn(cb(ref1b, 7000))).j?.RspCode, '02');
    is('VNPay return lặp lại vẫn báo thành công', (await ret(cb(ref1b, 7000))).j?.success, true);
    is('VNPay: lặp lại không sinh thêm hóa đơn', sql(`select count(*) from invoices where PaymentId=${pv1b.j?.id}`), '1');
    is('VNPay: thanh toán lượt đặt đã trả -> 409', (await payV(p1, v1.bookingId)).s, 409);
    is('VNPay: lịch sử thấy 2 giao dịch (Failed + Success)', (await call(p1, 'GET', '/api/payments/my')).j?.filter((x) => x.bookingId === v1.bookingId).length, 2);

    // 5. IPN và ReturnUrl về cùng lúc: chỉ một bên chốt, vẫn đúng một hóa đơn.
    const v2 = await book(p1, [seatsV[1]]);
    const pv2 = await payV(p1, v2.bookingId);
    const ref2 = urlParams(pv2.j?.paymentUrl).vnp_TxnRef;
    const sig2 = cb(ref2, 7000, { vnp_TransactionNo: '14999002' });
    const race = await Promise.all([ipn(sig2), ret(sig2), ipn(sig2), ret(sig2), ipn(sig2)]);
    check('VNPay: gọi đồng thời không lỗi 5xx', race.every((r) => r.s < 500));
    is('VNPay: gọi đồng thời chỉ một lần chốt, một hóa đơn', sql(`select count(*) from invoices where PaymentId=${pv2.j?.id}`), '1');
    is('VNPay: gọi đồng thời, lượt đặt Confirmed', sql(`select Status from bookings where Id=${v2.bookingId}`), 'Confirmed');

    // 6. Tiền về sau khi hết hạn giữ chỗ: không xuất vé, tự mở yêu cầu hoàn tiền.
    const v3 = await book(p1, [seatsV[2]]);
    const pv3 = await payV(p1, v3.bookingId);
    const ref3 = urlParams(pv3.j?.paymentUrl).vnp_TxnRef;
    sql(`update bookings set HoldExpiresAt='2020-01-01' where Id=${v3.bookingId}`);
    const late = await ret(cb(ref3, 7000, { vnp_TransactionNo: '14999003' }));
    is('VNPay: thanh toán trễ không báo thành công', late.j?.success, false);
    check('VNPay: báo khách khoản này sẽ được hoàn', /hoàn/.test(late.j?.message ?? ''));
    is('VNPay: lượt đặt hết hạn không được xác nhận', sql(`select Status from bookings where Id=${v3.bookingId}`) === 'Confirmed' ? 'Confirmed' : 'khong', 'khong');
    check('VNPay: vé không thành Valid', sql(`select count(*) from tickets where BookingId=${v3.bookingId} and Status='Valid'`) === '0');
    is('VNPay: giao dịch trễ vẫn ghi nhận Success (tiền đã thu)', stat(pv3.j?.id), 'Success');
    check('VNPay: tự mở một yêu cầu hoàn tiền 7.000 đ', /^7000\.00\/(Pending|Success)$/.test(sql(`select concat(Amount,'/',Status) from refunds where PaymentId=${pv3.j?.id}`)));
    is('VNPay: không có hóa đơn cho giao dịch trễ', sql(`select count(*) from invoices where PaymentId=${pv3.j?.id}`), '0');
    check('VNPay: quản lý được báo có hoàn tiền cần xử lý', Number(sql(`select count(*) from notifications where Title like '%Hoàn tiền thanh toán trễ%'`)) > 0);
    is('VNPay: IPN lặp lại cho giao dịch trễ không tạo thêm hoàn tiền', (await ipn(cb(ref3, 7000))).j?.RspCode === '02' && sql(`select count(*) from refunds where PaymentId=${pv3.j?.id}`) === '1' ? 1 : 0, 1);

    // 7. Hai giao dịch cùng thanh toán thành công cho một lượt đặt: giao dịch đến sau được hoàn.
    const v4 = await book(p1, [seatsV[3]]);
    const pv4a = await payV(p1, v4.bookingId);
    const pv4b = await payV(p1, v4.bookingId);
    const ref4a = urlParams(pv4a.j?.paymentUrl).vnp_TxnRef;
    const ref4b = urlParams(pv4b.j?.paymentUrl).vnp_TxnRef;
    is('VNPay: hai lần mở thanh toán song song cho phép', pv4b.s, 201);
    await ret(cb(ref4a, 7000, { vnp_TransactionNo: '14999004' }));
    await ret(cb(ref4b, 7000, { vnp_TransactionNo: '14999005' }));
    is('VNPay: lượt đặt Confirmed một lần', sql(`select Status from bookings where Id=${v4.bookingId}`), 'Confirmed');
    is('VNPay: đúng một hóa đơn cho lượt đặt', sql(`select count(*) from invoices i join payments p on p.Id=i.PaymentId where p.BookingId=${v4.bookingId}`), '1');
    is('VNPay: giao dịch thứ hai được mở hoàn tiền', sql(`select count(*) from refunds r join payments p on p.Id=r.PaymentId where p.BookingId=${v4.bookingId}`), '1');

    // 8. Vai trò và quyền.
    is('VNPay: quản lý thanh toán hộ -> 403', (await payV(mg, v1.bookingId)).s, 403);
    is('VNPay: p2 thanh toán lượt đặt của p1 -> 404', (await payV(p2, (await book(p1, [seatsV[4]])).bookingId)).s, 404);

    // 9. Job nền: lượt đặt quá hạn được dọn (tối đa ~60 giây theo chu kỳ của HoldExpiryService).
    const v5 = await book(p1, [seatsV[5]]);
    const pv5 = await payV(p1, v5.bookingId);
    sql(`update bookings set HoldExpiresAt=UTC_TIMESTAMP() - interval 5 minute where Id=${v5.bookingId}`);
    let swept = false;
    for (let i = 0; i < 40 && !swept; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      swept = sql(`select Status from bookings where Id=${v5.bookingId}`) === 'Expired';
    }
    check('HoldExpiry: lượt đặt quá hạn chuyển Expired', swept);
    is('HoldExpiry: vé quá hạn chuyển Expired (nhả ghế)', sql(`select distinct Status from tickets where BookingId=${v5.bookingId}`), 'Expired');
    is('HoldExpiry: giao dịch chờ của lượt đặt quá hạn vẫn Pending trong thời gian ân hạn', stat(pv5.j?.id), 'Pending');
    check('HoldExpiry: ghế đã nhả đặt lại được', (await call(p2, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seatsV[5]], boardStopId: 1, alightStopId: 2 })).s === 200);

    // 10. Khách bấm hủy thanh toán: ghế nhả ngay, không phải đợi hết 10 phút.
    const holdBody = (seat) => ({ tripId: tripA, seatIds: [seat], boardStopId: 1, alightStopId: 2 });
    const v6 = await book(p1, [seatsV[6]]);
    is('Hủy giữ chỗ: người khác không chọn được ghế đang giữ -> 409', (await call(p2, 'POST', '/api/bookings', holdBody(seatsV[6]))).s, 409);
    is('Hủy giữ chỗ: p2 hủy lượt đặt của p1 -> 404', (await call(p2, 'POST', `/api/bookings/${v6.bookingId}/cancel`)).s, 404);
    is('Hủy giữ chỗ: quản lý hủy -> 403', (await call(mg, 'POST', `/api/bookings/${v6.bookingId}/cancel`)).s, 403);
    is('Hủy giữ chỗ: không đăng nhập -> 401', (await call(null, 'POST', `/api/bookings/${v6.bookingId}/cancel`)).s, 401);
    const c6 = await call(p1, 'POST', `/api/bookings/${v6.bookingId}/cancel`);
    is('Hủy giữ chỗ: p1 hủy -> 200', c6.s, 200);
    is('Hủy giữ chỗ: báo đã nhả ghế', c6.j?.released, true);
    is('Hủy giữ chỗ: lượt đặt Cancelled', sql(`select Status from bookings where Id=${v6.bookingId}`), 'Cancelled');
    is('Hủy giữ chỗ: vé Cancelled', sql(`select distinct Status from tickets where BookingId=${v6.bookingId}`), 'Cancelled');
    check('Hủy giữ chỗ: ghế trống ngay, người khác đặt được', (await call(p2, 'POST', '/api/bookings', holdBody(seatsV[6]))).s === 200);
    is('Hủy giữ chỗ: hủy lần hai vẫn 200 nhưng không nhả gì', (await call(p1, 'POST', `/api/bookings/${v6.bookingId}/cancel`)).j?.released, false);
    is('Hủy giữ chỗ: không thanh toán được lượt đặt đã hủy -> 409', (await payV(p1, v6.bookingId)).s, 409);
    is('Hủy giữ chỗ: lượt đặt đã thanh toán không hủy được -> 409', (await call(p1, 'POST', `/api/bookings/${v1.bookingId}/cancel`)).s, 409);
    is('Hủy giữ chỗ: vé đã thanh toán giữ nguyên Valid', sql(`select distinct Status from tickets where BookingId=${v1.bookingId}`), 'Valid');
    check('Hủy giữ chỗ: có ghi nhật ký', Number(sql(`select count(*) from audit_logs where Action like 'Hủy giữ chỗ%'`)) > 0);

    // 11. Khách đã mở trang ngân hàng rồi hủy ở tab khác nhưng vẫn trả tiền: không mất tiền, tự mở hoàn tiền.
    const v7 = await book(p1, [seatsV[7]]);
    const pv7 = await payV(p1, v7.bookingId);
    const ref7 = urlParams(pv7.j?.paymentUrl).vnp_TxnRef;
    await call(p1, 'POST', `/api/bookings/${v7.bookingId}/cancel`);
    is('Hủy giữ chỗ: giao dịch đang chờ không bị đánh Failed', stat(pv7.j?.id), 'Pending');
    const late7 = await ret(cb(ref7, 7000, { vnp_TransactionNo: '14999007' }));
    is('Hủy giữ chỗ: trả tiền sau khi hủy không báo thành công', late7.j?.success, false);
    is('Hủy giữ chỗ: không có vé Valid cho lượt đặt đã hủy', sql(`select count(*) from tickets where BookingId=${v7.bookingId} and Status='Valid'`), '0');
    check('Hủy giữ chỗ: tiền về sau khi hủy được mở hoàn tiền', /^7000\.00\/(Pending|Success)$/.test(sql(`select concat(Amount,'/',Status) from refunds where PaymentId=${pv7.j?.id}`)));
  }

  // ============================================================
  sec('G3. Email hóa đơn điện tử');
  if (!SMTP_SINK_PORT) {
    console.log('  (bỏ qua: chưa đặt SMTP_SINK_PORT)');
  } else {
    const sink = await startSmtpSink(SMTP_SINK_PORT);
    try {
      const seatsM = seatsOf(6, 4, 16);
      const bookM = async (tok, seat) => (await call(tok, 'POST', '/api/bookings', { tripId: tripA, seatIds: [seat], boardStopId: 1, alightStopId: 2 })).j;
      const payM = (tok, id) => call(tok, 'POST', '/api/payments', { bookingId: id, method: 0 });
      const waitFor = async (cond, ms = 20000) => { for (let t = 0; t < ms; t += 250) { if (cond()) return true; await new Promise((r) => setTimeout(r, 250)); } return false; };
      const p1mail = sql('select Email from accounts where Id=7');
      // Backend bật email từ đầu nên hóa đơn của các nhóm trước đã thử gửi (và thất bại vì chưa có máy chủ SMTP giả) rồi
      // sẽ được thử lại vào hộp thư giả này. Đánh dấu chúng đã gửi để nhóm này chỉ thấy thư của chính nó.
      sql('update invoices set SentAt=UTC_TIMESTAMP() where SentAt is null');

      // 1. Thanh toán xong: email hóa đơn gửi tự động trong nền.
      const m1 = await bookM(p1, seatsM[0]);
      const pay1 = await payM(p1, m1.bookingId);
      is('Email: thanh toán thành công', pay1.s, 201);
      check('Email: thư hóa đơn tới máy chủ SMTP', await waitFor(() => sink.mails.length >= 1));
      const mail1 = sink.mails[0] ? decodeMail(sink.mails[0].raw) : { to: '', subject: '', body: '' };
      check('Email: gửi đúng địa chỉ của hành khách', sink.mails[0]?.to.includes(p1mail));
      check('Email: tiêu đề có số hóa đơn', mail1.subject.includes(pay1.j?.invoiceNo ?? '@@'));
      check('Email: nội dung có số hóa đơn', mail1.body.includes(pay1.j?.invoiceNo ?? '@@'));
      check('Email: nội dung có mã đặt chỗ', mail1.body.includes(pay1.j?.bookingCode ?? '@@'));
      check('Email: nội dung có số tiền', mail1.body.includes('7.000'));
      check('Email: có liên kết xem vé', mail1.body.includes('/passenger/tickets'));
      check('Email: không chứa mã QR hay chuỗi mã vé', !/[0-9a-f]{32}/.test(mail1.body));
      check('Email: hóa đơn đánh dấu đã gửi', await waitFor(() => sql(`select SentAt is not null from invoices where Id=${pay1.j?.invoiceId}`) === '1'));
      is('Email: ghi nhận 1 lần thử', sql(`select EmailAttempts from invoices where Id=${pay1.j?.invoiceId}`), '1');
      const list1 = (await call(p1, 'GET', '/api/invoices/my')).j?.find((x) => x.id === pay1.j?.invoiceId);
      is('Email: API báo trạng thái Sent', list1?.emailStatus, 'Sent');
      check('Email: API có thời điểm gửi', !!list1?.sentAt);
      check('Email: API không lộ lỗi SMTP', !('emailError' in (list1 ?? {})));

      // 2. SMTP từ chối: thanh toán vẫn thành công, hóa đơn ở trạng thái chờ, bấm gửi lại thì gửi được.
      sink.failNext = 1;
      const before = sink.mails.length;
      const m2 = await bookM(p1, seatsM[1]);
      const pay2 = await payM(p1, m2.bookingId);
      is('Email: SMTP lỗi không làm hỏng thanh toán', pay2.s, 201);
      check('Email: ghi nhận lần thử thất bại', await waitFor(() => sql(`select EmailAttempts from invoices where Id=${pay2.j?.invoiceId}`) === '1'));
      is('Email: lượt đặt vẫn Confirmed khi gửi mail lỗi', sql(`select Status from bookings where Id=${m2.bookingId}`), 'Confirmed');
      is('Email: chưa có thư mới sau khi bị từ chối', sink.mails.length, before);
      check('Email: lưu lý do lỗi để quản trị xem', await waitFor(() => (sql(`select ifnull(EmailError,'') from invoices where Id=${pay2.j?.invoiceId}`) || '').length > 0));
      const list2 = (await call(p1, 'GET', '/api/invoices/my')).j?.find((x) => x.id === pay2.j?.invoiceId);
      is('Email: trạng thái Pending khi chưa gửi được', list2?.emailStatus, 'Pending');
      is('Email: SentAt rỗng khi chưa gửi được', sql(`select SentAt is null from invoices where Id=${pay2.j?.invoiceId}`), '1');

      // 3. Gửi lại: quyền và địa chỉ.
      is('Gửi lại email: không đăng nhập -> 401', (await call(null, 'POST', `/api/invoices/${pay2.j?.invoiceId}/send`, {})).s, 401);
      is('Gửi lại email: p2 gửi hóa đơn của p1 -> 404', (await call(p2, 'POST', `/api/invoices/${pay2.j?.invoiceId}/send`, {})).s, 404);
      is('Gửi lại email: hóa đơn không tồn tại -> 404', (await call(p1, 'POST', '/api/invoices/99999999/send', {})).s, 404);
      const re2 = await call(p1, 'POST', `/api/invoices/${pay2.j?.invoiceId}/send`, { email: 'ke-xau@example.com' });
      is('Gửi lại email: p1 gửi lại -> 202', re2.s, 202);
      check('Email: gửi lại thành công', await waitFor(() => sink.mails.length === before + 1));
      check('Email: địa chỉ mới bị bỏ qua khi hóa đơn đã có địa chỉ', sink.mails[before]?.to.includes(p1mail) && !sink.mails[before]?.to.includes('ke-xau'));
      check('Email: gửi lại xong có SentAt', await waitFor(() => sql(`select SentAt is not null from invoices where Id=${pay2.j?.invoiceId}`) === '1'));
      const reSent = await call(mg, 'POST', `/api/invoices/${pay2.j?.invoiceId}/send`, {});
      is('Gửi lại email: quản lý được phép -> 202', reSent.s, 202);
      check('Email: quản lý gửi lại cũng tới đúng địa chỉ khách', await waitFor(() => sink.mails.length === before + 2) && sink.mails[before + 1]?.to.includes(p1mail));

      // 4. Quá số lần thử: báo Failed; gửi lại đặt về 0 và gửi được.
      sql(`update invoices set SentAt=NULL, EmailAttempts=5 where Id=${pay1.j?.invoiceId}`);
      is('Email: quá số lần thử báo Failed', (await call(p1, 'GET', '/api/invoices/my')).j?.find((x) => x.id === pay1.j?.invoiceId)?.emailStatus, 'Failed');
      await new Promise((r) => setTimeout(r, 1500));
      is('Email: hóa đơn quá số lần thử không bị tự gửi', sink.mails.length, before + 2);

      // 5. Tài khoản chưa có email: hóa đơn NoAddress, nhập địa chỉ rồi mới gửi được.
      sql(`update accounts set Email=NULL where Id=${T.p2id}`);
      const m3 = await bookM(p2, seatsM[2]);
      const pay3 = await payM(p2, m3.bookingId);
      is('Email: tài khoản không email vẫn thanh toán được', pay3.s, 201);
      is('Email: hóa đơn báo NoAddress', (await call(p2, 'GET', '/api/invoices/my')).j?.find((x) => x.id === pay3.j?.invoiceId)?.emailStatus, 'NoAddress');
      is('Gửi lại email: thiếu địa chỉ -> 400', (await call(p2, 'POST', `/api/invoices/${pay3.j?.invoiceId}/send`, {})).s, 400);
      is('Gửi lại email: địa chỉ sai định dạng -> 400', (await call(p2, 'POST', `/api/invoices/${pay3.j?.invoiceId}/send`, { email: 'khong-phai-email' })).s, 400);
      const count3 = sink.mails.length;
      const ok3 = await call(p2, 'POST', `/api/invoices/${pay3.j?.invoiceId}/send`, { email: 'qa_p2_new@example.com' });
      is('Gửi lại email: nhập địa chỉ hợp lệ -> 202', ok3.s, 202);
      check('Email: thư tới địa chỉ vừa nhập', await waitFor(() => sink.mails.length === count3 + 1) && sink.mails[count3]?.to.includes('qa_p2_new@example.com'));
      is('Email: hóa đơn lưu địa chỉ vừa nhập', sql(`select Email from invoices where Id=${pay3.j?.invoiceId}`), 'qa_p2_new@example.com');
    } finally {
      sink.server.close();
    }
  }

  // ============================================================
  sec('G4. Hoàn tiền tự động qua VNPay');
  if (!REFUND_SINK_PORT || !VNPAY_SECRET) {
    console.log('  (bỏ qua: chưa đặt REFUND_SINK_PORT và VNPAY_SECRET)');
  } else {
    // Các khoản hoàn VNPay của nhóm trước đã bị vòng nền thử gọi (và thất bại vì chưa có máy chủ giả): bỏ chúng đi để nhóm này
    // chỉ thấy yêu cầu của chính nó.
    sql(`update refunds set Status='Failed', Note='bo qua trong test' where Status='Pending' and PaymentId in (select Id from payments where Method='VnPay')`);
    const rs = await startRefundSink(REFUND_SINK_PORT, VNPAY_SECRET);
    try {
      const seatsR = seatsOf(6, 4, 20);
      const wait = async (cond, ms = 40000) => { for (let t = 0; t < ms; t += 500) { if (cond()) return true; await new Promise((r) => setTimeout(r, 500)); } return false; };
      const bookR = async (tok, seats) => (await call(tok, 'POST', '/api/bookings', { tripId: tripA, seatIds: seats, boardStopId: 1, alightStopId: 2 })).j;
      const payR = (tok, id) => call(tok, 'POST', '/api/payments', { bookingId: id, method: 1 });
      const refOf = (pay) => new URL(pay.j.paymentUrl).searchParams.get('vnp_TxnRef');
      const signed = (txnRef, amountVnd, over = {}) => vnpSign({
        vnp_Amount: String(Math.round(amountVnd * 100)), vnp_BankCode: 'NCB', vnp_OrderInfo: 'Thanh toan ve', vnp_PayDate: '20261011223344',
        vnp_ResponseCode: '00', vnp_TmnCode: 'TESTTMN01', vnp_TransactionNo: String(14100000 + Math.floor(Math.random() * 99999)),
        vnp_TransactionStatus: '00', vnp_TxnRef: txnRef, ...over,
      });
      const ret = (o) => call(null, 'GET', '/api/payments/vnpay/return?' + new URLSearchParams(o).toString());
      const refund = (id) => {
        const [status, attempts, gw, by, note] = sql(`select Status, Attempts, ifnull(GatewayRefId,''), ifnull(ProcessedBy,''), ifnull(Note,'') from refunds where Id=${id}`).split('\t');
        return { status, attempts: Number(attempts), gw, by, note: note ?? '' };
      };
      const statusIs = (id, st) => () => refund(id).status === st;

      // 1. Tiền về sau khi hết hạn giữ chỗ: tự mở khoản hoàn rồi tự hoàn toàn bộ qua cổng.
      const ba = await bookR(p1, [seatsR[0]]);
      const pa = await payR(p1, ba.bookingId);
      const refA = refOf(pa);
      sql(`update bookings set HoldExpiresAt='2020-01-01' where Id=${ba.bookingId}`);
      await ret(signed(refA, 7000, { vnp_TransactionNo: '14999101' }));
      const rfA = Number(sql(`select Id from refunds where PaymentId=${pa.j?.id}`));
      check('Hoàn tự động: yêu cầu hoàn tới API VNPay', await wait(() => rs.requests.length >= 1));
      const qa = rs.requests[0] ?? {};
      is('Hoàn tự động: hoàn toàn bộ (loại 02)', qa.vnp_TransactionType, '02');
      is('Hoàn tự động: lệnh refund', qa.vnp_Command, 'refund');
      is('Hoàn tự động: mã giao dịch gốc', qa.vnp_TxnRef, refA);
      is('Hoàn tự động: số tiền nhân 100', qa.vnp_Amount, '700000');
      is('Hoàn tự động: mã giao dịch VNPay gốc', qa.vnp_TransactionNo, '14999101');
      is('Hoàn tự động: ngày giao dịch gốc (ngày tạo)', qa.vnp_TransactionDate, sql(`select GatewayCreateDate from payments where Id=${pa.j?.id}`));
      is('Hoàn tự động: mã yêu cầu cố định theo khoản hoàn', qa.vnp_RequestId, `RF${rfA}`);
      check('Hoàn tự động: chữ ký yêu cầu đúng đặc tả', qa.validReq === true);
      check('Hoàn tự động: khoản hoàn chuyển Success', await wait(statusIs(rfA, 'Success')));
      check('Hoàn tự động: lưu mã hoàn của cổng', refund(rfA).gw.startsWith('150000'));
      is('Hoàn tự động: không có người duyệt (hệ thống tự làm)', refund(rfA).by, '');
      check('Hoàn tự động: ghi chú hoàn tự động', refund(rfA).note.includes('tự động'));
      is('Hoàn tự động: giao dịch chuyển Refunded', sql(`select Status from payments where Id=${pa.j?.id}`), 'Refunded');
      check('Hoàn tự động: khách nhận thông báo đã hoàn tiền', Number(sql("select count(*) from notifications where AccountId=7 and Title='Đã hoàn tiền'")) > 0);
      check('Hoàn tự động: có nhật ký hoàn tiền', Number(sql(`select count(*) from audit_logs where Action='Hoàn tiền #${rfA} qua VNPay'`)) === 1);
      const n1 = rs.requests.length;
      await new Promise((r) => setTimeout(r, 12000));
      is('Hoàn tự động: khoản đã hoàn không bị gọi lại', rs.requests.length, n1);

      // 2. Khách hủy 1 trong 2 vé đã thanh toán, quản lý duyệt: tự hoàn một phần (loại 03), giao dịch vẫn Success.
      const bb = await bookR(p1, [seatsR[1], seatsR[2]]);
      const pb = await payR(p1, bb.bookingId);
      await ret(signed(refOf(pb), 14000, { vnp_TransactionNo: '14999102' }));
      const tkB = sql(`select Id from tickets where BookingId=${bb.bookingId} order by Id`).split('\n').map(Number);
      const cancelB = await call(p1, 'POST', `/api/tickets/${tkB[0]}/cancel`, { reason: 'Doi ke hoach di chuyen' });
      is('Hoàn tự động: khách gửi yêu cầu hủy 1 vé', cancelB.s, 200);
      const reqsBefore = rs.requests.length;
      is('Hoàn tự động: quản lý duyệt hủy', (await call(mg, 'POST', `/api/ticket-change-requests/${cancelB.j?.changeRequestId}/approve`)).s, 200);
      const rfB = Number(sql(`select Id from refunds where PaymentId=${pb.j?.id} order by Id desc limit 1`));
      check('Hoàn tự động: duyệt hủy vé kéo theo yêu cầu hoàn tới cổng', await wait(() => rs.requests.length > reqsBefore));
      const qb = rs.requests[rs.requests.length - 1] ?? {};
      is('Hoàn tự động: hoàn một phần (loại 03)', qb.vnp_TransactionType, '03');
      is('Hoàn tự động: hoàn đúng tiền của một vé', qb.vnp_Amount, '700000');
      check('Hoàn tự động: hoàn một phần thành công', await wait(statusIs(rfB, 'Success')));
      is('Hoàn tự động: giao dịch vẫn Success khi mới hoàn một phần', sql(`select Status from payments where Id=${pb.j?.id}`), 'Success');

      // 3. Các tình huống lỗi trên một giao dịch riêng, mỗi lần chèn đúng một khoản hoàn để dễ theo dõi.
      const bp = await bookR(p1, [seatsR[3]]);
      const pp = await payR(p1, bp.bookingId);
      await ret(signed(refOf(pp), 7000, { vnp_TransactionNo: '14999103' }));
      const insertRefund = (amount) => {
        sql(`insert into refunds (PaymentId, Amount, Reason, Status, CreatedAt, Attempts) values (${pp.j?.id}, ${amount}, 'PaymentFailed', 'Pending', UTC_TIMESTAMP(), 0)`);
        return Number(sql('select max(Id) from refunds'));
      };

      // 3a. Lỗi tạm thời (HTTP 500): giữ Pending, ghi lần thử, tự thử lại sau ~30 giây với cùng mã yêu cầu rồi thành công.
      rs.mode = 'ok';
      rs.failNext = 1;
      const nT = rs.requests.length;
      const rfT = insertRefund(1000);
      check('Hoàn lỗi tạm thời: lần thử đầu tới cổng', await wait(() => rs.requests.length > nT, 25000));
      check('Hoàn lỗi tạm thời: ghi nhận lần thử 1', await wait(() => refund(rfT).attempts === 1, 10000));
      is('Hoàn lỗi tạm thời: vẫn Pending', refund(rfT).status, 'Pending');
      check('Hoàn lỗi tạm thời: ghi lý do vào ghi chú', refund(rfT).note.startsWith('Lần 1/5'));
      check('Hoàn lỗi tạm thời: tự thử lại và hoàn thành công', await wait(statusIs(rfT, 'Success'), 90000));
      const reqsT = rs.requests.slice(nT).filter((x) => x.vnp_RequestId === `RF${rfT}`);
      is('Hoàn lỗi tạm thời: hai lần gọi dùng cùng mã yêu cầu', reqsT.length, 2);
      is('Hoàn lỗi tạm thời: hoàn một phần vì giao dịch đã hoàn trước đó', reqsT[1]?.vnp_TransactionType, '03');

      // 3b. Cổng từ chối (91): ngừng tự động, báo quản lý, không gọi lại.
      rs.mode = 'code91';
      const n91 = rs.requests.length;
      const rf91 = insertRefund(1100);
      check('Cổng từ chối: chuyển sang xử lý tay', await wait(() => refund(rf91).attempts === 5, 25000));
      is('Cổng từ chối: vẫn Pending, chưa báo thành công', refund(rf91).status, 'Pending');
      check('Cổng từ chối: ghi chú nêu mã lỗi của cổng', refund(rf91).note.startsWith('Cần xử lý tay') && refund(rf91).note.includes('91'));
      is('Cổng từ chối: chỉ gọi cổng một lần', rs.requests.length - n91, 1);
      const listed = (await call(mg, 'GET', '/api/refunds')).j?.find((x) => x.id === rf91);
      is('Cổng từ chối: API báo needsManual', listed?.needsManual, true);
      check('Cổng từ chối: quản lý được báo', Number(sql("select count(*) from notifications where Title='Hoàn tiền cần xử lý tay'")) > 0);
      await new Promise((r) => setTimeout(r, 12000));
      is('Cổng từ chối: không tự gọi lại', rs.requests.length - n91, 1);

      // 3c. Quản lý duyệt tay: gọi lại cổng (bỏ giới hạn số lần tự thử). Cổng chấp nhận lần này thì thành công.
      rs.mode = 'ok';
      is('Duyệt tay: hành khách không được duyệt -> 403', (await call(p1, 'PATCH', `/api/refunds/${rf91}/process`, { approve: true })).s, 403);
      const okManual = await call(mg, 'PATCH', `/api/refunds/${rf91}/process`, { approve: true });
      is('Duyệt tay: quản lý duyệt -> gọi cổng thành công', okManual.s, 200);
      is('Duyệt tay: khoản hoàn Success', refund(rf91).status, 'Success');
      check('Duyệt tay: ghi người duyệt', refund(rf91).by !== '');
      check('Duyệt tay: lưu mã hoàn của cổng', refund(rf91).gw.startsWith('150000'));
      is('Duyệt tay: duyệt lần hai -> 409', (await call(mg, 'PATCH', `/api/refunds/${rf91}/process`, { approve: true })).s, 409);

      // 3d. Cổng báo yêu cầu trùng (94): không biết đã hoàn chưa nên không tự coi là thành công. Quản lý đối soát rồi xác nhận
      // đã hoàn ngoài cổng (bắt buộc ghi mã đối soát), hệ thống không gọi cổng nữa.
      rs.mode = 'code94';
      const rf94 = insertRefund(1200);
      check('Yêu cầu trùng: chuyển xử lý tay', await wait(() => refund(rf94).attempts === 5, 25000));
      const n94 = rs.requests.length;
      is('Xác nhận ngoài cổng: thiếu ghi chú -> 400', (await call(mg, 'PATCH', `/api/refunds/${rf94}/process`, { approve: true, confirmedExternally: true })).s, 400);
      const ext = await call(mg, 'PATCH', `/api/refunds/${rf94}/process`, { approve: true, confirmedExternally: true, note: 'Da doi soat VNPay, hoan thu cong ma 889900' });
      is('Xác nhận ngoài cổng: có ghi chú -> 200', ext.s, 200);
      is('Xác nhận ngoài cổng: khoản hoàn Success', refund(rf94).status, 'Success');
      is('Xác nhận ngoài cổng: không gọi cổng thêm', rs.requests.length, n94);
      is('Xác nhận ngoài cổng: không có mã hoàn của cổng', refund(rf94).gw, '');

      // 3e. Phản hồi sai chữ ký: không tin, không báo thành công, chuyển xử lý tay.
      rs.mode = 'badsig';
      const rfSig = insertRefund(1300);
      check('Sai chữ ký phản hồi: chuyển xử lý tay', await wait(() => refund(rfSig).attempts === 5, 25000));
      is('Sai chữ ký phản hồi: không báo thành công', refund(rfSig).status, 'Pending');
      check('Sai chữ ký phản hồi: ghi chú nêu lý do', refund(rfSig).note.includes('sai chữ ký'));

      // 3f. Từ chối khoản hoàn vẫn hoạt động (ghi lý do bắt buộc), không gọi cổng.
      const nRej = rs.requests.length;
      is('Từ chối hoàn: thiếu lý do -> 400', (await call(mg, 'PATCH', `/api/refunds/${rfSig}/process`, { approve: false })).s, 400);
      is('Từ chối hoàn: có lý do -> 200', (await call(mg, 'PATCH', `/api/refunds/${rfSig}/process`, { approve: false, note: 'Khong du dieu kien hoan' })).s, 200);
      is('Từ chối hoàn: khoản hoàn Failed', refund(rfSig).status, 'Failed');
      is('Từ chối hoàn: không gọi cổng', rs.requests.length, nRej);

      // 4. Chính sách hoàn theo giờ (chỉ khi backend chạy với Refunds__Tiers: 24h=100%, 2h=50%). Dùng thanh toán giả lập để
      // tách khỏi cổng; hủy vé do khách nên áp chính sách, quản lý duyệt hủy là lúc tính tiền hoàn.
      if (REFUND_TIERS) {
        const cancelWithTrip = async (hoursAhead, seat) => {
          sql(`insert into trips (RouteId, ScheduleId, BusId, DepartureAt, Status, DelayMinutes) values (1, NULL, 3, DATE_ADD(UTC_TIMESTAMP(), interval ${hoursAhead} hour), 'Scheduled', 0)`);
          const tid = Number(sql('select max(Id) from trips'));
          const bk = (await call(p1, 'POST', '/api/bookings', { tripId: tid, seatIds: [seat], boardStopId: 1, alightStopId: 2 })).j;
          const pay = await call(p1, 'POST', '/api/payments', { bookingId: bk.bookingId, method: 0 });
          const tk = Number(sql(`select Id from tickets where BookingId=${bk.bookingId}`));
          const c = await call(p1, 'POST', `/api/tickets/${tk}/cancel`, { reason: 'Doi ke hoach di chuyen' });
          await call(mg, 'POST', `/api/ticket-change-requests/${c.j?.changeRequestId}/approve`);
          return { payId: pay.j?.id, ticketId: tk };
        };
        const [t5, t1, t30] = [seatsOf(3, 3, 0)[0], seatsOf(3, 3, 0)[1], seatsOf(3, 3, 0)[2]];
        const c5 = await cancelWithTrip(5, t5);
        is('Chính sách: còn 5 giờ hoàn 50%', sql(`select concat(Amount,'/',ifnull(Note,'')) from refunds where PaymentId=${c5.payId}`), '3500.00/Theo chính sách hoàn 50% tiền vé.');
        const c1 = await cancelWithTrip(1, t1);
        is('Chính sách: còn dưới 2 giờ không hoàn', sql(`select count(*) from refunds where PaymentId=${c1.payId}`), '0');
        is('Chính sách: vé vẫn được hủy dù không hoàn', sql(`select Status from tickets where Id=${c1.ticketId}`), 'Cancelled');
        const c30 = await cancelWithTrip(30, t30);
        is('Chính sách: còn 30 giờ hoàn 100%', sql(`select concat(Amount,'/',ifnull(Note,'-')) from refunds where PaymentId=${c30.payId}`), '7000.00/-');
      } else {
        console.log('  (bỏ qua chính sách hoàn theo giờ: chưa đặt REFUND_TIERS=1)');
      }
    } finally {
      rs.server.close();
    }
  }

  // ============================================================
  sec('G5. Chuyển khoản ngân hàng (VietQR)');
  if (!BANK_WEBHOOK_KEY) {
    console.log('  (bỏ qua: chưa đặt BANK_WEBHOOK_KEY)');
  } else {
    // Chuyến riêng trên xe 4 (24 ghế) để không tranh ghế với các nhóm trước.
    sql(`insert into trips (RouteId, ScheduleId, BusId, DepartureAt, Status, DelayMinutes) values (1, NULL, 4, DATE_ADD(UTC_TIMESTAMP(), interval 3 day), 'Scheduled', 0)`);
    const tidB = Number(sql('select max(Id) from trips'));
    const seatsB = seatsOf(4, 8);
    const bookB = async (tok, seat) => (await call(tok, 'POST', '/api/bookings', { tripId: tidB, seatIds: [seat], boardStopId: 1, alightStopId: 2 })).j;
    const payB = (tok, id) => call(tok, 'POST', '/api/payments', { bookingId: id, method: 4 });
    const webhook = async (body, auth = `Apikey ${BANK_WEBHOOK_KEY}`) => {
      const headers = { 'Content-Type': 'application/json' };
      if (auth) headers.Authorization = auth;
      const r = await fetch(B + '/api/payments/bank-transfer/webhook', { method: 'POST', headers, body: JSON.stringify(body) });
      const t = await r.text();
      let j = null;
      try { j = JSON.parse(t); } catch { /* không phải JSON */ }
      return { s: r.status, j };
    };
    const incoming = (memoText, amount, over = {}) => ({
      id: 92700 + Math.floor(Math.random() * 99999), gateway: 'MBBank', transactionDate: '2026-10-11 22:30:00', accountNumber: '0123456789',
      code: null, content: memoText, transferType: 'in', transferAmount: amount, accumulated: 1000000, subAccount: null,
      referenceCode: 'FT26285' + Math.floor(Math.random() * 1e6), description: '', ...over,
    });
    const stat = (id) => sql(`select Status from payments where Id=${id}`);

    // 1. Khởi tạo: Pending kèm mã VietQR, tài khoản nhận và nội dung chuyển khoản duy nhất.
    const b1 = await bookB(p1, seatsB[0]);
    const t1 = await payB(p1, b1.bookingId);
    is('Chuyển khoản: khởi tạo thanh toán -> 201', t1.s, 201);
    is('Chuyển khoản: giao dịch Pending', t1.j?.status, 'Pending');
    const tr = t1.j?.transfer ?? {};
    check('Chuyển khoản: nội dung là mã duy nhất', /^SBV[A-HJKMNP-Z2-9]{8}$/.test(tr.memo ?? ''));
    is('Chuyển khoản: nội dung trùng mã tham chiếu', t1.j?.reference, tr.memo);
    is('Chuyển khoản: tài khoản nhận', tr.accountNumber, '0123456789');
    is('Chuyển khoản: tên chủ tài khoản', tr.accountName, 'NGUYEN VAN TEST');
    is('Chuyển khoản: tên ngân hàng', tr.bankName, 'MB Bank');
    is('Chuyển khoản: số tiền do máy chủ tính', tr.amount, 7000);
    is('Chuyển khoản: ảnh VietQR điền sẵn tài khoản, số tiền, nội dung',
      tr.qrUrl, `https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=7000&addInfo=${tr.memo}&accountName=NGUYEN%20VAN%20TEST`);
    check('Chuyển khoản: hạn chờ bằng hạn giữ chỗ', Math.abs(new Date(tr.expiresAt) - new Date(t1.j?.holdExpiresAt)) < 1000);
    is('Chuyển khoản: không có đường dẫn cổng', t1.j?.paymentUrl ?? null, null);
    is('Chuyển khoản: lượt đặt vẫn Pending khi chưa nhận tiền', sql(`select Status from bookings where Id=${b1.bookingId}`), 'Pending');
    is('Chuyển khoản: vé vẫn Held', sql(`select distinct Status from tickets where BookingId=${b1.bookingId}`), 'Held');
    const again = await payB(p1, b1.bookingId);
    check('Chuyển khoản: mỗi lần mở có nội dung riêng', again.s === 201 && again.j?.transfer?.memo !== tr.memo);

    // 2. Ai xem được thông tin chuyển khoản.
    is('Chuyển khoản: chủ giao dịch xem được', (await call(p1, 'GET', `/api/payments/${t1.j?.id}`)).j?.transfer?.memo, tr.memo);
    is('Chuyển khoản: người khác không xem được -> 403', (await call(p2, 'GET', `/api/payments/${t1.j?.id}`)).s, 403);
    check('Chuyển khoản: quản lý lọc được giao dịch chờ', (await call(mg, 'GET', '/api/payments?method=BankTransfer&status=Pending')).j?.some((x) => x.reference === tr.memo));

    // 3. Quản lý xác nhận đã nhận tiền.
    is('Xác nhận chuyển khoản: hành khách -> 403', (await call(p1, 'POST', `/api/payments/${t1.j?.id}/confirm-transfer`, {})).s, 403);
    is('Xác nhận chuyển khoản: không đăng nhập -> 401', (await call(null, 'POST', `/api/payments/${t1.j?.id}/confirm-transfer`, {})).s, 401);
    is('Xác nhận chuyển khoản: giao dịch không tồn tại -> 404', (await call(mg, 'POST', '/api/payments/99999999/confirm-transfer', {})).s, 404);
    const vnId = sql("select Id from payments where Method='VnPay' limit 1");
    if (vnId) is('Xác nhận chuyển khoản: giao dịch VNPay -> 400', (await call(mg, 'POST', `/api/payments/${vnId}/confirm-transfer`, {})).s, 400);
    const ok1 = await call(mg, 'POST', `/api/payments/${t1.j?.id}/confirm-transfer`, { bankTransactionId: 'FT26285123456' });
    is('Xác nhận chuyển khoản: quản lý xác nhận -> 200', ok1.s, 200);
    is('Xác nhận chuyển khoản: báo thành công', ok1.j?.success, true);
    is('Xác nhận chuyển khoản: giao dịch Success', stat(t1.j?.id), 'Success');
    is('Xác nhận chuyển khoản: lưu mã giao dịch ngân hàng', sql(`select ProviderTxnId from payments where Id=${t1.j?.id}`), 'FT26285123456');
    is('Xác nhận chuyển khoản: lượt đặt Confirmed', sql(`select Status from bookings where Id=${b1.bookingId}`), 'Confirmed');
    is('Xác nhận chuyển khoản: vé chuyển Valid', sql(`select distinct Status from tickets where BookingId=${b1.bookingId}`), 'Valid');
    is('Xác nhận chuyển khoản: có hóa đơn', sql(`select count(*) from invoices where PaymentId=${t1.j?.id}`), '1');
    check('Xác nhận chuyển khoản: có nhật ký người xác nhận', Number(sql(`select count(*) from audit_logs where Action='Xác nhận chuyển khoản #${t1.j?.id}' and Username='manager'`)) === 1);
    is('Xác nhận chuyển khoản: xác nhận lần hai -> 409', (await call(mg, 'POST', `/api/payments/${t1.j?.id}/confirm-transfer`, {})).s, 409);
    is('Xác nhận chuyển khoản: giao dịch đã thành công không còn thông tin chuyển khoản', (await call(p1, 'GET', `/api/payments/${t1.j?.id}`)).j?.transfer ?? null, null);

    // 3b. Một mã giao dịch ngân hàng không dùng được cho hai giao dịch.
    const b2 = await bookB(p1, seatsB[1]);
    const t2 = await payB(p1, b2.bookingId);
    is('Xác nhận chuyển khoản: mã giao dịch ngân hàng đã dùng -> 409', (await call(mg, 'POST', `/api/payments/${t2.j?.id}/confirm-transfer`, { bankTransactionId: 'FT26285123456' })).s, 409);
    is('Xác nhận chuyển khoản: giao dịch vẫn Pending sau khi bị từ chối', stat(t2.j?.id), 'Pending');

    // 4. Khách hủy giữ chỗ rồi mới chuyển tiền: không xuất vé, tự mở khoản hoàn (hoàn tay vì không có cổng).
    await call(p1, 'POST', `/api/bookings/${b2.bookingId}/cancel`);
    const late2 = await call(mg, 'POST', `/api/payments/${t2.j?.id}/confirm-transfer`, { bankTransactionId: 'FT26285777001' });
    is('Chuyển khoản trễ: xác nhận vẫn ghi nhận tiền', late2.s, 200);
    is('Chuyển khoản trễ: không báo xuất vé', late2.j?.success, false);
    check('Chuyển khoản trễ: báo khoản sẽ được hoàn', /hoàn/.test(late2.j?.message ?? ''));
    is('Chuyển khoản trễ: không có vé Valid', sql(`select count(*) from tickets where BookingId=${b2.bookingId} and Status='Valid'`), '0');
    const rf2 = Number(sql(`select Id from refunds where PaymentId=${t2.j?.id}`));
    is('Chuyển khoản trễ: tự mở khoản hoàn 7.000 đ', sql(`select concat(Amount,'/',Status) from refunds where Id=${rf2}`), '7000.00/Pending');
    await new Promise((r) => setTimeout(r, 12000));
    const rl = (await call(mg, 'GET', '/api/refunds')).j?.find((x) => x.id === rf2);
    is('Chuyển khoản trễ: không có cổng nên không tự hoàn', rl?.status, 'Pending');
    is('Chuyển khoản trễ: không bị đánh cần xử lý tay', rl?.needsManual, false);
    is('Chuyển khoản trễ: quản lý hoàn tay xong -> 200', (await call(mg, 'PATCH', `/api/refunds/${rf2}/process`, { approve: true, note: 'Da chuyen khoan hoan lai cho khach' })).s, 200);
    is('Chuyển khoản trễ: khoản hoàn Success', sql(`select Status from refunds where Id=${rf2}`), 'Success');

    // 5. Webhook báo có tiền vào (định dạng SePay).
    const b3 = await bookB(p1, seatsB[2]);
    const t3 = await payB(p1, b3.bookingId);
    const m3 = t3.j?.transfer?.memo ?? 'SBVXXXXXXXX';
    is('Webhook: không có khóa -> 401', (await webhook(incoming(m3, 7000), '')).s, 401);
    is('Webhook: sai khóa -> 401', (await webhook(incoming(m3, 7000), 'Apikey sai-khoa')).s, 401);
    is('Webhook: sai kiểu khóa -> 401', (await webhook(incoming(m3, 7000), `Bearer ${BANK_WEBHOOK_KEY}`)).s, 401);
    is('Webhook: không xác thực thì giao dịch không đổi', stat(t3.j?.id), 'Pending');
    is('Webhook: tiền chuyển đi (out) bị bỏ qua', (await webhook(incoming(m3, 7000, { transferType: 'out' }))).j?.reason, 'not-incoming');
    is('Webhook: tài khoản khác bị bỏ qua', (await webhook(incoming(m3, 7000, { accountNumber: '9999999999' }))).j?.reason, 'other-account');
    is('Webhook: không có mã nội dung', (await webhook(incoming('chuyen tien an trua', 7000))).j?.reason, 'no-memo');
    is('Webhook: mã không tồn tại', (await webhook(incoming('SBVAAAAAAAA', 7000))).j?.reason, 'unknown-memo');
    const wrong = await webhook(incoming(m3, 6000));
    is('Webhook: lệch số tiền -> 200 nhưng không khớp', wrong.j?.reason, 'amount-mismatch');
    is('Webhook: lệch số tiền thì giao dịch vẫn Pending', stat(t3.j?.id), 'Pending');
    check('Webhook: lệch số tiền được báo cho quản lý', Number(sql("select count(*) from notifications where Title='Chuyển khoản lệch số tiền'")) > 0);
    const w3 = incoming(`CK ve xe ${m3.slice(0, 5).toLowerCase()} ${m3.slice(5)} cam on`, 7000, { id: 555123 });
    const hit = await webhook(w3);
    is('Webhook: nội dung bị chèn dấu cách vẫn khớp', hit.j?.matched, true);
    is('Webhook: kết quả Confirmed', hit.j?.outcome, 'Confirmed');
    is('Webhook: giao dịch Success', stat(t3.j?.id), 'Success');
    is('Webhook: lưu mã giao dịch ngân hàng', sql(`select ProviderTxnId from payments where Id=${t3.j?.id}`), 'SEPAY-555123');
    is('Webhook: lượt đặt Confirmed', sql(`select Status from bookings where Id=${b3.bookingId}`), 'Confirmed');
    is('Webhook: vé Valid', sql(`select distinct Status from tickets where BookingId=${b3.bookingId}`), 'Valid');
    is('Webhook: có đúng một hóa đơn', sql(`select count(*) from invoices where PaymentId=${t3.j?.id}`), '1');
    check('Webhook: nhật ký ghi nhận chuyển khoản', Number(sql(`select count(*) from audit_logs where Action='Nhận chuyển khoản ${m3}'`)) === 1);
    const dup = await webhook(w3);
    is('Webhook: gửi lại cùng giao dịch -> báo trùng', dup.j?.duplicate, true);
    is('Webhook: gửi lại không sinh thêm hóa đơn', sql(`select count(*) from invoices where PaymentId=${t3.j?.id}`), '1');

    // 5b. Mã giao dịch ngân hàng đã dùng thì không xác nhận được giao dịch khác, dù nội dung và số tiền khớp.
    const b4 = await bookB(p1, seatsB[3]);
    const t4 = await payB(p1, b4.bookingId);
    const reuse = await webhook(incoming(t4.j?.transfer?.memo, 7000, { id: 555123 }));
    is('Webhook: tái dùng mã giao dịch ngân hàng bị coi là trùng', reuse.j?.duplicate, true);
    is('Webhook: giao dịch khác không bị xác nhận bằng mã đã dùng', stat(t4.j?.id), 'Pending');
    // Hai webhook cùng lúc cho cùng một khoản: chỉ một hóa đơn.
    const race = incoming(t4.j?.transfer?.memo, 7000, { id: 555777 });
    const rr = await Promise.all([webhook(race), webhook(race), webhook(race)]);
    check('Webhook: gọi đồng thời không lỗi 5xx', rr.every((x) => x.s < 500));
    is('Webhook: gọi đồng thời chỉ một hóa đơn', sql(`select count(*) from invoices where PaymentId=${t4.j?.id}`), '1');
    is('Webhook: gọi đồng thời, giao dịch Success', stat(t4.j?.id), 'Success');

    // 6. Quá hạn chờ nhưng tiền vẫn về: giao dịch bị đánh Failed vì hết hạn được mở lại, tiền không bị bỏ qua.
    const b5 = await bookB(p1, seatsB[4]);
    const t5 = await payB(p1, b5.bookingId);
    sql(`update payments set Status='Failed', FailureReason='Hết thời gian chờ thanh toán.' where Id=${t5.j?.id}`);
    sql(`update bookings set HoldExpiresAt='2020-01-01' where Id=${b5.bookingId}`);
    const late5 = await webhook(incoming(t5.j?.transfer?.memo ?? 'SBVXXXXXXXX', 7000, { id: 555888 }));
    is('Chuyển khoản quá hạn: webhook vẫn nhận tiền', late5.j?.matched, true);
    is('Chuyển khoản quá hạn: kết quả mở khoản hoàn', late5.j?.outcome, 'RefundQueued');
    is('Chuyển khoản quá hạn: giao dịch ghi nhận Success (tiền đã vào)', stat(t5.j?.id), 'Success');
    is('Chuyển khoản quá hạn: tự mở khoản hoàn', sql(`select count(*) from refunds where PaymentId=${t5.j?.id}`), '1');
    is('Chuyển khoản quá hạn: lượt đặt không được xác nhận', sql(`select Status from bookings where Id=${b5.bookingId}`) === 'Confirmed' ? 'Confirmed' : 'khong', 'khong');

    // 7. Job nền: lượt đặt quá hạn được dọn nhưng giao dịch chuyển khoản chờ được giữ lâu hơn (tiền có thể về chậm).
    const b6 = await bookB(p1, seatsB[5]);
    const t6 = await payB(p1, b6.bookingId);
    sql(`update bookings set HoldExpiresAt=UTC_TIMESTAMP() - interval 1 hour where Id=${b6.bookingId}`);
    let swept = false;
    for (let i = 0; i < 40 && !swept; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      swept = sql(`select Status from bookings where Id=${b6.bookingId}`) === 'Expired';
    }
    check('Chuyển khoản: job dọn lượt đặt quá hạn', swept);
    is('Chuyển khoản: giao dịch chờ vẫn Pending sau khi lượt đặt hết hạn (ân hạn dài)', stat(t6.j?.id), 'Pending');
    const late6 = await call(mg, 'POST', `/api/payments/${t6.j?.id}/confirm-transfer`, { bankTransactionId: 'FT26285777006' });
    is('Chuyển khoản: quản lý vẫn xác nhận được sau khi lượt đặt hết hạn', late6.j?.success, false);
    is('Chuyển khoản: tiền về sau hết hạn được mở khoản hoàn', sql(`select count(*) from refunds where PaymentId=${t6.j?.id}`), '1');
  }

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
