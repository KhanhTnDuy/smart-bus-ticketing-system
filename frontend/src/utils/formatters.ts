import { VehicleType, VehicleTypeInfo } from '@/types/route';

/**
 * Định dạng số tiền sang chuẩn tiền tệ Việt Nam (VNĐ)
 * Ví dụ: 150000 -> "150.000 ₫"
 */
export function formatCurrencyVND(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Định dạng khoảng cách kilomet
 * Ví dụ: 310 -> "310 km"
 */
export function formatDistance(km: number): string {
  if (!km && km !== 0) return '0 km';
  return `${km.toLocaleString('vi-VN')} km`;
}

/**
 * Định dạng thời gian dừng
 * Ví dụ: 15 -> "15 phút"
 */
export function formatStopDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return 'Dừng trả/đón nhanh';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} giờ`;
}

export const VEHICLE_TYPE_CONFIG: Record<VehicleType, VehicleTypeInfo> = {
  seat: {
    type: 'seat',
    label: 'Ghế ngồi',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    description: 'Ghế ngồi êm ái, điều hòa, nước uống',
  },
  sleeper: {
    type: 'sleeper',
    label: 'Giường nằm',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    description: 'Giường nằm 40 chỗ, gối đệm êm ái, cổng sạc USB',
  },
  limousine: {
    type: 'limousine',
    label: 'Limousine VIP',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Khoang phòng riêng biệt, massage, màn hình giải trí, rèm che',
  },
};
