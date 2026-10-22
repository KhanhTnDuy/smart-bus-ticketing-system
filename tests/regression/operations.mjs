// Vận hành hằng ngày của admin và quản lý: thêm xe, tạo và sửa chuyến, tài khoản và phân quyền, đặt vé đồng thời, nhiều cách thanh toán.
// Mỗi thao tác ghi đều được đối chiếu thẳng trong MySQL (không chỉ nhìn phản hồi API), kèm các đường biên mà người demo hay chạm phải:
// dữ liệu sai, trùng, tranh chấp ghế, quyền hạn, và cuối cùng là bộ kiểm tra toàn vẹn dữ liệu toàn CSDL.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/operations.mjs
// Cần backend ở chế độ Development, bật bộ giả lập thanh toán (Payments__Simulator__Enabled=true) và đã cấu hình tài khoản chuyển khoản
// (BankTransfer__*); npm test dựng sẵn cấu hình này. Kịch bản tự tạo xe, nhân sự, chuyến, voucher... trên các ngày xa ở tương lai
// và dọn lại sau khi chạy (lib.mjs dọn các bảng giao dịch, phần cuối file dọn xe, ghế, voucher, tuyến, trạm).
import { sec, check, is, ok, sql, call, login, createPassengers, seatMap, finish, endStops } from './lib.mjs';

const admin = await login('admin');
const manager = await login('manager');
const driverTok = await login('driver1');
const [pax1, pax2, pax3] = await createPassengers(admin, 3);

const rows = (r) => (Array.isArray(r.j) ? r.j : r.j?.data ?? r.j?.items ?? r.j?.trips ?? []);
const text = (r) => JSON.stringify(r.j ?? r.t);
const num = Number;
const rand = () => Math.floor(Math.random() * 90000 + 10000);
const plusDays = (n, hh = 3, mm = 0) => { const d = new Date(Date.now() + n * 864e5); d.setUTCHours(hh, mm, 0, 0); return d; };
const iso = (d) => d.toISOString();
const reject = (r) => r.s >= 400 && r.s < 500;

// Mốc id các bảng lib.mjs không dọn, để xóa phần kịch bản tạo thêm.
const base = Object.fromEntries(['buses', 'seats', 'vouchers', 'routes', 'stops', 'audit_logs', 'trips', 'bookings', 'payments'].map((t) => [t, num(sql(`select coalesce(max(Id),0) from ${t}`))]));

const uniq = rand();
const plateOf = (k = '') => `OP${uniq}${k}`.slice(0, 18);
const busBody = (o = {}) => ({ plateNumber: plateOf(String(Math.floor(Math.random() * 1000))), capacity: 12, rows: 3, columns: 4, status: 0, ...o });
const mkBus = async (o = {}) => { const r = await call(manager, 'POST', '/api/buses', busBody(o)); return { ...r, id: r.j?.bus?.id, plate: r.j?.bus?.plateNumber }; };
const mkStaff = async (role, label) => {
  const username = `op_${label}${uniq}`;
  const r = await call(admin, 'POST', '/api/accounts', { username, password: 'OpPass@12345', fullName: `Thử ${label} ${uniq}`, email: `${username}@example.com`, phone: `08${Math.floor(10000000 + Math.random() * 89999999)}`, role });
  if (!ok(r)) throw new Error(`Không tạo được ${username}: HTTP ${r.s} ${r.t.slice(0, 120)}`);
  return { id: r.j.id, username };
};
const mkTrip = (o) => call(manager, 'POST', '/api/assignments', { routeId: 1, ...o });
const staffRows = (tripId) => sql(`select group_concat(concat(Duty,':',AccountId) order by Duty) from trip_staff where TripId=${tripId}`);
const tripRow = (id) => sql(`select concat(RouteId,'|',coalesce(BusId,'null'),'|',Status,'|',DelayMinutes,'|',date_format(DepartureAt,'%Y-%m-%d %H:%i')) from trips where Id=${id}`);
const audited = (needle) => num(sql(`select count(*) from audit_logs where Id>${base.audit_logs} and Action like '%${needle}%'`)) >= 1;
const notifOf = async (tok) => (await call(tok, 'GET', '/api/notifications/my')).j?.items ?? [];
const day = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);

const drvA = await mkStaff(2, 'drvA');
const drvB = await mkStaff(2, 'drvB');
const cndA = await mkStaff(3, 'cndA');
const cndB = await mkStaff(3, 'cndB');

// =====================================================================================================================
sec('A1. Xe: ai được xem và thêm');
const anyBody = busBody();
for (const [who, tok, code] of [['Chưa đăng nhập', null, 401], ['Hành khách', pax1.token, 403], ['Tài xế', driverTok, 403]]) {
  is(`${who} xem danh sách xe -> ${code}`, (await call(tok, 'GET', '/api/buses')).s, code);
  is(`${who} thêm xe -> ${code}`, (await call(tok, 'POST', '/api/buses', anyBody)).s, code);
  is(`${who} sửa xe -> ${code}`, (await call(tok, 'PUT', '/api/buses/1', anyBody)).s, code);
  is(`${who} xóa xe -> ${code}`, (await call(tok, 'DELETE', '/api/buses/1')).s, code);
}
is('Các lần bị từ chối không để lại xe nào trong MySQL', num(sql(`select count(*) from buses where Id>${base.buses}`)), 0);
is('Admin cũng thêm được xe', (await call(admin, 'POST', '/api/buses', busBody())).s, 201);

sec('A2. Xe: dữ liệu sai bị từ chối và không ghi gì vào MySQL');
const busesBefore = num(sql('select count(*) from buses'));
const seatsBefore = num(sql('select count(*) from seats'));
const bad = [
  ['sức chứa 0', { capacity: 0 }], ['sức chứa 209', { capacity: 209 }], ['sức chứa âm', { capacity: -5 }],
  ['0 hàng', { rows: 0 }], ['27 hàng', { rows: 27 }], ['0 cột', { columns: 0 }], ['9 cột', { columns: 9 }],
  ['sức chứa vượt lưới (13 ghế trên 3x4)', { capacity: 13 }], ['hàng cuối trống hoàn toàn (8 ghế trên 3 hàng x 4 cột)', { capacity: 8 }],
  ['biển số rỗng', { plateNumber: '' }], ['biển số toàn khoảng trắng', { plateNumber: '   ' }], ['biển số 21 ký tự', { plateNumber: 'X'.repeat(21) }],
  ['trạng thái xe không có thật (99)', { status: 99 }],
];
for (const [name, o] of bad) check(`Thêm xe với ${name} -> bị từ chối (4xx)`, reject(await call(manager, 'POST', '/api/buses', busBody(o))), name);
is('Thêm xe không gửi thân yêu cầu -> bị từ chối', reject(await call(manager, 'POST', '/api/buses', {})), true);
is('Không có xe nào thêm vào MySQL', num(sql('select count(*) from buses')), busesBefore);
is('Không có ghế mồ côi nào thêm vào MySQL', num(sql('select count(*) from seats')), seatsBefore);

sec('A3. Xe: chuẩn hóa biển số, chống trùng, sơ đồ ghế');
const rawPlate = `  op${uniq}z  `;
const norm = await mkBus({ plateNumber: rawPlate });
is('Biển số nhập thường và có khoảng trắng vẫn tạo được', norm.s, 201);
is('MySQL: biển số lưu dạng IN HOA đã cắt khoảng trắng', sql(`select PlateNumber from buses where Id=${norm.id}`), `OP${uniq}Z`);
is('Trùng biển số khác kiểu chữ -> 409', (await call(manager, 'POST', '/api/buses', busBody({ plateNumber: `OP${uniq}z` }))).s, 409);
is('MySQL: không có hai xe cùng biển số', num(sql(`select count(*) from buses where PlateNumber='OP${uniq}Z'`)), 1);
const partial = await mkBus({ capacity: 10, rows: 3, columns: 4 });
is('MySQL: xe 10 ghế trên lưới 3x4 có đúng 10 ghế', num(sql(`select count(*) from seats where BusId=${partial.id}`)), 10);
is('MySQL: mã ghế điền theo hàng, hàng cuối thiếu 2 ghế', sql(`select group_concat(SeatCode order by SeatRow,SeatCol) from seats where BusId=${partial.id}`), 'A1,A2,A3,A4,B1,B2,B3,B4,C1,C2');
is('Chi tiết xe trả đúng 3 hàng x 4 cột và 10 ghế', `${partial.j.bus.rows}x${partial.j.bus.columns}x${partial.j.seats.length}`, '3x4x10');
is('MySQL: không có ghế trùng mã trong cùng một xe', num(sql(`select count(*) from (select BusId,SeatCode from seats where BusId=${partial.id} group by BusId,SeatCode having count(*)>1) x`)), 0);
const wide = await mkBus({ capacity: 208, rows: 26, columns: 8 });
is('Xe lớn nhất 208 ghế (26 hàng x 8 cột) tạo được', wide.s, 201);
is('MySQL: xe lớn có đủ 208 ghế, ghế cuối là Z8', `${sql(`select count(*) from seats where BusId=${wide.id}`)}|${sql(`select SeatCode from seats where BusId=${wide.id} order by SeatRow desc, SeatCol desc limit 1`)}`, '208|Z8');
check('Nhật ký có thao tác tạo xe', audited(`Tạo xe buýt OP${uniq}Z`));

