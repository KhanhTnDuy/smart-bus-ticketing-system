# Theo dõi lỗi và danh sách lỗi đã biết (SCRUM-101)

Cập nhật: 17/10/2026.

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
| 2 | Dữ liệu demo cố định ngày 12/10/2026: sau ngày đó mọi chuyến thành quá khứ, không đặt vé thử được và phép kiểm "đặt chuyến đã khởi hành" sai lệch | Nặng | Đang xử lý — SCRUM-87 | Tạm thời dời ngày bằng SQL khi chạy thử (xem mục dưới) |
| 3 | Thẻ "Biểu giá vé = 0" trên trang tổng quan | Nhẹ | **Không còn tái hiện 17/10** | Trang tổng quan của Admin hiện 6 bậc giá, khớp `GET /api/distance-fares`. Chỉ hiện 0 khi CSDL chưa nạp `seed_bang_gia_km.sql` |
| 4 | Cảnh báo lint `react(set-state-in-effect)` ở vài trang (DataContext, StopManagementPage, DiscountVerificationPage...) | Nhẹ | Chưa xử lý | Không ảnh hưởng chạy; dọn khi có thời gian |
| 5 | Biến import thừa (`TicketStatus`, `Filter`, `Badge`, `Clock`) ở vài trang quản lý | Nhẹ | Chưa xử lý | `npm run lint` liệt kê đủ |

## Lỗi nghiêm trọng còn tồn đọng

**Không có.** Căn cứ, chạy ngày 17/10/2026 trên CSDL dev:

| Bộ kiểm thử | Kết quả |
|---|---|
| `tests/regression/regress.mjs` (luồng chính + ma trận quyền 5 vai trò) | 270/271 đạt |
| `tests/regression/seat-lock.mjs` (giữ, nhả, tranh ghế, hoàn tiền) | 35/35 đạt |
| `tests/regression/invoices.mjs` (hóa đơn, đối chiếu doanh thu) | 19/19 đạt |
| `tests/config/payment-simulator-guard.mjs` | 3/3 đạt |
| `tests/config/deploy-config.mjs` | 5/5 đạt |

Phép kiểm duy nhất không đạt là *"đặt chuyến đã khởi hành -> 400"*, do dữ liệu demo đã bị dời ngày sang tương lai
để chạy thử nên không còn chuyến nào đã khởi hành (lỗi #2 ở trên, không phải lỗi của ứng dụng). Trên dữ liệu demo
nguyên bản, phép kiểm này đạt.

Không có phép kiểm nào trả HTTP 500, sai số tiền hay lệch quyền.

## Chạy lại bộ kiểm thử trên dữ liệu demo

Dữ liệu demo cố định ngày 12/10/2026 nên cần dời sang tương lai trước khi chạy, và trả lại sau:

```bash
# dời 20 ngày để có chuyến ở tương lai
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -u root -D smart_bus_ticketing \
  -e "update trips set DepartureAt = date_add(DepartureAt, interval 20 day);"

CONFIRM_TEST_DB=1 node tests/regression/regress.mjs
CONFIRM_TEST_DB=1 node tests/regression/seat-lock.mjs
CONFIRM_TEST_DB=1 node tests/regression/invoices.mjs

# trả lại ngày gốc
mysql --default-character-set=utf8mb4 -h 127.0.0.1 -u root -D smart_bus_ticketing \
  -e "update trips set DepartureAt = date_sub(DepartureAt, interval 20 day);"
```

Cách bền hơn nằm ở SCRUM-87 (sinh dữ liệu demo theo ngày hiện tại).
