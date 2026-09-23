# 🚌 Smart Bus Ticketing System — Module Nhật ký & Phản ánh

> **Thành viên C** | Audit Log & Feedback Module  
> Môn học: Lập trình Ứng dụng Web  
> Hệ thống: Smart Bus Ticketing System

---

## 📋 Mô tả module

Module phụ trách:

| Màn hình | Vai trò | URL |
|----------|---------|-----|
| Dashboard | Tổng quan | `/` |
| Nhật ký hệ thống | Admin | `/admin/audit-log` |
| Gửi phản ánh / Đánh giá | Hành khách | `/feedback/submit` |
| Quản lý phản ánh | Admin | `/admin/feedbacks` |
| Chi tiết phản ánh | Admin | `/admin/feedback-detail?id=X` |

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| Backend | Java Servlet API 4.0, JSP |
| Database | MySQL 8.0+ |
| Frontend | Bootstrap 5.3, Font Awesome 6 |
| Build | Maven 3 |
| Server | Apache Tomcat 9+ |

---

## 📁 Cấu trúc project

```
smart-bus-memberC/
├── pom.xml                          ← Maven config
├── database.sql                     ← Schema + sample data
├── src/main/
│   ├── java/com/smartbus/
│   │   ├── model/
│   │   │   ├── AuditLog.java        ← Entity nhật ký
│   │   │   ├── Feedback.java        ← Entity phản ánh
│   │   │   └── FeedbackHistory.java ← Entity lịch sử trạng thái
│   │   ├── dao/
│   │   │   ├── AuditLogDAO.java     ← CRUD nhật ký
│   │   │   └── FeedbackDAO.java     ← CRUD phản ánh + history
│   │   ├── servlet/
│   │   │   ├── IndexServlet.java           ← Dashboard
│   │   │   ├── AuditLogServlet.java        ← Trang nhật ký
│   │   │   ├── FeedbackFormServlet.java    ← Form gửi phản ánh
│   │   │   ├── FeedbackManageServlet.java  ← Quản lý phản ánh
│   │   │   ├── FeedbackDetailServlet.java  ← Chi tiết phản ánh
│   │   │   └── FeedbackStatusServlet.java  ← AJAX cập nhật trạng thái
│   │   └── util/
│   │       ├── DBConnection.java    ← Kết nối MySQL
│   │       └── FileUploadUtil.java  ← Upload ảnh đính kèm
│   └── webapp/
│       ├── WEB-INF/web.xml
│       ├── assets/
│       │   ├── css/style.css        ← Toàn bộ CSS tùy chỉnh
│       │   └── js/main.js           ← JavaScript helper
│       ├── uploads/                 ← Ảnh đính kèm (auto-create)
│       └── views/
│           ├── layout/
│           │   ├── header.jsp       ← Sidebar + Topbar
│           │   └── footer.jsp       ← JS imports + closing
│           ├── audit/
│           │   └── audit_log.jsp    ← Bảng audit log + bộ lọc
│           ├── feedback/
│           │   ├── feedback_form.jsp    ← Form gửi phản ánh
│           │   ├── feedback_manage.jsp  ← Bảng quản lý phản ánh
│           │   └── feedback_detail.jsp ← Chi tiết + timeline
│           └── index.jsp            ← Dashboard
```

---

## ⚡ Chức năng chi tiết

### 1. Nhật ký hệ thống (Admin) — `/admin/audit-log`
- ✅ Bảng hiển thị: Thời gian, Người dùng, Hành động, Loại thao tác, Tài nguyên, IP, Kết quả
- ✅ Bộ lọc nâng cao: Tên đăng nhập, Loại thao tác (11 loại), Kết quả, Khoảng ngày
- ✅ Phân trang server-side (10 dòng/trang)
- ✅ Color-coded badges theo loại thao tác và kết quả
- ✅ Click vào dòng → Modal hiện chi tiết đầy đủ
- ✅ Nút xuất CSV (UI)

