# SCRUM-50: Phân công xe và nhân sự: Gán xe buýt, tài xế và phụ xe cho từng chuyến chạy (Backend)

User story: *"Là Quản lý điều hành, tôi muốn phân công xe buýt, tài xế và phụ xe cho từng chuyến chạy để đảm bảo phương tiện và nhân sự sẵn sàng vận hành đúng giờ, chống trùng lịch và theo dõi lịch trình làm việc."*

Sử dụng trực tiếp các bảng trong database: `trips`, `trip_staff`, `buses`, `seats`, `routes`, `accounts`, `audit_logs`.

---

## 1. Danh sách Endpoints API (`/api/assignments`)

| Method | URL | Vai trò | Mô tả |
|---|---|---|---|
| **GET** | `/api/assignments` | Admin, Manager, Driver, Conductor | Danh sách chuyến chạy kèm phân công (hỗ trợ lọc `routeId`, `date`, `status`, `state: All/FullyAssigned/PartiallyAssigned/Unassigned`, `search`, `shift`, phân trang `page`, `pageSize`). Tự động bảo mật thông tin cá nhân: Driver/Conductor chỉ thấy ca của chính mình. |
| **GET** | `/api/assignments/{id}` | Admin, Manager, Driver, Conductor | Xem chi tiết phân công chuyến chạy theo ID hoặc mã (hỗ trợ `1`, `ASN-1`, `TRIP-1`). Chặn truy cập nếu Driver/Conductor không thuộc chuyến đó. |
| **POST** | `/api/assignments` | Admin, Manager | **Tạo mới chuyến chạy và phân công tổ xe & nhân sự** (kiểm tra xung đột lịch và hợp lệ). |
| **PUT** | `/api/assignments/{id}` | Admin, Manager | **Gán hoặc đổi xe buýt, tài xế và phụ xe cho chuyến chạy** (có kiểm tra xung đột lịch, dùng giao dịch Serializable chống race condition double-booking). |
| **DELETE** | `/api/assignments/{id}` | Admin, Manager | Gỡ phân công xe, tài xế hoặc phụ xe khỏi chuyến chạy (chặn nếu chuyến đã hoàn thành/hủy). |
| **POST** | `/api/assignments/batch` | Admin, Manager | Phân công hàng loạt một tổ xe/tài xế/phụ xe cho nhiều chuyến chạy. |
| **POST** | `/api/assignments/check-conflict` | Admin, Manager | Kiểm tra trước xem việc gán xe, tài xế hoặc phụ xe có bị trùng giờ với chuyến nào khác không. |
| **GET** | `/api/assignments/available-buses` | Admin, Manager | Danh sách xe buýt và trạng thái khả dụng tại giờ xuất bến (loại trừ xe bảo trì/bận). |
| **GET** | `/api/assignments/available-staff` | Admin, Manager | Danh sách tài xế / phụ xe khả dụng tại giờ xuất bến (loại trừ người bận/khóa). |
| **GET** | `/api/assignments/my-schedule` | Driver, Conductor | Tài xế / Phụ xe tra cứu ca trực và lộ trình các chuyến được phân công của chính mình. |

---

## 2. Quy tắc nghiệp vụ (Business Rules) & Xử lý phản hồi Review của Trưởng nhóm

