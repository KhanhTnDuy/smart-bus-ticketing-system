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

## Báo sự cố và quét vé QR

Cần chạy `dotnet ef database update` để áp migration `AddIncidentAndScanDetails` (thêm cột cho
`incidents`, `ticket_scans`, `notifications`).

**Sự cố** (`/api/incidents`):

- `POST` tài xế, phụ xe báo sự cố cho chuyến mình được phân công (Admin, Quản lý báo thay được). Hành khách báo được
  nếu đang có vé đặt trên chuyến; báo cáo của hành khách chỉ được ghi nhận, không đổi giờ chuyến và không gửi thông báo.
- Sự cố có số phút trễ làm chuyến chuyển sang `Delayed` và tạo `notifications` cho hành khách đã đặt vé trên chuyến.
- `GET` Admin, Quản lý xem tất cả; người khác chỉ thấy báo cáo của chính mình.
- `PATCH /{id}/resolve` (Admin, Quản lý) đóng sự cố kèm ghi chú; đóng lần hai trả 409.

**Quét vé** (`/api/ticket-scans`):

- `POST { qrCode, tripId }` cho tài xế, phụ xe của chuyến đó (Admin, Quản lý quét thay được). Kết quả: `Valid`, `Invalid`,
  `AlreadyUsed`, `WrongTrip`, `Expired`. Vé `Valid` chuyển sang `Used` bằng một câu UPDATE có điều kiện nên hai lần quét
  đồng thời chỉ một lần thành công. Mọi lần quét, kể cả bị từ chối, đều ghi vào `ticket_scans`.
- Vé còn `Held` (chưa thanh toán) bị từ chối. Hệ thống chưa có luồng thanh toán nên chưa vé nào sang `Valid`; khi thử phải
  tự đổi trạng thái vé trong cơ sở dữ liệu.
- `GET ?tripId=` lịch sử quét của chuyến.

## Thanh toán, hóa đơn, hoàn tiền

Cần `dotnet ef database update` để áp migration `AddRefundProcessing` (thêm cột xử lý cho `refunds`; `PaymentMethod`
có thêm `BankTransfer`, lưu dạng chuỗi nên không đổi cấu trúc bảng).

**Chưa nối cổng thanh toán thật.** Lệnh thanh toán luôn thành công và sinh mã giao dịch giả lập (`SIM-...`); phần còn lại chạy thật.

- `POST /api/payments { bookingId, method }` (Hành khách): lấy số tiền từ `Booking.FinalAmount` ở máy chủ. Lượt đặt chuyển
  `Pending` sang `Confirmed` bằng một câu UPDATE có điều kiện còn trong thời hạn giữ chỗ (10 phút), nên bấm hai lần hoặc trả
  sau khi hết hạn đều bị từ chối (409). Thanh toán xong, các vé `Held` sang `Valid` (quét QR được) và tạo hóa đơn `INV-yyyyMMdd-nnnnnn`.
- `GET /api/payments/my`, `GET /api/invoices/my`, `GET /api/refunds/my` cho hành khách; `GET /api/payments`, `/api/invoices`,
  `/api/refunds` cho Admin, Quản lý.
- **Hoàn tiền** tạo tự động ở trạng thái `Pending` khi (1) quản lý duyệt yêu cầu hủy một vé đã thanh toán, (2) chuyến bị hủy
  (`PUT /api/assignments/{id}/trip` với trạng thái Cancelled; các vé còn hiệu lực bị hủy, lượt đặt đóng, hành khách nhận thông báo).
  Giá mỗi vé là số tiền thanh toán chia đều cho các vé của lượt đặt, tổng hoàn không vượt số tiền đã trả.
- `PATCH /api/refunds/{id}/process { approve, note }` (Admin, Quản lý): duyệt thì `Success`, từ chối thì `Failed` và bắt buộc
  có `note`. Khi tổng hoàn thành công bằng số tiền đã trả, giao dịch chuyển `Refunded`. Xử lý lần hai trả 409.
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

## Thông báo

Cần `dotnet ef database update` để áp migration `AddNotificationTitleLink` (thêm `Title`, `Link` cho `notifications`).

- `GET /api/notifications/my?take=` trả `{ unreadCount, items }` của chính người đăng nhập; `PATCH /{id}/read` và
  `POST /read-all` chỉ đổi thông báo của chính mình (người khác trả 404).
- Thông báo được tạo trong cùng giao dịch với sự kiện (`Services/NotificationRules.cs`): thanh toán thành công, yêu cầu hủy/đổi
  vé được duyệt hoặc từ chối, hoàn tiền xong hoặc bị từ chối, chuyến bị hủy, sự cố trễ giờ (hành khách đã đặt vé trên chuyến),
  được phân công hoặc bị gỡ khỏi chuyến (tài xế, phụ xe), phản ánh đổi trạng thái. Quản lý và Admin nhận thông báo về sự cố mới,
  yêu cầu hủy/đổi vé mới, yêu cầu hoàn tiền mới và khiếu nại mới.
- Mỗi thông báo có `Link` tới trang liên quan; bấm vào chuông sẽ mở trang đó và đánh dấu đã đọc.
- Chưa có kênh đẩy: giao diện hỏi lại mỗi 30 giây và khi quay lại tab.
