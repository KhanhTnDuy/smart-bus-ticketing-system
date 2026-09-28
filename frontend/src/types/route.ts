export type RouteStatus = 'active' | 'inactive';

export type VehicleType = 'seat' | 'sleeper' | 'limousine';

export interface VehicleTypeInfo {
  type: VehicleType;
  label: string;
  badgeColor: string;
  iconName?: string;
  description: string;
}

export interface Stop {
  id: string;
  routeId: string;
  orderIndex: number; // Thứ tự trạm (1, 2, 3...)
  name: string;
  address: string;
  stopDurationMinutes: number; // Thời gian dừng đón/trả khách hoặc nghỉ ngơi
  distanceFromStartKm: number; // Khoảng cách tích lũy từ điểm xuất phát (km)
  note?: string;
}

export interface TicketPrice {
  id: string;
  routeId: string;
  fromStopId: string;
  toStopId: string;
  fromStopName: string;
  toStopName: string;
  vehicleType: VehicleType;
  price: number; // Giá vé tính theo VNĐ
  isActive: boolean;
  updatedAt: string;
}

export interface Route {
  id: string;
  code: string; // Ví dụ: "SG-DL01", "HN-SP02"
  name: string;
  departure: string; // Điểm xuất phát (Tỉnh/Thành)
  destination: string; // Điểm đến (Tỉnh/Thành)
  estimatedDuration: string; // Ví dụ: "6 giờ 30 phút"
  distanceKm: number; // Quãng đường tính theo km
  status: RouteStatus;
  description?: string;
  stopsCount?: number;
  createdAt: string;
}

export interface RouteStatistics {
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  totalStops: number;
  totalPricingRules: number;
}
