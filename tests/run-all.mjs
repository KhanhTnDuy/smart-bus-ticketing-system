// Chạy toàn bộ bộ kiểm thử hồi quy bằng MỘT lệnh (SCRUM-89):  CONFIRM_TEST_DB=1 npm test
//
// Việc kịch bản làm thay người chạy:
//   1. (tùy chọn --reset-demo) nạp lại CSDL từ backend/database/demo/smart-bus-demo-data.sql;
//   2. dựng backend ở chế độ Development với đúng cấu hình các nhóm kiểm cần (giả lập thanh toán, khóa VNPay thử, SMTP và API hoàn tiền giả,
//      tài khoản ngân hàng giả, bảng phí hoàn theo giờ) rồi chờ /api/health;
//   3. chạy lần lượt: seat-lock, refund-flow, permissions (backend không có bảng phí hoàn) rồi regress đủ mọi nhóm (backend có bảng phí hoàn);
//   4. in bảng tổng kết, dừng backend, mã thoát khác 0 nếu có phép kiểm lỗi.
// Mỗi kịch bản tự ghi mốc id trước khi chạy và xóa mọi dòng mới sau khi chạy nên dữ liệu gốc không đổi.
//
// Tùy chọn:  --reset-demo   nạp lại dữ liệu demo trước khi chạy (XÓA và nạp lại CSDL, chỉ dùng trên CSDL dev/thử)
//            --only a,b     chỉ chạy các kịch bản có tên đó (seat-lock, refund-flow, permissions, invoices, regress, config/no-mock-data, config/frontend-role-mapping, config/payment-simulator-guard, config/deploy-config)
//            --no-backend   không tự dựng backend, dùng backend đang chạy ở API_URL (tự lo cấu hình)
// Biến môi trường: API_URL (mặc định http://localhost:5180), MYSQL_BIN, MYSQL_HOST/PORT/USER/PASSWORD/DB (như lib.mjs).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tests', 'results');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const only = (args.find((a) => a.startsWith('--only='))?.slice(7) ?? (args.includes('--only') ? args[args.indexOf('--only') + 1] : '')).split(',').filter(Boolean);

if (process.env.CONFIRM_TEST_DB !== '1') {
  console.error('Bộ kiểm thử tạo, đổi và xóa dữ liệu thật trong CSDL rồi dọn lại. Chỉ chạy trên CSDL dev/thử.\nĐặt CONFIRM_TEST_DB=1 để xác nhận, ví dụ:  CONFIRM_TEST_DB=1 npm test');
  process.exit(2);
}

const API = (process.env.API_URL || 'http://localhost:5180').replace(/\/+$/, '');
const PORT = new URL(API).port || '80';

// Tìm công cụ dòng lệnh mysql: biến MYSQL_BIN, rồi PATH, rồi thư mục cài mặc định trên Windows.
function findMysql() {
  const cands = [process.env.MYSQL_BIN, 'mysql'];
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)) {
    for (const v of ['9.0', '8.4', '8.0']) cands.push(join(base, 'MySQL', `MySQL Server ${v}`, 'bin', 'mysql.exe'));
  }
  for (const c of cands.filter(Boolean)) {
    if (spawnSync(c, ['--version'], { encoding: 'utf8' }).status === 0) return c;
  }
  return null;
}
const MYSQL = findMysql();
if (!MYSQL) { console.error('Không tìm thấy công cụ dòng lệnh mysql. Cài MySQL client hoặc đặt MYSQL_BIN.'); process.exit(2); }

const dbArgs = ['-h', process.env.MYSQL_HOST || 'localhost', '-P', process.env.MYSQL_PORT || '3306', '-u', process.env.MYSQL_USER || 'root',
  ...(process.env.MYSQL_PASSWORD ? [`-p${process.env.MYSQL_PASSWORD}`] : []), '--default-character-set=utf8mb4'];
const DB_NAME = process.env.MYSQL_DB || 'smart_bus_ticketing';

