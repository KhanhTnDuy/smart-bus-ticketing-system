-- ============================================================
-- SMART BUS TICKETING SYSTEM
-- Module: Audit Log & Feedback (Member C)
-- Database: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_bus_ticketing
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE smart_bus_ticketing;

-- ============================================================
-- TABLE: audit_logs
-- Lưu lịch sử thao tác của người dùng trong hệ thống
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGINT          AUTO_INCREMENT PRIMARY KEY,
    user_id     INT             DEFAULT NULL,
    username    VARCHAR(100)    NOT NULL,
    action      VARCHAR(300)    NOT NULL COMMENT 'Mô tả hành động',
    action_type ENUM(
        'LOGIN','LOGOUT',
        'CREATE','UPDATE','DELETE','VIEW',
        'EXPORT','PAYMENT','TICKET_BUY',
        'FEEDBACK_SUBMIT','STATUS_CHANGE'
    )                           NOT NULL,
    target_resource VARCHAR(200) DEFAULT NULL COMMENT 'Tài nguyên bị tác động',
    ip_address  VARCHAR(45)     DEFAULT NULL,
    user_agent  VARCHAR(500)    DEFAULT NULL,
    status      ENUM('SUCCESS','FAILURE','WARNING') DEFAULT 'SUCCESS',
    details     TEXT            DEFAULT NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username    (username),
    INDEX idx_action_type (action_type),
    INDEX idx_status      (status),
    INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABLE: feedbacks
