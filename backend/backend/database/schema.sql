-- Smart Bus Ticketing System - MySQL 8.0 schema
-- Derived from Product_Backlog_Smart_Bus_Ticketing_System_ictu_Avengers (24 user stories)

CREATE DATABASE IF NOT EXISTS smart_bus_ticketing
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_bus_ticketing;

-- =========================================================
-- 1. Tai khoan, phan quyen, nhat ky (US22, US23)
-- =========================================================
CREATE TABLE accounts (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE,
  phone         VARCHAR(20)  UNIQUE,
  role          ENUM('ADMIN','MANAGER','DRIVER','CONDUCTOR','PASSENGER') NOT NULL DEFAULT 'PASSENGER',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cot dong bo voi thiet ke cua thanh vien C (nhanh feature/thanh-vien-c)
CREATE TABLE audit_logs (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id      BIGINT NULL,
  username        VARCHAR(100) NOT NULL,     -- giu lai khi tai khoan bi xoa
  action          VARCHAR(300) NOT NULL,
  action_type     ENUM('LOGIN','LOGOUT','CREATE','UPDATE','DELETE','VIEW',
                       'EXPORT','PAYMENT','TICKET_BUY','FEEDBACK_SUBMIT','STATUS_CHANGE') NOT NULL,
  target_resource VARCHAR(200) NULL,
  ip_address      VARCHAR(45)  NULL,
  user_agent      VARCHAR(500) NULL,
  status          ENUM('SUCCESS','FAILURE','WARNING') NOT NULL DEFAULT 'SUCCESS',
  details         TEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  INDEX idx_audit_filter (username, action_type, created_at),
  INDEX idx_audit_time (created_at)
);

-- =========================================================
-- 2. Doi tuong uu dai (US17)
-- =========================================================
CREATE TABLE passenger_types (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  code             VARCHAR(20)  NOT NULL UNIQUE,   -- STANDARD, STUDENT, ELDERLY, WORKER
  name             VARCHAR(100) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100)
);

CREATE TABLE passenger_verifications (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id        BIGINT NOT NULL,
  passenger_type_id INT NOT NULL,
  document_url      VARCHAR(255) NOT NULL,   -- anh the HSSV / CCCD
  status            ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewed_by       BIGINT NULL,
  reviewed_at       DATETIME NULL,
  valid_until       DATE NULL,
  note              VARCHAR(255) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id)        REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (passenger_type_id) REFERENCES passenger_types(id),
  FOREIGN KEY (reviewed_by)       REFERENCES accounts(id) ON DELETE SET NULL
);

-- =========================================================
-- 3. Tuyen, tram, gia ve (US12)
-- =========================================================
CREATE TABLE routes (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(150) NOT NULL,
  start_point VARCHAR(150) NOT NULL,
  end_point   VARCHAR(150) NOT NULL,
  distance_km DECIMAL(6,2) NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stops (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(150) NOT NULL,
  address   VARCHAR(255) NULL,
  latitude  DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL
);

CREATE TABLE route_stops (
  route_id           BIGINT NOT NULL,
  stop_id            BIGINT NOT NULL,
  stop_order         INT    NOT NULL,
  minutes_from_start INT    NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, stop_id),
  UNIQUE KEY uq_route_order (route_id, stop_order),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (stop_id)  REFERENCES stops(id)
);

CREATE TABLE fares (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id          BIGINT NOT NULL,
  ticket_type       ENUM('SINGLE','MONTHLY') NOT NULL,
  passenger_type_id INT NULL,                -- NULL = gia chung
  price             DECIMAL(12,0) NOT NULL CHECK (price >= 0),
  effective_from    DATE NOT NULL,
  effective_to      DATE NULL,
  FOREIGN KEY (route_id)          REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (passenger_type_id) REFERENCES passenger_types(id)
);

