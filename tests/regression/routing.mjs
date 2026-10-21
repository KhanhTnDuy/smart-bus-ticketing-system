// Thêm tuyến chọn trạm có sẵn và cự ly tính theo đường đi thực tế (dịch vụ chỉ đường OSRM).
//
// Chạy:  CONFIRM_TEST_DB=1 node tests/regression/routing.mjs
// Cần backend ở chế độ Development với Routing__Enabled=true và Routing__BaseUrl=http://127.0.0.1:2527 (run-all.mjs đã đặt):
// kịch bản tự dựng một máy chủ OSRM giả ở cổng đó, nên không cần mạng và kết quả luôn như nhau.
import { createServer } from 'node:http';
import { sec, check, is, sql, call, login, createPassengers, finish } from './lib.mjs';

const MOCK_PORT = Number(process.env.OSRM_MOCK_PORT || 2527);

// OSRM giả: chặng thứ i (từ 0) dài (i+1)*4000 m, mỗi km mất 90 giây. Hai điểm -> 4 km; ba điểm -> 4 km và 8 km.
const requests = [];
const mock = createServer((req, res) => {
  requests.push(req.url);
  const m = req.url.match(/^\/route\/v1\/driving\/([^?]+)/);
  if (!m) { res.writeHead(404).end(); return; }
  const points = m[1].split(';');
  const legs = points.slice(1).map((_, i) => ({ distance: (i + 1) * 4000, duration: (i + 1) * 4000 * 0.09 }));
  const distance = legs.reduce((a, l) => a + l.distance, 0);
  const duration = legs.reduce((a, l) => a + l.duration, 0);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ code: 'Ok', routes: [{ distance, duration, legs }] }));
});
await new Promise((r) => mock.listen(MOCK_PORT, '127.0.0.1', r));

const stopBase = Number(sql('select coalesce(max(Id),0) from stops'));
const routeBase = Number(sql('select coalesce(max(Id),0) from routes'));

const admin = await login('admin');
const manager = await login('manager');
const [pax] = await createPassengers(admin, 1);

// Ba trạm thẳng hàng, cách đều nhau: theo đường chim bay thì chặng giữa chiếm đúng một nửa tuyến.
const mkStop = async (name, lat) => (await call(manager, 'POST', '/api/stops', { name, latitude: lat, longitude: 106.7 })).j?.id;
const A = await mkStop('QA OSRM A', 10.70);
const B = await mkStop('QA OSRM B', 10.71);
const C = await mkStop('QA OSRM C', 10.72);
const est = (a, b, tok = manager) => call(tok, 'GET', `/api/routes/estimate?fromStopId=${a}&toStopId=${b}`);

sec('1. Ước tính cự ly giữa hai trạm có sẵn');
const e1 = await est(A, B);
is('Ước tính -> 200', e1.s, 200);
is('Nguồn là đường đi thực tế', e1.j?.source, 'road');
is('Cự ly lấy từ dịch vụ chỉ đường (4 km), không phải đường chim bay (~1,1 km)', e1.j?.distanceKm, 4);
is('Thời gian lái xe làm tròn lên phút (4 km x 90 giây = 6 phút)', e1.j?.durationMinutes, 6);
is('Trả đúng tên hai trạm', `${e1.j?.fromStopName}|${e1.j?.toStopName}`, 'QA OSRM A|QA OSRM B');
check('Backend đã gọi dịch vụ chỉ đường với kinh độ đứng trước vĩ độ', requests.some((u) => u.includes('/106.7,10.7;106.7,10.71')), requests.join(' '));
is('Hai trạm giống nhau -> 400', (await est(A, A)).s, 400);
is('Trạm không tồn tại -> 404', (await est(A, 99999999)).s, 404);
is('Không có token -> 401', (await est(A, B, null)).s, 401);
is('Hành khách không được ước tính -> 403', (await est(A, B, pax.token)).s, 403);

sec('2. Km từng trạm chia theo tỉ lệ đường đi thực tế');
const route = (await call(manager, 'POST', '/api/routes', { code: 'QAOSRM', name: 'Tuyen thu OSRM', startPoint: 'QA OSRM A', endPoint: 'QA OSRM C', distanceKm: 12, active: true })).j;
check('Tạo tuyến thử', !!route?.id);
const put = await call(manager, 'PUT', `/api/routes/${route.id}/stops`, {
  stops: [{ stopId: A, minutesFromStart: 0 }, { stopId: B, minutesFromStart: 10 }, { stopId: C, minutesFromStart: 20 }],
});
is('Gán ba trạm -> 200', put.s, 200);
const km = (put.j ?? []).map((s) => Number(s.distanceFromStartKm));
is('Trạm đầu ở km 0', km[0], 0);
// Chặng 1 dài 4 km, chặng 2 dài 8 km trên đường thật nên tỉ lệ 1:2 -> 12 km chia thành 4 và 8. Đường chim bay sẽ cho 6 và 6.
is('Trạm giữa ở km 4 theo tỉ lệ đường thực tế (không phải 6 như đường chim bay)', km[1], 4);
is('Trạm cuối đúng bằng độ dài tuyến', km[2], 12);

sec('3. Dịch vụ chỉ đường không trả lời thì quay về đường chim bay');
await new Promise((r) => mock.close(r));
const e2 = await est(A, B);
is('Vẫn trả 200 khi dịch vụ chỉ đường tắt', e2.s, 200);
is('Báo rõ nguồn là đường chim bay', e2.j?.source, 'straight-line');
check('Cự ly chim bay giữa hai trạm cách 0,01 độ vĩ độ (~1,11 km)', e2.j?.distanceKm > 1.0 && e2.j?.distanceKm < 1.3, `được ${e2.j?.distanceKm}`);
is('Không có thời gian lái xe khi dùng đường chim bay', e2.j?.durationMinutes ?? null, null);
const put2 = await call(manager, 'PUT', `/api/routes/${route.id}/stops`, {
  stops: [{ stopId: A, minutesFromStart: 0 }, { stopId: B, minutesFromStart: 10 }, { stopId: C, minutesFromStart: 20 }],
});
is('Gán lại trạm khi dịch vụ chỉ đường tắt -> 200', put2.s, 200);
is('Km trạm giữa quay về chia đôi theo đường chim bay (6 km)', Number(put2.j?.[1]?.distanceFromStartKm), 6);

finish([
  `delete from route_stops where RouteId>${routeBase}`,
  `delete from routes where Id>${routeBase}`,
  `delete from stops where Id>${stopBase}`,
]);
