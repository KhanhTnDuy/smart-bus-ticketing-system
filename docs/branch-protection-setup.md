# Hướng dẫn Bật Branch Protection cho nhánh `main`

Tài liệu này hướng dẫn chi tiết cách cấu hình **Branch Protection Rule** trên GitHub cho nhánh `main` để đảm bảo:
- PR mới tự động kích hoạt workflow CI (Build Backend .NET + Build/Lint Frontend Vite + Chạy Regression Tests).
- **Chặn merge khi CI đỏ**: Nút "Merge pull request" bị vô hiệu hóa (disabled) nếu bất kỳ kiểm tra nào thất bại.
- Nhánh `main` luôn luôn xanh và ổn định.

---

## Cách 1: Cấu hình qua giao diện GitHub Web (Khuyên dùng)

> **Lưu ý**: Bạn cần quyền **Admin** hoặc **Maintainer** trên repository `smart-bus-ticketing-system`.

1. Truy cập vào repository trên GitHub:
   `https://github.com/KhanhTnDuy/smart-bus-ticketing-system`
2. Bấm vào tab **Settings** ở thanh menu trên cùng.
3. Ở menu bên trái, chọn mục **Branches** (nằm dưới phần *Code and automation*).
4. Trong mục *Branch protection rules*, bấm nút **Add branch protection rule** (hoặc *Add rule*).
5. Điền thông tin quy tắc:
   - **Branch name pattern**: nhập chính xác `main`.
6. Tích chọn các mục sau:
   - ✅ **Require a pull request before merging**: Yêu cầu mọi thay đổi vào `main` đều phải qua Pull Request.
     - *(Tùy chọn)* *Require approvals*: Đặt `1` nếu nhóm muốn có ít nhất 1 thành viên review code trước khi gộp.
   - ✅ **Require status checks to pass before merging**: Bắt buộc các kiểm tra CI phải pass (xanh) mới được merge.
     - ✅ **Require branches to be up to date before merging**: Đảm bảo nhánh PR đã cập nhật code mới nhất từ `main`.
     - Trong ô tìm kiếm status checks (*Search for status checks in the last week for this repository*), gõ và chọn:
       - `ci / build-and-test` *(Status check tổng hợp của pipeline CI)*
       - Hoặc có thể tích thêm:
         - `Backend Build (.NET)`
         - `Frontend Build & Lint (Vite)`
         - `Automated Regression Tests`
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
      "ci / build-and-test"
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

1. **Khi tạo PR mới**:
   - GitHub Actions sẽ tự động khởi động workflow `.github/workflows/ci.yml`.
   - Chạy 3 luồng kiểm tra:
     - `Backend Build (.NET)`: Biên dịch dự án backend .NET 10.
     - `Frontend Build & Lint (Vite)`: Chạy oxlint và build TypeScript + Vite.
     - `Automated Regression Tests`: Dựng MySQL service container, nạp dữ liệu demo động và chạy test tranh ghế (`seat-lock.mjs`) & hoàn tiền (`refund-flow.mjs`).
2. **Nếu có bất kỳ bước nào thất bại (Đỏ)**:
   - Trạng thái `ci / build-and-test` sẽ báo `Failure`.
   - Nút **Merge pull request** trên GitHub sẽ bị khóa (Disabled) và hiển thị thông báo:
     > *"Required status check 'ci / build-and-test' is failing. Merging is blocked."*
3. **Khi tất cả kiểm tra thành công (Xanh)**:
   - Nút **Merge pull request** chuyển sang màu xanh và cho phép gộp code vào `main`.
