/**
 * US13-US14 (SCRUM-50 / SCRUM-51 / SCRUM-52): Phân công điều xe, tài xế và phụ xe (Quản lý vận hành).
 *
 * Khớp 1-1 với backend/SmartBusTicketing.Api/Controllers/TripAssignmentsController.cs
 * (/api/assignments) và DTOs/TripAssignmentDtos.cs.
 */

import { api } from './client';
import { BusAssignment, ShiftType, AssignmentStatus } from '../types';

export interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface BusAssignmentInfo {
  id: number;
  plateNumber: string;
  capacity: number;
  status: number;
}

export interface StaffAssignmentInfo {
  accountId: number;
  username: string;
  fullName: string;
  phone?: string | null;
  duty: number;
}

export interface TripAssignmentDto {
  tripId: number;
  id: string; // e.g. "ASN-1"
  rawId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  routeStartPoint?: string;
  routeEndPoint?: string;
  scheduleId?: number | null;
  departureAt: string;
  estimatedArrivalAt: string;
  estimatedDurationMinutes: number;
  status: number | string;
  statusText?: string;
  delayMinutes?: number;

  bus?: BusAssignmentInfo | null;
  driver?: StaffAssignmentInfo | null;
  conductor?: StaffAssignmentInfo | null;

  isFullyAssigned?: boolean;
  hasConductor?: boolean;
  bookedTicketsCount?: number;

  busPlate: string;
  driverId: string;
  driverName: string;
  assistantId?: string | null;
  assistantName?: string | null;
  date: string;
  shift: string;
  shiftHours: string;
  startTime?: string;
  endTime?: string;
  notes?: string | null;
}

// Bí danh tương thích ngược
export type AssignmentDto = TripAssignmentDto;

export interface CreateTripRequest {
  routeId?: number | string;
  routeCode?: string;
  scheduleId?: number;
  departureAt?: string;
  date?: string;
  shift?: string;
  shiftHours?: string;
  busId?: number;
  busPlate?: string;
  driverId?: number;
  driverName?: string;
  conductorId?: number;
  assistantId?: string;
  assistantName?: string;
  notes?: string;
}

// Bí danh tương thích ngược
export type CreateAssignmentRequest = CreateTripRequest;

export interface AssignTripRequest {
  busId?: number;
  driverId?: number;
  conductorId?: number;
  notes?: string;

  busPlate?: string;
  driverName?: string;
  assistantId?: string;
  assistantName?: string;
  routeId?: string | number;
  date?: string;
  shift?: string;
  shiftHours?: string;
  status?: string;
}

// Bí danh tương thích ngược
export type UpdateAssignmentRequest = AssignTripRequest;

export interface UnassignTripRequest {
  unassignBus?: boolean;
  unassignDriver?: boolean;
  unassignConductor?: boolean;
}

export interface ConflictCheckRequest {
  departureAt?: string;
  routeId?: number;
  excludeTripId?: number;
  busId?: number;
  driverId?: number;
  conductorId?: number;

  busPlate?: string;
  driverName?: string;
  assistantId?: string;
  assistantName?: string;
  date?: string;
  shift?: string;
  shiftHours?: string;
  excludeId?: number;
}

// Bí danh tương thích ngược
export type CheckConflictRequest = ConflictCheckRequest;

export interface ConflictCheckResponse {
  hasConflict: boolean;
  conflicts?: string[];
  message?: string;
  conflictType?: string;
  conflictingAssignmentCode?: string;
}

// Bí danh tương thích ngược
export type ConflictCheckResult = ConflictCheckResponse;

export interface AvailableBusDto {
  id: number;
  plateNumber: string;
  capacity: number;
  status: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface AvailableStaffDto {
  accountId: number;
  username: string;
  fullName: string;
  phone?: string | null;
  role: number;
  isAvailable: boolean;
  unavailableReason?: string;
}

/** Chuyển đổi mã chuỗi (vd: "ASN-1", "TRIP-12", "u3", "r1") sang kiểu số long/number */
export const parseNumericId = (val: string | number | undefined | null): number | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return Number.isNaN(val) ? undefined : val;
  const str = String(val).trim();
  const cleaned = str.replace(/^(ASN-|TRIP-|u_|u|r)/i, '').trim();
  const num = parseInt(cleaned, 10);
  return Number.isNaN(num) ? undefined : num;
};

const mapStatusToAssignmentStatus = (status: unknown): AssignmentStatus => {
  if (status === 0 || status === 'Scheduled' || status === 'ASSIGNED') return 'ASSIGNED';
  if (
    status === 1 ||
    status === 'Running' ||
    status === 2 ||
    status === 'Delayed' ||
    status === 'IN_PROGRESS'
  )
    return 'IN_PROGRESS';
  if (status === 3 || status === 'Completed' || status === 'COMPLETED') return 'COMPLETED';
  if (status === 4 || status === 'Cancelled' || status === 'CANCELLED') return 'CANCELLED';
  return 'ASSIGNED';
};

