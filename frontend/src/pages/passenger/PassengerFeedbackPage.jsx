import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { feedbackService } from '../../api/feedbackService';
import { INITIAL_ROUTES } from '../../data/mockRoutes';

import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

import {
  MessageSquare,
  Star,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Send,
  Bus,
  X,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

const CATEGORIES = [
  'Thái độ phục vụ của tài xế & phụ xe',
  'Độ đúng giờ & thời gian đón trả',
  'Chất lượng xe & vệ sinh khoang ngồi',
  'Điều hòa & tiện ích trên xe (Wifi, nước uống)',
  'Quy trình đặt vé & thanh toán',
  'Vấn đề khác'
];

export const PassengerFeedbackPage = ({ mode = 'feedback' }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // Active Tab/Mode derived from route prop ('feedback' | 'rating')
  const activeMode = mode || 'feedback';

  // Feedbacks state
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Routes available for selection
  const [availableRoutes, setAvailableRoutes] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    routeId: '',
    category: CATEGORIES[0],
    rating: mode === 'rating' ? 5 : 0,
    content: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  // Filter & Search State for History
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');

  // Modal States
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load routes from localStorage or mockRoutes
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bus_admin_routes');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableRoutes(parsed);
          if (parsed[0]?.id && !formData.routeId) {
            setFormData(prev => ({ ...prev, routeId: parsed[0].id }));
          }
          return;
        }
      }
    } catch {
      // fallback
    }
    setAvailableRoutes(INITIAL_ROUTES);
    if (INITIAL_ROUTES.length > 0 && !formData.routeId) {
      setFormData(prev => ({ ...prev, routeId: INITIAL_ROUTES[0].id }));
    }
  }, []);

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await feedbackService.getFeedbacks();
      setFeedbacks(data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể tải danh sách phản ánh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Handle Tab Switch
  const handleTabChange = (targetMode) => {
    setActiveMode(targetMode);
    if (targetMode === 'feedback') {
      navigate('/passenger/feedback');
      setFormData(prev => ({ ...prev, rating: 0 }));
      setFormErrors({});
    } else if (targetMode === 'rating') {
      navigate('/passenger/rating');
      setFormData(prev => ({ ...prev, rating: prev.rating || 5 }));
      setFormErrors({});
    }
  };

  // KPI Statistics
  const statistics = useMemo(() => {
    const total = feedbacks.length;
    const feedbacksOnly = feedbacks.filter(f => f.type === 'FEEDBACK');
    const ratingsOnly = feedbacks.filter(f => f.type === 'RATING' || (f.rating && f.rating > 0));

    const totalRatings = ratingsOnly.length;
    const avgScore =
      totalRatings > 0
        ? (ratingsOnly.reduce((sum, item) => sum + (item.rating || 0), 0) / totalRatings).toFixed(1)
        : '5.0';

    const pendingCount = feedbacks.filter(f => f.status === 'PENDING').length;
    const processingCount = feedbacks.filter(f => f.status === 'PROCESSING').length;
    const resolvedCount = feedbacks.filter(f => f.status === 'RESOLVED').length;

    return {
      total,
      feedbacksCount: feedbacksOnly.length,
      ratingsCount: ratingsOnly.length,
      avgScore,
      pendingCount,
      processingCount,
      resolvedCount
    };
  }, [feedbacks]);

  // Form Validation
  const validateForm = () => {
    const errors = {};

    // 1. routeId required
    if (!formData.routeId || !formData.routeId.trim()) {
      errors.routeId = 'Vui lòng chọn tuyến xe bạn đã đi.';
    }

    // 2. content required
    if (!formData.content || !formData.content.trim()) {
      errors.content =
        activeMode === 'rating'
          ? 'Vui lòng nhập nhận xét về trải nghiệm chuyến đi của bạn.'
          : 'Vui lòng mô tả chi tiết nội dung phản ánh / góp ý.';
    } else if (formData.content.trim().length < 10) {
      errors.content = 'Nội dung tối thiểu 10 ký tự để nhà xe có đủ thông tin xử lý.';
    }

    // 3. star rating input: ONLY required in rating mode
    if (activeMode === 'rating') {
      if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
        errors.rating = 'Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Feedback / Rating
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Vui lòng kiểm tra lại các trường thông tin bắt buộc.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedRouteObj = availableRoutes.find(r => r.id === formData.routeId);
      const routeDisplayName = selectedRouteObj
        ? `${selectedRouteObj.code ? selectedRouteObj.code + ': ' : ''}${selectedRouteObj.name || selectedRouteObj.departure + ' - ' + selectedRouteObj.destination}`
        : formData.routeId;

      const submissionPayload = {
        routeId: formData.routeId,
        routeName: routeDisplayName,
        category: formData.category,
        content: formData.content,
        // Star input is optional in feedback mode, required in rating mode
        rating: formData.rating && formData.rating > 0 ? Number(formData.rating) : null,
        type: activeMode === 'rating' ? 'RATING' : 'FEEDBACK',
        passengerId: currentUser?.id || 4,
        passengerName: currentUser?.name || 'Hành khách'
      };

      const created = await feedbackService.createFeedback(submissionPayload);
      setFeedbacks(prev => [created, ...prev]);

      showToast(
        activeMode === 'rating'
          ? 'Cảm ơn bạn đã đánh giá chuyến xe! Ý kiến của bạn đã được ghi nhận.'
          : 'Đã gửi phản ánh thành công! Ban điều hành sẽ xem xét và phản hồi sớm.',
        'success'
      );

      // Reset form content & rating
      setFormData(prev => ({
        ...prev,
        content: '',
        rating: activeMode === 'rating' ? 5 : 0
      }));
      setFormErrors({});
    } catch (err) {
      showToast(err.message || 'Gửi thất bại. Vui lòng thử lại!', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Feedback Confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await feedbackService.deleteFeedback(itemToDelete.id);
      setFeedbacks(prev => prev.filter(f => f.id !== itemToDelete.id));
      showToast('Đã xóa thành công ý kiến đóng góp.', 'info');
      setItemToDelete(null);
    } catch (err) {
      showToast(err.message || 'Không thể xóa ý kiến này.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered History List
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(item => {
      const query = searchTerm.trim().toLowerCase();
      const matchSearch =
        !query ||
        (item.content && item.content.toLowerCase().includes(query)) ||
        (item.routeName && item.routeName.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query));

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchRoute = routeFilter === 'ALL' || item.routeId === routeFilter;

      return matchSearch && matchStatus && matchRoute;
    });
  }, [feedbacks, searchTerm, statusFilter, routeFilter]);

  // Star Rating Text Helper
  const getRatingLabel = (score) => {
    switch (score) {
      case 5:
        return 'Tuyệt vời (5 sao) - Rất hài lòng';
      case 4:
        return 'Tốt (4 sao) - Đạt kỳ vọng';
      case 3:
        return 'Bình thường (3 sao) - Chấp nhận được';
      case 2:
        return 'Chưa tốt (2 sao) - Cần cải thiện';
      case 1:
        return 'Rất tệ (1 sao) - Hoàn toàn thất vọng';
      default:
        return 'Chưa chọn sao (Tùy chọn)';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* 1. Page Header (RouteManagementPage pattern) */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {activeMode === 'rating' ? 'Đánh giá Chất lượng Chuyến xe' : 'Gửi Phản ánh & Góp ý Dịch vụ'}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'var(--role-passenger-bg)',
                color: 'var(--role-passenger-text)',
                border: '1px solid var(--role-passenger-border)'
              }}
            >
              <Sparkles size={13} /> Phân hệ Hành khách
            </span>
          </div>
          <p style={{ marginTop: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {activeMode === 'rating'
              ? 'Chia sẻ trải nghiệm, chấm điểm sao cho các tuyến xe buýt nhằm nâng cao chất lượng phục vụ.'
              : 'Tiếp nhận khiếu nại, phản ánh sự cố kỹ thuật, thái độ phục vụ hoặc đề xuất tuyến mới cho ban điều hành.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={fetchFeedbacks}
            disabled={isLoading}
            title="Tải lại dữ liệu"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* 2. Modern 2-Tab Navigation Bar matching RouteManagementPage */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-light)',
          marginBottom: '1.5rem',
          gap: '1.5rem'
        }}
      >
        <button
          onClick={() => handleTabChange('feedback')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeMode === 'feedback' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: '-2px',
            color: activeMode === 'feedback' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeMode === 'feedback' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          <MessageSquare size={18} color={activeMode === 'feedback' ? 'var(--primary)' : 'var(--text-muted)'} />
          <span>Gửi Phản ánh & Góp ý</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeMode === 'feedback' ? 'var(--primary-light)' : 'var(--divider)',
              color: activeMode === 'feedback' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            {statistics.feedbacksCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('rating')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeMode === 'rating' ? '3px solid #f59e0b' : '3px solid transparent',
            marginBottom: '-2px',
            color: activeMode === 'rating' ? '#d97706' : 'var(--text-secondary)',
            fontWeight: activeMode === 'rating' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        >
          <Star size={18} color={activeMode === 'rating' ? '#f59e0b' : 'var(--text-muted)'} />
          <span>Đánh giá Chuyến đi (Sao)</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: activeMode === 'rating' ? '#fef3c7' : 'var(--divider)',
              color: activeMode === 'rating' ? '#b45309' : 'var(--text-secondary)'
            }}
          >
            {statistics.ratingsCount}
          </span>
        </button>
      </div>

      {/* 3. Quick KPI Cards matching SCRUM-17/18/19 pattern */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tổng lượt đóng góp
            </span>
            <div style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '7px', borderRadius: '8px' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>
            {statistics.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {statistics.feedbacksCount} phản ánh &bull; {statistics.ratingsCount} đánh giá
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Điểm đánh giá TB
            </span>
            <div style={{ color: '#d97706', backgroundColor: '#fef3c7', padding: '7px', borderRadius: '8px' }}>
              <Star size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {statistics.avgScore} <span style={{ fontSize: '1rem', color: '#f59e0b' }}>★</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '0.2rem' }}>
            Hài lòng toàn hệ thống
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Chờ xử lý (Pending)
            </span>
            <div style={{ color: '#b45309', backgroundColor: '#fffbeb', padding: '7px', borderRadius: '8px' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>
            {statistics.pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.2rem' }}>
            Đang chờ điều phối viên duyệt
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Đã giải quyết
            </span>
            <div style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '7px', borderRadius: '8px' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>
            {statistics.resolvedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '0.2rem' }}>
            Đã có phản hồi chính thức
          </div>
        </div>
      </div>

      {/* 4. Form Submission Section */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: activeMode === 'rating' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              {activeMode === 'rating' ? <Star size={20} /> : <MessageSquare size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {activeMode === 'rating' ? 'Biểu mẫu Đánh giá Chuyến xe & Chấm sao' : 'Biểu mẫu Gửi Ý kiến & Khiếu nại Dịch vụ'}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Hành khách: <strong>{currentUser?.name || 'Hành khách SmartBus'}</strong> ({currentUser?.email || 'Chưa có email'})
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.775rem',
              color: 'var(--text-muted)'
            }}
          >
            Trường có dấu <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>*</span> là bắt buộc
          </span>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Route Selector (REQUIRED) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Tuyến xe bạn đã trải nghiệm <span className="required">*</span>
              </label>
              <select
                className={`form-select ${formErrors.routeId ? 'has-error' : ''}`}
                value={formData.routeId}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, routeId: e.target.value }));
                  if (formErrors.routeId) setFormErrors(prev => ({ ...prev, routeId: null }));
                }}
              >
                <option value="">-- Chọn tuyến xe buýt --</option>
                {availableRoutes.map(route => (
                  <option key={route.id} value={route.id}>
                    {route.code ? `[${route.code}] ` : ''}{route.name || `${route.departure} - ${route.destination}`}
                  </option>
                ))}
              </select>
              {formErrors.routeId && (
                <span className="form-error">
                  <AlertCircle size={13} /> {formErrors.routeId}
                </span>
              )}
            </div>

            {/* Category */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Chủ đề đóng góp ý kiến
              </label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Star Rating Input (Required in 'rating' mode, Optional in 'feedback' mode) */}
          <div
            className="form-group"
            style={{
              backgroundColor: '#f8fafc',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${formErrors.rating ? 'var(--danger)' : 'var(--border-light)'}`,
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                {activeMode === 'rating' ? (
                  <>
                    Chấm điểm chất lượng sao <span className="required">*</span>
                  </>
                ) : (
                  <>
                    Đánh giá sao trải nghiệm <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Tùy chọn)</span>
                  </>
                )}
              </label>

              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: formData.rating > 0 ? '#d97706' : 'var(--text-muted)' }}>
                {getRatingLabel(hoverRating || formData.rating)}
              </span>
            </div>

            {/* Interactive Stars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((starIndex) => {
                const isFilled = (hoverRating || formData.rating) >= starIndex;
                return (
                  <button
                    key={starIndex}
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={() => setHoverRating(starIndex)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => {
                      const newScore = formData.rating === starIndex && activeMode !== 'rating' ? 0 : starIndex;
                      setFormData(prev => ({ ...prev, rating: newScore }));
                      if (formErrors.rating) setFormErrors(prev => ({ ...prev, rating: null }));
                    }}
                    title={`${starIndex} sao`}
                  >
                    <Star
                      size={28}
                      color={isFilled ? '#f59e0b' : '#cbd5e1'}
                      fill={isFilled ? '#f59e0b' : 'none'}
                      style={{
                        transform: (hoverRating || formData.rating) === starIndex ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s'
                      }}
                    />
                  </button>
                );
              })}

              {formData.rating > 0 && activeMode !== 'rating' && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, rating: 0 }))}
                  style={{
                    marginLeft: '0.75rem',
                    fontSize: '0.775rem',
                    color: 'var(--text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Bỏ chọn sao
                </button>
              )}
            </div>

            {formErrors.rating && (
              <span className="form-error" style={{ marginTop: '0.5rem' }}>
                <AlertCircle size={13} /> {formErrors.rating}
              </span>
            )}
          </div>

          {/* Content Textarea (REQUIRED) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">
                Nội dung chi tiết <span className="required">*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formData.content.length} / 1000 ký tự
              </span>
            </div>

            <textarea
              rows={4}
              maxLength={1000}
              className={`form-input ${formErrors.content ? 'has-error' : ''}`}
              style={{ resize: 'vertical' }}
              placeholder={
                activeMode === 'rating'
                  ? 'Kể về trải nghiệm chuyến xe buýt của bạn (sự êm ái, xe đúng giờ, thái độ niềm nở, trang thiết bị trên xe...)'
                  : 'Mô tả chi tiết sự cố bạn gặp phải, hoặc góp ý các điểm cần cải thiện để SmartBus hỗ trợ tốt nhất...'
              }
              value={formData.content}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, content: e.target.value }));
                if (formErrors.content) setFormErrors(prev => ({ ...prev, content: null }));
              }}
            />

            {formErrors.content ? (
              <span className="form-error">
                <AlertCircle size={13} /> {formErrors.content}
              </span>
            ) : (
              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Tất cả ý kiến của bạn sẽ được chuyển thẳng đến bộ phận Kiểm soát Chất lượng SmartBus.
              </span>
            )}
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <Button
              type="submit"
              variant={activeMode === 'rating' ? 'primary' : 'primary'}
              icon={Send}
              isLoading={isSubmitting}
            >
              {activeMode === 'rating' ? 'Gửi đánh giá sao' : 'Gửi phản ánh ngay'}
            </Button>
          </div>
        </form>
      </div>

      {/* 5. History Section: Filter & Table */}
      <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--primary)" />
              Lịch sử Phản hồi & Đánh giá của Hành khách
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Theo dõi tiến độ tiếp nhận, xử lý và phản hồi chính thức từ đội ngũ vận hành xe buýt
            </p>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2rem', paddingRight: '1.8rem', height: '36px', fontSize: '0.825rem' }}
                placeholder="Tìm nội dung, tuyến..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              className="form-select"
              style={{ width: 'auto', height: '36px', fontSize: '0.825rem', padding: '0 0.75rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="PROCESSING">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
            </select>

            {/* Route Filter */}
            <select
              className="form-select"
              style={{ width: 'auto', height: '36px', fontSize: '0.825rem', padding: '0 0.75rem' }}
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="ALL">Tất cả tuyến xe</option>
              {availableRoutes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.code || r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <Loading text="Đang tải lịch sử đóng góp..." />
        ) : errorMessage ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p>{errorMessage}</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Chưa có dữ liệu phản hồi nào phù hợp"
            description={
              searchTerm || statusFilter !== 'ALL' || routeFilter !== 'ALL'
                ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái để xem các kết quả khác.'
                : 'Bạn chưa gửi phản ánh hay đánh giá nào. Hãy điền biểu mẫu phía trên để gửi ý kiến đầu tiên!'
            }
            actionText={searchTerm || statusFilter !== 'ALL' || routeFilter !== 'ALL' ? 'Xóa bộ lọc' : null}
            onAction={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setRouteFilter('ALL');
            }}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem', width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Tuyến xe</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Loại & Chủ đề</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Đánh giá</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Nội dung</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Trạng thái</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Ngày gửi</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((item, idx) => {
                  const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : '---';

                  const isPending = item.status === 'PENDING';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'var(--transition)'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Bus size={14} color="var(--primary)" />
                          <span>{item.routeName || item.routeId}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: item.type === 'RATING' ? '#b45309' : 'var(--primary)',
                              backgroundColor: item.type === 'RATING' ? '#fef3c7' : 'var(--primary-light)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              width: 'fit-content'
                            }}
                          >
                            {item.type === 'RATING' ? <Star size={11} /> : <MessageSquare size={11} />}
                            {item.type === 'RATING' ? 'Đánh giá' : 'Phản ánh'}
                          </span>
                          <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                            {item.category || 'Chung'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {item.rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={13}
                                color={s <= item.rating ? '#f59e0b' : '#e2e8f0'}
                                fill={s <= item.rating ? '#f59e0b' : 'none'}
                              />
                            ))}
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: '0.25rem', color: '#b45309' }}>
                              {item.rating}★
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Không chấm sao</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', maxWidth: '280px' }}>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={item.content}
                        >
                          {item.content}
                        </div>
                        {item.adminResponse && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={12} /> Đã có phản hồi từ nhà xe
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {item.status === 'RESOLVED' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--success-text)',
                              backgroundColor: 'var(--success-light)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid #a7f3d0'
                            }}
                          >
                            <CheckCircle2 size={12} /> Đã giải quyết
                          </span>
                        ) : item.status === 'PROCESSING' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#0369a1',
                              backgroundColor: '#e0f2fe',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid #bae6fd'
                            }}
                          >
                            <Clock size={12} /> Đang xử lý
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#92400e',
                              backgroundColor: '#fef3c7',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid #fde68a'
                            }}
                          >
                            <Clock size={12} /> Chờ xử lý
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {dateStr}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => setSelectedDetail(item)}
                            title="Xem chi tiết & phản hồi"
                          >
                            <Eye size={16} color="var(--primary)" />
                          </button>

                          {isPending && (
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={() => setItemToDelete(item)}
                              title="Xóa ý kiến khi còn chờ xử lý"
                            >
                              <Trash2 size={16} color="var(--danger)" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Detail Modal */}
      {selectedDetail && (
        <Modal
          isOpen={Boolean(selectedDetail)}
          onClose={() => setSelectedDetail(null)}
          title="Chi tiết Đóng góp & Phản hồi"
          maxWidth="600px"
          footer={
            <Button variant="secondary" onClick={() => setSelectedDetail(null)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '0.35rem',
                    backgroundColor: selectedDetail.type === 'RATING' ? '#fef3c7' : 'var(--primary-light)',
                    color: selectedDetail.type === 'RATING' ? '#b45309' : 'var(--primary)'
                  }}
                >
                  {selectedDetail.type === 'RATING' ? 'Đánh giá chất lượng' : 'Phản ánh dịch vụ'}
                </span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedDetail.routeName}
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Chủ đề: <strong>{selectedDetail.category}</strong>
                </span>
              </div>

              <div>
                {selectedDetail.rating ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '8px' }}>
                    <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>
                      {selectedDetail.rating} / 5
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không chấm sao</span>
                )}
              </div>
            </div>

            {/* Content */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Nội dung gửi:
              </label>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  marginTop: '0.4rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6
                }}
              >
                {selectedDetail.content}
              </div>
            </div>

            {/* Official Admin Response */}
            {selectedDetail.adminResponse ? (
              <div
                style={{
                  backgroundColor: 'var(--success-light)',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <ShieldCheck size={16} /> Phản hồi chính thức từ Nhà xe SmartBus:
                </div>
                <p style={{ fontSize: '0.875rem', color: '#064e3b', lineHeight: 1.6 }}>
                  {selectedDetail.adminResponse}
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  fontSize: '0.825rem',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Clock size={16} /> Ý kiến của bạn đã được ghi nhận vào hệ thống và đang được phòng Chăm sóc Khách hàng phân loại xử lý.
              </div>
            )}

            {/* Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              <span>Người gửi: {selectedDetail.passengerName || 'Hành khách'}</span>
              <span>Thời gian: {new Date(selectedDetail.createdAt).toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Delete Confirmation Modal */}
      {itemToDelete && (
        <Modal
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          title="Xác nhận xóa ý kiến đóng góp"
          footer={
            <>
              <Button variant="secondary" onClick={() => setItemToDelete(null)}>
                Hủy bỏ
              </Button>
              <Button variant="danger" isLoading={isDeleting} onClick={handleDeleteConfirm}>
                Xác nhận xóa
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                Bạn có chắc chắn muốn xóa phản ánh này không?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                Tuyến: <strong>{itemToDelete.routeName}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Hành động này không thể hoàn tác sau khi đã thực hiện.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
