# 🚌 Smart Bus Ticketing System - Hệ Thống Vé Xe Buýt Thông Minh

[![.NET Version](https://img.shields.io/badge/.NET-9.0%20%7C%2010.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql)](https://www.mysql.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> **Dự án Thực tập cơ sở - Hệ thống số hóa & quản lý bán vé xe buýt thông minh**  
> Hỗ trợ đầy đủ nghiệp vụ: Đặt vé trực tuyến, thanh toán đa kênh, quét QR soát vé theo phân công chuyến, quản lý tuyến/lịch trình/nhân sự, voucher khuyến mãi, chính sách ưu đãi đối tượng và báo cáo thống kê doanh thu.

---

## 📑 Mục Lục
1. [Hướng dẫn cài đặt & Khởi chạy nhanh (< 15 phút)](#1-hướng-dẫn-cài-đặt--khởi-chạy-nhanh--15-phút)
2. [Kiến trúc hệ thống & Danh mục công nghệ](#2-kiến-trúc-hệ-thống--danh-mục-công-nghệ)
3. [Kịch bản & Checklist Demo cuối kỳ (Sprint 5)](#3-kịch-bản--checklist-demo-cuối-kỳ-sprint-5)
4. [Cấu hình hệ thống & Xử lý sự cố thường gặp (Troubleshooting)](#4-cấu-hình-hệ-thống--xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. Hướng dẫn cài đặt & Khởi chạy nhanh (< 15 phút)

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
| **Quản trị viên (Admin)** | `admin` | `Admin@12345` | Toàn quyền hệ thống, quản lý tài khoản người dùng, xem nhật ký kiểm toán (Audit Logs). |
| **Quản lý (Manager)** | `manager` | `Admin@12345` | Quản lý tuyến xe, chuyến xe, xe buýt, phân công tài xế/phụ xe, duyệt đổi/hủy vé, quản lý voucher và báo cáo thống kê. |
| **Tài xế (Driver)** | `driver1` | `Admin@12345` | Xem lịch trình phân công cá nhân, quét mã QR soát vé khách lên xe, báo cáo sự cố hành trình. |
| **Phụ xe (Conductor)** | `conductor1` | `Admin@12345` | Phụ trách chuyến xe, soát vé QR, hỗ trợ hành khách và báo cáo sự cố. |
| **Hành khách (Passenger)** | `passenger1` | `Admin@12345` | Tra cứu tuyến/chuyến, đặt vé trực tuyến, chọn chỗ ngồi, áp dụng voucher, xem vé điện tử & QR code, nộp hồ sơ ưu đãi đối tượng. |

---

## 2. Kiến trúc hệ thống & Danh mục công nghệ

### 2.1. Kiến trúc tổng quan
Hệ thống được xây dựng theo mô hình **Client - Server (Decoupled SPA & RESTful API)**:
- **Client (Frontend)**: Ứng dụng Single Page Application (SPA) xây dựng bằng React 18, Vite và TypeScript. Giao tiếp với backend qua REST API sử dụng JSON, xác thực qua JWT Bearer Token lưu tại `localStorage`.
- **Server (Backend)**: ASP.NET Core Web API kiến trúc phân tầng (Controllers, DTOs, Services, Models, Data Access EF Core).
- **Database (MySQL)**: Quản lý toàn vẹn dữ liệu quan hệ với ràng buộc khoá ngoại, index phục vụ tìm kiếm chuyến và quản lý giao dịch đồng thời (concurrency check khi đặt ghế và quét vé).

```
[ Trình duyệt Web / Mobile ]
            │  (HTTP / JSON - JWT Token)
            ▼
[ Frontend: React + TypeScript + TailwindCSS ] (Port: 5173)
            │  (REST API calls: /api/*)
            ▼
[ Backend: ASP.NET Core Web API ] (Port: 5180)
   ├── Controllers (Xử lý HTTP requests, Role-based Authorization)
   ├── Services (PasswordHasher, JWT Token, AuditLog, Email, Payment)
   └── Entity Framework Core (Pomelo MySQL Provider)
            │
            ▼
[ Cơ sở dữ liệu: MySQL 8.0 ] (Port: 3306)
```

### 2.2. Danh mục công nghệ
- **Backend**:
  - .NET SDK 9.0 / 10.0, C# 13.
  - ASP.NET Core Web API.
  - Entity Framework Core 9.0 + Pomelo.EntityFrameworkCore.MySql.
  - JWT Authentication (Bearer Tokens) & ASP.NET Core Authorization Policies.
  - BCrypt.Net-Next / Microsoft PasswordHasher cho mã hóa mật khẩu an toàn.
  - Swagger / OpenAPI.
- **Frontend**:
  - React 18, TypeScript, Vite.
  - Tailwind CSS & Lucide React Icons.
  - React Router v6.
- **Testing**:
  - Kịch bản kiểm thử hồi quy luồng chính tự động (`tests/regression/regress.mjs`) với hơn 180 test cases bao phủ toàn bộ ma trận 5 vai trò.

---

## 3. Kịch bản & Checklist Demo cuối kỳ (Sprint 5)

Dưới đây là kịch bản chuẩn từng bước để nhóm thực hiện demo mượt mà, chứng minh đầy đủ các chức năng nghiệp vụ trọng tâm:

### ✅ Luồng 1: Hành khách tìm chuyến & Đặt vé trực tuyến
1. Đăng nhập tài khoản hành khách: `passenger1` / `Admin@12345`.
2. Vào trang **Tìm chuyến**: Chọn điểm đi, điểm đến và ngày khởi hành.
3. Xem danh sách chuyến hiển thị với thông tin xe, giờ khởi hành, giá vé cơ sở/khoảng cách km.
4. Chọn chỗ ngồi trên sơ đồ ghế trực quan (hỗ trợ kiểm tra ghế trống, ghế đã được đặt).
5. Áp dụng mã giảm giá / Voucher khuyến mãi (ví dụ: `VOUCHER15K` giảm 15.000đ).
6. Tiến hành thanh toán qua Cổng giả lập (Simulator) hoặc Quét mã VietQR.
7. Nhận mã đặt chỗ và vé điện tử kèm **mã QR code** độc nhất của từng vé.

---

### ✅ Luồng 2: Tài xế / Phụ xe soát vé QR trên xe & Xử lý ngoại lệ (SCRUM-97)
1. Đăng nhập tài khoản tài xế: `driver1` / `Admin@12345`.
2. Truy cập menu **Tài xế & Soát vé** -> **Quét QR vé** (`/driver/qr-scanner`).
3. Chọn chuyến xe đang phụ trách từ danh sách chuyến được phân công.
4. **Kiểm thử các kịch bản quét vé**:
   - **Kịch bản 1 - Vé hợp lệ**: Dán mã QR của vé đúng chuyến -> Hệ thống hiển thị khung màu xanh thông báo *"Vé hợp lệ. Mời hành khách lên xe."*, thông tin hành khách, ghế ngồi, trạm lên/xuống; cập nhật trạng thái vé sang `Used`.
   - **Kịch bản 2 - Quét lại vé đã sử dụng**: Quét lại mã QR vừa soát thành công -> Hiển thị khung màu vàng thông báo *"Vé này đã được sử dụng."*
   - **Kịch bản 3 - Khách đi nhầm chuyến**: Quét vé thuộc chuyến khác -> Hiển thị khung màu vàng thông báo cụ thể: *"Vé này thuộc chuyến #[Id], không phải chuyến #[Id] hiện tại."*
   - **Kịch bản 4 - Mã QR không tồn tại**: Nhập mã bất kỳ không có trong hệ thống -> Hiển thị khung màu đỏ: *"Mã QR không tồn tại trong hệ thống."*
   - **Kịch bản 5 - Vé chưa thanh toán**: Quét vé đang ở trạng thái giữ chỗ (`Held`) -> Hiển thị khung màu đỏ: *"Vé chưa thanh toán (đang giữ chỗ)."*
   - **Kịch bản 6 - Vé bị hủy hoặc đã đổi**: Quét vé đã được chấp thuận hủy/đổi -> Hiển thị: *"Vé đã bị hủy."* hoặc *"Vé đã được đổi sang vé khác."*
   - **Kịch bản 7 - Chuyến xe bị hủy**: Quét vé thuộc chuyến đã bị hủy -> Hiển thị: *"Chuyến xe này đã bị hủy."*
   - **Kịch bản 8 - Quét đồng thời**: Hai người cùng quét vé một lúc -> Chỉ 1 người hợp lệ, người còn lại nhận thông báo *"Vé này vừa được sử dụng."*
   - **Kịch bản 9 - Phân quyền tài xế**: Tài xế cố tình soát vé trên chuyến xe không thuộc phân công của mình -> Hiển thị khung màu đỏ thân thiện: *"Bạn không được phân công cho chuyến này nên không thể soát vé."* (không bị văng lỗi mã code 403).

---

### ✅ Luồng 3: Quản lý điều hành & Phân công (Manager)
1. Đăng nhập tài khoản quản lý: `manager` / `Admin@12345`.
2. **Quản lý Tuyến & Trạm dừng**: Xem danh sách tuyến xe, cấu hình bảng giá vé theo cự ly km.
3. **Phân công xe & nhân sự (SCRUM-50)**:
   - Gán xe buýt và cặp Tài xế / Phụ xe cho chuyến chạy.
   - Hệ thống tự động kiểm tra xung đột trùng lịch tài xế hoặc xe đang hoạt động ở chuyến khác.
4. **Quản lý Voucher & Khuyến mãi (SCRUM-66, SCRUM-67)**:
   - Tạo mã voucher mới, cấu hình mức giảm giá, ngày hết hạn và số lượt sử dụng tối đa.
5. **Duyệt hồ sơ ưu đãi & Yêu cầu đổi/hủy vé**:
   - Duyệt hồ sơ học sinh, sinh viên, người cao tuổi để áp dụng mức giảm giá 30% - 50% - 100%.
   - Xử lý yêu cầu hoàn tiền vé khi khách hủy chuyến.

---

### ✅ Luồng 4: Quản trị viên, Báo cáo & Nhật ký kiểm toán (Admin)
1. Đăng nhập tài khoản admin: `admin` / `Admin@12345`.
2. **Quản lý tài khoản**: Thêm mới tài xế/phụ xe, khóa hoặc kích hoạt tài khoản nhân sự.
3. **Báo cáo thống kê**:
   - Xem biểu đồ doanh thu theo ngày/tháng/tuyến xe.
   - Thống kê tỷ lệ lấp đầy ghế (occupancy rate) trên từng chuyến.
4. **Nhật ký hệ thống (Audit Logs)**:
   - Tra cứu lịch sử thao tác của toàn bộ tài khoản (quét vé, đăng nhập, đặt vé, cập nhật dữ liệu) kèm địa chỉ IP và trạng thái thực thi.

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
  *Chỉnh sửa `User` và `Password` khớp với cấu hình MySQL trên máy của bạn.*

- `backend/SmartBusTicketing.Api/appsettings.Development.json`:
  ```json
  "Jwt": {
    "Key": "dev-only-smart-bus-ticketing-signing-key-change-me",
    "Issuer": "SmartBusTicketing.Api",
    "Audience": "SmartBusTicketing.Client"
  },
  "Payments": {
    "Simulator": {
      "Enabled": true
    }
  }
  ```
  *(Chuỗi `Jwt:Key` phải dài tối thiểu 32 ký tự để thuật toán HMAC-SHA256 hoạt động an toàn).*

#### Frontend Configuration
- `frontend/.env.example` sao chép thành `frontend/.env`:
  ```ini
  VITE_API_URL=http://localhost:5180
  ```

---

### 4.2. Xử lý các sự cố thường gặp

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
  - Hoặc chỉ định cổng khác cho Backend: `dotnet run --urls http://localhost:5181` (lưu ý cần cập nhật lại `VITE_API_URL` trong frontend).

#### 4. Đăng nhập báo lỗi hoặc chưa có tài khoản Admin
- **Cách khắc phục**:
  - Đảm bảo database đã được tạo và nạp dữ liệu từ `backend/database/demo/smart-bus-demo-data.sql`.
  - Hoặc khởi động backend ở môi trường `Development`, `DbSeeder` sẽ tự động tạo tài khoản `admin` với mật khẩu mặc định `Admin@12345`.

---

## 👥 Thành viên nhóm phát triển
- Nhóm sinh viên thực hiện đề tài Thực tập cơ sở - ICTU.
- Mọi thắc mắc kỹ thuật vui lòng tạo Issue trên GitHub hoặc liên hệ người phụ trách module.
