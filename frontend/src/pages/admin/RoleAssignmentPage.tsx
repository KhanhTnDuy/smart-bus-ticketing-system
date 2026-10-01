import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Users,
  Shield,
  Briefcase,
  Car,
  User as UserIcon,
} from 'lucide-react';
import { useAccountManagement } from '../../hooks/useAccountManagement';
import { useToast } from '../../context/ToastContext';
import type { Role, User } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const RoleAssignmentPage: React.FC = () => {
  const { users, error: loadError, reload, assignRole } = useAccountManagement();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('PASSENGER');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenRoleModal = (user: User, newRole: Role) => {
    setSelectedUser(user);
    setTargetRole(newRole);
    setIsConfirmOpen(true);
  };

  const handleConfirmRole = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const res = await assignRole(selectedUser.id, targetRole);
      if (res.success) {
        success(`Cập nhật vai trò cho [${selectedUser.fullName}] thành ${targetRole}!`);
        setIsConfirmOpen(false);
      } else error(res.message || 'Phân quyền không thành công.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân Quyền Vai Trò & Ma Trận Truy Cập"
        subtitle="Cấu hình thẩm quyền tác vụ cho tài khoản người dùng."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Quản trị hệ thống', href: '/admin/accounts' },
          { label: 'Phân quyền vai trò' },
        ]}
        icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-purple-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
            <Shield className="w-4 h-4" />
            <span>ADMIN</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{users.filter((u) => u.role === 'ADMIN').length}</div>
          <p className="text-[11px] text-slate-500 leading-snug">Toàn quyền quản lý hệ thống.</p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
            <Briefcase className="w-4 h-4" />
            <span>MANAGER</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{users.filter((u) => u.role === 'MANAGER').length}</div>
          <p className="text-[11px] text-slate-500 leading-snug">Quản trị tuyến xe và hạ tầng.</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
            <Car className="w-4 h-4" />
            <span>DRIVER</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{users.filter((u) => u.role === 'DRIVER').length}</div>
          <p className="text-[11px] text-slate-500 leading-snug">Quản lý lịch trình điều xe.</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-white shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
            <UserIcon className="w-4 h-4" />
            <span>PASSENGER</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{users.filter((u) => u.role === 'PASSENGER').length}</div>
          <p className="text-[11px] text-slate-500 leading-snug">Gửi khiếu nại và đánh giá.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Bảng phân quyền tài khoản</span>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Lọc tài khoản..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò hiện tại</th>
                <th className="px-4 py-3">Gán vai trò mới</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">{user.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {user.fullName} (@{user.username})
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="role" value={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] as Role[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleOpenRoleModal(user, r)}
                          className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                            user.role === r
                              ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                              : 'bg-slate-100 text-slate-600 hover:bg-purple-100'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenRoleModal(user, user.role)}
                      className="px-3 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100"
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

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Xác Nhận Phân Quyền Vai Trò"
        subtitle="Hệ thống sẽ ghi nhận giao dịch vào Audit Logs"
        maxWidth="md"
        icon={<ShieldCheck className="w-5 h-5 text-purple-600" />}
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Tài khoản mục tiêu:</span>
                <span className="font-bold text-slate-900">{selectedUser.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Vai trò hiện tại:</span>
                <Badge variant="role" value={selectedUser.role} size="sm" />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-semibold">Vai trò sau khi chuyển:</span>
                <Badge variant="role" value={targetRole} size="sm" />
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn chuyển vai trò sang <strong>{targetRole}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmRole}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white"
              >
                {isSaving ? 'Đang cập nhật...' : 'Xác nhận đổi quyền'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
