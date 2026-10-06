import React, { useState, useMemo } from 'react';
import {
  TicketPercent,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Voucher, VoucherDiscountType } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';

export const VoucherManagementPage: React.FC = () => {
  const { vouchers, addVoucher, updateVoucher, deleteVoucher, toggleVoucherStatus } = useData();
  const { success, error } = useToast();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const initialFormData = {
    code: '',
    description: '',
    discountType: 'PERCENT' as VoucherDiscountType,
    discountValue: 10,
    maxDiscount: 20000,
    minOrder: 10000,
    startAt: new Date().toISOString().split('T')[0],
    endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: 200,
    active: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  // Statistics
  const stats = useMemo(() => {
    const total = vouchers.length;
    const now = new Date();
    const active = vouchers.filter((v) => {
      const isExpired = new Date(v.endAt) < now;
      return v.active && !isExpired;
    }).length;
    const totalUsed = vouchers.reduce((sum, v) => sum + (v.usedCount || 0), 0);
    return { total, active, totalUsed };
  }, [vouchers]);

  // Filtered vouchers
  const filteredVouchers = useMemo(() => {
    const now = new Date();
    return vouchers.filter((v) => {
      const matchSearch =
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase());

      const isExpired = new Date(v.endAt) < now;
      let matchStatus = true;
      if (statusFilter === 'ACTIVE') {
        matchStatus = v.active && !isExpired;
      } else if (statusFilter === 'INACTIVE') {
        matchStatus = !v.active && !isExpired;
      } else if (statusFilter === 'EXPIRED') {
        matchStatus = isExpired;
      }

      const matchType = discountTypeFilter === 'ALL' || v.discountType === discountTypeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [vouchers, searchTerm, statusFilter, discountTypeFilter]);

  // Form handlers
  const handleOpenCreate = () => {
    setEditingVoucher(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Voucher) => {
    setEditingVoucher(v);
    setFormData({
      code: v.code,
      description: v.description,
      discountType: v.discountType,
      discountValue: v.discountValue,
      maxDiscount: v.maxDiscount || 0,
      minOrder: v.minOrder,
      startAt: v.startAt.split('T')[0],
      endAt: v.endAt.split('T')[0],
      usageLimit: v.usageLimit || 0,
      active: v.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      error('Vui lòng nhập mã giảm giá.');
      return;
    }

    if (formData.discountValue <= 0) {
      error('Mức giảm giá phải lớn hơn 0.');
      return;
    }

    if (formData.discountType === 'PERCENT' && formData.discountValue > 100) {
      error('Mức giảm theo tỷ lệ phần trăm không được vượt quá 100%.');
      return;
    }

    if (new Date(formData.endAt) < new Date(formData.startAt)) {
      error('Ngày kết thúc ưu đãi không thể trước ngày bắt đầu.');
      return;
    }

    if (editingVoucher) {
      const res = updateVoucher(editingVoucher.id, {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.discountType === 'PERCENT' ? Number(formData.maxDiscount) : undefined,
        minOrder: Number(formData.minOrder),
        startAt: formData.startAt,
        endAt: formData.endAt,
        usageLimit: formData.usageLimit > 0 ? Number(formData.usageLimit) : undefined,
        active: formData.active,
      });

      if (res.success) {
        success(`Cập nhật mã giảm giá ${formData.code.toUpperCase()} thành công!`);
        setIsModalOpen(false);
      } else {
        error(res.message || 'Không thể cập nhật mã giảm giá.');
      }
    } else {
      const res = addVoucher({
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.discountType === 'PERCENT' ? Number(formData.maxDiscount) : undefined,
        minOrder: Number(formData.minOrder),
        startAt: formData.startAt,
        endAt: formData.endAt,
        usageLimit: formData.usageLimit > 0 ? Number(formData.usageLimit) : undefined,
        active: formData.active,
      });

      if (res.success) {
        success(`Tạo mã giảm giá ${formData.code.toUpperCase()} thành công!`);
        setIsModalOpen(false);
      } else {
        error(res.message || 'Không thể tạo mã giảm giá.');
      }
    }
  };

  const handleToggle = (id: string, code: string) => {
    const res = toggleVoucherStatus(id);
    if (res.success) {
      success(`Đã cập nhật trạng thái mã [${code}]`);
    } else {
      error(res.message || 'Không thể đổi trạng thái.');
    }
  };

  const handleDelete = () => {
    if (!deleteConfirmId) return;
    const res = deleteVoucher(deleteConfirmId);
    if (res.success) {
      success('Đã xóa mã giảm giá thành công!');
      setDeleteConfirmId(null);
    } else {
      error(res.message || 'Không thể xóa voucher.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success(`Đã sao chép mã [${code}] vào bộ nhớ tạm!`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý mã giảm giá & Khuyến mãi"
        description="Tạo và quản lý các chương trình khuyến mãi, kích cầu đi xe buýt, giảm giá theo % hoặc số tiền cố định."
        action={
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo voucher mới
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tổng số chương trình
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.total}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TicketPercent className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
              Đang áp dụng hiệu lực
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.active}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
              Tổng lượt đã dùng
            </p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {stats.totalUsed.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã voucher, mô tả..."
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
              <option value="ACTIVE">Đang kích hoạt</option>
              <option value="INACTIVE">Tạm ngưng</option>
              <option value="EXPIRED">Đã hết hạn</option>
            </select>
          </div>

          <select
            value={discountTypeFilter}
            onChange={(e) => setDiscountTypeFilter(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="PERCENT">Giảm phần trăm (%)</option>
            <option value="FIXED">Giảm tiền mặt (VNĐ)</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || discountTypeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setDiscountTypeFilter('ALL');
              }}
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
        {filteredVouchers.length === 0 ? (
          <EmptyState
            title="Không có mã giảm giá nào"
            description="Chưa có mã voucher phù hợp với bộ lọc hoặc hãy tạo voucher đầu tiên."
            actionLabel="Tạo mã giảm giá"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-4">Mã Voucher</th>
                  <th className="px-5 py-4">Mô tả chương trình</th>
                  <th className="px-5 py-4">Mức giảm</th>
                  <th className="px-5 py-4">Điều kiện</th>
                  <th className="px-5 py-4">Hiệu lực</th>
                  <th className="px-5 py-4">Lượt sử dụng</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredVouchers.map((v) => {
                  const isExpired = new Date(v.endAt) < new Date();
                  const badgeValue = isExpired ? 'EXPIRED' : v.active ? 'ACTIVE' : 'INACTIVE';
                  const percentUsed = v.usageLimit
                    ? Math.min(100, Math.round((v.usedCount / v.usageLimit) * 100))
                    : 0;

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {v.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(v.code)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                            title="Sao chép mã"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {v.description}
                        </p>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Mã ID: {v.id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {v.discountType === 'PERCENT' ? (
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Giảm {v.discountValue}%
                            </span>
                            {v.maxDiscount && (
                              <div className="text-[11px] text-slate-400">
                                Tối đa {v.maxDiscount.toLocaleString()}đ
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Giảm {v.discountValue.toLocaleString()}đ
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {v.minOrder > 0 ? (
                          <span>Đơn từ {v.minOrder.toLocaleString()}đ</span>
                        ) : (
                          <span className="text-slate-400">Không yêu cầu</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="text-slate-700 dark:text-slate-300">
                          {v.startAt}
                        </div>
                        <div className="text-slate-400">
                          đến {v.endAt}
                        </div>
                      </td>
                      <td className="px-5 py-4 min-w-[130px]">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {v.usedCount}
                          </span>
                          <span className="text-slate-400">
                            {v.usageLimit ? `/ ${v.usageLimit}` : 'Không hạn chế'}
                          </span>
                        </div>
                        {v.usageLimit && (
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                percentUsed >= 90
                                  ? 'bg-rose-500'
                                  : percentUsed >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="voucherStatus" value={badgeValue} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggle(v.id, v.code)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                            title={v.active ? 'Tắt voucher' : 'Kích hoạt voucher'}
                          >
                            {v.active ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(v.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                            title="Xóa voucher"
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

      {/* Modal Tạo/Sửa Voucher */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVoucher ? 'Cập nhật mã giảm giá' : 'Tạo mới mã giảm giá'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mã Voucher (Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: CHAOHEXANH"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 uppercase font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hình thức giảm giá <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountType: e.target.value as VoucherDiscountType,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value="PERCENT">Giảm phần trăm (%)</option>
                <option value="FIXED">Giảm số tiền cố định (VNĐ)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mô tả chi tiết chương trình <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="VD: Giảm 20% giá vé xe buýt cho tất cả các tuyến dịp tựu trường"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mức giảm ({formData.discountType === 'PERCENT' ? '%' : 'VNĐ'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={formData.discountType === 'PERCENT' ? 100 : undefined}
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({ ...formData, discountValue: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            {formData.discountType === 'PERCENT' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Giảm tối đa (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.maxDiscount}
                  onChange={(e) =>
                    setFormData({ ...formData, maxDiscount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Đơn hàng tối thiểu (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.minOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrder: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Ngày kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Giới hạn lượt dùng (0 = vô hạn)
              </label>
              <input
                type="number"
                min={0}
                value={formData.usageLimit}
                onChange={(e) =>
                  setFormData({ ...formData, usageLimit: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium">Kích hoạt áp dụng ngay</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              {editingVoucher ? 'Cập nhật voucher' : 'Tạo mới voucher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa mã giảm giá"
        message="Bạn có chắc chắn muốn xóa mã giảm giá này? Hành khách sẽ không thể nhập mã này khi đặt vé nữa."
        confirmText="Xóa voucher"
        type="danger"
      />
    </div>
  );
};
