# 🚌 smart-bus-ticketing-system
Hệ thống số hóa bán vé xe buýt thông minh - Smart Bus Ticketing System

> **Thành viên C** | Audit Log & Feedback Module (Phản ánh & Đánh giá)  
> Môn học: Lập trình Ứng dụng Web / Công nghệ Phần mềm

---

## 📋 Mô tả module & Phân hệ Hành khách (Passenger Module)

| Màn hình | Vai trò | URL Route |
|----------|---------|-----------|
| Gửi phản ánh & Góp ý | Hành khách | `/passenger/feedback` |
| Đánh giá chuyến xe (Sao) | Hành khách | `/passenger/rating` |
| Quản lý Tuyến đường (SCRUM-17/18/19) | Quản lý / Admin | `/manager/routes` |
| Quản trị Tài khoản & Phân quyền | Quản trị viên | `/users` |
| Ma trận Quyền hạn (Role Matrix) | Quản trị viên | `/roles-matrix` |

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 19, React Router v7, TailwindCSS v4, Lucide React, Vite 8
- **Mock Service & Storage**: `feedbackService.js`, `userService.js`, LocalStorage persistence
- **Backend / Java Web**: Java Servlet API 4.0, JSP, JSTL, MySQL 8.0+

---

## 📁 Cấu trúc thư mục Frontend

```
frontend/
├── src/
│   ├── api/
│   │   ├── apiClient.js         ← HTTP client abstraction
│   │   ├── authService.js       ← Dịch vụ xác thực & phiên đăng nhập
│   │   ├── userService.js       ← Dịch vụ quản lý người dùng
│   │   └── feedbackService.js   ← Dịch vụ phản hồi & đánh giá (LocalStorage)
│   ├── components/
│   │   ├── common/              ← Button, Modal, Badge, Input, Select, Toast...
│   │   ├── layout/              ← MainLayout, Sidebar, Topbar, AuthLayout
│   │   ├── routes/              ← RouteTab, StopTab, PricingTab (SCRUM-17/18/19)
│   │   └── users/               ← UserTable, UserFilterBar, UserFormModal...
│   ├── pages/
│   │   ├── admin/               ← UserManagementPage, RoleMatrixPage
│   │   ├── auth/                ← LoginPage
│   │   └── passenger/           ← PassengerFeedbackPage (mode="feedback" vs mode="rating")
│   ├── routes/
│   │   ├── AppRoutes.jsx        ← Khai báo routes hệ thống
│   │   ├── ProtectedRoute.jsx   ← Role Guard bảo vệ màn hình
│   │   └── roleNavigation.js    ← Cấu hình menu & phân quyền
│   ├── App.jsx
│   └── main.jsx
```

---

## 🚀 Khởi chạy ứng dụng Frontend

```bash
cd frontend
npm install
npm run dev
```

Truy cập: `http://localhost:5173`

Tài khoản thử nghiệm vai trò Hành khách:
- Username: `passenger_an`
- Mật khẩu: `password123`
- Truy cập trực tiếp: `/passenger/feedback` hoặc `/passenger/rating`
