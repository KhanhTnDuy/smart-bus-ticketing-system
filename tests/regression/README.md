# Kiểm thử hồi quy luồng chính

`regress.mjs` gọi API thật của backend và kiểm tra các luồng chính của hệ thống, kèm ma trận quyền cho 5 vai trò
(Admin, Quản lý, Tài xế, Phụ xe, Hành khách). Gồm khoảng 180 phép kiểm, chia thành các nhóm:

| Nhóm | Nội dung |
|---|---|
| A | Đăng nhập, sai mật khẩu, thiếu hoặc sai token |
| B | Tài khoản và phân quyền (tạo, trùng, khóa, đổi vai trò lưu vào CSDL) |
| C, D | Tuyến, trạm, xe buýt |
| E | Lịch trình định kỳ và sinh chuyến (xem trước, trùng giờ, giới hạn 31 ngày) |
| F | Chuyến xe và phân công (trùng xe hoặc nhân sự, tên bịa, tài xế chỉ thấy chuyến của mình) |
| G | Đặt vé và thanh toán (trùng ghế, hết hạn giữ chỗ, trả hai lần, hóa đơn, cô lập giữa hành khách) |
| H | Hủy, đổi vé, hoàn tiền |
| I | Quét QR (hợp lệ, đã dùng, sai chuyến, quét đồng thời) |
| J, K, L | Báo sự cố, thông báo, khiếu nại |
| M | Hồ sơ ưu đãi, tải giấy tờ, giá ưu đãi khi đặt vé |
| N | Hủy chuyến kéo theo hoàn tiền |
| O | Báo cáo doanh thu và lấp đầy khớp CSDL |
| P | Nhật ký hệ thống |

## Cách chạy

1. Dựng CSDL dev (`dotnet ef database update`, nạp `backend/database/seed_sprint2.sql`) và chạy backend ở chế độ Development.
2. Chạy từ thư mục gốc repo (cần Node 18 trở lên và công cụ dòng lệnh `mysql` trong PATH):

```bash
CONFIRM_TEST_DB=1 node tests/regression/regress.mjs
```

Kịch bản **tạo, đổi và xóa dữ liệu thật** nên bắt buộc đặt `CONFIRM_TEST_DB=1`; không chạy trên CSDL có dữ liệu thật.
Trước khi chạy, kịch bản ghi lại id lớn nhất của từng bảng, và sau khi chạy xóa mọi dòng có id lớn hơn mốc đó. Dữ liệu gốc không bị đổi.
Kết thúc in số phép kiểm đạt và danh sách phép kiểm lỗi; mã thoát khác 0 nếu có lỗi hoặc dọn dữ liệu thất bại.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `API_URL` | `http://localhost:5180` | Địa chỉ backend |
| `MYSQL_BIN` | `mysql` | Đường dẫn công cụ `mysql` (trên Windows thường là `C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe`) |
| `MYSQL_HOST`, `MYSQL_PORT` | `localhost`, `3306` | Máy chủ MySQL |
| `MYSQL_USER`, `MYSQL_PASSWORD` | `root`, (rỗng) | Tài khoản MySQL |
| `MYSQL_DB` | `smart_bus_ticketing` | Tên CSDL |
| `SEED_PASSWORD` | `Admin@12345` | Mật khẩu các tài khoản seed (`admin`, `manager`, `driver1`, `driver2`, `conductor1`, `passenger1`) |

## Giả định về dữ liệu gốc

Kịch bản dùng dữ liệu seed của CSDL dev, nên cần đúng bộ dữ liệu đó:

- Tài khoản `admin`, `manager`, `driver1`, `driver2`, `conductor1`, `passenger1` có chung mật khẩu `SEED_PASSWORD`; id 3 và 4 là tài xế, id 5 là phụ xe, id 7 là hành khách.
- Tuyến id 1 có trạm id 1 và 2; xe id 1, 3, 4, 6, 7 đang hoạt động và có sơ đồ ghế; chuyến id 4 là chuyến đã khởi hành.
- Báo cáo doanh thu và lấp đầy so với CSDL theo toàn bộ giao dịch, nên bảng `payments` nên trống trước khi chạy.

Nếu seed đổi, sửa các id này ở đầu các nhóm F, G, I.

## Khi có phép kiểm lỗi

Dòng `FAIL` kèm giá trị thực tế và giá trị mong đợi. Mỗi phép kiểm đã kiểm tra bằng tay một lần trên bản main hiện tại, nên một lỗi mới thường
là hồi quy do thay đổi gần đây (quyền, trạng thái vé, tính tiền, thông báo).
