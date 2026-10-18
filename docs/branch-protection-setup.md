# Hướng dẫn Bật Branch Protection cho nhánh `main` (SCRUM-90)

Tài liệu này hướng dẫn chi tiết cách cấu hình **Branch Protection Rule** trên GitHub cho nhánh `main` để đảm bảo:
- PR mới tự động kích hoạt pipeline CI tại `.github/workflows/ci.yml`.
- **Chặn merge khi CI đỏ**: Nút "Merge pull request" bị vô hiệu hóa (disabled / blocked) nếu bất kỳ kiểm tra bắt buộc nào thất bại.
- Nhánh `main` luôn luôn xanh và ổn định, không thể merge code lỗi vào production.

---

## Danh sách Status Checks bắt buộc (Bắt buộc phải xanh mới được merge)

Pipeline CI của dự án (tại `.github/workflows/ci.yml`, SCRUM-103) có 3 job kiểm tra độc lập:

1. **`Backend build (.NET)`**: Kiểm tra biên dịch toàn bộ solution backend (.NET 10) với `dotnet build`.
2. **`Frontend build (tsc + vite)`**: Cài đặt dependencies (`npm ci`), kiểm tra type TypeScript (`tsc`) và đóng gói Vite (`npm run build`).
3. **`Regression tests (npm test)`**: Khởi tạo container MySQL, nạp dữ liệu và chạy toàn bộ bộ kiểm thử hồi quy (`npm run test:reset-demo`).

---

## Cách 1: Cấu hình qua giao diện GitHub Web (Khuyên dùng)

> **Lưu ý**: Bạn cần quyền **Admin** hoặc **Maintainer** trên repository `KhanhTnDuy/smart-bus-ticketing-system`.

1. Truy cập vào repository trên GitHub:
   `https://github.com/KhanhTnDuy/smart-bus-ticketing-system`
2. Bấm vào tab **Settings** ở thanh menu trên cùng.
3. Ở menu bên trái, chọn mục **Branches** (nằm dưới phần *Code and automation*).
4. Trong mục *Branch protection rules*, bấm nút **Add branch protection rule** (hoặc *Add rule*).
5. Điền thông tin quy tắc:
   - **Branch name pattern**: nhập chính xác `main`.
6. Tích chọn các mục sau:
   - ✅ **Require a pull request before merging**: Yêu cầu mọi thay đổi vào `main` đều phải thông qua Pull Request (không commit trực tiếp vào `main`).
     - *(Tùy chọn)* *Require approvals*: Đặt `1` nếu yêu cầu có ít nhất 1 thành viên approve trước khi gộp.
   - ✅ **Require status checks to pass before merging**: Bắt buộc các kiểm tra CI phải pass (màu xanh) mới cho phép merge.
     - ✅ **Require branches to be up to date before merging**: Đảm bảo nhánh PR đã cập nhật commit mới nhất từ `main`.
     - Trong ô tìm kiếm status checks (*Search for status checks in the last week for this repository*), lần lượt tìm và tích chọn **cả 3 checks bắt buộc**:
       - ✅ `Regression tests (npm test)`
       - ✅ `Backend build (.NET)`
       - ✅ `Frontend build (tsc + vite)`
   - ✅ **Do not allow bypassing the above settings**: Áp dụng quy tắc kiểm tra này cho cả Quản trị viên (Admin) để không ai có thể vô tình ép merge khi test đỏ.
7. Cuộn xuống cuối trang và bấm **Create** (hoặc **Save changes**), nhập mật khẩu GitHub nếu được hỏi xác nhận.

---

## Cách 2: Bật tự động bằng GitHub CLI (`gh`)

Nếu bạn đã cài đặt công cụ [GitHub CLI](https://cli.github.com/) và đã đăng nhập bằng tài khoản có quyền admin (`gh auth login`):

Chạy lệnh sau trong terminal từ thư mục repository:

```bash
gh api --method PUT /repos/KhanhTnDuy/smart-bus-ticketing-system/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Regression tests (npm test)",
      "Backend build (.NET)",
      "Frontend build (tsc + vite)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

---

## Kết quả sau khi kích hoạt

1. **Khi tạo PR mới vào `main`**:
   - GitHub Actions tự động kích hoạt workflow `.github/workflows/ci.yml`.
   - 3 luồng kiểm tra chạy song song / theo thứ tự:
     - `Backend build (.NET)`
     - `Frontend build (tsc + vite)`
     - `Regression tests (npm test)`
2. **Nếu có bất kỳ bước nào thất bại (Đỏ ❌)**:
   - GitHub hiển thị trạng thái check bị fail.
   - Nút **Merge pull request** trên giao diện GitHub bị khóa hoàn toàn (Disabled) với thông báo:
     > *"Required status checks must pass before merging. Merging is blocked."*
   - Không ai (kể cả Admin) có thể merge khi chưa sửa hết lỗi.
3. **Khi tất cả 3 kiểm tra thành công (Xanh ✅)**:
   - Nút **Merge pull request** chuyển sang màu xanh và cho phép gộp code an toàn vào `main`.
