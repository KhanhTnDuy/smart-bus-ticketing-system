import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Fare, FareStatus, PassengerType } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';

export const FareManagementPage: React.FC = () => {
  const { routes, fares, addFare, updateFare, deleteFare } = useData();
  const { success, error } = useToast();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedFare, setSelectedFare] = useState<Fare | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    routeId: routes[0]?.id || '',
    passengerType: 'REGULAR' as PassengerType,
    price: 7000,
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as FareStatus,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered Fares
  const filteredFares = useMemo(() => {
    return fares.filter((f) => {
      const routeObj = routes.find((r) => r.id === f.routeId);
      const routeCode = routeObj?.code || '';
      const routeName = routeObj?.name || '';

      const matchSearch =
        routeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.notes && f.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRoute = filterRoute === 'ALL' || f.routeId === filterRoute;
      const matchType = filterType === 'ALL' || f.passengerType === filterType;

      return matchSearch && matchRoute && matchType;
    });
  }, [fares, routes, searchTerm, filterRoute, filterType]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRoute('ALL');
    setFilterType('ALL');
  };

  // Open Handlers
  const handleOpenAdd = () => {
    setFormData({
      routeId: routes[0]?.id || '',
      passengerType: 'REGULAR',
      price: 7000,
      effectiveDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      notes: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenView = (fare: Fare) => {
    setSelectedFare(fare);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (fare: Fare) => {
    setSelectedFare(fare);
    setFormData({
      routeId: fare.routeId,
      passengerType: fare.passengerType,
      price: fare.price,
      effectiveDate: fare.effectiveDate,
      status: fare.status,
      notes: fare.notes || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (fare: Fare) => {
    setSelectedFare(fare);
    setIsDeleteOpen(true);
  };

  // Validation (TASK 3.3, 3.4)
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.routeId) errs.routeId = 'Vui lòng chọn tuyến xe buýt áp dụng.';
    if (isNaN(formData.price)) {
      errs.price = 'Giá vé phải là một số hợp lệ.';
    } else if (formData.price < 0) {
      errs.price = 'Giá vé không được là số âm (cho phép 0 VNĐ nếu miễn phí).';
    }
    if (!formData.effectiveDate) {
      errs.effectiveDate = 'Ngày áp dụng hiệu lực không được để trống.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handlers
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const res = addFare(formData);
    if (res.success) {
      success(`Thêm mức giá vé ${formData.price.toLocaleString('vi-VN')} VNĐ thành công!`);
      setIsAddModalOpen(false);
    } else {
      error(res.message || 'Thêm giá vé thất bại.');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFare) return;
    if (!validateForm()) return;

    const res = updateFare(selectedFare.id, formData);
    if (res.success) {
      success(`Cập nhật biểu giá vé ID ${selectedFare.id} thành công!`);
      setIsEditModalOpen(false);
    } else {
      error(res.message || 'Cập nhật thất bại.');
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedFare) return;
    const res = deleteFare(selectedFare.id);
    if (res.success) {
      success(`Đã xóa biểu giá vé ID ${selectedFare.id} khỏi hệ thống!`);
      setIsDeleteOpen(false);
    } else {
      error(res.message || 'Xóa giá vé thất bại.');
    }
  };

  const getPassengerTypeLabel = (type: PassengerType) => {
    switch (type) {
      case 'REGULAR':
        return 'Vé lượt phổ thông';
      case 'STUDENT':
        return 'Học sinh — Sinh viên';
      case 'ELDERLY_DISABLED':
        return 'Người cao tuổi & Khuyết tật (Miễn phí)';
      case 'MONTHLY_PASS':
        return 'Vé tháng liên tuyến / đơn tuyến';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header with "+ Thêm giá vé" */}
      <PageHeader
        title="Quản Lý Biểu Giá Vé Xe Buýt"
        subtitle="Cấu hình mức cước vận tải hành khách, chính sách trợ giá học sinh sinh viên và diện miễn giảm xã hội."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành tuyến', href: '/manager/routes' },
          { label: 'Biểu giá vé' },
        ]}
        icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
        action={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-institutional-700 hover:bg-institutional-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm giá vé</span>
          </button>
        }
      />

      {/* 2. Filter & Search Controls */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
          <span>Tra cứu & Lọc biểu giá vé:</span>
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
              placeholder="Tìm theo tuyến, ghi chú..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div>
            <select
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả tuyến đường --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}: {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả đối tượng --</option>
              <option value="REGULAR">Vé phổ thông</option>
              <option value="STUDENT">Học sinh - Sinh viên</option>
              <option value="ELDERLY_DISABLED">Người già/Khuyết tật</option>
              <option value="MONTHLY_PASS">Vé tháng</option>
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

      {/* 3. Fare Table with Separate Action Buttons */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tổng số biểu giá vé:{' '}
            <span className="text-institutional-700 dark:text-sky-400 font-extrabold">
              {filteredFares.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            * Mỗi nút có hành vi riêng biệt: Xem, Sửa, Xóa
          </span>
        </div>

        {filteredFares.length === 0 ? (
          <EmptyState
            title="Không tìm thấy biểu giá vé"
            description="Chưa có biểu giá vé nào khớp với tiêu chí tìm kiếm. Hãy chọn lại bộ lọc hoặc thêm mới giá vé."
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
                  <th className="px-4 py-3">Mã vé ID</th>
                  <th className="px-4 py-3">Tuyến đường áp dụng</th>
                  <th className="px-4 py-3">Đối tượng hành khách</th>
                  <th className="px-4 py-3">Đơn giá vé (VNĐ)</th>
                  <th className="px-4 py-3">Ngày hiệu lực</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ghi chú</th>
                  <th className="px-4 py-3 text-center">Thao tác riêng biệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {filteredFares.map((fare) => {
                  const routeObj = routes.find((r) => r.id === fare.routeId);
                  return (
                    <tr
                      key={fare.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {fare.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-institutional-700 dark:text-sky-400">
                        {routeObj ? `${routeObj.code}: ${routeObj.name}` : fare.routeId}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {getPassengerTypeLabel(fare.passengerType)}
                      </td>
                      <td className="px-4 py-3 font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {fare.price === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            0 VNĐ (Miễn phí)
                          </span>
                        ) : (
                          `${fare.price.toLocaleString('vi-VN')} VNĐ`
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {fare.effectiveDate}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="routeStatus" value={fare.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={fare.notes}>
                        {fare.notes || '—'}
                      </td>

                      {/* Separate Buttons: Xem, Sửa, Xóa */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* Xem */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(fare)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors"
                            title="Xem chi tiết giá vé"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem</span>
                          </button>

                          {/* Sửa */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(fare)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-colors"
                            title="Chỉnh sửa mức giá"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(fare)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
                            title="Xóa giá vé"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
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
          MODAL 1: ADD FARE FORM (TASK 3.3)
      ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Mới Biểu Giá Vé"
        subtitle="Thiết lập đơn giá vé theo cự ly tuyến và đối tượng hành khách"
        maxWidth="lg"
        icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tuyến đường áp dụng <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.routeId}
              onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
            {formErrors.routeId && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.routeId}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Đối tượng hành khách <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.passengerType}
                onChange={(e) =>
                  setFormData({ ...formData, passengerType: e.target.value as PassengerType })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="REGULAR">Vé lượt phổ thông</option>
                <option value="STUDENT">Học sinh — Sinh viên (Trợ giá)</option>
                <option value="ELDERLY_DISABLED">Người cao tuổi & Khuyết tật</option>
                <option value="MONTHLY_PASS">Vé tháng trọn gói</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Đơn giá vé (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                }
                placeholder="7000"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.price && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Ngày hiệu lực áp dụng <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.effectiveDate && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.effectiveDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái hiệu lực
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as FareStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Đang áp dụng (ACTIVE)</option>
                <option value="UPCOMING">Sắp áp dụng (UPCOMING)</option>
                <option value="EXPIRED">Đã hết hiệu lực (EXPIRED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú bổ sung / Căn cứ pháp lý
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ví dụ: Theo quyết định số 12/2026/QĐ-UBND thành phố..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-institutional-700 hover:bg-institutional-800 text-white shadow-sm transition-colors"
            >
              + Xác nhận thêm giá vé
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: VIEW FARE DETAIL (READ-ONLY)
      ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Thông Tin Biểu Giá Vé"
        subtitle={`Mã vé: [${selectedFare?.id}]`}
        maxWidth="md"
        icon={<Eye className="w-5 h-5 text-sky-500" />}
      >
        {selectedFare && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tuyến đường:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {routes.find((r) => r.id === selectedFare.routeId)?.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Đối tượng:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {getPassengerTypeLabel(selectedFare.passengerType)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Đơn giá:</span>
                <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedFare.price.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Ngày áp dụng:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedFare.effectiveDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Trạng thái:</span>
                <Badge variant="routeStatus" value={selectedFare.status} />
              </div>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Căn cứ & Ghi chú:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                {selectedFare.notes || 'Không có ghi chú bổ sung.'}
              </p>
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

      {/* ========================================================
          MODAL 3: EDIT FARE FORM
      ======================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Biểu Giá Vé"
        subtitle={`Mã vé: [${selectedFare?.id}]`}
        maxWidth="lg"
        icon={<Edit2 className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tuyến đường áp dụng <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.routeId}
              onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Đối tượng hành khách <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.passengerType}
                onChange={(e) =>
                  setFormData({ ...formData, passengerType: e.target.value as PassengerType })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="REGULAR">Vé lượt phổ thông</option>
                <option value="STUDENT">Học sinh — Sinh viên (Trợ giá)</option>
                <option value="ELDERLY_DISABLED">Người cao tuổi & Khuyết tật</option>
                <option value="MONTHLY_PASS">Vé tháng trọn gói</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Đơn giá vé (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.price && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Ngày hiệu lực áp dụng
              </label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as FareStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Đang áp dụng (ACTIVE)</option>
                <option value="UPCOMING">Sắp áp dụng (UPCOMING)</option>
                <option value="EXPIRED">Đã hết hiệu lực (EXPIRED)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú bổ sung
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
            >
              Lưu thay đổi giá vé
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 4: DELETE CONFIRMATION
      ======================================================== */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác Nhận Xóa Biểu Giá Vé"
        message="Bạn có chắc chắn muốn xóa biểu giá vé này? Thao tác này sẽ cập nhật vào nhật ký hệ thống."
        itemName={selectedFare ? `Mã: ${selectedFare.id} - ${getPassengerTypeLabel(selectedFare.passengerType)} (${selectedFare.price} VNĐ)` : ''}
        confirmLabel="Xác nhận xóa"
        cancelLabel="Hủy"
        isDangerous={true}
      />

    </div>
  );
};
