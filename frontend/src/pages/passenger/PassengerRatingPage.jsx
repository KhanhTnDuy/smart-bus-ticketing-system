import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star, RefreshCw, Search, X, Sparkles, AlertCircle,
  Bus, TrendingUp, MessageSquare, ThumbsUp, RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { feedbackService } from '../../api/feedbackService';
import { INITIAL_ROUTES } from '../../data/mockRoutes';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Loading } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';
import { StarRatingDisplay } from '../../components/passenger/StarRating';
import { PendingTripCard } from '../../components/passenger/PendingTripCard';
import { RatingCard } from '../../components/passenger/RatingCard';
import { RatingForm } from '../../components/passenger/RatingForm';
import { SORT_OPTIONS, getRatingLevel } from '../../components/passenger/ratingConstants';

/**
 * PassengerRatingPage (F15) - Đánh giá chất lượng chuyến xe.
 * Gồm: thống kê điểm, danh sách chuyến đi chờ đánh giá, bảng tin đánh giá cộng đồng
 * và biểu mẫu gửi đánh giá mới (RatingForm).
 */
export const PassengerRatingPage = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // ── Dữ liệu ────────────────────────────────────────────────
  const [ratings, setRatings] = useState([]);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Bộ lọc ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [onlyMine, setOnlyMine] = useState(false);

  // ── Tương tác ──────────────────────────────────────────────
  const [likedIds, setLikedIds] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [ratingToDelete, setRatingToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Nạp danh sách tuyến (phục vụ bộ lọc) ───────────────────
  const loadRoutes = useCallback(() => {
    try {
      const stored = localStorage.getItem('bus_admin_routes');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableRoutes(parsed);
          return;
        }
      }
    } catch { /* dùng dữ liệu mặc định */ }
    setAvailableRoutes(INITIAL_ROUTES);
  }, []);

  // ── Nạp đánh giá + chuyến đi chờ đánh giá ──────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [ratingsData, tripsData] = await Promise.all([
        feedbackService.getTripRatings({}),
        feedbackService.getPendingTripsToRate()
      ]);
      setRatings(ratingsData || []);
      setPendingTrips(tripsData || []);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu đánh giá.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Chuyến đi đã hoàn thành nhưng chưa được chấm sao
  const tripsToRate = useMemo(() => pendingTrips.filter((trip) => !trip.hasRated), [pendingTrips]);

  // ── Thống kê ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = ratings.length;
    const avg = total ? ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / total : 0;
    const fiveStar = ratings.filter((r) => Number(r.rating) === 5).length;
    const mine = ratings.filter((r) => r.passengerId === currentUser?.id).length;
    const responded = ratings.filter((r) => r.adminResponse).length;
    return { total, avg, fiveStar, mine, responded };
  }, [ratings, currentUser]);

  // ── Danh sách đánh giá sau khi lọc & sắp xếp ───────────────
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = ratings.filter((item) => {
      const matchSearch = !q || [item.content, item.driverName, item.busPlate, item.routeName, item.ticketCode]
        .some((field) => field && String(field).toLowerCase().includes(q));
      const matchRoute = routeFilter === 'ALL' || item.routeId === routeFilter;
      const matchRating = ratingFilter === 'ALL' || String(item.rating) === ratingFilter;
      const matchMine = !onlyMine || item.passengerId === currentUser?.id;
      return matchSearch && matchRoute && matchRating && matchMine;
    });

    if (sortBy === 'HIGHEST') return [...list].sort((a, b) => b.rating - a.rating);
    if (sortBy === 'LOWEST') return [...list].sort((a, b) => a.rating - b.rating);
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [ratings, searchTerm, routeFilter, ratingFilter, onlyMine, sortBy, currentUser]);

  // ── Hành động ──────────────────────────────────────────────
  const handleOpenForm = (trip = null) => {
    setActiveTrip(trip);
    setIsFormOpen(true);
  };

  const handleSubmitted = (created, tripId) => {
    setRatings((prev) => [created, ...prev]);
    setPendingTrips((prev) => prev.map((trip) => (trip.tripId === tripId ? { ...trip, hasRated: true } : trip)));
  };

  const handleLike = async (rating) => {
    if (likedIds.includes(rating.id)) {
      showToast('Bạn đã thả tim đánh giá này rồi.', 'info');
      return;
    }
    try {
      await feedbackService.likeTripRating(rating.id);
      setLikedIds((prev) => [...prev, rating.id]);
      setRatings((prev) => prev.map((r) => (r.id === rating.id ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r)));
    } catch {
      showToast('Không thể thả tim, vui lòng thử lại.', 'danger');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!ratingToDelete) return;
    setIsDeleting(true);
    try {
      await feedbackService.deleteTripRating(ratingToDelete.id);
      setRatings((prev) => prev.filter((r) => r.id !== ratingToDelete.id));
      showToast('Đã xóa đánh giá của bạn.', 'info');
      setRatingToDelete(null);
    } catch (err) {
      showToast(err.message || 'Xóa đánh giá thất bại.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetDemo = async () => {
    feedbackService.resetAllData();
    setLikedIds([]);
    showToast('Đã khôi phục dữ liệu mẫu ban đầu.', 'info');
    await fetchData();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRouteFilter('ALL');
    setRatingFilter('ALL');
    setOnlyMine(false);
  };

  const avgLevel = getRatingLevel(Math.round(stats.avg));


  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── 1. Page Header ─────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Đánh giá Chuyến đi
            </h1>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem', fontWeight: 700,
                backgroundColor: 'var(--role-passenger-bg)', color: 'var(--role-passenger-text)',
                border: '1px solid var(--role-passenger-border)'
              }}
            >
              <Sparkles size={13} /> Phân hệ Hành khách
            </span>
          </div>
          <p style={{ marginTop: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Chấm điểm chất lượng phục vụ sau mỗi chuyến đi và xem cảm nhận của cộng đồng hành khách SmartBus.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={RotateCcw} onClick={handleResetDemo} disabled={isLoading}>
            Dữ liệu mẫu
          </Button>
          <Button variant="secondary" icon={RefreshCw} onClick={fetchData} disabled={isLoading}>
            Làm mới
          </Button>
        </div>
      </div>

      {/* ── 2. KPI Cards ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Điểm trung bình
            </span>
            <div style={{ color: avgLevel.color, backgroundColor: 'var(--warning-light)', padding: '7px', borderRadius: '8px' }}>
              <Star size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>
            {stats.avg.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 5</span>
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <StarRatingDisplay value={stats.avg} size="sm" />
          </div>
        </div>

        {[
          { label: 'Tổng đánh giá', value: stats.total,     icon: MessageSquare, iconBg: 'var(--primary-light)', iconColor: 'var(--primary)', sub: 'Từ cộng đồng hành khách' },
          { label: 'Đánh giá 5 sao', value: stats.fiveStar, icon: TrendingUp,    iconBg: 'var(--success-light)', iconColor: 'var(--success)', sub: 'Trải nghiệm tuyệt vời' },
          { label: 'Đánh giá của bạn', value: stats.mine,   icon: ThumbsUp,      iconBg: '#e0f2fe',              iconColor: '#0369a1',        sub: `${stats.responded} đã được phản hồi` }
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{kpi.label}</span>
              <div style={{ color: kpi.iconColor, backgroundColor: kpi.iconBg, padding: '7px', borderRadius: '8px' }}>
                <kpi.icon size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-main)' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>


      {/* ── 3. Chuyến đi chờ đánh giá ─────────────────────── */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Bus size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Chuyến đi cần đánh giá</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Bạn có <strong>{tripsToRate.length}</strong> chuyến đi đã hoàn thành đang chờ chấm điểm.
              </p>
            </div>
          </div>
          {tripsToRate.length > 0 && (
            <Button variant="primary" icon={Star} onClick={() => handleOpenForm(tripsToRate[0])}>
              Đánh giá ngay
            </Button>
          )}
        </div>

        {isLoading ? (
          <Loading text="Đang tải danh sách chuyến đi..." />
        ) : tripsToRate.length === 0 ? (
          <div
            style={{
              padding: '2rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--success-light)',
              borderRadius: 'var(--radius-lg)', border: '1px dashed #a7f3d0'
            }}
          >
            <Sparkles size={30} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success-text)' }}>Bạn đã đánh giá hết chuyến đi!</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--success-text)', marginTop: '0.25rem' }}>
              Cảm ơn bạn đã dành thời gian chia sẻ trải nghiệm cùng SmartBus.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {tripsToRate.map((trip) => (
              <PendingTripCard key={trip.tripId} trip={trip} onRate={handleOpenForm} />
            ))}
          </div>
        )}
      </div>


      {/* ── 4. Bảng tin đánh giá cộng đồng ────────────────── */}
      <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} color="var(--primary)" /> Bảng tin Đánh giá
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Tổng hợp {filtered.length} đánh giá{onlyMine ? ' của bạn' : ' từ hành khách'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 210 }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2rem', paddingRight: '1.8rem', height: 36, fontSize: '0.82rem' }}
                placeholder="Tìm nhận xét, tài xế..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              className="form-select"
              style={{ width: 'auto', height: 36, fontSize: '0.82rem', padding: '0 0.75rem' }}
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="ALL">Tất cả tuyến</option>
              {availableRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.code ? `[${route.code}] ` : ''}{route.name || `${route.departure} - ${route.destination}`}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', height: 36, fontSize: '0.82rem', padding: '0 0.75rem' }}
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
            >
              <option value="ALL">Mọi mức sao</option>
              {[5, 4, 3, 2, 1].map((star) => (
                <option key={star} value={String(star)}>{star} sao</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', height: 36, fontSize: '0.82rem', padding: '0 0.75rem' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyMine((prev) => !prev)}
              className={`btn btn-sm ${onlyMine ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 36 }}
            >
              Chỉ của tôi
            </button>
          </div>
        </div>

        {isLoading ? (
          <Loading text="Đang tải bảng tin đánh giá..." />
        ) : errorMsg ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p>{errorMsg}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Chưa có đánh giá nào"
            description={
              searchTerm || routeFilter !== 'ALL' || ratingFilter !== 'ALL' || onlyMine
                ? 'Thử thay đổi từ khóa hoặc bộ lọc để xem thêm đánh giá khác.'
                : 'Hãy đánh giá chuyến đi đầu tiên của bạn ở mục "Chuyến đi cần đánh giá" phía trên!'
            }
            actionText={searchTerm || routeFilter !== 'ALL' || ratingFilter !== 'ALL' || onlyMine ? 'Xóa bộ lọc' : null}
            onAction={clearFilters}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map((rating) => (
              <RatingCard
                key={rating.id}
                rating={rating}
                currentUserId={currentUser?.id}
                isLiked={likedIds.includes(rating.id)}
                onLike={handleLike}
                onDelete={setRatingToDelete}
              />
            ))}
          </div>
        )}
      </div>


      {/* ── 5. Modal gửi đánh giá (RatingForm) ────────────── */}
      {isFormOpen && tripsToRate.length > 0 && (
        <RatingForm
          isOpen={isFormOpen}
          onClose={() => { setIsFormOpen(false); setActiveTrip(null); }}
          initialTrip={activeTrip}
          pendingTrips={tripsToRate}
          onSubmitted={handleSubmitted}
        />
      )}

      {/* ── 6. Modal xác nhận xóa đánh giá ───────────────── */}
      {ratingToDelete && (
        <Modal
          isOpen
          onClose={() => setRatingToDelete(null)}
          title="Xác nhận xóa đánh giá"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRatingToDelete(null)}>Hủy bỏ</Button>
              <Button variant="danger" isLoading={isDeleting} onClick={handleDeleteConfirm}>Xác nhận xóa</Button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 42, height: 42, borderRadius: '50%', backgroundColor: 'var(--danger-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--danger)', flexShrink: 0
              }}
            >
              <AlertCircle size={22} />
            </div>
            <div>
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>
                Bạn có chắc chắn muốn xóa đánh giá này?
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                Tuyến: <strong>{ratingToDelete.routeName}</strong> — Mã vé: <strong style={{ fontFamily: 'monospace' }}>{ratingToDelete.ticketCode}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

