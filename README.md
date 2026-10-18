# 🚌 Smart Bus Ticketing System

Hệ thống số hóa bán vé xe buýt thông minh.

Môn học: Thực tập cơ sở 

## Công nghệ

**Frontend:** React + TypeScript, Vite, TailwindCSS, React Router

**Backend:** ASP.NET Core Web API (.NET 10), Entity Framework Core, Pomelo MySQL, JWT

**Cơ sở dữ liệu:** MySQL 8+

## Kiểm thử

Bộ kiểm thử hồi quy gọi API thật của backend và nằm ở `tests/regression/` (hơn 500 phép kiểm: luồng chính, thanh toán, hoàn tiền, giữ ghế, ma trận phân quyền 5 vai).
Chạy tất cả bằng một lệnh, kịch bản tự dựng backend với cấu hình cần thiết và dọn dữ liệu sau khi chạy:

```bash
CONFIRM_TEST_DB=1 npm test                 # chạy trên CSDL dev hiện tại (cần MySQL đang chạy)
CONFIRM_TEST_DB=1 npm run test:reset-demo  # nạp lại dữ liệu demo trước (xóa và tạo lại CSDL, chỉ dùng trên CSDL dev/thử)
```

Chi tiết từng kịch bản, biến môi trường và ma trận kiểm thử thanh toán xem `tests/regression/README.md`.

Quy ước báo lỗi, danh sách lỗi đã biết và kết quả chạy gần nhất: `docs/LOI-DA-BIET.md`.
