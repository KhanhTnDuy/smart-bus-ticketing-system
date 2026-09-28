import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loading = ({ text = 'Đang tải dữ liệu...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        gap: '0.75rem'
      }}
    >
      <Loader2 size={32} className="spinner" color="var(--primary)" />
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {text}
      </span>
    </div>
  );
};
