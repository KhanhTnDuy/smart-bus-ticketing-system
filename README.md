# 🚌 Smart Bus Ticketing System - Hệ Thống Vé Xe Buýt Thông Minh

[![.NET Version](https://img.shields.io/badge/.NET-9.0%20%7C%2010.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
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
3. [Kiểm thử tự động & Báo cáo chất lượng](#3-kiểm-thử-tự-động--báo-cáo-chất-lượng)
4. [Kịch bản & Checklist Demo cuối kỳ (Sprint 5)](#4-kịch-bản--checklist-demo-cuối-kỳ-sprint-5)
5. [Cấu hình hệ thống & Xử lý sự cố thường gặp (Troubleshooting)](#5-cấu-hình-hệ-thống--xử-lý-sự-cố-thường-gặp-troubleshooting)
6. [Bảng đối chiếu Pull Request & Tính năng đã hoàn thành](#6-bảng-đối-chiếu-pull-request--tính-năng-đã-hoàn-thành)

---

## 1. Hướng dẫn cài đặt & Khởi chạy nhanh (< 15 phút)

⏱️ **Mục tiêu triển khai nhanh**: Thiết kế luồng cài đặt tối giản gồm nạp CSDL mẫu, build backend và frontend với mục tiêu hoàn tất dưới 15 phút. (Đo đạc kiểm thử biên dịch thực tế: `dotnet build` ~1.5s, `npm run build` ~1.6s).

### 1.1. Yêu cầu môi trường
Trước khi bắt đầu, đảm bảo máy tính đã cài đặt:
- **Node.js**: Phiên bản LTS `20.x` hoặc `24.x` (kèm `npm`).
- **.NET SDK**: Phiên bản `.NET 9.0+` (hoặc `.NET 10 preview`).
- **Hệ quản trị CSDL MySQL**: MySQL Server 8.0+ hoặc XAMPP (chạy MySQL cổng mặc định `3306`).
- **Git**: Dùng clone repo và quản lý mã nguồn.

---

### 1.2. Khởi tạo cơ sở dữ liệu

Hệ thống sử dụng cơ sở dữ liệu có tên `smart_bus_ticketing`. Có thể lựa chọn 1 trong 2 cách sau:

#### 👉 Cách 1: Nạp trực tiếp file script dữ liệu demo mẫu (Khuyến nghị cho chấm bài/demo nhanh)
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
  3. Mở file `backend/database/demo/smart-bus-demo-data.sql` và nhấn **Execute/Import**.

#### 👉 Cách 2: Sử dụng Entity Framework Core Migrations
Nếu muốn khởi tạo schema tự động từ mã nguồn:
```bash
cd backend/SmartBusTicketing.Api
dotnet ef database update
```
*Lưu ý: Khi chạy ứng dụng lần đầu ở môi trường `Development`, hệ thống (`DbSeeder.cs`) sẽ tự động khởi tạo các tài khoản mẫu nếu CSDL chưa có dữ liệu.*

---

### 1.3. Lệnh khởi chạy hệ thống

Mở 2 cửa sổ terminal riêng biệt để chạy Backend và Frontend:

#### 🔹 Terminal 1: Chạy Backend (ASP.NET Core Web API)
```bash
cd backend/SmartBusTicketing.Api
dotnet run --urls http://localhost:5180
```
- API chạy tại: **`http://localhost:5180`**
- Swagger UI (tài liệu API): **`http://localhost:5180/swagger`** (ở chế độ Development)

#### 🔹 Terminal 2: Chạy Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Giao diện web chạy tại: **`http://localhost:5173`**

---

### 1.4. Danh sách tài khoản demo sẵn có
Tất cả các tài khoản demo đều dùng chung mật khẩu mặc định: **`Admin@12345`**

| Vai trò | Tên đăng nhập (Username) | Mật khẩu (Password) | Quyền hạn & Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `Admin@12345` | Toàn quyền hệ thống, quản lý tài khoản người dùng, xem báo cáo doanh thu & nhật ký kiểm toán (Audit Logs). |
| **Quản lý (Manager)** | `manager` | `Admin@12345` | Quản lý tuyến xe, cấu hình bảng giá km, phân công xe & tài xế, duyệt ưu đãi HS/SV, quản lý voucher. |
| **Tài xế (Driver)** | `driver1` | `Admin@12345` | Xem lịch trình phân công cá nhân, quét mã QR soát vé khách lên xe, báo cáo sự cố hành trình. |
| **Phụ xe (Conductor)** | `conductor1` | `Admin@12345` | Phụ trách chuyến xe, soát vé QR trên xe, xử lý vé nhầm/vé giả/vé hủy, báo cáo sự cố. |
| **Hành khách (Passenger)** | `passenger1` | `Admin@12345` | Tra cứu tuyến/chuyến, đặt vé trực tuyến, chọn chỗ ngồi, áp dụng voucher, thanh toán VietQR & nhận vé QR. |

---

## 2. Kiến trúc hệ thống 3 lớp & Danh mục công nghệ

### 2.1. Sơ đồ kiến trúc 3 lớp (3-Tier Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│  1. TẦNG TRÌNH DIỄN (PRESENTATION LAYER - CLIENT SPA)                  │
│  - React 18 / 19 SPA (Vite + TypeScript)                              │
│  - TailwindCSS, Lucide Icons, Html5-QrCode (Camera Scanner)            │
│  - State Management: React Context, LocalStorage (JWT Token)           │
│  - Thiết kế thích ứng: Responsive Web & Giao diện tối ưu Mobile        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (JSON)
                                    │ Authorization: Bearer <JWT>
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  2. TẦNG NGHIỆP VỤ (BUSINESS LOGIC LAYER - BACKEND WEB API)            │
│  - ASP.NET Core Web API (.NET 9.0 / 10.0)                              │
│  - Controllers & DTOs: TicketScans, Bookings, Vouchers, Trips, Reports │
│  - Role-based Authorization: Admin, Manager, Driver, Conductor         │
│  - Concurrency Lock: Atomic conditional update & transaction an toàn   │
│  - AuditLogService: Ghi nhật ký mọi thao tác (soát vé, sửa tuyến, v.v.)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Entity Framework Core 9.0
                                    │ Pomelo MySQL Provider
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  3. TẦNG DỮ LIỆU (DATA ACCESS LAYER - PERSISTENCE)                     │
│  - Cơ sở dữ liệu quan hệ MySQL 8.0 (Port 3306)                         │
│  - AppDbContext, Relational Foreign Keys, Indexes                      │
│  - Bảng chính: accounts, trips, buses, tickets, ticket_scans, vouchers │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Danh mục công nghệ
- **Backend**: ASP.NET Core Web API (.NET 9/10), C# 13, EF Core, Pomelo MySQL, JWT Authentication (HMAC-SHA256), Microsoft PasswordHasher.
- **Frontend**: React 18, TypeScript 5, Vite, Tailwind CSS, Lucide React, html5-qrcode.
- **Database**: MySQL Server 8.0+ (utf8mb4).

---

## 3. Kiểm thử tự động & Báo cáo chất lượng

Bộ kiểm thử hồi quy gọi API thật của backend nằm tại thư mục `tests/regression/` (hơn 500 phép kiểm bao phủ toàn bộ ma trận 5 vai trò: luồng chính, thanh toán, hoàn tiền, giữ ghế, mã giảm giá và bảo mật phân quyền).

Chạy tất cả bằng một lệnh tự động (kịch bản tự dựng backend với cấu hình cần thiết và dọn dữ liệu sau khi chạy):

```bash
CONFIRM_TEST_DB=1 npm test                 # chạy trên CSDL dev hiện tại (cần MySQL đang chạy)
CONFIRM_TEST_DB=1 npm run test:reset-demo  # nạp lại dữ liệu demo trước (xóa và tạo lại CSDL, chỉ dùng trên CSDL dev/thử)
```

Kiểm thử cấu hình (`tests/config/`) không cần CSDL, tự khởi động backend để kiểm tra các chốt an toàn khi triển khai:
```bash
node tests/config/payment-simulator-guard.mjs   # SCRUM-88: giả lập thanh toán không bật được ngoài Development
```

- Chi tiết từng kịch bản, biến môi trường và ma trận kiểm thử thanh toán: xem `tests/regression/README.md`.
- Quy ước báo lỗi, danh sách lỗi đã biết và kết quả chạy gần nhất: xem `docs/LOI-DA-BIET.md`.

---

## 4. Kịch bản & Checklist Demo cuối kỳ (Sprint 5)

Kịch bản chuẩn từng bước để nhóm thực hiện demo mượt mà, chứng minh đầy đủ 4 luồng nghiệp vụ không gián đoạn:

### ✅ Luồng 1 (Hành khách): Tìm chuyến → Chọn ghế → Nhập voucher → Quét VietQR → Nhận vé điện tử
1. Đăng nhập tài khoản hành khách: `passenger1` / `Admin@12345`.
2. Vào trang **Tìm chuyến**: Chọn điểm đi, điểm đến và ngày khởi hành.
3. Xem danh sách chuyến hiển thị với thông tin xe buýt, giờ xuất bến, giá vé theo số km hành trình.
4. Chọn chỗ ngồi trên sơ đồ ghế trực quan (kiểm tra ghế trống, ghế đã được giữ).
5. **Áp dụng mã giảm giá / Voucher khuyến mãi (SCRUM-66, SCRUM-67)**:
   - *Thử nghiệm 1 ghế*: Nhập mã **`CHAOHEXANH`** (giảm 10.000đ - áp dụng cho mọi đơn từ 1 vé).
   - *Thử nghiệm từ 2 ghế trở lên*: Nhập mã **`HE2026`** (giảm 20.000đ - yêu cầu đặt từ 2 vé trở lên do điều kiện đơn tối thiểu 30.000đ - 40.000đ theo phân bậc mua sắm).
   - *Lưu ý*: Giao diện đã có nút bấm 1-chạm gợi ý mã voucher và dòng chữ hiển thị điều kiện rõ ràng để tránh nhầm lẫn khi demo.
6. Tiến hành thanh toán qua Quét mã VietQR hoặc Cổng thanh toán giả lập.
7. Nhận mã đặt chỗ và vé điện tử kèm **mã QR code** độc nhất của từng vé.

---

### ✅ Luồng 2 (Tài xế / Phụ xe): Soát vé bằng Camera QR & Xử lý ngoại lệ (SCRUM-97)
1. Đăng nhập tài khoản tài xế: `driver1` / `Admin@12345`.
2. Truy cập menu **Tài xế & Soát vé** -> **Quét QR vé** (`/driver/qr-scanner`).
3. Chọn chuyến xe đang phụ trách từ danh sách chuyến được phân công.
4. **Kiểm thử các kịch bản soát vé thực tế**:
   - **Kịch bản 1 - Vé hợp lệ**: Dán mã QR đúng chuyến -> Hiển thị khung màu xanh *"Vé hợp lệ. Mời hành khách lên xe."*, thông tin hành khách, ghế ngồi; cập nhật trạng thái vé sang `Used`.
   - **Kịch bản 2 - Quét lại vé đã dùng (HTTP 400)**: Quét lại mã QR vừa soát -> Hiển thị cảnh báo vàng: *"Vé này đã được sử dụng trước đó lúc [Giờ:Phút]."*
   - **Kịch bản 3 - Khách đi nhầm chuyến (HTTP 400)**: Quét vé thuộc chuyến khác -> Hiển thị thông báo cụ thể: *"Vé này thuộc chuyến #[Id], không phải chuyến #[Id] hiện tại."*
   - **Kịch bản 4 - Mã QR không tồn tại / Rỗng (HTTP 400)**: Nhập mã giả lập không có -> Hiển thị thông báo lỗi rõ ràng.
   - **Kịch bản 5 - Vé chưa thanh toán (HTTP 400)**: Quét vé đang ở trạng thái giữ chỗ (`Held`) -> Hiển thị: *"Vé chưa được thanh toán."*
   - **Kịch bản 6 - Vé bị hủy (HTTP 400)**: Quét vé có trạng thái `Cancelled` -> Hiển thị: *"Vé đã bị hủy."*
   - **Kịch bản 7 - Chuyến xe bị hủy (HTTP 400)**: Quét vé thuộc chuyến đã bị hủy -> Hiển thị: *"Chuyến xe này đã bị hủy."*
   - **Kịch bản 8 - Hai người cùng quét vé một lúc (Concurrency)**: Nhờ cơ chế conditional atomic update ở tầng CSDL, chỉ 1 người soát thành công, người thứ hai nhận thông báo *"Vé này vừa được sử dụng."*
   - **Kịch bản 9 - Phân quyền nhân sự (HTTP 403)**: Nhân viên không được phân công cho chuyến cố tình quét vé -> Hiển thị banner đỏ với icon `ShieldAlert`: *"Nhân viên không được phân công phục vụ chuyến này."*

---

### ✅ Luồng 3 (Quản lý): Cấu hình bảng giá → Phân công xe/tài xế → Quản lý voucher → Duyệt ưu đãi
1. Đăng nhập tài khoản quản lý: `manager` / `Admin@12345`.
2. **Cấu hình bảng giá cước km**: Thiết lập giá mở cửa và đơn giá theo từng km hành trình.
3. **Phân công xe buýt & Tài xế / Phụ xe (SCRUM-50)**:
   - Gán xe buýt và cặp Tài xế / Phụ xe cho chuyến chạy.
   - Hệ thống tự động kiểm tra xung đột trùng lịch tài xế hoặc xe đang hoạt động ở chuyến khác.
4. **Quản lý Voucher & Khuyến mãi (SCRUM-66, SCRUM-67)**:
   - Tạo mã voucher mới, cấu hình mức giảm giá 15k - 50k, điều kiện đơn tối thiểu 30k - 90k, ngày hết hạn và số lượt dùng tối đa.
5. **Duyệt hồ sơ ưu đãi xe buýt**:
   - Duyệt hồ sơ học sinh/sinh viên (giảm 50%), người cao tuổi (miễn phí 100%), đối tượng chính sách (miễn phí 100%), vé tháng công nhân (giảm 30%).

---

### ✅ Luồng 4 (Admin): Báo cáo doanh thu → Tỷ lệ lấp đầy → Nhật ký kiểm toán (Audit Logs)
1. Đăng nhập tài khoản admin: `admin` / `Admin@12345`.
2. **Báo cáo doanh thu (SCRUM-82, SCRUM-86)**:
   - Xem tổng doanh thu bán vé, phân tích doanh thu theo ngày và theo từng tuyến xe buýt.
3. **Tỷ lệ lấp đầy ghế (Occupancy Rate)**:
   - Biểu đồ trực quan tỷ lệ ghế có khách trên từng chuyến, cảnh báo chuyến vắng khách hoặc quá tải.
4. **Nhật ký kiểm toán hệ thống (Audit Logs)**:
   - Truy vết lịch sử mọi thao tác: soát vé, đặt vé, sửa phân công, tạo voucher kèm tài khoản thực hiện, thời gian chi tiết và địa chỉ IP.

---

## 5. Cấu hình hệ thống & Xử lý sự cố thường gặp (Troubleshooting)

### 5.1. Khắc phục 4 lỗi kinh điển khi khởi chạy
1. **Lỗi kết nối MySQL (`Access denied` hoặc `Unable to connect`)**:
   - Kiểm tra MySQL service đã bật (XAMPP hoặc Services.msc).
   - Kiểm tra port 3306: `netstat -ano | findstr 3306`.
   - Cập nhật đúng `User` và `Password` tại `backend/SmartBusTicketing.Api/appsettings.json`.
2. **Lỗi CORS khi gọi API từ Frontend**:
   - Backend đã cấu hình sẵn chấp thuận CORS cho `http://localhost:5173` và `http://localhost:3000`. Hãy đảm bảo frontend chạy đúng các port này.
3. **Lỗi cổng 5180 hoặc 5173 bị chiếm dụng (`Address already in use`)**:
   - Tìm PID chiếm cổng: `netstat -ano | findstr 5180`.
   - Tắt tiến trình: `taskkill /F /PID <PID_tìm_được>`.
4. **Không đăng nhập được / Chưa có tài khoản Admin**:
   - Khởi động backend ở môi trường `Development`, `DbSeeder.cs` sẽ tự động tạo tài khoản `admin` với mật khẩu mặc định `Admin@12345`.

---

## 6. Bảng đối chiếu Pull Request & Tính năng đã hoàn thành

| Pull Request | Chức năng & Phạm vi công việc | Tác giả | Trạng thái | Ghi chú nghiệm thu |
| :--- | :--- | :---: | :---: | :--- |
| **[PR #126](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/126)** | **SCRUM-66, SCRUM-67**: Quản lý Voucher & Chính sách ưu đãi đối tượng xe buýt | `diu005` (Hoàng Thị Dịu) | **SẴN SÀNG MERGE** | **ĐẠT (PASS)** - Đã đồng bộ 0 conflict với `origin/main`; đã bổ sung gợi ý kịch bản demo và giao diện chọn mã trực quan. |
| **[PR #127](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/127)** | **SCRUM-97**: Thông báo rõ lý do quét QR không hợp lệ & **SCRUM-102**: Quy chuẩn tài liệu demo | `diu005` (Hoàng Thị Dịu) | **ĐÃ MERGE / SẴN SÀNG** | **ĐẠT (PASS)** - Hoàn thiện 9 kịch bản soát vé và giao diện mobile có icon ShieldAlert. |
| **[PR #102](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/102)** | **SCRUM-82, SCRUM-86**: API báo cáo doanh thu theo ngày & tuyến | `KhanhTnDuy` | **ĐÃ MERGE** | Kết nối trực tiếp vào Luồng 4 Demo Admin. |
| **[PR #91](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/91)** | **SCRUM-50**: Phân công xe buýt & nhân sự chống trùng lịch | `diu005` | **ĐÃ MERGE** | Đã gộp vào nhánh chính. |

---

## 👥 Thành viên nhóm phát triển
- **Hoàng Thị Dịu (`diu005`)** - Phụ trách: Quản lý voucher & khuyến mãi (SCRUM-66, 67), Phân công nhân sự & xe buýt (SCRUM-50), Soát vé QR mobile (SCRUM-97), Tài liệu & Checklist Demo (SCRUM-102).
- Nhóm sinh viên thực hiện đề tài Thực tập cơ sở - Khoa CNTT, Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU).
