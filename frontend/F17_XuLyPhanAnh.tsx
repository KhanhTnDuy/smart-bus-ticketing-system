import React, { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Complaint, ComplaintStatus, RouteItem } from './types';

interface F17XuLyPhanAnhProps {
  isOpen: boolean;
  complaint: Complaint | null;
  routes?: RouteItem[];
  onClose: () => void;
  onSave: (complaintId: string, status: ComplaintStatus, response: string) => void | Promise<void>;
}

/**
 * CHỨC NĂNG F17: XỬ LÝ PHẢN ÁNH (TASK 4.4)
 * - Cho phép cán bộ điều hành / quản lý tiếp nhận khiếu nại
 * - Cập nhật trạng thái giải quyết (Chờ xử lý, Đang xử lý, Đã xử lý, Từ chối)
 * - Nhập biên bản giải quyết, biện pháp khắc phục và phản hồi chính thức cho khách hàng
 */
export const F17_XuLyPhanAnh: React.FC<F17XuLyPhanAnhProps> = ({
  isOpen,
  complaint,
  routes = [],
  onClose,
  onSave,
}) => {
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>('PROCESSING');
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (complaint) {
      setTargetStatus(complaint.status);
      setAdminResponse(complaint.adminResponse || '');
    }
  }, [complaint]);

  if (!isOpen || !complaint) return null;

  const routeObj = routes.find((r) => r.id === complaint.routeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(complaint.id, targetStatus, adminResponse);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white border border-slate-200 dark:border-[#223561] shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] bg-slate-50 dark:bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-base font-bold">Xử Lý Khiếu Nại Dịch Vụ (F17)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mã phản ánh: <span className="font-mono font-semibold">{complaint.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Thông tin vắn tắt phản ánh */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {complaint.subject}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Hành khách: <span className="font-semibold text-slate-700 dark:text-slate-200">{complaint.passengerName}</span> 
              {' • '}Tuyến: <span className="font-semibold text-institutional-600 dark:text-sky-400">{routeObj?.code || complaint.routeId}</span>
              {' • '}Ngày: <span className="font-mono">{complaint.tripDate}</span>
            </div>
          </div>

          {/* Chọn trạng thái giải quyết */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Trạng thái giải quyết khiếu nại <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED'] as ComplaintStatus[]).map((st) => {
                const label =
                  st === 'PENDING'
                    ? 'Chờ xử lý'
                    : st === 'PROCESSING'
                    ? 'Đang xử lý'
                    : st === 'RESOLVED'
                    ? 'Đã xử lý (Thành công)'
                    : 'Từ chối giải quyết';

                return (
                  <label
                    key={st}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      targetStatus === st
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c162d]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="complaintStatus"
                      value={st}
                      checked={targetStatus === st}
                      onChange={() => setTargetStatus(st)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Nhập ý kiến phản hồi / phương án xử lý */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Ý kiến giải quyết / Phản hồi của đơn vị điều hành
            </label>
            <textarea
              rows={4}
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              placeholder="Nhập phương án xác minh, biên bản làm việc với lái/phụ xe hoặc giải pháp khắc phục..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Thao tác nút bấm */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Cập nhật kết quả xử lý'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
