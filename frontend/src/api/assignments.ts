/**
 * US - Phân công điều xe, tài xế và phụ xe (Quản lý vận hành).
 *
 * Khớp với backend/SmartBusTicketing.Api/Controllers/AssignmentsController.cs
 * Bổ sung kiểm tra trùng lịch (xe, tài xế) và ghi nhật ký kiểm toán.
 */

import { api } from './client';
import { BusAssignment, ShiftType, AssignmentStatus } from '../types';

export interface AssignmentDto {
  id: string; // e.g. "ASN-001"
  rawId: number;
  routeId: string;
  routeCode: string | null;
  routeName: string | null;
  busPlate: string;
  driverId: string;
  driverName: string;
  assistantId: string | null;
  assistantName: string | null;
  date: string; // YYYY-MM-DD
  shift: string;
  shiftHours: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentRequest {
  routeId: string;
  busPlate: string;
  driverId: string;
  driverName: string;
  assistantId?: string;
  assistantName?: string;
  date: string;
  shift: string;
  shiftHours: string;
  status?: string;
  notes?: string;
}

export interface UpdateAssignmentRequest {
  routeId: string;
  busPlate: string;
  driverId: string;
  driverName: string;
  assistantId?: string;
  assistantName?: string;
  date: string;
  shift: string;
  shiftHours: string;
  status: string;
  notes?: string;
}

export interface CheckConflictRequest {
  busPlate?: string;
  driverId?: string;
  driverName?: string;
  assistantId?: string;
  assistantName?: string;
  date: string;
  shift: string;
  shiftHours: string;
  excludeId?: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: string;
  message?: string;
  conflictingAssignmentCode?: string;
}

export const toBusAssignment = (dto: AssignmentDto): BusAssignment => ({
  id: dto.id || `ASN-${dto.rawId}`,
  routeId: dto.routeCode || dto.routeId,
  busPlate: dto.busPlate,
  driverId: dto.driverId,
  driverName: dto.driverName,
  assistantId: dto.assistantId || undefined,
  assistantName: dto.assistantName || undefined,
  date: dto.date,
  shift: (dto.shift as ShiftType) || 'CA_SANG',
  shiftHours: dto.shiftHours,
  status: (dto.status as AssignmentStatus) || 'ASSIGNED',
  notes: dto.notes || undefined,
});

export const toAssignmentRequest = (data: Omit<BusAssignment, 'id'>): UpdateAssignmentRequest => ({
  routeId: data.routeId,
  busPlate: data.busPlate.trim().toUpperCase(),
  driverId: data.driverId,
  driverName: data.driverName.trim(),
  assistantId: data.assistantId || undefined,
  assistantName: data.assistantName?.trim() || undefined,
  date: data.date,
  shift: data.shift,
  shiftHours: data.shiftHours,
  status: data.status,
  notes: data.notes?.trim() || undefined,
});

export const listAssignments = (
  params?: {
    search?: string;
    routeId?: string;
    shift?: string;
    status?: string;
    date?: string;
  },
  signal?: AbortSignal,
) => api.get<AssignmentDto[]>('/api/assignments', params, signal);

export const getAssignment = (id: string, signal?: AbortSignal) =>
  api.get<AssignmentDto>(`/api/assignments/${id}`, undefined, signal);

export const createAssignment = (body: CreateAssignmentRequest) =>
  api.post<AssignmentDto>('/api/assignments', body);

export const updateAssignment = (id: string, body: UpdateAssignmentRequest) =>
  api.put<AssignmentDto>(`/api/assignments/${id}`, body);

export const deleteAssignment = (id: string) =>
  api.del(`/api/assignments/${id}`);

export const checkAssignmentConflict = (body: CheckConflictRequest) =>
  api.post<ConflictCheckResult>('/api/assignments/check-conflict', body);
