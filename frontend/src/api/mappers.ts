/**
 * Chuyển đổi giữa DTO của backend (US3) và kiểu dữ liệu sẵn có của frontend.
 *
 * Một số trường trong kiểu frontend không có chỗ lưu ở backend. Chúng được điền
 * giá trị suy ra hoặc để trống, và form không còn thu thập chúng nữa:
 *
 * - BusRoute.durationMinutes / operatingHours / frequencyMinutes
 *   thuộc về lịch trình (bảng schedules, user story "Lập lịch trình"), không phải
 *   thuộc tính của tuyến. Bảng routes chỉ có code, name, start_point, end_point,
 *   distance_km, active.
 * - BusRoute.description: bảng routes không có cột này.
 * - BusStop.address và BusStop.status: bảng stops chỉ có name, latitude, longitude.
 * - BusStop.isTerminal: suy ra từ thứ tự dừng (trạm đầu hoặc trạm cuối của tuyến).
 * - Fare.notes: bảng fares không có cột này.
 */

import { BusRoute, BusStop, Fare, PassengerType, RouteStatus } from '../types';
import { FareDto, RouteDto, RouteStopDto, TicketTypeName } from './routeManagement';

// ---------- Tuyến đường ----------

export const toBusRoute = (dto: RouteDto): BusRoute => ({
  id: String(dto.id),
  code: dto.code,
  routeCode: dto.code,
  name: dto.name,
  startPoint: dto.startPoint,
  endPoint: dto.endPoint,
  distance: dto.distanceKm,
  status: dto.active ? 'ACTIVE' : 'SUSPENDED',
  stopCount: dto.stopCount,
  // Các trường backend chưa lưu:
  durationMinutes: 0,
  operatingHours: '',
  frequencyMinutes: 0,
  description: '',
});

export interface RouteFormValues {
  code: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distance: number;
  status: RouteStatus;
}

export const toRouteRequest = (form: RouteFormValues) => ({
  code: form.code.trim(),
  name: form.name.trim(),
  startPoint: form.startPoint.trim(),
  endPoint: form.endPoint.trim(),
  distanceKm: Number(form.distance),
  active: form.status === 'ACTIVE',
});

// ---------- Trạm dừng của một tuyến ----------

/** Trạm của tuyến, kèm thứ tự dừng. `total` để suy ra trạm cuối tuyến. */
export const toBusStop = (dto: RouteStopDto, routeId: string, total: number): BusStop => ({
  id: String(dto.stopId),
  name: dto.stopName,
  routeId,
  order: dto.stopOrder,
  latitude: dto.latitude,
  longitude: dto.longitude,
  isTerminal: dto.stopOrder === 1 || dto.stopOrder === total,
  // Các trường backend chưa lưu:
  address: '',
  status: 'ACTIVE',
});

export const toBusStops = (dtos: RouteStopDto[], routeId: string): BusStop[] => {
  const ordered = [...dtos].sort((a, b) => a.stopOrder - b.stopOrder);
  return ordered.map((dto) => toBusStop(dto, routeId, ordered.length));
};

// ---------- Giá vé ----------

const PASSENGER_TYPE_BY_CODE: Record<string, PassengerType> = {
  STANDARD: 'REGULAR',
  STUDENT: 'STUDENT',
  ELDERLY: 'ELDERLY_DISABLED',
  WORKER: 'MONTHLY_PASS',
};

const CODE_BY_PASSENGER_TYPE: Record<PassengerType, string> = {
  REGULAR: 'STANDARD',
  STUDENT: 'STUDENT',
  ELDERLY_DISABLED: 'ELDERLY',
  MONTHLY_PASS: 'WORKER',
};

/** Vé tháng dùng loại vé Monthly, các đối tượng còn lại dùng vé lượt. */
export const ticketTypeFor = (passengerType: PassengerType): TicketTypeName =>
  passengerType === 'MONTHLY_PASS' ? 'Monthly' : 'Single';

export const passengerTypeFromCode = (code: string): PassengerType =>
  PASSENGER_TYPE_BY_CODE[code?.toUpperCase()] ?? 'REGULAR';

export const codeFromPassengerType = (passengerType: PassengerType): string =>
  CODE_BY_PASSENGER_TYPE[passengerType] ?? 'STANDARD';

export const toFare = (dto: FareDto): Fare => ({
  id: String(dto.id),
  routeId: String(dto.routeId),
  passengerType: passengerTypeFromCode(dto.passengerTypeCode),
  price: dto.price,
  effectiveDate: String(dto.effectiveFrom).slice(0, 10),
  status: (dto.status as Fare['status']) ?? 'ACTIVE',
});
