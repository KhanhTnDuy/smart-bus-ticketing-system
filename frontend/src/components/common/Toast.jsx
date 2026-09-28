import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--success)" />;
      case 'danger':
        return <AlertCircle size={18} color="var(--danger)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--warning)" />;
      default:
        return <Info size={18} color="var(--info)" />;
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {getIcon()}
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
          {message}
        </span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          padding: '2px'
        }}
        aria-label="Đóng thông báo"
      >
        <X size={15} />
      </button>
    </div>
  );
};
