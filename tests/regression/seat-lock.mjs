// Kiểm thử giữ, đóng và nhả ghế với nhiều tài khoản hành khách, gọi API thật (backend + MySQL) trên dữ liệu demo.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/seat-lock.mjs
// Cần backend ở chế độ Development và bật bộ giả lập thanh toán: Payments__Simulator__Enabled=true.
// Xem tests/regression/README.md (mục "Kịch bản trên dữ liệu demo").
import { sec, check, is, ok, sql, call, login, createPassengers, futureTrips, freeSeats, seatMap, book, pay, finish } from './lib.mjs';

const admin = await login('admin');
const manager = await login('manager');
const [p1, p2, p3] = await createPassengers(admin, 3);

const [TRIP] = futureTrips(1);
if (!TRIP) { console.error('Không có chuyến nào còn ở tương lai trong CSDL demo.'); finish(); process.exit(2); }
const [s2, s3, s4, s5] = await freeSeats(TRIP, 4);
console.log(`Chuyến ${TRIP}: ghế ${s2.seatCode}, ${s3.seatCode}, ${s4.seatCode}, ${s5.seatCode}`);

const state = async (seat) => (await seatMap(TRIP)).find((s) => s.seatId === seat.seatId)?.status;
const bid = (r) => r.j?.bookingId;

sec('1. Sơ đồ ghế ban đầu');
check('Chuyến chưa có ghế nào bị chiếm', (await seatMap(TRIP)).every((s) => s.isAvailable));

sec('2. Giữ ghế và tranh ghế');
const b1 = await book(p1, TRIP, [s2.seatId]);
check('p1 đặt ghế thứ nhất thành công', ok(b1), `HTTP ${b1.s} ${b1.t.slice(0, 120)}`);
is('SCRUM-96: ghế đang giữ hiện Held (khách vãng lai cũng thấy)', await state(s2), 'Held');
check('SCRUM-96: ghế đang giữ không chọn được', (await seatMap(TRIP)).find((s) => s.seatId === s2.seatId)?.isAvailable === false);
is('p2 đặt ghế p1 đang giữ -> 409', (await book(p2, TRIP, [s2.seatId])).s, 409);
is('Chính p1 đặt lại ghế đang giữ -> 409', (await book(p1, TRIP, [s2.seatId])).s, 409);
const b2 = await book(p2, TRIP, [s3.seatId]);
check('p2 đặt ghế khác vẫn được', ok(b2), `HTTP ${b2.s}`);
const multi = await book(p3, TRIP, [s2.seatId, s4.seatId]);
check('Đặt nhiều ghế có một ghế đã bị giữ -> 409 và ghế còn lại không bị giữ nhầm', multi.s === 409 && (await state(s4)) === 'Available', `HTTP ${multi.s}`);

sec('3. Thanh toán rồi ghế đóng hẳn');
const pp = await pay(p1, bid(b1));
check('p1 thanh toán thành công', ok(pp), `HTTP ${pp.s} ${pp.t.slice(0, 120)}`);
is('SCRUM-96: sau thanh toán ghế chuyển từ Held sang Sold', await state(s2), 'Sold');
is('p3 đặt ghế đã bán -> 409', (await book(p3, TRIP, [s2.seatId])).s, 409);
is('Thanh toán lần hai cùng lượt đặt -> 409', (await pay(p1, bid(b1))).s, 409);
is('Khách khác trả tiền lượt đặt của người khác -> 404', (await pay(p3, bid(b2))).s, 404);

sec('4. Hủy giữ chỗ thì ghế được nhả');
const cancel = await call(p2.token, 'POST', `/api/bookings/${bid(b2)}/cancel`);
check('p2 hủy giữ chỗ', cancel.s === 200 && cancel.j?.released === true, cancel.t.slice(0, 120));
is('Ghế trở về Available', await state(s3), 'Available');
is('Khách khác hủy lượt đặt của người khác -> 404', (await call(p1.token, 'POST', `/api/bookings/${bid(b2)}/cancel`)).s, 404);
is('Hủy lượt đặt đã thanh toán -> 409', (await call(p1.token, 'POST', `/api/bookings/${bid(b1)}/cancel`)).s, 409);
const b3 = await book(p3, TRIP, [s3.seatId]);
check('p3 đặt được ghế vừa nhả', ok(b3), `HTTP ${b3.s}`);

