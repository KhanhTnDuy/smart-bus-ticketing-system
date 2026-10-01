import React from 'react';
import { ThumbsUp, Trash2, ShieldCheck, User, Bus, Clock } from 'lucide-react';
import type { TripRatingItem, SubRatingKey } from '../../api/tripRatingService';
import { StarRatingDisplay } from './StarRating';
import { SUB_RATING_CONFIG } from './ratingConstants';

const SUB_LABELS: Record<SubRatingKey, string> = {
  driver: 'Tài xế',
  punctuality: 'Đúng giờ',
  cleanliness: 'Vệ sinh',
  amenities: 'Tiện ích',
};

const SubRatingBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const pct = (Math.max(0, Math.min(5, Number(value) || 0)) / 5) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 dark:text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-5 text-right">
        {Number(value) || 0}
      </span>
    </div>
  );
};

interface RatingCardProps {
  rating: TripRatingItem;
  currentUserId?: number;
  isLiked: boolean;
  onLike: (rating: TripRatingItem) => void;
  onDelete: (rating: TripRatingItem) => void;
}

/** Thẻ hiển thị một đánh giá trong bảng tin cộng đồng. */
export const RatingCard: React.FC<RatingCardProps> = ({ rating, currentUserId, isLiked, onLike, onDelete }) => {
  const isOwner = !!currentUserId && rating.passengerId === currentUserId;

  return (
    <div className="flex flex-col gap-3 p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#131e3a] shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white font-extrabold bg-institutional-600 dark:bg-institutional-700">
            {rating.isAnonymous ? '?' : (rating.passengerName || 'K').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {rating.passengerName || 'Hành khách SmartBus'}
              {isOwner && (
                <span className="text-[10px] font-bold text-institutional-700 dark:text-sky-400 bg-institutional-50 dark:bg-[#1a2b53] px-1.5 py-0.5 rounded-full">
                  Của bạn
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{rating.routeName}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <StarRatingDisplay value={rating.rating} size="sm" />
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rating.ticketCode}</div>
        </div>
      </div>

      {/* Driver / plate */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <User size={13} className="text-slate-400" /> Tài xế {rating.driverName}
        </span>
        <span className="inline-flex items-center gap-1">
          <Bus size={13} className="text-slate-400" /> {rating.busPlate}
        </span>
      </div>

      {/* Sub-ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {SUB_RATING_CONFIG.map((c) => (
          <SubRatingBar key={c.key} label={SUB_LABELS[c.key]} value={rating.subRatings[c.key]} />
        ))}
      </div>

      {/* Content */}
      <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
        {rating.content}
      </p>

      {/* Tags */}
      {rating.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rating.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Admin response */}
      {rating.adminResponse && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={14} /> Phản hồi từ SmartBus
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-200 mt-1 leading-relaxed">
            {rating.adminResponse}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLike(rating)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
              isLiked
                ? 'text-institutional-700 dark:text-sky-400 bg-institutional-50 dark:bg-[#1a2b53]'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ThumbsUp size={14} /> Hữu ích ({rating.likesCount || 0})
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete(rating)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <Trash2 size={14} /> Xóa
            </button>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={12} />
          {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString('vi-VN') : '---'}
        </span>
      </div>
    </div>
  );
};

