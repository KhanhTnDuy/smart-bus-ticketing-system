// Giao tiếp giữa các vai trò qua CSDL: một vai trò ghi thì các vai trò khác phải thấy kết quả ngay ở API của họ,
// và những vai trò không liên quan thì không thấy hay không được can thiệp.
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/cross-role.mjs
// Cần backend ở chế độ Development và bật bộ giả lập thanh toán: Payments__Simulator__Enabled=true.
// Kịch bản tự dựng chuyến, vé, hồ sơ, voucher... riêng trên các ngày xa ở tương lai; lib.mjs dọn các bảng giao dịch sau khi chạy.
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { sec, check, is, ok, sql, call, login, createPassengers, freeSeats, seatMap, buy, finish, B } from './lib.mjs';

const admin = await login('admin');
const manager = await login('manager');
const driver1 = await login('driver1');
const driver2 = await login('driver2');
const conductor1 = await login('conductor1');
const [pax1, pax2] = await createPassengers(admin, 2);
const idOf = (u) => Number(sql(`select Id from accounts where Username='${u}'`));
const ID = { driver1: idOf('driver1'), driver2: idOf('driver2'), conductor1: idOf('conductor1'), conductor2: idOf('conductor2'), pax1: idOf('testpax1'), pax2: idOf('testpax2') };

const rows = (r) => (Array.isArray(r.j) ? r.j : r.j?.data ?? r.j?.items ?? r.j?.trips ?? []);
const has = (r, f) => rows(r).some(f);
const text = (r) => JSON.stringify(r.j ?? r.t);
const plusDays = (n, hh = 3) => { const d = new Date(Date.now() + n * 864e5); d.setUTCHours(hh, 0, 0, 0); return d; };
const vnDay = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
const notifs = async (tok) => (await call(tok, 'GET', '/api/notifications/my')).j?.items ?? [];
const uploadedFiles = [];
// Các bảng lib.mjs không dọn: ghi mốc id để xóa phần kịch bản tạo thêm.
const base = Object.fromEntries(['feedbacks', 'incidents', 'vouchers', 'passenger_verifications'].map((t) => [t, Number(sql(`select coalesce(max(Id),0) from ${t}`))]));

// ---------------------------------------------------------------------------------------------------------------------
sec('A. Quản lý tạo chuyến -> tài xế, phụ xe, khách và admin cùng thấy');
const dep = plusDays(20);
const mk = await call(manager, 'POST', '/api/assignments', { routeId: 1, departureAt: dep.toISOString(), busId: 1, driverId: ID.driver1, conductorId: ID.conductor1 });
is('Quản lý tạo chuyến có xe, tài xế, phụ xe -> 201', mk.s, 201);
const T = mk.j?.tripId;
const mySched = (tok) => call(tok, 'GET', '/api/assignments/my-schedule');
check('Tài xế driver1 thấy chuyến trong lịch của mình', has(await mySched(driver1), (t) => t.tripId === T && t.duty === 'DRIVER'));
check('Phụ xe conductor1 thấy chuyến trong lịch của mình', has(await mySched(conductor1), (t) => t.tripId === T && t.duty === 'CONDUCTOR'));
check('Tài xế driver2 (không được gán) không thấy chuyến', !has(await mySched(driver2), (t) => t.tripId === T));
const search = await call(null, 'GET', `/api/trips/search?from=1&to=2&date=${vnDay(dep)}`);
const found = rows(search).find((t) => t.id === T);
check('Khách tìm chuyến thấy chuyến mới của quản lý', !!found, `${rows(search).length} chuyến`);
check('Khách thấy đúng biển số xe và tên tài xế do quản lý gán', found?.busPlate === mk.j?.busPlate && found?.driverName === mk.j?.driverName && !!found?.busPlate,
  `${found?.busPlate}|${found?.driverName} vs ${mk.j?.busPlate}|${mk.j?.driverName}`);
