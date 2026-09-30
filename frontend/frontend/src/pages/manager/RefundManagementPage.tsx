import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Clock,
  FileText,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { RefundRequest, RefundStatus } from '../../types';

export const RefundManagementPage: React.FC = () => {
  const { refunds, processRefund, tickets } = useData();
  const { success, error } = useToast();
  const showSuccess = success;
  const showError = error;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Modal
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Process Modal
  const [processingRefund, setProcessingRefund] = useState<RefundRequest | null>(null);
  const [newStatus, setNewStatus] = useState<RefundStatus>('APPROVED');
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const getRefundCode = (r: RefundRequest) => r.refundCode || r.id;
  const getTicketCode = (r: RefundRequest) => r.ticketCode || r.ticketId;
  const getAccountHolder = (r: RefundRequest) => r.accountHolder || r.passengerName;
  const getAccountNumber = (r: RefundRequest) => r.accountNumber || '1029384756';
  const getBankName = (r: RefundRequest) => r.bankName || 'Vietcombank Chi Nhánh TP.HCM';
  const getRefundStatus = (r: RefundRequest) => r.refundStatus || r.status || 'PROCESSING';
  const getRefundReason = (r: RefundRequest) => r.refundReason || r.reason || 'Yêu cầu hoàn cước vé xe buýt';

  const filteredRefunds = useMemo(() => {
    return refunds.filter((ref) => {
      const code = getRefundCode(ref);
      const ticket = getTicketCode(ref);
      const holder = getAccountHolder(ref);
      const accNum = getAccountNumber(ref);
      const bank = getBankName(ref);
      const stat = getRefundStatus(ref);

      const matchesSearch =
        code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.toLowerCase().includes(searchTerm.toLowerCase()) ||
        holder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accNum.includes(searchTerm) ||
        bank.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || stat === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [refunds, searchTerm, statusFilter]);

  const handleOpenDetail = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setIsDetailModalOpen(true);
  };

  const handleOpenProcess = (refund: RefundRequest) => {
    setProcessingRefund(refund);
    const currStat = getRefundStatus(refund);
    setNewStatus(currStat === 'PROCESSING' || currStat === 'PENDING' ? 'APPROVED' : currStat);
    setAdminNote(refund.adminNote || '');
    setIsProcessModalOpen(true);
  };

  const handleSubmitProcess = async () => {
    if (!processingRefund) return;

    setIsSubmitting(true);
    try {
      const ok = await processRefund(processingRefund.id, newStatus, adminNote);
      if (ok) {
        showSuccess(
          `Đã cập nhật trạng thái yêu cầu hoàn tiền ${getRefundCode(processingRefund)} thành công!`
        );
        setIsProcessModalOpen(false);
        setProcessingRefund(null);
      }
    } catch {
      showError('Không thể xử lý hoàn tiền vào lúc này');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản Lý Yêu Cầu Hoàn Tiền"
        subtitle="Xét duyệt hồ sơ hủy vé và thực hiện chuyển tiền hoàn cước cho hành khách theo chính sách vận tải đô thị"
        icon={<RotateCcw className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành & Quản lý' },
          { label: 'Yêu cầu hoàn tiền' },
        ]}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Chờ giải quyết (Processing)</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {refunds.filter((r) => getRefundStatus(r) === 'PROCESSING' || getRefundStatus(r) === 'PENDING').length} hồ sơ
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đã phê duyệt hoàn trả</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {refunds.filter((r) => getRefundStatus(r) === 'APPROVED' || getRefundStatus(r) === 'REFUNDED').length} hồ sơ
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Từ chối hoàn trả</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
            {refunds.filter((r) => getRefundStatus(r) === 'REJECTED').length} hồ sơ
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã hoàn tiền (REF-...), mã vé, tên chủ TK, số tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PROCESSING">Chờ xử lý</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      {filteredRefunds.length === 0 ? (
        <EmptyState
          title="Không tìm thấy yêu cầu hoàn tiền"
          description="Không có bản ghi yêu cầu hoàn tiền nào phù hợp với bộ lọc."
          icon={<RotateCcw className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã hoàn tiền</th>
                  <th className="py-3 px-4">Mã vé</th>
                  <th className="py-3 px-4">Số tiền hoàn</th>
                  <th className="py-3 px-4">Lý do hủy</th>
                  <th className="py-3 px-4">Tài khoản thụ hưởng</th>
                  <th className="py-3 px-4">Thời gian gửi</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRefunds.map((ref) => {
                  const rCode = getRefundCode(ref);
                  const tCode = getTicketCode(ref);
                  const holder = getAccountHolder(ref);
                  const accNum = getAccountNumber(ref);
                  const bank = getBankName(ref);
                  const stat = getRefundStatus(ref);
                  const rsn = getRefundReason(ref);

                  return (
                    <tr
                      key={ref.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300 whitespace-nowrap">
                        {rCode}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {tCode}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {ref.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300" title={rsn}>
                        {rsn}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {holder}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {bank} - {accNum}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {ref.requestDate || ref.createdAt || 'Hôm nay'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="refundStatus" value={stat} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(ref)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-institutional-700 dark:text-sky-300 font-semibold rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                            title="Xem chi tiết hồ sơ hoàn tiền"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenProcess(ref)}
                            className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold rounded text-xs hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                            title="Xét duyệt hoặc từ chối hoàn tiền"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedRefund && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`CHI TIẾT HỒ SƠ HOÀN TIỀN — ${getRefundCode(selectedRefund)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-[#0c162d] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
              <div className="text-slate-400">Số tiền đề nghị hoàn trả</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {selectedRefund.amount.toLocaleString('vi-VN')} VNĐ
              </div>
              <div className="flex justify-center pt-1">
                <Badge variant="refundStatus" value={getRefundStatus(selectedRefund)} />
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Mã yêu cầu:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {getRefundCode(selectedRefund)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Mã vé liên kết:</span>
                <span className="font-mono font-bold text-institutional-600 dark:text-sky-400">
                  {getTicketCode(selectedRefund)}
                </span>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-0.5">Lý do khách hủy vé:</span>
                <p className="font-medium text-slate-900 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                  {getRefundReason(selectedRefund)}
                </p>
              </div>
              <div className="py-2 space-y-1">
                <span className="text-slate-500 block">Thông tin tài khoản nhận tiền:</span>
                <div className="p-2.5 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-0.5">
                  <div>Ngân hàng: <strong>{getBankName(selectedRefund)}</strong></div>
                  <div>Số tài khoản: <strong className="font-mono text-institutional-600 dark:text-sky-400">{getAccountNumber(selectedRefund)}</strong></div>
                  <div>Chủ tài khoản: <strong>{getAccountHolder(selectedRefund)}</strong></div>
                </div>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Thời gian khởi tạo:</span>
                <span className="text-slate-900 dark:text-white">
                  {selectedRefund.requestDate || selectedRefund.createdAt || 'Hôm nay'}
                </span>
              </div>
              {selectedRefund.adminNote && (
                <div className="py-2">
                  <span className="text-slate-500 block mb-0.5">Ghi chú của bộ phận giải quyết:</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-900">
                    {selectedRefund.adminNote}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenProcess(selectedRefund);
                }}
                className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Xử lý hồ sơ này
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PROCESS REFUND MODAL */}
      {processingRefund && (
        <Modal
          isOpen={isProcessModalOpen}
          onClose={() => setIsProcessModalOpen(false)}
          title={`XÉT DUYỆT HOÀN TIỀN — ${getRefundCode(processingRefund)}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-[#0c162d] rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {getAccountHolder(processingRefund)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền hoàn cước:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {processingRefund.amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Status selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Kết quả phê duyệt: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewStatus('REFUNDED')}
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    newStatus === 'REFUNDED' || newStatus === 'APPROVED'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Đã Hoàn Tiền</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewStatus('REJECTED')}
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    newStatus === 'REJECTED'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 ring-2 ring-red-500'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Từ Chối Hoàn</span>
                </button>
              </div>
            </div>

            {/* Admin note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Ghi chú phê duyệt / Mã tham chiếu ngân hàng:
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Đã chuyển khoản qua Vietcombank số GD VCB-998811 lúc 14:00..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsProcessModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitProcess}
                disabled={isSubmitting}
                className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận xử lý'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
