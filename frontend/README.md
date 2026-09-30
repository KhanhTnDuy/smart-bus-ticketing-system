# THƯ MỤC FRONTEND: CHỨC NĂNG F16 & F17

Thư mục này được gom gọn và đóng gói độc lập cho **2 chức năng cuối** theo bảng phân công công việc:
- **F16: Quản lý phản ánh** (Task 4.3)
- **F17: Xử lý phản ánh** (Task 4.4)

---

## 📁 Cấu trúc thư mục

```
F16_F17_QuanLy_Va_XuLy_PhanAnh/
├── F16_QuanLyPhanAnh.tsx         # Component Chức năng F16: Bộ lọc, Tìm kiếm, Bảng danh sách & Modal Xem chi tiết
├── F17_XuLyPhanAnh.tsx           # Component Chức năng F17: Form xử lý, chuyển đổi trạng thái, nhập kết quả giải quyết
├── ComplaintManagementApp.tsx   # Trang tích hợp hoàn chỉnh cả F16 & F17 (sẵn sàng chạy demo độc lập)
├── types.ts                     # Định nghĩa TypeScript interface (Complaint, ComplaintStatus, ComplaintCategory,...)
├── mockData.ts                  # Dữ liệu giả lập mẫu (5 bản ghi khiếu nại thực tế & danh mục tuyến xe)
├── index.ts                     # Barrel export toàn bộ components và types
└── README.md                    # Tài liệu hướng dẫn sử dụng chi tiết
```

---

## 🔍 Chi tiết từng chức năng

### 1. F16: Quản lý phản ánh (`F16_QuanLyPhanAnh.tsx`)
- **Mục tiêu**: Cho phép cán bộ điều hành xem, tra cứu và kiểm tra toàn bộ phản ánh của hành khách.
- **Tính năng nổi bật**:
  - **Bộ lọc đa tiêu chí**: Tìm kiếm từ khóa (tên hành khách, mã khiếu nại, tiêu đề), lọc theo Trạng thái (`PENDING`, `PROCESSING`, `RESOLVED`, `REJECTED`), lọc theo Danh mục (`ATTITUDE`, `DELAY`, `OVERCHARGING`, `VEHICLE_QUALITY`, `SAFETY`, `OTHER`).
  - **Bảng dữ liệu chuẩn**: Hiển thị rõ mã, người gửi, số điện thoại, tuyến buýt, ngày diễn ra và badge trạng thái trực quan.
  - **Xem chi tiết (Modal)**: Xem toàn bộ nội dung phản ánh, thời gian gửi, giải pháp đã xử lý trước đó mà không làm thay đổi dữ liệu.
  - **Trigger chuyển tiếp**: Nút "Xử lý" kích hoạt nhanh sang chức năng F17.

### 2. F17: Xử lý phản ánh (`F17_XuLyPhanAnh.tsx`)
- **Mục tiêu**: Cho phép cán bộ điều hành cập nhật tiến độ giải quyết và phản hồi chính thức cho khách hàng.
- **Tính năng nổi bật**:
  - Modal form cập nhật trực tiếp theo ID phản ánh đã chọn.
  - Radio button chọn trạng thái giải quyết:
    - `PENDING`: Chờ xử lý
    - `PROCESSING`: Đang xử lý
    - `RESOLVED`: Đã xử lý (Thành công)
    - `REJECTED`: Từ chối giải quyết
  - Khung văn bản nhập biên bản làm việc, phương án xử lý (nhắc nhở tài xế, bồi hoàn vé, điều chỉnh lịch trình,...).
  - Callback `onSave(complaintId, status, response)` tự động đồng bộ trạng thái mới vào danh sách.

---

## 🚀 Cách tích hợp vào dự án React

```tsx
import React, { useState } from 'react';
import { F16_QuanLyPhanAnh, F17_XuLyPhanAnh, MOCK_COMPLAINTS, MOCK_ROUTES } from './F16_F17_QuanLy_Va_XuLy_PhanAnh';

export const MyPage = () => {
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [selected, setSelected] = useState(null);
  const [isOpenProcess, setIsOpenProcess] = useState(false);

  const handleOpenProcess = (complaint) => {
    setSelected(complaint);
    setIsOpenProcess(true);
  };

  const handleSaveProcess = (id, newStatus, response) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, adminResponse: response } : c));
  };

  return (
    <div>
      {/* F16: Quản lý danh sách & xem chi tiết */}
      <F16_QuanLyPhanAnh
        complaints={complaints}
        routes={MOCK_ROUTES}
        onOpenProcess={handleOpenProcess}
      />

      {/* F17: Xử lý & cập nhật trạng thái */}
      <F17_XuLyPhanAnh
        isOpen={isOpenProcess}
        complaint={selected}
        routes={MOCK_ROUTES}
        onClose={() => setIsOpenProcess(false)}
        onSave={handleSaveProcess}
      />
    </div>
  );
};
```
