# Dữ liệu demo Smart Bus Ticketing

> Thư mục này chỉ phục vụ demo. **Xóa cả thư mục `backend/database/demo` khi kết thúc dự án** (có tài khoản demo và mã băm mật khẩu của chúng).

`smart-bus-demo-data.sql` là bản cấu trúc và dữ liệu đầy đủ của database `smart_bus_ticketing` để dựng nhanh máy demo và phục vụ kiểm thử tự động.

Dữ liệu demo đã được cấu hình **tự động sinh theo thời gian thực (ngày hiện tại và các ngày tới)** thay vì cố định ngày. Dù chạy script ở bất kỳ ngày hay giờ nào, hệ thống cũng luôn có **ít nhất 4 chuyến trong tương lai** để hành khách đặt vé và kiểm thử hoạt động thông suốt.

---

## Cách chạy nạp lại dữ liệu demo

Bạn có thể chọn 1 trong các cách sau:

### Cách 1: Sử dụng Node.js (Khuyên dùng - Đa nền tảng)

Từ thư mục gốc của repository:

```bash
# Nạp với cấu hình mặc định (root@127.0.0.1:3306 không mật khẩu)
npm run reload-demo

# Hoặc truyền mật khẩu MySQL nếu có
node scripts/reload-demo.mjs -p <mat_khau_mysql>

# Hoặc truyền đầy đủ tham số
node scripts/reload-demo.mjs -h 127.0.0.1 -P 3306 -u root -p <mat_khau> -D smart_bus_ticketing
```

### Cách 2: Sử dụng PowerShell (Windows)

Mở PowerShell tại thư mục này hoặc từ root:

```powershell
# Chạy mặc định
.\backend\database\demo\reload-demo.ps1

# Có mật khẩu
.\backend\database\demo\reload-demo.ps1 -Password "<mat_khau>"
```

### Cách 3: Sử dụng Bash (Linux / macOS / Git Bash)

```bash
chmod +x backend/database/demo/reload-demo.sh
./backend/database/demo/reload-demo.sh
```

### Cách 4: Chạy trực tiếp qua công cụ dòng lệnh MySQL

```bash
mysql -uroot -p --default-character-set=utf8mb4 < backend/database/demo/smart-bus-demo-data.sql
```

File tự xóa và tạo lại database `smart_bus_ticketing`, xóa toàn bộ dữ liệu cũ trên máy đó và nạp lại trạng thái chuẩn sạch.

---

## Nội dung dữ liệu được nạp

### 1. 7 tài khoản demo (Mật khẩu chung cho tất cả: `Admin@12345`)

| ID | Username | Vai trò | Họ tên | Ghi chú |
|---|---|---|---|---|
| 1 | `admin` | Admin | Quản trị hệ thống | Toàn quyền cấu hình, tài khoản, báo cáo |
| 2 | `manager` | Manager | Nguyễn Quản Lý | Quản lý chuyến, xe, duyệt hoàn/đổi vé |
| 3 | `driver1` | Driver | Nguyễn Văn Tuấn | Tài xế chuyến 1, 4, 6, 8, 10... |
| 4 | `driver2` | Driver | Trần Đình Trọng | Tài xế chuyến 5, 7, 9, 11... |
| 5 | `conductor1` | Conductor | Trần Minh Đức | Phụ xe |
| 6 | `conductor2` | Conductor | Lê Hoàng Nam | Phụ xe |
| 7 | `passenger1` | Passenger | Lê Thị Hành Khách | Đăng nhập đặt vé, tra cứu vé cá nhân |

### 2. Tuyến xe & Bảng giá theo Km
- **Tuyến T01** (Công viên 23/9 — Bến xe Miền Tây): 4 trạm dừng, cự ly 14.5 km.
- **Bảng giá vé theo cự ly**: 6 bậc từ 5.000 đ đến 16.000 đ.
- **4 loại hành khách**: Standard (100%), Student (50%), Elderly (50%), Worker (vé tháng).
- **5 xe buýt**: Các xe 1, 2 (47 chỗ), 3, 4 (24 chỗ) đang hoạt động (Active) kèm sơ đồ ghế đầy đủ.

### 3. Các chuyến xe sinh động theo ngày chạy
- **Chuyến hôm nay**: Sinh tự động cách thời điểm nạp 2h, 4h, 6h, 8h (đảm bảo còn ở tương lai).
- **Chuyến ngày mai**: 4 chuyến buổi sáng theo giờ Việt Nam (07:30, 08:30, 10:00, 11:00 = 00:30, 01:30, 03:00, 04:00 UTC).
- **Chuyến ngày kia**: 4 chuyến dự phòng tiếp theo.
- **Chuyến quá khứ**: 3 chuyến lịch sử (ngày hôm qua và trước đó) để kiểm tra các luồng tra cứu lịch sử.
- Toàn bộ các chuyến tương lai đều đã gán xe (BusId 1-4) và phân công đầy đủ Tài xế + Phụ xe trong `trip_staff`.

