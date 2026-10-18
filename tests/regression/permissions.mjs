// Ma trận phân quyền vai x endpoint (SCRUM-95): gọi từng endpoint của backend bằng 5 vai trò và khi chưa đăng nhập, rồi đối chiếu
// mã trả về với quy tắc của attribute [Authorize] / [AllowAnonymous] đọc thẳng từ các controller.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/permissions.mjs
//
// Quy tắc đối chiếu (mô tả endpoint được phép / không được phép với từng vai):
//   - Không được phép và chưa đăng nhập -> 401; không được phép và đã đăng nhập sai vai -> 403.
//   - Được phép -> mã bất kỳ khác 401/403 (dữ liệu gửi lên là id không tồn tại và thân rỗng nên chỉ mong 400/404/200, không tạo dữ liệu thật).
//   - Endpoint được phép mà trả 5xx với dữ liệu rỗng cũng là lỗi (tiêu chí SCRUM-95: không endpoint nào trả 500).
//   - Kết quả ghi thành bảng ma trận markdown (MATRIX_OUT, mặc định tests/results/ma-tran-phan-quyen.md).
// Ngoài ra có lớp kiểm độc lập với attribute (để không "tự chấm bài mình"): endpoint ghi dữ liệu (POST/PUT/PATCH/DELETE) không được
// công khai trừ danh sách cho phép, và các tài nguyên nhạy cảm phải đúng vai theo chính sách dưới đây.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sec, check, is, call, login, finish } from './lib.mjs';

const CONTROLLERS = join(dirname(fileURLToPath(import.meta.url)), '../../backend/SmartBusTicketing.Api/Controllers');
const ROLES = ['Admin', 'Manager', 'Driver', 'Conductor', 'Passenger'];
const WHO = { Admin: 'admin', Manager: 'manager', Driver: 'driver1', Conductor: 'conductor1', Passenger: 'passenger1' };

