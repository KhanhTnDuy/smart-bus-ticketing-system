# Thiết kế cơ sở dữ liệu – Smart Bus Ticketing System

- **DBMS:** MySQL 8.0 (utf8mb4) · **Database:** `smart_bus_ticketing`
- **Script:** [`backend/database/schema.sql`](../../backend/database/schema.sql) — 27 bảng, 2 view báo cáo
- **Nguồn:** Product Backlog (24 user story, 7 epic) + model Java hiện có (`Role`, `FeedbackStatus`) + thiết kế `audit_logs`/`feedbacks` của thành viên C (nhánh `feature/thanh-vien-c`)

Chạy thử:

```bash
mysql -u root -p < backend/database/schema.sql
```

## 1. Tài khoản & ưu đãi (US17, US22, US23)

```mermaid
erDiagram
  ACCOUNTS {
    bigint id PK
    varchar username UK
    varchar password_hash
    varchar full_name
    varchar email UK
    varchar phone UK
    enum role "ADMIN MANAGER DRIVER CONDUCTOR PASSENGER"
    boolean active
  }
  AUDIT_LOGS {
    bigint id PK
    bigint account_id FK
    varchar username
    varchar action
    enum action_type "LOGIN LOGOUT CREATE UPDATE ..."
    varchar target_resource
    varchar ip_address
    enum status "SUCCESS FAILURE WARNING"
    datetime created_at
  }
  PASSENGER_TYPES {
    int id PK
    varchar code UK "STANDARD STUDENT ELDERLY WORKER"
    decimal discount_percent
  }
  PASSENGER_VERIFICATIONS {
    bigint id PK
    bigint account_id FK
    int passenger_type_id FK
    varchar document_url
    enum status "PENDING APPROVED REJECTED"
    bigint reviewed_by FK
    date valid_until
  }
  ACCOUNTS ||--o{ AUDIT_LOGS : "thao tác"
  ACCOUNTS ||--o{ PASSENGER_VERIFICATIONS : "gửi hồ sơ"
  ACCOUNTS |o--o{ PASSENGER_VERIFICATIONS : "duyệt"
  PASSENGER_TYPES ||--o{ PASSENGER_VERIFICATIONS : "loại"
```

- `role` thêm `CONDUCTOR` (phụ xe, US14–US15) — enum `Role` trong Java cần bổ sung.
- `audit_logs.username` được lưu riêng để nhật ký vẫn đọc được khi tài khoản bị xóa.

## 2. Tuyến, lịch trình & chuyến (US1, US2, US12, US13, US14)

```mermaid
erDiagram
  ROUTES {
    bigint id PK
    varchar code UK
    varchar name
    varchar start_point
    varchar end_point
    decimal distance_km
    boolean active
  }
  STOPS {
    bigint id PK
    varchar name
    decimal latitude
    decimal longitude
  }
  ROUTE_STOPS {
    bigint route_id PK,FK
    bigint stop_id PK,FK
    int stop_order UK
    int minutes_from_start
  }
  FARES {
    bigint id PK
    bigint route_id FK
    enum ticket_type "SINGLE MONTHLY"
    int passenger_type_id FK
    decimal price
    date effective_from
  }
  BUSES {
    bigint id PK
    varchar plate_number UK
    int capacity
    enum status "ACTIVE MAINTENANCE INACTIVE"
  }
  SEATS {
    bigint id PK
    bigint bus_id FK
    varchar seat_code
    int seat_row
    int seat_col
  }
  SCHEDULES {
    bigint id PK
    bigint route_id FK
    time first_departure
    time last_departure
    int frequency_minutes
    set days_of_week
  }
  TRIPS {
    bigint id PK
    bigint route_id FK
    bigint schedule_id FK
    bigint bus_id FK
    datetime departure_at
    enum status "SCHEDULED RUNNING DELAYED COMPLETED CANCELLED"
    int delay_minutes
  }
  TRIP_STAFF {
    bigint trip_id PK,FK
    bigint account_id PK,FK
    enum duty "DRIVER CONDUCTOR"
  }
  ROUTES ||--|{ ROUTE_STOPS : "gồm"
  STOPS ||--o{ ROUTE_STOPS : "thuộc"
  ROUTES ||--o{ FARES : "giá"
  ROUTES ||--o{ SCHEDULES : "lịch"
  SCHEDULES |o--o{ TRIPS : "sinh"
  ROUTES ||--o{ TRIPS : "chạy"
  BUSES |o--o{ TRIPS : "gán xe"
  BUSES ||--|{ SEATS : "sơ đồ"
  TRIPS ||--o{ TRIP_STAFF : "tài xế/phụ xe"
```

