import React, { useState, useMemo } from 'react';
import {
  MessageSquareWarning,
  Eye,
  CheckCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RotateCcw,
  MessageSquare,
  User,
  Phone,
  Mail,
  Compass,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useFeedbackManagement } from '../../hooks/useFeedbackManagement';
import { Complaint, ComplaintStatus, ComplaintCategory } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const ComplaintManagementPage: React.FC = () => {
  const { routes } = useData();
  const { complaints, updateComplaintStatus, error: loadError, reload } = useFeedbackManagement();
  const { success, error } = useToast();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Modals
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  // Process form state
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>('PROCESSING');
  const [adminResponse, setAdminResponse] = useState('');

  // Category labels
  const getCategoryLabel = (cat: ComplaintCategory) => {
    switch (cat) {
      case 'ATTITUDE':
        return 'Thái độ phục vụ';
      case 'DELAY':
        return 'Chậm trễ / Trễ giờ';
      case 'OVERCHARGING':
        return 'Thu sai giá cước';
      case 'VEHICLE_QUALITY':
        return 'Chất lượng phương tiện';
      case 'SAFETY':
        return 'An toàn giao thông';
      case 'OTHER':
        return 'Phản ánh khác';
      default:
        return cat;
    }
  };

  // Filtered complaints
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const routeObj = routes.find((r) => r.id === c.routeId);
      const routeCode = routeObj?.code || '';

      const matchSearch =
        c.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routeCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      const matchCategory = filterCategory === 'ALL' || c.category === filterCategory;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [complaints, routes, searchTerm, filterStatus, filterCategory]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterCategory('ALL');
  };

  // Open Handlers
  const handleOpenView = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsViewModalOpen(true);
  };

  const handleOpenProcess = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setTargetStatus(complaint.status);
    setAdminResponse(complaint.adminResponse || '');
    setIsProcessModalOpen(true);
  };

  // Submit status update
  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const res = await updateComplaintStatus(selectedComplaint.id, targetStatus);
    if (res.success) {
      success(`Cập nhật trạng thái khiếu nại [${selectedComplaint.id}] thành công!`);
      setIsProcessModalOpen(false);
    } else {
      error(res.message || 'Cập nhật thất bại.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Tiếp Nhận & Xử Lý Khiếu Nại Hành Khách"
        subtitle="Quản lý toàn bộ phản ánh, khiếu nại về chất lượng chuyến đi, thái độ phục vụ và quy chế vận tải hành khách."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành vận tải' },
          { label: 'Khiếu nại & đánh giá' },
        ]}
        icon={<MessageSquareWarning className="w-5 h-5 text-rose-500" />}
      />

      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            Không thể đồng bộ với máy chủ: {loadError} (Đang hiển thị dữ liệu cục bộ)
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

      {/* 2. Filter & Search Controls */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
          <span>Bộ lọc trạng thái & Phân loại phản ánh:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm hành khách, tiêu đề, mã khiếu nại..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="PENDING">Chờ xử lý (PENDING)</option>
              <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
              <option value="RESOLVED">Đã xử lý (RESOLVED)</option>
              <option value="REJECTED">Từ chối (REJECTED)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả danh mục --</option>
              <option value="ATTITUDE">Thái độ phục vụ</option>
              <option value="DELAY">Chậm trễ / Trễ giờ</option>
              <option value="OVERCHARGING">Thu sai giá cước</option>
              <option value="VEHICLE_QUALITY">Chất lượng xe</option>
              <option value="SAFETY">An toàn giao thông</option>
              <option value="OTHER">Khác</option>
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Complaint Table with Separate Actions (TASK 4.3, 4.4) */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tổng số khiếu nại:{' '}
            <span className="text-institutional-700 dark:text-sky-400 font-extrabold">
              {filteredComplaints.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            * Hành động phân biệt: "Xem chi tiết" và "Xử lý"
          </span>
        </div>

        {filteredComplaints.length === 0 ? (
          <EmptyState
            title="Không có khiếu nại phù hợp"
            description="Hiện tại không có phản ánh khiếu nại nào theo điều kiện lọc này."
            action={
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-institutional-700 text-white rounded text-xs font-semibold hover:bg-institutional-800"
              >
                Đặt lại bộ lọc
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Mã khiếu nại</th>
                  <th className="px-4 py-3">Hành khách</th>
                  <th className="px-4 py-3">Tuyến liên quan</th>
                  <th className="px-4 py-3">Phân loại</th>
                  <th className="px-4 py-3">Tiêu đề phản ánh</th>
                  <th className="px-4 py-3">Ngày xảy ra</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {filteredComplaints.map((c) => {
                  const routeObj = routes.find((r) => r.id === c.routeId);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        <div>{c.passengerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.passengerPhone}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-institutional-700 dark:text-sky-400 whitespace-nowrap">
                        {routeObj?.code || c.routeId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          {getCategoryLabel(c.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs truncate" title={c.subject}>
                        {c.subject}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {c.tripDate}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="complaintStatus" value={c.status} size="sm" />
                      </td>

                      {/* Separate Actions: Xem chi tiết | Xử lý (TASK 4.3, 4.4) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors"
                            title="Xem đầy đủ nội dung khiếu nại"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>

                          {/* Xử lý */}
                          <button
                            type="button"
                            onClick={() => handleOpenProcess(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 transition-colors"
                            title="Cập nhật trạng thái và giải pháp xử lý"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Xử lý</span>
                          </button>
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

      {/* ========================================================
          MODAL 1: VIEW COMPLAINT DETAIL (TASK 4.3)
      ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi Tiết Khiếu Nại Của Hành Khách"
        subtitle={`Mã tiếp nhận: [${selectedComplaint?.id}]`}
        maxWidth="xl"
        icon={<MessageSquareWarning className="w-5 h-5 text-rose-500" />}
      >
        {selectedComplaint && (
          <div className="space-y-4 text-xs">
            {/* Passenger Header */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedComplaint.passengerName}
                </h4>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {selectedComplaint.passengerPhone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {selectedComplaint.passengerEmail}
                  </span>
                </div>
              </div>
              <Badge variant="complaintStatus" value={selectedComplaint.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tuyến xe buýt:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {routes.find((r) => r.id === selectedComplaint.routeId)?.code || selectedComplaint.routeId}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Phân loại:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {getCategoryLabel(selectedComplaint.category)}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Ngày xảy ra sự việc:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedComplaint.tripDate}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Thời điểm gửi:</span>
                <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                  {selectedComplaint.createdAt}
                </div>
              </div>

              <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tiêu đề:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                  {selectedComplaint.subject}
                </div>
              </div>

              <div className="col-span-2 p-4 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Nội dung phản ánh chi tiết:</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
              </div>

              {selectedComplaint.adminResponse && (
                <div className="col-span-2 p-4 rounded bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">
                    Kết quả xử lý & Phản hồi chính thức:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                    {selectedComplaint.adminResponse}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400">
                    Người phụ trách: {selectedComplaint.processedBy} • {selectedComplaint.processedAt}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenProcess(selectedComplaint);
                }}
                className="px-4 py-2 text-xs font-bold uppercase rounded bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Chuyển sang xử lý
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL 2: PROCESS COMPLAINT FORM (TASK 4.4)
      ======================================================== */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title="Xử Lý Khiếu Nại Dịch Vụ"
        subtitle={`Cập nhật trạng thái và giải pháp cho [${selectedComplaint?.id}]`}
        maxWidth="lg"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
      >
        {selectedComplaint && (
          <form onSubmit={handleSaveProcess} className="space-y-4 text-xs">
            <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">
                {selectedComplaint.subject}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Hành khách: {selectedComplaint.passengerName} • Tuyến: {routes.find((r) => r.id === selectedComplaint.routeId)?.code}
              </div>
            </div>

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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Ý kiến giải quyết / Phản hồi của đơn vị điều hành
              </label>
              <textarea
                rows={4}
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Nhập phương án xác minh, biên bản làm việc với lái/phụ xe hoặc giải pháp khắc phục..."
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsProcessModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                Cập nhật kết quả xử lý
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
