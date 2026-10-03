# SCRUM-50: Phân công xe và nhân sự: Gán xe buýt, tài xế và phụ xe cho từng chuyến chạy (Backend)

User story: *"Là Quản lý điều hành, tôi muốn phân công xe buýt, tài xế và phụ xe cho từng chuyến chạy để đảm bảo phương tiện và nhân sự sẵn sàng vận hành đúng giờ, chống trùng lịch và theo dõi lịch trình làm việc."*

Sử dụng sẵn các bảng trong database: `trips`, `trip_staff`, `buses`, `seats`, `routes`, `accounts`, `audit_logs`.

---

## 1. Danh sách Endpoints API

### Phân công xe & nhân sự (`/api/assignments`)

| Method | URL | Vai trò | Mô tả |
|---|---|---|---|
| **GET** | `/api/assignments` | Admin, Manager, Driver, Conductor | Danh sách chuyến chạy kèm phân công (hỗ trợ lọc `routeId`, `date`, `status`, `state: All/FullyAssigned/PartiallyAssigned/Unassigned`, `search`, phân trang `page`, `pageSize`) |
| **GET** | `/api/assignments/{tripId}` | Admin, Manager, Driver, Conductor | Xem chi tiết phân công chuyến chạy theo ID |
| **PUT** | `/api/assignments/{tripId}` | Admin, Manager | **Gán xe buýt, tài xế và phụ xe cho chuyến chạy** (có kiểm tra xung đột lịch và ràng buộc nghiệp vụ) |
| **DELETE** | `/api/assignments/{tripId}` | Admin, Manager | Gỡ phân công xe, tài xế hoặc phụ xe khỏi chuyến chạy |
| **POST** | `/api/assignments/batch` | Admin, Manager | Phân công hàng loạt một tổ xe/tài xế/phụ xe cho nhiều chuyến |
| **POST** | `/api/assignments/check-conflict` | Admin, Manager | Kiểm tra trước xem có bị trùng lịch xe, tài xế hoặc phụ xe không |
| **GET** | `/api/assignments/available-buses` | Admin, Manager | Danh sách xe buýt và trạng thái khả dụng tại giờ xuất bến |
| **GET** | `/api/assignments/available-staff` | Admin, Manager | Danh sách tài xế / phụ xe khả dụng tại giờ xuất bến |
| **GET** | `/api/assignments/my-schedule` | Driver, Conductor | Tài xế / Phụ xe tra cứu ca trực và các chuyến được phân công của chính mình |

### Quản lý Chuyến chạy (`/api/trips`)

| Method | URL | Vai trò | Mô tả |
|---|---|---|---|
| **GET** | `/api/trips` | Mọi người (Public) | Tra cứu danh sách chuyến chạy |
| **GET** | `/api/trips/{id}` | Mọi người (Public) | Xem chi tiết chuyến chạy |
| **POST** | `/api/trips` | Admin, Manager | Tạo chuyến chạy mới (hỗ trợ gán ngay xe và nhân sự) |
| **PUT** | `/api/trips/{id}/status` | Admin, Manager, Driver | Cập nhật trạng thái chuyến (`Scheduled`, `Running`, `Delayed`, `Completed`, `Cancelled`) và số phút trễ |
| **DELETE** | `/api/trips/{id}` | Admin, Manager | Xóa chuyến chạy (chỉ xóa được nếu chưa có vé đặt) |

### Quản lý Đội xe buýt (`/api/buses`)

| Method | URL | Vai trò | Mô tả |
|---|---|---|---|
| **GET** | `/api/buses` | Admin, Manager | Danh sách xe buýt (tìm biển số, lọc trạng thái, phân trang) |
| **GET** | `/api/buses/{id}` | Admin, Manager | Xem chi tiết xe buýt và số chuyến đang hoạt động |
| **POST** | `/api/buses` | Admin, Manager | Thêm xe buýt mới (tự động tạo sơ đồ ghế ngồi theo sức chứa) |
| **PUT** | `/api/buses/{id}` | Admin, Manager | Cập nhật biển số, sức chứa, trạng thái hoạt động/bảo trì |
| **DELETE** | `/api/buses/{id}` | Admin, Manager | Xóa xe buýt (chặn xóa nếu xe đã từng có chuyến chạy) |

---

## 2. Quy tắc nghiệp vụ (Business Rules) & Ràng buộc nâng cao (Đã fix hoàn chỉnh theo Review & Test của Trưởng nhóm)

