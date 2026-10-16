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

## Triển khai ngoài máy dev (SCRUM-106)

Ngoài `Development`, backend **chỉ nhận cấu hình từ biến môi trường** (hoặc kho bí mật của nơi triển khai) và
dừng ngay lúc khởi động nếu thiếu thứ bắt buộc, thay vì chạy với giá trị mặc định của máy dev.

| Biến môi trường | Bắt buộc | Thiếu thì sao |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | có | Không đặt thì mặc định `Production` khi chạy `--no-launch-profile` |
| `ConnectionStrings__Default` | có | Dừng khởi động: "Thiếu chuỗi kết nối 'ConnectionStrings:Default'" |
| `Jwt__Key` (≥ 32 byte) | có | Dừng khởi động; khóa dev trong `appsettings.Development.json` không dùng được ở đây |
| `Jwt__Issuer`, `Jwt__Audience` | có | Token ký ở máy khác không kiểm được |
| `Cors__AllowedOrigins__0`, `__1`... | có | Dừng khởi động: trình duyệt ở tên miền thật sẽ bị CORS chặn nếu để danh sách localhost |
| `Seed__AdminPassword` | lần đầu | Chưa có Admin nào mà thiếu biến này thì ghi lỗi ra log và **không** tạo tài khoản |
| `Payments__*`, `BankTransfer__*`, `Refunds__*` | tùy cổng | Xem bảng ở mục "Biến cấu hình thanh toán" |
| `Email__*` | không | `Email__Enabled=false` thì hóa đơn vẫn tạo, chỉ chưa gửi |

Chạy thử:

```bash
cd backend/SmartBusTicketing.Api
ASPNETCORE_ENVIRONMENT=Production ASPNETCORE_URLS=http://0.0.0.0:5180 ConnectionStrings__Default="Server=...;Database=smart_bus_ticketing;User=...;Password=..." Jwt__Key="<khóa ngẫu nhiên ít nhất 32 byte>" Jwt__Issuer=SmartBusTicketing.Api Jwt__Audience=SmartBusTicketing.Client Cors__AllowedOrigins__0="https://<tên miền frontend>" Seed__AdminPassword="<mật khẩu quản trị>"   dotnet run --no-launch-profile
```

Kiểm thử tự động: `node tests/config/deploy-config.mjs` (cần MySQL đang chạy) kiểm tra máy chủ khởi động được
chỉ bằng biến môi trường và dừng đúng khi thiếu `Jwt:Key`, khóa quá ngắn, hoặc thiếu `Cors:AllowedOrigins`.

### Khóa thật không nằm trong git

`appsettings.json` chỉ chứa giá trị rỗng kèm ghi chú; `appsettings.Development.json` chứa khóa JWT **chỉ dùng cho máy dev**.
Mật khẩu `Admin@12345` trong `Data/DbSeeder.cs` chỉ được dùng khi chạy `Development` và chưa cấu hình `Seed:AdminPassword`;
ở môi trường khác, thiếu `Seed__AdminPassword` thì không tạo tài khoản nào. `.env` nằm trong `.gitignore`
(frontend chỉ commit `.env.example`).

### Sao lưu và phục hồi CSDL

```bash
cd backend/database
MYSQL_BIN_DIR="/c/Program Files/MySQL/MySQL Server 8.4/bin" ./backup.sh            # ra backups/smart_bus_ticketing_<ngày>_<giờ>.sql
CONFIRM_RESTORE=1 ./restore.sh backups/smart_bus_ticketing_20261017_013059.sql     # GHI ĐÈ CSDL trong file
```

