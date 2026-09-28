import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { RoleBadge } from '../../components/common/Badge';
import { getDefaultRouteForRole, ROLE_LABELS } from '../../routes/roleNavigation';
import { useAuth } from '../../context/AuthContext';

export const UnauthorizedPage = ({ requiredRoles = [], currentRole }) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const userRole = currentRole || role;
  const homePath = getDefaultRouteForRole(userRole);

  return (
    <div
      style={{
        minHeight: '65vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          boxShadow: '0 8px 16px rgba(239, 68, 68, 0.15)'
        }}
      >
        <ShieldX size={38} />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        403 - Quyền truy cập bị từ chối
      </h1>

      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '480px', marginBottom: '1.25rem' }}>
        Tài khoản của bạn hiện đang có vai trò{' '}
        <strong style={{ color: 'var(--text-main)' }}>
          {ROLE_LABELS[userRole] || userRole}
        </strong>
        , không đủ thẩm quyền để truy cập trang này.
      </p>

      {requiredRoles.length > 0 && (
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-light)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Trang này chỉ dành cho vai trò:
          </span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {requiredRoles.map(r => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate(-1)}
        >
          Quay lại trang trước
        </Button>

        <Button
          variant="primary"
          icon={Home}
          onClick={() => navigate(homePath, { replace: true })}
        >
          Về trang chính của bạn
        </Button>
      </div>
    </div>
  );
};
