import React, { useState, useMemo } from 'react';
import { Send, AlertCircle, Sparkles, Bus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { StarRatingInput } from './StarRating';
import { SUB_RATING_CONFIG, RATING_TAGS } from './ratingConstants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { feedbackService } from '../../api/feedbackService';

/**
 * RatingForm - Biểu mẫu đánh giá chuyến đi (F15).
 * Cho phép chọn chuyến đi, chấm điểm tổng quan + 4 tiêu chí con,
 * gắn nhãn nhanh, nhận xét và gửi đánh giá ẩn danh nếu muốn.
 */
export const RatingForm = ({ isOpen, onClose, initialTrip = null, pendingTrips = [], onSubmitted }) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const defaultTrip = initialTrip || pendingTrips[0] || null;

  const [formData, setFormData] = useState(() => ({
    tripId: defaultTrip?.tripId || '',
    rating: 0,
    subRatings: { driver: 0, punctuality: 0, cleanliness: 0, amenities: 0 },
    tags: [],
    content: '',
    isAnonymous: false
  }));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chuyến đi đang được chọn để đánh giá (dùng để lấy routeName, tài xế, biển số...)
  const selectedTrip = useMemo(
    () => pendingTrips.find((t) => t.tripId === formData.tripId) || defaultTrip,
    [pendingTrips, formData.tripId, defaultTrip]
  );

  // Khi người dùng chọn số sao tổng quan, mặc định áp luôn cho các tiêu chí con nếu chưa chấm
  const handleSetRating = (value) => {
    setErrors((prev) => ({ ...prev, rating: null }));
    setFormData((prev) => {
      const allSubEmpty = Object.values(prev.subRatings).every((v) => !v);
      return {
        ...prev,
        rating: value,
        subRatings: allSubEmpty
          ? { driver: value, punctuality: value, cleanliness: value, amenities: value }
          : prev.subRatings
      };
    });
  };

  const handleSetSub = (key, value) =>
    setFormData((prev) => ({ ...prev, subRatings: { ...prev.subRatings, [key]: value } }));

  // Áp điểm tổng quan cho toàn bộ tiêu chí con
  const handleApplyAll = () => {
    if (!formData.rating) {
      showToast('Vui lòng chọn số sao tổng quan trước.', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      subRatings: { driver: prev.rating, punctuality: prev.rating, cleanliness: prev.rating, amenities: prev.rating }
    }));
  };

  const handleToggleTag = (tag) =>
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag]
    }));

  const validate = () => {
    const errs = {};
    if (!formData.tripId) errs.tripId = 'Vui lòng chọn chuyến đi bạn muốn đánh giá.';
    if (!formData.rating) errs.rating = 'Vui lòng chấm số sao tổng quan (1 - 5 sao).';
    if (!formData.content?.trim()) errs.content = 'Vui lòng chia sẻ đôi lời nhận xét về chuyến đi.';
    else if (formData.content.trim().length < 5) errs.content = 'Nhận xét tối thiểu 5 ký tự.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Vui lòng kiểm tra lại thông tin đánh giá.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await feedbackService.createTripRating({
        tripId: selectedTrip?.tripId,
        ticketCode: selectedTrip?.ticketCode,
        routeId: selectedTrip?.routeId,
        routeName: selectedTrip?.routeName,
        driverName: selectedTrip?.driverName,
        busPlate: selectedTrip?.busPlate,
        passengerId: currentUser?.id || 4,
        passengerName: currentUser?.name || 'Hành khách SmartBus',
        isAnonymous: formData.isAnonymous,
        rating: formData.rating,
        subRatings: formData.subRatings,
        tags: formData.tags,
        content: formData.content
      });
      showToast('Cảm ơn bạn đã đánh giá! Ý kiến giúp SmartBus phục vụ tốt hơn.', 'success');
      onSubmitted?.(created, selectedTrip?.tripId);
      onClose?.();
    } catch (err) {
      showToast(err.message || 'Gửi đánh giá thất bại, vui lòng thử lại.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đánh giá Chuyến đi"
      maxWidth="640px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy bỏ</Button>
          <Button type="submit" variant="primary" icon={Send} isLoading={isSubmitting} onClick={handleSubmit}>
            Gửi đánh giá
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* 1. Chọn chuyến đi */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Chuyến đi bạn muốn đánh giá <span className="required">*</span></label>
          <select
            className={`form-select ${errors.tripId ? 'has-error' : ''}`}
            value={formData.tripId}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, tripId: e.target.value }));
              setErrors((prev) => ({ ...prev, tripId: null }));
            }}
          >
            <option value="">-- Chọn chuyến đi --</option>
            {pendingTrips.map((trip) => (
              <option key={trip.tripId} value={trip.tripId}>
                {trip.ticketCode} · {trip.routeName}
              </option>
            ))}
          </select>
          {errors.tripId && <span className="form-error"><AlertCircle size={13} /> {errors.tripId}</span>}
        </div>

        {/* 2. Thông tin chuyến đi đã chọn */}
        {selectedTrip && (
          <div
            style={{
              backgroundColor: '#f8fafc', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem',
              display: 'flex', flexDirection: 'column', gap: '0.35rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              <Bus size={15} color="var(--primary)" /> {selectedTrip.routeName}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Mã vé <strong style={{ fontFamily: 'monospace' }}>{selectedTrip.ticketCode}</strong>
              {' · '}Tài xế {selectedTrip.driverName}
              {' · '}Xe {selectedTrip.busPlate}
              {' · '}Ghế {selectedTrip.seatNumber}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {selectedTrip.departureTime} → {selectedTrip.arrivalTime}
            </div>
          </div>
        )}

        {/* 3. Điểm tổng quan */}
        <div
          style={{
            border: errors.rating ? '1px solid var(--danger)' : '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
            Bạn đánh giá chuyến đi này bao nhiêu sao? <span className="required">*</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <StarRatingInput value={formData.rating} onChange={handleSetRating} size="xl" />
          </div>
          {errors.rating && <span className="form-error" style={{ justifyContent: 'center', marginTop: '0.4rem' }}><AlertCircle size={13} /> {errors.rating}</span>}
        </div>

        {/* 4. Chấm điểm chi tiết */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Chấm điểm chi tiết từng tiêu chí</label>
            <button
              type="button"
              onClick={handleApplyAll}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--primary)' }}
            >
              <Sparkles size={14} /> Áp dụng điểm tổng quan
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.75rem' }}>
            {SUB_RATING_CONFIG.map((criteria) => (
              <div
                key={criteria.key}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{criteria.label}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{criteria.hint}</div>
                </div>
                <StarRatingInput
                  value={formData.subRatings[criteria.key]}
                  onChange={(v) => handleSetSub(criteria.key, v)}
                  size="md"
                />
              </div>
            ))}
          </div>
        </div>


        {/* 5. Nhãn nhanh */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Điều bạn hài lòng nhất (chọn nhanh)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.4rem' }}>
            {RATING_TAGS.map((tag) => {
              const active = formData.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  style={{
                    fontSize: '0.78rem', fontWeight: 600, padding: '5px 11px',
                    borderRadius: 'var(--radius-full)', cursor: 'pointer', transition: 'var(--transition)',
                    color: active ? 'white' : 'var(--text-secondary)',
                    background: active ? 'var(--primary-gradient)' : '#f8fafc',
                    border: active ? '1px solid var(--primary)' : '1px solid var(--border-light)'
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Nhận xét */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Nhận xét chi tiết <span className="required">*</span></label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formData.content.length} / 600 ký tự</span>
          </div>
          <textarea
            rows={4}
            maxLength={600}
            className={`form-input ${errors.content ? 'has-error' : ''}`}
            style={{ resize: 'vertical' }}
            placeholder="Chia sẻ trải nghiệm của bạn về chuyến xe để SmartBus phục vụ tốt hơn..."
            value={formData.content}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, content: e.target.value }));
              setErrors((prev) => ({ ...prev, content: null }));
            }}
          />
          {errors.content
            ? <span className="form-error"><AlertCircle size={13} /> {errors.content}</span>
            : <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Đánh giá của bạn sẽ hiển thị công khai trong Bảng tin đánh giá.
              </span>
          }
        </div>

        {/* 7. Ẩn danh */}
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer',
            padding: '0.7rem 0.9rem', backgroundColor: 'var(--primary-light)',
            borderRadius: 'var(--radius-md)', border: '1px solid #e0e7ff'
          }}
        >
          <input
            type="checkbox"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData((prev) => ({ ...prev, isAnonymous: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
            Gửi đánh giá ẩn danh (SmartBus sẽ không hiển thị tên của bạn)
          </span>
        </label>
      </form>
    </Modal>
  );
};

