import React from 'react';
import { Calendar, Bus, Clock, ShieldCheck } from 'lucide-react';

export const DriverPlaceholder = ({ title = 'Lịch trình Ca chạy của Tài xế' }) => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{title}</h1>
          <p>Phân hệ theo dõi lịch trình lái xe & báo cáo ca chạy dành riêng cho vai trò Tài xế (Driver)</p>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '2.5rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--role-driver-bg)',
            color: 'var(--role-driver-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Bus size={30} />
        </div>

        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
          Khu vực phân hệ Tài xế
        </h3>

        <p style={{ maxWidth: '520px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Bạn đã đăng nhập với vai trò <strong>Tài xế (DRIVER)</strong>. 
          Menu bên trái đã tự động cập nhật để chỉ hiển thị các tính năng được phép cho tài xế.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <Calendar size={22} color="var(--warning)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tuyến 08</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bến Thành - Chợ Lớn</div>
          </div>

          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <Clock size={22} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ca Sáng</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>05:30 - 13:30</div>
          </div>
        </div>
      </div>
    </div>
  );
};
