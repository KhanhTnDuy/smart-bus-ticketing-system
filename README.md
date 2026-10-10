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
