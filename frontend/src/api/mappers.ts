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

import { AuditLog, AuditModule, AuditStatus, BusRoute, BusStop, Fare, PassengerType, RouteStatus } from '../types';
import { AuditActionTypeCode, AuditLogDto, AuditStatusCode } from './auditLogs';
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

// ---------- Nhật ký hệ thống (US2) ----------

const AUDIT_STATUS_BY_CODE: Record<AuditStatusCode, AuditStatus> = {
  [AuditStatusCode.Success]: 'SUCCESS',
  [AuditStatusCode.Failure]: 'FAILURE',
  [AuditStatusCode.Warning]: 'WARNING',
};

/**
 * EF đọc cột datetime từ SQL Server ra với DateTimeKind.Unspecified, nên chuỗi
 * JSON thường không có hậu tố "Z" dù giá trị được ghi bằng DateTime.UtcNow.
 * Nếu để nguyên, `new Date(...)` sẽ hiểu là giờ địa phương và lệch đúng bằng
 * chênh lệch múi giờ. Vì vậy chuỗi không kèm offset được gắn thêm "Z".
 */
const parseUtc = (value: string): Date => {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Hiển thị theo giờ địa phương, dạng DD/MM/YYYY HH:mm:ss. */
const formatLocal = (date: Date): string =>
  Number.isNaN(date.getTime())
    ? ''
    : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

/**
 * Backend không lưu "phân hệ" (module) — kiểu AuditLog của frontend lại cần.
 * Giá trị được suy ra từ tiền tố của TargetResource và loại thao tác, dựa trên
 * các chỗ gọi AuditLogService.WriteAsync hiện có trong backend.
 *
 * Lưu ý: RouteManagementControllers chưa ghi nhật ký, nên các phân hệ ROUTE,
 * STOP và FARE sẽ không bao giờ xuất hiện cho tới khi backend bổ sung.
 */
const auditModuleOf = (dto: AuditLogDto): AuditModule => {
  const target = dto.targetResource ?? '';

  if (dto.actionType === AuditActionTypeCode.Login || dto.actionType === AuditActionTypeCode.Logout) {
    return 'AUTH';
  }
  if (target.startsWith('FEEDBACK-') || dto.actionType === AuditActionTypeCode.FeedbackSubmit) {
    return 'COMPLAINT';
  }
  if (target.startsWith('USR-')) {
    return dto.actionType === AuditActionTypeCode.StatusChange ? 'ROLE' : 'ACCOUNT';
  }
  if (dto.actionType === AuditActionTypeCode.Payment) return 'PAYMENT';
  if (dto.actionType === AuditActionTypeCode.TicketBuy) return 'TICKET';
  return 'SYSTEM';
};

export const toAuditLog = (dto: AuditLogDto): AuditLog => ({
  id: String(dto.id),
  user: dto.username,
  action: dto.action,
  module: auditModuleOf(dto),
  // Backend hiện chưa truyền `details` ở chỗ nào, nên phần lớn bản ghi sẽ rơi
  // vào nhánh mô tả đối tượng tác động.
  description: dto.details?.trim() || (dto.targetResource ? `Đối tượng: ${dto.targetResource}` : ''),
  dateTime: formatLocal(parseUtc(dto.createdAt)),
  status: AUDIT_STATUS_BY_CODE[dto.status] ?? 'WARNING',
  ipAddress: dto.ipAddress ?? undefined,
  targetId: dto.targetResource ?? undefined,
});