-- =========================================================
-- 4. Xe, ghe, lich trinh, chuyen, phan cong (US2, US13, US14)
-- =========================================================
CREATE TABLE buses (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(20) NOT NULL UNIQUE,
  model        VARCHAR(100) NULL,
  capacity     INT NOT NULL CHECK (capacity > 0),
  status       ENUM('ACTIVE','MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE seats (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id     BIGINT NOT NULL,
  seat_code  VARCHAR(10) NOT NULL,           -- A1, A2, B1...
  seat_row   INT NOT NULL,
  seat_col   INT NOT NULL,
  seat_type  ENUM('NORMAL','PRIORITY') NOT NULL DEFAULT 'NORMAL',
  UNIQUE KEY uq_bus_seat (bus_id, seat_code),
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
);

CREATE TABLE schedules (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id          BIGINT NOT NULL,
  first_departure   TIME NOT NULL,
  last_departure    TIME NOT NULL,
  frequency_minutes INT  NOT NULL CHECK (frequency_minutes > 0),
  days_of_week      SET('MON','TUE','WED','THU','FRI','SAT','SUN') NOT NULL,
  effective_from    DATE NOT NULL,
  effective_to      DATE NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

CREATE TABLE trips (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  route_id     BIGINT NOT NULL,
  schedule_id  BIGINT NULL,
  bus_id       BIGINT NULL,
  departure_at DATETIME NOT NULL,
  arrival_at   DATETIME NULL,
  status       ENUM('SCHEDULED','RUNNING','DELAYED','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  delay_minutes INT NOT NULL DEFAULT 0,
  FOREIGN KEY (route_id)    REFERENCES routes(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (bus_id)      REFERENCES buses(id) ON DELETE SET NULL,
  UNIQUE KEY uq_bus_departure (bus_id, departure_at),
  INDEX idx_trip_search (route_id, departure_at)
);

CREATE TABLE trip_staff (
  trip_id    BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  duty       ENUM('DRIVER','CONDUCTOR') NOT NULL,
  PRIMARY KEY (trip_id, account_id),
  FOREIGN KEY (trip_id)    REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- =========================================================
-- 5. Khuyen mai (US18)
-- =========================================================
CREATE TABLE vouchers (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(30) NOT NULL UNIQUE,
  description    VARCHAR(255) NULL,
  discount_type  ENUM('PERCENT','FIXED') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
  max_discount   DECIMAL(12,0) NULL,
  min_order      DECIMAL(12,0) NOT NULL DEFAULT 0,
  start_at       DATETIME NOT NULL,
  end_at         DATETIME NOT NULL,
  usage_limit    INT NULL,
  used_count     INT NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     BIGINT NULL,
  FOREIGN KEY (created_by) REFERENCES accounts(id) ON DELETE SET NULL,
  CHECK (end_at > start_at)
);

-- =========================================================
-- 6. Dat ve, ve dien tu QR, huy/doi, soat ve (US1-5, US15)
-- =========================================================
CREATE TABLE bookings (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_code    VARCHAR(20) NOT NULL UNIQUE,
  passenger_id    BIGINT NOT NULL,
  trip_id         BIGINT NOT NULL,
  voucher_id      BIGINT NULL,
  status          ENUM('PENDING','CONFIRMED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  hold_expires_at DATETIME NOT NULL,           -- created_at + 10 phut
  total_amount    DECIMAL(12,0) NOT NULL,
  discount_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
  final_amount    DECIMAL(12,0) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (passenger_id) REFERENCES accounts(id),
  FOREIGN KEY (trip_id)      REFERENCES trips(id),
  FOREIGN KEY (voucher_id)   REFERENCES vouchers(id) ON DELETE SET NULL,
  INDEX idx_booking_hold (status, hold_expires_at)
);

CREATE TABLE tickets (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id     BIGINT NOT NULL,
  trip_id        BIGINT NOT NULL,
  seat_id        BIGINT NOT NULL,
  board_stop_id  BIGINT NULL,
  alight_stop_id BIGINT NULL,
  price          DECIMAL(12,0) NOT NULL,
  qr_code        VARCHAR(255) NULL UNIQUE,     -- sinh khi thanh toan thanh cong
  status         ENUM('HELD','VALID','USED','CANCELLED','EXCHANGED','EXPIRED') NOT NULL DEFAULT 'HELD',
  -- chi 1 ve con hieu luc tren moi ghe/chuyen (giu cho 10 phut + chong ban trung)
  active_seat_key VARCHAR(50) AS (
    CASE WHEN status IN ('HELD','VALID','USED') THEN CONCAT(trip_id, '-', seat_id) END
  ) STORED UNIQUE,
  FOREIGN KEY (booking_id)     REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id)        REFERENCES trips(id),
  FOREIGN KEY (seat_id)        REFERENCES seats(id),
  FOREIGN KEY (board_stop_id)  REFERENCES stops(id),
  FOREIGN KEY (alight_stop_id) REFERENCES stops(id)
);

CREATE TABLE ticket_change_requests (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticket_id    BIGINT NOT NULL,
  request_type ENUM('CANCEL','EXCHANGE') NOT NULL,
  new_trip_id  BIGINT NULL,
  new_seat_id  BIGINT NULL,
  reason       VARCHAR(255) NULL,
  status       ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  processed_by BIGINT NULL,
  processed_at DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id)    REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (new_trip_id)  REFERENCES trips(id),
  FOREIGN KEY (new_seat_id)  REFERENCES seats(id),
  FOREIGN KEY (processed_by) REFERENCES accounts(id) ON DELETE SET NULL
);

-- =========================================================
-- 7. Ve thang (US16)
-- =========================================================
CREATE TABLE monthly_passes (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  passenger_id      BIGINT NOT NULL,
  route_id          BIGINT NULL,               -- NULL = lien tuyen
  passenger_type_id INT NOT NULL,
  previous_pass_id  BIGINT NULL,               -- gia han tu ve thang truoc
  valid_from        DATE NOT NULL,
  valid_to          DATE NOT NULL,
  price             DECIMAL(12,0) NOT NULL,
  qr_code           VARCHAR(255) NULL UNIQUE,
  status            ENUM('PENDING','ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (passenger_id)      REFERENCES accounts(id),
  FOREIGN KEY (route_id)          REFERENCES routes(id),
  FOREIGN KEY (passenger_type_id) REFERENCES passenger_types(id),
  FOREIGN KEY (previous_pass_id)  REFERENCES monthly_passes(id) ON DELETE SET NULL,
  CHECK (valid_to > valid_from)
);

CREATE TABLE ticket_scans (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticket_id        BIGINT NULL,
  monthly_pass_id  BIGINT NULL,
  trip_id          BIGINT NOT NULL,
  scanned_by       BIGINT NOT NULL,
  result           ENUM('VALID','INVALID','ALREADY_USED','WRONG_TRIP','EXPIRED') NOT NULL,
  scanned_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id)       REFERENCES tickets(id),
  FOREIGN KEY (monthly_pass_id) REFERENCES monthly_passes(id),
  FOREIGN KEY (trip_id)         REFERENCES trips(id),
  FOREIGN KEY (scanned_by)      REFERENCES accounts(id)
);

-- =========================================================
-- 8. Thanh toan, hoa don, hoan tien (US6, US7, US8)
-- =========================================================
CREATE TABLE payments (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id      BIGINT NULL,
  monthly_pass_id BIGINT NULL,
  method          ENUM('MOMO','VNPAY','ZALOPAY','CARD') NOT NULL,
  amount          DECIMAL(12,0) NOT NULL,
  status          ENUM('PENDING','SUCCESS','FAILED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  provider_txn_id VARCHAR(100) NULL UNIQUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at         DATETIME NULL,
  FOREIGN KEY (booking_id)      REFERENCES bookings(id),
  FOREIGN KEY (monthly_pass_id) REFERENCES monthly_passes(id),
  CHECK ((booking_id IS NULL) <> (monthly_pass_id IS NULL)),
  INDEX idx_payment_report (status, paid_at)
);

CREATE TABLE invoices (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT NOT NULL UNIQUE,
  invoice_no VARCHAR(30) NOT NULL UNIQUE,
  email      VARCHAR(100) NOT NULL,
  subtotal   DECIMAL(12,0) NOT NULL,
  vat_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
  total      DECIMAL(12,0) NOT NULL,
  pdf_url    VARCHAR(255) NULL,
  issued_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at    DATETIME NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE TABLE refunds (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_id         BIGINT NOT NULL,
  change_request_id  BIGINT NULL,
  amount             DECIMAL(12,0) NOT NULL CHECK (amount > 0),
  reason             ENUM('PAYMENT_FAILED','TICKET_CANCELLED','TRIP_CANCELLED','OTHER') NOT NULL,
  status             ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING',
  provider_refund_id VARCHAR(100) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at       DATETIME NULL,
  FOREIGN KEY (payment_id)        REFERENCES payments(id),
  FOREIGN KEY (change_request_id) REFERENCES ticket_change_requests(id) ON DELETE SET NULL
);

-- =========================================================
-- 9. Dinh vi, su co, thong bao (US9, US10, US11)
-- =========================================================
CREATE TABLE bus_locations (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_id     BIGINT NOT NULL,
  bus_id      BIGINT NOT NULL,
  latitude    DECIMAL(9,6) NOT NULL,
  longitude   DECIMAL(9,6) NOT NULL,
  speed_kmh   DECIMAL(5,1) NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id)  REFERENCES buses(id),
  INDEX idx_location_latest (trip_id, recorded_at)
);

CREATE TABLE incidents (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  trip_id       BIGINT NOT NULL,
  reported_by   BIGINT NOT NULL,
  incident_type ENUM('TRAFFIC_JAM','ACCIDENT','BREAKDOWN','ROAD_CLOSED','DELAY','OTHER') NOT NULL,
  description   TEXT NULL,
  delay_minutes INT NOT NULL DEFAULT 0,
  latitude      DECIMAL(9,6) NULL,
  longitude     DECIMAL(9,6) NULL,
  status        ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at   DATETIME NULL,
  FOREIGN KEY (trip_id)     REFERENCES trips(id),
  FOREIGN KEY (reported_by) REFERENCES accounts(id)
);

CREATE TABLE notifications (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id  BIGINT NOT NULL,
  trip_id     BIGINT NULL,
  incident_id BIGINT NULL,
  type        ENUM('BUS_ARRIVING','DELAY','SCHEDULE_CHANGE','INCIDENT','PAYMENT','REFUND','SYSTEM') NOT NULL,
  title       VARCHAR(150) NOT NULL,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id)  REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id)     REFERENCES trips(id) ON DELETE SET NULL,
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE SET NULL,
  INDEX idx_notif_inbox (account_id, is_read, created_at)
);

-- =========================================================
-- 10. Phan anh / danh gia (US24) - khop FeedbackStatus trong code
-- =========================================================
CREATE TABLE feedbacks (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  passenger_id   BIGINT NOT NULL,
  route_id       BIGINT NULL,
  trip_id        BIGINT NULL,
  type           ENUM('COMPLAINT','REVIEW') NOT NULL DEFAULT 'COMPLAINT',
  subject        VARCHAR(300) NULL,
  content        TEXT NOT NULL,
  rating         TINYINT NULL CHECK (rating BETWEEN 1 AND 5),
  image_path     VARCHAR(500) NULL,
  status         ENUM('CHUA_XU_LY','DANG_XU_LY','DA_XU_LY') NOT NULL DEFAULT 'CHUA_XU_LY',
  admin_response TEXT NULL,
  processed_by   BIGINT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (passenger_id) REFERENCES accounts(id),
  FOREIGN KEY (route_id)     REFERENCES routes(id) ON DELETE SET NULL,
  FOREIGN KEY (trip_id)      REFERENCES trips(id) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES accounts(id) ON DELETE SET NULL,
  INDEX idx_feedback_status (status, created_at)
);

CREATE TABLE feedback_history (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  feedback_id BIGINT NOT NULL,
  old_status  ENUM('CHUA_XU_LY','DANG_XU_LY','DA_XU_LY') NULL,
  new_status  ENUM('CHUA_XU_LY','DANG_XU_LY','DA_XU_LY') NOT NULL,
  changed_by  BIGINT NULL,
  note        TEXT NULL,
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by)  REFERENCES accounts(id) ON DELETE SET NULL
);

-- =========================================================
-- 11. Bao cao (US19, US20) - view, khong can bang rieng
-- =========================================================
CREATE VIEW v_revenue_daily AS
SELECT DATE(p.paid_at) AS day,
       r.id            AS route_id,
       r.name          AS route_name,
       COUNT(DISTINCT p.id) AS payments,
       SUM(p.amount)        AS gross_revenue
FROM payments p
JOIN bookings b ON b.id = p.booking_id
JOIN trips t    ON t.id = b.trip_id
JOIN routes r   ON r.id = t.route_id
WHERE p.status IN ('SUCCESS','PARTIALLY_REFUNDED')
GROUP BY DATE(p.paid_at), r.id, r.name;

CREATE VIEW v_trip_occupancy AS
SELECT t.id AS trip_id,
       t.route_id,
       t.departure_at,
       bs.capacity,
       COUNT(tk.id) AS sold_seats,
       ROUND(COUNT(tk.id) * 100.0 / bs.capacity, 2) AS occupancy_percent
FROM trips t
JOIN buses bs ON bs.id = t.bus_id
LEFT JOIN tickets tk ON tk.trip_id = t.id AND tk.status IN ('VALID','USED')
GROUP BY t.id, t.route_id, t.departure_at, bs.capacity;

-- Du lieu mac dinh
INSERT INTO passenger_types (code, name, discount_percent) VALUES
  ('STANDARD', 'Hanh khach thuong', 0),
  ('STUDENT',  'Hoc sinh / Sinh vien', 50),
  ('ELDERLY',  'Nguoi cao tuoi', 50),
  ('WORKER',   'Nguoi di lam (ve thang)', 20);
