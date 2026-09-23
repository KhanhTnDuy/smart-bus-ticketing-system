'use client';

import React, { useState, useMemo } from 'react';
import { Route, RouteStatus } from '@/types/route';
import { useRouteContext } from '@/context/RouteContext';
import { StatusBadge } from '@/components/common/Badge';
import { RouteModal } from '@/components/routes/RouteModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { formatDistance } from '@/utils/formatters';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Navigation,
  DollarSign,
  Filter,
} from 'lucide-react';

export const RouteTab: React.FC = () => {
  const {
    routes,
    stops,
    statistics,
    addRoute,
    updateRoute,
    deleteRoute,
    toggleRouteStatus,
    setSelectedRouteId,
    setActiveTab,
  } = useRouteContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RouteStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const matchSearch =
        route.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.departure.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || route.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [routes, searchTerm, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingRoute(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (route: Route) => {
    setEditingRoute(route);
    setIsModalOpen(true);
  };

  const handleSubmitModal = (data: Omit<Route, 'id' | 'stopsCount' | 'createdAt'>) => {
    if (editingRoute) {
      updateRoute(editingRoute.id, data);
    } else {
      addRoute(data);
    }
  };

  const handleManageStops = (routeId: string) => {
    setSelectedRouteId(routeId);
    setActiveTab('stops');
  };

  const handleManagePricing = (routeId: string) => {
    setSelectedRouteId(routeId);
    setActiveTab('pricing');
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số tuyến xe</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{statistics.totalRoutes}</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-600" /> Hệ thống liên tỉnh
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Navigation className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang hoạt động</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{statistics.activeRoutes}</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Sẵn sàng bán vé
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tạm dừng vận hành</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{statistics.inactiveRoutes}</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Đang bảo dưỡng / điều chỉnh
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng trạm đón/trả</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{statistics.totalStops}</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Phủ rộng trên toàn tuyến
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Toolbar (Search, Filter, Add Action) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã, tên tuyến, tỉnh thành..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | RouteStatus)}
              className="w-full sm:w-auto px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 font-medium text-slate-700"
            >
              <option value="all">Tất cả trạng thái ({routes.length})</option>
              <option value="active">Đang hoạt động ({statistics.activeRoutes})</option>
              <option value="inactive">Tạm dừng ({statistics.inactiveRoutes})</option>
            </select>
          </div>
        </div>

        {/* Add New Route Button */}
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-brand-600/20 transition-all hover:shadow-lg hover:shadow-brand-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm tuyến đường mới</span>
        </button>
      </div>

      {/* 3. Table of Routes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Mã tuyến</th>
                <th className="py-3.5 px-4">Tên tuyến & Lộ trình</th>
                <th className="py-3.5 px-4">Cự ly</th>
                <th className="py-3.5 px-4">Thời gian dự kiến</th>
                <th className="py-3.5 px-4 text-center">Trạm dừng</th>
                <th className="py-3.5 px-4 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((route) => {
                  const routeStopsCount = stops.filter((s) => s.routeId === route.id).length;
                  return (
                    <tr
                      key={route.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Mã tuyến */}
                      <td className="py-4 px-4 font-mono font-bold text-xs text-brand-700">
                        <span className="px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200/60">
                          {route.code}
                        </span>
                      </td>

                      {/* Tên & Hành trình */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {route.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <span className="text-slate-700 font-medium">{route.departure}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-700 font-medium">{route.destination}</span>
                        </div>
                        {route.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">
                            {route.description}
                          </p>
                        )}
                      </td>

                      {/* Quãng đường */}
                      <td className="py-4 px-4 font-medium text-slate-700">
                        {formatDistance(route.distanceKm)}
                      </td>

                      {/* Thời gian */}
                      <td className="py-4 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {route.estimatedDuration}
                        </span>
                      </td>

                      {/* Số trạm dừng */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleManageStops(route.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs border border-indigo-200 transition-colors"
                          title="Bấm để xem và quản lý danh sách trạm dừng"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{routeStopsCount} trạm</span>
                        </button>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => toggleRouteStatus(route.id)}
                          title="Nhấp để thay đổi trạng thái"
                          className="cursor-pointer transition-transform active:scale-95"
                        >
                          <StatusBadge status={route.status} />
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút quản lý trạm */}
                          <button
                            onClick={() => handleManageStops(route.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Quản lý trạm dừng"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>

                          {/* Nút thiết lập giá */}
                          <button
                            onClick={() => handleManagePricing(route.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Thiết lập bảng giá vé"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>

                          {/* Nút chỉnh sửa */}
                          <button
                            onClick={() => handleOpenEditModal(route)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Chỉnh sửa thông tin tuyến"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Nút xóa */}
                          <button
                            onClick={() => setRouteToDelete(route)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa tuyến đường"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-800">Không tìm thấy tuyến đường nào</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.'
                          : 'Hiện chưa có tuyến đường nào trong hệ thống.'}
                      </p>
                      {(searchTerm || statusFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route Add/Edit Modal */}
      <RouteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        initialData={editingRoute}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(routeToDelete)}
        onClose={() => setRouteToDelete(null)}
        onConfirm={() => {
          if (routeToDelete) {
            deleteRoute(routeToDelete.id);
          }
        }}
        title="Xác nhận xóa tuyến đường"
        message={`Bạn có chắc chắn muốn xóa tuyến "${routeToDelete?.name}" (${routeToDelete?.code})? Toàn bộ các trạm dừng và bảng giá liên kết với tuyến này cũng sẽ bị xóa vĩnh viễn.`}
        confirmText="Xác nhận xóa tuyến"
        variant="danger"
      />
    </div>
  );
};