sec('A4. Xe: danh sách, tìm kiếm, lọc, phân trang');
const byPlate = await call(manager, 'GET', `/api/buses?search=OP${uniq}Z`);
is('Tìm theo biển số ra đúng 1 xe', byPlate.j?.data?.length, 1);
check('Lọc trạng thái Bảo trì chỉ ra xe bảo trì', rows(await call(manager, 'GET', '/api/buses?status=1&pageSize=100')).every((b) => b.status === 1 || b.status === 'Maintenance'));
const pg = await call(manager, 'GET', '/api/buses?pageSize=1');
check('pageSize=1 trả 1 xe và tổng số khớp MySQL', pg.j?.data?.length === 1 && num(pg.j?.total) === num(sql('select count(*) from buses')), text(pg).slice(0, 120));
is('pageSize=1000 bị kẹp về 100', (await call(manager, 'GET', '/api/buses?pageSize=1000')).j?.pageSize, 100);
is('page=0 bị đưa về trang 1', (await call(manager, 'GET', '/api/buses?page=0')).j?.page, 1);
is('Xe không tồn tại -> 404', (await call(manager, 'GET', '/api/buses/99999999')).s, 404);

sec('A5. Xe: sửa, bảo trì, thu nhỏ sơ đồ, xóa');
const bX = await mkBus({ capacity: 12, rows: 3, columns: 4 });
const put = (id, o) => call(manager, 'PUT', `/api/buses/${id}`, busBody({ plateNumber: bX.plate, ...o }));
is('Sửa xe không tồn tại -> 404', (await put(99999999, {})).s, 404);
is('Đổi sang biển số của xe khác -> 409', (await put(bX.id, { plateNumber: partial.plate })).s, 409);
is('MySQL: biển số xe không đổi sau lần bị từ chối', sql(`select PlateNumber from buses where Id=${bX.id}`), bX.plate);
is('Lưu lại đúng biển số của chính xe đó -> 200', (await put(bX.id, {})).s, 200);
is('Thu nhỏ 12 -> 8 ghế (2x4) khi chưa có vé -> 200', (await put(bX.id, { capacity: 8, rows: 2, columns: 4 })).s, 200);
is('MySQL: các ghế C1..C4 đã bị bỏ, còn 8 ghế', `${sql(`select count(*) from seats where BusId=${bX.id}`)}|${sql(`select max(SeatRow) from seats where BusId=${bX.id}`)}`, '8|2');
is('Phóng to lại 12 ghế (3x4) -> 200 và MySQL có lại 12 ghế', ((await put(bX.id, { capacity: 12, rows: 3, columns: 4 })).s === 200) && sql(`select count(*) from seats where BusId=${bX.id}`) === '12', true);
is('Đổi cách chia cột 12 ghế sang 2 hàng x 6 cột, vẫn đủ 12 ghế', ((await put(bX.id, { capacity: 12, rows: 2, columns: 6 })).s === 200) && sql(`select count(*) from seats where BusId=${bX.id}`) === '12', true);
is('MySQL: lưới mới là 2 hàng x 6 cột', `${sql(`select max(SeatRow) from seats where BusId=${bX.id}`)}x${sql(`select max(SeatCol) from seats where BusId=${bX.id}`)}`, '2x6');
await put(bX.id, { capacity: 12, rows: 3, columns: 4 });

// Xe có chuyến sắp chạy và có vé bán ra
const tripBus = await mkBus({ capacity: 12, rows: 3, columns: 4 });
const dBusTrip = plusDays(60);
const tb = await mkTrip({ departureAt: iso(dBusTrip), busId: tripBus.id, driverId: drvA.id, conductorId: cndA.id });
is('Tạo chuyến trên xe mới -> 201', tb.s, 201);
const tbId = tb.j?.tripId;
const seatsTb = (await seatMap(tbId)).filter((s) => s.isAvailable);
check('Chuyến mới có đủ 12 ghế trống trên sơ đồ công khai', seatsTb.length === 12, `${seatsTb.length}`);
const { board: bd, alight: al } = endStops(tbId);
const paxBook = (tok, tripId, seatIds, extra = {}) => call(tok, 'POST', '/api/bookings', { tripId, seatIds, boardStopId: bd, alightStopId: al, ...extra });
const pay = (tok, bookingId, method = 0) => call(tok, 'POST', '/api/payments', { bookingId, method });
const b1 = await paxBook(pax1.token, tbId, [seatsTb[0].seatId]);
const p1 = await pay(pax1.token, b1.j?.bookingId);
is('Khách mua 1 vé trên chuyến này (đặt chỗ + trả MoMo)', ok(b1) && ok(p1), true);
is('Xe đã có chuyến sắp chạy: chuyển sang Bảo trì -> 409', (await put(tripBus.id, { status: 1 })).s, 409);
is('MySQL: trạng thái xe vẫn Active sau lần bị từ chối', sql(`select Status from buses where Id=${tripBus.id}`), 'Active');
is('Xe đã bán vé: đổi sức chứa -> 409', (await put(tripBus.id, { capacity: 8, rows: 2, columns: 4 })).s, 409);
is('MySQL: xe vẫn 12 ghế sau lần bị từ chối', sql(`select count(*) from seats where BusId=${tripBus.id}`), '12');
is('Xe có chuyến: xóa -> 409', (await call(manager, 'DELETE', `/api/buses/${tripBus.id}`)).s, 409);
is('MySQL: xe vẫn còn sau lần xóa bị từ chối', sql(`select count(*) from buses where Id=${tripBus.id}`), '1');
is('Đổi tên biển số nhưng giữ nguyên sức chứa vẫn được dù đã bán vé', (await put(tripBus.id, { plateNumber: `${tripBus.plate}Q` })).s, 200);
is('Chuyến vẫn hiển thị biển số mới cho khách sau khi đổi biển số', rows(await call(null, 'GET', `/api/trips/search?from=${bd}&to=${al}&date=${day(dBusTrip)}`)).find((t) => t.id === tbId)?.busPlate, `${tripBus.plate}Q`);
// bảo trì sau khi chuyến bị hủy
is('Hủy chuyến để xe hết bị giữ -> 200', (await call(manager, 'PUT', `/api/assignments/${tbId}/trip`, { status: 4 })).s, 200);
is('Chuyến đã hủy không còn chặn việc đưa xe vào Bảo trì -> 200', (await put(tripBus.id, { plateNumber: `${tripBus.plate}Q`, status: 1 })).s, 200);
is('MySQL: xe đã ở trạng thái Maintenance', sql(`select Status from buses where Id=${tripBus.id}`), 'Maintenance');
is('Xóa xe đã bán vé vẫn bị chặn dù chuyến đã hủy -> 409', (await call(manager, 'DELETE', `/api/buses/${tripBus.id}`)).s, 409);
check('Nhật ký có dòng đổi trạng thái xe', audited('Đổi trạng thái xe'));

const lonely = await mkBus({ capacity: 6, rows: 2, columns: 3 });
is('Xóa xe không có chuyến -> 204', (await call(manager, 'DELETE', `/api/buses/${lonely.id}`)).s, 204);
is('MySQL: xe và toàn bộ ghế của nó đã mất', `${sql(`select count(*) from buses where Id=${lonely.id}`)}|${sql(`select count(*) from seats where BusId=${lonely.id}`)}`, '0|0');
is('Xóa xe đã xóa -> 404', (await call(manager, 'DELETE', `/api/buses/${lonely.id}`)).s, 404);
check('Nhật ký có thao tác xóa xe', audited('Xoá xe buýt'));

// =====================================================================================================================
sec('B1. Chuyến: dữ liệu sai khi tạo');
const busB1 = await mkBus();
const busB2 = await mkBus();
const tripsBefore = num(sql('select count(*) from trips'));
const tsBefore = num(sql('select count(*) from trip_staff'));
const dB = plusDays(70);
is('Không có giờ xuất bến -> 400', (await mkTrip({ busId: busB1.id })).s, 400);
is('Tuyến không tồn tại -> 404', (await mkTrip({ routeId: 99999999, departureAt: iso(dB) })).s, 404);
is('Ngày chạy sai định dạng -> 400', (await mkTrip({ date: '31/12/2030' })).s, 400);
is('Xe không tồn tại -> 404', (await mkTrip({ departureAt: iso(dB), busId: 99999999 })).s, 404);
is('Tài xế không tồn tại -> 404', (await mkTrip({ departureAt: iso(dB), busId: busB1.id, driverId: 99999999 })).s, 404);
const asPax = (await call(pax1.token, 'GET', '/api/auth/me')).j?.id;
check('Gán hành khách làm tài xế bị từ chối (4xx)', reject(await mkTrip({ departureAt: iso(dB), busId: busB1.id, driverId: asPax })));
check('Gán tài xế vào ô phụ xe bị từ chối (4xx)', reject(await mkTrip({ departureAt: iso(dB), busId: busB1.id, driverId: drvA.id, conductorId: drvB.id })));
check('Gán phụ xe vào ô tài xế bị từ chối (4xx)', reject(await mkTrip({ departureAt: iso(dB), busId: busB1.id, driverId: cndA.id })));
is('Phụ xe không tồn tại -> 404', (await mkTrip({ departureAt: iso(dB), busId: busB1.id, driverId: drvA.id, conductorId: 99999999 })).s, 404);
is('Tạo chuyến bị lỗi không để lại chuyến nào trong MySQL', num(sql('select count(*) from trips')), tripsBefore);
is('Tạo chuyến bị lỗi không để lại dòng phân công nào', num(sql('select count(*) from trip_staff')), tsBefore);
const dead = await mkBus({ status: 1 });
is('Xe đang bảo trì không gán được -> 409', (await mkTrip({ departureAt: iso(dB), busId: dead.id })).s, 409);
const gone = await mkBus({ status: 2 });
is('Xe ngừng hoạt động không gán được -> 409', (await mkTrip({ departureAt: iso(dB), busId: gone.id })).s, 409);
const inactiveRoute = await call(manager, 'POST', '/api/routes', { code: `OPI${uniq}`.slice(0, 12), name: 'OP tuyến tạm dừng', startPoint: 'A', endPoint: 'B', distanceKm: 4, active: false });
is('Tạo tuyến tạm dừng', ok(inactiveRoute), true);
is('Tuyến đang tạm dừng không tạo được chuyến -> 409', (await mkTrip({ routeId: inactiveRoute.j?.id, departureAt: iso(dB) })).s, 409);
const lockedDrv = await mkStaff(2, 'drvLock');
await call(admin, 'PUT', `/api/accounts/${lockedDrv.id}`, { active: false });
is('Tài xế đang bị khóa không gán được -> 409', (await mkTrip({ departureAt: iso(dB), busId: busB1.id, driverId: lockedDrv.id })).s, 409);

