import React, { useState, useMemo, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Eye,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { useRouteManagement } from '../../hooks/useRouteManagement';
import { useToast } from '../../context/ToastContext';
import { BusStop } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';

export const StopManagementPage: React.FC = () => {
  const {
    routes,
    stops,
    addStop,
    updateStop,
    deleteStop,
    moveStopUp,
    moveStopDown,
    loading,
    error: loadError,
    reload,
  } = useRouteManagement();
  const { success, error, warning } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Route selector & Filter state
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Tuyến được tải bất đồng bộ nên chọn tuyến đầu tiên khi danh sách về.
  useEffect(() => {
    if (!selectedRouteId && routes.length > 0) setSelectedRouteId(routes[0].id);
  }, [routes, selectedRouteId]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);

  // Form State
  // Bảng stops của backend chỉ có name, latitude, longitude. Trạng thái trạm và
  // cờ "trạm đầu/cuối" không có cột riêng: cờ này được suy ra từ thứ tự dừng.
  const [formData, setFormData] = useState({
    name: '',
    routeId: '',
    latitude: 0,
    longitude: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active route object
  const currentRoute = routes.find((r) => r.id === selectedRouteId);

  // Stops for current selection
  const routeStops = useMemo(() => {
    let list = stops;
    if (selectedRouteId && selectedRouteId !== 'ALL') {
      list = list.filter((s) => s.routeId === selectedRouteId);
    }

    if (searchTerm) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'TERMINAL') {
      list = list.filter((s) => s.isTerminal);
    } else if (filterStatus === 'INTERMEDIATE') {
      list = list.filter((s) => !s.isTerminal);
    }

    return list.sort((a, b) => a.order - b.order);
  }, [stops, selectedRouteId, searchTerm, filterStatus]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
  };

  // Open Handlers
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      routeId: selectedRouteId && selectedRouteId !== 'ALL' ? selectedRouteId : routes[0]?.id || '',
      latitude: 0,
      longitude: 0,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenView = (stop: BusStop) => {
    setSelectedStop(stop);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (stop: BusStop) => {
    setSelectedStop(stop);
    setFormData({
      name: stop.name,
      routeId: stop.routeId,
      latitude: stop.latitude ?? 0,
      longitude: stop.longitude ?? 0,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (stop: BusStop) => {
    setSelectedStop(stop);
    setIsDeleteOpen(true);
  };

  // Move Up / Down Handlers (TASK 3.2)
  const handleMoveUp = async (stop: BusStop) => {
    const res = await moveStopUp(stop.id);
    if (res.success) {
      success(`Đã đẩy trạm "${stop.name}" lên vị trí trước!`);
    } else {
      warning(res.message || 'Không thể di chuyển lên.');
    }
  };

  const handleMoveDown = async (stop: BusStop) => {
    const res = await moveStopDown(stop.id);
    if (res.success) {
      success(`Đã chuyển trạm "${stop.name}" xuống vị trí sau!`);
    } else {
      warning(res.message || 'Không thể di chuyển xuống.');
    }
  };

  // Validation
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Tên trạm dừng không được để trống.';
    if (!formData.routeId) errs.routeId = 'Vui lòng chọn tuyến đường liên kết.';
    if (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90) {
      errs.latitude = 'Vĩ độ phải nằm trong khoảng -90 đến 90.';
    }
    if (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180) {
      errs.longitude = 'Kinh độ phải nằm trong khoảng -180 đến 180.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handlers
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const res = await addStop(formData);
    setIsSaving(false);
    if (res.success) {
      success(`Đã thêm trạm dừng "${formData.name}" vào tuyến thành công!`);
      setIsAddModalOpen(false);
    } else {
      error(res.message || 'Thêm trạm thất bại.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStop) return;
    if (!validateForm()) return;

    setIsSaving(true);
    const res = await updateStop(selectedStop.id, formData);
    setIsSaving(false);
    if (res.success) {
      success(`Cập nhật thông tin trạm "${formData.name}" thành công!`);
      setIsEditModalOpen(false);
    } else {
      error(res.message || 'Cập nhật thất bại.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedStop) return;
    setIsSaving(true);
    const res = await deleteStop(selectedStop.id);
    setIsSaving(false);
    if (res.success) {
      success(`Đã gỡ trạm "${selectedStop.name}" khỏi tuyến và sắp xếp lại thứ tự các trạm!`);
      setIsDeleteOpen(false);
    } else {
      error(res.message || 'Gỡ trạm thất bại.');
    }
  };

  const getRouteLabel = (routeId: string) => {
    const r = routes.find((rt) => rt.id === routeId);
    return r ? `${r.code} — ${r.name}` : routeId;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header with "+ Thêm trạm" */}
      <PageHeader
        title="Quản Lý Trạm Dừng Xe Buýt"
        subtitle="Quản lý vị trí đón trả khách, lộ trình tuần tự và điều chỉnh thứ tự di chuyển trạm [Lên / Xuống] của từng tuyến xe."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành tuyến', href: '/manager/routes' },
          { label: 'Trạm dừng' },
        ]}
        icon={<MapPin className="w-5 h-5 text-amber-500" />}
        action={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-institutional-700 hover:bg-institutional-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm trạm</span>
          </button>
        }
      />

      {/* Trạng thái tải dữ liệu từ API */}
      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            Không tải được dữ liệu trạm dừng: {loadError}
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

      {loading && <LoadingState message="Đang tải trạm dừng của tuyến từ máy chủ..." />}

      {/* 2. Route Selector Tabs / Filter Box */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Compass className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
            <span>Chọn Tuyến Đường Để Quản Lý Trạm:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-institutional-800 dark:text-sky-300 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả tuyến đường --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code}: {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Status filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên trạm hoặc địa chỉ..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả vị trí --</option>
              <option value="TERMINAL">Trạm đầu / cuối tuyến</option>
              <option value="INTERMEDIATE">Trạm trung gian</option>
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

      {/* 3. Stop Management Table (TASK 3.2: + Thêm trạm | Xem | Sửa | Xóa | Lên | Xuống) */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {currentRoute
                ? `Lộ trình các trạm: [${currentRoute.code}] ${currentRoute.name}`
                : 'Danh sách toàn bộ trạm dừng'}
            </span>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Hiển thị {routeStops.length} trạm dừng theo thứ tự đón trả khách
            </div>
          </div>
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800">
            Dùng nút "Lên" & "Xuống" để thay đổi thứ tự ngay lập tức
          </div>
        </div>

        {routeStops.length === 0 ? (
          <EmptyState
            title="Chưa có trạm dừng nào"
            description="Tuyến này hiện chưa có trạm dừng được cấu hình hoặc không khớp với bộ lọc tìm kiếm."
            action={
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-institutional-700 text-white rounded text-xs font-semibold hover:bg-institutional-800"
              >
                + Thêm trạm dừng đầu tiên
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 text-center">Thứ tự</th>
                  <th className="px-4 py-3">Mã trạm</th>
                  <th className="px-4 py-3">Tên trạm dừng</th>
                  <th className="px-4 py-3">Toạ độ</th>
                  <th className="px-4 py-3">Tuyến đường</th>
                  <th className="px-4 py-3">Vị trí trong tuyến</th>
                  <th className="px-4 py-3 text-center">Thứ tự di chuyển</th>
                  <th className="px-4 py-3 text-center">Thao tác riêng biệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {routeStops.map((stop, index) => {
                  const isFirst = index === 0;
                  const isLast = index === routeStops.length - 1;

                  return (
                    <tr
                      key={stop.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                    >
                      {/* Thứ tự */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-institutional-100 dark:bg-institutional-900 text-institutional-900 dark:text-sky-300 font-extrabold text-xs">
                          {stop.order}
                        </span>
                      </td>

                      {/* Mã trạm */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {stop.id}
                      </td>

                      {/* Tên trạm */}
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{stop.name}</span>
                          {stop.isTerminal && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              Đầu/Cuối
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Toạ độ */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {Number(stop.latitude ?? 0).toFixed(5)}, {Number(stop.longitude ?? 0).toFixed(5)}
                      </td>

                      {/* Tuyến đường */}
                      <td className="px-4 py-3 font-medium text-institutional-700 dark:text-sky-400">
                        {routes.find((r) => r.id === stop.routeId)?.code || stop.routeId}
                      </td>

                      {/* Vị trí trong tuyến */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {stop.isTerminal ? (isFirst ? 'Trạm đầu tuyến' : 'Trạm cuối tuyến') : 'Trạm trung gian'}
                      </td>

                      {/* Reorder Buttons: Lên, Xuống (TASK 3.2) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(stop)}
                            disabled={isFirst}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Di chuyển trạm lên 1 vị trí"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
                            <span>Lên</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveDown(stop)}
                            disabled={isLast}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Di chuyển trạm xuống 1 vị trí"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Xuống</span>
                          </button>
                        </div>
                      </td>

                      {/* Separate CRUD Actions: Xem, Sửa, Xóa */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* Xem */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(stop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors"
                            title="Xem chi tiết trạm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem</span>
                          </button>

                          {/* Sửa */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(stop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-colors"
                            title="Chỉnh sửa trạm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(stop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
                            title="Xóa trạm"
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
          MODAL 1: ADD STOP FORM (TASK 3.2, 3.4)
      ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Mới Trạm Dừng Xe Buýt"
        subtitle="Gắn trạm đón trả khách vào lộ trình tuyến xe chỉ định"
        maxWidth="lg"
        icon={<MapPin className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tuyến xe buýt tiếp nhận <span className="text-rose-500">*</span>
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tên trạm dừng xe buýt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Đại học Bách Khoa (Cổng 2)"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
            {formErrors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Vĩ độ (Latitude) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                placeholder="21.02776"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.latitude && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.latitude}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Kinh độ (Longitude) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                placeholder="105.85114"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.longitude && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.longitude}</p>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-700 rounded px-3 py-2">
            Trạm mới được thêm vào cuối tuyến, mốc thời gian đặt sau trạm cuối hiện tại 5 phút; dùng
            nút Lên / Xuống ở bảng để sắp xếp lại. Trạm đầu và trạm cuối được xác định theo thứ tự
            dừng nên không cần khai báo. Backend yêu cầu mỗi tuyến có tối thiểu 2 trạm.
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
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-institutional-700 hover:bg-institutional-800 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
            >
              + Xác nhận thêm trạm
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: VIEW STOP DETAIL (READ-ONLY)
      ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi Tiết Trạm Dừng Xe Buýt"
        subtitle={`Mã trạm: [${selectedStop?.id}]`}
        maxWidth="md"
        icon={<Eye className="w-5 h-5 text-sky-500" />}
      >
        {selectedStop && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tên trạm:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedStop.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Thứ tự đón:</span>
                <span className="font-extrabold text-institutional-700 dark:text-sky-400 font-mono">
                  Vị trí thứ {selectedStop.order}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Tuyến phụ trách:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {getRouteLabel(selectedStop.routeId)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Vị trí trong tuyến:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Trạm số {selectedStop.order}
                  {selectedStop.isTerminal ? ' (đầu/cuối tuyến)' : ''}
                </span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Toạ độ GPS:</span>
              <p className="font-mono font-medium text-slate-800 dark:text-slate-200 mt-1">
                {Number(selectedStop.latitude ?? 0).toFixed(5)}, {Number(selectedStop.longitude ?? 0).toFixed(5)}
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
          MODAL 3: EDIT STOP FORM
      ======================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Thông Tin Trạm Dừng"
        subtitle={`Mã trạm: [${selectedStop?.id}]`}
        maxWidth="lg"
        icon={<Edit2 className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tên trạm dừng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Vĩ độ (Latitude) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.latitude && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.latitude}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Kinh độ (Longitude) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.longitude && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.longitude}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tuyến đường liên kết
            </label>
            <select
              value={formData.routeId}
              disabled
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#0c162d] text-slate-500 dark:text-slate-400 cursor-not-allowed"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Trạm là danh mục dùng chung nên có thể thuộc nhiều tuyến. Để chuyển trạm sang tuyến
              khác, hãy gỡ trạm khỏi tuyến hiện tại rồi thêm vào tuyến mới.
            </p>
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
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-sm transition-colors"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
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
        title="Xác Nhận Xóa Trạm Dừng"
        message="Bạn có chắc chắn muốn xóa trạm dừng này khỏi lộ trình tuyến xe buýt? Các trạm dừng phía sau sẽ tự động được dồn thứ tự lên 1 nấc."
        itemName={selectedStop ? `[${selectedStop.name}] - trạm số ${selectedStop.order}` : ''}
        confirmLabel="Xác nhận xóa"
        cancelLabel="Hủy"
        isDangerous={true}
      />

    </div>
  );
};
