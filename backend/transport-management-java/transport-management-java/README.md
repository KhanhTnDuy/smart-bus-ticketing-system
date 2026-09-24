# Transport Management - Java Backend

Dự án Java chạy trên Visual Studio Code, không có Frontend.
Bài được tách riêng theo từng nhóm chức năng trong ảnh:

1. `account` - Quản lý tài khoản, phân quyền Admin/Quản lý/Tài xế/Hành khách.
2. `audit` - Nhật ký truy cập và thao tác hệ thống.
3. `route` - Quản lý tuyến đường, trạm dừng và giá vé.
4. `feedback` - Khiếu nại và đánh giá chất lượng chuyến đi.
5. `booking` - Giữ chỗ 10 phút, xác nhận thanh toán, tự nhả ghế hết hạn.

## Yêu cầu
- JDK 17+
- Maven 3.8+
- Visual Studio Code + Extension Pack for Java

## Chạy bằng VS Code
Mở thư mục `transport-management-java`, sau đó mở:
`src/main/java/com/transport/Main.java`

Có thể bấm **Run**.

## Chạy bằng Terminal
```bash
mvn clean compile
mvn exec:java
```

Hoặc nếu không dùng Maven:
```bash
javac -encoding UTF-8 -d out $(find src/main/java -name "*.java")
java -cp out com.transport.Main
```

## Dữ liệu
Dự án đang dùng bộ nhớ (in-memory repository), chưa cần MySQL.
Mỗi lần chạy lại chương trình dữ liệu mẫu sẽ được tạo lại.

## Mapping với User Story trong ảnh
### 1. Admin - tài khoản
- Thêm, sửa, xóa, xem danh sách tài khoản.
- Phân quyền theo vai trò.
- Kiểm tra quyền truy cập chức năng.
- Kiểm tra liên kết dữ liệu cơ bản.

### 2. Admin - nhật ký
- Ghi nhận đăng nhập/đăng xuất/thao tác.
- Xem danh sách log.
- Tìm kiếm/lọc log theo người dùng và loại thao tác.

### 3. Quản lý - tuyến đường
- Thêm, sửa, xóa, xem tuyến.
- Quản lý trạm dừng.
- Quản lý giá vé.
- Kiểm tra tuyến/trạm/giá vé hợp lệ.

### 4. Hành khách - phản ánh
- Gửi phản ánh.
- Đánh giá 1-5 sao và nhận xét.
- Quản lý phản ánh.
- Cập nhật trạng thái: CHUA_XU_LY / DANG_XU_LY / DA_XU_LY.

### 5. Hành khách - giữ chỗ (US3)
- Giữ ghế 10 phút khi đang thanh toán; ghế đang giữ hoặc đã bán thì người khác không đặt được.
- Thanh toán trong 10 phút thì vé chuyển sang VALID; quá hạn thì từ chối.
- `SeatHoldReleaseJob` chạy nền định kỳ, chuyển vé HELD quá hạn sang EXPIRED để nhả ghế.
- Trạng thái vé khớp cột `tickets.status` trong `backend/database/schema.sql`.

### Vai trò phụ xe (US14, US15)
- Thêm `Role.CONDUCTOR`; phụ xe và tài xế có quyền `SOAT_VE`.
