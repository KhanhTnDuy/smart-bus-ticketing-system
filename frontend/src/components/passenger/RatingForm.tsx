import React, { useMemo, useState } from 'react';
import { Send, AlertCircle, Sparkles, Bus, Star } from 'lucide-react';
import { Modal } from '../common/Modal';
import { StarRatingInput } from './StarRating';
import { SUB_RATING_CONFIG, RATING_TAGS } from './ratingConstants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  tripRatingService,
  type PendingTrip,
  type TripRatingItem,
  type SubRatingKey,
} from '../../api/tripRatingService';

interface RatingFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrip?: PendingTrip | null;
  pendingTrips: PendingTrip[];
  onSubmitted: (created: TripRatingItem, tripId?: string) => void;
}

/** Biểu mẫu đánh giá chuyến đi (F15). */
export const RatingForm: React.FC<RatingFormProps> = ({
  isOpen,
  onClose,
  initialTrip = null,
  pendingTrips,
  onSubmitted,
}) => {
  const { currentUser } = useAuth();
  const { success, error, warning } = useToast();

  const defaultTrip = initialTrip || pendingTrips[0] || null;

  const [tripId, setTripId] = useState<string>(defaultTrip?.tripId || '');
  const [rating, setRating] = useState<number>(0);
  const [subRatings, setSubRatings] = useState<Record<SubRatingKey, number>>({
    driver: 0,
    punctuality: 0,
    cleanliness: 0,
    amenities: 0,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errors, setErrors] = useState<{ tripId?: string; rating?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTrip = useMemo(
    () => pendingTrips.find((t) => t.tripId === tripId) || defaultTrip,
    [pendingTrips, tripId, defaultTrip],
  );

  // Khi chọn số sao tổng quan, mặc định áp luôn cho các tiêu chí con nếu chưa chấm
  const handleSetRating = (value: number) => {
    setErrors((prev) => ({ ...prev, rating: undefined }));
    setRating(value);
    const allEmpty = Object.values(subRatings).every((v) => !v);
    if (allEmpty) {
      setSubRatings({ driver: value, punctuality: value, cleanliness: value, amenities: value });
    }
  };

  const handleSetSub = (key: SubRatingKey, value: number) =>
    setSubRatings((prev) => ({ ...prev, [key]: value }));

  const handleApplyAll = () => {
    if (!rating) {
      warning('Vui lòng chọn số sao tổng quan trước.');
      return;
    }
    setSubRatings({ driver: rating, punctuality: rating, cleanliness: rating, amenities: rating });
  };

  const handleToggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const validate = () => {
    const errs: typeof errors = {};
    if (!tripId) errs.tripId = 'Vui lòng chọn chuyến đi bạn muốn đánh giá.';
    if (!rating) errs.rating = 'Vui lòng chấm số sao tổng quan (1 - 5 sao).';
    if (!content.trim()) errs.content = 'Vui lòng chia sẻ đôi lời nhận xét về chuyến đi.';
    else if (content.trim().length < 5) errs.content = 'Nhận xét tối thiểu 5 ký tự.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      warning('Vui lòng kiểm tra lại thông tin đánh giá.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await tripRatingService.createTripRating({
        tripId: selectedTrip?.tripId,
        ticketCode: selectedTrip?.ticketCode,
        routeId: selectedTrip?.routeId || '',
        routeName: selectedTrip?.routeName,
        driverName: selectedTrip?.driverName,
        busPlate: selectedTrip?.busPlate,
        passengerId: Number(currentUser?.id) || 0,
        passengerName: currentUser?.fullName || 'Hành khách SmartBus',
        isAnonymous,
        rating,
        subRatings,
        tags,
        content,
      });
      success('Cảm ơn bạn đã đánh giá! Ý kiến giúp SmartBus phục vụ tốt hơn.');
      onSubmitted(created, selectedTrip?.tripId);
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Gửi đánh giá thất bại, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đánh giá Chuyến đi" maxWidth="2xl" icon={<Star className="w-5 h-5" />}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 1. Chọn chuyến đi */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5">
            Chuyến đi bạn muốn đánh giá <span className="text-rose-500">*</span>
          </label>
          <select
            value={tripId}
            onChange={(e) => {
              setTripId(e.target.value);
              setErrors((prev) => ({ ...prev, tripId: undefined }));
            }}
            className={`w-full rounded-lg border bg-white dark:bg-[#0c162d] text-sm text-slate-800 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-institutional-500 ${
              errors.tripId ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <option value="">-- Chọn chuyến đi --</option>
            {pendingTrips.map((trip) => (
              <option key={trip.tripId} value={trip.tripId}>
                {trip.ticketCode} · {trip.routeName}
              </option>
            ))}
          </select>
          {errors.tripId && (
            <span className="flex items-center gap-1 text-[11px] text-rose-500 mt-1">
              <AlertCircle size={12} /> {errors.tripId}
            </span>
          )}
        </div>

        {/* 2. Thông tin chuyến đi đã chọn */}
        {selectedTrip && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
              <Bus size={15} className="text-institutional-600 dark:text-sky-400" /> {selectedTrip.routeName}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Mã vé <strong className="font-mono">{selectedTrip.ticketCode}</strong> · Tài xế {selectedTrip.driverName} · Xe{' '}
              {selectedTrip.busPlate} · Ghế {selectedTrip.seatNumber}
            </div>
            <div className="text-xs text-slate-400">
              {selectedTrip.departureTime} → {selectedTrip.arrivalTime}
            </div>
          </div>
        )}

        {/* 3. Điểm tổng quan */}
        <div
          className={`rounded-lg border px-4 py-4 text-center ${
            errors.rating ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="text-sm font-bold text-slate-800 dark:text-white mb-2.5">
            Bạn đánh giá chuyến đi này bao nhiêu sao? <span className="text-rose-500">*</span>
          </div>
          <div className="flex justify-center">
            <StarRatingInput value={rating} onChange={handleSetRating} size="xl" />
          </div>
          {errors.rating && (
            <div className="flex items-center justify-center gap-1 text-[11px] text-rose-500 mt-2">
              <AlertCircle size={12} /> {errors.rating}
            </div>
          )}
        </div>

        {/* 4. Chấm điểm chi tiết */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Chấm điểm chi tiết từng tiêu chí
            </span>
            <button
              type="button"
              onClick={handleApplyAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-institutional-700 dark:text-sky-400 hover:underline"
            >
              <Sparkles size={13} /> Áp dụng điểm tổng quan
            </button>
          </div>
          <div className="flex flex-col gap-3 mt-3">
            {SUB_RATING_CONFIG.map((criteria) => (
              <div key={criteria.key} className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{criteria.label}</div>
                  <div className="text-[11px] text-slate-400">{criteria.hint}</div>
                </div>
                <StarRatingInput
                  value={subRatings[criteria.key]}
                  onChange={(v) => handleSetSub(criteria.key, v)}
                  size="md"
                />
              </div>
            ))}
          </div>
        </div>


        {/* 5. Nhãn nhanh */}
        <div>
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-1.5">
            Điều bạn hài lòng nhất (chọn nhanh)
          </span>
          <div className="flex flex-wrap gap-2">
            {RATING_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-institutional-600 text-white border-institutional-600'
                      : 'bg-slate-50 dark:bg-[#0c162d] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-institutional-400'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Nhận xét */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Nhận xét chi tiết <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">{content.length} / 600 ký tự</span>
          </div>
          <textarea
            rows={4}
            maxLength={600}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setErrors((prev) => ({ ...prev, content: undefined }));
            }}
            placeholder="Chia sẻ trải nghiệm của bạn về chuyến xe để SmartBus phục vụ tốt hơn..."
            className={`w-full resize-y rounded-lg border bg-white dark:bg-[#0c162d] text-sm text-slate-800 dark:text-slate-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-institutional-500 ${
              errors.content ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'
            }`}
          />
          {errors.content ? (
            <span className="flex items-center gap-1 text-[11px] text-rose-500 mt-1">
              <AlertCircle size={12} /> {errors.content}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 mt-1 block">
              Đánh giá của bạn sẽ hiển thị công khai trong Bảng tin đánh giá.
            </span>
          )}
        </div>

        {/* 7. Ẩn danh */}
        <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-institutional-200 dark:border-institutional-800 bg-institutional-50 dark:bg-[#1a2b53] px-3.5 py-3">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 accent-institutional-600"
          />
          <span className="text-xs font-semibold text-institutional-800 dark:text-sky-300">
            Gửi đánh giá ẩn danh (SmartBus sẽ không hiển thị tên của bạn)
          </span>
        </label>

        {/* 8. Hành động */}
        <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide text-white bg-institutional-600 hover:bg-institutional-700 shadow-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={15} /> Gửi đánh giá
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