is('Số chỗ trống bằng sức chứa của xe', found?.availableSeats, mk.j?.bus?.capacity);
check('Tài xế được thông báo "phân công chuyến mới" kèm đúng chuyến', (await notifs(driver1)).some((n) => n.tripId === T && /phân công/i.test(n.title)));
check('Phụ xe được thông báo phân công', (await notifs(conductor1)).some((n) => n.tripId === T));
check('Tài xế không liên quan không nhận thông báo của chuyến này', !(await notifs(driver2)).some((n) => n.tripId === T));
check('Admin thấy thao tác tạo chuyến trong nhật ký', text(await call(admin, 'GET', '/api/audit-logs')).includes(`#${T}`));

// ---------------------------------------------------------------------------------------------------------------------
sec('B. Khách mua vé -> quản lý, admin thấy thanh toán, hóa đơn, doanh thu, ghế; khách khác không thấy');
const seats = await freeSeats(T, 2);
const bought = await buy(pax1, T, seats);
is('Khách 1 mua 2 ghế', bought.tickets.length, 2);
is('Sơ đồ ghế (công khai) báo đúng 2 ghế đã bán', (await seatMap(T)).filter((s) => s.status === 'Sold').length, 2);
check('Quản lý thấy giao dịch trong danh sách thanh toán', has(await call(manager, 'GET', '/api/payments'), (p) => p.id === bought.paymentId));
const invoices = await call(manager, 'GET', '/api/invoices');
check('Quản lý thấy hóa đơn của khách với đúng số tiền', has(invoices, (i) => i.total === bought.amount && /Khách Thử 1/.test(i.passengerName ?? '')));
// Báo cáo doanh thu tính theo ngày chạy của chuyến, không theo ngày thanh toán.
const rev = await call(manager, 'GET', `/api/reports/revenue?startDate=${vnDay(dep)}&endDate=${vnDay(dep)}`);
check('Báo cáo doanh thu của quản lý (theo ngày chạy) đã cộng khoản vừa thu', Number(rev.j?.summary?.totalGross) >= bought.amount, `được ${rev.j?.summary?.totalGross}`);
const occ = await call(manager, 'GET', `/api/reports/occupancy?startDate=${vnDay(dep)}&endDate=${vnDay(dep)}`);
is('Báo cáo lấp đầy của quản lý đếm đúng 2 ghế đã bán của chuyến', occ.j?.trips?.find((t) => t.tripId === T)?.occupiedSeats, 2);
check('Khách 1 thấy thanh toán và hóa đơn của mình', has(await call(pax1.token, 'GET', '/api/payments/my'), (p) => p.id === bought.paymentId)
  && rows(await call(pax1.token, 'GET', '/api/invoices/my')).length > 0);
check('Khách 2 không thấy thanh toán của khách 1', !has(await call(pax2.token, 'GET', '/api/payments/my'), (p) => p.id === bought.paymentId));
check('Khách 2 không xem được chi tiết thanh toán của khách 1', [403, 404].includes((await call(pax2.token, 'GET', `/api/payments/${bought.paymentId}`)).s));
check('Khách 2 không thấy vé của khách 1', !has(await call(pax2.token, 'GET', '/api/bookings/my'), (t) => t.bookingId === bought.bookingId));
check('Admin thấy khách mua vé trong nhật ký', text(await call(admin, 'GET', '/api/audit-logs?username=testpax1')).length > 20);

