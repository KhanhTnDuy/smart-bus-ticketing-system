/**
 * Quản lý lịch trình định kỳ và chuyến xe.
 *
 * Khớp với backend SchedulesController (/api/schedules) và TripAssignmentsController (/api/assignments).
 * Chuyến xe là bản ghi trips; xe, tài xế, phụ xe gán cho chuyến qua /api/assignments.
 */

import { api } from './client';
import {
  AvailableBusDto,
  AvailableStaffDto,
  CreateTripRequest,
  AssignTripRequest,
  PagedResponse,
  TripAssignmentDto,
} from './assignments';

export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export const DAY_OPTIONS: { code: DayCode; label: string }[] = [
  { code: 'MON', label: 'T2' },
  { code: 'TUE', label: 'T3' },
  { code: 'WED', label: 'T4' },
  { code: 'THU', label: 'T5' },
  { code: 'FRI', label: 'T6' },
  { code: 'SAT', label: 'T7' },
  { code: 'SUN', label: 'CN' },
];

export interface ScheduleDto {
  id: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  firstDeparture: string;
  lastDeparture: string;
  frequencyMinutes: number;
  daysOfWeek: DayCode[];
  tripsPerDay: number;
  generatedTripCount: number;
}

export interface ScheduleRequest {
  routeId: number;
  firstDeparture: string;
  lastDeparture: string;
  frequencyMinutes: number;
  daysOfWeek: DayCode[];
}

export interface GenerateTripsRequest {
  fromDate: string;
  toDate: string;
  dryRun: boolean;
}

export interface GenerateTripsResult {
  dryRun: boolean;
  created: number;
  skipped: number;
  skippedPast: number;
  departures: string[];
}

/** Trạng thái chuyến backend trả về dạng số theo thứ tự khai báo trong Enums.cs. */
export type TripStatusName = 'Scheduled' | 'Running' | 'Delayed' | 'Completed' | 'Cancelled';
const TRIP_STATUS_BY_CODE: TripStatusName[] = ['Scheduled', 'Running', 'Delayed', 'Completed', 'Cancelled'];

export const toTripStatusName = (status: number | string): TripStatusName => {
  if (typeof status === 'number') return TRIP_STATUS_BY_CODE[status] ?? 'Scheduled';
  return (TRIP_STATUS_BY_CODE.find((s) => s.toLowerCase() === String(status).toLowerCase()) ?? 'Scheduled');
};

export const TRIP_STATUS_LABEL: Record<TripStatusName, string> = {
  Scheduled: 'Đã lên lịch',
  Running: 'Đang chạy',
  Delayed: 'Trễ giờ',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

export const tripStatusToCode = (status: TripStatusName): number => TRIP_STATUS_BY_CODE.indexOf(status);

/** Giờ nhập là giờ Việt Nam (UTC+7); backend lưu UTC. */
export const vietnamToUtcIso = (date: string, time: string): string =>
  new Date(`${date}T${time}:00+07:00`).toISOString();

// ---------- Lịch trình ----------

export const listSchedules = (signal?: AbortSignal) => api.get<ScheduleDto[]>('/api/schedules', undefined, signal);

export const createSchedule = (body: ScheduleRequest) => api.post<ScheduleDto>('/api/schedules', body);

export const updateSchedule = (id: number, body: ScheduleRequest) => api.put<ScheduleDto>(`/api/schedules/${id}`, body);

export const deleteSchedule = (id: number) => api.del(`/api/schedules/${id}`);

export const generateTrips = (id: number, body: GenerateTripsRequest) =>
  api.post<GenerateTripsResult>(`/api/schedules/${id}/generate-trips`, body);

// ---------- Chuyến xe ----------

/** Nạp toàn bộ chuyến, mỗi trang tối đa 100 theo giới hạn của backend. */
export const listAllTrips = async (signal?: AbortSignal): Promise<TripAssignmentDto[]> => {
  const all: TripAssignmentDto[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await api.get<PagedResponse<TripAssignmentDto>>('/api/assignments', { page, pageSize: 100 }, signal);
    all.push(...res.data);
    if (all.length >= res.total || res.data.length === 0) break;
  }
  return all;
};

export const createTrip = (body: CreateTripRequest) => api.post<TripAssignmentDto>('/api/assignments', body);

export const assignTripStaff = (tripId: number, body: AssignTripRequest) =>
  api.put<TripAssignmentDto>(`/api/assignments/${tripId}`, body);

export const updateTrip = (tripId: number, body: { departureAt?: string; status?: number; delayMinutes?: number }) =>
  api.put<TripAssignmentDto>(`/api/assignments/${tripId}/trip`, body);

export const deleteTrip = (tripId: number) => api.del(`/api/assignments/${tripId}/trip`);

export const availableBuses = (departureAt: string, routeId: number, excludeTripId?: number) =>
  api.get<AvailableBusDto[]>('/api/assignments/available-buses', { departureAt, routeId, excludeTripId });

/** duty: 0 = tài xế, 1 = phụ xe (StaffDuty ở backend). */
export const availableStaff = (duty: 0 | 1, departureAt: string, routeId: number, excludeTripId?: number) =>
  api.get<AvailableStaffDto[]>('/api/assignments/available-staff', { duty, departureAt, routeId, excludeTripId });
