import React, { useState, useMemo } from 'react';
import {
  Compass,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { BusRoute, RouteStatus } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';

export const RouteManagementPage: React.FC = () => {
  const { routes, stops, fares, addRoute, updateRoute, deleteRoute } = useData();
  const { success, error } = useToast();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    startPoint: '',
    endPoint: '',
    distance: 10,
    durationMinutes: 40,
    status: 'ACTIVE' as RouteStatus,
    operatingHours: '05:00 — 21:00',
    frequencyMinutes: 12,
    description: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchSearch =
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.startPoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.endPoint.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [routes, searchTerm, filterStatus]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
  };

  // Open Handlers
  const handleOpenAdd = () => {
    setFormData({
      code: '',
      name: '',
      startPoint: '',
      endPoint: '',
      distance: 12,
      durationMinutes: 45,
      status: 'ACTIVE',
      operatingHours: '05:00 — 21:00',
      frequencyMinutes: 15,
      description: '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenView = (route: BusRoute) => {
    setSelectedRoute(route);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = (route: BusRoute) => {
    setSelectedRoute(route);
    setFormData({
      code: route.code,
      name: route.name,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distance: route.distance,
      durationMinutes: route.durationMinutes,
      status: route.status,
      operatingHours: route.operatingHours,
      frequencyMinutes: route.frequencyMinutes,
      description: route.description || '',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (route: BusRoute) => {
    setSelectedRoute(route);
    setIsDeleteOpen(true);
  };

  // Form Validation (TASK 3.4)
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.code.trim()) errs.code = 'Mã tuyến xe buýt không được để trống.';
    if (!formData.name.trim()) errs.name = 'Tên tuyến lộ trình không được để trống.';
    if (!formData.startPoint.trim()) errs.startPoint = 'Điểm đầu tuyến không được để trống.';
    if (!formData.endPoint.trim()) errs.endPoint = 'Điểm cuối tuyến không được để trống.';
    if (isNaN(formData.distance) || formData.distance <= 0) {
      errs.distance = 'Cự ly tuyến phải lớn hơn 0 km.';
    }
    if (isNaN(formData.durationMinutes) || formData.durationMinutes <= 0) {
      errs.durationMinutes = 'Thời gian hành trình phải lớn hơn 0 phút.';
    }
    if (!formData.operatingHours.trim()) {
      errs.operatingHours = 'Khung giờ hoạt động không được để trống.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handlers
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const res = addRoute(formData);
    if (res.success) {
      success(`Thêm mới tuyến [${formData.code}] thành công!`);
      setIsAddModalOpen(false);
    } else {
      error(res.message || 'Thêm tuyến thất bại.');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;
    if (!validateForm()) return;

    const res = updateRoute(selectedRoute.id, formData);
    if (res.success) {
      success(`Cập nhật thông tin tuyến [${selectedRoute.code}] thành công!`);
      setIsEditModalOpen(false);
    } else {
      error(res.message || 'Cập nhật tuyến thất bại.');
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedRoute) return;
    const res = deleteRoute(selectedRoute.id);
    if (res.success) {
      success(`Đã xóa hoàn toàn tuyến [${selectedRoute.code}] và dữ liệu liên quan!`);
      setIsDeleteOpen(false);
    } else {
      error(res.message || 'Xóa tuyến thất bại.');
    }
  };

  // Related stops for selected view route
  const routeStops = useMemo(() => {
    if (!selectedRoute) return [];
    return stops
      .filter((s) => s.routeId === selectedRoute.id)
      .sort((a, b) => a.order - b.order);
  }, [stops, selectedRoute]);

  const linkedStopsCount = useMemo(() => {
    if (!selectedRoute) return 0;
    return stops.filter((s) => s.routeId === selectedRoute.id).length;
  }, [stops, selectedRoute]);

  const linkedFaresCount = useMemo(() => {
    if (!selectedRoute) return 0;
    return fares.filter((f) => f.routeId === selectedRoute.id).length;
  }, [fares, selectedRoute]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Dedicated "+ Thêm tuyến" Action Button */}
      <PageHeader
        title="Quản Lý Tuyến Đường Xe Buýt"
        subtitle="Hệ thống mạng lưới lộ trình, điểm đầu điểm cuối, khoảng cách cự ly và tần suất vận hành xe buýt đô thị."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành tuyến' },
          { label: 'Tuyến đường' },
        ]}
        icon={<Compass className="w-5 h-5 text-sky-500" />}
        action={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-institutional-700 hover:bg-institutional-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm tuyến</span>
          </button>
        }
      />

      {/* 2. Filter & Search Controls */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
          <span>Tìm kiếm & Lọc tuyến đường:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã tuyến, tên tuyến, điểm đầu, điểm cuối..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả trạng thái --</option>
              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
              <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
              <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
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

      {/* 3. Route Table with Separate Action Buttons */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tổng số tuyến quản lý:{' '}
            <span className="text-institutional-700 dark:text-sky-400 font-extrabold">
              {filteredRoutes.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            * Mỗi nút thao tác riêng biệt: Xem, Sửa, Xóa
          </span>
        </div>

        {filteredRoutes.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tuyến đường"
            description="Không có tuyến xe buýt nào khớp với điều kiện tìm kiếm. Hãy thử lại hoặc tạo mới tuyến xe."
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
                  <th className="px-4 py-3">Mã tuyến</th>
                  <th className="px-4 py-3">Tên tuyến lộ trình</th>
                  <th className="px-4 py-3">Điểm đầu</th>
                  <th className="px-4 py-3">Điểm cuối</th>
                  <th className="px-4 py-3">Cự ly</th>
                  <th className="px-4 py-3">Số trạm dừng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Thao tác riêng biệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#19274c] text-xs">
                {filteredRoutes.map((route) => (
                  <tr
                    key={route.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-institutional-700 dark:text-sky-400">
                      {route.code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {route.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {route.startPoint}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {route.endPoint}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {route.distance} km
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {route.stopCount} trạm
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="routeStatus" value={route.status} size="sm" />
                    </td>
                    
                    {/* Separate Action Buttons: Xem, Sửa, Xóa */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        
                        {/* Xem */}
                        <button
                          type="button"
                          onClick={() => handleOpenView(route)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/80 transition-colors"
                          title="Xem thông tin chi tiết tuyến"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>

                        {/* Sửa */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(route)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/80 transition-colors"
                          title="Chỉnh sửa thông số tuyến"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        {/* Xóa */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(route)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
                          title="Xóa tuyến đường"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL 1: ADD ROUTE FORM (TASK 3.1)
      ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Mới Tuyến Xe Buýt"
        subtitle="Thiết lập lộ trình mới vào cơ sở dữ liệu vận tải"
        maxWidth="xl"
        icon={<Compass className="w-5 h-5 text-sky-500" />}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Mã tuyến */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Mã số tuyến (Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ví dụ: Tuyến 06 hoặc T06"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.code && <p className="text-[11px] text-rose-500 mt-1">{formErrors.code}</p>}
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái vận hành <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RouteStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
                <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
              </select>
            </div>

            {/* Tên tuyến */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tên tuyến lộ trình <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Bến xe An Sương — Bến xe Chợ Lớn"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
            </div>

            {/* Điểm đầu */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Điểm đầu tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.startPoint}
                onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                placeholder="Bến xe An Sương"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.startPoint && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.startPoint}</p>
              )}
            </div>

            {/* Điểm cuối */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Điểm cuối tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.endPoint}
                onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                placeholder="Bến xe Chợ Lớn"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.endPoint && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.endPoint}</p>
              )}
            </div>

            {/* Cự ly */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Cự ly hành trình (km) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.distance && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.distance}</p>
              )}
            </div>

            {/* Thời gian hành trình */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Thời gian ước tính (phút) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.durationMinutes && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.durationMinutes}</p>
              )}
            </div>

            {/* Khung giờ hoạt động */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Khung giờ hoạt động <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.operatingHours}
                onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                placeholder="05:00 — 21:00"
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.operatingHours && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.operatingHours}</p>
              )}
            </div>

            {/* Tần suất giãn cách */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tần suất giãn cách (phút/chuyến)
              </label>
              <input
                type="number"
                min="1"
                value={formData.frequencyMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, frequencyMinutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            {/* Mô tả */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Mô tả chi tiết tuyến
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ghi chú về lưu lượng, đối tượng hành khách chính..."
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

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
              + Xác nhận thêm tuyến
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: VIEW ROUTE DETAIL (READ-ONLY)
      ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Thông Tin Chi Tiết Tuyến Đường"
        subtitle={`Mã tuyến: [${selectedRoute?.code}] — ${selectedRoute?.name}`}
        maxWidth="2xl"
        icon={<Eye className="w-5 h-5 text-sky-500" />}
      >
        {selectedRoute && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Mã tuyến:</span>
                <div className="font-mono font-bold text-base text-institutional-700 dark:text-sky-400 mt-0.5">
                  {selectedRoute.code}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Cự ly tuyến:</span>
                <div className="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  {selectedRoute.distance} km
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Thời gian chuyến:</span>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedRoute.durationMinutes} phút
                </div>
              </div>

              <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Trạng thái:</span>
                <div className="mt-0.5">
                  <Badge variant="routeStatus" value={selectedRoute.status} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>Lộ trình điểm đầu & điểm cuối:</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium pl-6">
                <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  {selectedRoute.startPoint}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  {selectedRoute.endPoint}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-6 pt-1">
                Giờ phục vụ: {selectedRoute.operatingHours} • Tần suất: {selectedRoute.frequencyMinutes} phút/chuyến
              </div>
            </div>

            {/* List of stops belonging to this route */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 text-xs">
                  Danh sách trạm dừng trên tuyến ({routeStops.length} trạm)
                </h4>
                <span className="text-[11px] text-slate-400">Theo thứ tự đón trả</span>
              </div>

              {routeStops.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  Chưa có trạm dừng nào được gắn vào tuyến này.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {routeStops.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2 rounded bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-institutional-100 dark:bg-institutional-900/60 text-institutional-800 dark:text-sky-300 font-bold flex items-center justify-center text-[10px]">
                          {st.order}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {st.name}
                        </span>
                        {st.isTerminal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            Điểm đầu/cuối
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {st.address}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
          MODAL 3: EDIT ROUTE FORM (PREFILLED)
      ======================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Tuyến Xe Buýt"
        subtitle={`Cập nhật thông tin cho [${selectedRoute?.code}]`}
        maxWidth="xl"
        icon={<Edit2 className="w-5 h-5 text-amber-500" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Mã số tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.code && <p className="text-[11px] text-rose-500 mt-1">{formErrors.code}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái vận hành <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RouteStatus })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="SUSPENDED">Đình chỉ (SUSPENDED)</option>
                <option value="MAINTENANCE">Bảo trì (MAINTENANCE)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tên tuyến lộ trình <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
              {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Điểm đầu tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.startPoint}
                onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Điểm cuối tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.endPoint}
                onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Cự ly hành trình (km) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Thời gian ước tính (phút) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Khung giờ hoạt động
              </label>
              <input
                type="text"
                value={formData.operatingHours}
                onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Tần suất giãn cách (phút)
              </label>
              <input
                type="number"
                min="1"
                value={formData.frequencyMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, frequencyMinutes: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

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
              Lưu thay đổi tuyến
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
        title="Xác Nhận Xóa Tuyến Xe Buýt"
        message={`Bạn có chắc chắn muốn xóa tuyến này? Thao tác này sẽ đồng thời xóa toàn bộ ${linkedStopsCount} trạm dừng và ${linkedFaresCount} cấu hình giá vé đang liên kết để đảm bảo tính toàn vẹn dữ liệu hệ thống.`}
        itemName={selectedRoute ? `[${selectedRoute.code}] ${selectedRoute.name}` : ''}
        confirmLabel="Xác nhận xóa"
        cancelLabel="Hủy"
        isDangerous={true}
      />

    </div>
  );
};
