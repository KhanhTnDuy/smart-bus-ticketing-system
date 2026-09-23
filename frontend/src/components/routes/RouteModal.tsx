'use client';

import React, { useState, useEffect } from 'react';
import { Route, RouteStatus } from '@/types/route';
import { X, Route as RouteIcon, AlertCircle } from 'lucide-react';

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Route, 'id' | 'stopsCount' | 'createdAt'>) => void;
  initialData?: Route | null;
}

export const RouteModal: React.FC<RouteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditing = Boolean(initialData);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    departure: '',
    destination: '',
    distanceKm: 100,
    estimatedDuration: '',
    status: 'active' as RouteStatus,
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code,
        name: initialData.name,
        departure: initialData.departure,
        destination: initialData.destination,
        distanceKm: initialData.distanceKm,
        estimatedDuration: initialData.estimatedDuration,
        status: initialData.status,
        description: initialData.description || '',
      });
    } else {
      setFormData({
        code: '',
        name: '',
        departure: '',
        destination: '',
        distanceKm: 150,
        estimatedDuration: '4 giờ 00 phút',
        status: 'active',
        description: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Mã tuyến không được để trống (ví dụ: SG-DL01)';
    } else if (formData.code.length < 3) {
      newErrors.code = 'Mã tuyến phải có ít nhất 3 ký tự';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Tên tuyến xe không được để trống';
    }

    if (!formData.departure.trim()) {
      newErrors.departure = 'Điểm xuất phát không được để trống';
    }

    if (!formData.destination.trim()) {
      newErrors.destination = 'Điểm đến không được để trống';
    }

    if (formData.departure.trim() && formData.destination.trim() && formData.departure.trim() === formData.destination.trim()) {
      newErrors.destination = 'Điểm đến không được trùng với điểm xuất phát';
    }

    if (!formData.distanceKm || formData.distanceKm <= 0) {
      newErrors.distanceKm = 'Quãng đường phải lớn hơn 0 km';
    }

    if (!formData.estimatedDuration.trim()) {
      newErrors.estimatedDuration = 'Vui lòng nhập thời gian di chuyển dự kiến';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      departure: formData.departure.trim(),
      destination: formData.destination.trim(),
      distanceKm: Number(formData.distanceKm),
      estimatedDuration: formData.estimatedDuration.trim(),
      status: formData.status,
      description: formData.description.trim(),
    });
    onClose();
  };

  // Auto-generate name when departure & destination change if name is empty
  const handleAutoFillName = (dep: string, des: string) => {
    if (!isEditing && (!formData.name || formData.name === `${formData.departure} - ${formData.destination}`)) {
      if (dep && des) {
        setFormData((prev) => ({ ...prev, name: `${dep} - ${des}` }));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
              <RouteIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Chỉnh sửa Tuyến đường' : 'Thêm Tuyến đường Mới'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Cập nhật lộ trình, khoảng cách và thời gian di chuyển của tuyến'
                  : 'Khai báo thông tin lộ trình tuyến xe khách liên tỉnh mới'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã tuyến */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã tuyến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="VD: SG-DL01"
                className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 uppercase tracking-wide font-medium ${
                  errors.code
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-brand-100 focus:border-brand-500'
                }`}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.code}
                </p>
              )}
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Trạng thái vận hành <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RouteStatus })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 font-medium bg-white"
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm dừng vận hành</option>
              </select>
            </div>
          </div>

          {/* Tên tuyến */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên tuyến hiển thị <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: TP. Hồ Chí Minh - Đà Lạt"
              className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 font-medium ${
                errors.name
                  ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-brand-100 focus:border-brand-500'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Điểm xuất phát */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Điểm xuất phát (Tỉnh/Thành) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.departure}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, departure: val });
                  handleAutoFillName(val, formData.destination);
                }}
                placeholder="VD: TP. Hồ Chí Minh"
                className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 ${
                  errors.departure
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-brand-100 focus:border-brand-500'
                }`}
              />
              {errors.departure && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.departure}
                </p>
              )}
            </div>

            {/* Điểm đến */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Điểm đến (Tỉnh/Thành) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, destination: val });
                  handleAutoFillName(formData.departure, val);
                }}
                placeholder="VD: Đà Lạt (Lâm Đồng)"
                className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 ${
                  errors.destination
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-brand-100 focus:border-brand-500'
                }`}
              />
              {errors.destination && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.destination}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quãng đường (km) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Quãng đường (km) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.distanceKm}
                  onChange={(e) => setFormData({ ...formData, distanceKm: Number(e.target.value) })}
                  className={`w-full px-3.5 py-2 pr-12 text-sm border rounded-xl focus:outline-none focus:ring-2 font-medium ${
                    errors.distanceKm
                      ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-brand-100 focus:border-brand-500'
                  }`}
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold">km</span>
              </div>
              {errors.distanceKm && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.distanceKm}
                </p>
              )}
            </div>

            {/* Thời gian dự kiến */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Thời gian dự kiến <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="VD: 6 giờ 30 phút"
                className={`w-full px-3.5 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 font-medium ${
                  errors.estimatedDuration
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-brand-100 focus:border-brand-500'
                }`}
              />
              {errors.estimatedDuration && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.estimatedDuration}
                </p>
              )}
            </div>
          </div>

          {/* Mô tả / Lộ trình tóm tắt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô tả chi tiết / Tuyến cao tốc & quốc lộ
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="VD: Tuyến chạy qua QL20 và cao tốc Liên Khương - Prenn..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500 text-slate-700"
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
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-md shadow-brand-600/20"
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo tuyến đường'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