### 2. Form gửi phản ánh (Hành khách) — `/feedback/submit`
- ✅ Chọn loại: **Khiếu nại** hoặc **Đánh giá** (toggle động)
- ✅ Form khiếu nại: Họ tên, Email, SĐT, Mã chuyến, Tuyến đường, Tiêu đề, Nội dung
- ✅ Upload ảnh đính kèm: Drag & drop, preview trước khi gửi, validate 5MB
- ✅ **Star Rating** 1–5 sao với animation hover + nhãn mô tả
- ✅ Character counter cho textarea
- ✅ Loading spinner khi submit
- ✅ Client-side + server-side validation

### 3. Quản lý phản ánh (Admin) — `/admin/feedbacks`
- ✅ Thẻ tóm tắt: Chưa xử lý / Đang xử lý / Đã xử lý (click để lọc)
- ✅ Bảng đầy đủ: Hành khách, Loại, Nội dung tóm tắt, Sao, Trạng thái, Ngày gửi
- ✅ **Cập nhật trạng thái nhanh** (inline dropdown) — AJAX không reload trang
- ✅ Bộ lọc: Loại, Trạng thái, Khoảng ngày
- ✅ Phân trang server-side
- ✅ Nút xem chi tiết → trang detail

### 4. Chi tiết & Cập nhật trạng thái (Admin) — `/admin/feedback-detail`
- ✅ Xem toàn bộ thông tin phản ánh
- ✅ Hiện ảnh đính kèm
- ✅ **Panel cập nhật trạng thái** với 3 nút (Chưa xử lý / Đang xử lý / Đã xử lý)
- ✅ Textarea phản hồi admin — gửi AJAX
- ✅ **Timeline lịch sử** thay đổi trạng thái
- ✅ Ghi audit log tự động khi đổi trạng thái

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Cài đặt database

```sql
-- Chạy file database.sql trong MySQL Workbench hoặc terminal
mysql -u root -p < database.sql
```

### Bước 2: Cấu hình kết nối database

Mở `src/main/webapp/WEB-INF/web.xml` và chỉnh sửa:

```xml
<context-param>
    <param-name>DB_URL</param-name>
    <param-value>jdbc:mysql://localhost:3306/smart_bus_ticketing?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true&characterEncoding=UTF-8</param-value>
</context-param>
<context-param>
    <param-name>DB_USER</param-name>
    <param-value>root</param-value>      <!-- Đổi thành user của bạn -->
</context-param>
<context-param>
    <param-name>DB_PASSWORD</param-name>
    <param-value>root</param-value>      <!-- Đổi thành password của bạn -->
</context-param>
```

### Bước 3: Build project

```bash
mvn clean package
```

File WAR sẽ được tạo tại: `target/smart-bus-memberC.war`

### Bước 4: Deploy lên Tomcat

**Cách 1**: Copy file WAR vào thư mục `webapps/` của Tomcat

**Cách 2**: Dùng IntelliJ IDEA / Eclipse với Tomcat plugin

### Bước 5: Truy cập

```
http://localhost:8080/smart-bus-memberC/
```

---

## 🔧 Yêu cầu hệ thống

- **JDK**: 11 trở lên
- **Maven**: 3.6+
- **Tomcat**: 9.0+ (hỗ trợ Servlet 4.0)
- **MySQL**: 8.0+
- **RAM**: 512MB+

---

## 📝 Lưu ý

- Thư mục `uploads/` sẽ được tự động tạo khi có file upload đầu tiên
- Trong môi trường thực tế, cần tích hợp với **Session/Authentication** để lấy thông tin user đang đăng nhập
- Nếu dùng IDE (IntelliJ), thêm Tomcat Server configuration và chọn artifact `smart-bus-memberC:war exploded`

---

## 👤 Thành viên thực hiện

> **Thành viên C** — Smart Bus Ticketing System  
> Module: Nhật ký hệ thống & Phản ánh / Đánh giá
