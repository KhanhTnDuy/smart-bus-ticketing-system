# Tài khoản nhận tiền cho demo chuyển khoản (VietQR)

Số tài khoản nhận tiền **không lưu trong repo**. Chủ dự án tự đặt vào backend bằng user-secrets (chạy trong `backend/SmartBusTicketing.Api`):

```bash
dotnet user-secrets set "BankTransfer:BankId" "<mã BIN ngân hàng, vd 970415 là VietinBank>"
dotnet user-secrets set "BankTransfer:BankName" "<tên ngân hàng>"
dotnet user-secrets set "BankTransfer:AccountNumber" "<số tài khoản nhận tiền>"
dotnet user-secrets set "BankTransfer:AccountName" "<TÊN CHỦ TÀI KHOẢN KHÔNG DẤU>"
```

Chạy backend với `ASPNETCORE_ENVIRONMENT=Development` để nhận các giá trị này. Mã QR hiện ngay trong trang thanh toán; quản lý xác nhận tiền đã về ở trang "Xác nhận chuyển khoản".
