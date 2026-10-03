import React, { useState } from 'react';
import {
  Star,
  Send,
  Compass,
  Calendar,
  Bus,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';

export const RatingPage: React.FC = () => {
  const { routes, ratings, addRating } = useData();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [routeId, setRouteId] = useState(routes[0]?.id || '');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [busPlate, setBusPlate] = useState('');
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const starLabels: Record<number, string> = {
    1: 'Rất không hài lòng (1 sao) — Dịch vụ kém',
    2: 'Không hài lòng (2 sao) — Cần khắc phục nhiều điểm',
    3: 'Bình thường (3 sao) — Đạt yêu cầu cơ bản',
    4: 'Hài lòng (4 sao) — Xe sạch, chạy đúng giờ',
    5: 'Rất hài lòng (5 sao) — Dịch vụ tuyệt vời, nhân viên lịch sự',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!routeId) {
      error('Vui lòng chọn tuyến xe buýt bạn đã đi.');
      return;
    }

    if (!review.trim()) {
      error('Vui lòng chia sẻ đôi lời cảm nhận về chuyến đi.');
      return;
    }

    setIsSubmitting(true);

    const ratingData = {
      passengerName: currentUser?.fullName || 'Hành khách',
      passengerEmail: currentUser?.email || 'passenger@bus.com',
      routeId,
      tripDate,
      rating,
      review: review.trim(),
      busPlate: busPlate.trim() || undefined,
    };

    try {
      const res = await addRating(ratingData);
      setIsSubmitting(false);
      if (res.success) {
        success('Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn giúp nâng cao chất lượng dịch vụ xe buýt.');
        setReview('');
        setBusPlate('');
        setRating(5);
      } else {
        error(res.message || 'Gửi đánh giá không thành công.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      error(err.message || 'Lỗi gửi đánh giá.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Đánh Giá Chất Lượng Chuyến Đi"
        subtitle="Ý kiến đóng góp và chấm điểm sao của bạn giúp các tài xế, tiếp viên và đơn vị vận tải không ngừng nâng cao chất lượng phục vụ."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Hành khách' },
          { label: 'Đánh giá chuyến đi' },
        ]}
        icon={<Star className="w-5 h-5 text-amber-500 fill-amber-500" />}
      />

      {/* 2. Form & Feedback Wall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Rating Form */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131e3a] p-6 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
              Chấm Điểm & Đóng Góp Nhận Xét
            </h2>
            <div className="h-0.5 bg-amber-500 w-16 mt-1 rounded-full" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Đánh giá từ tài khoản: <strong>{currentUser?.fullName}</strong> ({currentUser?.email})
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            
            {/* Interactive Star Rating Selector (TASK 4.2) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mức độ hài lòng của bạn <span className="text-rose-500">*</span>
              </label>

              {/* 5 Interactive Stars */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const isFilled = (hoverRating || rating) >= starIndex;
                  return (
                    <button
                      key={starIndex}
                      type="button"
                      onClick={() => setRating(starIndex)}
                      onMouseEnter={() => setHoverRating(starIndex)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-md transition-transform hover:scale-125 focus:outline-none"
                      title={`${starIndex} sao`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400 drop-shadow'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic description of star */}
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {starLabels[hoverRating || rating]}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Route */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tuyến xe buýt đã trải nghiệm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trip Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Ngày thực hiện chuyến đi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>

              {/* Bus Plate (Optional) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Biển số kiểm soát xe buýt (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={busPlate}
                  onChange={(e) => setBusPlate(e.target.value)}
                  placeholder="Ví dụ: 51B-184.22"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>

              {/* Review Comment */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nhận xét & cảm nhận của bạn <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Chia sẻ về thái độ của tài xế, độ sạch sẽ của xe, máy lạnh hoặc thời gian xe đón trả..."
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500 leading-relaxed"
                />
              </div>

            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi đánh giá chuyến đi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Recent Community Reviews */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                Đánh Giá Gần Đây ({ratings.length})
              </h3>
              <div className="flex items-center text-amber-400 gap-1 text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {(ratings.reduce((acc, r) => acc + r.rating, 0) / (ratings.length || 1)).toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {ratings.map((r) => {
                const routeObj = routes.find((rt) => rt.id === r.routeId);
                return (
                  <div
                    key={r.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c162d] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {r.passengerName}
                      </span>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] font-medium text-institutional-700 dark:text-sky-400">
                      {routeObj?.code}: {routeObj?.name}
                      {r.busPlate && <span className="ml-1 text-slate-400 font-mono">({r.busPlate})</span>}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      "{r.review}"
                    </p>

                    <div className="text-[10px] text-slate-400 pt-0.5">
                      Thời gian gửi: {r.createdAt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
