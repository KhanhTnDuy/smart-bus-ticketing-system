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
| Q | Quản lý và kiểm tra voucher (SCRUM-66, SCRUM-67: tạo, trùng mã, phân quyền, hết hạn, hết lượt, áp dụng khi đặt vé, an toàn cập nhật và xóa) |

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

## Nhóm G2 – thanh toán VNPay

Chạy backend với khóa thử, ví dụ `Payments__VnPay__TmnCode=TESTTMN01 Payments__VnPay__HashSecret=<khóa thử>`, rồi đặt cùng khóa đó ở
`VNPAY_SECRET` khi chạy kịch bản. Kịch bản tự ký các lời gọi IPN/ReturnUrl giống VNPay (viết độc lập với code C#, nên cũng đối chiếu chéo thuật
toán ký). Không đặt `VNPAY_SECRET` thì nhóm này bị bỏ qua. Nhóm chạy cuối cùng vì tạo thêm giao dịch và giữ ghế trên chuyến A, làm lệch các
số liệu báo cáo ở nhóm O nếu chạy trước.

## Nhóm G3 – email hóa đơn

Kịch bản tự mở một máy chủ SMTP giả ở cổng `SMTP_SINK_PORT` (vd. 2525) để nhận email. Chạy backend trỏ vào đó:
`Email__Enabled=true Email__Host=127.0.0.1 Email__Port=2525 Email__UseSsl=false Email__FromAddress=no-reply@smartbus.test`. Nhóm kiểm nội dung thư, SMTP từ chối,
gửi lại, quyền, địa chỉ không hợp lệ, hóa đơn quá số lần thử và tài khoản chưa có email. Không đặt `SMTP_SINK_PORT` thì nhóm bị bỏ qua.

## Nhóm G4 – hoàn tiền tự động qua VNPay

Kịch bản tự mở một máy chủ "API hoàn tiền VNPay" giả ở cổng `REFUND_SINK_PORT` (vd. 2526), kiểm chữ ký yêu cầu theo đặc tả và trả lời có ký. Chạy backend với
`Payments__VnPay__RefundUrl=http://127.0.0.1:2526/refund`. Nhóm kiểm: hoàn toàn bộ và một phần, mã yêu cầu cố định, lỗi tạm thời rồi tự thử lại, cổng từ chối (91) và yêu cầu trùng (94)
chuyển xử lý tay, phản hồi sai chữ ký, quản lý duyệt tay qua cổng và xác nhận hoàn ngoài cổng, từ chối hoàn. Cần cả `VNPAY_SECRET`. Nhóm chạy hơn 1 phút vì chờ vòng thử lại.

Đặt thêm `REFUND_TIERS=1` khi backend chạy với `Refunds__Tiers__0__HoursBefore=24 Refunds__Tiers__0__Percent=100 Refunds__Tiers__1__HoursBefore=2 Refunds__Tiers__1__Percent=50`
để kiểm chính sách hoàn theo giờ (còn 5 giờ hoàn 50%, dưới 2 giờ không hoàn, còn 30 giờ hoàn 100%).

## Nhóm G5 – chuyển khoản ngân hàng (VietQR)

Đặt `BANK_WEBHOOK_KEY` và chạy backend với `BankTransfer__BankId=MB BankTransfer__BankName="MB Bank" BankTransfer__AccountNumber=0123456789 BankTransfer__AccountName="NGUYEN VAN TEST" BankTransfer__WebhookApiKey=<khóa>`
(tài khoản giả, không dùng tài khoản thật). Nhóm kiểm: mã VietQR và nội dung chuyển khoản, quyền xem và xác nhận, xác nhận tay, chống dùng lại mã giao dịch ngân hàng,
tiền về trễ mở khoản hoàn, webhook (khóa API, lệch số tiền, nội dung bị chèn dấu cách, gửi trùng, gọi đồng thời, giao dịch quá hạn được mở lại) và job nhả giữ chỗ (mất tới ~80 giây).
Dùng chuyến riêng trên xe 4 để không tranh ghế với nhóm khác.

## Nhóm G6 – bảng giá vé theo km hành trình

Không cần cấu hình thêm. Nhóm kiểm: km từng trạm tự tính, phân quyền thêm/sửa/xóa bậc giá, dữ liệu sai (km ngược, giá 0), chống chồng lấn bậc, mốc ranh giới (đúng 12 km thuộc bậc 8-12),
giá mọi chặng và giá đối tượng ưu đãi, tìm chuyến trả `distanceKm` và giá theo km, đặt vé tính tiền theo km của chặng khách chọn, xóa hết bậc thì quay về giá cố định cũ của tuyến, tuyến mới tự tính km.
Nhóm chạy cuối cùng, tự lập rồi xóa bảng giá nên không đổi giá của các nhóm khác.