`backup.sh` dùng `mysqldump --single-transaction --routines --events --triggers --databases` nên bản sao nhất quán,
không khóa bảng, và kèm luôn lệnh tạo CSDL. `restore.sh` bắt buộc `CONFIRM_RESTORE=1` vì ghi đè toàn bộ CSDL đích.
Biến môi trường dùng chung: `MYSQL_BIN_DIR`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DB`.

Đã chạy thử ngày 17/10: sao lưu CSDL dev (29 bảng), phục hồi sang CSDL `sbt_restore_check` và đối chiếu số bảng cùng
số dòng `accounts`, `tickets`, `trips` — khớp hoàn toàn.

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

## Thống kê tỷ lệ lấp đầy

`GET /api/reports/occupancy?startDate=&endDate=&routeId=&status=` (Admin, Quản lý). Mỗi chuyến chưa hủy có số ghế đã chiếm trên sức chứa của xe,
phần trăm và nhóm tải: `OVERLOAD` (từ 85%), `OPTIMAL` (60-84%), `LOW` (dưới 60%), `NO_TICKETS` (chưa có vé), `NO_BUS` (chưa gán xe) kèm đề xuất.
Ghế đã chiếm gồm vé `Valid`, `Used` và vé `Held` của lượt đặt còn trong thời hạn giữ chỗ, cùng quy tắc với sơ đồ ghế. Trung bình chỉ tính các chuyến đã có xe.
## Hồ sơ ưu đãi giá vé và tải giấy tờ

Cần `dotnet ef database update` để áp migration `AddDiscountApplicationReview` (thêm `SubmittedAt`, `ReviewedAt`, `RejectReason`
cho `passenger_verifications`).

- `POST /api/uploads` (đăng nhập): nhận ảnh JPG, PNG hoặc PDF tối đa 5 MB, loại tệp xác định bằng chữ ký đầu tệp chứ không tin phần mở
  rộng hay Content-Type của client. Tệp lưu ở `App_Data/uploads` (không công khai, đã có trong `.gitignore`) với tên do máy chủ sinh,
  chỉ đọc được qua `GET /api/uploads/{tên}` bởi chính chủ hoặc Admin, Quản lý.
- `POST /api/discount-applications` (Hành khách): nộp hồ sơ kèm đường dẫn giấy tờ của chính mình; mỗi lúc chỉ một hồ sơ chờ duyệt, không nộp lại
  khi đang có ưu đãi cùng loại còn hạn. `GET /my` xem hồ sơ của mình.
- `GET /api/discount-applications` và `POST /{id}/review` chỉ cho Admin, Quản lý. Từ chối bắt buộc có lý do, ngày hết hạn không được ở quá
  khứ, xử lý lần hai trả 409. Hành khách và Quản lý đều nhận thông báo.
- Hồ sơ đã duyệt và còn hạn là điều kiện để `BookingsController` tính giá ưu đãi khi đặt vé.

## Thanh toán VNPay

Thanh toán vé đi qua cổng VNPay (sandbox hoặc thật): `POST /api/payments` với `method = 1` tạo giao dịch `Pending` và trả
`paymentUrl`; trình duyệt chuyển sang trang của ngân hàng; kết quả được chốt ở `PaymentSettlementService` qua
`GET /api/payments/vnpay/ipn` (VNPay gọi máy chủ, nguồn xác nhận chính thức) hoặc `GET /api/payments/vnpay/return`
(frontend gọi sau khi khách quay về, chạy được cả ở máy dev). Cả hai cùng đường, an toàn khi gọi lặp hoặc đồng thời.

**Cấu hình** (không đặt khóa thật vào file trong git):

```bash
# đăng ký merchant sandbox tại https://sandbox.vnpayment.vn/devreg/ để nhận TmnCode và HashSecret
cd SmartBusTicketing.Api
dotnet user-secrets set "Payments:VnPay:TmnCode" "<TmnCode>"
dotnet user-secrets set "Payments:VnPay:HashSecret" "<HashSecret>"
dotnet user-secrets set "Payments:VnPay:TxnRefPrefix" "<tiền tố riêng của máy bạn>"   # tránh trùng mã khi dùng chung TmnCode
```

`Payments:VnPay:ReturnUrl` mặc định là `http://localhost:5173/passenger/payment-result`. Để VNPay gọi được IPN cần địa chỉ công khai
(vd. ngrok) khai ở trang quản trị merchant: `https://<địa chỉ>/api/payments/vnpay/ipn`.

Chưa cấu hình `TmnCode`/`HashSecret` thì thanh toán VNPay trả 503. MoMo, ZaloPay chưa nối cổng thật: chỉ chạy bằng
bộ giả lập khi `Payments:Simulator:Enabled=true` **và** đang chạy ở môi trường `Development` (xem mục dưới).

