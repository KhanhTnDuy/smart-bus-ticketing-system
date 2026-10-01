import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { getRatingLevel } from './ratingConstants';

// Kích thước hiển thị của ngôi sao (px)
const SIZE_MAP = { sm: 15, md: 20, lg: 28, xl: 34 };

/**
 * StarRatingInput - Widget sao tương tác dùng để chọn điểm (1..5 sao)
 */
export const StarRatingInput = ({ value = 0, onChange, size = 'lg', disabled = false }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const px = SIZE_MAP[size] || SIZE_MAP.lg;
  const activeValue = hoverValue || value;
  const level = getRatingLevel(activeValue);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <div
        style={{ display: 'inline-flex', gap: '0.25rem' }}
        onMouseLeave={() => !disabled && setHoverValue(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= activeValue;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHoverValue(star)}
              onClick={() => !disabled && onChange?.(star)}
              aria-label={`Chọn ${star} sao`}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                lineHeight: 0,
                cursor: disabled ? 'default' : 'pointer',
                transform: filled ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform 0.15s ease'
              }}
            >
              <Star
                size={px}
                fill={filled ? '#f59e0b' : 'none'}
                color={filled ? '#f59e0b' : '#cbd5e1'}
              />
            </button>
          );
        })}
      </div>
      {activeValue > 0 && (
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: level.color }}>
          {activeValue}/5 · {level.label} {level.emoji}
        </span>
      )}
    </div>
  );
};

/**
 * StarRatingDisplay - Hiển thị số sao chỉ đọc (không tương tác)
 */
export const StarRatingDisplay = ({ value = 0, size = 'sm', showValue = false }) => {
  const px = SIZE_MAP[size] || SIZE_MAP.sm;
  const rounded = Math.round(Number(value) || 0);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.12rem' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={px}
          fill={star <= rounded ? '#f59e0b' : 'none'}
          color={star <= rounded ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
      {showValue && (
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginLeft: '0.3rem' }}>
          {(Number(value) || 0).toFixed(1)}
        </span>
      )}
    </span>
  );
};
