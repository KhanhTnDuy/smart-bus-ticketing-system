/**
 * Bảng giá vé niêm yết theo số km hành trình.
 *
 * Khớp với backend DistanceFaresController (/api/distance-fares). Xem bảng giá là công khai; thêm, sửa, xóa bậc giá chỉ Admin và Quản lý.
 */

import { api } from './client';

/** Một bậc giá: hành trình trên fromKm và không quá toKm thì giá là price (toKm rỗng là bậc cuối). */
export interface DistanceFare {
  id: number;
  fromKm: number;
  toKm: number | null;
  price: number;
}

export interface DistanceFareRequest {
  fromKm: number;
  toKm: number | null;
  price: number;
}

export interface FareStop {
  stopId: number;
  stopName: string;
  stopOrder: number;
  distanceFromStartKm: number | null;
}

export interface FarePrice {
  passengerTypeId: number;
  passengerTypeCode: string;
  passengerTypeName: string;
  discountPercent: number;
  price: number;
}

export interface FareLeg {
  fromStopId: number;
  fromStopName: string;
  toStopId: number;
  toStopName: string;
  distanceKm: number;
  /** Rỗng khi km của chặng không rơi vào bậc nào của bảng giá. */
  prices: FarePrice[];
}

export interface RouteFareMatrix {
  routeId: number;
  routeCode: string;
  routeName: string;
  distanceKm: number;
  stops: FareStop[];
  legs: FareLeg[];
}

export const listDistanceFares = (signal?: AbortSignal) => api.get<DistanceFare[]>('/api/distance-fares', undefined, signal);

export const getRouteFareMatrix = (routeId: number, signal?: AbortSignal) =>
  api.get<RouteFareMatrix>(`/api/distance-fares/routes/${routeId}`, undefined, signal);

export const createDistanceFare = (body: DistanceFareRequest) => api.post<DistanceFare>('/api/distance-fares', body);

export const updateDistanceFare = (id: number, body: DistanceFareRequest) => api.put<DistanceFare>(`/api/distance-fares/${id}`, body);

export const deleteDistanceFare = (id: number) => api.del(`/api/distance-fares/${id}`);

export const formatKm = (km: number) => `${km.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} km`;

/** Mô tả khoảng km của một bậc, vd "Trên 3 đến 8 km", "Đến 3 km", "Trên 20 km". */
export const describeBand = (b: Pick<DistanceFare, 'fromKm' | 'toKm'>): string => {
  if (b.toKm === null) return `Trên ${formatKm(b.fromKm)}`;
  if (b.fromKm === 0) return `Đến ${formatKm(b.toKm)}`;
  return `Trên ${b.fromKm.toLocaleString('vi-VN')} đến ${formatKm(b.toKm)}`;
};

/**
 * Các khoảng km còn thiếu giá (kể cả phần trên bậc cuối nếu bậc cuối có giới hạn): hành trình rơi vào đây không có giá theo km nên
 * hệ thống quay về giá cố định của tuyến. Dùng để cảnh báo quản lý khi lập bảng giá.
 */
export const findFareGaps = (bands: DistanceFare[]): string[] => {
  const sorted = [...bands].sort((a, b) => a.fromKm - b.fromKm);
  const gaps: string[] = [];
  let cursor = 0;
  for (const b of sorted) {
    if (b.fromKm > cursor) gaps.push(`${formatKm(cursor)} đến ${formatKm(b.fromKm)}`);
    if (b.toKm === null) return gaps;
    cursor = Math.max(cursor, b.toKm);
  }
  gaps.push(`Trên ${formatKm(cursor)}`);
  return gaps;
};
