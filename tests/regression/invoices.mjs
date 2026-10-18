// SCRUM-99: trang hóa đơn cho quản trị — lọc hóa đơn và đối chiếu tổng tiền với báo cáo doanh thu cùng kỳ.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/invoices.mjs
// Cần backend ở chế độ Development và bật bộ giả lập thanh toán: Payments__Simulator__Enabled=true.
import { sec, check, is, ok, sql, call, login, createPassengers, futureTrips, freeSeats, buy, finish } from './lib.mjs';

const admin = await login('admin');
const manager = await login('manager');
const [pax] = await createPassengers(admin, 1);

const [TRIP] = futureTrips(1);
if (!TRIP) { console.error('Không có chuyến nào còn ở tương lai trong CSDL demo.'); finish(); process.exit(2); }

// Kỳ báo cáo và tuyến của chuyến thử: hóa đơn lọc theo ngày khởi hành (giờ VN) nên lấy đúng mốc đó.
const [day, routeId] = sql(
  `select date(convert_tz(DepartureAt,'+00:00','+07:00')), RouteId from trips where Id=${TRIP}`
).split('\t');
console.log(`Chuyến ${TRIP}: tuyến ${routeId}, ngày khởi hành ${day}`);

const seats = await freeSeats(TRIP, 2);
const bought = await buy(pax, TRIP, seats);
console.log(`Đã mua ${seats.length} ghế, tổng ${bought.amount} đ`);

const list = (q = '') => call(admin, 'GET', `/api/invoices${q}`);
const summary = (q = '') => call(admin, 'GET', `/api/invoices/summary${q}`);
const period = `?from=${day}&to=${day}&routeId=${routeId}`;

sec('1. Quyền truy cập');
is('Hành khách gọi danh sách hóa đơn của quản trị -> 403', (await call(pax.token, 'GET', '/api/invoices')).s, 403);
is('Không có token -> 401', (await call(null, 'GET', '/api/invoices')).s, 401);
is('Quản lý xem được', (await call(manager, 'GET', '/api/invoices')).s, 200);
is('Hành khách vẫn xem được hóa đơn của mình', (await call(pax.token, 'GET', '/api/invoices/my')).s, 200);

sec('2. Lọc hóa đơn');
const all = await list();
check('Danh sách không lọc trả về mảng', Array.isArray(all.j), all.t.slice(0, 120));
const inPeriod = await list(period);
check('Lọc theo kỳ và tuyến: mọi hóa đơn đều thuộc đúng tuyến',
  inPeriod.j.every((i) => i.routeCode === all.j.find((a) => a.id === i.id)?.routeCode) && inPeriod.j.length > 0,
  `${inPeriod.j.length} hóa đơn`);
check('Hóa đơn vừa mua nằm trong kỳ', inPeriod.j.some((i) => i.bookingCode && i.total === bought.amount));

// Tên lấy từ API chứ không từ mysql CLI: đầu ra của mysql không phải UTF-8 nên tên có dấu bị hỏng.
const paxName = inPeriod.j.find((i) => i.total === bought.amount).passengerName;
const byName = await list(`?search=${encodeURIComponent(paxName)}`);
check('Tìm theo tên khách chỉ trả hóa đơn của khách đó',
  byName.j.length > 0 && byName.j.every((i) => i.passengerName === paxName), `${byName.j.length} hóa đơn`);

const invoiceNo = inPeriod.j.find((i) => i.total === bought.amount)?.invoiceNo;
const byNo = await list(`?search=${encodeURIComponent(invoiceNo)}`);
is('Tìm theo số hóa đơn trả đúng 1 dòng', byNo.j.length, 1);

const byMethod = await list('?method=Momo');
check('Lọc theo phương thức chỉ trả giao dịch MoMo',
  byMethod.j.length > 0 && byMethod.j.every((i) => i.method === 'Momo'), `${byMethod.j.length} hóa đơn`);
is('Lọc theo phương thức không có thật -> 400', (await list('?method=KhongCo')).s, 400);
is('Ngày sai định dạng -> 400', (await list('?from=17-10-2026')).s, 400);
is('Tình trạng email sai -> 400', (await list('?emailStatus=Linh tinh')).s, 400);
const future = await list('?from=2099-01-01');
is('Kỳ không có dữ liệu trả danh sách rỗng', future.j.length, 0);

sec('3. Tổng hợp khớp danh sách');
const s1 = await summary(period);
is('Số hóa đơn của tổng hợp bằng số dòng danh sách', s1.j.count, inPeriod.j.length);
const listedTotal = inPeriod.j.reduce((t, i) => t + Number(i.total), 0);
check('Tổng tiền của tổng hợp bằng tổng các dòng', Math.abs(Number(s1.j.total) - listedTotal) < 1,
  `tổng hợp ${s1.j.total}, danh sách ${listedTotal}`);

sec('4. Hóa đơn khớp doanh thu cùng kỳ');
const rev = await call(admin, 'GET', `/api/reports/revenue?startDate=${day}&endDate=${day}&routeId=${routeId}`);
is('Lấy được báo cáo doanh thu', rev.s, 200);
const gross = Number(rev.j?.summary?.totalGross ?? -1);
check('Tổng tiền hóa đơn bằng doanh thu gộp cùng kỳ, cùng tuyến', Math.abs(Number(s1.j.total) - gross) < 1,
  `hóa đơn ${s1.j.total}, doanh thu ${gross}`);

const sAll = await summary();
const revAll = await call(admin, 'GET', '/api/reports/revenue');
check('Không lọc: tổng hóa đơn bằng doanh thu gộp toàn bộ',
  Math.abs(Number(sAll.j.total) - Number(revAll.j?.summary?.totalGross ?? -1)) < 1,
  `hóa đơn ${sAll.j.total}, doanh thu ${revAll.j?.summary?.totalGross}`);

finish();
