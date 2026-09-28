import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getDefaultRouteForRole, ROLE_LABELS, ROLES } from '../../routes/roleNavigation';
import { Menu, LogOut, Sparkles, User } from 'lucide-react';
import { Button } from '../common/Button';
import { RoleBadge } from '../common/Badge';

export const Topbar = ({ onToggleSidebar }) => {
  const { user, role, logout, switchRole } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    showToast('Bạn đã đăng xuất thành công khỏi hệ thống.', 'info');
    navigate('/login', { replace: true });
  };

  const handleRoleSwitch = (e) => {
    const newRole = e.target.value;
    const switchedUser = switchRole(newRole);
    if (switchedUser) {
      showToast(`Đã chuyển sang demo vai trò: ${ROLE_LABELS[newRole]}`, 'success');
      const targetRoute = getDefaultRouteForRole(newRole);
      navigate(targetRoute, { replace: true });
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Mở thanh điều hướng"
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Hệ thống Quản lý Vận hành Xe Buýt
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Quick Demo Role Switcher */}
        <div className="role-switcher-container" title="Chuyển đổi vai trò tức thì để kiểm tra phân quyền & menu">
          <Sparkles size={14} color="var(--primary)" />
          <span className="role-switcher-label">Demo Role:</span>
          <select
            className="role-switcher-select"
            value={role || ''}
            onChange={handleRoleSwitch}
          >
            <option value={ROLES.ADMIN}>Admin (Quản trị)</option>
            <option value={ROLES.MANAGER}>Quản lý điều hành</option>
            <option value={ROLES.DRIVER}>Tài xế</option>
            <option value={ROLES.PASSENGER}>Hành khách</option>
          </select>
        </div>

        {/* Current User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              lineHeight: 1.2
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {user?.name || user?.username}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {user?.email || 'user@smartbus.vn'}
            </span>
          </div>

          <RoleBadge role={role} />
        </div>

        {/* Logout Button */}
        <Button
          variant="secondary"
          size="sm"
          icon={LogOut}
          onClick={handleLogout}
          title="Đăng xuất khỏi hệ thống"
        >
          Đăng xuất
        </Button>
      </div>
    </header>
  );
};
