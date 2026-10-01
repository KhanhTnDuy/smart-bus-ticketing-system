import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Search,
  Filter,
  RotateCcw,
  Eye,
  CheckCircle2,
  RefreshCw,
  Star,
  Phone,
  Mail,
} from 'lucide-react';
import {
  FeedbackRow,
  useFeedbackManagement,
  toComplaintStatus,
} from '../../hooks/useFeedbackManagement';
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  FeedbackStatusCode,
  FeedbackTypeCode,
} from '../../api/feedback';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';

const STATUS_OPTIONS = [
  FeedbackStatusCode.ChuaXuLy,
  FeedbackStatusCode.DangXuLy,
  FeedbackStatusCode.DaXuLy,
];

const RatingStars: React.FC<{ value: number }> = ({ value }) => (
  <span className="inline-flex items-center gap-0.5" title={`${value}/5 sao`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`w-3 h-3 ${
          n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'
        }`}
      />
    ))}
  </span>
);

export const ComplaintManagementPage: React.FC = () => {
  const {
    rows,
    loading,
    error: loadError,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    reload,
    changeStatus,
  } = useFeedbackManagement();
  const { success, error } = useToast();

  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<FeedbackStatusCode>(FeedbackStatusCode.DangXuLy);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenView = (row: FeedbackRow) => {
    setSelected(row);
    setIsViewOpen(true);
  };

  const handleOpenProcess = (row: FeedbackRow) => {
    setSelected(row);
    setTargetStatus(row.status);
    setIsProcessOpen(true);
  };

  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    setIsSubmitting(true);
    try {
      const res = await changeStatus(selected.id, targetStatus);
      if (res.success) {
        success(
          `Đã cập nhật phản ánh #${selected.id} sang "${FEEDBACK_STATUS_LABELS[targetStatus]}".`,
        );
        setIsProcessOpen(false);
      } else {
        error(res.message || 'Cập nhật trạng thái thất bại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tiếp Nhận & Xử Lý Phản Ánh Hành Khách"
        subtitle="Quản lý toàn bộ khiếu nại và đánh giá chuyến đi do hành khách gửi lên, theo dõi tiến độ giải quyết của đơn vị vận tải."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành vận tải' },
          { label: 'Phản ánh & đánh giá' },
        ]}
        icon={<MessageSquareWarning className="w-5 h-5 text-rose-500" />}
      />

      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            Không tải được danh sách phản ánh: {loadError}
          </span>
          <button
            type="button"
            onClick={reload}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Bộ lọc, toàn bộ đẩy xuống backend */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
            <span>Bộ lọc phản ánh:</span>
          </div>
          <button
            type="button"
            onClick={reload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Tải lại danh sách từ máy chủ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung, tên hành khách..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div>
            <select
              value={filters.type ?? 'ALL'}
              onChange={(e) =>
                setFilter(
                  'type',
                  e.target.value === 'ALL' ? null : (Number(e.target.value) as FeedbackTypeCode),
                )
              }
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả loại --</option>
              <option value={FeedbackTypeCode.Complaint}>
                {FEEDBACK_TYPE_LABELS[FeedbackTypeCode.Complaint]}
              </option>
              <option value={FeedbackTypeCode.Review}>
                {FEEDBACK_TYPE_LABELS[FeedbackTypeCode.Review]}
              </option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={filters.status ?? 'ALL'}
              onChange={(e) =>
                setFilter(
                  'status',
                  e.target.value === 'ALL' ? null : (Number(e.target.value) as FeedbackStatusCode),
                )
              }
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              {STATUS_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {FEEDBACK_STATUS_LABELS[code]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="px-3 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách phản ánh */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tổng số phản ánh:{' '}
            <span className="text-institutional-700 dark:text-sky-400 font-extrabold">
              {rows.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            * Nhấn "Xử lý" để cập nhật tiến độ giải quyết
          </span>
        </div>

        {loading && rows.length === 0 ? (
          <LoadingState message="Đang tải danh sách phản ánh từ máy chủ..." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Chưa có phản ánh nào"
            description={
              loadError
                ? 'Không đọc được dữ liệu từ máy chủ. Hãy thử lại sau khi kiểm tra kết nối.'
                : 'Không có phản ánh nào khớp với bộ lọc hiện tại.'
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 bg-institutional-700 text-white rounded text-xs font-semibold hover:bg-institutional-800"
                >
                  Đặt lại bộ lọc
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Hành khách</th>
                  <th className="px-4 py-3">Tuyến</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Đánh giá</th>
                  <th className="px-4 py-3">Ngày gửi</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {row.passengerName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.passengerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      {row.routeLabel || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {FEEDBACK_TYPE_LABELS[row.type]}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs truncate"
                      title={row.subject}
                    >
                      {row.subject}
                    </td>
                    <td className="px-4 py-3">
                      {row.type === FeedbackTypeCode.Review ? (
                        <RatingStars value={row.rating} />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {row.createdAt}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="complaintStatus" value={toComplaintStatus(row.status)} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenView(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors"
                          title="Xem chi tiết nội dung phản ánh"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenProcess(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-colors"
                          title="Cập nhật trạng thái xử lý"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Xử lý</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Xem chi tiết phản ánh */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Chi Tiết Phản Ánh Hành Khách"
        subtitle={`Mã tiếp nhận: ${selected?.id}`}
        maxWidth="lg"
        icon={<MessageSquareWarning className="w-5 h-5 text-rose-500" />}
      >
        {selected && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selected.passengerName}
                </h4>
                <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {selected.passengerPhone || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {selected.passengerEmail || '—'}
                  </span>
                </div>
              </div>
              <Badge variant="complaintStatus" value={toComplaintStatus(selected.status)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Loại:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {FEEDBACK_TYPE_LABELS[selected.type]}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tuyến:</span>
                <div className="font-bold text-institutional-700 dark:text-sky-400 mt-0.5">
                  {selected.routeLabel || 'Không gắn tuyến'}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  Thời điểm gửi:
                </span>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selected.createdAt}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  Cán bộ xử lý:
                </span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selected.processedByName || 'Chưa phân công'}
                </div>
              </div>

              {selected.type === FeedbackTypeCode.Review && (
                <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Số sao đánh giá:
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <RatingStars value={selected.rating} />
                    <span className="font-bold">{selected.rating}/5</span>
                  </div>
                </div>
              )}

              <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tiêu đề:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  {selected.subject}
                </div>
              </div>

              <div className="col-span-2 p-3.5 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">
                  Nội dung chi tiết:
                </span>
                <p className="mt-1 leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {selected.content || 'Hành khách không nhập nội dung.'}
                </p>
              </div>

              {selected.imagePath && (
                <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    Ảnh đính kèm:
                  </span>
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 break-all">
                    {selected.imagePath}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewOpen(false);
                  handleOpenProcess(selected);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Chuyển sang xử lý
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cập nhật trạng thái xử lý */}
      <Modal
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
        title="Cập Nhật Tiến Độ Xử Lý"
        subtitle={`Phản ánh #${selected?.id} — ${selected?.passengerName ?? ''}`}
        maxWidth="md"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
      >
        {selected && (
          <form onSubmit={handleSaveProcess} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {selected.subject}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {FEEDBACK_TYPE_LABELS[selected.type]}
                {selected.routeLabel && ` • Tuyến ${selected.routeLabel}`} • Gửi lúc{' '}
                <span className="font-mono">{selected.createdAt}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Trạng thái xử lý <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((code) => (
                  <label
                    key={code}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      targetStatus === code
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c162d] hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="feedbackStatus"
                      value={code}
                      checked={targetStatus === code}
                      onChange={() => setTargetStatus(code)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{FEEDBACK_STATUS_LABELS[code]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsProcessOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
              >
                {isSubmitting ? 'Đang lưu...' : 'Cập nhật trạng thái'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
