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
3. [Kịch bản & Checklist Demo cuối kỳ (Sprint 5)](#3-kịch-bản--checklist-demo-cuối-kỳ-sprint-5)
4. [Cấu hình hệ thống & Xử lý sự cố thường gặp (Troubleshooting)](#4-cấu-hình-hệ-thống--xử-lý-sự-cố-thường-gặp-troubleshooting)
5. [Đối chiếu Pull Requests & Kết quả Đánh giá QA](#5-đối-chiếu-pull-requests--kết-quả-đánh-giá-qa)

---

## 1. Hướng dẫn cài đặt & Khởi chạy nhanh (< 15 phút)

⏱️ **Mục tiêu triển khai nhanh**: Thiết kế luồng cài đặt tối giản gồm nạp CSDL mẫu, build backend và frontend với mục tiêu hoàn tất dưới 15 phút. (Đo đạc kiểm thử biên dịch thực tế: `dotnet build` ~1.5s, `npm run build` ~1.6s).

### 1.1. Yêu cầu môi trường
Trước khi bắt đầu, đảm bảo máy tính đã cài đặt:
- **Node.js**: Phiên bản LTS `20.x` hoặc `24.x` (kèm `npm`).
- **.NET SDK**: Phiên bản `.NET 9.0+` (hoặc `.NET 10 preview`).
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

### 1.3. Lệnh khởi chạy hệ thống

Mở 2 cửa sổ terminal riêng biệt để chạy Backend và Frontend:

#### 🔹 Terminal 1: Chạy Backend (ASP.NET Core Web API)
```bash
cd backend/SmartBusTicketing.Api
dotnet run --urls http://localhost:5180
```
- API endpoint chạy tại: **`http://localhost:5180`**
- Swagger UI (tài liệu API): **`http://localhost:5180/swagger`** (chế độ Development)

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
│  - ASP.NET Core Web API (.NET 9.0 / 10.0)                              │
│  - Controllers & DTOs: TicketScans, Bookings, Vouchers, Trips, Reports │
│  - Role-based Authorization: Admin, Manager, Driver, Conductor         │
│  - Concurrency Lock: Atomic conditional update & transaction an toàn   │
│  - AuditLogService: Ghi nhật ký mọi thao tác (soát vé, sửa tuyến, v.v.)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (EF Core 9.0 Pomelo Provider)
┌───────────────────────────────────▼────────────────────────────────────┐
│  3. TẦNG TRUY XUẤT DỮ LIỆU & LƯU TRỮ (DATA ACCESS & PERSISTENCE)       │
│  - Cơ sở dữ liệu quan hệ MySQL 8.0 (Port 3306)                         │
│  - AppDbContext, Relational Foreign Keys, Indexes                      │
│  - Bảng chính: accounts, trips, buses, tickets, ticket_scans, vouchers │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Danh mục công nghệ
- **Backend**: .NET 9.0 / 10.0, ASP.NET Core Web API, Entity Framework Core 9.0, Pomelo MySQL, JWT Bearer, BCrypt.Net-Next.
- **Frontend**: React 18, TypeScript 5.x, Vite, Tailwind CSS, Lucide React Icons, React Router v6.
- **Testing**: Kịch bản kiểm thử hồi quy luồng chính tự động (`tests/regression/regress.mjs`) với hơn 180 test cases bao phủ toàn bộ ma trận 5 vai trò.

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
3. Chọn chuyến xe đang phụ trách từ danh sách chuyến được phân công.
4. **Kiểm chứng các trường hợp ngoại lệ thực tế**:
   - **Kịch bản 1 - Vé hợp lệ (Mời lên xe)**: Quét vé đúng chuyến → Hiển thị khung màu xanh tương phản cao: *"Hợp lệ — Mời lên xe: Vé hợp lệ. Mời hành khách lên xe."*, thông tin hành khách, số ghế, trạm lên/xuống; cập nhật trạng thái vé sang `Used`.
   - **Kịch bản 2 - Quét lại vé đã dùng (HTTP 400)**: Quét lại mã QR vừa soát thành công → Hiển thị khung màu vàng cảnh báo: *"Vé này đã được sử dụng trước đó lúc [Giờ:Phút]"*.
   - **Kịch bản 3 - Khách nhầm chuyến (HTTP 400)**: Quét vé của chuyến A trên chuyến B → Hiển thị khung màu vàng thông báo cụ thể: *"Vé này thuộc chuyến #[Id], không phải chuyến #[Id] hiện tại."*
   - **Kịch bản 4 - Mã QR không tồn tại (HTTP 400)**: Nhập mã giả hoặc không có trong hệ thống → Hiển thị khung màu đỏ: *"Mã QR không tồn tại trong hệ thống."*
   - **Kịch bản 5 - Vé chưa trả tiền (HTTP 400)**: Quét vé ở trạng thái giữ chỗ (`Held`) → Hiển thị khung màu đỏ: *"Vé chưa được thanh toán."*
   - **Kịch bản 6 - Vé bị hủy hoặc đã đổi**: Quét vé có trạng thái `Cancelled` hoặc `Exchanged` → Báo: *"Vé đã bị hủy."* hoặc *"Vé đã được đổi sang vé khác."*
   - **Kịch bản 7 - Chuyến xe bị hủy (TripStatus.Cancelled)**: Quét vé của chuyến đã bị hủy chuyến → Báo: *"Chuyến xe này đã bị hủy."*
   - **Kịch bản 8 - Quét đồng thời (Concurrency Lock)**: Hai phụ xe cùng quét 1 vé tại cùng 1 giây → Nhờ cơ chế UPDATE có điều kiện và transaction CSDL, chỉ đúng 1 người quét thành công (chuyển sang `Used`), người thứ hai nhận ngay cảnh báo *"Vé này vừa được sử dụng."*
   - **Kịch bản 9 - Phân quyền tài xế (HTTP 403)**: Khi tài xế `driver2` cố tình quét vé của chuyến do `driver1` phụ trách → Backend trả về HTTP 403 kèm thông điệp rõ ràng: *"Nhân viên không được phân công phục vụ chuyến này."*. Giao diện hiển thị banner cảnh báo đỏ nổi bật kèm icon `ShieldAlert`, không bị văng Exception.

> 📱 **Lưu ý camera trên thiết bị di động khi triển khai Production**:
> Trình duyệt điện thoại (Chrome/Safari) yêu cầu kết nối bảo mật **HTTPS** trên môi trường Production để cấp quyền mở camera quét trực tiếp. Trên môi trường thử nghiệm `localhost`, phụ xe có thể dùng camera ảo, đầu đọc mã vạch USB/Bluetooth hoặc dán/nhập mã QR nhanh vào ô kiểm tra.

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

### 4.2. Xử lý 4 lỗi kinh điển thường gặp

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

---

## 5. Đối chiếu Pull Requests & Kết quả Đánh giá QA

| Pull Request | Nhiệm vụ liên quan | Tác giả | Trạng thái | Đánh giá QA |
| :--- | :--- | :---: | :---: | :---: |
| **[PR #127](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/127)** | **SCRUM-97** (Thông báo rõ lý do quét QR không hợp lệ) & **SCRUM-102** (Quy chuẩn kịch bản Demo & Troubleshooting) | `diu005` (Hoàng Thị Dịu) | **ĐANG MỞ (OPEN)** | **ĐẠT (PASS)** — Sẵn sàng nghiệm thu Sprint 5. |
| **[PR #102](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/102)** | SCRUM-82, SCRUM-86 (API báo cáo doanh thu theo ngày & tuyến) | `KhanhTnDuy` | **ĐÃ MERGE** | Kết nối trực tiếp vào Luồng 4 Demo Admin. |
| **[PR #122](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/122)** | SCRUM-66, SCRUM-67 (Quản lý voucher & khuyến mãi) | `diu005` | **ĐÃ MERGE** | Đã gộp vào nhánh chính. |
| **[PR #91](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/91)** | SCRUM-50 (Phân công xe buýt & nhân sự chống trùng lịch) | `diu005` | **ĐÃ MERGE** | Đã gộp vào nhánh chính. |
