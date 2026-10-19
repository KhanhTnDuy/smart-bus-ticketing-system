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
| Trả tiền xong nhưng kịch bản vẫn chờ | Trình duyệt chưa đăng nhập hành khách nên trang kết quả bị chuyển về trang đăng nhập và không chốt giao dịch. Đăng nhập rồi mở lại địa chỉ đã quay về, hoặc xem **Lịch sử thanh toán**. |
| Hoàn tiền báo cần xử lý tay, sandbox không tìm thấy giao dịch gốc | Đổi `Payments:VnPay:RefundDateSource` từ `Create` sang `Pay` (tài liệu VNPay chưa rõ dùng ngày nào). |
