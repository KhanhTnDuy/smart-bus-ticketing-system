// Kiểm thử luồng hoàn tiền với nhiều tài khoản hành khách, gọi API thật (backend + MySQL) trên dữ liệu demo:
// hủy một phần và hủy hết, xử lý khoản hoàn (duyệt, từ chối, trùng), phân quyền, vé đã quét, hủy chuyến, đối chiếu doanh thu.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/refund-flow.mjs
// Cần backend ở chế độ Development, bật bộ giả lập thanh toán (Payments__Simulator__Enabled=true) và để trống Refunds__Tiers
// (mặc định hoàn 100%). Cần ít nhất hai chuyến còn ở tương lai, chuyến thứ hai có tài xế được phân công.
import { sec, check, is, ok, sql, call, login, createPassengers, futureTrips, freeSeats, seatMap, book, buy, finish } from './lib.mjs';

const admin = await login('admin');
const manager = await login('manager');
const [p1, p2, p3] = await createPassengers(admin, 3);

const [TRIP, SCAN_TRIP] = futureTrips(2);
if (!TRIP || !SCAN_TRIP) { console.error('Cần ít nhất 2 chuyến còn ở tương lai trong CSDL demo.'); finish(); process.exit(2); }
const driverName = sql(`select a.Username from trip_staff ts join accounts a on a.Id=ts.AccountId where ts.TripId=${SCAN_TRIP} and ts.Duty='Driver' limit 1`);
const driver = await login(driverName);
const tripStatus = sql(`select Status from trips where Id=${TRIP}`);
const seats = await freeSeats(TRIP, 6);
const scanSeats = await freeSeats(SCAN_TRIP, 1);
console.log(`Chuyến ${TRIP} (thử hủy chuyến), chuyến ${SCAN_TRIP} (thử quét vé, tài xế ${driverName})`);

const revenue = async () => (await call(admin, 'GET', '/api/reports/revenue')).j.summary;
const refundsOf = async (who) => (await call(who.token, 'GET', '/api/refunds/my')).j ?? [];
const notesOf = async (who) => (await call(who.token, 'GET', '/api/notifications/my')).j?.items ?? [];
const status = (table, id) => sql(`select Status from ${table} where Id=${id}`);
const requestCancel = (who, ticketId, reason) => call(who.token, 'POST', `/api/tickets/${ticketId}/cancel`, { reason });
const approve = (requestId) => call(manager, 'POST', `/api/ticket-change-requests/${requestId}/approve`);
const processRefund = (id, body) => call(manager, 'PATCH', `/api/refunds/${id}/process`, body);

sec('R1. Hủy một trong hai vé của cùng lượt đặt');
const rev0 = await revenue();
const o1 = await buy(p1, TRIP, [seats[0], seats[1]]);
const unit = o1.amount / 2;
let rev = await revenue();
is('Doanh thu gộp tăng đúng số tiền bán', Number(rev.totalGross), Number(rev0.totalGross) + o1.amount);
const rq1 = await requestCancel(p1, o1.tickets[0], 'Kiểm thử hoàn một vé');
is('p1 gửi yêu cầu hủy vé', rq1.s, 200);
is('Chưa duyệt thì chưa có khoản hoàn nào', sql(`select count(*) from refunds where PaymentId=${o1.paymentId}`), '0');
is('Yêu cầu hủy trùng cho cùng vé -> 409', (await requestCancel(p1, o1.tickets[0], 'trùng')).s, 409);
is('Quản lý duyệt hủy vé', (await approve(rq1.j?.changeRequestId)).s, 200);
const rf = await refundsOf(p1);
check('p1 thấy 1 khoản hoàn: Pending, đúng giá một vé, lý do TicketCancelled',
  rf.length === 1 && rf[0].status === 'Pending' && Number(rf[0].amount) === unit && rf[0].reason === 'TicketCancelled', JSON.stringify(rf[0] ?? null));
