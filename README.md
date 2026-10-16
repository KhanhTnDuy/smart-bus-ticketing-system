# 🚌 Smart Bus Ticketing System

Hệ thống số hóa bán vé xe buýt thông minh.

Môn học: Thực tập cơ sở 

## Công nghệ

**Frontend:** React + TypeScript, Vite, TailwindCSS, React Router

**Backend:** ASP.NET Core Web API (.NET 10), Entity Framework Core, Pomelo MySQL, JWT

**Cơ sở dữ liệu:** MySQL 8+

## Kiểm thử

Kiểm thử hồi quy luồng chính (khoảng 180 phép kiểm, 5 vai trò) nằm ở `tests/regression/`. Chạy trên CSDL dev khi backend đang chạy:

```bash
CONFIRM_TEST_DB=1 node tests/regression/regress.mjs
```

Điều kiện chạy, biến môi trường và dữ liệu seed cần có xem `tests/regression/README.md`.

Kiểm thử cấu hình (`tests/config/`) không cần CSDL, tự khởi động backend để kiểm tra các chốt an toàn khi triển khai:

```bash
node tests/config/payment-simulator-guard.mjs   # SCRUM-88: giả lập thanh toán không bật được ngoài Development
node tests/config/deploy-config.mjs            # SCRUM-106: cấu hình triển khai (cần MySQL đang chạy)
```