Thanh toán về sau khi hết hạn giữ chỗ, hoặc hai giao dịch cùng thanh toán thành công cho một lượt đặt, không xuất thêm vé: hệ thống tự mở
yêu cầu hoàn tiền `PaymentFailed` cho khoản dư. `HoldExpiryService` chạy nền mỗi 60 giây để chuyển lượt đặt quá hạn sang `Expired` và nhả ghế.

## Biến cấu hình thanh toán (SCRUM-88)

Không đặt khóa thật vào file nằm trong git. Mọi giá trị dưới đây đặt qua **biến môi trường** (thay `:` bằng `__`) hoặc
`dotnet user-secrets` trên máy dev.

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `Payments__Simulator__Enabled` | `false` (`true` ở `appsettings.Development.json`) | Bộ giả lập cho phương thức chưa nối cổng thật. Chỉ có tác dụng ở `Development` |
| `Payments__VnPay__TmnCode` | rỗng | Mã merchant VNPay. Thiếu thì `POST /api/payments` với VNPay trả 503 |
| `Payments__VnPay__HashSecret` | rỗng | Khóa ký chữ ký VNPay |
| `Payments__VnPay__PayUrl` | sandbox `vpcpay.html` | Trang thanh toán của VNPay |
| `Payments__VnPay__ReturnUrl` | `http://localhost:5173/passenger/payment-result` | Trang frontend khách quay về |
| `Payments__VnPay__TxnRefPrefix` | `SB` | Tiền tố mã giao dịch, đặt khác nhau giữa các máy dev dùng chung `TmnCode` |
| `Payments__VnPay__RefundUrl` | sandbox `merchant_webapi` | Địa chỉ API hoàn tiền |
| `Payments__VnPay__RefundDateSource` | `Create` | Mốc ngày gửi khi hoàn tiền |
| `BankTransfer__BankId` | rỗng | Mã VietQR (MB, VCB, ACB...) hoặc mã BIN |
| `BankTransfer__BankName` | rỗng | Tên ngân hàng hiển thị cho khách |
| `BankTransfer__AccountNumber` | rỗng | Số tài khoản nhận tiền |
| `BankTransfer__AccountName` | rỗng | Tên chủ tài khoản, in hoa không dấu |
| `BankTransfer__MemoPrefix` | `SBV` | Tiền tố nội dung chuyển khoản |
| `BankTransfer__QrTemplate` | `compact2` | Kiểu ảnh VietQR |
| `BankTransfer__WebhookApiKey` | rỗng | Khóa webhook báo có tiền (SePay). Trống thì chỉ xác nhận bằng tay |
| `Refunds__AutoProcess` | `true` | Tự gọi API hoàn tiền VNPay; tắt thì quản lý duyệt tay |
| `Refunds__Tiers__0__HoursBefore` / `__Percent` | rỗng | Bảng phí hoàn vé theo giờ trước giờ chạy |

Thiếu `BankTransfer__AccountNumber`/`AccountName`/`BankId` thì chuyển khoản trả 503; thiếu cấu hình VNPay thì VNPay trả 503.
Hai phương thức này không rơi về bộ giả lập.

### Bộ giả lập chỉ chạy ở Development

`PaymentSimulator` (`Services/Payments/PaymentSimulator.cs`) chốt giao dịch **mà không thu tiền**, nên chỉ bật khi
`Payments:Simulator:Enabled=true` **và** `ASPNETCORE_ENVIRONMENT=Development`. Ngoài `Development`:

- bật trong cấu hình → **máy chủ từ chối khởi động** kèm thông báo chỉ rõ biến phải bỏ, thay vì âm thầm xác nhận vé chưa trả tiền;
- không bật → `POST /api/payments` với MoMo/ZaloPay trả 400 "Phương thức này chưa được hỗ trợ".

Kiểm chứng:

```bash
cd backend/SmartBusTicketing.Api
ASPNETCORE_ENVIRONMENT=Production Payments__Simulator__Enabled=true Jwt__Key="<khóa ít nhất 32 byte>"   dotnet run --no-launch-profile
# Unhandled exception. System.InvalidOperationException: Payments:Simulator:Enabled đang bật ngoài môi trường Development...
```

## Giữ ghế khi thanh toán