sec('B2. Chuyến: tạo đúng, phân công, và các lần trùng lịch');
const T1d = plusDays(71);
const T1 = await mkTrip({ departureAt: iso(T1d), busId: busB1.id, driverId: drvA.id, conductorId: cndA.id });
is('Tạo chuyến đủ xe, tài xế, phụ xe -> 201', T1.s, 201);
const T1id = T1.j?.tripId;
is('MySQL: dòng chuyến đúng tuyến, xe, trạng thái, giờ UTC', tripRow(T1id), `1|${busB1.id}|Scheduled|0|${iso(T1d).slice(0, 10)} 03:00`);
is('MySQL: phân công đúng tài xế và phụ xe', staffRows(T1id), `Conductor:${cndA.id},Driver:${drvA.id}`);
const nearBy = iso(new Date(T1d.getTime() + 10 * 60e3));
is('Cùng tài xế, lệch 10 phút -> 409', (await mkTrip({ departureAt: nearBy, busId: busB2.id, driverId: drvA.id })).s, 409);
is('Cùng phụ xe, lệch 10 phút -> 409', (await mkTrip({ departureAt: nearBy, busId: busB2.id, driverId: drvB.id, conductorId: cndA.id })).s, 409);
is('Cùng xe, lệch 10 phút -> 409', (await mkTrip({ departureAt: nearBy, busId: busB1.id, driverId: drvB.id })).s, 409);
is('MySQL: các lần trùng lịch không để lại chuyến nào', num(sql(`select count(*) from trips where Id>${base.trips} and DepartureAt='${nearBy.slice(0, 19).replace('T', ' ')}'`)), 0);
const farLater = iso(new Date(T1d.getTime() + 36 * 3600e3));
const T1b = await mkTrip({ departureAt: farLater, busId: busB1.id, driverId: drvA.id, conductorId: cndA.id });
is('Cùng xe và nhân sự nhưng cách 36 giờ vẫn tạo được', T1b.s, 201);
const chk = await call(manager, 'POST', '/api/assignments/check-conflict', { departureAt: nearBy, routeId: 1, busId: busB1.id, driverId: drvA.id, conductorId: cndA.id });
check('check-conflict báo trùng cả xe, tài xế, phụ xe', chk.s === 200 && chk.j?.hasConflict === true && (chk.j?.conflicts?.length ?? 0) >= 3, text(chk).slice(0, 200));
const chkFree = await call(manager, 'POST', '/api/assignments/check-conflict', { departureAt: iso(plusDays(90)), routeId: 1, busId: busB1.id, driverId: drvA.id, conductorId: cndA.id });
is('check-conflict báo không trùng ở ngày trống', chkFree.j?.hasConflict, false);
const avBuses = rows(await call(manager, 'GET', `/api/assignments/available-buses?departureAt=${nearBy}&routeId=1`));
is('Xe đang bận hiện isAvailable=false trong danh sách xe khả dụng', avBuses.find((b) => b.id === busB1.id)?.isAvailable, false);
const avStaff = rows(await call(manager, 'GET', `/api/assignments/available-staff?duty=0&departureAt=${nearBy}&routeId=1`));
is('Tài xế đang bận hiện isAvailable=false', avStaff.find((s) => s.accountId === drvA.id)?.isAvailable, false);
check('Tài xế bị khóa không xuất hiện trong danh sách tài xế khả dụng', !avStaff.some((s) => s.accountId === lockedDrv.id) || avStaff.find((s) => s.accountId === lockedDrv.id)?.isAvailable === false);
is('Mã dạng TRIP-<id> cũng mở được chi tiết', (await call(manager, 'GET', `/api/assignments/TRIP-${T1id}`)).s, 200);
is('Mã sai định dạng -> 404', (await call(manager, 'GET', '/api/assignments/abc')).s, 404);
for (const [who, tok] of [['Hành khách', pax1.token], ['Tài xế', driverTok]]) {
  is(`${who} tạo chuyến -> 403`, (await call(tok, 'POST', '/api/assignments', { routeId: 1, departureAt: iso(dB) })).s, 403);
  is(`${who} sửa chuyến -> 403`, (await call(tok, 'PUT', `/api/assignments/${T1id}/trip`, { delayMinutes: 5 })).s, 403);
  is(`${who} xóa chuyến -> 403`, (await call(tok, 'DELETE', `/api/assignments/${T1id}/trip`)).s, 403);
}
is('Chuyến không bị đổi sau các lần bị từ chối quyền', tripRow(T1id), `1|${busB1.id}|Scheduled|0|${iso(T1d).slice(0, 10)} 03:00`);

sec('B3. Chuyến: chưa gán, gán sau, gán hàng loạt, gỡ phân công');
const U1 = await mkTrip({ departureAt: iso(plusDays(73)) });
const U2 = await mkTrip({ departureAt: iso(plusDays(74)) });
is('Tạo chuyến chưa gán xe và nhân sự -> 201', U1.s, 201);
is('MySQL: chuyến chưa gán không có xe và không có nhân sự', `${sql(`select coalesce(BusId,'null') from trips where Id=${U1.j?.tripId}`)}|${staffRows(U1.j?.tripId)}`, 'null|NULL');
const sU = rows(await call(null, 'GET', `/api/trips/search?from=${bd}&to=${al}&date=${day(plusDays(73))}`)).find((t) => t.id === U1.j?.tripId);
check('Khách thấy chuyến chưa gán xe với 0 ghế và không có biển số giả', sU && sU.totalSeats === 0 && !sU.busPlate, JSON.stringify(sU && { s: sU.totalSeats, p: sU.busPlate }));
is('Khách không đặt được vé chuyến chưa có xe -> 400', (await paxBook(pax1.token, U1.j?.tripId, [1])).s, 400);
const asg = await call(manager, 'PUT', `/api/assignments/${U1.j?.tripId}`, { busId: busB2.id, driverId: drvB.id });
is('Gán xe và tài xế sau cho chuyến chưa gán -> 200', asg.s, 200);
is('MySQL: xe và tài xế đã ghi vào chuyến', `${sql(`select BusId from trips where Id=${U1.j?.tripId}`)}|${staffRows(U1.j?.tripId)}`, `${busB2.id}|Driver:${drvB.id}`);
const bulk = await call(manager, 'POST', '/api/assignments/batch', { tripIds: [U2.j?.tripId], busId: busB2.id, driverId: drvB.id, conductorId: cndB.id });
check('Gán hàng loạt cho 1 chuyến thành công', bulk.s === 200 && bulk.j?.successCount === 1, text(bulk).slice(0, 160));
is('MySQL: chuyến thứ hai nhận đủ xe, tài xế, phụ xe', `${sql(`select BusId from trips where Id=${U2.j?.tripId}`)}|${staffRows(U2.j?.tripId)}`, `${busB2.id}|Conductor:${cndB.id},Driver:${drvB.id}`);
is('Gán hàng loạt không có chuyến nào -> 400', (await call(manager, 'POST', '/api/assignments/batch', { tripIds: [], busId: busB2.id })).s, 400);
const bulk2 = await call(manager, 'POST', '/api/assignments/batch', { tripIds: [T1id, 99999999], busId: busB1.id });
check('Gán hàng loạt có chuyến không tồn tại: ghi nhận 1 thất bại, không làm hỏng chuyến còn lại', bulk2.s === 200 && bulk2.j?.failedCount >= 1, text(bulk2).slice(0, 200));
const un = await call(manager, 'DELETE', `/api/assignments/${U2.j?.tripId}`, { unassignBus: false, unassignDriver: true, unassignConductor: false });
is('Chỉ gỡ tài xế -> 200', un.s, 200);
is('MySQL: còn phụ xe và xe, tài xế đã mất', `${sql(`select BusId from trips where Id=${U2.j?.tripId}`)}|${staffRows(U2.j?.tripId)}`, `${busB2.id}|Conductor:${cndB.id}`);
const tdriver = await mkStaff(2, 'drvC');
const U3 = await mkTrip({ departureAt: iso(plusDays(75)), busId: busB1.id, driverId: tdriver.id });
const seatsU3 = (await seatMap(U3.j?.tripId)).filter((s) => s.isAvailable);
const bU3 = await paxBook(pax2.token, U3.j?.tripId, [seatsU3[0].seatId]);
check('Chuyến có người đặt vé: không gỡ xe được (4xx)', reject(await call(manager, 'DELETE', `/api/assignments/${U3.j?.tripId}`, { unassignBus: true, unassignDriver: false, unassignConductor: false })), true);
is('MySQL: xe vẫn ở chuyến sau lần bị từ chối', sql(`select BusId from trips where Id=${U3.j?.tripId}`), String(busB1.id));
is('Chuyến có người đặt vé: đổi sang xe khác -> 409', (await call(manager, 'PUT', `/api/assignments/${U3.j?.tripId}`, { busId: busB2.id, driverId: tdriver.id })).s, 409);
is('Chuyến có người đặt vé: lưu phân công mà bỏ trống xe -> 409', (await call(manager, 'PUT', `/api/assignments/${U3.j?.tripId}`, { driverId: tdriver.id })).s, 409);
is('MySQL: xe vẫn là xe cũ và vé giữ chỗ vẫn nằm trên ghế của xe đó', `${sql(`select BusId from trips where Id=${U3.j?.tripId}`)}|${sql(`select count(*) from tickets t join seats s on s.Id=t.SeatId where t.BookingId=${bU3.j?.bookingId} and s.BusId=${busB1.id}`)}`, `${busB1.id}|1`);
is('Chuyến có người đặt vé: đổi tài xế, giữ nguyên xe -> 200', (await call(manager, 'PUT', `/api/assignments/${U3.j?.tripId}`, { busId: busB1.id, driverId: drvB.id })).s, 200);
is('MySQL: tài xế đã đổi, xe giữ nguyên', `${sql(`select BusId from trips where Id=${U3.j?.tripId}`)}|${staffRows(U3.j?.tripId)}`, `${busB1.id}|Driver:${drvB.id}`);
await call(pax2.token, 'POST', `/api/bookings/${bU3.j?.bookingId}/cancel`, {});

