// SCRUM-106: rà soát cấu hình triển khai. Kiểm tra backend chạy được **chỉ bằng biến môi trường** ngoài
// Development, và dừng ngay khi thiếu cấu hình bắt buộc (khóa JWT, origin CORS, chuỗi kết nối).
// Cần MySQL đang chạy. Không ghi dữ liệu: chỉ khởi động máy chủ rồi gọi /api/health.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const api = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend/SmartBusTicketing.Api');
const PORT = Number(process.env.TEST_PORT || 5999);
const URL = `http://127.0.0.1:${PORT}`;

const PROD_ENV = {
  ASPNETCORE_ENVIRONMENT: 'Production',
  ASPNETCORE_URLS: URL,
  Jwt__Key: 'test-only-key-at-least-32-bytes-long-xx',
  Jwt__Issuer: 'SmartBusTicketing.Api',
  Jwt__Audience: 'SmartBusTicketing.Client',
  ConnectionStrings__Default: process.env.TEST_CONNECTION_STRING
    || 'Server=127.0.0.1;Port=3306;Database=smart_bus_ticketing;User=root;Password=;TreatTinyAsBoolean=true',
  Cors__AllowedOrigins__0: 'https://smartbus.example.com',
};

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${ok ? '' : '  -> ' + extra}`);
};

// Chạy tới khi thoát (dùng cho các trường hợp mong đợi máy chủ dừng vì thiếu cấu hình).
const runUntilExit = (env, seconds) => {
  const r = spawnSync('dotnet', ['run', '--no-build', '--no-launch-profile'], {
    cwd: api, encoding: 'utf8', timeout: seconds * 1000, killSignal: 'SIGKILL',
    env: { ...process.env, ...env },
  });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
};

// Khởi động và chờ /api/health trả lời.
const start = async (env, seconds = 90) => {
  const p = spawn('dotnet', ['run', '--no-build', '--no-launch-profile'], {
    cwd: api, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { out += d; });
  const deadline = Date.now() + seconds * 1000;
  try {
    while (Date.now() < deadline) {
      if (p.exitCode !== null) return { ok: false, out, p };
      try {
        const r = await fetch(`${URL}/api/health`);
        if (r.ok) return { ok: true, out, p, body: await r.text() };
      } catch { /* chưa mở cổng */ }
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { ok: false, out, p };
  } finally { /* người gọi tự tắt */ }
};

const stop = (p) => new Promise((done) => {
  if (!p || p.exitCode !== null) return done();
  p.once('exit', () => done());
  spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
  setTimeout(done, 3000);
});

console.log('\n## SCRUM-106 — cấu hình triển khai');

const started = await start(PROD_ENV);
check('Production: khởi động được chỉ bằng biến môi trường (/api/health trả 200)', started.ok,
  started.out.split('\n').filter(Boolean).slice(-3).join(' | '));
check('Production: /api/health báo kết nối CSDL', /true|Healthy|ok/i.test(started.body || ''), started.body || '(rỗng)');
await stop(started.p);

const noCors = runUntilExit({ ...PROD_ENV, Cors__AllowedOrigins__0: undefined }, 60);
check('Production thiếu Cors:AllowedOrigins: dừng khởi động và báo tên biến', noCors.status !== 0
  && /Thiếu cấu hình 'Cors:AllowedOrigins'/.test(noCors.out) && /Cors__AllowedOrigins__0/.test(noCors.out),
  noCors.out.split('\n')[0]);

const noJwt = runUntilExit({ ...PROD_ENV, Jwt__Key: undefined }, 60);
check('Production thiếu Jwt:Key: dừng khởi động', noJwt.status !== 0 && /Jwt:Key/.test(noJwt.out),
  noJwt.out.split('\n')[0]);

const shortJwt = runUntilExit({ ...PROD_ENV, Jwt__Key: 'qua-ngan' }, 60);
check('Production khóa JWT ngắn hơn 32 byte: dừng khởi động', shortJwt.status !== 0 && /Jwt:Key/.test(shortJwt.out),
  shortJwt.out.split('\n')[0]);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} phép kiểm đạt.`);
if (failed.length) { console.log('Lỗi:'); for (const f of failed) console.log(`  - ${f.name}`); }
process.exit(failed.length ? 1 : 0);