is('Vé bị hủy Cancelled, vé còn lại vẫn Valid', sql(`select group_concat(Status order by Id) from tickets where BookingId=${o1.bookingId}`), 'Cancelled,Valid');
is('Giao dịch vẫn Success vì chưa hoàn đủ', status('payments', o1.paymentId), 'Success');

sec('R2. Phân quyền và cô lập khoản hoàn');
is('p2 không thấy khoản hoàn của p1', (await refundsOf(p2)).length, 0);
is('Hành khách xem toàn bộ danh sách hoàn -> 403', (await call(p1.token, 'GET', '/api/refunds')).s, 403);
is('Hành khách tự duyệt hoàn tiền -> 403', (await call(p1.token, 'PATCH', `/api/refunds/${rf[0].id}/process`, { approve: true })).s, 403);
is('Không đăng nhập xem hoàn tiền -> 401', (await call(null, 'GET', '/api/refunds')).s, 401);
const all = (await call(manager, 'GET', '/api/refunds')).j ?? [];
check('Quản lý thấy khoản hoàn kèm mã đặt chỗ và tên khách', all.some((r) => r.id === rf[0].id && r.bookingCode && r.passengerName === 'Khách Thử 1'));

sec('R3. Quản lý xử lý khoản hoàn');
is('Từ chối mà không ghi lý do -> 400', (await processRefund(rf[0].id, { approve: false })).s, 400);
const prc = await processRefund(rf[0].id, { approve: true, note: 'Đã hoàn về ví' });
check('Duyệt hoàn tiền -> Success', prc.s === 200 && prc.j?.status === 'Success', `HTTP ${prc.s} ${prc.j?.status}`);
is('Xử lý lần hai cùng khoản hoàn -> 409', (await processRefund(rf[0].id, { approve: true })).s, 409);
check('Khách nhận thông báo "Đã hoàn tiền"', (await notesOf(p1)).some((n) => /Đã hoàn tiền/.test(n.title ?? '')));
is('Giao dịch vẫn Success vì mới hoàn một phần', status('payments', o1.paymentId), 'Success');
rev = await revenue();
check('Doanh thu: hoàn đúng giá một vé, thực thu giảm tương ứng',
  Number(rev.totalRefund) === Number(rev0.totalRefund) + unit && Number(rev.netRevenue) === Number(rev0.netRevenue) + unit, JSON.stringify(rev));

sec('R4. Hủy nốt vé còn lại: hoàn đủ, giao dịch chuyển Refunded');
const rq2 = await requestCancel(p1, o1.tickets[1], 'Hủy nốt');
is('Duyệt hủy vé còn lại', (await approve(rq2.j?.changeRequestId)).s, 200);
const rf2 = (await refundsOf(p1)).find((r) => r.status === 'Pending');
check('Khoản hoàn thứ hai đúng giá một vé', rf2 && Number(rf2.amount) === unit);
await processRefund(rf2.id, { approve: true, note: 'Hoàn nốt' });
is('Tổng hoàn bằng số tiền đã trả -> giao dịch Refunded', status('payments', o1.paymentId), 'Refunded');
is('Tổng hoàn không vượt số tiền đã trả', Number(sql(`select sum(Amount) from refunds where PaymentId=${o1.paymentId} and Status='Success'`)), o1.amount);
is('Hủy lại vé đã hủy -> 400', (await requestCancel(p1, o1.tickets[0], 'x')).s, 400);
rev = await revenue();
is('Doanh thu thực thu trở về mức ban đầu', Number(rev.netRevenue), Number(rev0.netRevenue));

