// Vai trò của backend phải được frontend nhận ra. Bộ kiểm thử API không thấy lỗi này: khi enum AccountRole có vai mới (hoặc đổi thứ tự)
// mà frontend/src/api/auth.ts không cập nhật, tài khoản đó đăng nhập xong bị coi là Hành khách và không vào được trang của vai mình
// (đã xảy ra với phụ xe). Kịch bản đọc enum ở backend rồi đối chiếu hai bảng ROLE_BY_NAME và ROLE_BY_INDEX của frontend. Không cần CSDL hay backend.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const enums = readFileSync(join(root, 'backend/SmartBusTicketing.Api/Models/Enums.cs'), 'utf8');
const auth = readFileSync(join(root, 'frontend/src/api/auth.ts'), 'utf8');

const results = [];
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${ok ? '' : '  -> ' + extra}`);
};

const backend = enums.match(/enum AccountRole\s*\{([^}]*)\}/)?.[1].split(',').map((x) => x.trim()).filter(Boolean) ?? [];
check('đọc được enum AccountRole của backend', backend.length >= 5, JSON.stringify(backend));

const byName = Object.fromEntries([...(auth.match(/ROLE_BY_NAME[^{]*\{([^}]*)\}/)?.[1] ?? '').matchAll(/(\w+):\s*'(\w+)'/g)].map((m) => [m[1], m[2]]));
const byIndex = [...(auth.match(/ROLE_BY_INDEX[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]);

// Vai của backend -> vai giao diện mong đợi. Phụ xe dùng chung nhóm giao diện với tài xế.
const EXPECT = { Admin: 'ADMIN', Manager: 'MANAGER', Driver: 'DRIVER', Conductor: 'DRIVER', Passenger: 'PASSENGER' };

for (const [i, role] of backend.entries()) {
  check(`${role}: có trong ROLE_BY_NAME`, byName[role.toLowerCase()] === EXPECT[role], `được ${byName[role.toLowerCase()]}, mong ${EXPECT[role]}`);
  check(`${role}: ROLE_BY_INDEX[${i}] khớp thứ tự enum`, byIndex[i] === EXPECT[role], `được ${byIndex[i]}, mong ${EXPECT[role]}`);
}
check('ROLE_BY_INDEX không thừa phần tử so với enum', byIndex.length === backend.length, `${byIndex.length} so với ${backend.length}`);
check('mọi vai backend đều có trong bảng mong đợi của kịch bản (thêm vai mới thì cập nhật EXPECT)', backend.every((r) => r in EXPECT), backend.filter((r) => !(r in EXPECT)).join(', '));

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} phép kiểm đạt.`);
process.exit(failed ? 1 : 0);
