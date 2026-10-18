# 🚌 Smart Bus Ticketing System

Hệ thống số hóa bán vé xe buýt thông minh.

Môn học: Thực tập cơ sở 

## Công nghệ

**Frontend:** React + TypeScript, Vite, TailwindCSS, React Router

**Backend:** ASP.NET Core Web API (.NET 10), Entity Framework Core, Pomelo MySQL, JWT

**Cơ sở dữ liệu:** MySQL 8+

## Dữ liệu Demo (Nạp lại dữ liệu demo)

Dữ liệu demo được cấu hình tự động dời ngày theo ngày hiện tại để **luôn có ít nhất 4 chuyến trong tương lai** và **7 tài khoản demo** sẵn sàng:

- `admin`, `manager`, `driver1`, `driver2`, `conductor1`, `conductor2`, `passenger1` (Mật khẩu chung: `Admin@12345`).

Nạp lại dữ liệu demo:

```bash
# Bằng Node.js (từ thư mục gốc)
npm run reload-demo
# hoặc nếu MySQL có mật khẩu:
node scripts/reload-demo.mjs -p <mat_khau_mysql>

# Hoặc PowerShell (Windows):
.\backend\database\demo\reload-demo.ps1

# Hoặc Bash (Linux/macOS):
./backend/database/demo/reload-demo.sh
```

Chi tiết xem tại [`backend/database/demo/README.md`](backend/database/demo/README.md).

## Branch Protection (GitHub Actions)

Hướng dẫn cấu hình Branch Protection Rule cho nhánh `main` để bắt buộc các check CI phải vượt qua trước khi merge xem tại [`docs/branch-protection-setup.md`](docs/branch-protection-setup.md).

## Kiểm thử

Bộ kiểm thử hồi quy gọi API thật của backend và nằm ở `tests/regression/` (hơn 500 phép kiểm: luồng chính, thanh toán, hoàn tiền, giữ ghế, ma trận phân quyền 5 vai).
Chạy tất cả bằng một lệnh, kịch bản tự dựng backend với cấu hình cần thiết và dọn dữ liệu sau khi chạy:

```bash
CONFIRM_TEST_DB=1 npm test                 # chạy trên CSDL dev hiện tại (cần MySQL đang chạy)
CONFIRM_TEST_DB=1 npm run test:reset-demo  # nạp lại dữ liệu demo trước (xóa và tạo lại CSDL, chỉ dùng trên CSDL dev/thử)
```

Kiểm thử cấu hình (`tests/config/`) không cần CSDL, tự khởi động backend để kiểm tra các chốt an toàn khi triển khai:

```bash
node tests/config/payment-simulator-guard.mjs   # SCRUM-88: giả lập thanh toán không bật được ngoài Development
node tests/config/deploy-config.mjs            # SCRUM-106: cấu hình triển khai (cần MySQL đang chạy)
```

Chi tiết từng kịch bản, biến môi trường và ma trận kiểm thử thanh toán xem `tests/regression/README.md`.

Quy ước báo lỗi, danh sách lỗi đã biết và kết quả chạy gần nhất: `docs/LOI-DA-BIET.md`.
