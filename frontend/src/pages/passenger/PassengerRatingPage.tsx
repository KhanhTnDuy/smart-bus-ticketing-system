import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Star,
  RefreshCw,
  Search,
  X,
  Sparkles,
  AlertCircle,
  Bus,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { StarRatingDisplay } from '../../components/passenger/StarRating';
import { PendingTripCard } from '../../components/passenger/PendingTripCard';
import { RatingCard } from '../../components/passenger/RatingCard';
import { RatingForm } from '../../components/passenger/RatingForm';
import { SORT_OPTIONS, getRatingLevel } from '../../components/passenger/ratingConstants';
import {
  tripRatingService,
  type TripRatingItem,
  type PendingTrip,
} from '../../api/tripRatingService';

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

/**
 * PassengerRatingPage (F15) - Đánh giá chất lượng chuyến xe.
 * Gồm: thống kê điểm, chuyến đi chờ đánh giá, bảng tin đánh giá cộng đồng và
 * biểu mẫu gửi đánh giá mới (RatingForm). Dữ liệu lấy từ tripRatingService.
 */
export const PassengerRatingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { error, info } = useToast();

  const myUserId = Number(currentUser?.id) || 0;

  // ── Dữ liệu ────────────────────────────────────────────────
  const [ratings, setRatings] = useState<TripRatingItem[]>([]);
  const [pendingTrips, setPendingTrips] = useState<PendingTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Bộ lọc ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortValue>('NEWEST');
  const [onlyMine, setOnlyMine] = useState(false);

  // ── Tương tác ──────────────────────────────────────────────
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTrip, setActiveTrip] = useState<PendingTrip | null>(null);
  const [ratingToDelete, setRatingToDelete] = useState<TripRatingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [ratingList, tripList] = await Promise.all([
        tripRatingService.getTripRatings({}),
        tripRatingService.getPendingTripsToRate(),
      ]);
      setRatings(ratingList);
      setPendingTrips(tripList);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể tải dữ liệu đánh giá.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const tripsToRate = useMemo(() => pendingTrips.filter((t) => !t.hasRated), [pendingTrips]);

  // ── Thống kê ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = ratings.length;
    const avg = total ? ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / total : 0;
    const fiveStar = ratings.filter((r) => Number(r.rating) === 5).length;
    const mine = ratings.filter((r) => r.passengerId === myUserId).length;
    const responded = ratings.filter((r) => r.adminResponse).length;
    return { total, avg, fiveStar, mine, responded };
  }, [ratings, myUserId]);

  // Danh sách tuyến để lọc (suy ra từ chính dữ liệu đánh giá)
  const routeOptions = useMemo(() => {
    const map = new Map<string, string>();
    ratings.forEach((r) => {
      if (r.routeId && !map.has(r.routeId)) map.set(r.routeId, r.routeName);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [ratings]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = ratings.filter((item) => {
      const matchSearch =
        !q ||
        [item.content, item.driverName, item.busPlate, item.routeName, item.ticketCode].some(
          (field) => field && field.toLowerCase().includes(q),
        );
      const matchRoute = routeFilter === 'ALL' || item.routeId === routeFilter;
      const matchRating = ratingFilter === 'ALL' || String(item.rating) === ratingFilter;
      const matchMine = !onlyMine || item.passengerId === myUserId;
      return matchSearch && matchRoute && matchRating && matchMine;
    });

    if (sortBy === 'HIGHEST') return [...list].sort((a, b) => b.rating - a.rating);
    if (sortBy === 'LOWEST') return [...list].sort((a, b) => a.rating - b.rating);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ratings, searchTerm, routeFilter, ratingFilter, onlyMine, sortBy, myUserId]);

  const hasActiveFilter = !!searchTerm || routeFilter !== 'ALL' || ratingFilter !== 'ALL' || onlyMine;

  // ── Hành động ──────────────────────────────────────────────
  const handleOpenForm = (trip: PendingTrip | null = null) => {
    setActiveTrip(trip);
    setIsFormOpen(true);
  };

  const handleSubmitted = (created: TripRatingItem, tripId?: string) => {
    setRatings((prev) => [created, ...prev]);
    if (tripId) {
      setPendingTrips((prev) => prev.map((t) => (t.tripId === tripId ? { ...t, hasRated: true } : t)));
    }
  };

  const handleLike = async (rating: TripRatingItem) => {
    if (likedIds.includes(rating.id)) {
      info('Bạn đã thả tim đánh giá này rồi.');
      return;
    }
    try {
      await tripRatingService.likeTripRating(rating.id);
      setLikedIds((prev) => [...prev, rating.id]);
      setRatings((prev) =>
        prev.map((r) => (r.id === rating.id ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r)),
      );
    } catch {
      error('Không thể thả tim, vui lòng thử lại.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!ratingToDelete) return;
    setIsDeleting(true);
    try {
      await tripRatingService.deleteTripRating(ratingToDelete.id);
      setRatings((prev) => prev.filter((r) => r.id !== ratingToDelete.id));
      info('Đã xóa đánh giá của bạn.');
      setRatingToDelete(null);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Xóa đánh giá thất bại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetDemo = async () => {
    tripRatingService.resetAllData();
    setLikedIds([]);
    info('Đã khôi phục dữ liệu mẫu ban đầu.');
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
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Đánh Giá Chất Lượng Chuyến Đi"
        subtitle="Chấm điểm chất lượng phục vụ sau mỗi chuyến đi và xem cảm nhận của cộng đồng hành khách SmartBus."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Hành khách' },
          { label: 'Đánh giá chuyến đi' },
        ]}
        icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
        action={
          <>
            <button
              type="button"
              onClick={handleResetDemo}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Dữ liệu mẫu
            </button>
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-institutional-600 hover:bg-institutional-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Làm mới
            </button>
          </>
        }
      />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#131e3a] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Điểm trung bình
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats.avg.toFixed(1)}
            <span className="text-base font-medium text-slate-400"> / 5</span>
          </div>
          <div className="mt-2">
            <StarRatingDisplay value={stats.avg} size="sm" />
            <span className="ml-2 text-[11px] font-semibold" style={{ color: avgLevel.color }}>
              {avgLevel.label} {avgLevel.emoji}
            </span>
          </div>
        </div>

        {[
          { label: 'Tổng đánh giá', value: stats.total, Icon: MessageSquare, sub: 'Từ cộng đồng hành khách' },
          { label: 'Đánh giá 5 sao', value: stats.fiveStar, Icon: TrendingUp, sub: 'Trải nghiệm tuyệt vời' },
          { label: 'Đánh giá của bạn', value: stats.mine, Icon: ThumbsUp, sub: `${stats.responded} đã được phản hồi` },
        ].map(({ label, value, Icon, sub }) => (
          <div
            key={label}
            className="p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#131e3a] shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </span>
              <div className="p-2 rounded-lg bg-institutional-50 dark:bg-[#1a2b53]">
                <Icon className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
              </div>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">{value}</div>
            <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
          </div>
        ))}
      </div>


      {/* 3. Chuyến đi chờ đánh giá */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#131e3a] shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-institutional-600 text-white">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Chuyến đi cần đánh giá
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bạn có <strong className="text-institutional-700 dark:text-sky-400">{tripsToRate.length}</strong> chuyến đi
                đã hoàn thành đang chờ chấm điểm.
              </p>
            </div>
          </div>
          {tripsToRate.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenForm(tripsToRate[0])}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors"
            >
              <Star className="w-4 h-4" /> Đánh giá ngay
            </button>
          )}
        </div>

        {isLoading ? (
          <LoadingState message="Đang tải danh sách chuyến đi..." />
        ) : tripsToRate.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20">
            <Sparkles className="w-8 h-8 text-emerald-500 mb-2" />
            <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Bạn đã đánh giá hết chuyến đi!</h4>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Cảm ơn bạn đã dành thời gian chia sẻ trải nghiệm cùng SmartBus.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tripsToRate.map((trip) => (
              <PendingTripCard key={trip.tripId} trip={trip} onRate={handleOpenForm} />
            ))}
          </div>
        )}
      </div>


      {/* 4. Bảng tin đánh giá cộng đồng */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#131e3a] shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-institutional-600 dark:text-sky-400" /> Bảng tin Đánh giá
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng hợp {filtered.length} đánh giá{onlyMine ? ' của bạn' : ' từ hành khách'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhận xét, tài xế..."
                className="w-52 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-xs text-slate-800 dark:text-slate-100 pl-8 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-xs text-slate-700 dark:text-slate-200 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả tuyến</option>
              {routeOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-xs text-slate-700 dark:text-slate-200 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Mọi mức sao</option>
              {[5, 4, 3, 2, 1].map((star) => (
                <option key={star} value={String(star)}>
                  {star} sao
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortValue)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-xs text-slate-700 dark:text-slate-200 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyMine((prev) => !prev)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                onlyMine
                  ? 'bg-institutional-600 text-white border-institutional-600'
                  : 'bg-white dark:bg-[#0c162d] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
            >
              Chỉ của tôi
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Đang tải bảng tin đánh giá..." />
        ) : errorMsg ? (
          <div className="p-8 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Chưa có đánh giá nào"
            description={
              hasActiveFilter
                ? 'Thử thay đổi từ khóa hoặc bộ lọc để xem thêm đánh giá khác.'
                : 'Hãy đánh giá chuyến đi đầu tiên của bạn ở mục "Chuyến đi cần đánh giá" phía trên!'
            }
            icon={<Star className="w-8 h-8" />}
            action={
              hasActiveFilter ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white bg-institutional-600 hover:bg-institutional-700 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((rating) => (
              <RatingCard
                key={rating.id}
                rating={rating}
                currentUserId={myUserId}
                isLiked={likedIds.includes(rating.id)}
                onLike={handleLike}
                onDelete={setRatingToDelete}
              />
            ))}
          </div>
        )}
      </div>


      {/* 5. Modal gửi đánh giá */}
      {isFormOpen && tripsToRate.length > 0 && (
        <RatingForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setActiveTrip(null);
          }}
          initialTrip={activeTrip}
          pendingTrips={tripsToRate}
          onSubmitted={handleSubmitted}
        />
      )}

      {/* 6. Modal xác nhận xóa đánh giá */}
      <Modal
        isOpen={!!ratingToDelete}
        onClose={() => setRatingToDelete(null)}
        title="Xác nhận xóa đánh giá"
        maxWidth="md"
        icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 shrink-0 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Bạn có chắc chắn muốn xóa đánh giá này?
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
              Tuyến: <strong>{ratingToDelete?.routeName}</strong> — Mã vé:{' '}
              <strong className="font-mono">{ratingToDelete?.ticketCode}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Hành động này không thể hoàn tác.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setRatingToDelete(null)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Xác nhận xóa'
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
};

