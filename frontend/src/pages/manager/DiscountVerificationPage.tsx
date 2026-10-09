import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Filter,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Clock,
  IdCard,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PassengerVerification, VerificationStatus, DiscountBeneficiaryType } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const DiscountVerificationPage: React.FC = () => {
  const { verifications, approveVerification, rejectVerification } = useData();
  const { success, error } = useToast();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [selectedItem, setSelectedItem] = useState<PassengerVerification | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form states
  const defaultValidUntil = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [validUntilDate, setValidUntilDate] = useState(defaultValidUntil);
  const [rejectReasonText, setRejectReasonText] = useState('');

  // Statistics
  const stats = useMemo(() => {
    const total = verifications.length;
    const pending = verifications.filter((v) => v.status === 'PENDING').length;
    const approved = verifications.filter((v) => v.status === 'APPROVED').length;
    const rejected = verifications.filter((v) => v.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [verifications]);

  // Filtered List
  const filteredList = useMemo(() => {
    return verifications.filter((item) => {
      const matchSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.passengerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.passengerPhone.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchType = typeFilter === 'ALL' || item.beneficiaryType === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [verifications, searchTerm, statusFilter, typeFilter]);

  // Handlers
  const handleOpenApprove = (item: PassengerVerification) => {
    setSelectedItem(item);
    setValidUntilDate(item.validUntil || defaultValidUntil);
    setIsApproveModalOpen(true);
  };

  const handleOpenReject = (item: PassengerVerification) => {
    setSelectedItem(item);
    setRejectReasonText('');
    setIsRejectModalOpen(true);
  };

  const handleOpenView = (item: PassengerVerification) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const res = approveVerification(selectedItem.id, validUntilDate);
    if (res.success) {
      success(`Đã phê duyệt hồ sơ ưu đãi của ${selectedItem.passengerName}!`);
      setIsApproveModalOpen(false);
      setSelectedItem(null);
    } else {
      error(res.message || 'Không thể phê duyệt hồ sơ.');
    }
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (!rejectReasonText.trim()) {
      error('Vui lòng nhập lý do từ chối hồ sơ.');
      return;
    }

    const res = rejectVerification(selectedItem.id, rejectReasonText.trim());
    if (res.success) {
      success(`Đã từ chối hồ sơ của ${selectedItem.passengerName}.`);
      setIsRejectModalOpen(false);
      setSelectedItem(null);
    } else {
      error(res.message || 'Không thể từ chối hồ sơ.');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xét duyệt hồ sơ đối tượng ưu đãi"
        description="Kiểm tra thông tin thẻ HSSV, CCCD người cao tuổi và các giấy tờ minh chứng để kích hoạt chính sách miễn giảm giá vé."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng số hồ sơ
            </p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
              {stats.total}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <IdCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Chờ phê duyệt
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {stats.pending}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Đã phê duyệt
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.approved}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Từ chối duyệt
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {stats.rejected}
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT, mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả đối tượng</option>
            <option value="STUDENT">Học sinh / Sinh viên</option>
            <option value="ELDERLY">Người cao tuổi (≥60)</option>
            <option value="DISABILITY">Người khuyết tật</option>
            <option value="WORKER">Công nhân KCN</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <EmptyState
            title="Không tìm thấy hồ sơ ưu đãi"
            description="Không có dữ liệu phù hợp với điều kiện tìm kiếm hoặc bộ lọc hiện tại."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-4">Mã hồ sơ</th>
                  <th className="px-5 py-4">Hành khách</th>
                  <th className="px-5 py-4">Đối tượng</th>
                  <th className="px-5 py-4">Mức giảm</th>
                  <th className="px-5 py-4">Giấy tờ minh chứng</th>
                  <th className="px-5 py-4">Thời gian nộp</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredList.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-medium text-slate-900 dark:text-white">
                      {item.id}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.passengerName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.passengerPhone} • {item.passengerEmail}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="beneficiaryType" value={item.beneficiaryType} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {item.discountPercent}%
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => {
                          setLightboxImage(item.documentUrl);
                        }}
                        className="group flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <div className="w-10 h-7 rounded border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0">
                          <img
                            src={item.documentUrl}
                            alt="Minh chứng"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <span className="truncate max-w-[120px]">
                          {item.documentName || 'Xem ảnh'}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {item.submittedAt}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="verificationStatus" value={item.status} />
                      {item.validUntil && item.status === 'APPROVED' && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                          Hạn: {item.validUntil}
                        </div>
                      )}
                      {item.rejectReason && item.status === 'REJECTED' && (
                        <div className="text-[11px] text-rose-500 dark:text-rose-400 mt-1 truncate max-w-[140px]" title={item.rejectReason}>
                          Lý do: {item.rejectReason}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenView(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                          title="Chi tiết hồ sơ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenApprove(item)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                              title="Phê duyệt"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenReject(item)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center text-white px-2 py-1 mb-2">
              <span className="text-sm font-medium">Giấy tờ minh chứng đính kèm</span>
              <div className="flex items-center gap-3">
                <a
                  href={lightboxImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Mở ảnh gốc
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold px-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <img
              src={lightboxImage}
              alt="Giấy tờ minh chứng"
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedItem(null);
        }}
        title="Chi tiết hồ sơ đối tượng ưu đãi"
      >
        {selectedItem && (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500 uppercase">Mã hồ sơ</span>
                <p className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedItem.id}
                </p>
              </div>
              <Badge variant="verificationStatus" value={selectedItem.status} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Họ và tên</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedItem.passengerName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Đối tượng ưu đãi</p>
                <Badge variant="beneficiaryType" value={selectedItem.beneficiaryType} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Số điện thoại</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedItem.passengerPhone}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedItem.passengerEmail}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Mức giảm được hưởng</p>
                <p className="font-bold text-blue-600 dark:text-blue-400">
                  {selectedItem.discountPercent}% giá vé gốc
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Thời gian gửi hồ sơ</p>
                <p className="text-slate-700 dark:text-slate-300">
                  {selectedItem.submittedAt}
                </p>
              </div>
            </div>

            {selectedItem.notes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-medium text-slate-500 mb-1">Ghi chú từ hành khách:</p>
                <p className="text-slate-700 dark:text-slate-300 text-xs">
                  {selectedItem.notes}
                </p>
              </div>
            )}

            {/* Document preview */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Giấy tờ minh chứng đính kèm:</p>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src={selectedItem.documentUrl}
                  alt="Minh chứng đính kèm"
                  className="w-full max-h-64 object-contain cursor-pointer hover:opacity-95"
                  onClick={() => setLightboxImage(selectedItem.documentUrl)}
                />
              </div>
              <p className="text-xs text-center text-slate-400 mt-1">
                Nhấp vào ảnh để xem kích thước lớn
              </p>
            </div>

            {selectedItem.status === 'APPROVED' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Hồ sơ đã được phê duyệt
                </p>
                <p>Người duyệt: {selectedItem.reviewedBy || 'Quản trị viên'}</p>
                <p>Thời gian duyệt: {selectedItem.reviewedAt}</p>
                <p className="font-medium">Hiệu lực ưu đãi đến: {selectedItem.validUntil || 'Không thời hạn'}</p>
              </div>
            )}

            {selectedItem.status === 'REJECTED' && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Hồ sơ đã bị từ chối
                </p>
                <p>Người duyệt: {selectedItem.reviewedBy || 'Quản trị viên'}</p>
                <p>Thời gian xử lý: {selectedItem.reviewedAt}</p>
                <p className="font-semibold text-rose-700 dark:text-rose-400">
                  Lý do từ chối: {selectedItem.rejectReason}
                </p>
              </div>
            )}

            {selectedItem.status === 'PENDING' && (
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenReject(selectedItem);
                  }}
                  className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenApprove(selectedItem);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Phê duyệt hồ sơ
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setSelectedItem(null);
        }}
        title="Xác nhận phê duyệt hồ sơ ưu đãi"
      >
        {selectedItem && (
          <form onSubmit={handleApproveSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold mb-1">
                Phê duyệt ưu đãi giảm giá {selectedItem.discountPercent}% cho hành khách {selectedItem.passengerName}
              </p>
              <p>
                Sau khi duyệt, tài khoản hành khách sẽ được áp dụng trực tiếp chính sách giảm giá vé khi đặt xe trên toàn hệ thống.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày hết hạn ưu đãi (Valid Until) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Mặc định ưu đãi có giá trị trong 01 năm kể từ ngày xét duyệt.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận phê duyệt
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedItem(null);
        }}
        title="Từ chối hồ sơ đối tượng ưu đãi"
      >
        {selectedItem && (
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold mb-1">
                Từ chối hồ sơ của hành khách {selectedItem.passengerName}
              </p>
              <p>
                Hành khách sẽ nhận được thông báo lý do từ chối để cập nhật lại minh chứng hợp lệ.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Ví dụ: Ảnh thẻ HSSV bị mờ, đã hết hạn hiệu lực học kỳ hoặc thông tin không trùng khớp với CCCD..."
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                Xác nhận từ chối
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
