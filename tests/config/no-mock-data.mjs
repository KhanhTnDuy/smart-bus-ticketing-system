// Quy định của nhóm: không nhận dữ liệu giả, mọi dữ liệu nghiệp vụ phải đọc từ cơ sở dữ liệu qua API.
// Kịch bản quét mã nguồn frontend và báo lỗi nếu còn:
//   1. file hoặc import dữ liệu mẫu (mockData, DataContext, INITIAL_*, "simulated GPS"...);
//   2. ghi dữ liệu nghiệp vụ vào localStorage/sessionStorage (chỉ cho phép phiên đăng nhập và giao diện: token, người dùng hiện tại, theme);
//   3. banner "dữ liệu mô phỏng/mock" thay cho việc nối cơ sở dữ liệu.
// Không cần CSDL hay backend. Muốn thêm một khóa lưu trữ hợp lệ thì thêm vào ALLOWED_KEYS kèm lý do.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'frontend', 'src');

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(n)) files.push(p);
  }
};
walk(src);
const rel = (p) => relative(root, p).split('\\').join('/');

// Khóa lưu trình duyệt hợp lệ: phiên đăng nhập và tùy chọn giao diện, không phải dữ liệu nghiệp vụ.
const ALLOWED_KEYS = [/token/i, /current_user/i, /theme/i, /dark/i, /^TOKEN_STORAGE_KEY$/, /^USER_STORAGE_KEY$/, /^THEME_STORAGE_KEY$/, /^STORAGE_KEY$/];

const results = [];
const check = (name, bad) => {
  results.push(bad.length === 0);
  console.log(`${bad.length === 0 ? '  ok  ' : '  FAIL'} ${name}${bad.length ? '\n         ' + bad.slice(0, 12).join('\n         ') + (bad.length > 12 ? `\n         ... và ${bad.length - 12} chỗ khác` : '') : ''}`);
};

const mockFiles = files.filter((f) => /mock/i.test(rel(f).split('/').pop()) || /\/data\//.test(rel(f)) || /DataContext/.test(rel(f)));
check('không còn file dữ liệu mẫu hoặc DataContext trong frontend/src', mockFiles.map(rel));

const importBad = [];
const storageBad = [];
const bannerBad = [];
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const at = `${rel(f)}:${i + 1}`;
    const code = line.replace(/\/\/.*$/, '');
    if (/^\s*(import|export)\b.*from\s+['"][^'"]*(mockData|DataContext|\/data\/)[^'"]*['"]/.test(line)) importBad.push(at + '  ' + line.trim().slice(0, 80));
    if (/\b(INITIAL_[A-Z_]+|refreshSimulatedGps|useData\(\))/.test(code)) importBad.push(at + '  ' + line.trim().slice(0, 80));
    const m = code.match(/(local|session)Storage\.(setItem|getItem)\(\s*([^,)]+)/);
    if (m) {
      const key = m[3].trim().replace(/^['"`]|['"`]$/g, '');
      if (!ALLOWED_KEYS.some((re) => re.test(key))) storageBad.push(`${at}  ${m[1]}Storage.${m[2]}(${m[3].trim()})`);
    }
    if (/(dữ liệu mô phỏng|dữ liệu giả|Mock Data|dữ liệu mẫu cục bộ|LocalStorage \/)/i.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) bannerBad.push(at + '  ' + line.trim().slice(0, 80));
  });
}
check('không import hay dùng dữ liệu mẫu (mockData, DataContext, INITIAL_*, useData)', importBad);
check('không ghi dữ liệu nghiệp vụ vào localStorage/sessionStorage (chỉ token, người dùng hiện tại, theme)', storageBad);
check('không có banner "dữ liệu mô phỏng/mock" thay cho nối cơ sở dữ liệu', bannerBad);

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} phép kiểm đạt.`);
process.exit(failed ? 1 : 0);