// Endpoint ghi dữ liệu được phép công khai (đăng nhập, cổng thanh toán gọi về, webhook ngân hàng có khóa riêng).
const PUBLIC_WRITE = [/^POST api\/auth\//, /^(GET|POST) api\/payments\/vnpay\//, /^POST api\/payments\/bank-transfer\/webhook$/];
// Endpoint công khai nhưng tự xác thực bằng khóa riêng (webhook ngân hàng): không có khóa thì 401 với mọi vai, kể cả Admin.
const KEYED = [/^POST api\/payments\/bank-transfer\/webhook$/];
// Endpoint không gắn attribute vì phải công khai (kiểm tra sống của hệ thống).
const PUBLIC_READ = [/^GET api\/health$/];
// Endpoint được phép theo vai nhưng còn kiểm quyền theo dữ liệu trong code (vd. nhân viên phải được phân công cho chuyến): 403 là hợp lệ.
const INLINE_403 = [/^GET api\/ticket-scans$/];

/** Đọc các controller thành danh sách endpoint {method, path, roles|null, anonymous, authorized, where}. */
function readEndpoints() {
  const out = [];
  for (const file of readdirSync(CONTROLLERS).filter((f) => f.endsWith('.cs'))) {
    const lines = readFileSync(join(CONTROLLERS, file), 'utf8').split(/\r?\n/);
    let pending = []; // attribute đang chờ gắn vào class hoặc method kế tiếp
    let cls = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[')) { pending.push(line); continue; }
      if (/^public\s+(sealed\s+|abstract\s+)?(partial\s+)?class\s+\w+Controller\b/.test(line)) {
        const attrs = pending.join(' ');
        cls = {
          name: line.match(/class\s+(\w+)/)[1],
          route: attrs.match(/\[Route\("([^"]*)"\)\]/)?.[1] ?? '',
          ...authOf(attrs),
        };
        pending = [];
        continue;
      }
      if (cls && /^public\s+(async\s+)?[\w<>\[\],.? ]+\s+\w+\s*\(/.test(line) && pending.length) {
        const attrs = pending.join(' ');
        for (const m of attrs.matchAll(/\[Http(Get|Post|Put|Patch|Delete)(?:\("([^"]*)"\))?/g)) {
          const sub = m[2] ?? '';
          const own = authOf(attrs);
          const path = `${cls.route}${sub ? '/' + sub : ''}`.replace(/\/+/g, '/');
          out.push({
            method: m[1].toUpperCase(), path,
            // Method ghi đè class: [AllowAnonymous] mở hẳn, [Authorize(Roles)] thay danh sách vai, [Authorize] trần = mọi người đã đăng nhập.
            ...(own.anonymous ? { anonymous: true, authorized: false, roles: null }
              : own.authorized ? own
                : cls),
            where: `${file}:${cls.name}`,
          });
        }
      }
      if (line && !line.startsWith('//') && !line.startsWith('///')) pending = [];
    }
  }
  return out;
}

function authOf(attrs) {
  if (/AllowAnonymous/.test(attrs)) return { anonymous: true, authorized: false, roles: null };
  const a = attrs.match(/[\[,\s]Authorize\b(?!ization)(?:\(([^)]*)\))?/);
  if (!a) return { anonymous: false, authorized: false, roles: null };
  const r = a[1]?.match(/Roles\s*=\s*"([^"]*)"/)?.[1];
  return { anonymous: false, authorized: true, roles: r ? r.split(',').map((x) => x.trim()) : null };
}

const multipart = async (tok, method, p) => {
  const r = await fetch((process.env.API_URL || 'http://localhost:5180') + p, { method, headers: tok ? { Authorization: `Bearer ${tok}` } : {}, body: new FormData() });
  return { s: r.status };
};
const urlOf = (path) => '/' + path.replace(/\{[^}:]+:(?:long|int)\}/g, '999999999').replace(/\{[^}]+\}/g, 'x');
const allowed = (ep, role) => ep.anonymous || !ep.authorized || (role !== null && (ep.roles === null || ep.roles.includes(role)));

const endpoints = readEndpoints();
sec('Phân quyền: đọc danh sách endpoint');
check(`đọc được endpoint từ ${CONTROLLERS.split(/[\\/]/).slice(-3).join('/')} (${endpoints.length})`, endpoints.length >= 100);
const noAuth = endpoints.filter((e) => !e.authorized && !e.anonymous);
console.log(`  ${endpoints.length} endpoint; ${noAuth.length} không có attribute phân quyền; ${endpoints.filter((e) => e.anonymous).length} công khai tường minh`);

const tokens = {};
for (const r of ROLES) tokens[r] = await login(WHO[r]);

// ------------------------------------------------------------------------------------------------
sec('Lớp 1: ma trận 5 vai + chưa đăng nhập, đối chiếu với attribute của từng endpoint');
const warns = [];
const matrix = []; // mỗi dòng: { tag, cells: { vai: '✓' | '✗ 401' | '✗ 403' | '401 (khóa)' } }
let cells = 0;
const mismatch = [];
for (const ep of endpoints) {
  const tag = `${ep.method} ${ep.path}`;
  const row = { tag, cells: {} };
  matrix.push(row);
  for (const who of [null, ...ROLES]) {
    const keyed = KEYED.some((re) => re.test(tag));
    const ok = allowed(ep, who) && !keyed;
    const body = ['POST', 'PUT', 'PATCH'].includes(ep.method) ? {} : undefined;
    let r = await call(who ? tokens[who] : null, ep.method, urlOf(ep.path), body);
    // Endpoint tải tệp chỉ nhận multipart: JSON bị từ chối 415 trước cả bước xác thực nên gửi lại đúng kiểu để thấy mã phân quyền thật.
    if (r.s === 415) r = await multipart(who ? tokens[who] : null, ep.method, urlOf(ep.path));
    cells++;
    const expect = keyed ? '401 (thiếu khóa)' : ok ? 'được phép' : who ? '403' : '401';
    const good = keyed ? r.s === 401
      : ok ? r.s !== 401 && (r.s !== 403 || INLINE_403.some((re) => re.test(tag)))
        : r.s === (who ? 403 : 401);
    row.cells[who ?? 'Ẩn danh'] = keyed ? '🔑 khóa API' : ok ? (good ? '✓' : '⚠ ' + r.s) : (good ? '✗ ' + r.s : '⚠ ' + r.s);
    if (!good) mismatch.push(`${tag} [${who ?? 'ẩn danh'}] mong ${expect}, được ${r.s}`);
    if (ok && r.s >= 500) warns.push(`${tag} [${who ?? 'ẩn danh'}] -> ${r.s} với dữ liệu rỗng`);
  }
}
check(`${cells} ô (endpoint x vai) khớp attribute`, mismatch.length === 0, `${mismatch.length} ô sai`);
for (const m of mismatch.slice(0, 40)) console.log(`  FAIL ${m}`);
if (mismatch.length > 40) console.log(`  ... và ${mismatch.length - 40} ô sai khác`);
// Tiêu chí SCRUM-95: không endpoint nào trả 500, kể cả với vai được phép (gửi id không tồn tại và thân rỗng thì phải là 400/404, không phải lỗi máy chủ).
check('không endpoint nào trả 5xx với dữ liệu rỗng', warns.length === 0, warns.slice(0, 10).join('; '));

// Bảng ma trận kết quả: ✓ = được phép (không bị 401/403), ✗ 401/403 = bị chặn đúng mã, ⚠ = lệch so với attribute.
const NL = String.fromCharCode(10);
const cols = ['Ẩn danh', ...ROLES];
const md = [
  '# Ma trận phân quyền vai x endpoint (SCRUM-95)',
  '',
  'Sinh tự động bởi `tests/regression/permissions.mjs`: ' + endpoints.length + ' endpoint x 6 (5 vai và chưa đăng nhập) = ' + cells + ' ô, mỗi ô là một lời gọi thật.',
  '',
  '`✓` được phép (không bị 401/403) · `✗ 401` chưa đăng nhập bị chặn · `✗ 403` sai vai bị chặn · `🔑` webhook tự xác thực bằng khóa riêng (thiếu khóa thì 401 với mọi vai) · `⚠` lệch so với attribute.',
  '',
  '| Endpoint | ' + cols.join(' | ') + ' |',
  '|---|' + cols.map(() => '---').join('|') + '|',
  ...matrix.map((r) => '| `' + r.tag + '` | ' + cols.map((c) => r.cells[c] ?? '').join(' | ') + ' |'),
  '',
  mismatch.length ? 'Ô lệch: ' + mismatch.length : 'Không có ô lệch, không có endpoint nào trả 5xx.',
  '',
].join(NL);
const out = process.env.MATRIX_OUT || join(dirname(fileURLToPath(import.meta.url)), '../results/ma-tran-phan-quyen.md');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md);
console.log('  ghi bảng ma trận: ' + out);

// ------------------------------------------------------------------------------------------------
sec('Lớp 2: chính sách độc lập với attribute');
const publicWrites = endpoints.filter((e) => e.method !== 'GET' && (e.anonymous || !e.authorized)
  && !PUBLIC_WRITE.some((re) => re.test(`${e.method} ${e.path}`)));
check('không endpoint ghi dữ liệu nào công khai ngoài danh sách cho phép', publicWrites.length === 0,
  publicWrites.map((e) => `${e.method} ${e.path}`).join('; '));
const unmarked = endpoints.filter((e) => !e.authorized && !e.anonymous && !PUBLIC_READ.some((re) => re.test(`${e.method} ${e.path}`)));
check('mọi endpoint hoặc yêu cầu đăng nhập hoặc ghi rõ [AllowAnonymous]', unmarked.length === 0,
  unmarked.map((e) => `${e.method} ${e.path}`).join('; '));

// Tài nguyên nhạy cảm: kiểm bằng lời gọi thật, không đọc attribute.
const POLICY = [
  // [mô tả, method, url, vai được phép]
  ['danh sách tài khoản chỉ Admin', 'GET', '/api/accounts', ['Admin']],
  ['nhật ký hệ thống chỉ Admin', 'GET', '/api/audit-logs', ['Admin']],
  ['báo cáo doanh thu chỉ Admin và Quản lý', 'GET', '/api/reports/revenue', ['Admin', 'Manager']],
  ['báo cáo lấp đầy chỉ Admin và Quản lý', 'GET', '/api/reports/occupancy?startDate=2026-01-01&endDate=2026-01-02', ['Admin', 'Manager']],
  ['danh sách hoàn tiền chỉ Admin và Quản lý', 'GET', '/api/refunds', ['Admin', 'Manager']],
  ['danh sách voucher chỉ Admin và Quản lý', 'GET', '/api/vouchers', ['Admin', 'Manager']],
  ['duyệt hồ sơ ưu đãi chỉ Admin và Quản lý', 'GET', '/api/discount-applications', ['Admin', 'Manager']],
  ['tạo tuyến chỉ Admin và Quản lý', 'POST', '/api/routes', ['Admin', 'Manager']],
  ['tạo xe chỉ Admin và Quản lý', 'POST', '/api/buses', ['Admin', 'Manager']],
  ['phân công chuyến chỉ Admin và Quản lý', 'POST', '/api/assignments', ['Admin', 'Manager']],
  ['quét vé chỉ nhân viên', 'POST', '/api/ticket-scans', ['Admin', 'Manager', 'Driver', 'Conductor']],
  ['đặt vé chỉ Hành khách', 'POST', '/api/bookings', ['Passenger']],
  ['thanh toán chỉ Hành khách', 'POST', '/api/payments', ['Passenger']],
];
for (const [name, method, url, okRoles] of POLICY) {
  const bad = [];
  for (const who of [null, ...ROLES]) {
    const r = await call(who ? tokens[who] : null, method, url, method === 'GET' ? undefined : {});
    const should = who !== null && okRoles.includes(who);
    if (should && (r.s === 401 || r.s === 403)) bad.push(`${who} bị chặn (${r.s})`);
    if (!should && r.s !== (who ? 403 : 401)) bad.push(`${who ?? 'ẩn danh'} không bị chặn đúng (${r.s})`);
  }
  check(`chính sách: ${name}`, bad.length === 0, bad.join('; '));
}

// ------------------------------------------------------------------------------------------------
sec('Lớp 3: xác thực token');
is('token rác -> 401', (await call('abc.def.ghi', 'GET', '/api/accounts')).s, 401);
is('thiếu tiền tố Bearer -> 401', (await fetch(`${process.env.API_URL || 'http://localhost:5180'}/api/accounts`, { headers: { Authorization: tokens.Admin } })).status, 401);
const tampered = tokens.Admin.slice(0, -4) + (tokens.Admin.endsWith('AAAA') ? 'BBBB' : 'AAAA');
is('token bị sửa chữ ký -> 401', (await call(tampered, 'GET', '/api/accounts')).s, 401);
const [h, p, sig] = tokens.Passenger.split('.');
const forgedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), role: 'Admin', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin' })).toString('base64url');
is('hành khách tự sửa claim vai trò thành Admin -> 401', (await call(`${h}.${forgedPayload}.${sig}`, 'GET', '/api/accounts')).s, 401);

finish();
