import React, { useState, useMemo } from 'react';
import {
  MessageSquareWarning,
  Eye,
  CheckCircle2,
  Search,
  Filter,
  RotateCcw,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import { Complaint, ComplaintCategory, ComplaintStatus, RouteItem } from './types';

interface F16QuanLyPhanAnhProps {
  complaints: Complaint[];
  routes?: RouteItem[];
  onOpenProcess?: (complaint: Complaint) => void;
}

/**
 * CHỨC NĂNG F16: QUẢN LÝ PHẢN ÁNH (TASK 4.3)
 * - Tiếp nhận và liệt kê toàn bộ khiếu nại/phản ánh từ hành khách
 * - Bộ lọc nâng cao: Tìm kiếm theo từ khóa, lọc theo trạng thái, lọc theo phân loại vi phạm
 * - Xem chi tiết đầy đủ thông tin khiếu nại qua Modal
 */
export const F16_QuanLyPhanAnh: React.FC<F16QuanLyPhanAnhProps> = ({
  complaints,
  routes = [],
  onOpenProcess,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Detail Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Phân loại danh mục tiếng Việt
  const getCategoryLabel = (cat: ComplaintCategory) => {
    switch (cat) {
      case 'ATTITUDE':
        return 'Thái độ phục vụ';
      case 'DELAY':
        return 'Chậm trễ / Trễ giờ';
      case 'OVERCHARGING':
        return 'Thu sai giá cước';
      case 'VEHICLE_QUALITY':
        return 'Chất lượng xe';
      case 'SAFETY':
        return 'An toàn giao thông';
      case 'OTHER':
        return 'Khác';
      default:
        return cat;
    }
  };

  // Badge trạng thái
  const renderStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
            Chờ xử lý
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800">
            Đang xử lý
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
            Đã xử lý
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
            Từ chối
          </span>
        );
    }
  };

  // Logic lọc dữ liệu
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

  const handleOpenDetail = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Bộ lọc */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Tìm kiếm & Bộ lọc nâng cao (F16)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo hành khách, tiêu đề, mã khiếu nại..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
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

      {/* 2. Bảng Danh Sách Quản Lý Phản Ánh */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Danh sách phản ánh: <span className="text-sky-600 font-extrabold">{filteredComplaints.length}</span> kết quả
          </div>
          <span className="text-[11px] text-slate-400">
            F16: Quản lý danh sách & xem chi tiết
          </span>
        </div>

        {filteredComplaints.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Không tìm thấy phản ánh khiếu nại nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Mã khiếu nại</th>
                  <th className="px-4 py-3">Hành khách</th>
                  <th className="px-4 py-3">Tuyến</th>
                  <th className="px-4 py-3">Phân loại</th>
                  <th className="px-4 py-3">Tiêu đề phản ánh</th>
                  <th className="px-4 py-3">Ngày xảy ra</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {filteredComplaints.map((c) => {
                  const routeObj = routes.find((r) => r.id === c.routeId);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#1a2b53]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">{c.passengerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.passengerPhone}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {routeObj?.code || c.routeId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          {getCategoryLabel(c.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium max-w-xs truncate" title={c.subject}>
                        {c.subject}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {c.tripDate}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(c.status)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút Xem chi tiết (F16) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 transition-colors"
                            title="Xem chi tiết nội dung khiếu nại"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>

                          {/* Nút Xử lý (kết nối F17) */}
                          {onOpenProcess && (
                            <button
                              type="button"
                              onClick={() => onOpenProcess(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="Chuyển sang chức năng xử lý (F17)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Xử lý</span>
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

      {/* 3. Modal Xem Chi Tiết Khiếu Nại (F16) */}
      {isDetailOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-xl bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white border border-slate-200 dark:border-[#223561] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] bg-slate-50 dark:bg-[#0f172a]">
              <div className="flex items-center gap-3">
                <MessageSquareWarning className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-base font-bold">Chi Tiết Khiếu Nại (F16)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mã tiếp nhận: <span className="font-mono font-semibold">[{selectedComplaint.id}]</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold">{selectedComplaint.passengerName}</h4>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedComplaint.passengerPhone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedComplaint.passengerEmail}</span>
                  </div>
                </div>
                <div>{renderStatusBadge(selectedComplaint.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Tuyến buýt:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {routes.find((r) => r.id === selectedComplaint.routeId)?.code || selectedComplaint.routeId}
                  </div>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Phân loại:</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {getCategoryLabel(selectedComplaint.category)}
                  </div>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Ngày xảy ra:</span>
                  <div className="font-mono font-bold mt-0.5">{selectedComplaint.tripDate}</div>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Thời điểm gửi:</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">{selectedComplaint.createdAt}</div>
                </div>
                <div className="col-span-2 p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Tiêu đề:</span>
                  <div className="font-bold text-sm mt-0.5">{selectedComplaint.subject}</div>
                </div>
                <div className="col-span-2 p-4 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Nội dung chi tiết:</span>
                  <p className="mt-1 leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {selectedComplaint.description}
                  </p>
                </div>
                {selectedComplaint.adminResponse && (
                  <div className="col-span-2 p-4 rounded bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px]">
                      Phản hồi & Kết quả xử lý:
                    </span>
                    <p className="mt-1 leading-relaxed text-slate-800 dark:text-slate-200">
                      {selectedComplaint.adminResponse}
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Cán bộ: {selectedComplaint.processedBy} • {selectedComplaint.processedAt}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Đóng
                </button>
                {onOpenProcess && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailOpen(false);
                      onOpenProcess(selectedComplaint);
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Chuyển sang xử lý (F17)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
