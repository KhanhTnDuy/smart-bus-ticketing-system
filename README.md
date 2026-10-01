# 🚌 Smart Bus Ticketing System

Hệ thống số hóa bán vé xe buýt thông minh.

Môn học: Thực tập cơ sở 

## Công nghệ

**Frontend:** React + TypeScript, Vite, TailwindCSS, React Router

**Backend:** ASP.NET Core Web API (.NET 10), Entity Framework Core, Pomelo MySQL, JWT

**Cơ sở dữ liệu:** MySQL 8+

## Cấu trúc repo

```
backend/    API ASP.NET Core (xem backend/README.md)
frontend/   Ứng dụng React (xem frontend/README.md)
database/   schema.sql và ERD.md, chỉ để tham khảo
```

## Chức năng

| Nhóm | Chức năng | Vai trò |
|---|---|---|
| Xác thực | Đăng nhập JWT, phân quyền theo vai trò | Tất cả |
| Tài khoản | Quản lý tài khoản, ma trận quyền | Admin |
| Nhật ký | Audit Logs | Admin |
| Tuyến xe | Quản lý tuyến, trạm, giá vé | Manager / Admin |
| Phản ánh | Gửi phản ánh; tiếp nhận và xử lý | Hành khách / Manager |
| Đánh giá | Đánh giá chuyến đi | Hành khách |

## Chạy nhanh

**Bước 1 - Backend** (cần MySQL ở localhost:3306):

```
cd backend/SmartBusTicketing.Api
dotnet ef database update
export ASPNETCORE_ENVIRONMENT=Development
dotnet run --no-launch-profile --urls http://localhost:5180
```

**Bước 2 - Frontend:**

```
cd frontend
npm install
npm run dev -- --port 5173
```

**Bước 3:** Mở http://localhost:5173

## Lưu ý

Chưa seed tài khoản Admin: phải chèn tài khoản đầu tiên vào bảng accounts (xem backend/README.md).

Một số trang frontend vẫn dùng dữ liệu giả từ DataContext (xem frontend/README.md).
