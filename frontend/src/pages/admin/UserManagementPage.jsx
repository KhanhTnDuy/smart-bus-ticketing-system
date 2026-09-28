import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../api/userService';
import { ROLES, ROLE_LABELS } from '../../routes/roleNavigation';

import { UserFilterBar } from '../../components/users/UserFilterBar';
import { UserTable } from '../../components/users/UserTable';
import { UserFormModal } from '../../components/users/UserFormModal';
import { UserDetailModal } from '../../components/users/UserDetailModal';
import { DeleteUserModal } from '../../components/users/DeleteUserModal';

import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';

import { Users, ShieldAlert, Bus, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';

export const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tải danh sách người dùng từ service
  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await userService.getUsers();
      setUsers(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Thống kê nhanh số lượng
  const stats = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter(u => u.role === ROLES.ADMIN).length,
      manager: users.filter(u => u.role === ROLES.MANAGER).length,
      driver: users.filter(u => u.role === ROLES.DRIVER).length,
      passenger: users.filter(u => u.role === ROLES.PASSENGER).length,
      active: users.filter(u => u.status === 'ACTIVE').length
    };
  }, [users]);

  // Bộ lọc tìm kiếm kết hợp
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Kiểm tra từ khóa tìm kiếm (họ tên, username, email, phone)
      const keyword = searchTerm.trim().toLowerCase();
      const matchKeyword =
        !keyword ||
        (user.name && user.name.toLowerCase().includes(keyword)) ||
        (user.username && user.username.toLowerCase().includes(keyword)) ||
        (user.email && user.email.toLowerCase().includes(keyword)) ||
        (user.phone && user.phone.includes(keyword));

      // 2. Kiểm tra lọc theo vai trò
      const matchRole = roleFilter === 'ALL' || user.role === roleFilter;

      // 3. Kiểm tra lọc theo trạng thái
      const matchStatus = statusFilter === 'ALL' || user.status === statusFilter;

      return matchKeyword && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Mở modal thêm người dùng
  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (user) => {
    setIsEditMode(true);
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  // Mở modal xem chi tiết
  const handleOpenDetailModal = (user) => {
    setDetailUser(user);
    setIsDetailModalOpen(true);
  };

  // Mở modal xóa
  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Xử lý gửi form (Thêm hoặc Sửa)
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && selectedUser) {
        const updated = await userService.updateUser(selectedUser.id, formData);
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
        showToast(`Đã cập nhật thông tin tài khoản "${updated.name}" thành công!`, 'success');
      } else {
        const created = await userService.createUser(formData);
        setUsers(prev => [created, ...prev]);
        showToast(`Đã thêm mới tài khoản "${created.name}" thành công!`, 'success');
      }
      setIsFormModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Xử lý thất bại. Vui lòng thử lại!', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý xác nhận xóa tài khoản
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    if (userToDelete.id === currentUser?.id) {
      showToast('Bạn không thể tự xóa tài khoản của chính mình!', 'warning');
      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      await userService.deleteUser(userToDelete.id);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      showToast(`Đã xóa vĩnh viễn tài khoản "${userToDelete.name}".`, 'info');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err) {
      showToast(err.message || 'Không thể xóa tài khoản này.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Quản lý Tài khoản & Phân quyền</h1>
          <p>Danh sách toàn bộ tài khoản, gán vai trò và quản trị trạng thái truy cập hệ thống SmartBus</p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchUsers}
            disabled={isLoading}
            title="Làm mới danh sách"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tổng số tài khoản
            </span>
            <div style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '6px', borderRadius: '8px' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '0.2rem' }}>
            {stats.active} đang hoạt động
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Quản trị viên (Admin)
            </span>
            <div style={{ color: 'var(--role-admin-text)', backgroundColor: 'var(--role-admin-bg)', padding: '6px', borderRadius: '8px' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>
            {stats.admin}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Toàn quyền hệ thống
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Tài xế vận hành
            </span>
            <div style={{ color: 'var(--role-driver-text)', backgroundColor: 'var(--role-driver-bg)', padding: '6px', borderRadius: '8px' }}>
              <Bus size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>
            {stats.driver}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Phụ trách ca chạy
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Hành khách đăng ký
            </span>
            <div style={{ color: 'var(--role-passenger-text)', backgroundColor: 'var(--role-passenger-bg)', padding: '6px', borderRadius: '8px' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>
            {stats.passenger}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Sử dụng vé & phản hồi
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <UserFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={() => setSearchTerm('')}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddNewUser={handleOpenAddModal}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <Loading text="Đang tải danh sách tài khoản..." />
      ) : errorMessage ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: 'var(--danger-light)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #fecaca'
          }}
        >
          <AlertCircle size={36} color="var(--danger)" style={{ marginBottom: '0.5rem' }} />
          <h4 style={{ color: 'var(--danger-text)', marginBottom: '0.5rem' }}>Không thể tải dữ liệu</h4>
          <p style={{ color: 'var(--danger-text)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {errorMessage}
          </p>
          <Button variant="danger" size="sm" onClick={fetchUsers}>
            Thử lại
          </Button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Không tìm thấy tài khoản phù hợp' : 'Chưa có tài khoản nào'}
          description={
            searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc vai trò, trạng thái.'
              : 'Hiện chưa có dữ liệu tài khoản nào trong hệ thống. Hãy tạo tài khoản đầu tiên ngay!'
          }
          actionText={searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Xóa bộ lọc tìm kiếm' : 'Thêm tài khoản mới'}
          onAction={
            searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
              ? () => {
                  setSearchTerm('');
                  setRoleFilter('ALL');
                  setStatusFilter('ALL');
                }
              : handleOpenAddModal
          }
        />
      ) : (
        <>
          <div style={{ marginBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{users.length}</strong> tài khoản
            </span>
          </div>

          <UserTable
            users={filteredUsers}
            onViewDetail={handleOpenDetailModal}
            onEditUser={handleOpenEditModal}
            onDeleteUser={handleOpenDeleteModal}
            currentUserId={currentUser?.id}
          />
        </>
      )}

      {/* Form Modal (Thêm / Sửa) */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        isEditMode={isEditMode}
        initialData={selectedUser}
        isSubmitting={isSubmitting}
      />

      {/* Detail Modal (Xem chi tiết & quyền) */}
      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={detailUser}
        onEdit={(user) => {
          setIsDetailModalOpen(false);
          handleOpenEditModal(user);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        user={userToDelete}
        isDeleting={isDeleting}
        isCurrentUser={userToDelete?.id === currentUser?.id}
      />
    </div>
  );
};