-- Lưu khiếu nại và đánh giá của hành khách
-- ============================================================
CREATE TABLE IF NOT EXISTS feedbacks (
    id              BIGINT          AUTO_INCREMENT PRIMARY KEY,
    passenger_id    INT             DEFAULT NULL,
    passenger_name  VARCHAR(100)    NOT NULL,
    passenger_email VARCHAR(150)    DEFAULT NULL,
    passenger_phone VARCHAR(20)     DEFAULT NULL,
    trip_id         VARCHAR(50)     DEFAULT NULL,
    trip_route      VARCHAR(300)    DEFAULT NULL COMMENT 'Tuyến xe VD: HN → HP',
    type            ENUM('COMPLAINT','REVIEW') NOT NULL DEFAULT 'COMPLAINT',
    subject         VARCHAR(300)    DEFAULT NULL,
    content         TEXT            NOT NULL,
    rating          TINYINT         DEFAULT NULL CHECK (rating BETWEEN 1 AND 5),
    image_path      VARCHAR(500)    DEFAULT NULL,
    status          ENUM('PENDING','PROCESSING','RESOLVED') DEFAULT 'PENDING',
    admin_response  TEXT            DEFAULT NULL,
    processed_by    VARCHAR(100)    DEFAULT NULL,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_passenger_id (passenger_id),
    INDEX idx_type         (type),
    INDEX idx_status       (status),
    INDEX idx_created_at   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- TABLE: feedback_history
-- Lưu lịch sử thay đổi trạng thái phản ánh
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_history (
    id           BIGINT      AUTO_INCREMENT PRIMARY KEY,
    feedback_id  BIGINT      NOT NULL,
    old_status   VARCHAR(20) DEFAULT NULL,
    new_status   VARCHAR(20) NOT NULL,
    changed_by   VARCHAR(100) NOT NULL,
    note         TEXT        DEFAULT NULL,
    changed_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- SAMPLE DATA: audit_logs
-- ============================================================
INSERT INTO audit_logs (user_id, username, action, action_type, target_resource, ip_address, status, details, created_at) VALUES
(1,  'admin',       'Đăng nhập hệ thống',                  'LOGIN',           '/login',           '192.168.1.1',   'SUCCESS', NULL,                                          NOW() - INTERVAL 2 HOUR),
(2,  'nguyen.van.a', 'Mua vé tuyến HN-HP',                 'TICKET_BUY',      '/tickets/buy',     '10.0.0.5',      'SUCCESS', 'Vé số: TK20240923001, Giá: 150,000đ',         NOW() - INTERVAL 3 HOUR),
(3,  'tran.thi.b',  'Gửi khiếu nại về tài xế',             'FEEDBACK_SUBMIT', '/feedback/submit', '10.0.0.8',      'SUCCESS', 'Feedback ID: 1',                              NOW() - INTERVAL 4 HOUR),
(1,  'admin',       'Xuất báo cáo doanh thu tháng 9',      'EXPORT',          '/reports/revenue', '192.168.1.1',   'SUCCESS', 'Format: Excel, Period: 09/2024',              NOW() - INTERVAL 5 HOUR),
(2,  'nguyen.van.a', 'Cập nhật thông tin cá nhân',         'UPDATE',          '/profile/update',  '10.0.0.5',      'SUCCESS', 'Fields: phone, address',                      NOW() - INTERVAL 6 HOUR),
(4,  'le.van.c',   'Đặt vé nhưng thanh toán thất bại',     'PAYMENT',         '/payment/process', '172.16.0.10',   'FAILURE', 'Error: Insufficient balance',                 NOW() - INTERVAL 7 HOUR),
(1,  'admin',       'Xóa chuyến xe không hoạt động',       'DELETE',          '/trips/45',        '192.168.1.1',   'SUCCESS', 'Trip ID: 45, Route: HN-NB',                   NOW() - INTERVAL 8 HOUR),
(5,  'pham.thi.d',  'Đánh giá 5 sao chuyến đi',            'FEEDBACK_SUBMIT', '/feedback/submit', '10.0.0.15',     'SUCCESS', 'Rating: 5, Feedback ID: 2',                   NOW() - INTERVAL 9 HOUR),
(1,  'admin',       'Thêm tuyến xe mới HN-ĐN',             'CREATE',          '/trips/create',    '192.168.1.1',   'SUCCESS', 'Route: HN-ĐN, Distance: 800km',               NOW() - INTERVAL 10 HOUR),
(6,  'hoang.van.e', 'Xem danh sách vé của mình',           'VIEW',            '/my-tickets',      '10.0.0.20',     'SUCCESS', NULL,                                          NOW() - INTERVAL 11 HOUR),
(2,  'nguyen.van.a', 'Đăng xuất khỏi hệ thống',           'LOGOUT',          '/logout',          '10.0.0.5',      'SUCCESS', NULL,                                          NOW() - INTERVAL 12 HOUR),
(7,  'do.thi.f',    'Cập nhật trạng thái phản ánh',        'STATUS_CHANGE',   '/admin/feedbacks', '192.168.1.5',   'SUCCESS', 'Feedback ID: 1, Status: PENDING→PROCESSING',  NOW() - INTERVAL 13 HOUR),
(3,  'tran.thi.b',  'Đăng nhập thất bại 3 lần',            'LOGIN',           '/login',           '10.0.0.8',      'FAILURE', 'Wrong password attempt',                      NOW() - INTERVAL 14 HOUR),
(1,  'admin',       'Tạo tài khoản tài xế mới',            'CREATE',          '/drivers/create',  '192.168.1.1',   'SUCCESS', 'Driver: Trần Văn X, License: B2',             NOW() - INTERVAL 15 HOUR),
(4,  'le.van.c',   'Hủy vé tuyến HP-HN',                   'UPDATE',          '/tickets/23/cancel','172.16.0.10',  'SUCCESS', 'Ticket ID: 23, Refund: 120,000đ',             NOW() - INTERVAL 16 HOUR),
(5,  'pham.thi.d',  'Xem lịch trình chuyến đi',            'VIEW',            '/schedule',        '10.0.0.15',     'SUCCESS', NULL,                                          NOW() - INTERVAL 17 HOUR),
(8,  'vu.van.g',    'Gửi khiếu nại về xe hỏng điều hòa',  'FEEDBACK_SUBMIT', '/feedback/submit', '10.0.0.22',     'SUCCESS', 'Feedback ID: 3',                              NOW() - INTERVAL 18 HOUR),
(1,  'admin',       'Xuất nhật ký hệ thống',               'EXPORT',          '/admin/audit-log', '192.168.1.1',   'SUCCESS', 'Format: CSV, Records: 500',                   NOW() - INTERVAL 19 HOUR),
(9,  'nguyen.thi.h','Thanh toán vé thành công',             'PAYMENT',         '/payment/process', '10.0.0.30',     'SUCCESS', 'Amount: 200,000đ, Method: MoMo',              NOW() - INTERVAL 20 HOUR),
(1,  'admin',       'Đăng nhập hệ thống',                  'LOGIN',           '/login',           '192.168.1.1',   'SUCCESS', NULL,                                          NOW() - INTERVAL 24 HOUR),
(10, 'bui.van.i',   'Mua vé tuyến ĐN-HCM',                'TICKET_BUY',      '/tickets/buy',     '10.0.0.35',     'SUCCESS', 'Vé số: TK20240922015, Giá: 180,000đ',         NOW() - INTERVAL 25 HOUR),
(2,  'nguyen.van.a', 'Xem chi tiết chuyến xe',             'VIEW',            '/trips/23',        '10.0.0.5',      'SUCCESS', NULL,                                          NOW() - INTERVAL 26 HOUR),
(7,  'do.thi.f',    'Cập nhật giá vé tuyến HN-HP',        'UPDATE',          '/trips/12/pricing','192.168.1.5',   'WARNING', 'Price change: 150k → 200k (>30% increase)',   NOW() - INTERVAL 27 HOUR),
(6,  'hoang.van.e', 'Gửi đánh giá chuyến đi',             'FEEDBACK_SUBMIT', '/feedback/submit', '10.0.0.20',     'SUCCESS', 'Feedback ID: 4',                              NOW() - INTERVAL 28 HOUR),
(1,  'admin',       'Xóa người dùng không hoạt động',     'DELETE',          '/users/88',        '192.168.1.1',   'SUCCESS', 'User: test_account_001',                      NOW() - INTERVAL 30 HOUR);


-- ============================================================
-- SAMPLE DATA: feedbacks
-- ============================================================
INSERT INTO feedbacks (passenger_id, passenger_name, passenger_email, passenger_phone, trip_id, trip_route, type, subject, content, rating, status, admin_response, processed_by, created_at) VALUES
(3, 'Trần Thị B',   'tran.thi.b@email.com',   '0901234567', 'TRIP-2024-001', 'Hà Nội → Hải Phòng',
 'COMPLAINT', 'Tài xế lái xe ẩu, gây nguy hiểm',
 'Tôi muốn phản ánh về tài xế chuyến xe số TRIP-2024-001. Tài xế lái xe với tốc độ cao, vượt ẩu nhiều lần trên quốc lộ 5A, khiến hành khách rất lo lắng. Đề nghị ban quản lý xem xét và nhắc nhở tài xế.',
 NULL, 'PROCESSING', 'Cảm ơn quý khách đã phản ánh. Chúng tôi đã ghi nhận và đang làm việc với tài xế để chấn chỉnh.', 'admin', NOW() - INTERVAL 4 HOUR),

(5, 'Phạm Thị D',   'pham.thi.d@email.com',   '0912345678', 'TRIP-2024-002', 'Hà Nội → Đà Nẵng',
 'REVIEW', NULL,
 'Chuyến đi rất tuyệt vời! Xe sạch sẽ, điều hòa mát, tài xế chuyên nghiệp và thân thiện. Đặc biệt xe đến đúng giờ. Tôi sẽ tiếp tục sử dụng dịch vụ trong tương lai.',
 5, 'RESOLVED', 'Cảm ơn quý khách đã đánh giá tốt! Chúng tôi rất vui khi mang đến trải nghiệm tốt cho bạn.', 'admin', NOW() - INTERVAL 9 HOUR),

(8, 'Vũ Văn G',     'vu.van.g@email.com',     '0923456789', 'TRIP-2024-003', 'Hải Phòng → Hà Nội',
 'COMPLAINT', 'Điều hòa xe bị hỏng suốt hành trình',
 'Điều hòa xe bị hỏng từ đầu đến cuối chuyến, hành khách rất khó chịu trong thời tiết nắng nóng. Đề nghị hoàn trả một phần tiền vé và khắc phục sự cố sớm.',
 NULL, 'PENDING', NULL, NULL, NOW() - INTERVAL 18 HOUR),

(6, 'Hoàng Văn E',  'hoang.van.e@email.com',  '0934567890', 'TRIP-2024-004', 'Hà Nội → Nam Định',
 'REVIEW', NULL,
 'Dịch vụ khá ổn, xe tương đối sạch. Tuy nhiên xe xuất phát trễ 15 phút so với lịch. Tài xế lái xe ổn định.',
 3, 'RESOLVED', NULL, 'admin', NOW() - INTERVAL 28 HOUR),

(10, 'Bùi Văn I',   'bui.van.i@email.com',    '0945678901', 'TRIP-2024-005', 'Đà Nẵng → Hồ Chí Minh',
 'COMPLAINT', 'Mất hành lý trên xe',
 'Tôi đã để quên túi xách trên xe sau khi xuống. Trong túi có laptop và một số tài liệu quan trọng. Kính mong ban quản lý hỗ trợ liên hệ với nhà xe để lấy lại hành lý.',
 NULL, 'PROCESSING', 'Chúng tôi đã liên hệ tài xế. Túi xách của quý khách đã được tìm thấy. Vui lòng liên hệ 1900-xxxx để nhận lại.', 'admin', NOW() - INTERVAL 2 DAY),

(2, 'Nguyễn Văn A',  'nguyen.van.a@email.com', '0956789012', 'TRIP-2024-006', 'Hà Nội → Hải Phòng',
 'REVIEW', NULL,
 'Xe mới, ghế ngồi thoải mái. Tài xế vui vẻ và có kinh nghiệm. Điểm đón rất thuận tiện. Sẽ giới thiệu cho bạn bè!',
 5, 'RESOLVED', NULL, 'admin', NOW() - INTERVAL 3 DAY),

(4, 'Lê Văn C',     'le.van.c@email.com',     '0967890123', 'TRIP-2024-007', 'Hồ Chí Minh → Vũng Tàu',
 'COMPLAINT', 'Xe dừng nghỉ quá nhiều, làm trễ giờ đến',
 'Chuyến xe TRIP-2024-007 đã dừng nghỉ 4 lần trong hành trình HCM-VT (vốn chỉ khoảng 2 giờ), khiến tôi bị trễ cuộc hẹn quan trọng. Đề nghị nhà xe hạn chế số lần dừng nghỉ và thông báo trước.',
 NULL, 'PENDING', NULL, NULL, NOW() - INTERVAL 4 DAY),

(9, 'Nguyễn Thị H', 'nguyen.thi.h@email.com', '0978901234', 'TRIP-2024-008', 'Hà Nội → Quảng Ninh',
 'REVIEW', NULL,
 'Trải nghiệm tuyệt vời từ đầu đến cuối. Đặt vé online dễ dàng, thanh toán nhanh, nhận vé ngay lập tức. Chuyến đi êm ái. 10/10 sẽ dùng lại!',
 5, 'PENDING', NULL, NULL, NOW() - INTERVAL 5 DAY);


-- ============================================================
-- SAMPLE DATA: feedback_history
-- ============================================================
INSERT INTO feedback_history (feedback_id, old_status, new_status, changed_by, note, changed_at) VALUES
(1, 'PENDING',    'PROCESSING', 'do.thi.f', 'Đã nhận phản ánh, đang xác minh với tài xế', NOW() - INTERVAL 3 HOUR),
(2, 'PENDING',    'PROCESSING', 'admin',    'Đang xem xét đánh giá của khách',            NOW() - INTERVAL 8 HOUR),
(2, 'PROCESSING', 'RESOLVED',   'admin',    'Đã phản hồi khách hàng',                     NOW() - INTERVAL 6 HOUR),
(4, 'PENDING',    'RESOLVED',   'admin',    'Đã ghi nhận, thông báo tới nhà xe',          NOW() - INTERVAL 25 HOUR),
(5, 'PENDING',    'PROCESSING', 'admin',    'Đang liên hệ tài xế để tìm hành lý',        NOW() - INTERVAL 45 HOUR),
(6, 'PENDING',    'RESOLVED',   'admin',    'Đã phản hồi, cảm ơn đánh giá tốt',          NOW() - INTERVAL 70 HOUR);
