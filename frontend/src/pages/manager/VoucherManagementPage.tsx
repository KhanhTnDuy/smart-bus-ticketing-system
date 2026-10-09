import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TicketPercent,
  Plus,
  Search,
  RotateCcw,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Copy,
  Clock,
  Check,
  XCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import {
  Voucher,
  VoucherRequest,
  VoucherDiscountType,
  VoucherStatus,
  ValidateVoucherResult,
  CheckVoucherCodeResult,
} from '../../types';
import { voucherApi } from '../../api/voucherApi';
import { ApiError } from '../../api/client';

export const VoucherManagementPage: React.FC = () => {
  const { success, error, warning, info } = useToast();

  // Danh sách voucher
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Bộ lọc & tìm kiếm
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal Thêm / Sửa (SCRUM-66)
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [deleteConfirmVoucher, setDeleteConfirmVoucher] = useState<Voucher | null>(null);

  // Form input state
  const getNowLocalDateTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const getFutureLocalDateTime = (days = 30) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const initialFormState = {
    code: '',
    discountType: 'Percent' as VoucherDiscountType,
    discountValue: 20,
    startAt: getNowLocalDateTime(),
    endAt: getFutureLocalDateTime(30),
    usageLimit: 100,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // SCRUM-67: Chặn trùng mã - kiểm tra thời gian thực
  const [codeCheckStatus, setCodeCheckStatus] = useState<CheckVoucherCodeResult | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState<boolean>(false);

  // SCRUM-67: Modal Kiểm tra voucher
  const [isTesterModalOpen, setIsTesterModalOpen] = useState<boolean>(false);
  const [testCode, setTestCode] = useState<string>('');
  const [testOrderAmount, setTestOrderAmount] = useState<number>(30000);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ValidateVoucherResult | null>(null);

  // Copy mã vào clipboard
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 1. Tải danh sách voucher
  const loadVouchers = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await voucherApi.getVouchers();
      setVouchers(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách voucher';
      setErrorMsg(msg);
      // Fallback dữ liệu mẫu nếu API đang ngắt kết nối
      setVouchers((prev) =>
        prev.length > 0
          ? prev
          : [
              {
                id: 1,
                code: 'HE2026',
                discountType: 'Percent',
                discountValue: 20,
                startAt: new Date(Date.now() - 7 * 86400000).toISOString(),
                endAt: new Date(Date.now() + 30 * 86400000).toISOString(),
                usageLimit: 100,
                usedCount: 15,
                remainingCount: 85,
                isActive: true,
                status: 'ACTIVE',
              },
              {
                id: 2,
                code: 'CHAOHEXANH',
                discountType: 'Fixed',
                discountValue: 10000,
                startAt: new Date(Date.now() - 5 * 86400000).toISOString(),
                endAt: new Date(Date.now() + 45 * 86400000).toISOString(),
                usageLimit: 50,
                usedCount: 22,
                remainingCount: 28,
                isActive: true,
                status: 'ACTIVE',
              },
              {
                id: 3,
                code: 'HETHAN2025',
                discountType: 'Percent',
                discountValue: 15,
                startAt: new Date(Date.now() - 60 * 86400000).toISOString(),
                endAt: new Date(Date.now() - 5 * 86400000).toISOString(),
                usageLimit: 200,
                usedCount: 40,
                remainingCount: 160,
                isActive: false,
                status: 'EXPIRED',
              },
              {
                id: 4,
                code: 'HETLUOT',
                discountType: 'Percent',
                discountValue: 50,
                startAt: new Date(Date.now() - 10 * 86400000).toISOString(),
                endAt: new Date(Date.now() + 20 * 86400000).toISOString(),
                usageLimit: 1,
                usedCount: 1,
                remainingCount: 0,
                isActive: false,
                status: 'OUT_OF_STOCK',
              },
              {
                id: 5,
                code: 'VIPKHACHHANG',
                discountType: 'Fixed',
                discountValue: 25000,
                startAt: new Date(Date.now() + 3 * 86400000).toISOString(),
                endAt: new Date(Date.now() + 30 * 86400000).toISOString(),
                usageLimit: 500,
                usedCount: 0,
                remainingCount: 500,
                isActive: false,
                status: 'UPCOMING',
              },
            ]
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // SCRUM-67: Kiểm tra trùng mã khi đang nhập
  useEffect(() => {
    const trimmed = formData.code.trim();
    if (!trimmed || trimmed.length < 3) {
      setCodeCheckStatus(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingCode(true);
      try {
        const res = await voucherApi.checkCode(trimmed, editingVoucher ? editingVoucher.id : undefined);
        setCodeCheckStatus(res);
      } catch {
        // Bỏ qua lỗi mạng khi đang kiểm tra
      } finally {
        setIsCheckingCode(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.code, editingVoucher]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = vouchers.length;
    const active = vouchers.filter((v) => v.status === 'ACTIVE').length;
    const upcoming = vouchers.filter((v) => v.status === 'UPCOMING').length;
    const expired = vouchers.filter((v) => v.status === 'EXPIRED').length;
    const outOfStock = vouchers.filter((v) => v.status === 'OUT_OF_STOCK').length;
    const totalUsed = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);
    return { total, active, upcoming, expired, outOfStock, totalUsed };
  }, [vouchers]);

  // Danh sách đã lọc
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        v.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus =
        statusFilter === 'ALL' || v.status === statusFilter;
      const matchType =
        typeFilter === 'ALL' || v.discountType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [vouchers, searchTerm, statusFilter, typeFilter]);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setEditingVoucher(null);
    setFormData(initialFormState);
    setCodeCheckStatus(null);
    setIsFormModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (v: Voucher) => {
    setEditingVoucher(v);
    const toLocalIso = (isoStr: string) => {
      try {
        const d = new Date(isoStr);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      } catch {
        return getNowLocalDateTime();
      }
    };

    setFormData({
      code: v.code,
      discountType: v.discountType,
      discountValue: v.discountValue,
      startAt: toLocalIso(v.startAt),
      endAt: toLocalIso(v.endAt),
      usageLimit: v.usageLimit,
    });
    setCodeCheckStatus(null);
    setIsFormModalOpen(true);
  };

  // Lưu voucher (Tạo hoặc Sửa - SCRUM-66 & SCRUM-67)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      error('Vui lòng nhập mã voucher.');
      return;
    }

    if (new Date(formData.startAt) >= new Date(formData.endAt)) {
      error('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }

    if (formData.discountType === 'Percent' && (formData.discountValue <= 0 || formData.discountValue > 100)) {
      error('Mức giảm theo phần trăm phải từ 0.01% đến 100%.');
      return;
    }

    if (formData.discountType === 'Fixed' && formData.discountValue <= 0) {
      error('Mức giảm cố định phải lớn hơn 0 VNĐ.');
      return;
    }

    if (formData.usageLimit < 1) {
      error('Số lượt dùng tối đa phải từ 1 lượt trở lên.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: VoucherRequest = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        startAt: new Date(formData.startAt).toISOString(),
        endAt: new Date(formData.endAt).toISOString(),
        usageLimit: Number(formData.usageLimit),
      };

      if (editingVoucher) {
        await voucherApi.updateVoucher(editingVoucher.id, payload);
        success(`Cập nhật voucher '${payload.code}' thành công!`);
      } else {
        await voucherApi.createVoucher(payload);
        success(`Tạo mã voucher '${payload.code}' mới thành công!`);
      }

      setIsFormModalOpen(false);
      await loadVouchers();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        error(err.message || `Mã voucher '${formData.code}' đã tồn tại trong hệ thống.`);
      } else {
        error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu voucher');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  // Xóa voucher (SCRUM-66)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmVoucher) return;
    try {
      await voucherApi.deleteVoucher(deleteConfirmVoucher.id);
      success(`Đã xóa voucher '${deleteConfirmVoucher.code}'.`);
      setDeleteConfirmVoucher(null);
      await loadVouchers();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Không thể xóa voucher');
    }
  };

  // Mở công cụ kiểm tra (SCRUM-67)
  const handleOpenTester = (prefillCode?: string) => {
    if (prefillCode) {
      setTestCode(prefillCode);
    }
    setTestResult(null);
    setIsTesterModalOpen(true);
  };

  // Thực hiện kiểm tra voucher (SCRUM-67)
  const handleRunValidation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testCode.trim()) {
      warning('Vui lòng nhập mã voucher cần kiểm tra.');
      return;
    }

    setIsTesting(true);
    try {
      const res = await voucherApi.validateVoucher(testCode.trim(), Number(testOrderAmount) || 0);
      setTestResult(res);
      if (res.isValid) {
        success(res.message);
      } else {
        warning(res.message);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Lỗi khi kiểm tra voucher');
    } finally {
      setIsTesting(false);
    }
  };

  // Copy code vào clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    info(`Đã sao chép mã '${code}' vào clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Format ngày giờ Việt Nam
  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Hiển thị badge trạng thái
  const renderStatusBadge = (status: VoucherStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đang hiệu lực
          </span>
        );
      case 'UPCOMING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <Clock className="w-3.5 h-3.5" /> Sắp diễn ra
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3.5 h-3.5" /> Đã hết hạn
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Hết lượt dùng
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1329] p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header trang */}
        <PageHeader
          title="Quản lý mã giảm giá (Vouchers)"
          subtitle="SCRUM-66 & SCRUM-67: Thiết lập, quản lý danh sách và kiểm tra điều kiện áp dụng mã giảm giá marketing"
          icon={<TicketPercent className="w-6 h-6 text-blue-600 dark:text-sky-400" />}
          breadcrumbs={[
            { label: 'Hệ thống', href: '/dashboard' },
            { label: 'Quản lý vận hành', href: '/dashboard' },
            { label: 'Mã giảm giá' },
          ]}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenTester()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
                title="Kiểm tra hạn dùng và số lượt còn lại (SCRUM-67)"
              >
                <ShieldCheck className="w-4 h-4" />
                Kiểm tra voucher (SCRUM-67)
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tạo voucher mới
              </button>
            </div>
          }
        />

        {/* Các thẻ chỉ số thống kê */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#223561] shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span>Tổng voucher</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">Chiến dịch đã tạo</div>
          </div>

          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-gradient-to-br from-emerald-50/50 dark:from-emerald-950/20 to-transparent">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-1">
              <span>Đang hiệu lực</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Khách áp dụng được</div>
          </div>

          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 shadow-sm">
            <div className="flex items-center justify-between text-sky-700 dark:text-sky-400 text-xs font-medium mb-1">
              <span>Sắp diễn ra</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.upcoming}</div>
            <div className="text-[11px] text-sky-600/80 dark:text-sky-400/80 mt-1">Chưa tới ngày áp dụng</div>
          </div>

          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#223561] shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
              <span>Đã hết hạn</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.expired}</div>
            <div className="text-[11px] text-slate-500 mt-1">Quá ngày kết thúc</div>
          </div>

          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm bg-gradient-to-br from-rose-50/40 dark:from-rose-950/20 to-transparent">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-medium mb-1">
              <span>Hết lượt dùng</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.outOfStock}</div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">Đã dùng hết quota</div>
          </div>

          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm bg-gradient-to-br from-blue-50/50 dark:from-blue-950/20 to-transparent">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs font-medium mb-1">
              <span>Lượt đã áp dụng</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-sky-400">{stats.totalUsed}</div>
            <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1">Vé đặt thành công</div>
          </div>
        </div>

        {/* Thanh công cụ tìm kiếm & lọc */}
        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#223561] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            {/* Ô tìm kiếm */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã voucher (VD: HE2026, CHAOHEXANH)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-[#223561] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-[#223561] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="UPCOMING">Sắp diễn ra</option>
                <option value="EXPIRED">Đã hết hạn</option>
                <option value="OUT_OF_STOCK">Hết lượt dùng</option>
              </select>
            </div>

            {/* Bộ lọc loại giảm */}
            <div className="w-full sm:w-44">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-[#223561] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả hình thức</option>
                <option value="Percent">Giảm phần trăm (%)</option>
                <option value="Fixed">Giảm số tiền cố định</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={loadVouchers}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 dark:border-[#223561] bg-slate-50 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Bảng danh sách Voucher (SCRUM-66 & SCRUM-67) */}
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#223561] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-16">
              <LoadingState message="Đang tải danh sách mã giảm giá..." />
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="Không tìm thấy voucher phù hợp"
                description={
                  searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                    ? 'Thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.'
                    : 'Chưa có mã giảm giá nào trong hệ thống. Hãy tạo mã voucher đầu tiên cho chiến dịch Marketing!'
                }
                action={
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo voucher ngay
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/75 dark:bg-[#0f172a] border-b border-slate-200 dark:border-[#223561] text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Mã Voucher</th>
                    <th className="py-3 px-4">Hình thức & Mức giảm</th>
                    <th className="py-3 px-4">Thời gian hiệu lực</th>
                    <th className="py-3 px-4">Tiến độ sử dụng (SCRUM-67)</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác (SCRUM-66)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#1e2f57]">
                  {filteredVouchers.map((v) => {
                    const percentUsed = Math.min(
                      100,
                      v.usageLimit > 0 ? Math.round((v.usedCount / v.usageLimit) * 100) : 0
                    );

                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                      >
                        {/* Cột Mã Voucher */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-700 dark:text-sky-400 bg-blue-50 dark:bg-[#0c162d] px-2.5 py-1 rounded border border-blue-200 dark:border-blue-900/60 text-sm">
                              {v.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(v.code)}
                              className="text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Sao chép mã"
                            >
                              {copiedCode === v.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Cột Mức giảm */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {v.discountType === 'Percent' ? (
                              <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                                <Percent className="w-4 h-4" />
                                <span>Giảm {v.discountValue}%</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                <DollarSign className="w-4 h-4" />
                                <span>Giảm {Number(v.discountValue).toLocaleString('vi-VN')} đ</span>
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {v.discountType === 'Percent' ? 'Giảm theo tỷ lệ phần trăm' : 'Giảm trực tiếp vào giá vé'}
                          </div>
                        </td>

                        {/* Cột Thời gian hiệu lực */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 text-[11px]">Từ:</span>
                              <span className="font-medium">{formatDateTime(v.startAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 text-[11px]">Đến:</span>
                              <span className="font-medium">{formatDateTime(v.endAt)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Cột Tiến độ sử dụng (SCRUM-67) */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {v.usedCount} / {v.usageLimit} lượt
                              </span>
                              <span
                                className={`text-[11px] font-semibold ${
                                  v.remainingCount <= 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : v.remainingCount <= 10
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {v.remainingCount <= 0 ? 'Hết lượt' : `Còn ${v.remainingCount} lượt`}
                              </span>
                            </div>

                            {/* Thanh tiến độ */}
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentUsed >= 100
                                    ? 'bg-rose-500'
                                    : percentUsed >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Cột Trạng thái */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(v.status)}
                        </td>

                        {/* Cột Thao tác */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenTester(v.code)}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                              title="Kiểm tra áp dụng voucher (SCRUM-67)"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(v)}
                              className="p-1.5 rounded-lg text-blue-600 dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                              title="Chỉnh sửa voucher (SCRUM-66)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmVoucher(v)}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Xóa voucher (SCRUM-66)"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Modal Thêm / Chỉnh sửa Voucher (SCRUM-66 & SCRUM-67) */}
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => !formSubmitting && setIsFormModalOpen(false)}
          title={editingVoucher ? `Chỉnh sửa Voucher: ${editingVoucher.code}` : 'Tạo mới mã giảm giá (SCRUM-66)'}
          subtitle="Điền đầy đủ thông tin mã, mức giảm, thời gian hiệu lực và giới hạn số lượt sử dụng"
          maxWidth="lg"
          icon={<TicketPercent className="w-5 h-5 text-blue-600" />}
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            {/* Mã voucher */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã Voucher <span className="text-rose-500">*</span>
                </label>
                {/* SCRUM-67: Thông báo kiểm tra trùng mã */}
                {isCheckingCode ? (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" /> Đang kiểm tra mã...
                  </span>
                ) : codeCheckStatus ? (
                  codeCheckStatus.isAvailable ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mã hợp lệ, chưa bị trùng
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Mã đã tồn tại!
                    </span>
                  )
                ) : null}
              </div>

              <input
                type="text"
                required
                maxLength={50}
                placeholder="VD: HE2026, KICHCALL20, TET2027..."
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase().replace(/\s+/g, ''),
                  })
                }
                className={`w-full px-3 py-2 text-sm uppercase font-mono tracking-wider bg-slate-50 dark:bg-[#0c162d] border rounded-lg focus:outline-none focus:ring-2 ${
                  codeCheckStatus && !codeCheckStatus.isAvailable
                    ? 'border-rose-400 focus:ring-rose-400 text-rose-600'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 text-slate-900 dark:text-white'
                }`}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                SCRUM-67: Tự động in hoa, không có khoảng trắng, kiểm tra chống trùng mã với voucher khác.
              </p>
            </div>

            {/* Loại giảm giá & Mức giảm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hình thức giảm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountType: e.target.value as VoucherDiscountType,
                      discountValue:
                        e.target.value === 'Percent'
                          ? Math.min(100, formData.discountValue || 10)
                          : formData.discountValue || 10000,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Percent">Giảm phần trăm (%)</option>
                  <option value="Fixed">Giảm số tiền cố định (VNĐ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mức giảm ({formData.discountType === 'Percent' ? '%' : 'VNĐ'}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  max={formData.discountType === 'Percent' ? 100 : 10000000}
                  step={formData.discountType === 'Percent' ? 1 : 1000}
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Thời gian bắt đầu & Kết thúc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày bắt đầu có hiệu lực <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày kết thúc hết hạn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Số lượt dùng tối đa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số lượt dùng tối đa (Quota) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={1000000}
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, usageLimit: Math.max(1, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                SCRUM-67: Khi số lượng vé đặt thành công đạt mức này, voucher sẽ tự động khóa (Hết lượt dùng).
              </p>
            </div>

            {/* Thẻ xem trước trực quan (Visual Preview) */}
            <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-[#0c162d]">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Xem trước hiển thị của Voucher
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow">
                <div>
                  <div className="font-mono font-bold text-base tracking-wider">{formData.code || 'MA_VOUCHER'}</div>
                  <div className="text-xs text-blue-100 mt-0.5">
                    {formData.discountType === 'Percent'
                      ? `Giảm ${formData.discountValue}% trên mỗi vé`
                      : `Giảm ${Number(formData.discountValue).toLocaleString('vi-VN')} đ trực tiếp`}
                  </div>
                </div>
                <div className="text-right text-[11px] text-blue-200">
                  <div>Giới hạn: {formData.usageLimit} lượt</div>
                  <div>Hạn: {formData.endAt ? new Date(formData.endAt).toLocaleDateString('vi-VN') : '--'}</div>
                </div>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={formSubmitting || (codeCheckStatus !== null && !codeCheckStatus.isAvailable)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : editingVoucher ? (
                  'Cập nhật voucher'
                ) : (
                  'Tạo voucher mới'
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Công cụ kiểm tra Voucher (SCRUM-67) */}
        <Modal
          isOpen={isTesterModalOpen}
          onClose={() => setIsTesterModalOpen(false)}
          title="Công cụ kiểm tra & tính giá voucher (SCRUM-67)"
          subtitle="Kiểm tra tồn tại, thời hạn sử dụng, số lượt còn lại và mô phỏng tính giá tiền được giảm"
          maxWidth="lg"
          icon={<ShieldCheck className="w-5 h-5 text-amber-500" />}
        >
          <div className="space-y-4">
            <form onSubmit={handleRunValidation} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Voucher cần kiểm tra <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập mã (VD: HE2026, HETHAN2025)..."
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm uppercase font-mono tracking-wider bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giá vé thử nghiệm (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={testOrderAmount}
                    onChange={(e) => setTestOrderAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#0c162d] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kiểm tra ngay (SCRUM-67)
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Kết quả kiểm tra */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  testResult.isValid
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult.isValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`font-bold text-sm ${
                          testResult.isValid
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : 'text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {testResult.isValid ? 'VOUCHER HỢP LỆ — ĐỦ ĐIỀU KIỆN ÁP DỤNG' : 'VOUCHER KHÔNG THỂ ÁP DỤNG'}
                      </h4>
                      {testResult.voucher && renderStatusBadge(testResult.voucher.status)}
                    </div>

                    <p
                      className={`text-xs ${
                        testResult.isValid
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400 font-medium'
                      }`}
                    >
                      {testResult.message}
                    </p>

                    {testResult.voucher && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400">Hình thức giảm:</span>{' '}
                            <span className="font-semibold">
                              {testResult.voucher.discountType === 'Percent'
                                ? `Giảm ${testResult.voucher.discountValue}%`
                                : `Giảm ${Number(testResult.voucher.discountValue).toLocaleString('vi-VN')} đ`}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Số lượt còn lại:</span>{' '}
                            <span className="font-semibold text-blue-600 dark:text-sky-400">
                              {testResult.voucher.remainingCount} / {testResult.voucher.usageLimit} lượt
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-400">Thời hạn áp dụng:</span>{' '}
                            <span className="font-medium">
                              {formatDateTime(testResult.voucher.startAt)} — {formatDateTime(testResult.voucher.endAt)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Trạng thái:</span>{' '}
                            <span className="font-medium">{testResult.voucher.status}</span>
                          </div>
                        </div>

                        {/* Bảng tính tiền vé */}
                        {testOrderAmount > 0 && (
                          <div className="mt-3 p-2.5 rounded-lg bg-white/70 dark:bg-[#0c162d]/80 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-slate-500">Giá vé ban đầu:</span>
                              <span className="font-mono font-semibold">
                                {Number(testOrderAmount).toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs py-0.5 text-emerald-600 dark:text-emerald-400">
                              <span>Số tiền được giảm:</span>
                              <span className="font-mono font-bold">
                                - {Number(testResult.discountAmount).toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm py-1 border-t border-slate-200 dark:border-slate-700 mt-1 font-bold text-slate-900 dark:text-white">
                              <span>Thành tiền sau giảm:</span>
                              <span className="font-mono text-blue-600 dark:text-sky-400">
                                {Number(testResult.finalAmount).toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Hộp thoại xác nhận xóa (SCRUM-66) */}
        <ConfirmDialog
          isOpen={deleteConfirmVoucher !== null}
          onClose={() => setDeleteConfirmVoucher(null)}
          onConfirm={handleConfirmDelete}
          title="Xác nhận xóa mã giảm giá"
          message={`Bạn có chắc chắn muốn xóa voucher '${deleteConfirmVoucher?.code}'? Nếu voucher chưa có lượt đặt vé nào, voucher sẽ bị xóa vĩnh viễn khỏi hệ thống.`}
          itemName={deleteConfirmVoucher ? `VOUCHER: ${deleteConfirmVoucher.code}` : undefined}
          confirmLabel="Xóa voucher"
          cancelLabel="Hủy"
          isDangerous={true}
        />
      </div>
    </div>
  );
};