sec('5. Hết hạn giữ chỗ thì ghế tự được nhả');
sql(`update bookings set HoldExpiresAt = date_sub(utc_timestamp(), interval 1 minute) where Id = ${bid(b3)}`);
is('Quá hạn giữ: ghế Available mà không ai phải thao tác', await state(s3), 'Available');
const b2b = await book(p2, TRIP, [s3.seatId]);
check('p2 đặt được ghế sau khi p3 hết hạn giữ', ok(b2b), `HTTP ${b2b.s}`);
const late = await pay(p3, bid(b3));
check('p3 trả tiền lượt đặt đã hết hạn -> bị từ chối', late.s >= 400 && late.s < 500, `HTTP ${late.s}`);
is('Ghế vẫn thuộc p2 (đang giữ), p3 không lấy lại được', await state(s3), 'Held');
is('Chỉ còn 1 vé Held sống trên ghế đó', sql(`select count(*) from tickets t join bookings b on b.Id=t.BookingId where t.TripId=${TRIP} and t.SeatId=${s3.seatId} and t.Status='Held' and b.Status='Pending'`), '1');

sec('5b. SCRUM-96: Held tự hết, Sold thì không');
const b4 = await book(p1, TRIP, [s4.seatId]);
is('Ghế vừa đặt hiện Held', await state(s4), 'Held');
sql(`update bookings set HoldExpiresAt = date_sub(utc_timestamp(), interval 1 minute) where Id = ${bid(b4)}`);
is('Hết hạn giữ: Held trở lại Available', await state(s4), 'Available');
is('Ghế đã bán vẫn Sold, không tự trống', await state(s2), 'Sold');

sec('6. Đặt đồng thời cùng một ghế');
const race = await Promise.all([book(p1, TRIP, [s5.seatId]), book(p2, TRIP, [s5.seatId]), book(p3, TRIP, [s5.seatId])]);
check('Đúng 1 người đặt được, 2 người còn lại bị 409', race.filter(ok).length === 1 && race.filter((r) => r.s === 409).length === 2, race.map((r) => r.s).join(','));
is('CSDL chỉ có 1 vé sống trên ghế', sql(`select count(*) from tickets t join bookings b on b.Id=t.BookingId where t.TripId=${TRIP} and t.SeatId=${s5.seatId} and t.Status in ('Held','Valid') and b.Status in ('Pending','Confirmed')`), '1');

sec('7. Hủy vé đã thanh toán: ghế chỉ nhả sau khi quản lý duyệt');
const tid = Number(sql(`select Id from tickets where BookingId=${bid(b1)}`));
const rq = await call(p1.token, 'POST', `/api/tickets/${tid}/cancel`, { reason: 'Kiểm thử nhả ghế' });
is('p1 gửi yêu cầu hủy vé', rq.s, 200);
is('Chưa duyệt: ghế vẫn Sold', await state(s2), 'Sold');
is('Chưa duyệt: người khác đặt ghế -> 409', (await book(p3, TRIP, [s2.seatId])).s, 409);
const ap = await call(manager, 'POST', `/api/ticket-change-requests/${rq.j?.changeRequestId}/approve`);
is('Quản lý duyệt hủy vé', ap.s, 200);
is('Sau duyệt: ghế Available', await state(s2), 'Available');
const b3c = await book(p3, TRIP, [s2.seatId]);
check('p3 đặt được ghế vừa nhả', ok(b3c), `HTTP ${b3c.s}`);

sec('8. Ràng buộc khác');
const past = Number(sql("select Id from trips where DepartureAt <= utc_timestamp() and BusId is not null order by DepartureAt desc limit 1") || 0);
if (past) {
  const [ps] = (await seatMap(past)).filter((s) => s.isAvailable).slice(0, 1);
  is('Đặt chuyến đã khởi hành -> 400', (await book(p1, past, [ps.seatId])).s, 400);
} else {
  console.log('  (bỏ qua) không có chuyến nào đã khởi hành trong CSDL');
}
const five = (await seatMap(TRIP)).filter((s) => s.isAvailable).slice(0, 5).map((s) => s.seatId);
is('Đặt 5 ghế một lần -> 400', (await book(p1, TRIP, five)).s, 400);

finish();
