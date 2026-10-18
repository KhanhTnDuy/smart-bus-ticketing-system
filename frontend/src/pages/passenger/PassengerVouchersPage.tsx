import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TicketPercent,
  Search,
  Filter,
  Copy,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  Gift,
  Tag,
  AlertCircle,
  Percent,
  Sparkles,
  Zap,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { voucherApi } from '../../api/voucherApi';
import { useToast } from '../../context/ToastContext';
import { Voucher } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

const isPercent = (type?: string) => type?.toLowerCase() === 'percent';
const isFixed = (type?: string) => type?.toLowerCase() === 'fixed';

const formatVnDate = (isoString?: string) => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return isoString.split('T')[0] || isoString;
  }
};

const formatVnDateTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const PassengerVouchersPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // Remote data state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PERCENT' | 'FIXED'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Detail Modal state
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await voucherApi.getAvailableVouchers();
      setVouchers(data || []);
    } catch (err: any) {
      const msg = err?.message || 'Không thể kết nối đến máy chủ lấy danh sách voucher';
      setLoadError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  // Compute statistics
  const stats = useMemo(() => {
    const now = Date.now();
    const activeValid = vouchers.filter((v) => {
      const isExpired = new Date(v.endAt).getTime() < now;
      const isStarted = new Date(v.startAt).getTime() <= now;
      const hasQuota = !v.usageLimit || v.usedCount < v.usageLimit;
      const isActive = v.isActive ?? v.active ?? (v.status === 'ACTIVE');
      return isActive && isStarted && !isExpired && hasQuota;
    });

    const maxPercent = vouchers
      .filter((v) => (v.isActive ?? v.active ?? true) && isPercent(v.discountType))
      .reduce((max, v) => Math.max(max, v.discountValue || 0), 0);

    const maxFixed = vouchers
      .filter((v) => (v.isActive ?? v.active ?? true) && isFixed(v.discountType))
      .reduce((max, v) => Math.max(max, v.discountValue || 0), 0);

    return {
      activeCount: activeValid.length,
      maxPercent,
      maxFixed,
    };
  }, [vouchers]);

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        filterType === 'ALL' ||
        (filterType === 'PERCENT' && isPercent(v.discountType)) ||
        (filterType === 'FIXED' && isFixed(v.discountType));

      return matchSearch && matchType;
    });
  }, [vouchers, searchTerm, filterType]);

  const handleCopy = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    success(`Đã sao chép mã ưu đãi [${code}]!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleUseNow = (code: string) => {
    navigate(`/passenger/booking?voucher=${encodeURIComponent(code)}`);
  };

  const handleViewDetails = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ưu Đãi & Mã Giảm Giá"
        description="Khám phá các chương trình trợ giá, mã khuyến mãi và chiến dịch kích cầu xe buýt thông minh đô thị."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchVouchers}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => navigate('/passenger/booking')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-institutional-700 hover:bg-institutional-800 rounded-lg shadow-sm transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Đặt vé ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-institutional-800 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-blue-200 tracking-wider">
              Mã Đang Khả Dụng
            </p>
            <p className="text-3xl font-black mt-1">
              {stats.activeCount}
            </p>
            <p className="text-[11px] text-blue-100 mt-1">
              Áp dụng trực tiếp khi thanh toán
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
            <TicketPercent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-emerald-200 tracking-wider">
              Ưu Đãi % Cao Nhất
            </p>
            <p className="text-3xl font-black mt-1">
              -{stats.maxPercent}%
            </p>
            <p className="text-[11px] text-emerald-100 mt-1">
              Dành cho học sinh & chiến dịch xanh
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-700 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-amber-100 tracking-wider">
              Trợ Giá Tiền Mặt Tới
            </p>
            <p className="text-3xl font-black mt-1">
              -{stats.maxFixed.toLocaleString('vi-VN')} đ
            </p>
            <p className="text-[11px] text-amber-100 mt-1">
              Trừ ngay vào tiền vé mỗi lượt
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã voucher hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'ALL'
                  ? 'bg-institutional-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PERCENT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'PERCENT'
                  ? 'bg-institutional-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Giảm phần trăm (%)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('FIXED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterType === 'FIXED'
                  ? 'bg-institutional-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Giảm tiền mặt (VNĐ)
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#131e3a] rounded-2xl border border-slate-200 dark:border-[#1e2f57] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500">Đang tải danh sách voucher từ hệ thống...</p>
        </div>
      ) : loadError ? (
        <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-rose-600" />
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{loadError}</p>
          <button
            onClick={fetchVouchers}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy voucher phù hợp"
          description="Thử tìm kiếm với từ khóa khác hoặc quay lại danh mục tất cả voucher."
          actionLabel="Đặt lại bộ lọc"
          onAction={() => {
            setSearchTerm('');
            setFilterType('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVouchers.map((v) => {
            const now = Date.now();
            const isExpired = new Date(v.endAt).getTime() < now;
            const isNotStarted = new Date(v.startAt).getTime() > now;
            const isOutOfStock = v.usageLimit ? v.usedCount >= v.usageLimit : false;
            const isActive = v.isActive ?? v.active ?? (v.status === 'ACTIVE');
            const isUsable = isActive && !isExpired && !isNotStarted && !isOutOfStock;

            const usagePercent = v.usageLimit
              ? Math.min(100, Math.round((v.usedCount / v.usageLimit) * 100))
              : 0;

            const isPct = isPercent(v.discountType);

            return (
              <div
                key={v.id}
                className={`relative bg-white dark:bg-[#131e3a] rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  isUsable
                    ? 'border-slate-200 dark:border-[#1e2f57] hover:border-amber-400 dark:hover:border-amber-500 shadow-sm hover:shadow-md'
                    : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-[#0c162d]'
                }`}
              >
                {/* Top Ticket Header Banner */}
                <div
                  className={`px-5 py-4 border-b flex items-center justify-between ${
                    isPct
                      ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-100 dark:border-blue-900/40'
                      : 'bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-100 dark:border-amber-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                        isPct
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {isPct ? '%' : 'VNĐ'}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {isPct ? 'Giảm theo tỷ lệ' : 'Trợ giá trực tiếp'}
                      </div>
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {isPct
                          ? `Giảm ${v.discountValue}%`
                          : `Giảm ${v.discountValue.toLocaleString('vi-VN')} đ`}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {!isActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Tạm ngưng
                      </span>
                    ) : isExpired ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                        Đã hết hạn
                      </span>
                    ) : isOutOfStock ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300">
                        Hết lượt
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Khả dụng
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Voucher Code Box */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono font-black text-sm tracking-wide text-slate-900 dark:text-white">
                          {v.code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(v.code, e)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-semibold transition-all ${
                          copiedCode === v.code
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Sao chép mã"
                      >
                        {copiedCode === v.code ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {v.description || 'Ưu đãi chuyến đi xe buýt thông minh đô thị'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Đơn tối thiểu:</span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        {(v.minOrder ?? 0) > 0 ? `${(v.minOrder ?? 0).toLocaleString('vi-VN')} đ` : 'Không yêu cầu'}
                      </strong>
                    </div>

                    {isPct && (v.maxDiscount ?? 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span>Giảm tối đa:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {(v.maxDiscount ?? 0).toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span>Hiệu lực đến:</span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        {formatVnDate(v.endAt)}
                      </strong>
                    </div>

                    {v.usageLimit ? (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Lượt dùng hệ thống:</span>
                          <span>
                            {v.usedCount} / {v.usageLimit} ({usagePercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
                          <div
                            className={`h-1 rounded-full ${
                              usagePercent >= 90
                                ? 'bg-rose-500'
                                : usagePercent >= 60
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/60 dark:bg-[#0c162d]/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewDetails(v)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Điều kiện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUseNow(v.code)}
                    disabled={!isUsable}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-institutional-700 hover:bg-institutional-800 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <span>Dùng ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details & Terms Modal */}
      {selectedVoucher && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Điều Kiện Sử Dụng Mã [${selectedVoucher.code}]`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1.5">
              <span className="font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
                {selectedVoucher.code}
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                {selectedVoucher.description || 'Ưu đãi chuyến đi xe buýt thông minh đô thị'}
              </p>
            </div>

            <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Hình thức ưu đãi:</span>
                <span className="font-bold">
                  {isPercent(selectedVoucher.discountType)
                    ? `Giảm ${selectedVoucher.discountValue}%`
                    : `Giảm ${selectedVoucher.discountValue.toLocaleString('vi-VN')} VNĐ`}
                </span>
              </div>

              {isPercent(selectedVoucher.discountType) && (selectedVoucher.maxDiscount ?? 0) > 0 && (
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Mức giảm tối đa:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {(selectedVoucher.maxDiscount ?? 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Giá trị đơn vé tối thiểu:</span>
                <span className="font-bold">
                  {(selectedVoucher.minOrder ?? 0) > 0
                    ? `${(selectedVoucher.minOrder ?? 0).toLocaleString('vi-VN')} VNĐ`
                    : 'Không yêu cầu đơn tối thiểu'}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Thời gian bắt đầu:</span>
                <span className="font-mono">{formatVnDateTime(selectedVoucher.startAt)}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Hạn chót áp dụng:</span>
                <span className="font-mono">{formatVnDateTime(selectedVoucher.endAt)}</span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Giới hạn lượt sử dụng:</span>
                <span>
                  {selectedVoucher.usageLimit
                    ? `${selectedVoucher.usedCount} / ${selectedVoucher.usageLimit} lượt`
                    : 'Không giới hạn số lượt'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              * Lưu ý: Mỗi mã ưu đãi chỉ áp dụng được cho 01 giao dịch thanh toán vé. Trường hợp hủy vé, giá trị voucher đã áp dụng sẽ không được quy đổi thành tiền mặt hoàn lại.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleCopy(selectedVoucher.code);
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
              >
                Sao chép mã
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleUseNow(selectedVoucher.code);
                }}
                className="px-4 py-2 rounded-lg bg-institutional-700 hover:bg-institutional-800 text-white font-bold"
              >
                Dùng mã đặt vé ngay
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
