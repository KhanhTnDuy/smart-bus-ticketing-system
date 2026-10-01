/**
 * US3 - Quản lý tuyến đường, trạm dừng và giá vé.
 *
 * Các kiểu dưới đây khớp 1-1 với DTO của backend
 * (backend/SmartBusTicketing.Api/DTOs/RouteManagementDtos.cs).
 */

import { api } from './client';

// ---------- Kiểu dữ liệu theo DTO backend ----------

export interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface RouteDto {
  id: number;
  code: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  active: boolean;
  stopCount: number;
}

export interface RouteRequest {
  code: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceKm: number;
  active: boolean;
}

export interface StopDto {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface StopRequest {
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteStopDto {
  stopId: number;
  stopName: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
  minutesFromStart: number;
}

export interface RouteStopItem {
  stopId: number;
  minutesFromStart: number;
}

export interface PassengerTypeDto {
  id: number;
  code: string;
  name: string;
  discountPercent: number;
}

export type TicketTypeName = 'Single' | 'Monthly';

export interface FareDto {
  id: number;
  routeId: number;
  ticketType: string;
  passengerTypeId: number;
  passengerTypeCode: string;
  passengerTypeName: string;
  price: number;
  effectiveFrom: string; // YYYY-MM-DD
  status: string; // ACTIVE | UPCOMING | EXPIRED
}

export interface FareRequest {
  routeId: number;
  ticketType: TicketTypeName;
  passengerTypeId: number;
  price: number;
  effectiveFrom: string; // YYYY-MM-DD
}

// Backend giới hạn pageSize tối đa 100. Ba trang quản trị hiện lọc và sắp xếp
// tại client nên tải trọn danh mục bằng cách lặp qua từng trang.
const PAGE_SIZE = 100;

async function fetchAllPages<T>(
  path: string,
  query: Record<string, string | number | boolean | null | undefined>,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  for (;;) {
    const result = await api.get<PagedResponse<T>>(path, { ...query, page, pageSize: PAGE_SIZE }, signal);
    items.push(...result.data);
    if (items.length >= result.total || result.data.length === 0) break;
    page += 1;
  }

  return items;
}

// ---------- Tuyến đường ----------

export const listRoutes = (signal?: AbortSignal) => fetchAllPages<RouteDto>('/api/routes', {}, signal);

export const createRoute = (body: RouteRequest) => api.post<RouteDto>('/api/routes', body);

export const updateRoute = (id: number, body: RouteRequest) => api.put<RouteDto>(`/api/routes/${id}`, body);

export const deleteRoute = (id: number) => api.del(`/api/routes/${id}`);

// ---------- Trạm dừng (danh mục dùng chung) ----------

export const listStops = (signal?: AbortSignal) => fetchAllPages<StopDto>('/api/stops', {}, signal);

export const createStop = (body: StopRequest) => api.post<StopDto>('/api/stops', body);

export const updateStop = (id: number, body: StopRequest) => api.put<StopDto>(`/api/stops/${id}`, body);

export const deleteStop = (id: number) => api.del(`/api/stops/${id}`);

// ---------- Trạm theo tuyến (thứ tự dừng) ----------

export const listRouteStops = (routeId: number, signal?: AbortSignal) =>
  api.get<RouteStopDto[]>(`/api/routes/${routeId}/stops`, undefined, signal);

/** Thay toàn bộ danh sách trạm của tuyến; phần tử đầu tiên là StopOrder 1. */
export const replaceRouteStops = (routeId: number, stops: RouteStopItem[]) =>
  api.put<RouteStopDto[]>(`/api/routes/${routeId}/stops`, { stops });

// ---------- Đối tượng hành khách ----------

export const listPassengerTypes = (signal?: AbortSignal) =>
  api.get<PassengerTypeDto[]>('/api/passenger-types', undefined, signal);

// ---------- Giá vé ----------

export const listFares = (routeId?: number, signal?: AbortSignal) =>
  api.get<FareDto[]>('/api/fares', routeId ? { routeId } : undefined, signal);

export const createFare = (body: FareRequest) => api.post<FareDto>('/api/fares', body);

export const updateFare = (id: number, body: FareRequest) => api.put<FareDto>(`/api/fares/${id}`, body);

export const deleteFare = (id: number) => api.del(`/api/fares/${id}`);