export const toBusAssignment = (dto: TripAssignmentDto): BusAssignment => ({
  id: dto.id || `ASN-${dto.tripId || dto.rawId}`,
  routeId: dto.routeCode || String(dto.routeId),
  busPlate: dto.busPlate || dto.bus?.plateNumber || '',
  driverId: dto.driverId || (dto.driver ? String(dto.driver.accountId) : ''),
  driverName: dto.driverName || dto.driver?.fullName || '',
  assistantId: dto.assistantId || (dto.conductor ? String(dto.conductor.accountId) : undefined),
  assistantName: dto.assistantName || dto.conductor?.fullName || undefined,
  date: dto.date || (dto.departureAt ? dto.departureAt.substring(0, 10) : ''),
  shift: (dto.shift as ShiftType) || 'CA_SANG',
  shiftHours: dto.shiftHours || '',
  status: mapStatusToAssignmentStatus(dto.status),
  notes: dto.notes || undefined,
});

export const toCreateTripRequest = (
  data: Omit<BusAssignment, 'id'>,
  extra?: { busId?: number; driverId?: number; conductorId?: number; routeId?: number },
): CreateTripRequest => {
  const numericRouteId = extra?.routeId ?? parseNumericId(data.routeId);
  const numericDriverId = extra?.driverId ?? parseNumericId(data.driverId);
  const numericConductorId = extra?.conductorId ?? parseNumericId(data.assistantId);

  return {
    routeId: numericRouteId,
    routeCode: numericRouteId === undefined ? data.routeId : undefined,
    busId: extra?.busId,
    busPlate: data.busPlate.trim().toUpperCase(),
    driverId: numericDriverId,
    driverName: data.driverName.trim(),
    conductorId: numericConductorId,
    assistantId: data.assistantId,
    assistantName: data.assistantName?.trim(),
    date: data.date,
    shift: data.shift,
    shiftHours: data.shiftHours,
    notes: data.notes?.trim() || undefined,
  };
};

export const toAssignTripRequest = (
  data: Partial<BusAssignment>,
  extra?: { busId?: number; driverId?: number; conductorId?: number },
): AssignTripRequest => {
  const numericDriverId = extra?.driverId ?? parseNumericId(data.driverId);
  const numericConductorId = extra?.conductorId ?? parseNumericId(data.assistantId);

  return {
    busId: extra?.busId,
    busPlate: data.busPlate?.trim().toUpperCase(),
    driverId: numericDriverId,
    driverName: data.driverName?.trim(),
    conductorId: numericConductorId,
    assistantId: data.assistantId,
    assistantName: data.assistantName?.trim(),
    routeId: data.routeId,
    date: data.date,
    shift: data.shift,
    shiftHours: data.shiftHours,
    status: data.status,
    notes: data.notes?.trim() || undefined,
  };
};

export const toAssignmentRequest = (
  data: Omit<BusAssignment, 'id'>,
  extra?: { busId?: number; driverId?: number; conductorId?: number; routeId?: number },
): AssignTripRequest & CreateTripRequest => ({
  ...toCreateTripRequest(data, extra),
  ...toAssignTripRequest(data, extra),
});

export const listAssignments = async (
  params?: {
    search?: string;
    routeId?: number | string;
    shift?: string;
    status?: string;
    date?: string;
    page?: number;
    pageSize?: number;
  },
  signal?: AbortSignal,
): Promise<TripAssignmentDto[]> => {
  const res = await api.get<PagedResponse<TripAssignmentDto> | TripAssignmentDto[]>(
    '/api/assignments',
    params as Record<string, string | number | boolean | null | undefined>,
    signal,
  );
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
};

export const getAssignment = (id: string | number, signal?: AbortSignal) =>
  api.get<TripAssignmentDto>(`/api/assignments/${id}`, undefined, signal);

export const createAssignment = (body: CreateTripRequest) =>
  api.post<TripAssignmentDto>('/api/assignments', body);

export const assignTrip = (id: string | number, body: AssignTripRequest) =>
  api.put<TripAssignmentDto>(`/api/assignments/${id}`, body);

export const updateAssignment = assignTrip;

export const unassignTrip = (id: string | number, _body?: UnassignTripRequest) =>
  api.del(`/api/assignments/${id}`);

export const deleteAssignment = (id: string | number) =>
  unassignTrip(id);

export const checkAssignmentConflict = (body: ConflictCheckRequest) =>
  api.post<ConflictCheckResponse>('/api/assignments/check-conflict', body);

export const listAvailableBuses = (departureAt: string, routeId: number, excludeTripId?: number) =>
  api.get<AvailableBusDto[]>('/api/assignments/available-buses', {
    departureAt,
    routeId,
    excludeTripId,
  });

export const listAvailableStaff = (
  duty: number,
  departureAt: string,
  routeId: number,
  excludeTripId?: number,
) =>
  api.get<AvailableStaffDto[]>('/api/assignments/available-staff', {
    duty,
    departureAt,
    routeId,
    excludeTripId,
  });
