'use client';

import React, { useState, useMemo } from 'react';
import { Route, Stop } from '@/types/route';
import { useRouteContext } from '@/context/RouteContext';
import { StopModal } from '@/components/routes/StopModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { StatusBadge } from '@/components/common/Badge';
import { formatDistance, formatStopDuration } from '@/utils/formatters';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  Navigation,
  DollarSign,
  Info,
  Clock,
  ArrowRight,
  Route as RouteIcon,
} from 'lucide-react';

export const StopTab: React.FC = () => {
  const {
    routes,
    selectedRouteId,
    setSelectedRouteId,
    getStopsByRoute,
    addStop,
    updateStop,
    deleteStop,
    reorderStop,
    setActiveTab,
  } = useRouteContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [stopToDelete, setStopToDelete] = useState<Stop | null>(null);

  // Active route
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
  }, [routes, selectedRouteId]);

  // Stops of active route
  const currentStops = useMemo(() => {
    if (!activeRoute) return [];
    return getStopsByRoute(activeRoute.id);
  }, [activeRoute, getStopsByRoute]);

  const handleOpenAddModal = () => {
    setEditingStop(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (stop: Stop) => {
    setEditingStop(stop);
    setIsModalOpen(true);
  };

  const handleSubmitModal = (data: Omit<Stop, 'id' | 'orderIndex'>) => {
    if (editingStop) {
      updateStop(editingStop.id, data);
    } else {
      addStop(data);
    }
  };

  const calculateSuggestedDistance = () => {
    if (currentStops.length === 0) return 0;
    const lastStop = currentStops[currentStops.length - 1];
    return Math.min(activeRoute?.distanceKm || 300, lastStop.distanceFromStartKm + 50);
  };

  return (
    <div className="space-y-6">
      {/* 1. Selector bar & Route Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Chọn tuyến đường cần quản lý trạm:
            </label>
            <div className="relative">
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 transition-colors"
              >
                {routes.map((route) => {
                  const stopCount = getStopsByRoute(route.id).length;
                  return (
                    <option key={route.id} value={route.id}>
                      [{route.code}] {route.name} ({stopCount} trạm • {route.distanceKm} km)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('pricing')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-xs"
            >
              <DollarSign className="w-4 h-4" />
              <span>Xem giá vé tuyến này</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              disabled={!activeRoute}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm trạm dừng mới</span>
            </button>
          </div>
        </div>

        {/* Route Details Card */}
        {activeRoute && (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-md font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200">
                {activeRoute.code}
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <span>{activeRoute.departure}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeRoute.destination}</span>
              </div>
              <StatusBadge status={activeRoute.status} />
            </div>

            <div className="flex items-center gap-5 text-slate-500">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-slate-400" />
                Tổng cự ly: <strong className="text-slate-800">{formatDistance(activeRoute.distanceKm)}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Thời gian: <strong className="text-slate-800">{activeRoute.estimatedDuration}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                Hiện có: <strong className="text-indigo-600">{currentStops.length} trạm dừng</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Stops Table with Up/Down ordering */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Lộ trình trạm dừng theo thứ tự di chuyển
            </h3>
            <span className="text-xs text-slate-400">
              (Dùng mũi tên Lên/Xuống để sắp xếp hành trình xe)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-16">Thứ tự</th>
                <th className="py-3.5 px-4">Tên trạm dừng</th>
                <th className="py-3.5 px-4">Địa chỉ / Vị trí đón trả</th>
                <th className="py-3.5 px-4 text-center">Thời gian dừng</th>
                <th className="py-3.5 px-4 text-center">Cách điểm đi</th>
                <th className="py-3.5 px-4 text-center w-28">Đổi thứ tự</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {currentStops.length > 0 ? (
                currentStops.map((stop, index) => {
                  const isFirst = index === 0;
                  const isLast = index === currentStops.length - 1;

                  return (
                    <tr
                      key={stop.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* STT badge */}
                      <td className="py-4 px-4 text-center">
                        <div
                          className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                            isFirst
                              ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300'
                              : isLast
                              ? 'bg-rose-100 text-rose-800 ring-2 ring-rose-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {stop.orderIndex}
                        </div>
                      </td>

                      {/* Tên trạm */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{stop.name}</span>
                          {isFirst && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Điểm xuất phát
                            </span>
                          )}
                          {isLast && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Bến cuối
                            </span>
                          )}
                        </div>
                        {stop.note && (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 italic">
                            <Info className="w-3 h-3 text-slate-400 shrink-0" /> {stop.note}
                          </p>
                        )}
                      </td>

                      {/* Địa chỉ */}
                      <td className="py-4 px-4 text-slate-600 text-xs max-w-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{stop.address}</span>
                        </div>
                      </td>

                      {/* Thời gian dừng */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          {formatStopDuration(stop.stopDurationMinutes)}
                        </span>
                      </td>

                      {/* Khoảng cách */}
                      <td className="py-4 px-4 text-center font-medium text-slate-700 text-xs">
                        {formatDistance(stop.distanceFromStartKm)}
                      </td>

                      {/* Sắp xếp thứ tự: Mũi tên Lên / Xuống */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          {/* Up arrow */}
                          <button
                            onClick={() => reorderStop(stop.id, 'up')}
                            disabled={isFirst}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isFirst
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:text-indigo-600 hover:bg-white shadow-xs'
                            }`}
                            title={isFirst ? 'Đã là trạm đầu tiên' : 'Đẩy trạm lên trước'}
                            aria-label="Đẩy trạm lên trước"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>

                          {/* Down arrow */}
                          <button
                            onClick={() => reorderStop(stop.id, 'down')}
                            disabled={isLast}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isLast
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-600 hover:text-indigo-600 hover:bg-white shadow-xs'
                            }`}
                            title={isLast ? 'Đã là trạm cuối cùng' : 'Đẩy trạm xuống sau'}
                            aria-label="Đẩy trạm xuống sau"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Thao tác Sửa / Xóa */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(stop)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Sửa thông tin trạm"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setStopToDelete(stop)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa trạm dừng"
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
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-800">
                        Chưa có trạm dừng nào cho tuyến này
                      </p>
                      <p className="text-xs text-slate-500">
                        Hãy bắt đầu thêm các điểm xuất phát, trạm trung chuyển hoặc bến cuối để hoàn thiện lộ trình di chuyển.
                      </p>
                      <button
                        onClick={handleOpenAddModal}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                      >
                        Thêm trạm đầu tiên
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stop Modal */}
      <StopModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        routeId={activeRoute?.id || ''}
        initialData={editingStop}
        suggestedDistance={calculateSuggestedDistance()}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(stopToDelete)}
        onClose={() => setStopToDelete(null)}
        onConfirm={() => {
          if (stopToDelete) {
            deleteStop(stopToDelete.id);
          }
        }}
        title="Xác nhận xóa trạm dừng"
        message={`Bạn có chắc chắn muốn xóa trạm "${stopToDelete?.name}"? Thứ tự các trạm phía sau sẽ được tự động cập nhật lại, và các mức giá vé liên quan đến trạm này sẽ bị gỡ bỏ.`}
        confirmText="Xác nhận xóa trạm"
        variant="danger"
      />
    </div>
  );
};