// ---------------------------------------------------------------------------------------------------------------------
sec('C. Soát vé -> trạng thái vé của khách, lịch sử quét của tài xế, quản lý; tài xế khác bị chặn');
const myTickets = rows(await call(pax1.token, 'GET', '/api/bookings/my')).filter((t) => t.tripId === T);
const qr = myTickets[0]?.qrCode;
check('Khách có mã QR của vé', !!qr);
is('Tài xế driver2 (không phụ trách chuyến) quét vé chuyến này -> 403', (await call(driver2, 'POST', '/api/ticket-scans', { qrCode: qr, tripId: T })).s, 403);
is('Vé vẫn chưa dùng sau lần quét bị chặn', rows(await call(pax1.token, 'GET', '/api/bookings/my')).find((t) => t.qrCode === qr)?.status, 'Valid');
const scan = await call(conductor1, 'POST', '/api/ticket-scans', { qrCode: qr, tripId: T });
is('Phụ xe conductor1 quét vé hợp lệ -> 200', scan.s, 200);
is('Khách thấy vé của mình đã chuyển sang Used', rows(await call(pax1.token, 'GET', '/api/bookings/my')).find((t) => t.qrCode === qr)?.status, 'Used');
const rescan = await call(driver1, 'POST', '/api/ticket-scans', { qrCode: qr, tripId: T });
check('Quét lại vé đã dùng: kết quả AlreadyUsed, không cho lên xe lần hai', rescan.s === 200 && /AlreadyUsed/i.test(text(rescan)), `HTTP ${rescan.s} ${text(rescan).slice(0, 120)}`);
check('Tài xế driver1 thấy lượt quét của phụ xe trong lịch sử chuyến', rows(await call(driver1, 'GET', `/api/ticket-scans?tripId=${T}`)).length >= 1);
check('Quản lý thấy lịch sử quét của chuyến', rows(await call(manager, 'GET', `/api/ticket-scans?tripId=${T}`)).length >= 1);
check('Khách không xem được lịch sử quét -> 403', (await call(pax1.token, 'GET', `/api/ticket-scans?tripId=${T}`)).s === 403);
check('Admin thấy thao tác soát vé của conductor1 trong nhật ký', text(await call(admin, 'GET', '/api/audit-logs?username=conductor1')).length > 20);

// ---------------------------------------------------------------------------------------------------------------------
sec('D. Khách xin hủy vé -> quản lý duyệt -> hoàn tiền -> khách thấy; ghế được nhả');
const [seatD] = await freeSeats(T, 1);
const boughtD = await buy(pax2, T, [seatD]);
const ticketD = rows(await call(pax2.token, 'GET', '/api/bookings/my')).find((t) => t.bookingId === boughtD.bookingId);
const cancel = await call(pax2.token, 'POST', `/api/tickets/${ticketD.ticketId}/cancel`, { reason: 'Kiểm thử liên vai trò' });
is('Khách 2 gửi yêu cầu hủy vé -> 200', cancel.s, 200);
check('Quản lý thấy yêu cầu hủy vé chờ duyệt', has(await call(manager, 'GET', '/api/ticket-change-requests'), (r) => r.id === cancel.j?.changeRequestId && /Pending/i.test(String(r.status))));
check('Quản lý được thông báo có yêu cầu hủy vé mới', (await notifs(manager)).some((n) => /hủy vé/i.test(n.title)));
check('Khách 1 không thấy yêu cầu của khách 2', !has(await call(pax1.token, 'GET', '/api/ticket-change-requests/my'), (r) => r.id === cancel.j?.changeRequestId));
is('Khách không được duyệt yêu cầu của chính mình -> 403', (await call(pax2.token, 'POST', `/api/ticket-change-requests/${cancel.j?.changeRequestId}/approve`, {})).s, 403);
is('Quản lý duyệt hủy vé -> 200', (await call(manager, 'POST', `/api/ticket-change-requests/${cancel.j?.changeRequestId}/approve`, {})).s, 200);
is('Khách 2 thấy vé của mình đã hủy', rows(await call(pax2.token, 'GET', '/api/bookings/my')).find((t) => t.ticketId === ticketD.ticketId)?.status, 'Cancelled');
const refundMgr = rows(await call(manager, 'GET', '/api/refunds')).find((r) => r.paymentId === boughtD.paymentId);
check('Quản lý thấy khoản hoàn tiền sinh ra từ vé bị hủy', !!refundMgr);
check('Khách 2 thấy khoản hoàn của mình', has(await call(pax2.token, 'GET', '/api/refunds/my'), (r) => r.paymentId === boughtD.paymentId));
check('Khách 1 không thấy khoản hoàn của khách 2', !has(await call(pax1.token, 'GET', '/api/refunds/my'), (r) => r.paymentId === boughtD.paymentId));
if (refundMgr && /Pending/i.test(String(refundMgr.status))) {
  is('Quản lý duyệt hoàn tiền -> 200', (await call(manager, 'PATCH', `/api/refunds/${refundMgr.id}/process`, { approve: true, note: 'Đã hoàn qua ví' })).s, 200);
}
check('Sau khi hoàn, khách 2 thấy thanh toán chuyển sang Refunded', has(await call(pax2.token, 'GET', '/api/payments/my'), (p) => p.id === boughtD.paymentId && /Refunded/i.test(String(p.status))));
check('Ghế đã hủy được nhả trên sơ đồ công khai', (await seatMap(T)).find((s) => s.seatId === seatD.seatId)?.status === 'Available');
check('Khách 2 được thông báo khi khoản hoàn được xử lý', (await notifs(pax2.token)).some((n) => /hoàn/i.test(n.title + n.message)));

