# Backend — Smart Bus Ticketing System

ASP.NET Core Web API (.NET 10) + Entity Framework Core + Pomelo MySQL.

## Chạy ở máy dev

Cần MySQL 8 trở lên đang chạy ở `localhost:3306`.

```bash
cd SmartBusTicketing.Api
dotnet ef database update          # dựng schema, cần dotnet-ef
export ASPNETCORE_ENVIRONMENT=Development
dotnet run --no-launch-profile --urls http://localhost:5180
```

**Bắt buộc đặt `ASPNETCORE_ENVIRONMENT=Development`.** Khóa ký JWT nằm trong
`appsettings.Development.json`; chạy ở môi trường khác mà không cấp `Jwt__Key`
thì ứng dụng dừng ngay lúc khởi động.

Kiểm tra nhanh: `GET http://localhost:5180/api/health` trả về trạng thái kết nối
cơ sở dữ liệu.

## Dựng cơ sở dữ liệu

Dùng **EF migrations**, không dùng `database/schema.sql`. File SQL đó giữ lại để
tham khảo thiết kế bảng, tên cột theo snake_case nên không khớp model EF.

```bash
dotnet ef migrations add <TenMigration> --output-dir Data/Migrations
dotnet ef database update
```

Cấu hình kết nối ở `appsettings.json`, mục `ConnectionStrings:Default`.

## Cấu trúc

```text
SmartBusTicketing.Api/
├── Controllers/   Auth, Accounts, AuditLogs, RouteManagement, Feedback, Health, RevenueReports
├── DTOs/          Kiểu vào ra của API
├── Models/        Entity EF và các enum dùng chung
├── Data/          AppDbContext và Migrations/
├── Services/      PasswordService, AuditLogService, JWT
database/          schema.sql và ERD.md, chỉ để tham khảo
```

## Quy ước cần biết

**Enum đi qua JSON dưới dạng số.** `Program.cs` chưa đăng ký
`JsonStringEnumConverter`, nên `AccountRole`, `AuditActionType`,
`FeedbackStatus`... được serialize thành số theo đúng thứ tự khai báo trong
`Models/Enums.cs`. Frontend đang dựa vào điều này; nếu thêm converter thì phải
sửa cả các file trong `frontend/src/api/`.

**Thời gian lưu theo UTC.** EF đọc cột datetime của MySQL ra với
`DateTimeKind.Unspecified` nên chuỗi JSON không có hậu tố `Z`. Frontend tự gắn
lại khi đọc, xem `frontend/src/api/datetime.ts`.

**Không trả thẳng entity của EF.** Dùng DTO hoặc `Select(...)` để chiếu. Trả
entity kèm `Include` đã từng làm lộ cột `PasswordHash` ra ngoài, và entity đang
được theo dõi có navigation hai chiều nên gây vòng lặp khi serialize.

**Mọi thao tác thay đổi dữ liệu đều ghi nhật ký** qua `AuditLogService`, phục vụ
trang Audit Logs của US2.

## Chưa làm

- Chưa seed tài khoản Admin. Cơ sở dữ liệu mới dựng chưa có người dùng nào, mà
  `POST /api/accounts` lại yêu cầu vai trò Admin, nên phải chèn tài khoản đầu
  tiên thẳng vào bảng `accounts` với hash theo đúng định dạng của
  `Services/PasswordService.cs`.
- `RouteManagementControllers` chưa gọi `AuditLogService`, nên thao tác thêm,
  sửa, xóa tuyến, trạm và giá vé không để lại vết trong nhật ký hệ thống.

## Quản lý chuyến xe

Chuyến xe (bảng `trips`) được quản lý qua `/api/assignments`:

- `GET /api/assignments` danh sách chuyến kèm xe, tài xế, phụ xe (Admin, Quản lý xem hết; tài xế, phụ xe chỉ thấy chuyến của mình).
- `POST /api/assignments` tạo chuyến và gán người, `PUT /api/assignments/{id}` đổi xe, tài xế, phụ xe.
- `PUT /api/assignments/{id}/trip` sửa giờ xuất bến, trạng thái, số phút trễ. Chuyến đã hoàn thành không sửa được;
  chuyến đã có vé đặt không đổi giờ được; giờ mới không được làm trùng lịch với xe hoặc nhân sự đã gán.
- `DELETE /api/assignments/{id}/trip` xóa chuyến chưa có vé đặt và chưa có sự cố. Chuyến đã có vé thì chuyển sang Đã hủy.
- `GET /api/assignments/my-schedule` lịch trực của tài xế, phụ xe đang đăng nhập.

Tên tài xế, phụ xe, biển số gửi lên mà không tồn tại thì trả 404, không còn bị bỏ qua.

`GET /api/feedback/my` trả phản ánh, đánh giá do chính người đăng nhập gửi (trang Khiếu nại của hành khách).
## Báo cáo doanh thu (SCRUM-82, SCRUM-86)

`GET /api/reports/revenue` (Admin, Quản lý) với các tham số tùy chọn `startDate`,
`endDate` (yyyy-MM-dd), `routeId` (số, bỏ trống hoặc `ALL` là mọi tuyến) và
`groupBy` (`DAILY` mặc định, hoặc `MONTHLY`). Trả về `summary`, `timeSeries`,
`byRoute`, `byPaymentMethod` đúng với `frontend/src/api/revenueReport.ts`.

Cách tính nằm trong `Services/RevenueReportCalculator.cs`:

- Chỉ tính lượt đặt đã thanh toán (`Confirmed`, hoặc `Cancelled` nhưng từng có
  giao dịch thành công). Vé `Held` chưa trả tiền không được tính.
- Vé bán là vé `Valid` hoặc `Used`; vé `Cancelled` tính vào hoàn tiền nên bị loại
  khỏi doanh thu thuần; vé `Exchanged` bị bỏ vì đã có vé mới thay.
- Tiền mỗi vé là `Booking.FinalAmount` chia đều cho các vé còn hiệu lực của lượt
  đặt, nên tổng luôn khớp với số tiền của lượt đặt.
- Kỳ báo cáo theo ngày khởi hành của chuyến, giờ Việt Nam (UTC+7).

Hiện hệ thống chưa có luồng thanh toán nên chưa có booking nào sang `Confirmed`;
báo cáo sẽ trả về 0 cho đến khi luồng này được làm.