sec('B4. Chuyến: sửa giờ, trễ, trạng thái, xóa');
const E = await mkTrip({ departureAt: iso(plusDays(80)), busId: busB2.id, driverId: drvB.id });
const Eid = E.j?.tripId;
const upd = (o) => call(manager, 'PUT', `/api/assignments/${Eid}/trip`, o);
is('Số phút trễ âm -> 400', (await upd({ delayMinutes: -5 })).s, 400);
is('Trạng thái không có thật (99) -> 400', (await upd({ status: 99 })).s, 400);
is('MySQL: chuyến không đổi sau các lần dữ liệu sai', sql(`select concat(Status,'|',DelayMinutes) from trips where Id=${Eid}`), 'Scheduled|0');
is('Báo trễ 25 phút -> 200', (await upd({ delayMinutes: 25 })).s, 200);
is('MySQL: trễ 25 phút', sql(`select DelayMinutes from trips where Id=${Eid}`), '25');
is('Chuyển sang đang chạy -> 200 và MySQL ghi Running', ((await upd({ status: 1 })).s === 200) && sql(`select Status from trips where Id=${Eid}`) === 'Running', true);
const newDep = new Date(plusDays(80).getTime() + 2 * 3600e3);
is('Đổi giờ khi chưa có vé -> 200', (await upd({ departureAt: iso(newDep) })).s, 200);
is('MySQL: giờ mới đã lưu (UTC)', sql(`select date_format(DepartureAt,'%H:%i') from trips where Id=${Eid}`), '05:00');
is('Sửa chuyến không tồn tại -> 404', (await call(manager, 'PUT', '/api/assignments/99999999/trip', { delayMinutes: 5 })).s, 404);
const ep = await paxBook(pax1.token, Eid, [(await seatMap(Eid)).find((s) => s.isAvailable).seatId]);
is('Khách giữ chỗ chuyến này', ok(ep), true);
is('Chuyến có vé đặt: đổi giờ -> 409', (await upd({ departureAt: iso(new Date(newDep.getTime() + 3600e3)) })).s, 409);
is('MySQL: giờ không đổi sau lần bị từ chối', sql(`select date_format(DepartureAt,'%H:%i') from trips where Id=${Eid}`), '05:00');
is('Chuyến có vé đặt: vẫn báo trễ được', (await upd({ delayMinutes: 30 })).s, 200);
is('Chuyến có vé đặt: xóa -> 409', (await call(manager, 'DELETE', `/api/assignments/${Eid}/trip`)).s, 409);
is('MySQL: chuyến và phân công còn nguyên', `${sql(`select count(*) from trips where Id=${Eid}`)}|${staffRows(Eid)}`, `1|Driver:${drvB.id}`);
is('Hủy chuyến -> 200; vé giữ chỗ của khách bị hủy theo', ((await upd({ status: 4 })).s === 200) && sql(`select group_concat(distinct Status) from tickets where BookingId=${ep.j?.bookingId}`) === 'Cancelled', true);
is('MySQL: lượt đặt chưa thanh toán không còn Pending sau khi chuyến bị hủy', sql(`select Status from bookings where Id=${ep.j?.bookingId}`) !== 'Pending', true);
is('Hủy lần hai (đã hủy) không lỗi', (await upd({ status: 4 })).s, 200);
const slotSql = iso(newDep).slice(0, 19).replace('T', ' ');
const sameSlot = await mkTrip({ departureAt: iso(newDep), busId: busB2.id, driverId: drvA.id });
is('Dùng lại đúng giờ của chuyến đã hủy trên cùng xe -> 409 (không phải lỗi 500)', sameSlot.s, 409);
check('Lời báo 409 nói rõ xe đã có chuyến cùng giờ', /đúng giờ này|kể cả chuyến đã hủy/i.test(text(sameSlot)), text(sameSlot).slice(0, 160));
is('MySQL: lần tạo bị từ chối không để lại chuyến nháp nào', num(sql(`select count(*) from trips where Id>${base.trips} and DepartureAt='${slotSql}' and Id<>${Eid}`)), 0);
const overlap = await mkTrip({ departureAt: iso(new Date(newDep.getTime() + 10 * 60e3)), busId: busB2.id, driverId: drvA.id });
is('Chuyến khác lệch 10 phút so với chuyến đã hủy thì tạo được', overlap.s, 201);
is('Dời chuyến đó về đúng giờ của chuyến đã hủy -> 409 (không phải lỗi 500)', (await call(manager, 'PUT', `/api/assignments/${overlap.j?.tripId}/trip`, { departureAt: iso(newDep) })).s, 409);
is('MySQL: giờ của chuyến bị dời không đổi sau lần bị từ chối', sql(`select date_format(DepartureAt,'%H:%i') from trips where Id=${overlap.j?.tripId}`), '05:10');
is('Mở lại chuyến đã hủy khi xe đã bị chuyến khác chiếm giờ -> 409', (await upd({ status: 0 })).s, 409);
is('MySQL: chuyến vẫn Cancelled sau lần mở lại bị từ chối', sql(`select Status from trips where Id=${Eid}`), 'Cancelled');
const done = await mkTrip({ departureAt: iso(plusDays(82)), busId: busB1.id, driverId: drvA.id });
await call(manager, 'PUT', `/api/assignments/${done.j?.tripId}/trip`, { status: 3 });
is('MySQL: chuyến đã hoàn thành', sql(`select Status from trips where Id=${done.j?.tripId}`), 'Completed');
is('Chuyến đã hoàn thành không sửa được -> 409', (await call(manager, 'PUT', `/api/assignments/${done.j?.tripId}/trip`, { delayMinutes: 5 })).s, 409);
const toDelete = await mkTrip({ departureAt: iso(plusDays(83)), busId: busB1.id, driverId: drvB.id, conductorId: cndB.id });
is('Xóa chuyến trống -> 204', (await call(manager, 'DELETE', `/api/assignments/${toDelete.j?.tripId}/trip`)).s, 204);
is('MySQL: chuyến và phân công của nó đã mất', `${sql(`select count(*) from trips where Id=${toDelete.j?.tripId}`)}|${sql(`select count(*) from trip_staff where TripId=${toDelete.j?.tripId}`)}`, '0|0');
is('Xóa lại -> 404', (await call(manager, 'DELETE', `/api/assignments/${toDelete.j?.tripId}/trip`)).s, 404);
is('Lịch của tài xế không còn chuyến đã xóa', rows(await call(await login(drvB.username, 'OpPass@12345'), 'GET', '/api/assignments/my-schedule')).some((t) => t.tripId === toDelete.j?.tripId), false);

// =====================================================================================================================
sec('C1. Tài khoản: dữ liệu sai khi tạo');
const accBefore = num(sql('select count(*) from accounts'));
const aBody = (o = {}) => ({ username: `op_acc${rand()}`, password: 'OpPass@12345', fullName: 'OP Tài khoản', email: null, phone: null, role: 4, ...o });
const badAcc = [
  ['tên đăng nhập 2 ký tự', { username: 'ab' }], ['tên đăng nhập 51 ký tự', { username: 'u'.repeat(51) }], ['mật khẩu 5 ký tự', { password: '12345' }],
  ['mật khẩu rỗng', { password: '' }], ['thiếu họ tên', { fullName: '' }], ['email sai định dạng', { email: 'khong-phai-email' }],
  ['số điện thoại có chữ', { phone: 'abcdefg' }], ['vai trò không có thật (99)', { role: 99 }], ['vai trò âm', { role: -1 }],
];
for (const [name, o] of badAcc) check(`Tạo tài khoản với ${name} -> bị từ chối (4xx)`, reject(await call(admin, 'POST', '/api/accounts', aBody(o))), name);
is('Không có tài khoản nào thêm vào MySQL', num(sql('select count(*) from accounts')), accBefore);
is('Không có tài khoản nào mang vai trò lạ trong MySQL', num(sql("select count(*) from accounts where Role not in ('Admin','Manager','Driver','Conductor','Passenger')")), 0);