1. **Kiểm tra trạng thái xe buýt & cập nhật sức chứa (Fix Leader Review #1):**
   - Chỉ xe buýt có trạng thái `Active` (Hoạt động) mới được phép phân công vào chuyến chạy. Xe đang `Maintenance` (Bảo trì) hoặc `Inactive` (Ngừng hoạt động) sẽ bị từ chối với mã lỗi `409 Conflict`.
   - Trong `BusManagementService.UpdateBusAsync`: Khi cập nhật sức chứa (`Capacity`) của xe buýt, nếu xe đã có vé được bán ra cho hành khách, hệ thống trả về `409 Conflict` (ProblemDetails) kèm thông báo rõ ràng, không âm thầm bỏ qua.

2. **Bảo mật dữ liệu cá nhân & phân quyền chặt chẽ (Fix Leader Review #2):**
   - **Danh sách phân công (`GET /api/assignments`):** Quản lý (`Admin`, `Manager`) xem được toàn bộ hệ thống. Với tài khoản Tài xế / Phụ xe (`Driver`, `Conductor`), hệ thống tự động ép lọc `StaffAccountId = callerId` theo token đăng nhập.
   - **Chi tiết phân công (`GET /api/assignments/{id}`):** Nếu người gọi là Tài xế / Phụ xe và không được phân công vào chuyến đó, hệ thống lập tức chặn với mã lỗi `403 Forbidden`. Không một nhân sự nào xem được số điện thoại hay lịch trình của nhân viên khác.

3. **Chống trùng lịch chính xác bằng khoảng giao nhau & giao dịch Serializable chống Race-condition (Fix Leader Review #3):**
   - Hai chuyến chạy giao nhau khi và chỉ khi: `otherStart < thisEnd && thisStart < otherEnd`.
   - Mỗi chuyến sử dụng thời lượng thực tế của tuyến đó (`duration`) cộng thêm 15 phút đệm quay đầu/nghỉ (`thisEnd = thisStart + thisDuration + 15`). Khắc phục triệt để lỗi bỏ sót chuyến dài xuất bến trước đó.
   - Quá trình gán xe và nhân sự trong `AssignTripAsync` được bao bọc trong giao dịch cơ sở dữ liệu cấp cao nhất `IsolationLevel.Serializable`. Đảm bảo khi 2 quản lý cùng gán 1 xe/tài xế cho 2 chuyến trùng giờ cùng lúc thì một bên sẽ bị chặn (Rollback và báo lỗi `409 Conflict`), ngăn chặn hoàn toàn nguy cơ double-booking.

4. **Bảo tồn toàn vẹn DbSeeder & Khởi tạo dữ liệu mẫu (Fix Leader Review #4):**
   - Trong `DbSeeder.cs`, giữ nguyên 100% mã nguồn và các bước kiểm tra của hàm `SeedAdminAsync` từ nhánh `main`: ghi rõ `logger.LogError` khi tên đăng nhập Admin bị trùng với tài khoản thuộc vai trò khác, ghi log cảnh báo mật khẩu mặc định dev.
   - Bổ sung hàm riêng biệt `SeedAssignmentSampleDataAsync` chỉ chạy ở môi trường Development khi chưa có dữ liệu chuyến chạy, giúp dev/tester có ngay dữ liệu kiểm thử.

5. **Tách rời phạm vi ticket SCRUM-50 & Chuẩn hóa Git Line Ending:**
   - Không chứa các Controller/Service thuộc ticket khác: Đội xe thuộc SCRUM-49 (`BusesController`), Tra cứu chuyến thuộc SCRUM-54/55 (`TripSearchController`). Toàn bộ nghiệp vụ phân công tập trung vào `/api/assignments`.
   - Cấu hình `.gitattributes` với `* text=auto eol=lf`, bảo toàn lịch sử git blame và không bị xung đột line ending CRLF/LF.

---

## 3. Ví dụ Request & Response

### Phân công xe, tài xế và phụ xe cho chuyến:
**`PUT /api/assignments/1`**
```json
{
  "busId": 1,
  "driverId": 2,
  "conductorId": 4,
  "notes": "Phân công tổ xe chạy ca sáng"
}
```

**Response `200 OK`:**
```json
{
  "tripId": 1,
  "id": "ASN-1",
  "rawId": 1,
  "routeId": 1,
  "routeCode": "T01",
  "routeName": "Bến Thành — Bến xe Miền Tây",
  "routeStartPoint": "Công viên 23/9 (Bến Thành)",
  "routeEndPoint": "Bến xe Miền Tây",
  "departureAt": "2026-10-01T07:30:00",
  "estimatedArrivalAt": "2026-10-01T08:20:00",
  "estimatedDurationMinutes": 50,
  "status": 0,
  "statusText": "Đã lên lịch",
  "delayMinutes": 0,
  "bus": {
    "id": 1,
    "plateNumber": "51B-184.22",
    "capacity": 47,
    "status": 0
  },
  "driver": {
    "accountId": 2,
    "username": "driver1",
    "fullName": "Nguyễn Văn Tuấn",
    "phone": "0901234567",
    "duty": 0
  },
  "conductor": {
    "accountId": 4,
    "username": "conductor1",
    "fullName": "Trần Minh Đức",
    "phone": "0902234567",
    "duty": 1
  },
  "isFullyAssigned": true,
  "hasConductor": true,
  "bookedTicketsCount": 0,
  "busPlate": "51B-184.22",
  "driverId": "2",
  "driverName": "Nguyễn Văn Tuấn",
  "assistantId": "4",
  "assistantName": "Trần Minh Đức",
  "date": "2026-10-01",
  "shift": "CA_SANG",
  "shiftHours": "07:30 — 08:20"
}
```

### Kiểm tra xung đột trước khi gán:
**`POST /api/assignments/check-conflict`**
```json
{
  "departureAt": "2026-10-01T07:45:00Z",
  "routeId": 1,
  "busId": 1,
  "driverId": 2,
  "conductorId": 4
}
```

**Response `200 OK`:**
```json
{
  "hasConflict": true,
  "conflicts": [
    "Xe '51B-184.22' đã được gán cho chuyến #1 (Tuyến T01) lúc 07:30 01/10/2026.",
    "Tài xế 'Nguyễn Văn Tuấn' đã được phân công cho chuyến #1 (Tuyến T01) lúc 07:30 01/10/2026."
  ],
  "message": "Xe '51B-184.22' đã được gán cho chuyến #1 (Tuyến T01) lúc 07:30 01/10/2026.; Tài xế 'Nguyễn Văn Tuấn' đã được phân công cho chuyến #1 (Tuyến T01) lúc 07:30 01/10/2026.",
  "conflictType": "CONFLICT",
  "conflictingAssignmentCode": "ASN-1"
}
```

---

## 4. Hướng dẫn chạy và kiểm thử

1. **Khởi động Backend:**
   ```bash
   cd backend/SmartBusTicketing.Api
   dotnet run --urls http://localhost:5180
   ```

2. **Kiểm thử API:**
   - Mở file `SmartBusTicketing.Api.http` trong VS Code hoặc Rider.
   - Gửi yêu cầu `POST /api/auth/login` với `admin` / `Admin@12345` hoặc `manager` / `Admin@12345`.
   - Copy Token nhận được vào biến `@token`.
   - Chạy các request 2 đến 15 để kiểm thử toàn diện các luồng phân công, kiểm tra xung đột, lọc ca trực và phân quyền.