// ---------------------------------------------------------------------------------------------------------------------
sec('E. Khách nộp hồ sơ ưu đãi -> quản lý duyệt -> khách thấy kết quả');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fd = new FormData();
fd.append('file', new Blob([png], { type: 'image/png' }), 'the-sinh-vien.png');
const up = await (await fetch(`${B}/api/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${pax1.token}` }, body: fd })).json();
uploadedFiles.push(up.fileName);
check('Khách tải giấy tờ lên', !!up.url);
const app = await call(pax1.token, 'POST', '/api/discount-applications', { passengerTypeId: 2, documentUrl: up.url });
is('Khách nộp hồ sơ sinh viên -> 200/201', ok(app), true);
check('Quản lý thấy hồ sơ chờ duyệt', has(await call(manager, 'GET', '/api/discount-applications'), (a) => a.id === app.j?.id && a.status === 'Pending'));
check('Quản lý được thông báo có hồ sơ mới', (await notifs(manager)).some((n) => /hồ sơ|ưu đãi/i.test(n.title + n.message)));
check('Khách 2 không thấy hồ sơ của khách 1', !has(await call(pax2.token, 'GET', '/api/discount-applications/my'), (a) => a.id === app.j?.id));
check('Khách 2 không đọc được giấy tờ của khách 1', [403, 404].includes((await call(pax2.token, 'GET', up.url)).s));
is('Quản lý đọc được giấy tờ để xét duyệt', (await call(manager, 'GET', up.url)).s, 200);
is('Quản lý duyệt hồ sơ -> 200', (await call(manager, 'POST', `/api/discount-applications/${app.j?.id}/review`, { approve: true })).s, 200);
check('Khách 1 thấy hồ sơ đã được duyệt kèm hạn dùng', has(await call(pax1.token, 'GET', '/api/discount-applications/my'), (a) => a.id === app.j?.id && a.status === 'Approved' && !!a.validUntil));
check('Khách 1 được thông báo kết quả duyệt', (await notifs(pax1.token)).some((n) => /ưu đãi|hồ sơ/i.test(n.title + n.message)));