- `route_stops` cho phép một trạm dùng chung nhiều tuyến, thứ tự trạm theo `stop_order`.
- `schedules` là mẫu (giờ đầu/cuối, tần suất); mỗi chuyến chạy thật là một dòng `trips`.
- `UNIQUE(bus_id, departure_at)` chặn gán một xe cho hai chuyến cùng giờ.

## 3. Đặt vé & soát vé (US2–US5, US15, US18)

```mermaid
erDiagram
  BOOKINGS {
    bigint id PK
    varchar booking_code UK
    bigint passenger_id FK
    bigint trip_id FK
    bigint voucher_id FK
    enum status "PENDING CONFIRMED CANCELLED EXPIRED"
    datetime hold_expires_at "now + 10 phút"
    decimal final_amount
  }
  TICKETS {
    bigint id PK
    bigint booking_id FK
    bigint trip_id FK
    bigint seat_id FK
    bigint board_stop_id FK
    bigint alight_stop_id FK
    varchar qr_code UK
    enum status "HELD VALID USED CANCELLED EXCHANGED EXPIRED"
    varchar active_seat_key UK "generated"
  }
  TICKET_CHANGE_REQUESTS {
    bigint id PK
    bigint ticket_id FK
    enum request_type "CANCEL EXCHANGE"
    bigint new_trip_id FK
    enum status "PENDING APPROVED REJECTED"
    bigint processed_by FK
  }
  TICKET_SCANS {
    bigint id PK
    bigint ticket_id FK
    bigint monthly_pass_id FK
    bigint trip_id FK
    bigint scanned_by FK
    enum result "VALID INVALID ALREADY_USED ..."
  }
  VOUCHERS {
    bigint id PK
    varchar code UK
    enum discount_type "PERCENT FIXED"
    decimal discount_value
    datetime start_at
    datetime end_at
    int usage_limit
  }
  ACCOUNTS ||--o{ BOOKINGS : "đặt"
  TRIPS ||--o{ BOOKINGS : "cho chuyến"
  VOUCHERS |o--o{ BOOKINGS : "áp dụng"
  BOOKINGS ||--|{ TICKETS : "gồm"
  SEATS ||--o{ TICKETS : "ghế"
  TICKETS ||--o{ TICKET_CHANGE_REQUESTS : "yêu cầu"
  TICKETS ||--o{ TICKET_SCANS : "được quét"
  ACCOUNTS ||--o{ TICKET_SCANS : "phụ xe quét"
```

- **Chống bán trùng ghế:** `tickets.active_seat_key` là cột sinh tự động = `trip-seat` khi vé đang `HELD/VALID/USED`, `NULL` khi hủy. Có `UNIQUE` nên database tự chặn hai người giữ cùng một ghế.
- **Giữ chỗ 10 phút (US3):** tạo booking `PENDING` + vé `HELD`. Backend cần job định kỳ chuyển booking quá `hold_expires_at` sang `EXPIRED` và vé sang `EXPIRED` để nhả ghế.

## 4. Thanh toán & vé tháng (US6–US8, US16, US19, US20)

```mermaid
erDiagram
  PAYMENTS {
    bigint id PK
    bigint booking_id FK "hoặc"
    bigint monthly_pass_id FK "hoặc"
    enum method "MOMO VNPAY ZALOPAY CARD"
    decimal amount
    enum status "PENDING SUCCESS FAILED REFUNDED"
    varchar provider_txn_id UK
    datetime paid_at
  }
  INVOICES {
    bigint id PK
    bigint payment_id FK,UK
    varchar invoice_no UK
    varchar email
    decimal total
    datetime sent_at
  }
  REFUNDS {
    bigint id PK
    bigint payment_id FK
    bigint change_request_id FK
    decimal amount
    enum reason "PAYMENT_FAILED TICKET_CANCELLED TRIP_CANCELLED"
    enum status "PENDING SUCCESS FAILED"
  }
  MONTHLY_PASSES {
    bigint id PK
    bigint passenger_id FK
    bigint route_id FK "NULL = liên tuyến"
    int passenger_type_id FK
    bigint previous_pass_id FK "gia hạn"
    date valid_from
    date valid_to
    varchar qr_code UK
  }
  BOOKINGS ||--o{ PAYMENTS : "thanh toán"
  MONTHLY_PASSES ||--o{ PAYMENTS : "thanh toán"
  PAYMENTS ||--o| INVOICES : "xuất"
  PAYMENTS ||--o{ REFUNDS : "hoàn"
  TICKET_CHANGE_REQUESTS |o--o{ REFUNDS : "do hủy vé"
  ACCOUNTS ||--o{ MONTHLY_PASSES : "đăng ký"
  MONTHLY_PASSES |o--o| MONTHLY_PASSES : "gia hạn từ"
```

