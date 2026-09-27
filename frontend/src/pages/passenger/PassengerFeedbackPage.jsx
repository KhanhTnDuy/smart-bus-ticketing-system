import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { feedbackService } from '../../api/feedbackService';
import { useToast } from '../../context/ToastContext';
import { INITIAL_ROUTES } from '../../data/mockRoutes';

// SCRUM-21: Gửi phản ánh (mode="feedback", không bắt buộc chấm sao)
// SCRUM-22: Đánh giá chuyến đi (mode="rating", bắt buộc chấm sao)
// Thay cho PassengerPlaceholder ở /passenger/feedback và /passenger/rating.
export const PassengerFeedbackPage = ({ mode = 'feedback' }) => {
  const { showToast } = useToast();
  const isRating = mode === 'rating';

  const [routeId, setRouteId] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setRouteId('');
    setRating(0);
    setContent('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await feedbackService.submit({
        routeId,
        // SCRUM-21: chỉ gửi khiếu nại thì không kèm rating
        rating: isRating ? rating : null,
        content,
      });
      showToast(
        isRating ? 'Cảm ơn bạn đã đánh giá chuyến đi!' : 'Đã gửi phản ánh của bạn thành công!',
        'success'
      );
      resetForm();
    } catch (err) {
      showToast(err.message || 'Không thể gửi, vui lòng thử lại.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = routeId && content.trim() && (!isRating || rating > 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>{isRating ? 'Đánh giá Chuyến xe' : 'Gửi Phản ánh & Góp ý'}</h1>
          <p>
            {isRating
              ? 'Chấm sao và nhận xét về chất lượng chuyến đi bạn vừa trải nghiệm.'
              : 'Gửi khiếu nại hoặc góp ý về chuyến đi để nhà xe cải thiện dịch vụ.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', maxWidth: 560 }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
            Tuyến xe <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.9rem',
            }}
          >
            <option value="" disabled>
              -- Chọn tuyến xe bạn đã đi --
            </option>
            {INITIAL_ROUTES.map((route) => (
              <option key={route.id} value={route.id}>
                {route.code} — {route.name}
              </option>
            ))}
          </select>
        </div>

        {isRating && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
              Số sao <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} sao`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <Star
                    size={28}
                    color={star <= rating ? 'var(--warning)' : 'var(--text-muted)'}
                    fill={star <= rating ? 'var(--warning)' : 'none'}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
            {isRating ? 'Nhận xét' : 'Nội dung phản ánh'} <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={5}
            placeholder={
              isRating
                ? 'Chuyến đi của bạn thế nào?'
                : 'Mô tả chi tiết sự cố hoặc góp ý của bạn...'
            }
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color, #e2e8f0)',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: canSubmit && !isSubmitting ? 'var(--primary)' : 'var(--bg-muted, #cbd5e1)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: canSubmit && !isSubmitting ? 'pointer' : 'not-allowed',
          }}
        >
          <Send size={16} />
          {isSubmitting ? 'Đang gửi...' : isRating ? 'Gửi đánh giá' : 'Gửi phản ánh'}
        </button>
      </form>
    </div>
  );
};