// Cấu hình dùng chung cho kịch bản và backend: khóa VNPay, API hoàn tiền và SMTP đều là giả, chỉ tồn tại trong lần chạy này.
const VNPAY_SECRET = 'test-only-vnpay-hash-secret-0123456789';
const BANK_KEY = 'test-only-bank-webhook-key';
const testEnv = {
  ...process.env,
  MYSQL_BIN: MYSQL,
  CONFIRM_TEST_DB: '1',
  API_URL: API,
  VNPAY_SECRET,
  SMTP_SINK_PORT: '2525',
  REFUND_SINK_PORT: '2526',
  BANK_WEBHOOK_KEY: BANK_KEY,
};
const backendEnv = (tiers) => ({
  ...testEnv,
  ASPNETCORE_ENVIRONMENT: 'Development',
  ASPNETCORE_URLS: `http://localhost:${PORT}`,
  Payments__Simulator__Enabled: 'true',
  Payments__VnPay__TmnCode: 'TESTTMN01',
  Payments__VnPay__HashSecret: VNPAY_SECRET,
  Payments__VnPay__RefundUrl: 'http://127.0.0.1:2526/refund',
  Email__Enabled: 'true', Email__Host: '127.0.0.1', Email__Port: '2525', Email__UseSsl: 'false', Email__FromAddress: 'no-reply@smartbus.test',
  BankTransfer__BankId: 'MB', BankTransfer__BankName: 'MB Bank', BankTransfer__AccountNumber: '0123456789',
  BankTransfer__AccountName: 'NGUYEN VAN TEST', BankTransfer__WebhookApiKey: BANK_KEY,
  // Bảng phí hoàn: kịch bản seat-lock và refund-flow cần để trống (luôn hoàn 100%); regress cần 24h=100%, 2h=50%.
  ...(tiers ? { Refunds__Tiers__0__HoursBefore: '24', Refunds__Tiers__0__Percent: '100', Refunds__Tiers__1__HoursBefore: '2', Refunds__Tiers__1__Percent: '50' } : {}),
});

// Hai cấu hình backend, mỗi cấu hình chạy các kịch bản hợp với nó.
const PHASES = [
  { name: 'kiểm thử cấu hình triển khai (tự dựng backend riêng, cần MySQL)', noBackend: true, scripts: ['config/no-mock-data', 'config/frontend-role-mapping', 'config/payment-simulator-guard', 'config/deploy-config'] },
  { name: 'backend không có bảng phí hoàn', tiers: false, scripts: ['seat-lock', 'refund-flow', 'permissions', 'invoices'] },
  { name: 'backend có bảng phí hoàn 24h=100%, 2h=50%', tiers: true, scripts: ['regress'], env: { REFUND_TIERS: '1' } },
].map((p) => ({ ...p, scripts: only.length ? p.scripts.filter((s) => only.includes(s)) : p.scripts })).filter((p) => p.scripts.length);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function healthy() {
  try { return (await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; }
}

let backend = null;
let lastPid = null;
const killGroup = (sig) => {
  if (!lastPid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(lastPid), '/T', '/F']);
  else { try { process.kill(-lastPid, sig); } catch { /* đã thoát */ } }
};
function stopBackend() {
  if (!backend) return;
  lastPid = backend.pid;
  killGroup('SIGTERM');
  backend = null;
}
process.on('exit', () => { stopBackend(); killGroup('SIGKILL'); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stopBackend(); killGroup('SIGKILL'); process.exit(130); });

// Chờ backend vừa tắt nhả cổng (trên Linux tắt êm mất vài giây); quá 10 giây thì buộc tắt.
async function waitPortFree() {
  for (let i = 0; i < 40; i++) {
    if (!(await healthy())) return;
    if (i === 20) killGroup('SIGKILL');
    await sleep(500);
  }
}