- `payments` có `CHECK`: mỗi giao dịch thuộc đúng một trong hai (booking **hoặc** vé tháng).
- Báo cáo dùng view: `v_revenue_daily` (doanh thu theo ngày/tuyến), `v_trip_occupancy` (tỷ lệ lấp đầy). Xuất Excel/PDF (US21) làm ở tầng ứng dụng.

## 5. Định vị, sự cố & phản ánh (US9–US11, US24)

```mermaid
erDiagram
  BUS_LOCATIONS {
    bigint id PK
    bigint trip_id FK
    bigint bus_id FK
    decimal latitude
    decimal longitude
    datetime recorded_at
  }
  INCIDENTS {
    bigint id PK
    bigint trip_id FK
    bigint reported_by FK
    enum incident_type "TRAFFIC_JAM ACCIDENT BREAKDOWN ..."
    int delay_minutes
    enum status "OPEN RESOLVED"
  }
  NOTIFICATIONS {
    bigint id PK
    bigint account_id FK
    bigint trip_id FK
    bigint incident_id FK
    enum type "BUS_ARRIVING DELAY INCIDENT ..."
    boolean is_read
  }
  FEEDBACKS {
    bigint id PK
    bigint passenger_id FK
    bigint route_id FK
    bigint trip_id FK
    enum type "COMPLAINT REVIEW"
    varchar subject
    tinyint rating "1-5"
    varchar image_path
    enum status "CHUA_XU_LY DANG_XU_LY DA_XU_LY"
    bigint processed_by FK
  }
  FEEDBACK_HISTORY {
    bigint id PK
    bigint feedback_id FK
    enum old_status
    enum new_status
    bigint changed_by FK
    datetime changed_at
  }
  TRIPS ||--o{ BUS_LOCATIONS : "vị trí GPS"
  TRIPS ||--o{ INCIDENTS : "sự cố"
  ACCOUNTS ||--o{ INCIDENTS : "tài xế báo"
  INCIDENTS |o--o{ NOTIFICATIONS : "phát sinh"
  ACCOUNTS ||--o{ NOTIFICATIONS : "nhận"
  ACCOUNTS ||--o{ FEEDBACKS : "gửi"
  TRIPS |o--o{ FEEDBACKS : "về chuyến"
  FEEDBACKS ||--o{ FEEDBACK_HISTORY : "lịch sử"
```

- `feedbacks.status` giữ đúng enum `FeedbackStatus` trong code trên `main` (`CHUA_XU_LY / DANG_XU_LY / DA_XU_LY`). Nhánh `feature/thanh-vien-c` đang dùng `PENDING / PROCESSING / RESOLVED` — nhóm cần thống nhất một bộ.

## User story → bảng

| US | Chức năng | Bảng |
|---|---|---|
| 1 | Tra cứu tuyến xe | `routes`, `route_stops`, `stops`, `trips` |
| 2–3 | Chọn ghế, giữ chỗ 10 phút | `seats`, `bookings`, `tickets` |
| 4 | Vé điện tử QR | `tickets.qr_code` |
| 5 | Hủy & đổi vé | `ticket_change_requests` |
| 6–8 | Thanh toán, hóa đơn, hoàn tiền | `payments`, `invoices`, `refunds` |
| 9–11 | Định vị, thông báo, sự cố | `bus_locations`, `notifications`, `incidents` |
| 12 | Tuyến, trạm, giá vé | `routes`, `stops`, `route_stops`, `fares` |
| 13–14 | Lịch trình, phân công | `schedules`, `trips`, `buses`, `trip_staff` |
| 15 | Soát vé QR | `ticket_scans` |
| 16–17 | Vé tháng, duyệt ưu đãi | `monthly_passes`, `passenger_types`, `passenger_verifications` |
| 18 | Voucher | `vouchers`, `bookings.voucher_id` |
| 19–21 | Doanh thu, lấp đầy, xuất file | `v_revenue_daily`, `v_trip_occupancy` |
| 22–23 | Phân quyền, nhật ký | `accounts`, `audit_logs` |
| 24 | Phản ánh, đánh giá | `feedbacks`, `feedback_history` |

## Việc cần làm tiếp ở backend

1. Thêm `CONDUCTOR` vào enum `Role`.
2. Thống nhất kiểu ID: code đang dùng `String`, schema dùng `BIGINT AUTO_INCREMENT`.
3. Thống nhất giá trị trạng thái phản ánh giữa `main` và `feature/thanh-vien-c`.
4. Job nhả ghế khi hết hạn giữ chỗ 10 phút.
