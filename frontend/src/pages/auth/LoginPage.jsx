import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../api/authService';
import { getDefaultRouteForRole, ROLE_LABELS } from '../../routes/roleNavigation';
import { BusFront, User, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const demoAccounts = authService.getDemoAccounts();

  const validate = () => {
    const errs = {};
    if (!identifier.trim()) {
      errs.identifier = 'Vui lòng nhập tên tài khoản hoặc địa chỉ email.';
    }
    if (!password) {
      errs.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 3) {
      errs.password = 'Mật khẩu phải có ít nhất 3 ký tự.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (idToUse = identifier, passToUse = password) => {
    setApiError('');
    setIsSubmitting(true);
    try {
      const loggedUser = await login(idToUse, passToUse);
      showToast(`Đăng nhập thành công! Chào mừng ${loggedUser.name}`, 'success');

      // Chuyển hướng về trang trước đó nếu có, hoặc trang mặc định của role
      const from = location.state?.from?.pathname;
      const redirectPath = from && from !== '/login' ? from : getDefaultRouteForRole(loggedUser.role);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    handleLogin();
  };

  const handleDemoLogin = (account) => {
    setIdentifier(account.username);
    setPassword(account.password);
    setErrors({});
    handleLogin(account.username, account.password);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '460px',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden'
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)',
          padding: '2.25rem 2rem',
          textAlign: 'center',
          color: 'white',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'var(--primary-gradient)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.35)'
          }}
        >
          <BusFront size={28} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          SmartBus Portal
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
          Hệ thống Quản lý Vận hành & Phân quyền Xe Buýt
        </p>
      </div>

      {/* Form Content */}
      <div style={{ padding: '2rem' }}>
        {apiError && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--danger-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1.25rem',
              color: 'var(--danger-text)',
              fontSize: '0.85rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label="Tên đăng nhập hoặc Email"
            name="identifier"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (errors.identifier) setErrors(prev => ({ ...prev, identifier: null }));
            }}
            placeholder="vd: admin hoặc admin@smartbus.vn"
            icon={User}
            error={errors.identifier}
            disabled={isSubmitting}
            required
          />

          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors(prev => ({ ...prev, password: null }));
            }}
            placeholder="Nhập mật khẩu của bạn..."
            icon={Lock}
            error={errors.password}
            disabled={isSubmitting}
            required
          />

          <div style={{ marginTop: '1.5rem' }}>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              icon={ArrowRight}
              iconPosition="right"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              Đăng nhập hệ thống
            </Button>
          </div>
        </form>

        {/* Quick Demo Login Buttons */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.75rem',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <Sparkles size={14} color="var(--primary)" />
            <span>ĐĂNG NHẬP NHANH (MÔ PHỎNG 4 VAI TRÒ)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleDemoLogin(acc)}
                disabled={isSubmitting}
                style={{
                  padding: '0.55rem 0.65rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#eef2ff';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }}
              >
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {acc.roleName}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {acc.username}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