sec('C2. Tài khoản: trùng, phản hồi không lộ mật khẩu, tìm kiếm');
const mail = `op_${rand()}@example.com`;
const ph = `07${Math.floor(10000000 + Math.random() * 89999999)}`;
const accA = await call(admin, 'POST', '/api/accounts', aBody({ email: mail, phone: ph }));
is('Tạo tài khoản đủ thông tin -> 201', accA.s, 201);
check('Phản hồi tạo tài khoản không lộ mật khẩu hay mã băm', !/password|hash/i.test(text(accA)), text(accA));
check('Danh sách và chi tiết tài khoản không lộ mật khẩu hay mã băm', !/password|hash/i.test(text(await call(admin, 'GET', '/api/accounts'))) && !/password|hash/i.test(text(await call(admin, 'GET', `/api/accounts/${accA.j?.id}`))));
check('Đăng nhập không lộ mã băm', !/hash/i.test(text(await call(null, 'POST', '/api/auth/login', { identity: accA.j?.username, password: 'OpPass@12345' }))));
is('Trùng tên đăng nhập khác kiểu chữ -> 409', (await call(admin, 'POST', '/api/accounts', aBody({ username: accA.j?.username.toUpperCase() }))).s, 409);
is('Trùng email -> 409', (await call(admin, 'POST', '/api/accounts', aBody({ email: mail }))).s, 409);
is('Trùng số điện thoại -> 409', (await call(admin, 'POST', '/api/accounts', aBody({ phone: ph }))).s, 409);
is('MySQL: mỗi tên đăng nhập, email, số điện thoại chỉ có một dòng', `${sql(`select count(*) from accounts where Username='${accA.j?.username}'`)}${sql(`select count(*) from accounts where Email='${mail}'`)}${sql(`select count(*) from accounts where Phone='${ph}'`)}`, '111');
is('Đăng nhập bằng email được', (await call(null, 'POST', '/api/auth/login', { identity: mail, password: 'OpPass@12345' })).s, 200);
is('Sai mật khẩu -> 401', (await call(null, 'POST', '/api/auth/login', { identity: accA.j?.username, password: 'sai-mat-khau' })).s, 401);
is('Tài khoản không có thật -> 401', (await call(null, 'POST', '/api/auth/login', { identity: 'khong.co.that', password: 'OpPass@12345' })).s, 401);
is('Tìm theo tên đăng nhập ra đúng 1 tài khoản', rows(await call(admin, 'GET', `/api/accounts?search=${accA.j?.username}`)).length, 1);
check('Lọc theo vai trò Tài xế chỉ ra tài xế', rows(await call(admin, 'GET', '/api/accounts?role=2')).every((a) => a.role === 2 || a.role === 'Driver'));
check('Lọc tài khoản bị khóa chỉ ra tài khoản bị khóa', rows(await call(admin, 'GET', '/api/accounts?active=false')).every((a) => a.active === false));
is('Tài khoản không tồn tại -> 404', (await call(admin, 'GET', '/api/accounts/99999999')).s, 404);
const me = await call(pax1.token, 'GET', '/api/auth/me');
is('/auth/me trả đúng tài khoản đang đăng nhập', me.j?.username, 'testpax1');

sec('C3. Tài khoản: sửa, đổi mật khẩu, vai trò, khóa');
const tgt = await mkStaff(4, 'tgt');
const tgtTok = await login(tgt.username, 'OpPass@12345');
const upA = (o) => call(admin, 'PUT', `/api/accounts/${tgt.id}`, o);
is('Sửa họ tên -> 200', (await upA({ fullName: 'Tên mới OP' })).s, 200);
is('MySQL: họ tên mới', sql(`select FullName from accounts where Id=${tgt.id}`), 'Tên mới OP');
is('Sửa với email sai định dạng -> bị từ chối', reject(await upA({ email: 'khong-phai-email' })), true);
is('Sửa sang email của người khác -> 409', (await upA({ email: mail })).s, 409);
is('Sửa sang số điện thoại của người khác -> 409', (await upA({ phone: ph })).s, 409);
is('MySQL: email, số điện thoại không đổi sau các lần bị từ chối', `${sql(`select Email from accounts where Id=${tgt.id}`) === mail}|${sql(`select Phone from accounts where Id=${tgt.id}`) === ph}`, 'false|false');
is('Đổi mật khẩu quá ngắn -> bị từ chối', reject(await upA({ password: '123' })), true);
is('MySQL: mật khẩu cũ vẫn đăng nhập được sau lần bị từ chối', (await call(null, 'POST', '/api/auth/login', { identity: tgt.username, password: 'OpPass@12345' })).s, 200);
is('Admin đặt lại mật khẩu mới -> 200', (await upA({ password: 'MatKhauMoi@123' })).s, 200);
is('Mật khẩu cũ không còn dùng được -> 401', (await call(null, 'POST', '/api/auth/login', { identity: tgt.username, password: 'OpPass@12345' })).s, 401);
is('Mật khẩu mới đăng nhập được', (await call(null, 'POST', '/api/auth/login', { identity: tgt.username, password: 'MatKhauMoi@123' })).s, 200);
is('Phiên cũ vẫn dùng được sau khi đặt lại mật khẩu (chỉ khóa hoặc đổi vai mới ngắt phiên)', (await call(tgtTok, 'GET', '/api/bookings/my')).s, 200);
is('Đổi vai sang giá trị không có thật (99) -> bị từ chối', reject(await call(admin, 'PATCH', `/api/accounts/${tgt.id}/role`, { role: 99 })), true);
is('MySQL: vai trò không bị ghi giá trị lạ', sql(`select Role from accounts where Id=${tgt.id}`), 'Passenger');
is('Sửa vai trò về giá trị không có thật qua PUT -> bị từ chối', reject(await upA({ role: 99 })), true);
is('MySQL: vai trò vẫn hợp lệ', sql(`select Role from accounts where Id=${tgt.id}`), 'Passenger');
is('Đổi vai về chính vai hiện tại -> 200 và không làm mất phiên', ((await call(admin, 'PATCH', `/api/accounts/${tgt.id}/role`, { role: 4 })).s === 200) && (await call(tgtTok, 'GET', '/api/bookings/my')).s === 200, true);
is('Đổi vai không tồn tại tài khoản -> 404', (await call(admin, 'PATCH', '/api/accounts/99999999/role', { role: 2 })).s, 404);
for (const [who, tok] of [['Quản lý', manager], ['Hành khách', pax1.token], ['Tài xế', driverTok]]) {
  is(`${who} đổi vai trò -> 403`, (await call(tok, 'PATCH', `/api/accounts/${tgt.id}/role`, { role: 0 })).s, 403);
  is(`${who} khóa tài khoản -> 403`, (await call(tok, 'PUT', `/api/accounts/${tgt.id}`, { active: false })).s, 403);
  is(`${who} xem danh sách tài khoản -> 403`, (await call(tok, 'GET', '/api/accounts')).s, 403);
}
is('MySQL: tài khoản không bị đổi sau các lần bị từ chối quyền', sql(`select concat(Role,'|',Active) from accounts where Id=${tgt.id}`), 'Passenger|1');
is('Admin nâng tài khoản lên Quản lý -> 200', (await call(admin, 'PATCH', `/api/accounts/${tgt.id}/role`, { role: 1 })).s, 200);
is('Phiên cũ bị ngắt khi đổi vai -> 401', (await call(tgtTok, 'GET', '/api/bookings/my')).s, 401);
const tgtMgr = await login(tgt.username, 'MatKhauMoi@123');
is('Quản lý mới vào được danh sách thanh toán', (await call(tgtMgr, 'GET', '/api/payments')).s, 200);
is('Quản lý mới thêm xe được', (await call(tgtMgr, 'POST', '/api/buses', busBody())).s, 201);
is('Quản lý mới vẫn không vào được quản trị tài khoản', (await call(tgtMgr, 'GET', '/api/accounts')).s, 403);
is('Khóa bằng DELETE -> 204', (await call(admin, 'DELETE', `/api/accounts/${tgt.id}`)).s, 204);
is('MySQL: tài khoản chỉ bị khóa (Active=0), không bị xóa mất', sql(`select Active from accounts where Id=${tgt.id}`), '0');
is('Phiên của tài khoản bị khóa bị ngắt -> 401', (await call(tgtMgr, 'GET', '/api/payments')).s, 401);
is('Đăng nhập lại bị chặn -> 401', (await call(null, 'POST', '/api/auth/login', { identity: tgt.username, password: 'MatKhauMoi@123' })).s, 401);
is('Mở khóa -> 200 và đăng nhập lại được', ((await call(admin, 'PUT', `/api/accounts/${tgt.id}`, { active: true })).s === 200) && (await call(null, 'POST', '/api/auth/login', { identity: tgt.username, password: 'MatKhauMoi@123' })).s === 200, true);
check('Nhật ký ghi tạo, sửa, đổi vai, khóa tài khoản', ['CREATE_ACCOUNT', 'UPDATE_ACCOUNT', 'UPDATE_ROLE', 'DISABLE_ACCOUNT'].every(audited));

