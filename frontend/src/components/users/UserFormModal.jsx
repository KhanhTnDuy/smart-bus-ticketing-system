import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { ROLES, ROLE_LABELS } from '../../routes/roleNavigation';
import { User, Mail, Phone, Lock, Tag, AlertCircle } from 'lucide-react';

export const UserFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isEditMode = false,
  initialData = null,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.PASSENGER,
    status: 'ACTIVE',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        username: initialData.username || '',
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        password: '', // Để trống khi edit
        role: initialData.role || ROLES.PASSENGER,
        status: initialData.status || 'ACTIVE',
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        username: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        role: ROLES.PASSENGER,
        status: 'ACTIVE',
        notes: ''
      });
    }
    setErrors({});
  }, [isEditMode, initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Xóa lỗi khi người dùng bắt đầu sửa
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // 1. Tên đăng nhập (username)
    if (!isEditMode) {
      if (!formData.username.trim()) {
        newErrors.username = 'Tên đăng nhập không được để trống.';
      } else if (formData.username.trim().length < 3) {
        newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự.';
      } else if (/\s/.test(formData.username)) {
        newErrors.username = 'Tên đăng nhập không được chứa khoảng trắng.';
      }
    }

    // 2. Họ và tên
    if (!formData.name.trim()) {
      newErrors.name = 'Họ và tên không được để trống.';
    }

    // 3. Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Địa chỉ email không đúng định dạng (VD: ten@domain.com).';
    }

    // 4. Số điện thoại
    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống.';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Số điện thoại không hợp lệ (Phải là SĐT Việt Nam 10 chữ số).';
    }

    // 5. Mật khẩu
    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = 'Mật khẩu không được để trống khi tạo tài khoản.';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
      }
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.';
    }

    // 6. Vai trò
    if (!formData.role) {
      newErrors.role = 'Vui lòng chọn một vai trò cho tài khoản.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const roleOptions = [
    { value: ROLES.ADMIN, label: 'Admin (Quản trị viên)' },
    { value: ROLES.MANAGER, label: 'Quản lý điều hành' },
    { value: ROLES.DRIVER, label: 'Tài xế' },
    { value: ROLES.PASSENGER, label: 'Hành khách' }
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'INACTIVE', label: 'Tạm khóa / Ngừng hoạt động' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Chỉnh sửa tài khoản: ${initialData?.name}` : 'Thêm tài khoản mới'}
      maxWidth="620px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditMode ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Tên đăng nhập */}
          <Input
            label="Tên đăng nhập"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="vd: nguyenvana"
            required={!isEditMode}
            disabled={isEditMode}
            error={errors.username}
            icon={User}
            helperText={isEditMode ? 'Không thể đổi tên đăng nhập sau khi tạo' : ''}
          />

          {/* Họ và tên */}
          <Input
            label="Họ và tên"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="vd: Nguyễn Văn A"
            required
            error={errors.name}
            icon={User}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Email */}
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="vd: vana@gmail.com"
            required
            error={errors.email}
            icon={Mail}
          />

          {/* Số điện thoại */}
          <Input
            label="Số điện thoại"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="vd: 0912345678"
            required
            error={errors.phone}
            icon={Phone}
          />
        </div>

        {/* Mật khẩu */}
        <Input
          label={isEditMode ? 'Mật khẩu mới (Để trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo'}
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder={isEditMode ? 'Nhập mật khẩu mới nếu muốn đổi...' : 'Tối thiểu 6 ký tự'}
          required={!isEditMode}
          error={errors.password}
          icon={Lock}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Vai trò */}
          <Select
            label="Vai trò hệ thống (Role)"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
            required
            error={errors.role}
          />

          {/* Trạng thái */}
          <Select
            label="Trạng thái hoạt động"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={statusOptions}
            required
          />
        </div>

        {/* Ghi chú */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Ghi chú bổ sung</label>
          <input
            type="text"
            name="notes"
            className="form-input"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ghi chú thêm về phân công, bằng lái, phòng ban..."
          />
        </div>
      </form>
    </Modal>
  );
};