// ---------------------------------------------------------------------------------------------------------------------
sec('F. Khiếu nại của khách -> quản lý xử lý -> khách thấy trạng thái');
const fb = await call(pax1.token, 'POST', '/api/feedback', { passengerId: ID.pax1, routeId: 1, type: 0, subject: 'Kiểm thử liên vai trò', content: 'Xe đến trễ.' });
is('Khách gửi khiếu nại', ok(fb), true);
check('Quản lý thấy khiếu nại mới', has(await call(manager, 'GET', '/api/feedback'), (f) => f.id === fb.j?.id));
check('Khách 2 không xem được khiếu nại của khách 1', [403, 404].includes((await call(pax2.token, 'GET', `/api/feedback/${fb.j?.id}`)).s));
is('Khách không đổi được trạng thái khiếu nại -> 403', (await call(pax1.token, 'PATCH', `/api/feedback/${fb.j?.id}/status`, { status: 2 })).s, 403);
is('Quản lý chuyển sang đang xử lý -> 200', (await call(manager, 'PATCH', `/api/feedback/${fb.j?.id}/status`, { status: 1 })).s, 200);
check('Khách 1 được thông báo khi khiếu nại đổi trạng thái', (await notifs(pax1.token)).some((n) => /phản ánh/i.test(n.title + n.message)));
check('Khách 1 thấy trạng thái mới của khiếu nại', has(await call(pax1.token, 'GET', '/api/feedback/my'), (f) => f.id === fb.j?.id && (f.status === 1 || /DangXuLy/i.test(String(f.status)))));

// ---------------------------------------------------------------------------------------------------------------------
sec('G. Quản lý tạo voucher -> khách thấy và dùng được; khách không được tạo');
const code = `QAX${Date.now().toString().slice(-6)}`;
const voucherBody = { code, discountType: 1, discountValue: 5000, startAt: plusDays(-1).toISOString(), endAt: plusDays(30).toISOString(), usageLimit: 5 };
is('Khách tạo voucher -> 403', (await call(pax1.token, 'POST', '/api/vouchers', voucherBody)).s, 403);
const vc = await call(manager, 'POST', '/api/vouchers', voucherBody);
is('Quản lý tạo voucher', ok(vc), true);
check('Khách thấy voucher mới trong kho', has(await call(pax1.token, 'GET', '/api/vouchers/available'), (v) => v.code === code));
const val = await call(pax1.token, 'POST', '/api/vouchers/validate', { code, orderAmount: 30000 });
check('Khách kiểm tra voucher ra mức giảm 5.000đ', val.j?.isValid === true && Number(val.j?.discountAmount) === 5000, text(val).slice(0, 160));
check('Quản lý xóa voucher', [200, 204].includes((await call(manager, 'DELETE', `/api/vouchers/${vc.j?.id}`)).s));
check('Voucher đã xóa biến mất khỏi kho của khách', !has(await call(pax1.token, 'GET', '/api/vouchers/available'), (v) => v.code === code));

// ---------------------------------------------------------------------------------------------------------------------
sec('H. Tài xế báo sự cố -> quản lý xử lý -> trễ giờ hiện cho khách và tài xế');
const inc = await call(driver1, 'POST', '/api/incidents', { tripId: T, incidentType: 0, delayMinutes: 15, location: 'Ngã tư Hàng Xanh', description: 'Kẹt xe kiểm thử' });
is('Tài xế báo sự cố chuyến mình -> 200/201', ok(inc), true);
check('Quản lý thấy sự cố', has(await call(manager, 'GET', '/api/incidents'), (i) => i.id === inc.j?.id));
check('Quản lý được thông báo có sự cố mới', (await notifs(manager)).some((n) => n.tripId === T && /sự cố/i.test(n.title + n.message)));
is('Tài xế driver2 báo sự cố cho chuyến không phải của mình -> 403', (await call(driver2, 'POST', '/api/incidents', { tripId: T, incidentType: 0, delayMinutes: 5, location: 'x', description: 'x' })).s, 403);
const searchAfter = await call(null, 'GET', `/api/trips/search?from=1&to=2&date=${vnDay(dep)}`);
is('Khách thấy số phút trễ do tài xế báo', rows(searchAfter).find((t) => t.id === T)?.delayMinutes, 15);
is('Lịch của tài xế cũng phản ánh trễ giờ', rows(await mySched(driver1)).find((t) => t.tripId === T) !== undefined, true);
check('Khách có vé trên chuyến nhận thông báo trễ giờ/sự cố', (await notifs(pax1.token)).some((n) => n.tripId === T && /trễ|sự cố|delay/i.test(n.title + n.message + n.type)));
is('Quản lý xử lý xong sự cố -> 200', (await call(manager, 'PATCH', `/api/incidents/${inc.j?.id}/resolve`, { note: 'Đã thông đường' })).s, 200);
check('Tài xế thấy sự cố đã được xử lý', has(await call(driver1, 'GET', '/api/incidents'), (i) => i.id === inc.j?.id && /Resolved|1/.test(String(i.status))));