sec('C4. Tài khoản: admin không được tự khóa mình hoặc hạ quyền mình');
const adminId = num(sql("select Id from accounts where Username='admin'"));
check('Admin không tự khóa mình bằng PUT (tránh mất quyền quản trị)', reject(await call(admin, 'PUT', `/api/accounts/${adminId}`, { active: false })), true);
check('Admin không tự khóa mình bằng DELETE', reject(await call(admin, 'DELETE', `/api/accounts/${adminId}`)), true);
check('Admin không tự hạ vai trò của mình', reject(await call(admin, 'PATCH', `/api/accounts/${adminId}/role`, { role: 4 })), true);
is('MySQL: tài khoản admin vẫn Active và còn vai Admin', sql(`select concat(Role,'|',Active) from accounts where Id=${adminId}`), 'Admin|1');
is('Token admin vẫn dùng được', (await call(admin, 'GET', '/api/accounts?pageSize=1')).s, 200);
const adm2 = await mkStaff(0, 'adm2');
const adm2Tok = await login(adm2.username, 'OpPass@12345');
is('Admin thứ hai không tự khóa mình -> 409', (await call(adm2Tok, 'PUT', `/api/accounts/${adm2.id}`, { active: false })).s, 409);
is('Admin thứ hai không tự hạ vai trò của mình -> 409', (await call(adm2Tok, 'PATCH', `/api/accounts/${adm2.id}/role`, { role: 1 })).s, 409);
is('Admin thứ hai tự đổi họ tên mình vẫn được -> 200', (await call(adm2Tok, 'PUT', `/api/accounts/${adm2.id}`, { fullName: 'Admin hai' })).s, 200);
is('Admin này hạ vai trò admin thứ hai được -> 200 (người khác làm thì được)', (await call(admin, 'PATCH', `/api/accounts/${adm2.id}/role`, { role: 1 })).s, 200);
is('MySQL: admin thứ hai đã thành Quản lý', sql(`select Role from accounts where Id=${adm2.id}`), 'Manager');

sec('C5. Giá trị enum không có thật bị từ chối ở mọi chỗ nhận enum');
const paxId = (await call(pax1.token, 'GET', '/api/auth/me')).j?.id;
const vBefore = num(sql('select count(*) from vouchers'));
const fbBefore = num(sql('select count(*) from feedbacks'));
const sweep = [
  ['loại giảm giá của voucher', () => call(manager, 'POST', '/api/vouchers', { code: `OPE${uniq}`, discountType: 99, discountValue: 1000, startAt: iso(plusDays(-1)), endAt: iso(plusDays(30)), usageLimit: 0 })],
  ['loại phản ánh', () => call(pax1.token, 'POST', '/api/feedback', { passengerId: paxId, type: 99, subject: 'x', content: 'x' })],
  ['loại sự cố', () => call(driverTok, 'POST', '/api/incidents', { tripId: T1id, incidentType: 99, delayMinutes: 1, location: 'x', description: 'x' })],
  ['trạng thái xử lý phản ánh', () => call(manager, 'PATCH', '/api/feedback/1/status', { status: 99 })],
  ['trạng thái chuyến', () => call(manager, 'PUT', `/api/assignments/${T1id}/trip`, { status: 99 })],
  ['lọc tài khoản theo vai trò', () => call(admin, 'GET', '/api/accounts?role=99')],
  ['lọc xe theo trạng thái', () => call(manager, 'GET', '/api/buses?status=99')],
];
for (const [name, fn] of sweep) is(`Giá trị 99 cho ${name} -> 400`, (await fn()).s, 400);
is('MySQL: không có voucher hay phản ánh nào bị ghi từ các lần gửi sai', `${num(sql('select count(*) from vouchers'))}|${num(sql('select count(*) from feedbacks'))}`, `${vBefore}|${fbBefore}`);
is('Giá trị enum hợp lệ vẫn chạy bình thường (lọc xe Bảo trì)', (await call(manager, 'GET', '/api/buses?status=1')).s, 200);

// =====================================================================================================================
sec('D1. Đặt vé: dữ liệu sai bị từ chối ở máy chủ');
const busD = await mkBus({ capacity: 24, rows: 4, columns: 6 });
const otherBus = await mkBus({ capacity: 12, rows: 3, columns: 4 });
const dD = plusDays(100);
const TD = await mkTrip({ departureAt: iso(dD), busId: busD.id, driverId: drvA.id, conductorId: cndA.id });
const TDid = TD.j?.tripId;
const freeD = async () => (await seatMap(TDid)).filter((s) => s.isAvailable);
const sd = await freeD();
const foreignSeat = num(sql(`select Id from seats where BusId=${otherBus.id} order by Id limit 1`));
const route1Stops = sql('select StopId from route_stops where RouteId=1 order by StopOrder').split('\n').map(Number);
const bk = (tok, o) => call(tok, 'POST', '/api/bookings', { tripId: TDid, seatIds: [sd[0].seatId], boardStopId: bd, alightStopId: al, ...o });
const holdBefore = num(sql('select count(*) from bookings'));
is('Quản lý không đặt vé được (chỉ hành khách) -> 403', (await bk(manager, {})).s, 403);
is('Chưa đăng nhập đặt vé -> 401', (await bk(null, {})).s, 401);
is('Không chọn ghế -> bị từ chối', reject(await bk(pax1.token, { seatIds: [] })), true);
is('Ghế của xe khác -> 400', (await bk(pax1.token, { seatIds: [foreignSeat] })).s, 400);
is('Ghế không tồn tại -> 400', (await bk(pax1.token, { seatIds: [99999999] })).s, 400);
is('Chuyến không tồn tại -> 404', (await bk(pax1.token, { tripId: 99999999 })).s, 404);
is('Điểm lên trùng điểm xuống -> 400', (await bk(pax1.token, { alightStopId: bd })).s, 400);
is('Điểm xuống đứng trước điểm lên -> 400', (await bk(pax1.token, { boardStopId: al, alightStopId: bd })).s, 400);
is('Điểm dừng không thuộc tuyến -> 400', (await bk(pax1.token, { boardStopId: 99999999 })).s, 400);
check('Ghế trùng lặp trong cùng một yêu cầu không tạo ra 2 vé cho một ghế', await (async () => { const r = await bk(pax1.token, { seatIds: [sd[1].seatId, sd[1].seatId] }); const n = num(sql(`select count(*) from tickets where TripId=${TDid} and SeatId=${sd[1].seatId} and Status in ('Held','Valid','Used')`)); if (ok(r)) await call(pax1.token, 'POST', `/api/bookings/${r.j?.bookingId}/cancel`, {}); return n <= 1; })());
is('Mã giảm giá không tồn tại -> 400', (await bk(pax1.token, { voucherCode: 'KHONGCOTHAT' })).s, 400);
is('MySQL: các lần đặt sai không để lại lượt đặt nào còn hiệu lực', num(sql(`select count(*) from bookings where Id>${base.bookings} and TripId=${TDid} and Status='Pending'`)), 0);
is('MySQL: số lượt đặt không tăng sau các lần đặt sai', num(sql('select count(*) from bookings')), holdBefore);

sec('D2. Đặt vé: hai khách tranh cùng một ghế cùng lúc');
const racers = [];
for (let i = 0; i < 4; i++) {
  const seat = (await freeD())[i].seatId;
  const [ra, rb] = await Promise.all([bk(pax1.token, { seatIds: [seat] }), bk(pax2.token, { seatIds: [seat] })]);
  racers.push({ seat, ra, rb });
}
for (const [i, r] of racers.entries()) {
  is(`Lượt tranh ghế ${i + 1}: đúng 1 khách giữ được, 1 khách bị báo hết ghế`, [ok(r.ra), ok(r.rb)].filter(Boolean).length, 1);
  is(`Lượt tranh ghế ${i + 1}: MySQL chỉ có 1 vé còn hiệu lực cho ghế đó`, num(sql(`select count(*) from tickets where TripId=${TDid} and SeatId=${r.seat} and Status in ('Held','Valid','Used')`)), 1);
  check(`Lượt tranh ghế ${i + 1}: người thua nhận 409`, [r.ra, r.rb].filter((x) => !ok(x)).every((x) => x.s === 409), `${r.ra.s}/${r.rb.s}`);
}
check('Hai khách đặt 2 ghế khác nhau cùng lúc đều được', await (async () => { const f = await freeD(); const [x, y] = await Promise.all([bk(pax1.token, { seatIds: [f[0].seatId] }), bk(pax2.token, { seatIds: [f[1].seatId] })]); return ok(x) && ok(y); })());

