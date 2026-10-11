# Dữ liệu demo

> Thư mục này chỉ phục vụ demo. **Xóa cả thư mục `backend/database/demo` khi kết thúc dự án** (có tài khoản demo và mã băm mật khẩu của chúng).

`smart-bus-demo-data.sql` là bản xuất đầy đủ database `smart_bus_ticketing` (cấu trúc + dữ liệu) để dựng nhanh máy demo:

```bash
mysql -uroot -p --default-character-set=utf8mb4 < backend/database/demo/smart-bus-demo-data.sql
```

File tự xóa và tạo lại database `smart_bus_ticketing`, nên **mất dữ liệu cũ trên máy đó**. Sau đó trỏ `ConnectionStrings:Default` của backend tới MySQL này, đặt thông tin ngân hàng theo `bank-transfer-demo.md`, rồi chạy backend và frontend. Không cần chạy migration.

## Nội dung

- Tài khoản demo: admin, manager, 2 tài xế, 2 phụ xe, passenger1 (mật khẩu theo `seed_sprint2.sql`).
- Tuyến T01 (4 trạm, 14,5 km) kèm km từng trạm; bảng giá theo km 6 bậc (5.000 đ đến 16.000 đ).
- 4 chuyến sáng 12/10/2026 (cột `DepartureAt` lưu giờ UTC: 00:30, 01:30, 03:00, 04:00 = 07:30, 08:30, 10:00, 11:00 giờ VN) cùng ghế, một số lượt đặt/thanh toán thử.

## Tự sửa dữ liệu demo

Backend sửa trực tiếp file SQL (là text). Mỗi bảng là một dòng `INSERT INTO ... VALUES (...)` trong khối `LOCK TABLES`; sửa giá trị trong dòng đó. Mốc hay cần đổi:

- Ngày giờ chuyến: bảng `trips`, cột `DepartureAt` (UTC, trừ 7 giờ so với giờ VN).
- Giá: bảng `distance_fares` (bậc km), hoặc `fares` (giá cố định cũ).
- Gỡ lượt đặt/thanh toán thử: xóa dòng trong `bookings`, `payments`, `tickets`, `invoices`, `refunds` và trả ghế tương ứng về trống.

Xuất lại bản mới từ database đang chạy:

```bash
mysqldump -uroot --databases smart_bus_ticketing --add-drop-database --single-transaction --routines --default-character-set=utf8mb4 --skip-comments > backend/database/demo/smart-bus-demo-data.sql
```

(Lệnh trên không thêm phần ghi chú đầu file; nếu cần, chép lại phần ghi chú từ bản cũ.)
