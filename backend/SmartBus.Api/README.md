# Smart Bus Ticketing System - Backend Sprint 2

Backend thật cho Sprint 2, dùng ASP.NET Core Web API + EF Core + SQLite.

## User Story 1 - Schedule
- Quản lý tuyến (`Route`)
- Thiết lập ngày chạy
- Giờ bắt đầu/kết thúc
- Tần suất chạy
- Giá vé
- Sinh các chuyến (`Trip`) theo ngày từ lịch

## User Story 2 - Trip Assignment
- Gán xe thật bằng `BusId`
- Gán tài xế thật bằng `DriverId`
- Gán phụ xe thật bằng `AssistantId`
- Kiểm tra trùng thời gian cho xe, tài xế, phụ xe
- Cập nhật trạng thái chuyến từ `PLANNED` sang `ASSIGNED`

## Database
SQLite: `smartbus.db`

Các entity chính:
`Route`, `Schedule`, `Trip`, `Bus`, `Driver`, `Assistant`, `TripAssignment`, `BusSeat`, `SeatReservation`, `AuditLog`.

## Chạy

```bash
dotnet restore
dotnet run
```

OpenAPI:
`http://localhost:5000/openapi/v1.json`

## API

### Schedule
```text
GET    /api/schedules
GET    /api/schedules/{id}
POST   /api/schedules
PUT    /api/schedules/{id}
DELETE /api/schedules/{id}
POST   /api/schedules/{id}/generate-trips
```

### Trip
```text
GET /api/trips
GET /api/trips/{id}
GET /api/trips/search?from=...&to=...&date=...
```

### Assignment
```text
GET    /api/assignments
GET    /api/assignments/trip/{tripId}
POST   /api/assignments/trip/{tripId}
DELETE /api/assignments/trip/{tripId}
```

### Resources
```text
GET /api/resources/routes
GET /api/resources/buses
GET /api/resources/drivers
GET /api/resources/assistants
```

## Ví dụ tạo Schedule

```json
{
  "routeName": "Tuyến 01",
  "startPoint": "Bến xe Thái Nguyên",
  "endPoint": "Đại học CNTT",
  "startTime": "06:00:00",
  "endTime": "18:00:00",
  "frequencyMinutes": 30,
  "daysOfWeek": "MON,TUE,WED,THU,FRI,SAT",
  "fare": 10000,
  "active": true,
  "routeId": 1
}
```

## Ví dụ sinh chuyến

POST `/api/schedules/1/generate-trips`

```json
{
  "date": "2026-10-05"
}
```

## Ví dụ phân công

POST `/api/assignments/trip/1`

```json
{
  "busId": 1,
  "driverId": 1,
  "assistantId": 1
}
```

Nếu xe/tài xế/phụ xe đã có một chuyến khác bị chồng thời gian, API trả `409 Conflict`.

> Lưu ý: Nếu máy đã có `smartbus.db` từ phiên bản cũ, xóa file database cũ trước lần chạy đầu tiên của phiên bản Sprint 2 này để EF Core tạo schema mới.
