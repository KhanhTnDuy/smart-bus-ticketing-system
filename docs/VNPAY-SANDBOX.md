# Chạy thanh toán VNPay trên sandbox thật

Hướng dẫn nối hệ thống với **sandbox VNPay** để thanh toán và hoàn tiền thật (tiền thử, không phát sinh giao dịch thật). Hệ thống chạy được cả khi không có khóa: khi đó chỉ dùng được bộ giả lập (MoMo, ZaloPay) và chuyển khoản, còn chọn VNPay sẽ báo "Cổng VNPay chưa được cấu hình".

## 1. Lấy khóa sandbox

1. Đăng ký merchant sandbox tại <https://sandbox.vnpayment.vn/devreg/>.
2. VNPay gửi email gồm `TmnCode` (mã website) và `HashSecret` (chuỗi bí mật tạo chữ ký). Đăng nhập trang quản trị merchant <https://sandbox.vnpayment.vn/merchantv2/> bằng tài khoản trong email nếu cần đặt địa chỉ IPN (mục 5).

Không đặt hai giá trị này vào file nằm trong git (`appsettings*.json`). `HashSecret` lộ ra thì người khác ký được giao dịch giả.

## 2. Đặt khóa cho backend

Dùng user-secrets (lưu ngoài thư mục dự án, không bị commit):

```bash
cd backend/SmartBusTicketing.Api
dotnet user-secrets set "Payments:VnPay:TmnCode" "<TmnCode>"
dotnet user-secrets set "Payments:VnPay:HashSecret" "<HashSecret>"
```

Hoặc biến môi trường `Payments__VnPay__TmnCode` và `Payments__VnPay__HashSecret`. Nhiều máy dev dùng chung một `TmnCode` thì mỗi máy nên đặt `Payments:VnPay:TxnRefPrefix` riêng, vì VNPay bắt mã giao dịch duy nhất theo `TmnCode`.

Khởi động backend (`dotnet run --urls http://localhost:5180`) và frontend (`npm run dev`) như trong README. Chỉ chạy trên CSDL dev/thử: kịch bản bên dưới tạo vé và giao dịch thật trong CSDL.

## 3. Kiểm tra bằng kịch bản

```bash
npm run test:vnpay-sandbox              # đặt vé, kiểm tra sandbox chấp nhận chữ ký, chờ bạn trả tiền, kiểm tra kết quả
npm run test:vnpay-sandbox -- --refund  # thêm bước hủy vé và hoàn tiền qua API hoàn tiền của VNPay
```

Kịch bản làm lần lượt:

