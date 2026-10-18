// SCRUM-88: bộ giả lập thanh toán không được bật ngoài môi trường Development.
// Kịch bản khởi động backend thật với ASPNETCORE_ENVIRONMENT=Production và kiểm tra máy chủ từ chối chạy.
// Không cần CSDL: lỗi cấu hình xảy ra ngay sau khi dựng ứng dụng, trước khi mở kết nối MySQL.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const api = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backend/SmartBusTicketing.Api');
const KEY = 'test-only-key-at-least-32-bytes-long-xx';

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${ok ? '' : '  -> ' + extra}`);
};

// Chạy backend tối đa `seconds` giây rồi tắt; trả về mã thoát và toàn bộ output.
const run = (env, seconds) => {
  const r = spawnSync('dotnet', ['run', '--no-build', '--no-launch-profile'], {
    cwd: api,
    encoding: 'utf8',
    timeout: seconds * 1000,
    killSignal: 'SIGKILL',
    // Cors__AllowedOrigins__0: ngoài Development máy chủ đòi cấu hình CORS (SCRUM-106) và kiểm cái đó trước giả lập; khai đủ để tới được bước kiểm giả lập.
    env: { ...process.env, Jwt__Key: KEY, Cors__AllowedOrigins__0: 'https://smartbus.example.com', ASPNETCORE_URLS: 'http://127.0.0.1:5999', ...env },
  });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
};

console.log('\n## SCRUM-88 — bộ giả lập thanh toán chỉ chạy ở Development');

const prodOn = run({ ASPNETCORE_ENVIRONMENT: 'Production', Payments__Simulator__Enabled: 'true' }, 90);
check('Production + Simulator bật: máy chủ không khởi động', prodOn.status !== 0, `mã thoát ${prodOn.status}`);
check('Production + Simulator bật: báo đúng lý do và tên biến cấu hình',
  /Payments:Simulator:Enabled đang bật ngoài môi trường Development/.test(prodOn.out)
  && /Payments__Simulator__Enabled/.test(prodOn.out),
  prodOn.out.split('\n').slice(0, 3).join(' | '));

// Tắt giả lập thì lỗi cấu hình biến mất (máy chủ chạy tiếp tới bước gọi CSDL, có thể lỗi vì MySQL chưa chạy — không tính).
const prodOff = run({ ASPNETCORE_ENVIRONMENT: 'Production', Payments__Simulator__Enabled: 'false' }, 60);
check('Production + Simulator tắt: không còn lỗi cấu hình giả lập',
  !/Payments:Simulator:Enabled đang bật/.test(prodOff.out));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} phép kiểm đạt.`);
if (failed.length) {
  console.log('Lỗi:');
  for (const f of failed) console.log(`  - ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
