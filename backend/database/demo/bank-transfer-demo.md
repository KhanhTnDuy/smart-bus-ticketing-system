# Tài khoản nhận tiền cho demo chuyển khoản (VietQR)

Số tài khoản nhận tiền **không lưu trong repo**. Chủ dự án tự đặt vào backend bằng user-secrets (chạy trong `backend/SmartBusTicketing.Api`):

```bash
dotnet user-secrets set "BankTransfer:BankId" "<mã BIN ngân hàng, vd 970415 là VietinBank>"
dotnet user-secrets set "BankTransfer:BankName" "<tên ngân hàng>"
dotnet user-secrets set "BankTransfer:AccountNumber" "<số tài khoản nhận tiền>"
dotnet user-secrets set "BankTransfer:AccountName" "<TÊN CHỦ TÀI KHOẢN KHÔNG DẤU>"
```

Chạy backend với `ASPNETCORE_ENVIRONMENT=Development` để nhận các giá trị này. Mã QR hiện ngay trong trang thanh toán; quản lý xác nhận tiền đã về ở trang "Xác nhận chuyển khoản".

## Leader kiểm thử

Chạy migrations trước (`dotnet ef database update` trong thư mục API). Các thay đổi
kiểm tra VietQR không thêm bảng hoặc cột mới.

Trên PowerShell, trong thư mục API:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --no-launch-profile --urls http://localhost:5180
```

Chạy frontend ở terminal khác (`cd frontend`, `npm ci`, `npm run dev`).

1. Đăng nhập Hành khách, chọn chuyến còn ghế và tiếp tục thanh toán.
2. Chọn **Chuyển khoản ngân hàng**. Kiểm tra tên ngân hàng, số tài khoản,
   chủ tài khoản, số tiền đúng bằng tổng đơn và nội dung riêng bắt đầu bằng `SBV`.
   Quét QR để đối chiếu các trường tự điền trong app ngân hàng.
3. Đăng nhập Quản lý ở trình duyệt khác, mở `/manager/bank-transfers`.
   Tìm đúng mã nội dung chuyển khoản. Chỉ bấm **Đã nhận tiền** sau khi đối chiếu
   sao kê; nhập mã giao dịch trên sao kê để tránh dùng lại khoản tiền.
4. Khi xác nhận trong 10 phút giữ ghế, giao dịch thành `Success`, lượt đặt
   `Confirmed`, vé `Valid`, có hóa đơn. Màn hình hành khách hỏi lại sau mỗi 4 giây.
5. Xác nhận lại hoặc dùng lại mã sao kê cho đơn khác phải trả `409`.
   Nếu đơn đã hết hạn/hủy, hệ thống ghi nhận tiền và mở yêu cầu hoàn, không phát hành vé.

Không có thông tin ngân hàng thật thì dùng tài khoản giả ở hướng dẫn G5 để kiểm
tra phần mềm; không chuyển tiền vào tài khoản giả.

## Webhook SePay (tùy chọn)

```powershell
dotnet user-secrets set "BankTransfer:WebhookApiKey" "<khóa riêng cho webhook>"
```

Tạo webhook **Có tiền vào**, URL công khai trỏ tới
`POST /api/payments/bank-transfer/webhook`, xác thực API Key và tiền tố thanh toán `SBV`.
Header: `Authorization: Apikey <khóa riêng cho webhook>`.
Xem [tài liệu SePay](https://docs.sepay.vn/tich-hop-webhooks.html).

Chỉ tự chốt khi tài khoản nhận khớp, `id` giao dịch là số nguyên dương, số tiền
nguyên dương khớp đơn và nội dung chỉ xác định được một giao dịch trong hệ thống.
Payload thiếu tài khoản/id hoặc chứa nhiều mã thanh toán sẽ trả
`{ "success": true, "matched": false, "reason": "..." }`; quản lý đối soát tay.
Số tiền lệch được thông báo cho quản lý. Webhook chưa cấu hình trả `404`, sai khóa trả `401`.

`BankTransfer:MemoPrefix` phải gồm 2–12 chữ/số, bắt đầu bằng chữ; không có dấu cách.
`QrTemplate` hỗ trợ `compact2`, `compact`, `qr_only`, `print`.
Cấu hình thiếu hoặc không hợp lệ khiến khởi tạo thanh toán trả `503`.

Kiểm tra nhanh không cần CSDL: `dotnet run --project tests/BankTransferChecks`
(từ gốc repo). Kiểm tra tích hợp đầy đủ: xem nhóm G5 trong
`tests/regression/README.md`; chỉ chạy trên CSDL kiểm thử.
