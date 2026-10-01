import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { getRatingLevel } from './ratingConstants';

type StarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<StarSize, number> = { sm: 15, md: 20, lg: 28, xl: 34 };

interface StarRatingInputProps {
  value?: number;
  onChange?: (value: number) => void;
  size?: StarSize;
  disabled?: boolean;
}

/** Widget sao tương tác để chọn điểm (1..5). */
export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value = 0,
  onChange,
  size = 'lg',
  disabled = false,
}) => {
  const [hoverValue, setHoverValue] = useState(0);
  const px = SIZE_MAP[size];
  const activeValue = hoverValue || value;
  const level = getRatingLevel(activeValue);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex gap-1" onMouseLeave={() => !disabled && setHoverValue(0)}>
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
              className="p-0 border-0 bg-transparent leading-none transition-transform"
              style={{ cursor: disabled ? 'default' : 'pointer', transform: filled ? 'scale(1.06)' : 'scale(1)' }}
            >
              <Star
                size={px}
                fill={filled ? '#f59e0b' : 'none'}
                stroke={filled ? '#f59e0b' : '#cbd5e1'}
              />
            </button>
          );
        })}
      </div>
      {activeValue > 0 && (
        <span className="text-xs font-bold" style={{ color: level.color }}>
          {activeValue}/5 · {level.label} {level.emoji}
        </span>
      )}
    </div>
  );
};

interface StarRatingDisplayProps {
  value?: number;
  size?: StarSize;
  showValue?: boolean;
}

/** Hiển thị số sao chỉ đọc. */
export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  value = 0,
  size = 'sm',
  showValue = false,
}) => {
  const px = SIZE_MAP[size];
  const rounded = Math.round(Number(value) || 0);

  return (
    <span className="inline-flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={px}
          fill={star <= rounded ? '#f59e0b' : 'none'}
          stroke={star <= rounded ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
      {showValue && (
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">
          {(Number(value) || 0).toFixed(1)}
        </span>
      )}
    </span>
  );
};
