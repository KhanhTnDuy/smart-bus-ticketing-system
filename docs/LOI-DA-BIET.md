# Theo dõi lỗi và danh sách lỗi đã biết (SCRUM-101)

Cập nhật: 18/10/2026.

## Cách báo một lỗi

Mỗi lỗi là **một work item Jira riêng**, gắn nhãn `bug`, đặt trong sprint đang chạy. Phần mô tả theo đúng bốn mục:

```
Môi trường: backend Development / Production, trình duyệt, tài khoản và vai trò
Bước tái hiện:
  1. ...
  2. ...
Kết quả thực tế: (kèm mã HTTP, thông báo lỗi, số tiền sai, ảnh chụp)
Kết quả mong đợi:
```

Mức độ, để biết lỗi nào chặn demo:

| Mức | Nghĩa | Xử lý |
|---|---|---|
| **Nghiêm trọng** | HTTP 500, sai số tiền, lệch quyền (vai trò xem hoặc sửa được thứ không thuộc về mình) | Sửa trước khi demo, không được trượt sang danh sách dưới |
| **Nặng** | Luồng chính làm được nhưng sai dữ liệu hiển thị | Sửa trong sprint |
| **Nhẹ** | Giao diện, chữ nghĩa, tiện dụng | Ghi vào danh sách lỗi đã biết |

Trước khi đóng một lỗi, chạy lại bộ hồi quy (`tests/regression/regress.mjs`) và ghi số phép kiểm đạt vào Jira.

## Lỗi đã biết

| # | Lỗi | Mức | Tình trạng | Ghi chú |
|---|---|---|---|---|
| 1 | Bộ kiểm thử gửi truy vấn SQL sai bảng mã: mọi điều kiện có chữ tiếng Việt (vd. `Action='Thêm bậc giá theo km'`) không khớp dòng nào, làm phép kiểm nhật ký báo lỗi oan và có thể làm phép kiểm khác "đạt" nhầm | Nặng | **Đã sửa 17/10** | Thêm `--default-character-set=utf8mb4` vào `tests/regression/lib.mjs` và `regress.mjs` |
| 2 | Dữ liệu demo cố định ngày chuyến (hết chuyến tương lai sau vài ngày) nên không đặt vé thử được trên dữ liệu demo gốc | Nặng | **Bộ kiểm thử đã hết phụ thuộc** (18/10); dữ liệu demo còn cố định, xử lý ở SCRUM-87 | Kịch bản kiểm thử tự dựng chuyến tương lai và tính ngày từ hôm nay, nên chạy được trên dữ liệu demo cũ; riêng việc dùng demo bằng tay vẫn cần chuyến tương lai (tạo ở trang Phân công) |
| 3 | Thẻ "Biểu giá vé = 0" trên trang tổng quan | Nhẹ | **Không còn tái hiện 17/10** | Trang tổng quan của Admin hiện 6 bậc giá, khớp `GET /api/distance-fares`. Chỉ hiện 0 khi CSDL chưa nạp `seed_bang_gia_km.sql` |
| 4 | Cảnh báo lint `react(set-state-in-effect)` ở vài trang (DataContext, StopManagementPage, DiscountVerificationPage...) | Nhẹ | Chưa xử lý | Không ảnh hưởng chạy; dọn khi có thời gian |
| 5 | Biến import thừa (`TicketStatus`, `Filter`, `Badge`, `Clock`) ở vài trang quản lý | Nhẹ | Chưa xử lý | `npm run lint` liệt kê đủ |

## Lỗi nghiêm trọng còn tồn đọng

**Không có.** Căn cứ, chạy ngày 18/10/2026 trên `main` (sau khi gộp #131-#134, #141) bằng `CONFIRM_TEST_DB=1 npm test`:

| Bộ kiểm thử | Kết quả |
|---|---|
| `tests/config/payment-simulator-guard.mjs` (Production không bật được giả lập) | 3/3 đạt |
| `tests/config/deploy-config.mjs` (khởi động chỉ bằng biến môi trường, thiếu cấu hình thì dừng) | đạt |
| `tests/regression/seat-lock.mjs` (giữ, nhả, tranh ghế, sơ đồ ghế Held/Sold) | 36/36 đạt |
| `tests/regression/refund-flow.mjs` (hoàn tiền nhiều khách) | 42/42 đạt |
| `tests/regression/permissions.mjs` (ma trận quyền 114 endpoint x 5 vai) | 21/21 đạt |
| `tests/regression/invoices.mjs` (hóa đơn, đối chiếu doanh thu) | 19/19 đạt |
| `tests/regression/regress.mjs` (luồng chính, thanh toán VNPay, chuyển khoản, hoàn tiền, giá km, voucher) | 524/524 đạt |
| `tests/payments/vnpay-ipn-e2e.mjs` (đường IPN VNPay, SCRUM-105) | 17/17 đạt |

Không có phép kiểm nào trả HTTP 500, sai số tiền hay lệch quyền.

## Chạy lại bộ kiểm thử

```bash
CONFIRM_TEST_DB=1 npm test                 # trên CSDL hiện tại
CONFIRM_TEST_DB=1 npm run test:reset-demo  # nạp lại dữ liệu demo rồi chạy
```

Chi tiết xem `tests/regression/README.md`.
