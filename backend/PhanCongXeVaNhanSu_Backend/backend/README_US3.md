# US3 - Quản lý tuyến & trạm (Backend)

User story: "Là quản lý, tôi muốn thêm/sửa/xóa thông tin tuyến đường, danh sách trạm dừng và giá vé để thiết lập hệ thống."

Không cần đổi database: dùng sẵn các bảng `routes`, `stops`, `route_stops`, `fares`, `passenger_types`.

## Endpoint
Xem (GET): không cần đăng nhập. Thêm/sửa/xóa: role `Admin` hoặc `Manager` (JWT, cấu hình giống US1/US2).

| Method | URL | Ghi chú |
|---|---|---|
| GET | /api/routes?search=&active=&page=&pageSize= | Danh sách tuyến, có StopCount |
| GET/POST/PUT/DELETE | /api/routes[/{id}] | Mã tuyến duy nhất. Không xóa được tuyến đã có chuyến/lịch/vé tháng (409) |
| GET | /api/routes/{id}/stops | Trạm của tuyến theo thứ tự |
| PUT | /api/routes/{id}/stops | Thay toàn bộ danh sách trạm (thêm/gỡ/sắp xếp lại), thứ tự = thứ tự mảng |
| GET/POST/PUT/DELETE | /api/stops[/{id}] | Không xóa được trạm đang thuộc tuyến hoặc đã có vé (409) |
| GET | /api/fares?routeId= | Trả thêm Status: ACTIVE / UPCOMING / EXPIRED |
| POST/PUT/DELETE | /api/fares[/{id}] | Không trùng (tuyến, loại vé, đối tượng, ngày áp dụng) |

Ví dụ `PUT /api/routes/1/stops`:
```json
{ "stops": [ { "stopId": 3, "minutesFromStart": 0 }, { "stopId": 7, "minutesFromStart": 12 } ] }
```
Ví dụ `POST /api/fares`:
```json
{ "routeId": 1, "ticketType": "Single", "passengerTypeId": 1, "price": 7000, "effectiveFrom": "2026-10-01" }
```

## File mới / sửa
- Mới: `DTOs/RouteManagementDtos.cs`, `Services/RouteManagementService.cs`, `Controllers/RouteManagementControllers.cs`
- Sửa: `Program.cs` (đăng ký service + JWT như US2), `SmartBusTicketing.Api.csproj` (thêm JwtBearer)

## Lưu ý khi gộp với US2
`Program.cs` ở đây chưa có dòng `AddScoped<IAuditLogService, AuditLogService>()`. Khi merge, giữ cả hai dòng đăng ký service.

## Đã test với MySQL 8.4 thật
Dựng database trống bằng migration rồi gọi thử toàn bộ endpoint: thêm/sửa/xóa, trùng mã, dữ liệu sai, thiếu quyền, sắp xếp lại trạm, giá vé UPCOMING/ACTIVE, chặn xóa tuyến đã có chuyến. Kết quả đúng.
Chưa test: đăng nhập thật của US1 (test bằng JWT tự tạo).

## Sửa kèm theo (lỗi có sẵn khi chạy thật)
1. **Migration `InitialCreate` không chạy được trên MySQL.** `CK_payments_target` và cột sinh tự động `ActiveSeatKey` trong `AppDbContext.cs` dùng tên cột snake_case (`booking_id`, `trip_id`...) trong khi cột thật là `BookingId`, `TripId`... Đã sửa và tạo lại migration `InitialCreate` (chưa ai chạy được bản cũ nên không ảnh hưởng database nào).
2. **`passenger_types` không có dữ liệu mẫu** nên không tạo được giá vé. Đã thêm 4 dòng mặc định (STANDARD, STUDENT, ELDERLY, WORKER) bằng `HasData`.
3. **`database/schema.sql` không khớp code EF** (schema.sql dùng `start_point`, EF dùng `StartPoint`). Không dùng file này để dựng database nữa, hãy dùng migration: `dotnet ef database update`. Đã thêm ghi chú đầu file schema.sql.
4. **JWT:** `Program.cs` thêm `options.MapInboundClaims = false;`. Thiếu dòng này thì .NET đổi claim `role` thành URI dài và `[Authorize(Roles=...)]` luôn trả 403 kể cả Admin/Manager (bản JWT của US2 cũng có lỗi này).

## Chạy thử
```
cd backend/SmartBusTicketing.Api
dotnet ef database update
# cần cấu hình Jwt:Key (>= 32 ký tự), Jwt:Issuer, Jwt:Audience để dùng các endpoint thêm/sửa/xóa
dotnet run
```