1. **Kiểm tra trạng thái xe buýt & cập nhật sức chứa (Fix Leader Comment #1):**
   - Chỉ xe buýt có trạng thái `Active` (Hoạt động) mới được phép phân công vào chuyến chạy.
   - Xe đang `Maintenance` (Bảo trì) hoặc `Inactive` (Ngừng hoạt động) sẽ bị từ chối với lỗi `409 Conflict`.
   - Khi chuyển xe sang Bảo trì, hệ thống kiểm tra và cảnh báo nếu xe đang được gán cho các chuyến sắp chạy.
   - Khi cập nhật sức chứa (`Capacity`) của xe buýt qua `UpdateBusAsync`, nếu xe đã có vé bán ra cho hành khách, hệ thống trả về `409 Conflict` (ProblemDetails) kèm thông báo rõ ràng, không âm thầm bỏ qua.

2. **Bảo mật dữ liệu cá nhân & phân quyền chặt chẽ (Fix Leader Comment #2 & Reviewer Issue #2):**
   - **Chuyến công khai (`/api/trips`):** Endpoint `[AllowAnonymous]` dành cho hành khách/khách vãng lai trả về `PublicTripDto`, chỉ chứa thông tin tuyến, thời gian, trạng thái và biển số xe buýt. Tuyệt đối không để lộ danh bạ, tài khoản (`Username`), họ tên hay số điện thoại (`Phone`) của nhân sự.
   - **Phân công nội bộ (`/api/assignments`):** Yêu cầu xác thực. Quản lý (`Admin`, `Manager`) xem được toàn bộ.
   - **Tài xế / Phụ xe (`Driver`, `Conductor`):** Tại `GetAssignments`, hệ thống tự động ép lọc `StaffAccountId = callerId` theo tài khoản đang đăng nhập; tại `GetById`, hệ thống chặn truy cập (`403 Forbidden`) nếu nhân sự không thuộc chuyến đó. Không ai xem được SĐT hay ca trực của nhân viên khác.

3. **Chống trùng lịch chính xác bằng khoảng giao nhau & giao dịch Serializable chống Race-condition (Fix Leader Comment #3 & Reviewer Issue #3):**
   - Hai chuyến chạy giao nhau khi và chỉ khi: `otherStart < thisEnd && thisStart < otherEnd`.
   - Mỗi chuyến sử dụng thời lượng thực tế của chính tuyến đó (`duration`) cộng thêm 15 phút đệm quay đầu/nghỉ (`thisEnd = thisStart + thisDuration + 15`). Khắc phục triệt để lỗi bỏ sót chuyến dài xuất bến trước đó.
   - Quá trình gán xe và nhân sự trong `AssignTripAsync` được bao bọc trong giao dịch cơ sở dữ liệu cấp cao nhất `IsolationLevel.Serializable`. Đảm bảo 2 quản lý cùng bấm gán 1 xe/tài xế cho 2 chuyến trùng giờ cùng lúc thì một bên sẽ bị chặn (Rollback và báo xung đột), không bị double-booking.

4. **Khởi tạo dữ liệu mẫu và bảo vệ tài khoản Admin (Fix Leader Comment #4):**
   - Trong `DbSeeder.cs`, bảo lưu toàn bộ nhánh kiểm tra an toàn từ nhánh `main`: ghi rõ `logger.LogError` khi tên đăng nhập Admin bị trùng với tài khoản thuộc vai trò khác, ghi log cảnh báo mật khẩu mặc định dev.

5. **Chuẩn hóa Line-ending Git (Fix Reviewer Issue #1):**
   - Đã cấu hình file `.gitattributes` với `* text=auto eol=lf`. Khi commit từ Git local, PR chỉ thay đổi đúng 9 file mã nguồn mới/chỉnh sửa, bảo toàn 100% lịch sử git blame của Sprint 1, không rewrite 26 file migrations và model cũ.

6. **Toàn vẹn trạng thái chuyến chạy & Ghi nhật ký hệ thống (Audit Logs):**
   - Không cho phép phân công lại hoặc gỡ phân công đối với chuyến chạy đã `Completed` hoặc `Cancelled`.
   - Không cho phép xóa chuyến chạy đã có hành khách đặt vé (`409 Conflict`).
   - Toàn bộ thao tác phân công, gỡ phân công, tạo chuyến, cập nhật xe đều tự động ghi vào `audit_logs`.

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
  "bookedTicketsCount": 0
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
  ]
}
```

---

## 4. Cấu trúc mã nguồn đã bổ sung

```text
SmartBusTicketing.Api/
├── DTOs/
│   └── TripAssignmentDtos.cs          # DTOs cho Assignment, Trip, Bus, Conflict Check, Driver Schedule
├── Services/
│   ├── ITripAssignmentService.cs       # Giao diện nghiệp vụ phân công xe & nhân sự
│   ├── TripAssignmentService.cs        # Xử lý logic gán xe, kiểm tra xung đột thời gian, lọc trạng thái
│   ├── IBusService.cs                  # Giao diện quản lý đội xe
│   └── BusService.cs                   # Xử lý xe buýt, sinh tự động ghế ngồi theo sức chứa
├── Controllers/
│   ├── TripAssignmentsController.cs    # Endpoint /api/assignments
│   ├── TripsController.cs              # Endpoint /api/trips
│   └── BusesController.cs              # Endpoint /api/buses
├── Data/
│   └── DbSeeder.cs                     # Khởi tạo tự động dữ liệu mẫu (buses, staff, routes, trips) ở môi trường Dev
└── SmartBusTicketing.Api.http          # 20 kịch bản test HTTP đầy đủ cho VS Code / IDE
```

---

## 5. Hướng dẫn chạy thử và kiểm tra

1. **Khởi động Backend:**
   ```bash
   cd backend/SmartBusTicketing.Api
   export ASPNETCORE_ENVIRONMENT=Development
   dotnet run --no-launch-profile --urls http://localhost:5180
   ```
   *(Hệ thống sẽ tự động seed tài khoản admin, tài xế, phụ xe, đội xe buýt và các chuyến chạy mẫu).*

2. **Kiểm tra API:**
   - Mở file `SmartBusTicketing.Api.http` trong VS Code / IDE hoặc dùng Postman.
   - Gọi `POST /api/auth/login` với tài khoản `admin` / `Admin@12345` hoặc `manager` / `Manager@12345` để lấy JWT Bearer token.
   - Thử nghiệm các kịch bản: tra cứu phân công, kiểm tra xung đột, gán xe buýt & tài xế, tra cứu ca trực cá nhân của tài xế.
