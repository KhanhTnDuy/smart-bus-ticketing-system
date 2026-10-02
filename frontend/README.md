# Frontend — Smart Bus Ticketing System

Ứng dụng React + TypeScript + Vite + Tailwind cho hệ thống bán vé xe buýt thông minh.

## Chạy ở máy dev

```bash
npm install
npm run dev -- --port 5173
```

Backend ASP.NET Core phải chạy song song ở `http://localhost:5180`:

```bash
cd ../backend/SmartBusTicketing.Api
dotnet run --no-launch-profile --urls http://localhost:5180
```

Địa chỉ backend lấy từ `VITE_API_URL`, xem `.env.example`. CORS của backend mặc
định chỉ cho phép `http://localhost:5173` nên cần giữ đúng cổng này.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server kèm hot reload |
| `npm run build` | Typecheck (`tsc -b`) rồi build production |
| `npm run lint` | Chạy oxlint |
| `npm run preview` | Xem thử bản build |

## Cấu trúc `src/`

```
api/        Lớp gọi HTTP. client.ts giữ base URL, token và cách bóc lỗi;
            mỗi user story có một file riêng (auth, routeManagement,
            auditLogs, feedback).
hooks/      Kết nối API với trang: quản lý loading, error và bộ lọc.
pages/      Chia theo vai trò: admin, manager, driver, passenger.
components/ Thành phần dùng chung (PageHeader, Badge, Modal, EmptyState...).
context/    AuthContext, ThemeContext, ToastContext và DataContext.
routes/     Khai báo route kèm RoleGuard theo vai trò.
types/      Kiểu dữ liệu dùng chung toàn ứng dụng.
```

## Tình trạng nối API

Không phải trang nào cũng đã dùng dữ liệu thật. `DataContext` vẫn cấp dữ liệu
giả cho những trang chưa nối xong, nên khi sửa một trang hãy kiểm tra xem nó lấy
dữ liệu từ `useData()` hay từ hook trong `hooks/`.

Đã nối API thật: đăng nhập, quản lý tuyến / trạm / giá vé, nhật ký hệ thống,
tiếp nhận và xử lý phản ánh, phân công điều xe (chặn trùng lịch xe/tài xế).
