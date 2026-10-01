import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Eye,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { useAccountManagement } from '../../hooks/useAccountManagement';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import type { User, Role, UserStatus } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';

export const AccountManagementPage: React.FC = () => {
  const { users, loading, error: loadError, reload, addAccount, updateAccount, deleteAccount, assignRole } =
    useAccountManagement();
  const { currentUser } = useAuth();
  const { success, error, warning } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'PASSENGER' as Role,
    status: 'ACTIVE' as UserStatus,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [targetRole, setTargetRole] = useState<Role>('PASSENGER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const matchSearch =
          u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phone.includes(searchTerm);
        const matchRole = filterRole === 'ALL' || u.role === filterRole;
        const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
        return matchSearch && matchRole && matchStatus;
      }),
    [users, searchTerm, filterRole, filterStatus]
  );

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = 'Họ và tên không được để trống.';
    if (!formData.username.trim()) errs.username = 'Tên đăng nhập không được để trống.';
    if (!formData.email.trim()) errs.email = 'Email không được để trống.';
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim()))
      errs.email = 'Email không hợp lệ.';
    if (!formData.phone.trim()) errs.phone = 'Số điện thoại không được để trống.';
    else if (!/^[0-9]{9,11}$/.test(formData.phone.replace(/\s+/g, '')))
      errs.phone = 'Số điện thoại phải 9-11 chữ số.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenAdd = () => {
    setFormData({ fullName: '', username: '', email: '', phone: '', role: 'PASSENGER', status: 'ACTIVE' });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const res = await addAccount(formData);
      if (res.success) {
        success(`Tạo tài khoản [${formData.username}] thành công!`);
        setIsAddOpen(false);
      } else error(res.message || 'Thêm tài khoản thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !validateForm()) return;
    setIsSubmitting(true);
    try {
      const res = await updateAccount(selectedUser.id, formData);
      if (res.success) {
        success(`Cập nhật [${selectedUser.username}] thành công!`);
        setIsEditOpen(false);
      } else error(res.message || 'Cập nhật thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRoleAssign = (user: User) => {
    setSelectedUser(user);
    setTargetRole(user.role);
    setIsRoleOpen(true);
  };

  const handleConfirmRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await assignRole(selectedUser.id, targetRole);
      if (res.success) {
        success(`Cập nhật vai trò cho [${selectedUser.fullName}] thành ${targetRole}!`);
        setIsRoleOpen(false);
      } else error(res.message || 'Phân quyền thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      warning('Không thể xóa tài khoản của chính bạn.');
      return;
    }
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await deleteAccount(selectedUser.id);
      if (res.success) {
        success(`Đã xóa [${selectedUser.fullName}]!`);
        setIsDeleteOpen(false);
      } else error(res.message || 'Xóa thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản Lý Tài Khoản Hệ Thống"
        subtitle="Danh sách nhân sự, phân bổ quyền truy cập và điều hành tài khoản."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Quản trị hệ thống' },
          { label: 'Quản lý tài khoản' },
        ]}
        action={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Thêm tài khoản</span>
          </button>
        }
      />

      {loadError && (
        <div className="flex items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 bg-rose-50">
          <span className="text-xs font-semibold text-rose-700">Lỗi: {loadError}</span>
          <button
            type="button"
            onClick={reload}
            className="px-3 py-1.5 text-xs font-bold rounded border border-rose-400 text-rose-700 hover:bg-rose-100"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Bộ lọc & Tra cứu:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 bg-white"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 text-xs rounded border border-slate-300 bg-white"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="DRIVER">Driver</option>
            <option value="PASSENGER">Passenger</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded border border-slate-300 bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="LOCKED">Locked</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterRole('ALL');
              setFilterStatus('ALL');
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tổng số: <span className="text-blue-700 font-extrabold">{filteredUsers.length}</span>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tài khoản"
            description="Không có tài khoản nào phù hợp với bộ lọc hiện tại."
            action={
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800"
              >
                Thêm tài khoản
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 text-xs">{user.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{user.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{user.email}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">{user.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="role" value={user.role} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="userStatus" value={user.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsViewOpen(true);
                          }}
                          className="px-2 py-1 text-xs font-semibold rounded bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenRoleAssign(user)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100"
                        >
                          <ShieldCheck className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(user)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Thêm Mới Tài Khoản"
        subtitle="Khởi tạo tài khoản mới"
        maxWidth="xl"
        icon={<UserPlus className="w-5 h-5 text-blue-600" />}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.fullName && <p className="text-[11px] text-rose-500 mt-1">{formErrors.fullName}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tên đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.username && <p className="text-[11px] text-rose-500 mt-1">{formErrors.username}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.email && <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.phone && <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vai trò <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PASSENGER">Passenger</option>
                <option value="DRIVER">Driver</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Trạng thái <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white"
            >
              {isSubmitting ? 'Đang thêm...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Chi Tiết Tài Khoản"
        subtitle="Thông tin định danh và phân quyền"
        maxWidth="lg"
        icon={<Eye className="w-5 h-5 text-sky-500" />}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">ID:</span>
                <div className="font-mono font-bold text-slate-800 mt-0.5">{selectedUser.id}</div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Username:</span>
                <div className="font-mono font-bold text-slate-800 mt-0.5">@{selectedUser.username}</div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Họ tên:</span>
                <div className="font-bold text-slate-800 mt-0.5">{selectedUser.fullName}</div>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Email:</span>
                <div className="font-bold text-slate-800 mt-0.5">{selectedUser.email}</div>
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Chỉnh Sửa Tài Khoản"
        subtitle={`Cập nhật [${selectedUser?.username}]`}
        maxWidth="xl"
        icon={<Edit2 className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.fullName && <p className="text-[11px] text-rose-500 mt-1">{formErrors.fullName}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                disabled
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.email && <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {formErrors.phone && <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vai trò <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="DRIVER">Driver</option>
                <option value="PASSENGER">Passenger</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Trạng thái <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOCKED">Locked</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRoleOpen}
        onClose={() => setIsRoleOpen(false)}
        title="Phân Quyền Vai Trò"
        subtitle={`Thay đổi quyền cho [${selectedUser?.fullName}]`}
        maxWidth="md"
        icon={<ShieldCheck className="w-5 h-5 text-purple-500" />}
      >
        {selectedUser && (
          <form onSubmit={handleConfirmRole} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tài khoản:</span>
                <span className="font-bold text-slate-900">{selectedUser.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vai trò hiện tại:</span>
                <Badge variant="role" value={selectedUser.role} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Chọn vai trò mới:
              </label>
              <div className="space-y-2">
                {(['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] as Role[]).map((r) => (
                  <label
                    key={r}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      targetRole === r
                        ? 'border-purple-500 bg-purple-50 text-purple-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetRole"
                      value={r}
                      checked={targetRole === r}
                      onChange={() => setTargetRole(r)}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <div className="font-bold">{r}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsRoleOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white"
              >
                {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác Nhận Xóa Tài Khoản"
        message="Bạn có chắc chắn muốn xóa tài khoản này? Dữ liệu sẽ không thể phục hồi."
        itemName={selectedUser ? `${selectedUser.fullName} (${selectedUser.email})` : ''}
        confirmLabel="Xác nhận xóa"
        cancelLabel="Hủy"
        isDangerous
      />
    </div>
  );
};