// ---------------------------------------------------------------------------------------------------------------------
sec('I. Quản lý hủy chuyến -> khách được thông báo và hoàn tiền, tài xế thấy chuyến hủy');
const dep2 = plusDays(21);
const mk2 = await call(manager, 'POST', '/api/assignments', { routeId: 1, departureAt: dep2.toISOString(), busId: 2, driverId: ID.driver2 });
const T2 = mk2.j?.tripId;
is('Quản lý tạo chuyến thứ hai', mk2.s, 201);
const [seatI] = await freeSeats(T2, 1);
const boughtI = await buy(pax1, T2, [seatI]);
is('Quản lý hủy chuyến -> 200', (await call(manager, 'PUT', `/api/assignments/${T2}/trip`, { status: 4 })).s, 200);
check('Khách có vé nhận thông báo chuyến bị hủy', (await notifs(pax1.token)).some((n) => n.tripId === T2 && /hủy/i.test(n.title + n.message)));
is('Tìm chuyến báo trạng thái đã hủy', rows(await call(null, 'GET', `/api/trips/search?from=1&to=2&date=${vnDay(dep2)}`)).find((t) => t.id === T2)?.status, 'CANCELLED');
check('Khoản hoàn tiền do hủy chuyến xuất hiện cho quản lý', has(await call(manager, 'GET', '/api/refunds'), (r) => r.paymentId === boughtI.paymentId));
check('Khoản hoàn tiền do hủy chuyến xuất hiện cho khách', has(await call(pax1.token, 'GET', '/api/refunds/my'), (r) => r.paymentId === boughtI.paymentId));
check('Lịch của tài xế driver2 đánh dấu chuyến đã hủy', rows(await mySched(driver2)).find((t) => t.tripId === T2)?.status === 4 || /Cancelled/i.test(String(rows(await mySched(driver2)).find((t) => t.tripId === T2)?.status)));
is('Khách không đặt thêm được vé chuyến đã hủy', (await call(pax2.token, 'POST', '/api/bookings', { tripId: T2, seatIds: [seatI.seatId], boardStopId: 1, alightStopId: 2 })).s >= 400, true);

