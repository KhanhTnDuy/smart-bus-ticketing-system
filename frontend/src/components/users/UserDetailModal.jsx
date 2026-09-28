import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { RoleBadge, StatusBadge } from '../common/Badge';
import { ROLE_PERMISSIONS_MATRIX } from '../../api/mockData';
import { User, Mail, Phone, Calendar, Shield, FileText, CheckCircle2 } from 'lucide-react';

export const UserDetailModal = ({ isOpen, onClose, user, onEdit }) => {
  if (!user) return null;

  // Lọc các quyền hạn mà vai trò này sở hữu
  const userPermissions = ROLE_PERMISSIONS_MATRIX.map(module => ({
    module: module.module,
    permissions: module.permissions.filter(p => p.roles.includes(user.role))
  })).filter(m => m.permissions.length > 0);

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleString('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Không xác định';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết Hồ sơ Người dùng"
      maxWidth="580px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onEdit(user);
            }}
          >
            Chỉnh sửa tài khoản
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header Profile Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--primary-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.4rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            {(user.name || user.username || 'U').charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tên tài khoản: @{user.username}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ color: 'var(--text-muted)' }}><Mail size={16} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {user.email || 'Chưa cung cấp'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ color: 'var(--text-muted)' }}><Phone size={16} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Số điện thoại</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {user.phone || 'Chưa cung cấp'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ color: 'var(--text-muted)' }}><Calendar size={16} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ngày tạo tài khoản</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {formattedDate}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ color: 'var(--text-muted)' }}><FileText size={16} /></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ghi chú</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                {user.notes || 'Không có ghi chú'}
              </div>
            </div>
          </div>
        </div>

        {/* Role Privileges Summary */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Shield size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Quyền hạn khả dụng của vai trò ({user.role})
            </span>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            {userPermissions.map((group, gIdx) => (
              <div key={gIdx}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                  {group.module}:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {group.permissions.map((p, pIdx) => (
                    <span
                      key={pIdx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.775rem',
                        backgroundColor: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <CheckCircle2 size={12} color="var(--success)" />
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
