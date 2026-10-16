# 🚌 Smart Bus Ticketing System

Hệ thống số hóa bán vé xe buýt thông minh.

Môn học: Thực tập cơ sở 

## Công nghệ

**Frontend:** React + TypeScript, Vite, TailwindCSS, React Router

**Backend:** ASP.NET Core Web API (.NET 10), Entity Framework Core, Pomelo MySQL, JWT

**Cơ sở dữ liệu:** MySQL 8+

---

## Dữ liệu Demo (Sinh theo thời gian thực)

Dữ liệu demo được sinh động theo ngày chạy để **luôn có ít nhất 4 chuyến trong tương lai** và **7 tài khoản demo** sẵn sàng:

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

Chi tiết xem tại [`backend/database/demo/README.md`](file:///backend/database/demo/README.md).

---

## CI / CD & Branch Protection (GitHub Actions)

Dự án đã tích hợp pipeline CI tại [`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml):
- **Tự động chạy khi**: Tạo Pull Request hoặc push vào nhánh `main`.
- **Nội dung kiểm tra**:
  1. Build Backend (.NET 10).
  2. Lint và Build Frontend (Vite + TypeScript).
  3. Tự động khởi tạo MySQL container, nạp dữ liệu demo và chạy kiểm thử tự động (`seat-lock.mjs`, `refund-flow.mjs`).
  4. Status check `ci / build-and-test` tổng hợp trạng thái.
- **Chặn merge khi đỏ**: Hướng dẫn bật Branch Protection cho nhánh `main` xem tại [`docs/branch-protection-setup.md`](file:///docs/branch-protection-setup.md).

---

## Kiểm thử

Kiểm thử hồi quy luồng chính (khoảng 180 phép kiểm, 5 vai trò) nằm ở `tests/regression/`. Chạy trên CSDL dev khi backend đang chạy:

```bash
# Kiểm thử toàn diện
CONFIRM_TEST_DB=1 node tests/regression/regress.mjs

# Kiểm thử giữ ghế / nhả ghế đồng thời
CONFIRM_TEST_DB=1 node tests/regression/seat-lock.mjs

# Kiểm thử hủy vé & luồng hoàn tiền
CONFIRM_TEST_DB=1 node tests/regression/refund-flow.mjs
```

Điều kiện chạy, biến môi trường và dữ liệu seed cần có xem [`tests/regression/README.md`](file:///tests/regression/README.md).

