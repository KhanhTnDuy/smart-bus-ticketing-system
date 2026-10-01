import React from 'react';
import { ThumbsUp, Trash2, ShieldCheck, User, Bus, Clock } from 'lucide-react';
import { StarRatingDisplay } from './StarRating';
import { SUB_RATING_CONFIG } from './ratingConstants';

// Nhãn viết tắt cho từng tiêu chí con khi hiển thị thanh điểm
const SUB_LABELS = {
  driver: 'Tài xế',
  punctuality: 'Đúng giờ',
  cleanliness: 'Vệ sinh',
  amenities: 'Tiện ích'
};

// Thanh điểm nhỏ cho từng tiêu chí con
const SubRatingBar = ({ label, value }) => {
  const pct = (Math.max(0, Math.min(5, Number(value) || 0)) / 5) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 62, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 'var(--radius-full)', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 'var(--radius-full)', background: 'var(--primary-gradient)' }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', width: 22, textAlign: 'right' }}>
        {Number(value) || 0}
      </span>
    </div>
  );
};

/**
 * RatingCard - Thẻ hiển thị một đánh giá trong bảng tin cộng đồng.
 * Hỗ trợ: xem điểm chi tiết, thả tim, xóa (nếu là đánh giá của chính mình).
 */
export const RatingCard = ({ rating, currentUserId, isLiked, onLike, onDelete }) => {
  const isOwner = currentUserId && rating.passengerId === currentUserId;

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Header: người đánh giá + chuyến xe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: rating.isAnonymous ? '#e2e8f0' : 'var(--primary-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800
            }}
          >
            {rating.isAnonymous ? '?' : (rating.passengerName || 'K').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {rating.passengerName || 'Hành khách SmartBus'}
              {isOwner && (
                <span
                  style={{
                    marginLeft: '0.4rem', fontSize: '0.66rem', fontWeight: 700, color: 'var(--primary)',
                    backgroundColor: 'var(--primary-light)', padding: '1px 6px', borderRadius: 'var(--radius-full)'
                  }}
                >
                  Của bạn
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              {rating.routeName}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <StarRatingDisplay value={rating.rating} size="sm" />
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            {rating.ticketCode}
          </div>
        </div>
      </div>

      {/* Driver / plate */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <User size={13} color="var(--text-muted)" /> Tài xế {rating.driverName}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Bus size={13} color="var(--text-muted)" /> {rating.busPlate}
        </span>
      </div>

      {/* Sub-ratings */}
      {rating.subRatings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.5rem 1.25rem' }}>
          {SUB_RATING_CONFIG.map((criteria) => (
            <SubRatingBar key={criteria.key} label={SUB_LABELS[criteria.key]} value={rating.subRatings[criteria.key]} />
          ))}
        </div>
      )}

      {/* Content */}
      <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {rating.content}
      </p>

      {/* Tags */}
      {Array.isArray(rating.tags) && rating.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {rating.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)',
                backgroundColor: '#f8fafc', border: '1px solid var(--border-light)',
                padding: '2px 9px', borderRadius: 'var(--radius-full)'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Admin response */}
      {rating.adminResponse && (
        <div
          style={{
            backgroundColor: 'var(--success-light)', border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)', padding: '0.7rem 0.9rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.78rem' }}>
            <ShieldCheck size={14} /> Phản hồi từ SmartBus
          </div>
          <p style={{ fontSize: '0.82rem', color: '#064e3b', marginTop: '0.25rem', lineHeight: 1.55 }}>{rating.adminResponse}</p>
        </div>
      )}

      {/* Footer: actions + date */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid var(--border-light)', paddingTop: '0.7rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onLike?.(rating)}
            className="btn btn-ghost btn-sm"
            style={{ color: isLiked ? 'var(--primary)' : 'var(--text-secondary)', gap: '0.35rem' }}
          >
            <ThumbsUp size={15} fill={isLiked ? 'var(--primary)' : 'none'} />
            Hữu ích ({rating.likesCount || 0})
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete?.(rating)}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)', gap: '0.35rem' }}
            >
              <Trash2 size={15} /> Xóa
            </button>
          )}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString('vi-VN') : '---'}
        </span>
      </div>
    </div>
  );
};
