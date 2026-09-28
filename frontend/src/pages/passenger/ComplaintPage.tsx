import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ComplaintCategory } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';

export const ComplaintPage: React.FC = () => {
  const { routes, complaints, addComplaint } = useData();
  const { currentUser } = useAuth();
  const { success, error } = useToast();

  const [routeId, setRouteId] = useState(routes[0]?.id || '');
  const [category, setCategory] = useState<ComplaintCategory>('ATTITUDE');
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List of complaints submitted by this passenger
  const myComplaints = complaints.filter(
    (c) =>
      c.passengerEmail.toLowerCase() === (currentUser?.email || '').toLowerCase() ||
      c.passengerName.toLowerCase() === (currentUser?.fullName || '').toLowerCase()
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!routeId) errs.routeId = 'Vui lòng chọn tuyến xe buýt liên quan.';
    if (!tripDate) errs.tripDate = 'Vui lòng chọn ngày xảy ra sự việc.';
    if (!subject.trim()) errs.subject = 'Vui lòng nhập tiêu đề khiếu nại ngắn gọn.';
    if (!description.trim()) {
      errs.description = 'Vui lòng mô tả chi tiết sự việc để cơ quan điều hành xác minh.';
    } else if (description.trim().length < 15) {
      errs.description = 'Nội dung phản ánh phải có tối thiểu 15 ký tự.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const complaintData = {
      passengerName: currentUser?.fullName || 'Hành khách',
      passengerEmail: currentUser?.email || 'passenger@bus.com',
      passengerPhone: currentUser?.phone || '0900000000',
      routeId,
      tripDate,
      category,
      subject: subject.trim(),
      description: description.trim(),
    };

    const res = addComplaint(complaintData);

    setTimeout(() => {
      setIsSubmitting(false);
      if (res.success) {
        success('Đã gửi khiếu nại thành công! Ban quản lý sẽ xác minh và phản hồi sớm.');
        // Reset form
        setSubject('');
        setDescription('');
        setErrors({});
      } else {
        error(res.message || 'Gửi khiếu nại thất bại.');
      }
    }, 400);
  };

  const handleResetForm = () => {
    setSubject('');
    setDescription('');
    setErrors({});
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Gửi Phản Ánh & Khiếu Nại Dịch Vụ Xe Buýt"
        subtitle="Tiếp nhận phản ánh của người dân về giờ giấc, thái độ phục vụ, an toàn xe buýt và chất lượng phương tiện công cộng."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Hành khách' },
          { label: 'Gửi khiếu nại' },
        ]}
        icon={<MessageSquareWarning className="w-5 h-5 text-rose-500" />}
      />

      {/* 2. Main Content Grid: Form on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: The Submission Form */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131e3a] p-6 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
              Biểu Mẫu Gửi Đơn Khiếu Nại
            </h2>
            <div className="h-0.5 bg-amber-500 w-16 mt-1 rounded-full" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thông tin người gửi: <strong>{currentUser?.fullName}</strong> ({currentUser?.email})
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Route */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tuyến xe buýt xảy ra sự việc <span className="text-rose-500">*</span>
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
                {errors.routeId && <p className="text-[11px] text-rose-500 mt-1">{errors.routeId}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Ngày xảy ra sự việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
                {errors.tripDate && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.tripDate}</p>
                )}
              </div>

              {/* Category */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Phân loại khiếu nại <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="ATTITUDE">Thái độ phục vụ của lái xe / phụ xe</option>
                  <option value="DELAY">Chậm trễ hành trình / Không đúng biểu đồ giờ</option>
                  <option value="OVERCHARGING">Thu tiền vé sai biểu giá quy định</option>
                  <option value="VEHICLE_QUALITY">Chất lượng xe (Máy lạnh hỏng, dơ bẩn, xe cũ)</option>
                  <option value="SAFETY">An toàn vận hành (Chạy ẩu, bỏ trạm, phanh gấp)</option>
                  <option value="OTHER">Phản ánh nội dung khác</option>
                </select>
              </div>

              {/* Subject */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề tóm tắt khiếu nại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ví dụ: Xe buýt tuyến 01 bỏ trạm đón khách tại ngã tư Hàng Xanh lúc 07:30"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
                {errors.subject && <p className="text-[11px] text-rose-500 mt-1">{errors.subject}</p>}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chi tiết sự việc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vui lòng cung cấp thêm thông tin: Biển số xe (nếu nhớ), địa điểm trạm dừng, thời gian cụ thể và diễn biến chi tiết..."
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500 leading-relaxed"
                />
                {errors.description && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.description}</p>
                )}
              </div>

            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nhập lại</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi khiếu nại chính thức</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Passenger's Complaint History & Response Tracker */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
              Lịch Sử Khiếu Nại Của Bạn ({myComplaints.length})
            </h3>
            <div className="h-0.5 bg-amber-500 w-12 mt-1 rounded-full mb-3" />

            {myComplaints.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Bạn chưa gửi khiếu nại nào trong hệ thống.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {myComplaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c162d] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[11px] text-institutional-700 dark:text-sky-400">
                        {c.id}
                      </span>
                      <Badge variant="complaintStatus" value={c.status} size="sm" />
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                      {c.subject}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                      {c.description}
                    </p>

                    <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                      <span>Tuyến: {routes.find((r) => r.id === c.routeId)?.code}</span>
                      <span>Ngày: {c.tripDate}</span>
                    </div>

                    {c.adminResponse && (
                      <div className="mt-2 p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          Phản hồi từ quản lý:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                          {c.adminResponse}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
