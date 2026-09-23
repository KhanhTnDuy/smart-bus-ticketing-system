'use client';

import React, { useState, useMemo } from 'react';
import { TicketPrice, VehicleType } from '@/types/route';
import { useRouteContext } from '@/context/RouteContext';
import { PriceModal } from '@/components/routes/PriceModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { VehicleBadge } from '@/components/common/Badge';
import { formatCurrencyVND } from '@/utils/formatters';
import {
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

export const PricingTab: React.FC = () => {
  const {
    routes,
    selectedRouteId,
    setSelectedRouteId,
    getStopsByRoute,
    getPricesByRoute,
    addPrice,
    updatePrice,
    deletePrice,
    generateDefaultPrices,
  } = useRouteContext();

  const [filterVehicleType, setFilterVehicleType] = useState<VehicleType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<TicketPrice | null>(null);
  const [priceToDelete, setPriceToDelete] = useState<TicketPrice | null>(null);

  // Inline editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlinePriceValue, setInlinePriceValue] = useState<number>(0);

  // Active route
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
  }, [routes, selectedRouteId]);

  // Stops of active route
  const currentStops = useMemo(() => {
    if (!activeRoute) return [];
    return getStopsByRoute(activeRoute.id);
  }, [activeRoute, getStopsByRoute]);

  // Prices of active route
  const currentPrices = useMemo(() => {
    if (!activeRoute) return [];
    return getPricesByRoute(activeRoute.id);
  }, [activeRoute, getPricesByRoute]);

  // Filtered prices
  const filteredPrices = useMemo(() => {
    return currentPrices.filter((price) => {
      const matchVehicle = filterVehicleType === 'all' || price.vehicleType === filterVehicleType;
      const matchSearch =
        searchTerm === '' ||
        price.fromStopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        price.toStopName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchVehicle && matchSearch;
    });
  }, [currentPrices, filterVehicleType, searchTerm]);

  // Counts by vehicle type
  const countsByVehicle = useMemo(() => {
    const seat = currentPrices.filter((p) => p.vehicleType === 'seat').length;
    const sleeper = currentPrices.filter((p) => p.vehicleType === 'sleeper').length;
    const limousine = currentPrices.filter((p) => p.vehicleType === 'limousine').length;
    return { all: currentPrices.length, seat, sleeper, limousine };
  }, [currentPrices]);

  const handleOpenAddModal = () => {
    setEditingPrice(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: TicketPrice) => {
    setEditingPrice(item);
    setIsModalOpen(true);
  };

  const handleSubmitModal = (data: Omit<TicketPrice, 'id' | 'updatedAt'>) => {
    if (editingPrice) {
      updatePrice(editingPrice.id, data);
    } else {
      addPrice(data);
    }
  };

  const handleStartInlineEdit = (item: TicketPrice) => {
    setInlineEditingId(item.id);
    setInlinePriceValue(item.price);
  };

  const handleSaveInlineEdit = (id: string) => {
    if (inlinePriceValue > 0) {
      updatePrice(id, { price: inlinePriceValue });
    }
    setInlineEditingId(null);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Selector bar & Route Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Chọn tuyến đường cần quản lý giá vé:
            </label>
            <div className="relative">
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition-colors"
              >
                {routes.map((route) => {
                  const priceCount = getPricesByRoute(route.id).length;
                  return (
                    <option key={route.id} value={route.id}>
                      [{route.code}] {route.name} ({priceCount} mức giá vé)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => activeRoute && generateDefaultPrices(activeRoute.id)}
              disabled={!activeRoute || currentStops.length < 2}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              title="Tự động tính toán và tạo giá vé theo cự ly cho tất cả các cặp chặng còn thiếu"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Tự động sinh bảng giá</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              disabled={!activeRoute || currentStops.length < 2}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mức giá chặng</span>
            </button>
          </div>
        </div>

        {/* Vehicle Type Tabs */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setFilterVehicleType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterVehicleType === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả hạng xe ({countsByVehicle.all})
            </button>
            <button
              onClick={() => setFilterVehicleType('seat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterVehicleType === 'seat'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ghế ngồi ({countsByVehicle.seat})
            </button>
            <button
              onClick={() => setFilterVehicleType('sleeper')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterVehicleType === 'sleeper'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Giường nằm ({countsByVehicle.sleeper})
            </button>
            <button
              onClick={() => setFilterVehicleType('limousine')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterVehicleType === 'limousine'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Limousine VIP ({countsByVehicle.limousine})
            </button>
          </div>

          {/* Search by stop */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Lọc theo tên trạm..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Pricing Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Bảng giá vé niêm yết theo từng cặp chặng xe
            </h3>
            <span className="text-xs text-slate-400">
              (Nhấp đúp hoặc bấm bút chì để sửa nhanh giá tiền)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Chặng hành trình (Trạm đi ➔ Trạm đến)</th>
                <th className="py-3.5 px-4 text-center">Hạng ghế / Loại xe</th>
                <th className="py-3.5 px-4 text-center">Giá vé niêm yết (VNĐ)</th>
                <th className="py-3.5 px-4 text-center">Trạng thái áp dụng</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredPrices.length > 0 ? (
                filteredPrices.map((price) => {
                  const isInlineEditing = inlineEditingId === price.id;

                  return (
                    <tr
                      key={price.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Chặng hành trình */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{price.fromStopName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="font-semibold text-slate-900">{price.toStopName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Tuyến [{activeRoute?.code}] • Cập nhật lúc {new Date(price.updatedAt).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Loại xe */}
                      <td className="py-4 px-4 text-center">
                        <VehicleBadge type={price.vehicleType} />
                      </td>

                      {/* Giá vé với Inline Editing */}
                      <td className="py-4 px-4 text-center">
                        {isInlineEditing ? (
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1000"
                              step="5000"
                              value={inlinePriceValue}
                              onChange={(e) => setInlinePriceValue(Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveInlineEdit(price.id);
                                if (e.key === 'Escape') handleCancelInlineEdit();
                              }}
                              autoFocus
                              className="w-32 px-2 py-1 text-sm font-bold border border-emerald-500 rounded-lg text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                            <button
                              onClick={() => handleSaveInlineEdit(price.id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                              title="Lưu giá (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelInlineEdit}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                              title="Hủy (Esc)"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => handleStartInlineEdit(price)}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer group/price"
                            title="Nhấp đúp để sửa giá nhanh"
                          >
                            <span className="font-extrabold text-slate-900 group-hover/price:text-emerald-700 tracking-tight text-sm">
                              {formatCurrencyVND(price.price)}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-400 group-hover/price:text-emerald-600 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Trạng thái áp dụng */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => updatePrice(price.id, { isActive: !price.isActive })}
                          className="cursor-pointer transition-transform active:scale-95"
                          title="Nhấp để bật/tắt áp dụng mức giá này"
                        >
                          {price.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Đang áp dụng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <AlertCircle className="w-3 h-3 text-slate-400" />
                              Tạm ngưng
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(price)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Sửa cấu hình giá chi tiết"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPriceToDelete(price)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa mức giá này"
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
                  <td colSpan={5} className="py-12 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold text-slate-800">
                        Chưa có giá vé phù hợp cho bộ lọc này
                      </p>
                      <p className="text-xs text-slate-500">
                        Bạn có thể thêm thủ công mức giá cho từng chặng hoặc sử dụng tính năng sinh tự động theo cự ly trạm dừng.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {currentStops.length >= 2 && (
                          <button
                            onClick={() => activeRoute && generateDefaultPrices(activeRoute.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Sinh tự động đầy đủ</span>
                          </button>
                        )}
                        <button
                          onClick={handleOpenAddModal}
                          disabled={currentStops.length < 2}
                          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                        >
                          Thêm mức giá mới
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Modal */}
      <PriceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitModal}
        routeId={activeRoute?.id || ''}
        stops={currentStops}
        initialData={editingPrice}
        defaultVehicleType={filterVehicleType !== 'all' ? filterVehicleType : 'sleeper'}
      />

      {/* Delete Price Modal */}
      <ConfirmModal
        isOpen={Boolean(priceToDelete)}
        onClose={() => setPriceToDelete(null)}
        onConfirm={() => {
          if (priceToDelete) {
            deletePrice(priceToDelete.id);
          }
        }}
        title="Xác nhận xóa mức giá vé"
        message={`Bạn có chắc chắn muốn xóa giá vé chặng "${priceToDelete?.fromStopName} ➔ ${priceToDelete?.toStopName}" với mức giá ${formatCurrencyVND(priceToDelete?.price || 0)}?`}
        confirmText="Xác nhận xóa"
        variant="danger"
      />
    </div>
  );
};
