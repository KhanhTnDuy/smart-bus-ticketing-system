# Kiểm tra VietQR không cần MySQL

Chạy từ thư mục gốc repo với .NET SDK 10:

```powershell
dotnet run --project tests/BankTransferChecks
```

Kiểm tra cấu hình người nhận, số tiền/nội dung trong URL VietQR, chuẩn hóa mã,
xác thực và các payload webhook thiếu tài khoản, sai số tiền hoặc thiếu mã giao dịch.
Các trường hợp bị từ chối phải dừng trước khi truy cập CSDL hoặc chốt thanh toán.

Đây là kiểm tra đầu vào; kiểm tra việc chốt giao dịch, vé, hóa đơn, hoàn tiền và
nội dung chứa nhiều mã thanh toán cần MySQL và nhóm G5 trong `tests/regression/regress.mjs`.
