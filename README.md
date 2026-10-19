# 🚌 Smart Bus Ticketing System - Hệ Thống Vé Xe Buýt Thông Minh

[![.NET Version](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql)](https://www.mysql.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> **Dự án Thực tập cơ sở - Hệ thống số hóa & quản lý bán vé xe buýt thông minh**  
> Hỗ trợ đầy đủ nghiệp vụ: Đặt vé trực tuyến, thanh toán đa kênh (VietQR / Simulator), quét QR soát vé theo phân công chuyến, quản lý tuyến/lịch trình/nhân sự, voucher khuyến mãi phân bậc, chính sách ưu đãi đối tượng xe buýt và báo cáo thống kê doanh thu / tỷ lệ lấp đầy.

---

## 📑 Mục Lục
1. [Hướng dẫn cài đặt & Khởi chạy nhanh (< 15 phút)](#1-hướng-dẫn-cài-đặt--khởi-chạy-nhanh--15-phút)
2. [Kiến trúc hệ thống 3 lớp & Danh mục công nghệ](#2-kiến-trúc-hệ-thống-3-lớp--danh-mục-công-nghệ)
3. [Kịch bản & Checklist Demo cuối kỳ (Sprint 5)](#3-kịch-bản--checklist-demo-cuối-kỳ-sprint-5)
4. [Cấu hình hệ thống & Xử lý sự cố thường gặp (Troubleshooting)](#4-cấu-hình-hệ-thống--xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Hướng dẫn cài đặt & Khởi chạy nhanh (< 15 phút)

⏱️ **Mục tiêu triển khai nhanh**: Thiết kế luồng cài đặt tối giản gồm nạp CSDL mẫu, build backend và frontend với mục tiêu hoàn tất dưới 15 phút. (Đo đạc kiểm thử biên dịch thực tế: `dotnet build` ~1.5s, `npm run build` ~1.6s).

### 1.1. Yêu cầu môi trường
Trước khi bắt đầu, đảm bảo máy tính đã cài đặt:
- **Node.js**: Phiên bản LTS `20.x` hoặc `24.x` (kèm `npm`).
- **.NET SDK**: Phiên bản **.NET 10.0** (SDK .NET 10 preview / LTS hỗ trợ C# 13, cấu hình mục tiêu `<TargetFramework>net10.0</TargetFramework>`).
- **Hệ quản trị CSDL MySQL**: MySQL Server 8.0+ hoặc XAMPP (chạy MySQL cổng mặc định `3306`).
- **Git**: Quản lý phiên bản và mã nguồn.

---

### 1.2. Khởi tạo cơ sở dữ liệu

Hệ thống sử dụng cơ sở dữ liệu có tên `smart_bus_ticketing`. Có thể lựa chọn 1 trong 2 cách sau:

#### 👉 Cách 1: Nạp trực tiếp file script dữ liệu demo mẫu (Khuyến nghị cho chấm bài / demo nhanh)
File dữ liệu mẫu đã bao gồm đầy đủ cấu trúc bảng, các tuyến xe, trạm dừng, xe buýt, phân công mẫu, vé và tài khoản demo:

- **Dùng MySQL CLI (Command Prompt / PowerShell)**:
  ```bash
  mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS smart_bus_ticketing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -u root -p --default-character-set=utf8mb4 smart_bus_ticketing < backend/database/demo/smart-bus-demo-data.sql
  ```
  *(Nếu dùng XAMPP mặc định không có mật khẩu root, bỏ tham số `-p`)*:
  ```bash
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS smart_bus_ticketing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -u root --default-character-set=utf8mb4 smart_bus_ticketing < backend/database/demo/smart-bus-demo-data.sql
  ```

- **Hoặc dùng MySQL Workbench / phpMyAdmin**:
  1. Mở MySQL Workbench hoặc phpMyAdmin (http://localhost/phpmyadmin).
  2. Tạo database: `CREATE DATABASE smart_bus_ticketing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  3. Mở file `backend/database/demo/smart-bus-demo-data.sql` và nhấn **Execute / Import**.

#### 👉 Cách 2: Sử dụng Entity Framework Core Migrations
Nếu muốn khởi tạo schema tự động từ mã nguồn:
```bash
cd backend/SmartBusTicketing.Api
dotnet ef database update
```
*Lưu ý: Khi chạy ứng dụng lần đầu ở môi trường `Development`, hệ thống (`DbSeeder.cs`) sẽ tự động khởi tạo các tài khoản mẫu nếu CSDL chưa có dữ liệu.*

---

### 1.2.1. Nạp lại dữ liệu demo (tự dời ngày theo hôm nay)

Script nạp lại dữ liệu demo tự dời ngày các chuyến theo ngày nạp để **luôn có ít nhất 4 chuyến trong tương lai**; có sẵn 7 tài khoản demo (`admin`, `manager`, `driver1`, `driver2`, `conductor1`, `conductor2`, `passenger1`, mật khẩu chung `Admin@12345`).

```bash
# Bằng Node.js (từ thư mục gốc)
npm run reload-demo
# hoặc nếu MySQL có mật khẩu:
node scripts/reload-demo.mjs -p <mat_khau_mysql>

# Hoặc PowerShell (Windows):
.ackend\database\demoeload-demo.ps1

# Hoặc Bash (Linux/macOS):
./backend/database/demo/reload-demo.sh
```

Chi tiết xem tại [`backend/database/demo/README.md`](backend/database/demo/README.md). Lệnh này xóa và tạo lại CSDL `smart_bus_ticketing`, chỉ dùng trên CSDL dev/thử.

### 1.3. Hướng dẫn sao lưu & Phục hồi cơ sở dữ liệu (Database Backup & Restore - SCRUM-106)

Hệ thống cung cấp sẵn các script tự động tại `backend/database/` để thực hiện sao lưu toàn diện và phục hồi CSDL an toàn:

#### 🔹 1. Sao lưu cơ sở dữ liệu (Backup)
- **Sử dụng script tự động (Linux / macOS / Git Bash)**:
  ```bash
  bash backend/database/backup.sh [thư_mục_đích]
  ```
  *(Mặc định file sao lưu `.sql` kèm timestamp được lưu tại `backend/database/backups/smart_bus_ticketing_YYYYMMDD_HHMMSS.sql`). Script sử dụng `--single-transaction --routines --events --triggers` giúp tạo bản sao nhất quán mà không khóa bảng.*
- **Hoặc dùng lệnh mysqldump trực tiếp (Windows CMD / PowerShell)**:
  ```bash
  mysqldump -h localhost -P 3306 -u root -p --single-transaction --routines --events --triggers --databases smart_bus_ticketing > backup_smart_bus.sql
  ```

#### 🔹 2. Phục hồi cơ sở dữ liệu (Restore)
- **Sử dụng script tự động (Linux / macOS / Git Bash)**:
  ```bash
  CONFIRM_RESTORE=1 bash backend/database/restore.sh backend/database/backups/<ten_file_sao_luu>.sql
  ```
  *(Bắt buộc gắn cờ `CONFIRM_RESTORE=1` để xác nhận ghi đè CSDL).*
- **Hoặc dùng lệnh mysql CLI trực tiếp (Windows CMD / PowerShell)**:
  ```bash
  mysql -h localhost -P 3306 -u root -p smart_bus_ticketing < backup_smart_bus.sql
  ```

---

### 1.4. Lệnh khởi chạy hệ thống

Mở 2 cửa sổ terminal riêng biệt để chạy Backend và Frontend:

#### 🔹 Terminal 1: Chạy Backend (ASP.NET Core Web API trên .NET 10)
```bash
cd backend/SmartBusTicketing.Api
dotnet run --urls http://localhost:5180
```
- API endpoint chạy tại: **`http://localhost:5180`**
- Tài liệu OpenAPI Specification (JSON schema chuẩn .NET 10): **`http://localhost:5180/openapi/v1.json`** (chế độ Development sinh tự động từ `Microsoft.AspNetCore.OpenApi`).
  > 💡 **Lưu ý về Swagger 404**: ASP.NET Core trên .NET 10 mặc định sử dụng module OpenAPI gốc (`builder.Services.AddOpenApi()` và `app.MapOpenApi()`) để cung cấp đặc tả OpenAPI 3.0 tại endpoint `/openapi/v1.json`, không cài đặt UI bên thứ ba Swashbuckle tại `/swagger`. Bạn có thể mở trực tiếp URL JSON này trên trình duyệt hoặc import vào Postman / Swagger Editor để tra cứu đầy đủ các API.

#### 🔹 Terminal 2: Chạy Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Giao diện web chạy tại: **`http://localhost:5173`**

---

### 1.5. Danh sách tài khoản demo sẵn có
Tất cả các tài khoản demo đều dùng chung mật khẩu mặc định: **`Admin@12345`**

| Vai trò | Tên đăng nhập (Username) | Mật khẩu (Password) | Quyền hạn & Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `Admin@12345` | Toàn quyền hệ thống, quản lý tài khoản người dùng, xem báo cáo doanh thu & nhật ký kiểm toán (Audit Logs). |
| **Quản lý (Manager)** | `manager` | `Admin@12345` | Quản lý tuyến xe, cấu hình bảng giá km, phân công xe & tài xế, duyệt ưu đãi HS/SV, quản lý voucher. |
| **Tài xế (Driver)** | `driver1` | `Admin@12345` | Xem lịch trình phân công cá nhân, quét mã QR soát vé khách lên xe, báo cáo sự cố hành trình. |
| **Phụ xe (Conductor)** | `conductor1` | `Admin@12345` | Phụ trách chuyến xe, soát vé QR trên xe, xử lý vé nhầm/vé giả/vé hủy, báo cáo sự cố. |
| **Hành khách (Passenger)** | `passenger1` | `Admin@12345` | Tra cứu tuyến/chuyến, đặt vé trực tuyến, chọn chỗ ngồi, áp dụng voucher, thanh toán VietQR & nhận vé QR. |

---

### 1.6. Lệnh kiểm thử tự động (Automated Testing)

Bộ kiểm thử hồi quy gọi API thật của backend nằm tại `tests/regression/` (hơn 500 phép kiểm: luồng chính, thanh toán, hoàn tiền, giữ ghế, ma trận phân quyền 5 vai).
Chạy tất cả bằng một lệnh từ thư mục gốc, kịch bản tự dựng backend với cấu hình cần thiết và dọn dữ liệu sau khi chạy:

```bash
CONFIRM_TEST_DB=1 npm test                 # chạy trên CSDL dev hiện tại (cần MySQL đang chạy)
CONFIRM_TEST_DB=1 npm run test:reset-demo  # nạp lại dữ liệu demo trước (xóa và tạo lại CSDL, chỉ dùng trên CSDL dev/thử)
```

Kiểm thử cấu hình (`tests/config/`) không cần CSDL, tự khởi động backend để kiểm tra các chốt an toàn khi triển khai:

```bash
node tests/config/payment-simulator-guard.mjs   # SCRUM-88: giả lập thanh toán không bật được ngoài Development
node tests/config/deploy-config.mjs            # SCRUM-106: cấu hình triển khai (cần MySQL đang chạy)
```

- Chi tiết từng kịch bản, biến môi trường và ma trận kiểm thử thanh toán xem tại `tests/regression/README.md`.
- Thanh toán và hoàn tiền trên **sandbox VNPay thật** (cần khóa sandbox, có bước nhập thẻ thử bằng tay): xem [`docs/VNPAY-SANDBOX.md`](docs/VNPAY-SANDBOX.md), chạy bằng `npm run test:vnpay-sandbox`.
- Quy ước báo lỗi, danh sách lỗi đã biết và kết quả chạy gần nhất xem tại `docs/LOI-DA-BIET.md`.

---

## 2. Kiến trúc hệ thống 3 lớp & Danh mục công nghệ

### 2.1. Sơ đồ kiến trúc 3 lớp (3-Tier Architecture)

Hệ thống được thiết kế theo mô hình 3 lớp phân tách trách nhiệm chặt chẽ:

```
┌────────────────────────────────────────────────────────────────────────┐
│  1. TẦNG GIAO DIỆN (PRESENTATION LAYER - FRONTEND)                     │
│  - React 18 SPA + TypeScript + Vite + TailwindCSS                      │
│  - Mobile Responsive tối ưu cho tài xế/phụ xe trên thiết bị di động     │
│  - Giao diện soát vé QR (Hỗ trợ camera, đầu đọc mã vạch, dán mã)       │
│  - Xác thực qua JWT Bearer Token lưu tại localStorage                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (REST API / JSON qua Port 5173 -> 5180)
┌───────────────────────────────────▼────────────────────────────────────┐
│  2. TẦNG NGHIỆP VỤ (BUSINESS LOGIC LAYER - BACKEND WEB API)            │
│  - ASP.NET Core Web API (.NET 10 - TargetFramework net10.0)            │
│  - Controllers & DTOs: TicketScans, Bookings, Vouchers, Trips, Reports │
│  - Role-based Authorization: Admin, Manager, Driver, Conductor         │
│  - Concurrency Lock: Atomic conditional update & transaction an toàn   │
│  - AuditLogService: Ghi nhật ký mọi thao tác (soát vé, sửa tuyến, v.v.)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (EF Core Pomelo MySQL Provider)
┌───────────────────────────────────▼────────────────────────────────────┐
│  3. TẦNG TRUY XUẤT DỮ LIỆU & LƯU TRỮ (DATA ACCESS & PERSISTENCE)       │
│  - Cơ sở dữ liệu quan hệ MySQL 8.0 (Port 3306)                         │
│  - AppDbContext, Relational Foreign Keys, Indexes                      │
│  - Bảng chính: accounts, trips, buses, tickets, ticket_scans, vouchers │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Danh mục công nghệ
- **Backend**: .NET 10.0, ASP.NET Core Web API, Entity Framework Core 10, Pomelo MySQL, JWT Bearer, BCrypt.Net-Next, OpenAPI (`Microsoft.AspNetCore.OpenApi`).
- **Frontend**: React 18, TypeScript 5.x, Vite, Tailwind CSS, Lucide React Icons, React Router v6.
- **Testing**: Bộ kiểm thử hồi quy tự động một lệnh (`tests/run-all.mjs`, `tests/regression/regress.mjs`), test ma trận phân quyền 5 vai, kiểm thử chốt chặn triển khai (`tests/config/`).

---

## 3. Kịch bản & Checklist Demo cuối kỳ (Sprint 5)

Kịch bản chuẩn từng bước để nhóm thực hiện demo mượt mà, chứng minh đầy đủ 4 luồng nghiệp vụ không gián đoạn:

### ✅ Luồng 1 (Hành khách): Tìm chuyến → Chọn ghế → Nhập voucher → Quét VietQR → Nhận vé điện tử
1. Đăng nhập tài khoản hành khách: `passenger1` / `Admin@12345`.
2. Vào trang **Tìm chuyến**: Chọn điểm đi, điểm đến và ngày khởi hành.
3. Xem danh sách chuyến hiển thị với thông tin xe buýt, giờ xuất bến, giá vé theo số km hành trình.
4. Chọn chỗ ngồi trên sơ đồ ghế trực quan (kiểm tra ghế trống, ghế đã được giữ).
5. Áp dụng mã giảm giá / Voucher khuyến mãi (ví dụ: `VOUCHER15K` giảm 15.000đ).
6. Tiến hành thanh toán qua Quét mã VietQR hoặc Cổng thanh toán giả lập.
7. Nhận mã đặt chỗ và vé điện tử kèm **mã QR code** độc nhất của từng vé.

---

### ✅ Luồng 2 (Tài xế / Phụ xe): Soát vé bằng Camera/QR & Xử lý ngoại lệ (SCRUM-97)
1. Đăng nhập tài khoản tài xế: `driver1` / `Admin@12345`.
2. Truy cập menu **Tài xế & Soát vé** → **Quét QR vé** (`/driver/qr-scanner`).
3. Hệ thống tự động chọn sẵn chuyến xe gần giờ khởi hành hiện tại nhất từ danh sách chuyến được phân công.
   - Bấm **Bật camera quét vé** (lần đầu trình duyệt hỏi quyền camera): hệ thống mở camera sau và tự gửi mã QR ngay khi đọc được, không cần bấm thêm. Mã còn nằm trong khung hình sẽ không bị quét lặp; đưa ra rồi đưa vào lại mới tính là lượt quét mới. Vẫn có thể dùng đầu đọc mã vạch hoặc dán mã vào ô nhập.
4. **Kiểm chứng các trường hợp ngoại lệ thực tế**:
   - **Kịch bản 1 - Vé hợp lệ (Mời lên xe)**: Quét vé đúng chuyến → Hiển thị khung màu xanh tương phản cao: *"Hợp lệ — Mời lên xe: Vé hợp lệ. Mời hành khách lên xe."*, thông tin hành khách, số ghế, trạm lên/xuống; cập nhật trạng thái vé sang `Used`.
   - **Kịch bản 2 - Quét lại vé đã dùng (HTTP 400)**: Quét lại mã QR vừa soát thành công → Hiển thị khung màu vàng cảnh báo: *"Vé này đã được sử dụng trước đó lúc [Giờ:Phút]"* (múi giờ UTC+7).
   - **Kịch bản 3 - Khách nhầm chuyến (HTTP 400)**: Quét vé của chuyến A trên chuyến B → Hiển thị khung màu vàng thông báo cụ thể: *"Vé này thuộc chuyến #[Id], không phải chuyến #[Id] hiện tại."*
   - **Kịch bản 4 - Mã QR không tồn tại (HTTP 400)**: Nhập mã giả hoặc không có trong hệ thống → Hiển thị khung màu đỏ: *"Mã QR không tồn tại trong hệ thống."*
   - **Kịch bản 5 - Vé chưa trả tiền (HTTP 400)**: Quét vé ở trạng thái giữ chỗ (`Held`) → Hiển thị khung màu đỏ: *"Vé chưa được thanh toán."*
   - **Kịch bản 6 - Vé bị hủy hoặc đã đổi**: Quét vé có trạng thái `Cancelled` hoặc `Exchanged` → Báo: *"Vé đã bị hủy."* hoặc *"Vé đã được đổi sang vé khác."*
   - **Kịch bản 7 - Chuyến xe bị hủy (TripStatus.Cancelled)**: Quét vé của chuyến đã bị hủy chuyến → Báo: *"Chuyến xe này đã bị hủy."*
   - **Kịch bản 8 - Quét đồng thời (Concurrency Lock)**: Hai phụ xe cùng quét 1 vé tại cùng 1 giây → Nhờ cơ chế UPDATE có điều kiện và transaction CSDL, chỉ đúng 1 người quét thành công (chuyển sang `Used`), người thứ hai nhận ngay cảnh báo *"Vé này vừa được sử dụng."*
   - **Kịch bản 9 - Phân quyền tài xế (HTTP 403)**: Khi tài xế `driver2` cố tình quét vé của chuyến do `driver1` phụ trách → Backend trả về HTTP 403 kèm thông điệp rõ ràng: *"Nhân viên không được phân công phục vụ chuyến này."*. Giao diện hiển thị banner cảnh báo đỏ nổi bật kèm icon `ShieldAlert`, không bị văng Exception.

> 📱 **Lưu ý camera trên thiết bị di động khi triển khai Production**:
> Trình duyệt điện thoại (Chrome/Safari) chỉ cấp quyền mở camera trên kết nối bảo mật **HTTPS**; trên máy tính, `localhost` được coi là an toàn nên thử được ngay. Giải mã bằng thư viện `jsqr` ở trình duyệt nên không phụ thuộc `BarcodeDetector`. Khi camera không dùng được (bị chặn quyền, không có camera, đang bị ứng dụng khác chiếm), trang báo rõ lý do và phụ xe vẫn dùng được đầu đọc mã vạch USB/Bluetooth hoặc dán/nhập mã QR vào ô kiểm tra.

---

### ✅ Luồng 3 (Quản lý): Cấu hình giá cước km → Phân công xe/tài xế → Duyệt ưu đãi HS/SV
1. Đăng nhập tài khoản quản lý: `manager` / `Admin@12345`.
2. **Cấu hình bảng giá theo cự ly km**: Thiết lập bậc cước km theo cự ly thực tế giữa các trạm dừng.
3. **Phân công xe & nhân sự (SCRUM-50)**:
   - Gán xe buýt và cặp Tài xế / Phụ xe cho chuyến chạy.
   - Hệ thống tự động kiểm tra xung đột trùng lịch tài xế hoặc xe đang hoạt động ở chuyến khác.
4. **Quản lý Voucher & Khuyến mãi (SCRUM-66, SCRUM-67)**:
   - Tạo mã voucher mới, cấu hình mức giảm giá 15k - 50k, điều kiện đơn tối thiểu 30k - 90k, ngày hết hạn và số lượt dùng tối đa.
5. **Duyệt hồ sơ ưu đãi xe buýt**:
   - Duyệt hồ sơ học sinh/sinh viên (giảm 50%), người cao tuổi (miễn phí 100%), đối tượng chính sách (miễn phí 100%), vé tháng công nhân (giảm 30%).

---

### ✅ Luồng 4 (Admin): Báo cáo doanh thu → Tỷ lệ lấp đầy ghế → Nhật ký hệ thống (Audit Logs)
1. Đăng nhập tài khoản admin: `admin` / `Admin@12345`.
2. **Báo cáo doanh thu (kết nối PR #102: SCRUM-82/86)**: Xem biểu đồ tổng thu theo ngày, tháng, tuyến xe buýt và phương thức thanh toán.
3. **Thống kê tỷ lệ lấp đầy ghế (SCRUM-79/110)**: Xem số ghế đã bán / tổng ghế trên từng chuyến xe để điều phối xe buýt.
4. **Nhật ký hệ thống (Audit Logs - SCRUM-62/63/97)**:
   - Truy vết lịch sử thao tác của toàn bộ tài khoản (quét vé, phân công chuyến, đăng nhập, duyệt ưu đãi) kèm địa chỉ IP và trạng thái thực thi.

---

## 4. Cấu hình hệ thống & Xử lý sự cố thường gặp (Troubleshooting)

### 4.1. Rà soát cấu hình môi trường

#### Backend Configuration
- `backend/SmartBusTicketing.Api/appsettings.json`:
  ```json
  "ConnectionStrings": {
    "Default": "Server=localhost;Port=3306;Database=smart_bus_ticketing;User=root;Password=;TreatTinyAsBoolean=true"
  }
  ```
- `backend/SmartBusTicketing.Api/appsettings.Development.json`:
  ```json
  "Jwt": {
    "Key": "dev-only-smart-bus-ticketing-signing-key-change-me",
    "Issuer": "SmartBusTicketing.Api",
    "Audience": "SmartBusTicketing.Client"
  }
  ```

#### Frontend Configuration
- `frontend/.env.example` sao chép thành `frontend/.env`:
  ```ini
  VITE_API_URL=http://localhost:5180
  ```

---

### 4.2. Xử lý 5 sự cố thường gặp (Troubleshooting)

#### 1. Lỗi không kết nối được MySQL (`Unable to connect to any of the specified MySQL hosts`)
- **Nguyên nhân**: Dịch vụ MySQL chưa được bật, hoặc sai cổng (Port), Username, Password trong chuỗi kết nối.
- **Cách khắc phục**:
  - Kiểm tra MySQL đã khởi động trong XAMPP Control Panel hoặc Windows Services.
  - Kiểm tra xem MySQL có đang lắng nghe cổng 3306 không: `netstat -ano | findstr 3306`.
  - Cập nhật lại mật khẩu trong `appsettings.json` tại mục `ConnectionStrings:Default`.

#### 2. Lỗi CORS khi Frontend gọi Backend
- **Biểu hiện**: Trình duyệt báo `Access to XMLHttpRequest blocked by CORS policy`.
- **Cách khắc phục**: Đảm bảo Backend chạy đúng cổng `http://localhost:5180` và Frontend chạy tại `http://localhost:5173`. Backend đã được cấu hình sẵn cho phép CORS từ origin `http://localhost:5173` và `http://localhost:3000`.

#### 3. Lỗi cổng 5180 hoặc 5173 đã bị chiếm dụng (`Address already in use`)
- **Cách khắc phục**:
  - Tìm tiến trình chiếm cổng: `netstat -ano | findstr 5180`
  - Tắt tiến trình chiếm cổng: `taskkill /F /PID <PID_tìm_được>`
  - Hoặc chỉ định cổng khác cho Backend: `dotnet run --urls http://localhost:5181` (cập nhật lại `VITE_API_URL` trong frontend).

#### 4. Đăng nhập báo lỗi hoặc chưa có tài khoản Admin
- **Cách khắc phục**:
  - Đảm bảo database đã được tạo và nạp dữ liệu từ `backend/database/demo/smart-bus-demo-data.sql`.
  - Hoặc khởi động backend ở môi trường `Development`, `DbSeeder` sẽ tự động tạo tài khoản `admin` với mật khẩu mặc định `Admin@12345`.

#### 5. Truy cập `http://localhost:5180/swagger` báo lỗi 404 Not Found
- **Nguyên nhân**: Backend ASP.NET Core sử dụng module OpenAPI gốc của .NET 10 (`builder.Services.AddOpenApi()` & `app.MapOpenApi()`), trả về tài liệu OpenAPI JSON chuẩn thay vì giao diện HTML Swashbuckle UI truyền thống.
- **Cách khắc phục**:
  - Truy cập đúng endpoint OpenAPI chính thức của hệ thống: **`http://localhost:5180/openapi/v1.json`**.
  - Dán URL trên vào Swagger Editor trực tuyến (https://editor.swagger.io) hoặc import vào Postman / Scalar để xem tài liệu API dạng giao diện tương tác.

### 4.3. Branch Protection cho nhánh `main`

Hướng dẫn cấu hình Branch Protection Rule để bắt buộc các check CI (`Backend build (.NET)`, `Frontend build (tsc + vite)`, `Regression tests (npm test)`) phải xanh trước khi merge: [`docs/branch-protection-setup.md`](docs/branch-protection-setup.md).