async function startBackend(tiers, label) {
  if (flag('--no-backend')) return;
  stopBackend();
  await waitPortFree();
  if (await healthy()) throw new Error(`Cổng ${PORT} đang có backend khác chạy. Tắt nó đi hoặc dùng --no-backend.`);
  mkdirSync(OUT, { recursive: true });
  const log = join(OUT, `backend-${label}.log`);
  writeFileSync(log, '');
  backend = spawn('dotnet', ['run', '--project', join(ROOT, 'backend', 'SmartBusTicketing.Api'), '--no-launch-profile'], {
    cwd: ROOT, env: backendEnv(tiers), detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const append = (d) => writeFileSync(log, d, { flag: 'a' });
  backend.stdout.on('data', append); backend.stderr.on('data', append);
  let exited = false;
  backend.on('exit', () => { exited = true; });
  for (let i = 0; i < 180; i++) { // tối đa 3 phút (có thể phải biên dịch)
    if (await healthy()) return;
    if (exited) throw new Error(`Backend thoát sớm, xem ${log}`);
    await sleep(1000);
  }
  throw new Error(`Backend không lên sau 3 phút, xem ${log}`);
}

function runScript(name, env) {
  mkdirSync(OUT, { recursive: true });
  const file = name.includes('/') ? join(ROOT, 'tests', `${name}.mjs`) : join(ROOT, 'tests', 'regression', `${name}.mjs`);
  const started = Date.now();
  return new Promise((resolve) => {
    const chunks = [];
    const p = spawn(process.execPath, [file], { cwd: ROOT, env: { ...testEnv, ...env } });
    const take = (d) => { chunks.push(d); process.stdout.write(`.`); };
    p.stdout.on('data', take); p.stderr.on('data', take);
    p.on('exit', (code) => {
      const out = Buffer.concat(chunks).toString('utf8');
      writeFileSync(join(OUT, `${name.replace('/', '-')}.log`), out);
      const sum = out.match(/==== (\d+)\/(\d+) đạt, (\d+) lỗi ====/);
      const failed = [...out.matchAll(/^\s+FAIL (.+)$/gm)].map((m) => m[1]).slice(0, 25);
      // Kịch bản cấu hình không in tổng kết dạng "N/M đạt": tính một phép kiểm theo mã thoát.
      resolve({ name, code, pass: sum ? Number(sum[1]) : (code === 0 ? 1 : 0), total: sum ? Number(sum[2]) : 1, fail: sum ? Number(sum[3]) : (code === 0 ? 0 : 1), failed, secs: Math.round((Date.now() - started) / 1000), out });
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
const results = [];
try {
  if (flag('--reset-demo')) {
    const sqlFile = join(ROOT, 'backend', 'database', 'demo', 'smart-bus-demo-data.sql');
    if (!existsSync(sqlFile)) throw new Error(`Không thấy ${sqlFile}`);
    console.log(`Nạp lại dữ liệu demo vào "${DB_NAME}" ...`);
    let r = spawnSync(MYSQL, [...dbArgs, '-e', `drop database if exists \`${DB_NAME}\`; create database \`${DB_NAME}\` character set utf8mb4`], { encoding: 'utf8' });
    if (r.status === 0) r = spawnSync(MYSQL, [...dbArgs, DB_NAME], { input: readFileSync(sqlFile), encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`Nạp dữ liệu demo lỗi: ${(r.stderr || '').trim()}`);
  }
  if (!flag('--no-backend')) {
    // Các kịch bản cấu hình chạy thẳng bản đã biên dịch (--no-build) nên phải biên dịch trước một lần.
    console.log('Biên dịch backend ...');
    const b = spawnSync('dotnet', ['build', join(ROOT, 'backend', 'SmartBusTicketing.slnx'), '--nologo', '-v', 'q'], { encoding: 'utf8' });
    if (b.status !== 0) throw new Error('Biên dịch backend lỗi: ' + (b.stdout || '').split('\n').slice(-15).join(' | '));
  }
  let i = 0;
  for (const phase of PHASES) {
    console.log(`\n=== Giai đoạn ${++i}/${PHASES.length}: ${phase.name}`);
    if (!phase.noBackend) await startBackend(phase.tiers, `giai-doan-${i}`);
    else { stopBackend(); await waitPortFree(); }
    for (const s of phase.scripts) {
      process.stdout.write(`  ${s} `);
      const r = await runScript(s, phase.env ?? {});
      results.push(r);
      console.log(` ${r.code === 0 ? 'ĐẠT' : 'LỖI'} (${r.pass}/${r.total}, ${r.secs}s)`);
    }
  }
} catch (e) {
  console.error(`\nDừng giữa chừng: ${e.message}`);
  results.push({ name: '(chuẩn bị)', code: 1, pass: 0, total: 0, fail: null, failed: [e.message], secs: 0 });
} finally {
  stopBackend();
}

console.log('\n==================== TỔNG KẾT ====================');
console.log('Kịch bản'.padEnd(16) + 'Kết quả'.padEnd(10) + 'Phép kiểm'.padEnd(14) + 'Thời gian');
let allOk = results.length > 0;
for (const r of results) {
  const ok = r.code === 0 && r.fail === 0;
  allOk &&= ok;
  console.log(r.name.padEnd(16) + (ok ? 'ĐẠT' : 'LỖI').padEnd(10) + `${r.pass}/${r.total}`.padEnd(14) + `${r.secs}s`);
  for (const f of r.failed.filter(Boolean)) console.log(`    FAIL ${f}`);
  if (!ok && !r.failed.length && r.out) console.log('    ' + r.out.trim().split('\n').slice(-3).join('\n    '));
}
const total = results.reduce((a, r) => a + r.total, 0);
const pass = results.reduce((a, r) => a + r.pass, 0);
console.log(`\n${allOk ? 'TẤT CẢ ĐẠT' : 'CÓ LỖI'}: ${pass}/${total} phép kiểm. Nhật ký chi tiết: tests/results/*.log`);
process.exit(allOk ? 0 : 1);
