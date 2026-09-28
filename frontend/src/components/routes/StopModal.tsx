'use client';

import React, { useState, useEffect } from 'react';
import { Stop } from '@/types/route';
import { X, MapPin, AlertCircle } from 'lucide-react';

interface StopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Stop, 'id' | 'orderIndex'>) => void;
  routeId: string;
  initialData?: Stop | null;
  suggestedDistance?: number;
}

export const StopModal: React.FC<StopModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  routeId,
  initialData,
  suggestedDistance = 0,
}) => {
  const isEditing = Boolean(initialData);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    stopDurationMinutes: 15,
    distanceFromStartKm: 0,
    note: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        address: initialData.address,
        stopDurationMinutes: initialData.stopDurationMinutes,
        distanceFromStartKm: initialData.distanceFromStartKm,
        note: initialData.note || '',
      });
    } else {
      setFormData({
        name: '',
        address: '',
        stopDurationMinutes: 15,
        distanceFromStartKm: suggestedDistance,
        note: '',
      });
    }
    setErrors({});
  }, [initialData, suggestedDistance, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên trạm dừng không được để trống';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Địa chỉ / vị trí trạm không được để trống';
    }

    if (formData.stopDurationMinutes < 0) {
      newErrors.stopDurationMinutes = 'Thời gian dừng không thể là số âm';
    }

    if (formData.distanceFromStartKm < 0) {
      newErrors.distanceFromStartKm = 'Khoảng cách không thể là số âm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      routeId,
      name: formData.name.trim(),
      address: formData.address.trim(),
      stopDurationMinutes: Number(formData.stopDurationMinutes),
      distanceFromStartKm: Number(formData.distanceFromStartKm),
      note: formData.note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Chỉnh sửa Trạm dừng' : 'Thêm Trạm dừng Mới'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Cập nhật tên trạm, địa điểm đón trả và thời gian dừng'
                  : 'Khai báo điểm đón trả khách hoặc trạm dừng chân trên tuyến'}
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
          {/* Tên trạm */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên trạm dừng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Trạm dừng chân Bảo Lộc (Tâm Châu)"
              className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 font-medium ${
                errors.name
                  ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.name}
              </p>
            )}
          </div>

          {/* Địa chỉ / Vị trí */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Địa chỉ chi tiết / Vị trí đón trả <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="VD: Số 294A Trần Phú, P. 1, TP. Bảo Lộc, Lâm Đồng"
              className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 ${
                errors.address
                  ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {errors.address && (
              <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.address}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Thời gian dừng dự kiến (phút) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Thời gian dừng (phút)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.stopDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, stopDurationMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 pr-14 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">phút</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">0 = Trả/đón nhanh ven đường</p>
            </div>

            {/* Khoảng cách từ điểm xuất phát */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Cách điểm đi (km)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.distanceFromStartKm}
                  onChange={(e) => setFormData({ ...formData, distanceFromStartKm: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 pr-12 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">km</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Khoảng cách tích lũy tính từ trạm 1</p>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú hoạt động của trạm
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="VD: Nghỉ ngơi ăn trưa 30 phút, tiếp nhiên liệu..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-700"
            />
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
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
            >
              {isEditing ? 'Lưu cập nhật' : 'Thêm trạm vào tuyến'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