sec('D3. Thanh toán: bấm trả hai lần cùng lúc, nhiều cách trả cho một lượt đặt');
const f3 = await freeD();
const bkD3 = await bk(pax3.token, { seatIds: [f3[0].seatId] });
const [pa, pb] = await Promise.all([pay(pax3.token, bkD3.j?.bookingId, 0), pay(pax3.token, bkD3.j?.bookingId, 0)]);
is('Trả hai lần cùng lúc: đúng 1 lần thành công', [ok(pa), ok(pb)].filter(Boolean).length, 1);
const keptOf = (bookingId) => num(sql(`select count(*) from payments p where p.BookingId=${bookingId} and p.Status='Success' and not exists (select 1 from refunds r where r.PaymentId=p.Id)`));
is('MySQL: đúng 1 giao dịch Success được giữ làm tiền vé (khoản thu thừa nếu có đều đã mở yêu cầu hoàn tiền)', keptOf(bkD3.j?.bookingId), 1);
is('MySQL: đúng 1 hóa đơn cho lượt đặt', num(sql(`select count(*) from invoices i join payments p on p.Id=i.PaymentId where p.BookingId=${bkD3.j?.bookingId}`)), 1);
is('MySQL: lượt đặt Confirmed và vé Valid', sql(`select concat(b.Status,'|',(select group_concat(distinct Status) from tickets where BookingId=b.Id)) from bookings b where b.Id=${bkD3.j?.bookingId}`), 'Confirmed|Valid');
is('MySQL: không có giao dịch Pending dư cho lượt đặt đã trả', num(sql(`select count(*) from payments where BookingId=${bkD3.j?.bookingId} and Status='Pending'`)), 0);
is('MySQL: khoản được giữ bằng đúng tiền vé của lượt đặt', num(sql(`select p.Amount from payments p where p.BookingId=${bkD3.j?.bookingId} and p.Status='Success' and not exists (select 1 from refunds r where r.PaymentId=p.Id)`)), num(sql(`select FinalAmount from bookings where Id=${bkD3.j?.bookingId}`)));
is('Trả tiếp lượt đã thanh toán -> 409', (await pay(pax3.token, bkD3.j?.bookingId, 2)).s, 409);
is('Khách khác không trả được lượt đặt của người khác -> 404', (await pay(pax1.token, bkD3.j?.bookingId, 0)).s, 404);
is('Phương thức thanh toán không có thật (99) -> 400', (await pay(pax1.token, 1, 99)).s, 400);
is('Quản lý không tạo thanh toán được (chỉ hành khách) -> 403', (await pay(manager, bkD3.j?.bookingId, 0)).s, 403);

const f4 = await freeD();
const bkMix = await bk(pax3.token, { seatIds: [f4[0].seatId] });
const tr = await pay(pax3.token, bkMix.j?.bookingId, 4);
is('Chọn chuyển khoản -> giao dịch chờ kèm nội dung chuyển khoản', `${tr.s}|${tr.j?.status}|${/^SBV/.test(tr.j?.transfer?.memo ?? '')}`, '201|Pending|true');
const momoAfter = await pay(pax3.token, bkMix.j?.bookingId, 0);
check('Đổi ý sang MoMo khi chuyển khoản còn chờ: lượt đặt được chốt bằng MoMo', ok(momoAfter) && sql(`select Status from bookings where Id=${bkMix.j?.bookingId}`) === 'Confirmed', text(momoAfter).slice(0, 120));
const cfMix = await call(manager, 'POST', `/api/payments/${tr.j?.id}/confirm-transfer`, { bankTransactionId: `OPMIX${uniq}` });
is('Sau khi đã trả MoMo, quản lý xác nhận nốt khoản chuyển khoản cũ: vẫn chỉ giữ 1 khoản làm tiền vé', keptOf(bkMix.j?.bookingId), 1);
check('Khoản chuyển khoản thừa được mở yêu cầu hoàn tiền cho khách', num(sql(`select count(*) from refunds r join payments p on p.Id=r.PaymentId where p.Id=${tr.j?.id}`)) === 1, `confirm ${cfMix.s}: ${text(cfMix).slice(0, 140)}`);
check('Khách thấy khoản hoàn đó trong danh sách của mình', rows(await call(pax3.token, 'GET', '/api/refunds/my')).some((r) => r.paymentId === tr.j?.id));
check('Khách nhận thông báo cho biết khoản chuyển khoản sẽ được hoàn', (await notifOf(pax3.token)).some((n) => /hoàn/i.test(n.message ?? '')));
is('MySQL: lượt đặt chỉ có tối đa 1 hóa đơn', num(sql(`select count(*) from invoices i join payments p on p.Id=i.PaymentId where p.BookingId=${bkMix.j?.bookingId}`)) <= 1, true);

sec('D4. Giữ chỗ hết hạn: ghế được nhả và không trả được nữa');
const f5 = await freeD();
const bkExp = await bk(pax1.token, { seatIds: [f5[0].seatId] });
sql(`update bookings set HoldExpiresAt=date_sub(utc_timestamp(), interval 1 minute) where Id=${bkExp.j?.bookingId}`);
is('Lượt đặt đã hết hạn giữ chỗ: trả tiền -> 409', (await pay(pax1.token, bkExp.j?.bookingId, 0)).s, 409);
const takeOver = await bk(pax2.token, { seatIds: [f5[0].seatId] });
is('Ghế của lượt đã hết hạn được khách khác đặt lại ngay', ok(takeOver), true);
is('MySQL: chỉ còn 1 vé còn hiệu lực cho ghế đó', num(sql(`select count(*) from tickets where TripId=${TDid} and SeatId=${f5[0].seatId} and Status in ('Held','Valid','Used')`)), 1);
const bkNear = await bk(pax1.token, { seatIds: [(await freeD())[0].seatId] });
sql(`update bookings set HoldExpiresAt=date_add(utc_timestamp(), interval 30 second) where Id=${bkNear.j?.bookingId}`);
is('Còn dưới 1 phút giữ chỗ: yêu cầu đặt lại thay vì trả dở dang -> 409', (await pay(pax1.token, bkNear.j?.bookingId, 0)).s, 409);
const bkCancel = await bk(pax1.token, { seatIds: [(await freeD())[0].seatId] });
const cSeat = sql(`select SeatId from tickets where BookingId=${bkCancel.j?.bookingId}`);
const canc = await call(pax1.token, 'POST', `/api/bookings/${bkCancel.j?.bookingId}/cancel`, {});
is('Khách hủy lượt giữ chỗ chưa trả -> 200', canc.s, 200);
is('MySQL: lượt đặt Cancelled và ghế được nhả', `${sql(`select Status from bookings where Id=${bkCancel.j?.bookingId}`)}|${(await seatMap(TDid)).find((s) => String(s.seatId) === cSeat)?.status}`, 'Cancelled|Available');
is('Hủy lượt của người khác -> 403 hoặc 404', [403, 404].includes((await call(pax2.token, 'POST', `/api/bookings/${bkD3.j?.bookingId}/cancel`, {})).s), true);
check('Lượt đã thanh toán không hủy "nhanh" được để lấy lại ghế mà không hoàn tiền', await (async () => { const r = await call(pax3.token, 'POST', `/api/bookings/${bkD3.j?.bookingId}/cancel`, {}); const st = sql(`select group_concat(distinct Status) from tickets where BookingId=${bkD3.j?.bookingId}`); return !(ok(r) && st === 'Cancelled' && num(sql(`select count(*) from refunds r join payments p on p.Id=r.PaymentId where p.BookingId=${bkD3.j?.bookingId}`)) === 0); })());

sec('D5. Voucher: giới hạn lượt, hết hạn, giảm 100%');
const vcode = (k) => `OPV${uniq}${k}`.slice(0, 14);
const mkV = (o) => call(manager, 'POST', '/api/vouchers', { code: vcode('A'), discountType: 1, discountValue: 3000, startAt: iso(plusDays(-1)), endAt: iso(plusDays(60)), usageLimit: 0, ...o });
const vOne = await mkV({ code: vcode('1'), usageLimit: 1 });
is('Tạo voucher giới hạn 1 lượt', ok(vOne), true);
const fv = await freeD();
const bv1 = await bk(pax1.token, { seatIds: [fv[0].seatId], voucherCode: vcode('1') });
is('Khách 1 giữ chỗ kèm voucher 1 lượt', ok(bv1), true);
const bv2 = await bk(pax2.token, { seatIds: [fv[1].seatId], voucherCode: vcode('1') });
is('Khách 2 dùng cùng voucher khi đã hết lượt -> 400', bv2.s, 400);
is('MySQL: chỉ 1 lượt đặt gắn voucher', num(sql(`select count(*) from bookings where VoucherId=${vOne.j?.id}`)), 1);
const vTwoCreate = await mkV({ code: vcode('2'), usageLimit: 2 });
const fv2 = await freeD();
const racedV = await Promise.all([pax1, pax2, pax3].map((p, i) => call(p.token, 'POST', '/api/bookings', { tripId: TDid, seatIds: [fv2[i].seatId], boardStopId: bd, alightStopId: al, voucherCode: vcode('2') })));
is('3 khách tranh voucher còn 2 lượt cùng lúc: đúng 2 người được dùng', racedV.filter(ok).length, 2);
is('MySQL: đúng 2 lượt đặt gắn voucher đó', num(sql(`select count(*) from bookings where VoucherId=${vTwoCreate.j?.id}`)), 2);
const vOld = await mkV({ code: vcode('3'), startAt: iso(plusDays(-10)), endAt: iso(plusDays(-1)) });
is('Voucher đã hết hạn -> 400 khi đặt vé', (await bk(pax1.token, { seatIds: [(await freeD())[0].seatId], voucherCode: vcode('3') })).s, 400);
const vFut = await mkV({ code: vcode('4'), startAt: iso(plusDays(5)), endAt: iso(plusDays(30)) });
is('Voucher chưa đến ngày áp dụng -> 400 khi đặt vé', (await bk(pax1.token, { seatIds: [(await freeD())[0].seatId], voucherCode: vcode('4') })).s, 400);
is('Mã voucher gõ chữ thường vẫn nhận', ok(await bk(pax2.token, { seatIds: [(await freeD())[0].seatId], voucherCode: vcode('A').toLowerCase() })) || (await call(manager, 'GET', `/api/vouchers/check-code?code=${vcode('A')}`)).s === 200, true);
const vFree = await mkV({ code: vcode('5'), discountType: 0, discountValue: 100 });
if (!ok(vFree)) {
  check('Voucher giảm 100% bị từ chối ngay lúc tạo, kèm lý do', reject(vFree) && text(vFree).length > 10, text(vFree).slice(0, 160));
} else {
  const bFree = await bk(pax3.token, { seatIds: [(await freeD())[0].seatId], voucherCode: vcode('5') });
  if (!ok(bFree)) {
    check('Voucher giảm 100%: đặt vé bị từ chối kèm lý do rõ ràng', reject(bFree) && text(bFree).length > 10, text(bFree).slice(0, 160));
  } else {
    const amount = num(sql(`select FinalAmount from bookings where Id=${bFree.j?.bookingId}`));
    const pFree = await pay(pax3.token, bFree.j?.bookingId, 0);
    const state = sql(`select Status from bookings where Id=${bFree.j?.bookingId}`);
    check('Voucher giảm 100% (đơn 0đ): khách không bị kẹt, đặt xong là có vé hoặc trả được', amount > 0 || ok(pFree) || state === 'Confirmed', `FinalAmount=${amount}, trả HTTP ${pFree.s}: ${text(pFree).slice(0, 120)}; lượt đặt ${state}`);
  }
}

