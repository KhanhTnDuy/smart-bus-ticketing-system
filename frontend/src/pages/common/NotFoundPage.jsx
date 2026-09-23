import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForRole } from '../../routes/roleNavigation';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const homePath = isAuthenticated ? getDefaultRouteForRole(role) : '/login';

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
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem'
        }}
      >
        <Compass size={38} />
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        404 - Không tìm thấy trang
      </h1>

      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '1.5rem' }}>
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển trong hệ thống SmartBus.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate(-1)}
        >
          Quay lại
        </Button>

        <Button
          variant="primary"
          icon={Home}
          onClick={() => navigate(homePath, { replace: true })}
        >
          {isAuthenticated ? 'Về trang làm việc' : 'Đến trang đăng nhập'}
        </Button>
      </div>
    </div>
  );
};
