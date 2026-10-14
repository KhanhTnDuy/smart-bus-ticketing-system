// Phần dùng chung của các kịch bản kiểm thử chạy trên dữ liệu demo (seat-lock.mjs, refund-flow.mjs).
// Cùng quy ước với regress.mjs: bắt buộc CONFIRM_TEST_DB=1, ghi mốc id lớn nhất từng bảng trước khi chạy và xóa mọi dòng mới sau khi chạy.
import { spawnSync } from 'node:child_process';

export const B = (process.env.API_URL || 'http://localhost:5180').replace(/\/+$/, '');
const DB = {
  bin: process.env.MYSQL_BIN || 'mysql',
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || '3306',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  name: process.env.MYSQL_DB || 'smart_bus_ticketing',
};
export const PASSWORD = process.env.SEED_PASSWORD || 'Admin@12345';
export const QA_PASSWORD = 'TestPax@12345'; // mật khẩu các tài khoản hành khách thử do kịch bản tự tạo

if (process.env.CONFIRM_TEST_DB !== '1') {
  console.error('Kịch bản này ghi vào CSDL "' + DB.name + '" và dọn lại sau khi chạy.\nChỉ chạy trên CSDL dev/thử. Đặt CONFIRM_TEST_DB=1 để xác nhận.');
  process.exit(2);
}

export const sql = (q) => {
  const args = ['-h', DB.host, '-P', DB.port, '-u', DB.user, ...(DB.password ? [`-p${DB.password}`] : []), '-N', '-D', DB.name, '-e', q];
  const r = spawnSync(DB.bin, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`mysql lỗi: ${(r.stderr || r.error?.message || '').trim()}`);
  return r.stdout.trim();
};

// Thứ tự xóa theo khóa ngoại (con trước, cha sau).
const TABLES = ['refunds', 'invoices', 'payments', 'ticket_scans', 'notifications', 'ticket_change_requests', 'tickets', 'bookings', 'audit_logs', 'accounts'];
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
export const sec = (s) => { section = s; console.log(`\n## ${s}`); };
export const check = (name, cond, extra = '') => {
  results.push({ section, name, ok: !!cond });
  console.log(`${cond ? '  ok  ' : '  FAIL'} ${name}${cond ? '' : '  -> ' + extra}`);
};
export const is = (name, actual, expected) => check(name, actual === expected, `được ${actual}, mong ${expected}`);

export async function call(tok, method, p, body) {
  const headers = {};
  if (tok) headers.Authorization = `Bearer ${tok}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(B + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch { /* không phải JSON */ }
  return { s: r.status, j, t };
}

export const ok = (r) => r.s === 200 || r.s === 201;

export async function login(identity, password = PASSWORD) {
  const r = await call(null, 'POST', '/api/auth/login', { identity, password });
  const tok = r.j?.token ?? r.j?.accessToken;
  if (!tok) throw new Error(`Không đăng nhập được ${identity}: HTTP ${r.s}`);
  return tok;
}

/** Tạo `n` tài khoản hành khách thử (testpax1..n) và trả về danh sách {name, token}. Dọn cùng các dòng khác ở finish(). */
export async function createPassengers(adminTok, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const username = `testpax${i}`;
    const c = await call(adminTok, 'POST', '/api/accounts', {
      username, password: QA_PASSWORD, fullName: `Khách Thử ${i}`, email: `${username}@example.com`, phone: `09000000${i}0`, role: 4,
    });
    if (!ok(c)) throw new Error(`Không tạo được ${username}: HTTP ${c.s} ${c.t.slice(0, 120)} (còn sót tài khoản từ lần chạy trước?)`);
    out.push({ name: username, token: await login(username, QA_PASSWORD) });
  }
  return out;
}

/** Chuyến còn ở tương lai (ít nhất 30 phút), đã gán xe, đang Scheduled, sớm nhất trước. */
export const futureTrips = (count) => sql(
  "select Id from trips where Status='Scheduled' and BusId is not null and DepartureAt > date_add(utc_timestamp(), interval 30 minute) order by DepartureAt, Id limit " + count,
).split('\n').filter(Boolean).map(Number);

/** Điểm lên (đầu tuyến) và điểm xuống (cuối tuyến) của chuyến. */
export function endStops(tripId) {
  const rows = sql(`select StopId from route_stops where RouteId=(select RouteId from trips where Id=${tripId}) order by StopOrder`).split('\n').filter(Boolean).map(Number);
  return { board: rows[0], alight: rows[rows.length - 1] };
}

/** Sơ đồ ghế của chuyến (API công khai). */
export const seatMap = async (tripId) => (await call(null, 'GET', `/api/trips/${tripId}/seats`)).j ?? [];

/** Lấy `n` ghế đang trống đầu tiên của chuyến (theo thứ tự sơ đồ), kèm mã ghế. */
export async function freeSeats(tripId, n) {
  const free = (await seatMap(tripId)).filter((s) => s.isAvailable).slice(0, n);
  if (free.length < n) throw new Error(`Chuyến ${tripId} không đủ ${n} ghế trống (CSDL không ở trạng thái demo sạch?)`);
  return free;
}

export const book = (who, tripId, seatIds) => {
  const { board, alight } = endStops(tripId);
  return call(who.token, 'POST', '/api/bookings', { tripId, seatIds, boardStopId: board, alightStopId: alight });
};

/** Thanh toán bằng MoMo. Cần backend chạy với Payments__Simulator__Enabled=true (bộ giả lập chỉ dùng khi dev). */
export const pay = (who, bookingId) => call(who.token, 'POST', '/api/payments', { bookingId, method: 0 });

/** Đặt và thanh toán trọn vẹn một vé/nhiều vé; trả về mã đặt chỗ, giao dịch, số tiền và danh sách vé. */
export async function buy(who, tripId, seats) {
  const b = await book(who, tripId, seats.map((s) => s.seatId));
  if (!ok(b)) throw new Error(`Đặt vé lỗi: HTTP ${b.s} ${b.t.slice(0, 160)}`);
  const p = await pay(who, b.j.bookingId);
  if (!ok(p)) throw new Error(`Thanh toán lỗi: HTTP ${p.s} ${p.t.slice(0, 160)} (backend đã bật Payments__Simulator__Enabled=true chưa?)`);
  const tickets = sql(`select Id from tickets where BookingId=${b.j.bookingId} order by Id`).split('\n').map(Number);
  return { bookingId: b.j.bookingId, paymentId: p.j.id, amount: Number(p.j.amount), tickets };
}

/** In tổng kết, dọn mọi dòng do kịch bản tạo (id lớn hơn mốc), chạy `restore` để trả lại các dòng gốc đã bị sửa, rồi đặt mã thoát. */
export function finish(restore = []) {
  const fail = results.filter((r) => !r.ok);
  console.log(`\n==== ${results.length - fail.length}/${results.length} đạt, ${fail.length} lỗi ====`);
  for (const f of fail) console.log(`  [${f.section}] ${f.name}`);

  let cleanupFailed = false;
  try {
    const del = TABLES.map((t) => `delete from ${t} where Id>${baseline[t]}`);
    sql([...del, ...restore].join('; '));
    console.log('\nđã dọn dữ liệu thử');
  } catch (e) {
    cleanupFailed = true;
    console.log('\ndọn dữ liệu lỗi:', e.message.split('\n')[0]);
  }
  process.exitCode = fail.length > 0 || cleanupFailed ? 1 : 0;
}
