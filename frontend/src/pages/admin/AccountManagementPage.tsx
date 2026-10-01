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
  Check,
  UserCheck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { User, Role, UserStatus } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';

export const AccountManagementPage: React.FC = () => {
  const { users, addAccount, updateAccount, deleteAccount, assignRole } = useData();
  const { currentUser } = useAuth();
  const { success, error, warning } = useToast();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    role: 'PASSENGER' as Role,
    status: 'ACTIVE' as UserStatus,
    department: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [targetRole, setTargetRole] = useState<Role>('PASSENGER');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm);

      const matchRole = filterRole === 'ALL' || u.role === filterRole;
      const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRole('ALL');
    setFilterStatus('ALL');
  };

  // Open Handlers for explicit actions
  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      role: 'PASSENGER',
      status: 'ACTIVE',
      department: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenView = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
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
      department: user.department || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenRoleAssign = (user: User) => {
    setSelectedUser(user);
    setTargetRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleOpenDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      warning('Không thể xóa tài khoản của chính bạn đang đăng nhập.');
      return;
    }
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  // Validation
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = 'Họ và tên không được để trống.';
    if (!formData.username.trim()) errs.username = 'Tên đăng nhập không được để trống.';
    if (!formData.email.trim()) {
      errs.email = 'Email không được để trống.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Định dạng email không hợp lệ.';
    }
    if (!formData.phone.trim()) {
      errs.phone = 'Số điện thoại không được để trống.';
    } else if (!/^[0-9]{9,11}$/.test(formData.phone.replace(/\s+/g, ''))) {
      errs.phone = 'Số điện thoại phải từ 9 đến 11 chữ số.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handlers
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const res = await addAccount(formData);
    if (res.success) {
      success(`Tạo mới tài khoản [${formData.username}] thành công!`);
      setIsAddModalOpen(false);
    } else {
      error(res.message || 'Thêm tài khoản thất bại.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!validateForm()) return;

    const res = await updateAccount(selectedUser.id, formData);
    if (res.success) {
      success(`Cập nhật thông tin tài khoản [${selectedUser.username}] thành công!`);
      setIsEditModalOpen(false);
    } else {
      error(res.message || 'Cập nhật thất bại.');
    }
  };

  const handleConfirmRoleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const res = await assignRole(selectedUser.id, targetRole);
    if (res.success) {
      success(`Đã cập nhật vai trò cho [${selectedUser.fullName}] thành ${targetRole}!`);
      setIsRoleModalOpen(false);
    } else {
      error(res.message || 'Phân quyền thất bại.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    const res = await deleteAccount(selectedUser.id);
    if (res.success) {
      success(`Đã xóa hoàn toàn tài khoản [${selectedUser.fullName}] khỏi hệ thống!`);
      setIsDeleteOpen(false);
    } else {
      error(res.message || 'Xóa tài khoản thất bại.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Title, Yellow Accent and Dedicated "+ Thêm tài khoản" Button */}
      <PageHeader
        title="Quản Lý Tài Khoản Hệ Thống"
        subtitle="Danh sách nhân sự, phân bổ quyền truy cập và điều hành tài khoản trong cổng thông tin xe buýt thông minh."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Quản trị hệ thống' },
          { label: 'Quản lý tài khoản' },
        ]}
        action={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-institutional-700 hover:bg-institutional-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Thêm tài khoản</span>
          </button>
        }
      />

      {/* 2. Search & Filter Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
          <span>Bộ lọc & Tra cứu tài khoản:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, email, username..."
              className="block w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Role select filter */}
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả vai trò --</option>
              <option value="ADMIN">Quản trị viên (Admin)</option>
              <option value="MANAGER">Quản lý tuyến (Manager)</option>
              <option value="DRIVER">Tài xế (Driver)</option>
              <option value="PASSENGER">Hành khách (Passenger)</option>
            </select>
          </div>

          {/* Status select filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="ACTIVE">Hoạt động (Active)</option>
              <option value="INACTIVE">Tạm ngưng (Inactive)</option>
              <option value="LOCKED">Đã khóa (Locked)</option>
            </select>
          </div>

          {/* Clear filter button */}
          <div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Account Data Table (Separated buttons: Xem, Sửa, Xóa, Đổi vai trò) */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tổng số tài khoản: <span className="text-institutional-700 dark:text-sky-400 font-extrabold">{filteredUsers.length}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            * Mỗi thao tác đều có hành vi riêng biệt, không dùng nút chung
          </span>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tài khoản"
            description="Không có tài khoản nào phù hợp với bộ lọc hiện tại. Thử xóa bộ lọc hoặc thêm tài khoản mới."
            action={
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-institutional-700 text-white rounded text-xs font-semibold hover:bg-institutional-800"
              >
                Đặt lại bộ lọc
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Mã ID</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Tên đăng nhập</th>
                  <th className="px-4 py-3">Email liên hệ</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3 text-center">Thao tác riêng biệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {user.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            user.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=0c356a&color=fff`
                          }
                          alt=""
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <span>{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      @{user.username}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="role" value={user.role} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="userStatus" value={user.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {user.createdAt}
                    </td>
                    
                    {/* Separate Visible Action Buttons as mandated */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        
                        {/* Xem */}
                        <button
                          type="button"
                          onClick={() => handleOpenView(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors"
                          title="Xem chi tiết tài khoản"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>

                        {/* Sửa */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-colors"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        {/* Đổi vai trò */}
                        <button
                          type="button"
                          onClick={() => handleOpenRoleAssign(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/80 transition-colors"
                          title="Phân quyền vai trò trực tiếp"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Đổi quyền</span>
                        </button>

                        {/* Xóa */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
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

      {/* ========================================================
          MODAL 1: ADD ACCOUNT FORM
      ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Mới Tài Khoản Người Dùng"
        subtitle="Khởi tạo tài khoản nhân sự hoặc hành khách vào hệ thống xe buýt"
        maxWidth="xl"
        icon={<UserPlus className="w-5 h-5 text-institutional-600" />}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Họ và tên */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.fullName && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.fullName}</p>
              )}
            </div>

            {/* Tên đăng nhập */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tên đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ví dụ: tuankiet.hoang"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.username && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.username}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Email liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tuankiet@bus.com"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912345678"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.phone && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>
              )}
            </div>

            {/* Vai trò */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Vai trò phân quyền <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="PASSENGER">Hành khách (PASSENGER)</option>
                <option value="DRIVER">Tài xế xe buýt (DRIVER)</option>
                <option value="MANAGER">Quản lý tuyến & hạ tầng (MANAGER)</option>
                <option value="ADMIN">Quản trị viên hệ thống (ADMIN)</option>
              </select>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái tài khoản <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                <option value="LOCKED">Đã khóa (LOCKED)</option>
              </select>
            </div>

            {/* Đơn vị công tác */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Phòng ban / Đơn vị công tác
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Ví dụ: Đội Vận Tải Tuyến 01 hoặc Ban Giám Đốc"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-institutional-700 hover:bg-institutional-800 text-white shadow-sm transition-colors"
            >
              + Xác nhận thêm tài khoản
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: VIEW READ-ONLY ACCOUNT DETAILS
      ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi Tiết Hồ Sơ Tài Khoản"
        subtitle="Thông tin định danh và phân quyền thực thi trong hệ thống"
        maxWidth="lg"
        icon={<Eye className="w-5 h-5 text-sky-500" />}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <img
                src={
                  selectedUser.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.fullName)}&background=0c356a&color=fff`
                }
                alt=""
                className="w-16 h-16 rounded-full object-cover ring-4 ring-institutional-500/20"
              />
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedUser.fullName}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Mã tài khoản: {selectedUser.id}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="role" value={selectedUser.role} />
                  <Badge variant="userStatus" value={selectedUser.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tên đăng nhập:</span>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  @{selectedUser.username}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Email:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedUser.email}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Số điện thoại:</span>
                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedUser.phone}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Ngày đăng ký:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedUser.createdAt}
                </div>
              </div>

              <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Đơn vị / Phòng ban:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedUser.department || 'Chưa cập nhật'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL 3: EDIT ACCOUNT FORM (PREFILLED)
      ======================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Thông Tin Tài Khoản"
        subtitle={`Cập nhật dữ liệu cho tài khoản [${selectedUser?.username}]`}
        maxWidth="xl"
        icon={<Edit2 className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.fullName && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tên đăng nhập (Username)
              </label>
              <input
                type="text"
                value={formData.username}
                disabled
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#081021] text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Email liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.phone && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Vai trò phân quyền <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                <option value="MANAGER">Quản lý tuyến (MANAGER)</option>
                <option value="DRIVER">Tài xế (DRIVER)</option>
                <option value="PASSENGER">Hành khách (PASSENGER)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái tài khoản <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                <option value="LOCKED">Đã khóa (LOCKED)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Phòng ban / Đơn vị
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 4: DIRECT ROLE ASSIGNMENT DIALOG (TASK 1.2)
      ======================================================== */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Phân Quyền Vai Trò Trực Tiếp"
        subtitle={`Thay đổi phân quyền hệ thống cho nhân sự [${selectedUser?.fullName}]`}
        maxWidth="md"
        icon={<ShieldCheck className="w-5 h-5 text-purple-500" />}
      >
        {selectedUser && (
          <form onSubmit={handleConfirmRoleAssign} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tài khoản:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedUser.fullName} (@{selectedUser.username})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vai trò hiện tại:</span>
                <Badge variant="role" value={selectedUser.role} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Chọn vai trò mới:
              </label>
              <div className="space-y-2">
                {(['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] as Role[]).map((r) => {
                  const label =
                    r === 'ADMIN'
                      ? 'Quản trị viên (Toàn quyền hệ thống & Audit Logs)'
                      : r === 'MANAGER'
                      ? 'Quản lý tuyến (Tuyến, Trạm dừng, Giá vé, Khiếu nại)'
                      : r === 'DRIVER'
                      ? 'Tài xế vận hành (Theo dõi lịch trình & trạm đón)'
                      : 'Hành khách (Gửi khiếu nại & Đánh giá chuyến đi)';

                  return (
                    <label
                      key={r}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        targetRole === r
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c162d] hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetRole"
                        value={r}
                        checked={targetRole === r}
                        onChange={() => setTargetRole(r)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold">{r}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {label}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
              >
                Xác nhận đổi quyền
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================
          MODAL 5: DELETE CONFIRMATION DIALOG (TASK 1.1)
      ======================================================== */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác Nhận Xóa Tài Khoản"
        message="Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống? Dữ liệu tài khoản sẽ không thể phục hồi và hoạt động này sẽ được ghi nhận vào Nhật ký hệ thống."
        itemName={selectedUser ? `${selectedUser.fullName} (${selectedUser.email})` : ''}
        confirmLabel="Xác nhận xóa"
        cancelLabel="Hủy"
        isDangerous={true}
      />
    </div>
  );
};