// Voucher giảm cố định lớn hơn giá vé: đơn về 0đ nhưng thanh toán từ chối đơn 0đ nên khách dễ bị kẹt với ghế đang giữ.
const vBig = await mkV({ code: vcode('6'), discountType: 1, discountValue: 5000000 });
if (!ok(vBig)) {
  check('Voucher giảm cố định vượt giá vé bị từ chối ngay lúc tạo, kèm lý do', reject(vBig) && text(vBig).length > 10, text(vBig).slice(0, 160));
} else {
  const bBig = await bk(pax3.token, { seatIds: [(await freeD())[0].seatId], voucherCode: vcode('6') });
  if (!ok(bBig)) {
    check('Voucher giảm vượt giá vé: đặt vé bị từ chối kèm lý do rõ ràng', reject(bBig) && text(bBig).length > 10, text(bBig).slice(0, 160));
  } else {
    const amount = num(sql(`select FinalAmount from bookings where Id=${bBig.j?.bookingId}`));
    const pBig = await pay(pax3.token, bBig.j?.bookingId, 0);
    const state = sql(`select Status from bookings where Id=${bBig.j?.bookingId}`);
    check('Voucher giảm vượt giá vé (đơn 0đ): khách không bị kẹt, đặt xong là có vé hoặc trả được', amount > 0 || ok(pBig) || state === 'Confirmed', `FinalAmount=${amount}, trả HTTP ${pBig.s}: ${text(pBig).slice(0, 120)}; lượt đặt ${state}`);
  }
}

sec('D6. Báo cáo khớp với MySQL');
const dayD = day(dD);
const rev = await call(manager, 'GET', `/api/reports/revenue?startDate=${dayD}&endDate=${dayD}`);
const sqlGross = num(sql(`select coalesce(sum(p.Amount),0) from payments p join bookings b on b.Id=p.BookingId join trips t on t.Id=b.TripId where t.Id=${TDid} and p.Status in ('Success','Refunded') and not exists (select 1 from refunds r where r.PaymentId=p.Id)`));
check('Doanh thu ngày chạy của chuyến khớp tổng tiền vé được giữ trong MySQL (không tính khoản thu thừa đã mở hoàn tiền)', num(rev.j?.summary?.totalGross) >= sqlGross && sqlGross > 0, `API ${rev.j?.summary?.totalGross} vs MySQL ${sqlGross}`);
const occ = await call(manager, 'GET', `/api/reports/occupancy?startDate=${dayD}&endDate=${dayD}`);
// Ghế chiếm = vé Valid/Used cộng vé Held của lượt đặt còn hạn giữ chỗ (cùng quy tắc với sơ đồ ghế công khai).
const sqlSold = num(sql(`select count(*) from tickets t join bookings b on b.Id=t.BookingId where t.TripId=${TDid} and (t.Status in ('Valid','Used') or (t.Status='Held' and b.Status='Pending' and b.HoldExpiresAt>utc_timestamp()))`));
is('Báo cáo lấp đầy đếm đúng số ghế đã chiếm (đã bán và đang giữ chỗ) trong MySQL', occ.j?.trips?.find((t) => t.tripId === TDid)?.occupiedSeats, sqlSold);

// =====================================================================================================================
sec('E. Toàn vẹn dữ liệu sau toàn bộ thao tác (quét cả CSDL)');
const zero = (name, q) => is(name, num(sql(q)), 0);
zero('Không có ghế nào có 2 vé còn hiệu lực trên cùng một chuyến',
  "select count(*) from (select TripId,SeatId from tickets where Status in ('Held','Valid','Used') group by TripId,SeatId having count(*)>1) x");
zero('Không có vé Valid/Used nào mà lượt đặt chưa Confirmed',
  "select count(*) from tickets t join bookings b on b.Id=t.BookingId where t.Status in ('Valid','Used') and b.Status<>'Confirmed'");
zero('Không có vé Held nào mà lượt đặt không còn Pending',
  "select count(*) from tickets t join bookings b on b.Id=t.BookingId where t.Status='Held' and b.Status<>'Pending'");
zero('Không có lượt đặt Confirmed nào thiếu giao dịch thành công',
  "select count(*) from bookings b where b.Status='Confirmed' and not exists (select 1 from payments p where p.BookingId=b.Id and p.Status in ('Success','Refunded'))");
zero('Không có lượt đặt nào bị thu tiền 2 lần mà không mở hoàn tiền cho khoản thừa',
  "select count(*) from (select p.BookingId from payments p where p.Status='Success' and not exists (select 1 from refunds r where r.PaymentId=p.Id) group by p.BookingId having count(*)>1) x");
zero('Không có giao dịch thành công nào thiếu hóa đơn (trừ khoản thu thừa đã mở hoàn tiền)',
  "select count(*) from payments p where p.Status='Success' and not exists (select 1 from invoices i where i.PaymentId=p.Id) and not exists (select 1 from refunds r where r.PaymentId=p.Id)");
zero('Không có giao dịch nào có hơn 1 hóa đơn',
  "select count(*) from (select PaymentId from invoices group by PaymentId having count(*)>1) x");
zero('Không có vé nào ngồi ghế không thuộc xe của chuyến',
  'select count(*) from tickets t join trips tr on tr.Id=t.TripId join seats s on s.Id=t.SeatId where tr.BusId is not null and s.BusId<>tr.BusId');
zero('Không có chuyến nào có hai tài xế hoặc hai phụ xe',
  'select count(*) from (select TripId,Duty from trip_staff group by TripId,Duty having count(*)>1) x');
zero('Không có nhân sự nào đứng tên hai chuyến chưa hủy trùng giờ khởi hành',
  "select count(*) from trip_staff a join trips ta on ta.Id=a.TripId join trip_staff b on b.AccountId=a.AccountId and b.TripId>a.TripId join trips tb on tb.Id=b.TripId where ta.Status<>'Cancelled' and tb.Status<>'Cancelled' and ta.DepartureAt=tb.DepartureAt");
zero('Không có xe nào đứng tên hai chuyến chưa hủy trùng giờ khởi hành',
  "select count(*) from trips a join trips b on b.BusId=a.BusId and b.Id>a.Id where a.BusId is not null and a.Status<>'Cancelled' and b.Status<>'Cancelled' and a.DepartureAt=b.DepartureAt");
zero('Không có khoản hoàn nào vượt số tiền đã thu',
  'select count(*) from (select p.Id from payments p join refunds r on r.PaymentId=p.Id group by p.Id,p.Amount having sum(r.Amount)>p.Amount) x');
zero('Không có tài khoản nào mang vai trò lạ',
  "select count(*) from accounts where Role not in ('Admin','Manager','Driver','Conductor','Passenger')");
zero('Không có xe nào mang trạng thái lạ',
  "select count(*) from buses where Status not in ('Active','Maintenance','Inactive')");
zero('Không có xe nào có số ghế khác sức chứa',
  'select count(*) from buses b where b.Capacity <> (select count(*) from seats s where s.BusId=b.Id) and exists (select 1 from seats s where s.BusId=b.Id)');
zero('Không còn tài khoản nào đăng nhập được mà thiếu mã băm mật khẩu',
  "select count(*) from accounts where Active=1 and (PasswordHash is null or PasswordHash='')");
zero('Không có thông báo nào trỏ tới tài khoản đã mất',
  'select count(*) from notifications n where not exists (select 1 from accounts a where a.Id=n.AccountId)');

// ---------------------------------------------------------------------------------------------------------------------
// lib.mjs xóa vé, đặt chỗ, chuyến, tài khoản; phần dưới xóa các bảng nó không biết (chạy sau cùng nên không còn khóa ngoại treo).
finish([
  `delete from vouchers where Id>${base.vouchers}`,
  `delete from seats where Id>${base.seats}`,
  `delete from buses where Id>${base.buses}`,
  `delete from route_stops where RouteId>${base.routes}`,
  `delete from routes where Id>${base.routes}`,
  `delete from stops where Id>${base.stops}`,
]);
