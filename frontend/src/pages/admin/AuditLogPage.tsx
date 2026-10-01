import React, { useState, useMemo } from 'react';
import { FileText, Search, Filter, RotateCcw, Eye, User, RefreshCw } from 'lucide-react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { ACTION_TYPE_LABELS, AuditActionTypeCode, AuditStatusCode } from '../../api/auditLogs';
import { AuditLog } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';

const ACTION_TYPE_OPTIONS = Object.entries(ACTION_TYPE_LABELS).map(([code, label]) => ({
  code: Number(code) as AuditActionTypeCode,
  label,
}));

export const AuditLogPage: React.FC = () => {
  const {
    logs,
    loading,
    error: loadError,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    reload,
  } = useAuditLogs();

  // Phân hệ được suy ra khi ánh xạ chứ không có ở backend, nên lọc tại client.
  const [filterModule, setFilterModule] = useState<string>('ALL');

  // Selected Log for View Detail
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Chỉ liệt kê những phân hệ thực sự có trong dữ liệu đã tải, tránh hiển thị
  // lựa chọn không bao giờ khớp bản ghi nào.
  const moduleOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.module))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(
    () => (filterModule === 'ALL' ? logs : logs.filter((log) => log.module === filterModule)),
    [logs, filterModule],
  );

  const handleClearFilters = () => {
    clearFilters();
    setFilterModule('ALL');
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

      {/* Trạng thái tải dữ liệu từ API */}
      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            Không tải được nhật ký hệ thống: {loadError}
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

      {/* 2. Search & Multi-filter Controls (TASK 2.4) */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
            <span>Bộ lọc nâng cao nhật ký thanh tra:</span>
          </div>
          <button
            type="button"
            onClick={reload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Tải lại nhật ký từ máy chủ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Lọc theo người dùng (backend: username) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filters.username}
              onChange={(e) => setFilter('username', e.target.value)}
              placeholder="Tên đăng nhập..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Tìm trong thao tác / đối tượng / mô tả (backend: search) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Từ khóa thao tác, đối tượng..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Loại thao tác (backend: actionType) */}
          <div>
            <select
              value={filters.actionType ?? 'ALL'}
              onChange={(e) =>
                setFilter(
                  'actionType',
                  e.target.value === 'ALL' ? null : (Number(e.target.value) as AuditActionTypeCode),
                )
              }
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả loại thao tác --</option>
              {ACTION_TYPE_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái (backend: status) */}
          <div>
            <select
              value={filters.status ?? 'ALL'}
              onChange={(e) =>
                setFilter(
                  'status',
                  e.target.value === 'ALL' ? null : (Number(e.target.value) as AuditStatusCode),
                )
              }
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value={AuditStatusCode.Success}>Thành công</option>
              <option value={AuditStatusCode.Warning}>Cảnh báo</option>
              <option value={AuditStatusCode.Failure}>Thất bại</option>
            </select>
          </div>

          {/* Phân hệ: suy ra ở frontend nên lọc tại client */}
          <div>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả phân hệ --</option>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>

          {/* Khoảng thời gian (backend: from / to, tính theo giờ UTC) */}
          <div>
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => setFilter('from', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              title="Từ ngày"
            />
          </div>

          <div>
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => setFilter('to', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              title="Đến ngày"
            />
          </div>

          {/* Clear Filters Button (Xóa bộ lọc) */}
          <div>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters && filterModule === 'ALL'}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {loading && filteredLogs.length === 0 ? (
          <LoadingState message="Đang tải nhật ký hệ thống từ máy chủ..." />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="Không tìm thấy nhật ký"
            description={
              loadError
                ? 'Không đọc được dữ liệu từ máy chủ. Hãy thử lại sau khi kiểm tra kết nối.'
                : 'Không có bản ghi kiểm toán nào khớp với tiêu chí tìm kiếm hoặc bộ lọc ngày giờ.'
            }
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
                  {selectedLog.ipAddress || 'Không ghi nhận'}
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