1. Đặt một ghế bằng tài khoản `passenger1` rồi bắt đầu thanh toán VNPay.
2. Gọi thử URL thanh toán vào sandbox. Sai chữ ký, sai `TmnCode` hay sai định dạng thì sandbox chuyển ngay sang trang lỗi, kịch bản báo mã và cách sửa. Bước này không cần nhập thẻ.
3. In URL thanh toán. **Bạn mở URL đó trong trình duyệt đã đăng nhập `passenger1` ở frontend** (<http://localhost:5173>) và trả tiền ở trang VNPay (mục 4). Nhập thẻ là việc làm tay vì đó là trang của VNPay.
4. Chờ giao dịch được chốt, rồi kiểm tra giao dịch `Success`, có hóa đơn, vé `Valid` có mã QR.
5. Với `--refund`: hành khách xin hủy vé, quản lý duyệt, chờ hệ thống hoàn tiền qua API VNPay (vòng nền chạy mỗi 10 giây).

Tài khoản và mật khẩu mặc định theo bộ demo; đổi bằng `PASSENGER_USER`, `MANAGER_USER`, `SEED_PASSWORD`. Chọn chuyến khác bằng `--from` và `--to` (mã trạm), đổi thời gian chờ bằng `--wait <phút>`.

Thử tay trên giao diện cũng được: đặt vé, chọn **Cổng VNPAY-QR**, xác nhận thanh toán.

## 4. Thẻ thử của sandbox

Ở trang VNPay chọn **Thẻ nội địa và tài khoản ngân hàng → NCB** rồi nhập (theo tài liệu sandbox VNPay, kiểm tra lại tại <https://sandbox.vnpayment.vn/apis/vnpay-demo/> nếu sandbox đổi):

| Trường | Giá trị |
|---|---|
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| Mật khẩu OTP | `123456` |

Muốn thử thanh toán thất bại: bấm hủy ở trang VNPay (mã 24). Hệ thống giữ chỗ và trang kết quả có nút **Thanh toán lại**.

## 5. Nhận IPN (tùy chọn)

IPN là lời gọi VNPay → máy chủ, là nguồn xác nhận chính thức. Sandbox không gọi được vào `localhost`, nên ở máy dev giao dịch vẫn được chốt qua ReturnUrl (trình duyệt quay về `/passenger/payment-result`) cùng một đường xử lý. Muốn thử IPN thật:

```bash
bash backend/scripts/ipn-tunnel.sh        # mở đường hầm công khai (cần ngrok hoặc cloudflared), in địa chỉ IPN
```

Dán địa chỉ IPN (`https://<đường hầm>/api/payments/vnpay/ipn`) vào trang quản trị merchant của VNPay, rồi chạy lại mục 3. Đường hầm đưa backend ra internet nên chỉ mở khi đang thử và tắt ngay sau đó. Kiểm chứng đường IPN từ ngoài vào: `CONFIRM_TEST_DB=1 PUBLIC_BASE_URL=https://<đường hầm> IPN_PORT=5180 node tests/payments/vnpay-ipn-e2e.mjs`.

## 6. Lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Chọn VNPay báo "Cổng VNPay chưa được cấu hình" | Chưa đặt `TmnCode`/`HashSecret`, hoặc backend chưa khởi động lại sau khi đặt. |
| Trang lỗi sandbox, `code=70` | Sai chữ ký: `HashSecret` sai, thừa dấu cách hoặc không thuộc `TmnCode` này. |
| Trang lỗi sandbox, `code=02` | `TmnCode` không hợp lệ. |
| Trang lỗi sandbox, `code=03` | Dữ liệu gửi sang sai định dạng. |
| Trang VNPay báo "số dư không khả dụng" / không đủ số dư (mã `51`) | Thông báo do ngân hàng giả lập NCB của sandbox trả về, không phải do API của hệ thống hay do giới hạn số lượt gọi (giới hạn lượt sẽ báo lỗi/mã khác). Thẻ thử là thẻ công khai dùng chung nên số dư giả lập có thể cạn, hoặc đã nhập nhầm thẻ cố ý báo thiếu số dư trong tài liệu sandbox. Thử lại với thẻ ở mục 4 hoặc thẻ khác trên <https://sandbox.vnpayment.vn/apis/vnpay-demo/>. **Bấm quay lại cửa hàng** ở trang lỗi để hệ thống nhận mã, giữ chỗ và hiện nút Thanh toán lại. |
| Muốn biết cổng đã báo mã nào cho một giao dịch | Admin vào **Nhật ký hệ thống**, tìm `Nhận kết quả VNPay` (kèm mã giao dịch `TxnRef`): chi tiết ghi nguồn (IPN hoặc ReturnUrl), mã phản hồi và kết quả xử lý, kể cả kết quả về muộn sau khi giao dịch đã hết hạn. Lý do thất bại của giao dịch cũng kèm `(mã VNPay xx)`. Không có dòng nào nghĩa là trình duyệt chưa quay về hệ thống (đóng trang VNPay giữa chừng) nên giao dịch chỉ hết hạn sau thời gian chờ. |
| Trả tiền xong nhưng kịch bản vẫn chờ | Trình duyệt chưa đăng nhập hành khách nên trang kết quả bị chuyển về trang đăng nhập và không chốt giao dịch. Đăng nhập rồi mở lại địa chỉ đã quay về, hoặc xem **Lịch sử thanh toán**. |
| Hoàn tiền lỗi `403 Forbidden` | Tường lửa `merchant_webapi` của VNPay chặn yêu cầu không có header `User-Agent`. Backend đã đặt sẵn `User-Agent` cho client hoàn tiền. |
| Hoàn tiền báo "sai chữ ký" dù VNPay trả mã `00` | Chữ ký phản hồi hoàn tiền gồm đúng 13 trường (từ `vnp_ResponseId` đến `vnp_OrderInfo`), đã đối chiếu với phản hồi sandbox thật. Khoản hoàn đã được hoàn ở phía VNPay, chỉ cần đối soát giao dịch hoàn trên trang merchant. |
| Hoàn tiền báo "sai chữ ký (mã 94)" | VNPay báo `Request is duplicated`: yêu cầu hoàn này đã được nhận trước đó. Phản hồi lỗi không có chữ ký. Đối soát trên trang merchant trước khi xử lý tay. |
| Hoàn tiền báo cần xử lý tay, sandbox không tìm thấy giao dịch gốc | Mặc định `Payments:VnPay:RefundDateSource=Create` đã hoàn thành công trên sandbox. Nếu sandbox đổi hành vi, thử đặt thành `Pay`. |
