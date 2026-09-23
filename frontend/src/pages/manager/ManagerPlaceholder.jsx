import React from 'react';
import { Compass, MapPin, CreditCard, ShieldCheck } from 'lucide-react';

export const ManagerPlaceholder = ({ title = 'Quản lý Tuyến xe & Điều hành' }) => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{title}</h1>
          <p>Phân hệ điều hành xe buýt & biểu phí dành riêng cho vai trò Quản lý (Manager)</p>
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
            backgroundColor: 'var(--role-manager-bg)',
            color: 'var(--role-manager-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Compass size={30} />
        </div>

        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
          Khu vực phân hệ Quản lý Vận hành
        </h3>

        <p style={{ maxWidth: '520px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Bạn đã đăng nhập thành công với vai trò <strong>Quản lý (MANAGER)</strong>. 
          Route Guard đã xác thực quyền truy cập hợp lệ vào khu vực này.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <Compass size={22} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>18 Tuyến xe</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đang hoạt động</div>
          </div>

          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <MapPin size={22} color="var(--info)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>142 Trạm dừng</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toàn thành phố</div>
          </div>

          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <CreditCard size={22} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Chính sách Vé</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>7.000đ - 10.000đ</div>
          </div>
        </div>
      </div>
    </div>
  );
};
