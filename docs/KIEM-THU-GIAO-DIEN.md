# Kiểm thử giao diện 4 luồng (SCRUM-100)

Kiểm thử trên trình duyệt thật (Chrome) với frontend `npm run dev` nối backend Development và CSDL dev; dữ liệu đối chiếu bằng truy vấn CSDL sau mỗi luồng.
Tài khoản dùng là tài khoản demo của dự án (`passenger1`, `driver1`, `manager`). Lần chạy ngày 18/10/2026 trên `main`.

Chuẩn bị: backend chạy `Payments__Simulator__Enabled=true` (thanh toán MoMo giả lập), một chuyến tương lai trên tuyến T01 có xe, tài xế `driver1`
(tạo bằng `POST /api/assignments` hoặc trang Phân công), hai vé được thanh toán cho ghế A1, B1.

| # | Luồng | Vai | Các bước trên giao diện | Kết quả | Đối chiếu CSDL |
|---|---|---|---|---|---|
| 1 | Đặt vé | Hành khách | `/passenger/booking`: chọn điểm đi, điểm đến, ngày → "Tra cứu" → "Đặt vé" → chọn ghế A1, B1 → "Tiếp tục thanh toán" | Đạt: hiện 1 chuyến 47/47 ghế, tổng tạm tính 14.000 VNĐ, sang bước thanh toán | Ghế được giữ (vé `Held`) |
| 2 | Thanh toán | Hành khách | Chọn "Ví điện tử MoMo" → "Xác nhận thanh toán 14.000 VNĐ" | Đạt: trang vé điện tử có 2 mã QR (ghế A1, B1) | Giao dịch `Success` 14.000, hai vé `Valid`, đặt chỗ `Confirmed`, 1 hóa đơn, thông báo "Thanh toán thành công" |
| 3 | Quét QR | Tài xế | `/driver/qr-scanner`: chuyến được chọn sẵn là chuyến gần giờ nhất → dán mã QR → Enter; quét lại cùng mã | Đạt: "Hợp lệ — Vé hợp lệ. Mời hành khách lên xe", lần hai "Đã sử dụng"; lịch sử quét ghi cả hai lần | Vé A1 chuyển `Used` |
| 4 | Hoàn tiền | Hành khách → Quản lý | Khách: `/passenger/tickets` → "Hủy vé" ghế B1 + lý do → vé hiện "Chờ duyệt hủy vé". Quản lý: `/manager/ticket-requests` → "Duyệt yêu cầu"; `/manager/refunds` → "Duyệt hoàn tiền" → "Xác nhận đã hoàn tiền" | Đạt: trạng thái "Đã hoàn tiền", ô "Đã hoàn" 7.000 đ | Vé B1 `Cancelled`, hoàn tiền `Success` 7.000, khách nhận thông báo "Yêu cầu hủy vé đã được duyệt" và "Đã hoàn tiền" |

Ảnh chụp từng bước nằm cạnh tệp này: `kiem-thu-giao-dien/`.

## Lỗi tìm thấy khi kiểm thử và đã sửa

- Trang quét QR của tài xế chọn sẵn chuyến **đầu danh sách** là chuyến cũ nhất chưa đóng (TRIP-1, 5/10) chứ không phải chuyến sắp chạy, nên quét vé của chuyến hôm nay bị báo "sai chuyến"
  nếu tài xế không đổi ô chọn. Đã sửa: chọn sẵn chuyến có giờ chạy gần hiện tại nhất (`frontend/src/pages/driver/QrScannerPage.tsx`, `frontend/src/hooks/useTripOptions.ts`).

## Chưa kiểm tra

Thanh toán VNPay và chuyển khoản ngân hàng trên giao diện (cần cổng sandbox hoặc tài khoản nhận tiền; phần API đã có test tự động trong nhóm G2, G5 của `tests/regression/regress.mjs`),
quét bằng camera điện thoại (cần HTTPS), giao diện điện thoại.
