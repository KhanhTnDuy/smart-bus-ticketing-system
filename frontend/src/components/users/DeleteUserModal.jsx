import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AlertTriangle } from 'lucide-react';

export const DeleteUserModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  isDeleting = false,
  isCurrentUser = false
}) => {
  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận xóa tài khoản"
      maxWidth="460px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Hủy bỏ
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={isCurrentUser}
          >
            Đồng ý xóa
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <AlertTriangle size={22} />
        </div>

        <div style={{ flex: 1 }}>
          {isCurrentUser ? (
            <div
              style={{
                backgroundColor: 'var(--warning-light)',
                border: '1px solid #fde68a',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--warning-text)',
                fontSize: '0.875rem'
              }}
            >
              <strong>Cảnh báo:</strong> Bạn không thể xóa tài khoản của chính mình trong khi đang đăng nhập hệ thống!
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Bạn có chắc chắn muốn xóa tài khoản <strong>{user.name}</strong> (@{user.username})?
              </p>
              <p style={{ fontSize: '0.825rem', color: 'var(--danger)', lineHeight: 1.4 }}>
                Hành động này sẽ loại bỏ vĩnh viễn quyền truy cập của người dùng này khỏi hệ thống SmartBus.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
