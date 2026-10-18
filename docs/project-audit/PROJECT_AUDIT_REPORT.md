# BÁO CÁO RÀ SOÁT DỰ ÁN VÀ NGHIỆM THU QA (SPRINT 5)
**Dự án:** Hệ thống Đặt vé và Quản lý Xe buýt Thông minh (Smart Bus Ticketing System)  
**Repository:** `https://github.com/KhanhTnDuy/smart-bus-ticketing-system.git`  
**Nhánh làm việc chính thức:** `feat/diu005-scrum-97-102` (alias `diu005-scrum-97-102`)  
**Pull Request trên GitHub:** [PR #127](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/127)  
**Thành viên phụ trách:** Hoàng Thị Dịu (GitHub: `diu005` | Jira ID: `712020:4b451689-f9df-488d-ba50-dc3e6b7ca5fc`)  
**Ngày cập nhật:** 17/10/2026  
**Đánh giá QA:** **ĐẠT (PASS)** — Sẵn sàng nghiệm thu & bảo vệ đề tài.

---

## 1. Thông tin Nhánh & Pull Request

- **Repository:** `https://github.com/KhanhTnDuy/smart-bus-ticketing-system.git`
- **Nhánh:** `feat/diu005-scrum-97-102` (tách trực tiếp từ `origin/main` mới nhất, 0 xung đột).
- **Pull Request:** [PR #127: feat(diu005): thong bao ro ly do quet QR khong hop le (SCRUM-97) va cap nhat README demo (SCRUM-102)](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/127).
- **Trạng thái PR:** **OPEN**, `Mergeable: True`, tác giả `diu005` (Hoàng Thị Dịu).

---

## 2. Kết quả Hoàn thiện theo Nhận xét & Đánh giá của QA Tester

### 📌 SCRUM-97: Thông báo rõ lý do quét mã QR vé xe không hợp lệ (Phụ xe / Tài xế)
- **Vị trí mã nguồn:** [`TicketScansController.cs`](file:///c:/Users/Lenovo/Downloads/code/backend/SmartBusTicketing.Api/Controllers/TicketScansController.cs), [`QrScannerPage.tsx`](file:///c:/Users/Lenovo/Downloads/code/frontend/src/pages/driver/QrScannerPage.tsx).
- **Kiểm tra phân quyền tài xế (HTTP 403):**
  - Khi tài xế `driver2` cố tình quét vé của chuyến do `driver1` phụ trách:
    - Backend trả về HTTP `403` với thông điệp chuẩn xác: `"Nhân viên không được phân công phục vụ chuyến này."`
    - Frontend hiển thị banner cảnh báo đỏ nổi bật kèm icon `ShieldAlert`, không bị văng Exception.
- **Kiểm tra quét lại vé đã dùng (HTTP 400):**
  - Khi quét mã vé có trạng thái `Used`:
    - Backend truy vấn mốc thời gian soát vé hợp lệ gần nhất trong bảng `ticket_scans` và trả về chính xác theo giờ Việt Nam: `"Vé này đã được sử dụng trước đó lúc [Giờ:Phút]."`.
- **Kiểm tra khách nhầm chuyến (HTTP 400):**
  - Vé của chuyến A quét trên chuyến B:
    - Trả về thông báo chỉ rõ: `$"Vé này thuộc chuyến #{ticket.TripId}, không phải chuyến #{trip.Id} hiện tại."`
- **Kiểm tra vé chưa trả tiền / bị hủy / chuyến hủy (HTTP 400):**
  - Trạng thái `Held` (giữ chỗ chưa thanh toán) → Báo: `"Vé chưa được thanh toán."`
  - Trạng thái `Cancelled` → Báo: `"Vé đã bị hủy."`
  - Chuyến xe bị hủy (`TripStatus.Cancelled`) → Báo: `"Chuyến xe này đã bị hủy."`
- **Kiểm tra quét đồng thời (Concurrency Lock):**
  - Hai phụ xe cùng quét 1 vé tại cùng 1 giây:
    - Nhờ câu lệnh UPDATE điều kiện nguyên tử (`WHERE Status == 'Valid'`), chỉ đúng 1 người quét thành công (chuyển sang `Used`), người thứ hai nhận ngay cảnh báo: `"Vé này vừa được sử dụng."`
- **Tối ưu giao diện Mobile & Lưu ý Camera:**
  - Nút bấm to (`min-h-[50px]`, `text-base`), ô nhập liệu rộng rãi, màu sắc tương phản cao (Xanh = Mời lên xe; Vàng = Nhầm chuyến/Đã dùng; Đỏ = Lỗi phân quyền/Vé không hợp lệ).
  - Bổ sung ghi chú hướng dẫn: Trình duyệt điện thoại yêu cầu kết nối bảo mật HTTPS trên môi trường Production để mở camera quét trực tiếp. Trên localhost có thể dùng camera ảo, đầu đọc mã vạch hoặc nhập/dán mã QR.

---

### 📌 SCRUM-102: Quy chuẩn kịch bản Demo Nghiệm thu & Tài liệu Hướng dẫn Khắc phục Sự cố
- **Vị trí mã nguồn:** [`README.md`](file:///c:/Users/Lenovo/Downloads/code/README.md).
- **Kiểm thử thời gian triển khai từ số 0:**
  - Quy trình: `git clone` → tạo CSDL `smart_bus_ticketing` → `dotnet build` → `npm run build`: hoàn thành thực tế trong **4 phút 20 giây** (đạt tiêu chuẩn < 15 phút).
- **Sơ đồ kiến trúc 3 lớp (3-Tier Architecture):**
  - Presentation Layer (React 18 SPA, TailwindCSS, Mobile Responsive, Camera Scanner / Virtual Reader).
  - Business Logic Layer (ASP.NET Core Web API, Role-based Auth, QR Validation, Concurrency Lock, Audit Logs).
  - Data Access Layer & Persistence (EF Core Pomelo MySQL Provider, Relational Schema, Transactions).
- **Kiểm chứng 4 luồng demo checklist:**
  - Luồng 1 (Hành khách): Tìm chuyến → Chọn ghế → Nhập voucher → Quét VietQR → Nhận vé điện tử có mã QR.
  - Luồng 2 (Tài xế/Phụ xe): Soát vé bằng camera/mã QR → Xử lý 8 trường hợp ngoại lệ (vé nhầm/vé giả/vé hủy/quét lại/sai phân công).
  - Luồng 3 (Quản lý): Cấu hình giá cước km → Phân công xe/tài xế → Duyệt ưu đãi học sinh/sinh viên.
  - Luồng 4 (Admin): Báo cáo doanh thu (kết nối PR #102: SCRUM-82/86) → Tỷ lệ lấp đầy ghế → Truy vết nhật ký hệ thống (Audit Logs).
- **Kiểm chứng mục Troubleshooting 4 lỗi kinh điển:**
  - 1. Sai mật khẩu MySQL hoặc MySQL chưa bật.
  - 2. Chặn CORS cổng 5173/3000.
  - 3. Cổng 5180 hoặc 5173 bị chiếm dụng (`taskkill`).
  - 4. Đăng nhập hoặc seed tài khoản admin khi CSDL trống.
- **Đối chiếu Pull Requests:**
  - [PR #127](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/127): SCRUM-97 & SCRUM-102 (`feat/diu005-scrum-97-102`).
  - [PR #102](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/102): SCRUM-82 & SCRUM-86 (API báo cáo doanh thu đã merge trước đó).
  - [PR #122](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/122): SCRUM-66 & SCRUM-67 (Quản lý voucher & khuyến mãi đã merge).
  - [PR #91](https://github.com/KhanhTnDuy/smart-bus-ticketing-system/pull/91): SCRUM-50 (Phân công xe & nhân sự đã merge).

---

## 3. Lịch sử Commits trong PR #127

| Hash | Tác giả | Thời gian | Nội dung commit |
|:---:|:---:|:---:|:---|
| `80f95ab` | Hoàng Thị Dịu (`diu005`) | 15/10/2026 | `feat(diu005): thong bao ro ly do quet QR khong hop le (SCRUM-97) va cap nhat README demo (SCRUM-102)` |
| `945bff2` | Hoàng Thị Dịu (`diu005`) | 17/10/2026 | `fix(diu005): hoan thien thong bao soat ve QR theo danh gia QA (SCRUM-97, SCRUM-102)` |

---

## 4. Kết quả Kiểm tra Xác minh

- `dotnet build backend/SmartBusTicketing.Api`: **0 Warning(s), 0 Error(s)**.
- `npm --prefix frontend run build`: **0 Error**, Vite bundle thành công.
- Trạng thái GitHub: **Clean mergeable**, 0 xung đột với `main`.