Ghế được giữ **từ lúc khách bấm "Tiếp tục thanh toán"** (bước chọn ghế → thanh toán): `POST /api/bookings` tạo lượt đặt `Pending` với
`HoldExpiresAt` = 10 phút sau, vé ở trạng thái `Held`. Trang thanh toán đếm ngược 10 phút. Ghế được nhả khi:

- khách bấm **Hủy thanh toán, đổi ghế**: `POST /api/bookings/{id}/cancel` đặt lượt đặt và vé sang `Cancelled` ngay (gọi lặp lại an toàn; lượt đặt đã
  thanh toán trả 409). Cố ý không đánh `Failed` các giao dịch đang chờ: nếu khách vẫn trả tiền ở trang ngân hàng sau khi hủy, hệ thống tự mở
  yêu cầu hoàn tiền thay vì bỏ qua khoản đó;
- hoặc **hết 10 phút** chưa thanh toán: `HoldExpiryService` chuyển lượt đặt sang `Expired` và vé sang `Expired` (chạy mỗi 60 giây; các truy vấn
  ghế trống đã coi ghế quá hạn là trống ngay từ lúc hết hạn).

## Email hóa đơn điện tử

Sau mỗi thanh toán thành công, `PaymentSettlementService` tạo `Invoice` rồi báo `InvoiceEmailService` (dịch vụ nền) gửi email. Gửi trong nền nên
lỗi SMTP không làm hỏng hay làm chậm việc chốt giao dịch. Mỗi hóa đơn thử tối đa 5 lần (vòng quét 60 giây, hoặc ngay khi có hóa đơn mới); lần thử
được "nhận" bằng UPDATE có điều kiện nên không gửi trùng. Sau 5 lần thì ngừng tự thử và báo `Failed`, khách bấm **Gửi lại email** để thử lại.

Trạng thái trả về ở `emailStatus` của `/api/invoices`: `Sent`, `Pending`, `Failed`, `NoAddress` (tài khoản chưa có email). `POST /api/invoices/{id}/send`
gửi lại; với hóa đơn chưa có địa chỉ thì nhận `{ "email": "..." }`, còn đã có địa chỉ thì luôn gửi tới địa chỉ đã lưu (không thể dùng để gửi thư tới người khác).

**Cấu hình** (không đặt mật khẩu thật vào file trong git):

```bash
cd SmartBusTicketing.Api
dotnet user-secrets set "Email:Enabled" "true"
dotnet user-secrets set "Email:Host" "smtp.gmail.com"
dotnet user-secrets set "Email:Port" "587"
dotnet user-secrets set "Email:User" "<tài khoản gửi>"
dotnet user-secrets set "Email:Password" "<mật khẩu ứng dụng Gmail>"   # bật xác minh 2 bước rồi tạo App password
dotnet user-secrets set "Email:FromAddress" "<tài khoản gửi>"
```

Chưa bật `Email:Enabled` thì hóa đơn vẫn được tạo nhưng chưa gửi (nằm chờ, không tính là thất bại) cho tới khi bật. Email không chứa mã QR hay mã vé,
chỉ có liên kết tới mục Vé điện tử của tài khoản.

## Hoàn tiền tự động (VNPay)

Khoản hoàn (`Refund`, `Pending`) được tạo khi: quản lý duyệt hủy vé, chuyến bị hủy, hoặc tiền về sau khi hết hạn giữ chỗ / thanh toán trùng.
Với giao dịch **VNPay**, `RefundProcessingService` (nền, quét 10 giây) tự gọi API hoàn tiền của VNPay qua `RefundExecutor`, không cần quản lý duyệt từng khoản.
Giao dịch giả lập (MoMo/ZaloPay trong dev) vẫn do quản lý duyệt tay như trước.

- **Mã yêu cầu cố định** `RF{id}` cho mỗi khoản hoàn để VNPay chặn yêu cầu trùng. Hoàn toàn bộ gửi loại `02`, hoàn một phần loại `03`.
- **Lỗi tạm thời** (mạng, HTTP 5xx, mã 99): thử lại tối đa 5 lần, lần thứ n chờ n × 30 giây, ghi lý do vào `Note`.
- **Cổng từ chối** (không tìm thấy giao dịch, số tiền sai, yêu cầu trùng 94...) hoặc **phản hồi sai chữ ký**: *không* coi là thành công và không thử lại, chuyển
  "Cần xử lý tay" (`needsManual`), báo quản lý. Cố ý không đoán, vì không biết tiền đã về khách hay chưa.
