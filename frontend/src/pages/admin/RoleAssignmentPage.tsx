import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  Shield,
  Briefcase,
  Car,
  User as UserIcon,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Role, User } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const RoleAssignmentPage: React.FC = () => {
  const { users, assignRole } = useData();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('PASSENGER');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAssignModal = (user: User, newRole: Role) => {
    setSelectedUser(user);
    setTargetRole(newRole);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUser) return;
    const res = assignRole(selectedUser.id, targetRole);
    if (res.success) {
      success(`Cập nhật vai trò cho [${selectedUser.fullName}] sang ${targetRole} thành công!`);
      setIsConfirmModalOpen(false);
    } else {
      error(res.message || 'Phân quyền không thành công.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Phân Quyền Vai Trò & Ma Trận Truy Cập"
        subtitle="Cấu hình thẩm quyền tác vụ cho tài khoản người dùng: Quản trị viên, Quản lý điều hành tuyến, Tài xế và Hành khách."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Quản trị hệ thống', href: '/admin/accounts' },
          { label: 'Phân quyền vai trò' },
        ]}
        icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
      />

      {/* 2. Institutional Role Scope Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-[#131e3a] shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs">
            <Shield className="w-4 h-4" />
            <span>ADMIN (QUẢN TRỊ VIÊN)</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {users.filter((u) => u.role === 'ADMIN').length} tài khoản
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Toàn quyền quản lý tài khoản, thay đổi vai trò phân quyền và giám sát toàn bộ Nhật ký thanh tra hệ thống.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-[#131e3a] shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
            <Briefcase className="w-4 h-4" />
            <span>MANAGER (QUẢN LÝ TUYẾN)</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {users.filter((u) => u.role === 'MANAGER').length} tài khoản
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Quản trị hạ tầng mạng lưới tuyến xe, các trạm dừng, biểu giá vé và giải quyết các khiếu nại của hành khách.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#131e3a] shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            <Car className="w-4 h-4" />
            <span>DRIVER (TÀI XẾ XE BUÝT)</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {users.filter((u) => u.role === 'DRIVER').length} tài khoản
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Truy cập lịch trình điều xe, danh mục lộ trình các trạm dừng và thời gian vận hành được phân bổ.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-[#131e3a] shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <UserIcon className="w-4 h-4" />
            <span>PASSENGER (HÀNH KHÁCH)</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {users.filter((u) => u.role === 'PASSENGER').length} tài khoản
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Gửi phản ánh khiếu nại dịch vụ, chấm điểm sao đánh giá chất lượng các chuyến xe đã trải nghiệm.
          </p>
        </div>

      </div>

      {/* 3. Role Assignment Table with Instant Role Dropdowns and Change Actions */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-[#1e2f57] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Bảng phân quyền tài khoản trực tiếp</span>
          </div>

          <div className="w-full sm:w-72 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Lọc tài khoản..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Mã ID</th>
                <th className="px-4 py-3">Họ và tên nhân sự</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò hiện tại</th>
                <th className="px-4 py-3">Gán vai trò mới</th>
                <th className="px-4 py-3 text-center">Hành động phân quyền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#19274c]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1a2b53]/50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                    {user.id}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {user.fullName} (@{user.username})
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="role" value={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {(['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] as Role[]).map((r) => {
                        const isCurrent = user.role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleOpenAssignModal(user, r)}
                            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                              isCurrent
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-950/60'
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenAssignModal(user, user.role)}
                      className="px-3 py-1 text-xs font-semibold rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/80 transition-colors"
                    >
                      Đổi vai trò
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Xác Nhận Phân Quyền Vai Trò"
        subtitle="Hệ thống sẽ ghi nhận giao dịch thay đổi quyền vào Audit Logs"
        maxWidth="md"
        icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Tài khoản mục tiêu:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedUser.fullName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Vai trò hiện tại:</span>
                <Badge variant="role" value={selectedUser.role} size="sm" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Vai trò sau khi chuyển:</span>
                <Badge variant="role" value={targetRole} size="sm" />
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Bạn có chắc chắn muốn chuyển vai trò của tài khoản này sang <strong>{targetRole}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
              >
                Xác nhận đổi quyền
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