sec('R5. Từ chối hoàn tiền và từ chối yêu cầu hủy vé');
const o2 = await buy(p2, TRIP, [seats[2]]);
const rq3 = await requestCancel(p2, o2.tickets[0], 'Thử từ chối hoàn');
await approve(rq3.j?.changeRequestId);
const rf3 = (await refundsOf(p2))[0];
const rej = await processRefund(rf3.id, { approve: false, note: 'Không đủ điều kiện' });
check('Từ chối hoàn có lý do -> Failed', rej.s === 200 && rej.j?.status === 'Failed', `HTTP ${rej.s} ${rej.j?.status}`);
check('Khách nhận thông báo kèm lý do từ chối', (await notesOf(p2)).some((n) => /bị từ chối/.test(n.title ?? '') && /Không đủ điều kiện/.test(n.message ?? '')));
is('Giao dịch vẫn Success khi hoàn bị từ chối', status('payments', o2.paymentId), 'Success');
const o3 = await buy(p3, TRIP, [seats[3]]);
const rq4 = await requestCancel(p3, o3.tickets[0], 'Thử quản lý từ chối hủy');
is('Quản lý từ chối yêu cầu hủy vé', (await call(manager, 'POST', `/api/ticket-change-requests/${rq4.j?.changeRequestId}/reject`)).s, 200);
check('Từ chối hủy: vé vẫn Valid và không phát sinh khoản hoàn', status('tickets', o3.tickets[0]) === 'Valid' && (await refundsOf(p3)).length === 0);

sec('R6. Vé đã quét không được hủy');
const o4 = await buy(p3, SCAN_TRIP, scanSeats);
const qr = sql(`select QrCode from tickets where Id=${o4.tickets[0]}`);
const sc = await call(driver, 'POST', '/api/ticket-scans', { tripId: SCAN_TRIP, qrCode: qr });
check('Tài xế được phân công quét vé hợp lệ', sc.j?.accepted === true, sc.t.slice(0, 100));
const cu = await requestCancel(p3, o4.tickets[0], 'Hủy vé đã dùng');
check('Hủy vé đã sử dụng -> 400', cu.s === 400, `HTTP ${cu.s} ${cu.j?.message ?? ''}`);

sec('R7. Hủy chuyến: hoàn đầy đủ cho vé còn hiệu lực');
const held = await book(p1, TRIP, [seats[4].seatId]);
check('p1 giữ một ghế chưa trả tiền trên chuyến sắp hủy', ok(held));
const after = seats[5];
const cancelTrip = await call(manager, 'PUT', `/api/assignments/${TRIP}/trip`, { status: 4 });
is('Quản lý hủy chuyến', cancelTrip.s, 200);
const tripRef = sql(`select r.Amount, r.Status from refunds r join payments p on p.Id=r.PaymentId join bookings b on b.Id=p.BookingId where b.TripId=${TRIP} and r.Reason='TripCancelled' order by r.Id`).split('\n').filter(Boolean);
check('Đúng 1 khoản hoàn TripCancelled cho vé còn hiệu lực (p3); vé đã hủy từ trước không bị hoàn trùng',
  tripRef.length === 1 && Number(tripRef[0].split('\t')[0]) === unit && tripRef[0].endsWith('Pending'), JSON.stringify(tripRef));
is('Không còn vé Valid hoặc Held trên chuyến đã hủy', sql(`select count(*) from tickets where TripId=${TRIP} and Status in ('Valid','Held')`), '0');
check('Ghế đang giữ chưa trả tiền cũng được nhả', (await seatMap(TRIP)).find((s) => s.seatId === seats[4].seatId)?.isAvailable === true);
is('Đặt vé trên chuyến đã hủy -> 400', (await book(p1, TRIP, [after.seatId])).s, 400);
const r3 = (await refundsOf(p3)).find((r) => r.reason === 'TripCancelled');
check('p3 thấy khoản hoàn do hủy chuyến (Pending)', r3 && r3.status === 'Pending');
check('p2 không bị hoàn trùng do hủy chuyến', !(await refundsOf(p2)).some((r) => r.reason === 'TripCancelled'));
const pr = await processRefund(r3.id, { approve: true, note: 'Hoàn do hủy chuyến' });
is('Quản lý duyệt hoàn tiền hủy chuyến', pr.j?.status, 'Success');
is('Giao dịch của p3 trên chuyến đã hủy chuyển Refunded', status('payments', o3.paymentId), 'Refunded');

// Hủy chuyến sửa dòng gốc của bảng trips nên phải trả lại trạng thái cũ.
finish([`update trips set Status='${tripStatus}' where Id=${TRIP}`]);