- **Quản lý xử lý tay** ở `/manager/refunds`: *Hoàn qua VNPay* gọi lại cổng (bỏ giới hạn số lần tự thử), hoặc *Đã hoàn bằng đường khác* (bắt buộc ghi mã đối soát, hệ thống không gọi cổng).
- Hoàn đủ tiền giao dịch thì giao dịch chuyển `Refunded`; hoàn một phần thì giữ `Success`.

**Cấu hình** (mục `Refunds` và `Payments:VnPay`):

```json
"Refunds": {
  "AutoProcess": true,
  "Tiers": [ { "HoursBefore": 24, "Percent": 100 }, { "HoursBefore": 2, "Percent": 50 } ]
}
```

`Tiers` là chính sách hoàn theo giờ trước giờ chạy, **chỉ áp cho khách tự hủy vé** (hủy chuyến và thanh toán lỗi luôn hoàn 100%). Để trống thì hoàn 100%.
Ví dụ trên: còn từ 24 giờ hoàn 100%, từ 2 giờ hoàn 50%, dưới 2 giờ không hoàn. `AutoProcess=false` tắt tự hoàn (quản lý duyệt tay).

**Cần kiểm chứng với VNPay sandbox thật:** phần gọi API hoàn tiền (chuỗi ký nối bằng `|`, định dạng phản hồi) viết theo tài liệu VNPay 2.1.0 nhưng mới chỉ thử với máy chủ giả trong
bộ hồi quy, chưa gọi sandbox thật. Nếu sandbox báo không tìm thấy giao dịch gốc, đổi `Payments:VnPay:RefundDateSource` giữa `Create` (mặc định, vnp_CreateDate lúc tạo thanh toán) và `Pay` (vnp_PayDate).
Khoản chưa tự hoàn được sẽ rơi vào "Cần xử lý tay" chứ không mất tiền. VNPay chỉ cho hoàn trong thời hạn quy định của họ.

## Chuyển khoản ngân hàng (VietQR)

Phương thức "Chuyển khoản ngân hàng" nhận tiền thẳng vào **tài khoản ngân hàng của đơn vị**, không cần cổng thanh toán. `POST /api/payments` với `method = 4` tạo giao dịch `Pending`
và trả `transfer`: mã VietQR (ảnh từ `img.vietqr.io`, quét bằng app ngân hàng sẽ điền sẵn tài khoản, số tiền, nội dung), thông tin tài khoản và **nội dung chuyển khoản duy nhất**
(vd. `SBV7K3M9Q2X`, chính là `Payment.TxnRef`). Ghế được giữ 10 phút như các phương thức khác. Tiền vào tài khoản thì giao dịch được chốt qua đúng `PaymentSettlementService`
(vé có hiệu lực, hóa đơn, email); tiền về sau khi hết hạn giữ chỗ thì không xuất vé và tự mở khoản hoàn (hoàn tay: quản lý chuyển khoản trả lại rồi bấm "Xác nhận đã hoàn" ở trang Hoàn tiền).

**Cấu hình tài khoản nhận** (KHÔNG đặt vào file trong git; dùng user-secrets, `UserSecretsId` đã có trong csproj):

```bash
cd SmartBusTicketing.Api
dotnet user-secrets set "BankTransfer:BankId" "970415"            # mã BIN hoặc mã VietQR của ngân hàng (970415 = VietinBank, MB, VCB, ACB...)
dotnet user-secrets set "BankTransfer:BankName" "VietinBank"
dotnet user-secrets set "BankTransfer:AccountNumber" "<số tài khoản>"
dotnet user-secrets set "BankTransfer:AccountName" "<TÊN CHỦ TÀI KHOẢN KHÔNG DẤU>"
```

Chạy backend ở môi trường `Development` để đọc user-secrets. Chưa cấu hình thì chọn chuyển khoản trả 503.

**Xác nhận đã nhận tiền** (hai cách, dùng được song song):

