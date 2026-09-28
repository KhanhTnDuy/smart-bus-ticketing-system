'use client';

import React, { useState, useEffect } from 'react';
import { TicketPrice, VehicleType, Stop } from '@/types/route';
import { VEHICLE_TYPE_CONFIG, formatCurrencyVND } from '@/utils/formatters';
import { X, DollarSign, AlertCircle, ArrowRight } from 'lucide-react';

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TicketPrice, 'id' | 'updatedAt'>) => void;
  routeId: string;
  stops: Stop[];
  initialData?: TicketPrice | null;
  defaultVehicleType?: VehicleType;
}

export const PriceModal: React.FC<PriceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  routeId,
  stops,
  initialData,
  defaultVehicleType = 'sleeper',
}) => {
  const isEditing = Boolean(initialData);

  const [fromStopId, setFromStopId] = useState('');
  const [toStopId, setToStopId] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>(defaultVehicleType);
  const [price, setPrice] = useState<number>(200000);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFromStopId(initialData.fromStopId);
      setToStopId(initialData.toStopId);
      setVehicleType(initialData.vehicleType);
      setPrice(initialData.price);
      setIsActive(initialData.isActive);
    } else {
      if (stops.length >= 2) {
        setFromStopId(stops[0].id);
        setToStopId(stops[stops.length - 1].id);
      } else {
        setFromStopId('');
        setToStopId('');
      }
      setVehicleType(defaultVehicleType);
      setPrice(220000);
      setIsActive(true);
    }
    setErrors({});
  }, [initialData, stops, defaultVehicleType, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!fromStopId) {
      newErrors.fromStop = 'Vui lòng chọn trạm xuất phát';
    }

    if (!toStopId) {
      newErrors.toStop = 'Vui lòng chọn trạm đến';
    }

    if (fromStopId && toStopId && fromStopId === toStopId) {
      newErrors.toStop = 'Trạm đến phải khác trạm xuất phát';
    }

    if (!price || price <= 0) {
      newErrors.price = 'Giá vé phải lớn hơn 0 VNĐ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const fromStop = stops.find((s) => s.id === fromStopId);
    const toStop = stops.find((s) => s.id === toStopId);

    onSubmit({
      routeId,
      fromStopId,
      toStopId,
      fromStopName: fromStop?.name || 'Trạm đi',
      toStopName: toStop?.name || 'Trạm đến',
      vehicleType,
      price: Number(price),
      isActive,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Chỉnh sửa Mức giá Chặng' : 'Thiết lập Giá vé Mới'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Cập nhật giá cước áp dụng cho cặp chặng và loại xe đã chọn'
                  : 'Cấu hình giá cước giữa hai trạm dừng trên tuyến xe'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Cặp chặng: Từ trạm -> Đến trạm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Trạm xuất phát <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromStopId}
                onChange={(e) => setFromStopId(e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 font-medium bg-white disabled:bg-slate-100"
              >
                <option value="">-- Chọn trạm đi --</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    #{stop.orderIndex}. {stop.name}
                  </option>
                ))}
              </select>
              {errors.fromStop && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fromStop}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Trạm đến <span className="text-rose-500">*</span>
              </label>
              <select
                value={toStopId}
                onChange={(e) => setToStopId(e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 font-medium bg-white disabled:bg-slate-100"
              >
                <option value="">-- Chọn trạm đến --</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    #{stop.orderIndex}. {stop.name}
                  </option>
                ))}
              </select>
              {errors.toStop && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.toStop}
                </p>
              )}
            </div>
          </div>

          {/* Chọn Loại xe */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Hạng ghế / Loại xe áp dụng <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['seat', 'sleeper', 'limousine'] as VehicleType[]).map((type) => {
                const config = VEHICLE_TYPE_CONFIG[type];
                const isSelected = vehicleType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-400/20 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="text-xs block font-semibold">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nhập Giá vé & Preview VND */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Giá vé niêm yết (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="5000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 pr-14 text-base font-bold border rounded-xl focus:outline-none focus:ring-2 ${
                  errors.price
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-emerald-100 focus:border-emerald-500'
                }`}
              />
              <span className="absolute right-3.5 top-3 text-xs text-slate-400 font-bold">VNĐ</span>
            </div>

            {/* Live VND Currency Preview */}
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">Hiển thị khi bán vé:</span>
              <span className="text-sm font-extrabold text-emerald-600">
                {formatCurrencyVND(price)}
              </span>
            </div>

            {errors.price && (
              <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.price}
              </p>
            )}
          </div>

          {/* Trạng thái áp dụng */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Áp dụng ngay cho hành khách đặt vé
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
            >
              {isEditing ? 'Lưu thay đổi giá' : 'Tạo mức giá vé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
