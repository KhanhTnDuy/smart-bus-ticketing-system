#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Đọc tham số CLI & biến môi trường
const args = process.argv.slice(2);
function getArg(flag, shortFlag, fallback = '') {
  const idx = args.findIndex((a) => a === flag || a === shortFlag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  for (const a of args) {
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return fallback;
}

const host = getArg('--host', '-h', process.env.MYSQL_HOST || '127.0.0.1');
const port = getArg('--port', '-P', process.env.MYSQL_PORT || '3306');
const user = getArg('--user', '-u', process.env.MYSQL_USER || 'root');
const password = getArg('--password', '-p', process.env.MYSQL_PASSWORD || '');
const database = getArg('--db', '-D', process.env.MYSQL_DB || 'smart_bus_ticketing');
const sqlFile = resolve(rootDir, getArg('--file', '-f', 'backend/database/demo/smart-bus-demo-data.sql'));

console.log('====================================================================');
console.log('🔄 SCRIPT NẠP LẠI DỮ LIỆU DEMO SMART BUS TICKETING');
console.log('====================================================================');

if (!existsSync(sqlFile)) {
  console.error(`❌ Không tìm thấy file dữ liệu demo: ${sqlFile}`);
  process.exit(1);
}

// Tìm công cụ dòng lệnh mysql
function findMysqlBin() {
  if (process.env.MYSQL_BIN && existsSync(process.env.MYSQL_BIN)) {
    return process.env.MYSQL_BIN;
  }

  // Thử lệnh mysql trong PATH
  const testPath = spawnSync('mysql', ['--version'], { encoding: 'utf8' });
  if (testPath.status === 0) return 'mysql';

  // Trên Windows, tìm trong các thư mục cài đặt mặc định
  if (process.platform === 'win32') {
    const candidateDirs = [
      'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 9.0\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.2\\bin\\mysql.exe',
      'C:\\Program Files\\MySQL\\MySQL Server 8.3\\bin\\mysql.exe',
      'C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
      'C:\\xampp\\mysql\\bin\\mysql.exe',
    ];
    for (const p of candidateDirs) {
      if (existsSync(p)) return p;
    }
  }

  return 'mysql';
}

const mysqlBin = findMysqlBin();
console.log(`📌 MySQL binary : ${mysqlBin}`);
console.log(`📌 Máy chủ      : ${host}:${port}`);
console.log(`📌 Tài khoản    : ${user}`);
console.log(`📌 Cơ sở dữ liệu: ${database}`);
console.log(`📌 File nạp     : ${sqlFile}`);
console.log('--------------------------------------------------------------------');

// Chuẩn bị tham số chạy lệnh mysql
const baseArgs = ['-h', host, '-P', String(port), '-u', user];
if (password) {
  baseArgs.push(`-p${password}`);
}
baseArgs.push('--default-character-set=utf8mb4');

console.log('⏳ Đang nạp lại dữ liệu (tạo database, bảng, tài khoản demo và chuyến động)...');

const sqlContent = readFileSync(sqlFile, 'utf8');
const runImport = spawnSync(mysqlBin, baseArgs, {
  input: sqlContent,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

if (runImport.status !== 0) {
  console.error('❌ Lỗi khi nạp dữ liệu demo:');
  console.error(runImport.stderr || runImport.error?.message || 'Lỗi không xác định');
  console.error('\nGợi ý khắc phục:');
  console.error('  1. Kiểm tra MySQL service đã chạy chưa (ví dụ: sc query MySQL80).');
  console.error('  2. Nếu MySQL có mật khẩu root, truyền qua cờ -p: node scripts/reload-demo.mjs -p <mat_khau>');
  console.error('  3. Hoặc đặt biến môi trường MYSQL_PASSWORD=<mat_khau>');
  process.exit(runImport.status || 1);
}

// Hàm thực thi truy vấn SQL
function runQuery(sql) {
  const qArgs = [...baseArgs, '-N', '-D', database, '-e', sql];
  const r = spawnSync(mysqlBin, qArgs, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`Truy vấn thất bại: ${(r.stderr || r.error?.message || '').trim()}`);
  }
  return (r.stdout || '').trim();
}

try {
  // SCRUM-87: Dời ngày các chuyến theo ngày hiện tại để luôn có ít nhất 4 chuyến trong tương lai
  console.log('🔄 Đang đồng bộ ngày chuyến theo ngày hiện tại...');
  const shiftSql = `
    SET @ref_date = (SELECT DATE(DepartureAt) FROM trips WHERE Id = 4);
    SET @day_diff = DATEDIFF(CURRENT_DATE(), @ref_date);
    UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL @day_diff DAY) WHERE @day_diff > 0 ORDER BY DepartureAt DESC;
    UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL @day_diff DAY) WHERE @day_diff < 0 ORDER BY DepartureAt ASC;
  `;
  runQuery(shiftSql);

  // Kiểm tra số chuyến tương lai (> UTC_TIMESTAMP + 30 phút).
  // Nếu nạp vào cuối ngày (các chuyến trong ngày đã qua), tự động dời thêm để luôn đủ ít nhất 4 chuyến tương lai.
  const checkFutureSql = `
    SELECT COUNT(*) FROM trips
    WHERE Status = 'Scheduled'
      AND BusId IS NOT NULL
      AND DepartureAt > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE);
  `;
  let futureCount = Number(runQuery(checkFutureSql) || 0);
  while (futureCount < 4) {
    // ORDER BY DESC: dời chuyến muộn nhất trước để không đè lên khóa duy nhất (BusId, DepartureAt).
    runQuery("UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL 1 DAY) ORDER BY DepartureAt DESC;");
    futureCount = Number(runQuery(checkFutureSql) || 0);
  }

  // 1. Kiểm tra các chuyến tương lai (> UTC_TIMESTAMP() + 30 phút)
  const futureTripsQuery = `
    SELECT t.Id, r.Code, b.PlateNumber, t.DepartureAt,
           DATE_ADD(t.DepartureAt, INTERVAL 7 HOUR) AS DepartureVN,
           GROUP_CONCAT(CONCAT(ts.Duty, ': ', a.Username) SEPARATOR ', ') AS Staff
    FROM trips t
    JOIN routes r ON r.Id = t.RouteId
    LEFT JOIN buses b ON b.Id = t.BusId
    LEFT JOIN trip_staff ts ON ts.TripId = t.Id
    LEFT JOIN accounts a ON a.Id = ts.AccountId
    WHERE t.Status = 'Scheduled'
      AND t.BusId IS NOT NULL
      AND t.DepartureAt > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)
    GROUP BY t.Id, r.Code, b.PlateNumber, t.DepartureAt
    ORDER BY t.DepartureAt, t.Id;
  `;
  const rawTrips = runQuery(futureTripsQuery);
  const tripRows = rawTrips ? rawTrips.split('\n').filter(Boolean) : [];

  console.log(`✅ Nạp dữ liệu thành công! Tìm thấy ${tripRows.length} chuyến tương lai sẵn sàng đặt vé:`);
  console.log('   (Yêu cầu: ít nhất 4 chuyến tương lai)');
  console.log('');
  console.log('   ID | Tuyến | Xe          | Giờ VN (UTC+7)      | Giờ UTC             | Nhân sự');
  console.log('   ---+-------+-------------+---------------------+---------------------+----------------------');
  for (const row of tripRows) {
    const [id, code, plate, depUtc, depVn, staff] = row.split('\t');
    console.log(`   ${id.padEnd(2)} | ${code.padEnd(5)} | ${(plate || 'Chưa gán').padEnd(11)} | ${(depVn || '').slice(0, 19).padEnd(19)} | ${(depUtc || '').slice(0, 19).padEnd(19)} | ${staff || 'Chưa phân công'}`);
  }

  // 2. Kiểm tra 7 tài khoản demo (sửa cột đọc trạng thái Active - cột thứ 5)
  const accountsQuery = `
    SELECT Id, Username, Role, FullName, Active
    FROM accounts
    WHERE Id <= 7
    ORDER BY Id;
  `;
  const rawAccs = runQuery(accountsQuery);
  const accRows = rawAccs ? rawAccs.split('\n').filter(Boolean) : [];

  console.log('\n--------------------------------------------------------------------');
  console.log(`👤 7 TÀI KHOẢN DEMO (Mật khẩu chung cho tất cả: Admin@12345):`);
  console.log('   ID | Username    | Vai trò    | Họ tên              | Trạng thái');
  console.log('   ---+-------------+------------+---------------------+-----------');
  for (const row of accRows) {
    const [id, username, role, fullName, activeRaw] = row.split('\t');
    const active = (activeRaw || '').trim();
    const status = (active === '1' || active.toLowerCase() === 'true') ? 'Hoạt động' : 'Khóa';
    console.log(`   ${id.padEnd(2)} | ${username.padEnd(11)} | ${(role || '').padEnd(10)} | ${(fullName || '').padEnd(19)} | ${status}`);
  }

  console.log('====================================================================');
  if (tripRows.length >= 4 && accRows.length >= 7) {
    console.log('🎉 TIÊU CHÍ HOÀN THÀNH ĐẠT: Có ít nhất 4 chuyến tương lai & 7 tài khoản demo!');
  } else {
    console.warn('⚠️ Cảnh báo: Số lượng chuyến hoặc tài khoản chưa đạt mức tối thiểu.');
  }
  console.log('====================================================================\n');
} catch (e) {
  console.error(`⚠️ Đã nạp file SQL nhưng gặp lỗi khi kiểm tra lại: ${e.message}`);
}