1. **Tay**: quản lý mở `/manager/bank-transfers`, đối chiếu sao kê rồi bấm "Đã nhận tiền" (`POST /api/payments/{id}/confirm-transfer`, nên ghi mã giao dịch trên sao kê để chống xác nhận trùng một khoản tiền).
2. **Tự động qua webhook** (định dạng SePay, `https://sepay.vn`): liên kết tài khoản ở SePay, tạo webhook tới `POST /api/payments/bank-transfer/webhook` kiểu xác thực **API Key**
   (`Authorization: Apikey <khóa>`), cấu hình tiền tố mã thanh toán là `SBV`, rồi `dotnet user-secrets set "BankTransfer:WebhookApiKey" "<khóa>"`. Máy chạy local cần địa chỉ công khai (vd. ngrok).
   Hệ thống tìm mã `SBV…` trong nội dung (chịu được ngân hàng chèn dấu cách), kiểm tra số tiền khớp và mã giao dịch chưa dùng rồi tự xác nhận; lệch số tiền thì báo quản lý đối soát.
   Chưa đặt `WebhookApiKey` thì webhook bị tắt (404).

**Cần kiểm chứng với dịch vụ thật:** định dạng webhook SePay viết theo tài liệu, mới thử với yêu cầu giả trong bộ hồi quy. Ảnh VietQR do `img.vietqr.io` tạo, số tài khoản nằm trong địa chỉ ảnh (là thông tin nhận tiền công khai).
Giao dịch chuyển khoản chờ được giữ lâu hơn (2 ngày) trước khi đánh hết hạn, và quản lý vẫn xác nhận được sau đó vì tiền thật có thể về chậm.

## Bảng giá vé niêm yết theo km hành trình

Giá vé lượt tính theo **số km của chặng khách đi** (từ trạm lên đến trạm xuống), tra **bảng giá niêm yết theo bậc km** (`distance_fares`). Học sinh/sinh viên, người cao tuổi...
được giảm theo `passenger_types.DiscountPercent`, làm tròn đến đồng.

- **Km của chặng** = `route_stops.DistanceFromStartKm` của trạm xuống trừ trạm lên. Km từng trạm do hệ thống **tự tính** từ tọa độ trạm và độ dài tuyến
  (`routes.DistanceKm`): khoảng cách đường chim bay giữa các trạm liên tiếp, co giãn để tổng bằng đúng độ dài tuyến. Tự tính lại khi lưu danh sách trạm hoặc sửa độ dài tuyến,
  và điền cho dữ liệu cũ khi khởi động.
- **Bậc giá** là `(FromKm, ToKm]`: hành trình trên `FromKm` và không quá `ToKm` thì giá là `Price`; `ToKm` rỗng là bậc cuối. Đúng bằng mốc trên thì thuộc bậc đó
  (đúng 8 km thuộc bậc 3 đến 8 km). Các bậc không được chồng lấn (409).
- **Có bảng giá km thì đó là giá chính thức** cho tìm chuyến (`price`, `prices`, `distanceKm`) và đặt vé (`finalAmount`). Chưa lập bảng giá, hoặc chặng chưa có km /
  không rơi vào bậc nào, thì quay về cách cũ (giá cố định theo tuyến trong `fares`, rồi giá dự phòng 7.000 đ).
- `GET /api/distance-fares` và `GET /api/distance-fares/routes/{id}` (giá mọi chặng của tuyến) là công khai; thêm, sửa, xóa bậc (`POST/PUT/DELETE`) chỉ Admin và Quản lý, có ghi nhật ký.
- Giao diện: `/fares` (bảng giá niêm yết cho mọi người dùng đã đăng nhập, mục "Bảng giá vé" ở menu hành khách) và `/manager/distance-fares` (quản lý bậc giá).

Lập bảng giá mẫu 6 bậc (5.000 đ đến 3 km, 7.000 đ đến 8 km, 9.000 đ đến 12 km, 11.000 đ đến 16 km, 13.000 đ đến 20 km, 16.000 đ trên 20 km) bằng:

```bash
mysql -uroot --default-character-set=utf8mb4 smart_bus_ticketing < backend/database/seed_bang_gia_km.sql   # chỉ chèn khi bảng còn trống
```

Số liệu mẫu chỉ để demo, hãy chỉnh theo bảng giá thật của đơn vị ở `/manager/distance-fares`.
