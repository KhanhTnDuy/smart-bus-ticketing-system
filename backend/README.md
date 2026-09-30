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
├── Controllers/   Auth, Accounts, AuditLogs, RouteManagement, Feedback, Health
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
