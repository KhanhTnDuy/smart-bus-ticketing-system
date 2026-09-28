import React from 'react';
import { MessageSquare, Star, HeartHandshake, ShieldCheck } from 'lucide-react';

export const PassengerPlaceholder = ({ title = 'Phản hồi & Đánh giá Dịch vụ' }) => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{title}</h1>
          <p>Phân hệ dành riêng cho vai trò Hành khách (Passenger) tra cứu & gửi ý kiến đóng góp</p>
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
            backgroundColor: 'var(--role-passenger-bg)',
            color: 'var(--role-passenger-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MessageSquare size={30} />
        </div>

        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
          Khu vực phân hệ Hành khách
        </h3>

        <p style={{ maxWidth: '520px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Bạn đang sử dụng hệ thống với vai trò <strong>Hành khách (PASSENGER)</strong>. 
          Các phân hệ quản trị nhạy cảm đã được bảo vệ chặt chẽ bởi Role Guard.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <MessageSquare size={22} color="var(--info)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gửi phản ánh</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hỗ trợ 24/7</div>
          </div>

          <div className="card" style={{ padding: '1rem', width: '160px', textAlign: 'center' }}>
            <Star size={22} color="var(--warning)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Đánh giá sao</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chất lượng chuyến</div>
          </div>
        </div>
      </div>
    </div>
  );
};