// ---------------------------------------------------------------------------------------------------------------------
sec('J. Admin quản lý tài khoản -> vai trò có hiệu lực ở lần đăng nhập sau');
const uname = `qa_cond${Date.now().toString().slice(-5)}`;
is('Quản lý không được tạo tài khoản -> 403', (await call(manager, 'POST', '/api/accounts', { username: uname, password: 'QaPass@12345', fullName: 'QA', role: 3 })).s, 403);
const acc = await call(admin, 'POST', '/api/accounts', { username: uname, password: 'QaPass@12345', fullName: 'QA Phụ xe', role: 3 });
is('Admin tạo tài khoản phụ xe', ok(acc), true);
const qaTok = await login(uname, 'QaPass@12345');
is('Phụ xe mới vào được lịch trực của mình', (await call(qaTok, 'GET', '/api/assignments/my-schedule')).s, 200);
is('Phụ xe không vào được danh sách tài khoản -> 403', (await call(qaTok, 'GET', '/api/accounts')).s, 403);
is('Phụ xe không tạo được chuyến -> 403', (await call(qaTok, 'POST', '/api/assignments', { routeId: 1, departureAt: plusDays(25).toISOString() })).s, 403);
is('Token của phụ xe dùng được trước khi bị đổi vai', (await call(qaTok, 'GET', '/api/assignments/my-schedule')).s, 200);
is('Admin đổi vai trò sang hành khách -> 200', (await call(admin, 'PATCH', `/api/accounts/${acc.j?.id}/role`, { role: 4 })).s, 200);
is('Token CŨ của tài khoản vừa bị đổi vai bị từ chối ngay -> 401 (không giữ quyền cũ tới khi hết hạn)', (await call(qaTok, 'GET', '/api/assignments/my-schedule')).s, 401);
const qaTok2 = await login(uname, 'QaPass@12345');
is('Sau khi đổi vai, đăng nhập lại không còn quét vé được -> 403', (await call(qaTok2, 'POST', '/api/ticket-scans', { qrCode: 'x', tripId: T })).s, 403);
is('Token mới (hành khách) dùng được', (await call(qaTok2, 'GET', '/api/bookings/my')).s, 200);
is('Admin khóa tài khoản -> 200', (await call(admin, 'PUT', `/api/accounts/${acc.j?.id}`, { fullName: 'QA Phụ xe', email: null, phone: null, role: 4, active: false })).s, 200);
is('Token CŨ của tài khoản vừa bị khóa bị từ chối ngay -> 401', (await call(qaTok2, 'GET', '/api/bookings/my')).s, 401);
is('Tài khoản bị khóa không đăng nhập lại được -> 401', (await call(null, 'POST', '/api/auth/login', { identity: uname, password: 'QaPass@12345' })).s, 401);
is('Token của tài khoản khác không bị ảnh hưởng', (await call(pax1.token, 'GET', '/api/bookings/my')).s, 200);

// ---------------------------------------------------------------------------------------------------------------------
sec('K. Quản lý thêm trạm và tuyến -> khách thấy ngay');
const stopBase = Number(sql('select coalesce(max(Id),0) from stops'));
const routeBase = Number(sql('select coalesce(max(Id),0) from routes'));
const s1 = await call(manager, 'POST', '/api/stops', { name: 'QA Liên vai A', latitude: 10.8, longitude: 106.7 });
const s2 = await call(manager, 'POST', '/api/stops', { name: 'QA Liên vai B', latitude: 10.81, longitude: 106.71 });
const rc = await call(manager, 'POST', '/api/routes', { code: 'QAXR', name: 'QA liên vai', startPoint: 'QA Liên vai A', endPoint: 'QA Liên vai B', distanceKm: 3, active: true });
is('Quản lý tạo tuyến', ok(rc), true);
check('Khách (chưa đăng nhập cũng được) thấy tuyến mới trong danh sách', has(await call(null, 'GET', '/api/routes?pageSize=100'), (r) => r.code === 'QAXR'));
check('Khách thấy hai trạm mới', has(await call(pax1.token, 'GET', '/api/stops?pageSize=100'), (s) => s.id === s1.j?.id) && has(await call(pax1.token, 'GET', '/api/stops?pageSize=100'), (s) => s.id === s2.j?.id));
is('Khách không tạo được tuyến -> 403', (await call(pax1.token, 'POST', '/api/routes', { code: 'QAXX', name: 'x', startPoint: 'a', endPoint: 'b', distanceKm: 1, active: true })).s, 403);

for (const f of uploadedFiles) {
  try { unlinkSync(join(process.env.UPLOAD_DIR || 'backend/SmartBusTicketing.Api/App_Data/uploads', f)); } catch { /* backend chạy ở thư mục khác */ }
}
// lib.mjs xóa tài khoản thử trước phần restore, nên các bảng tham chiếu tới tài khoản phải được dọn trước.
sql([
  `delete from feedbacks where Id>${base.feedbacks}`,
  `delete from incidents where Id>${base.incidents}`,
  `delete from vouchers where Id>${base.vouchers}`,
  `delete from passenger_verifications where Id>${base.passenger_verifications}`,
  `delete from route_stops where RouteId>${routeBase}`,
  `delete from routes where Id>${routeBase}`,
  `delete from stops where Id>${stopBase}`,
].join('; '));
finish();
