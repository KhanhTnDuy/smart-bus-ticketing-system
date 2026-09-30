import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  Clock,
  User,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { AuditLog, AuditModule, AuditStatus } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const AuditLogPage: React.FC = () => {
  const { auditLogs, loading, error: loadError, reload, setFilters } = useAuditLogs();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Selected Log for View Detail
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Sync server filters when dates or search change (SCRUM-16)
  useEffect(() => {
    setFilters({
      search: searchTerm.trim() || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    });
  }, [searchTerm, fromDate, toDate, setFilters]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        !searchTerm ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchModule = filterModule === 'ALL' || log.module === filterModule;
      const matchStatus = filterStatus === 'ALL' || log.status === filterStatus;
      
      const logDate = log.dateTime.slice(0, 10);
      const matchFrom = !fromDate || logDate >= fromDate;
      const matchTo = !toDate || logDate <= toDate;

      return matchSearch && matchModule && matchStatus && matchFrom && matchTo;
    });
  }, [auditLogs, searchTerm, filterModule, filterStatus, fromDate, toDate]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterModule('ALL');
    setFilterStatus('ALL');
    setFromDate('');
    setToDate('');
  };

  const handleOpenViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Institutional Identity */}
      <PageHeader
        title="Nhật Ký Thanh Tra Hệ Thống (Audit Logs)"
        subtitle="Hệ thống tự động ghi nhận và lưu trữ toàn bộ thao tác thêm, sửa, xóa, phân quyền và giao dịch nghiệp vụ trong hệ thống."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Quản trị hệ thống' },
          { label: 'Nhật ký hệ thống' },
        ]}
        icon={<FileText className="w-5 h-5 text-amber-500" />}
      />

      {/* Trạng thái kết nối API */}
      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            Không thể tải nhật ký từ máy chủ: {loadError} (Đang hiển thị dữ liệu cục bộ)
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

      {/* 2. Search & Multi-filter Controls (TASK 2.4 - SCRUM-16) */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
          <span>Bộ lọc nâng cao nhật ký thanh tra (có lọc khoảng ngày):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search by user / action */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm người dùng, thao tác..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Filter by Module */}
          <div>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả phân hệ --</option>
              <option value="AUTH">Xác thực (AUTH)</option>
              <option value="ACCOUNT">Tài khoản (ACCOUNT)</option>
              <option value="ROLE">Phân quyền (ROLE)</option>
              <option value="ROUTE">Tuyến đường (ROUTE)</option>
              <option value="STOP">Trạm dừng (STOP)</option>
              <option value="FARE">Giá vé (FARE)</option>
              <option value="COMPLAINT">Khiếu nại (COMPLAINT)</option>
              <option value="RATING">Đánh giá (RATING)</option>
              <option value="SYSTEM">Hệ thống (SYSTEM)</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="SUCCESS">Thành công (SUCCESS)</option>
              <option value="WARNING">Cảnh báo (WARNING)</option>
              <option value="FAILURE">Thất bại (FAILURE)</option>
            </select>
          </div>

          {/* Filter by From Date (SCRUM-16) */}
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              title="Từ ngày"
              placeholder="Từ ngày"
            />
          </div>

          {/* Filter by To Date (SCRUM-16) */}
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              title="Đến ngày"
              placeholder="Đến ngày"
            />
          </div>

          {/* Clear Filters Button (Xóa bộ lọc) */}
          <div>
            <button
              type="button"
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Professional Audit Log Table (TASK 2.3) */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tổng số bản ghi nhật ký:{' '}
            <span className="text-institutional-700 dark:text-sky-400 font-extrabold">
              {filteredLogs.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            * Nhấn "Xem chi tiết" để hiển thị đầy đủ tham số kiểm toán
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            title="Không tìm thấy nhật ký"
            description="Không có bản ghi kiểm toán nào khớp với tiêu chí tìm kiếm hoặc bộ lọc ngày giờ."
            action={
              <button
                type="button"
                onClick={handleClearFilters}
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
                  <th className="px-4 py-3">Mã Log ID</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Thao tác nghiệp vụ</th>
                  <th className="px-4 py-3">Phân hệ</th>
                  <th className="px-4 py-3">Nội dung chi tiết</th>
                  <th className="px-4 py-3">Thời gian ghi nhận</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {log.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {log.user}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                      {log.dateTime}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="auditStatus" value={log.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {/* Explicit "Xem chi tiết" Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenViewDetail(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: VIEW AUDIT LOG DETAIL (TASK 2.3)
      ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi Tiết Bản Ghi Nhật Ký Hệ Thống"
        subtitle={`Mã kiểm toán: ${selectedLog?.id}`}
        maxWidth="lg"
        icon={<FileText className="w-5 h-5 text-amber-500" />}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Mã nhật ký:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.id}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Trạng thái:</span>
                <div className="mt-0.5">
                  <Badge variant="auditStatus" value={selectedLog.status} />
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Người thực hiện:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.user}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Địa chỉ IP truy cập:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.ipAddress || '192.168.1.15 (Nội bộ)'}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Phân hệ quản lý:</span>
                <div className="font-bold text-institutional-700 dark:text-sky-400 mt-0.5">
                  {selectedLog.module}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Thời gian ghi nhận:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.dateTime}
                </div>
              </div>

              <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Thao tác nghiệp vụ:</span>
                <div className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  {selectedLog.action}
                </div>
              </div>

              <div className="col-span-2 p-3.5 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Mô tả chi tiết tác động:</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedLog.description}
                </p>
                {selectedLog.targetId && (
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Đối tượng mục tiêu (Target ID): <strong>{selectedLog.targetId}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
