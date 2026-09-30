/**
 * US2 - Nhật ký truy cập và thao tác hệ thống (Audit Logs).
 *
 * Khớp với backend SmartBusTicketing.Api/Controllers/AuditLogsController.cs
 */

import { api } from './client';
import { AuditLog, AuditModule, AuditStatus } from '../types';

export enum BackendAuditActionType {
  Login = 0,
  Logout = 1,
  Create = 2,
  Update = 3,
  Delete = 4,
  View = 5,
  Export = 6,
  Payment = 7,
  TicketBuy = 8,
  FeedbackSubmit = 9,
  StatusChange = 10,
}

export enum BackendAuditStatus {
  Success = 0,
  Failure = 1,
  Warning = 2,
}

export interface AuditLogDto {
  id: number;
  accountId: number | null;
  username: string;
  action: string;
  actionType: BackendAuditActionType | number;
  targetResource: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: BackendAuditStatus | number;
  details: string | null;
  createdAt: string;
}

export interface AuditLogQueryParams {
  username?: string;
  actionType?: number;
  status?: number;
  from?: string; // YYYY-MM-DD (SCRUM-16)
  to?: string; // YYYY-MM-DD (SCRUM-16)
  search?: string;
}

export const actionTypeToModule = (actionType: BackendAuditActionType | number, targetResource?: string | null): AuditModule => {
  const resource = (targetResource || '').toUpperCase();
  if (resource.startsWith('USR') || resource.startsWith('ACCOUNT')) return 'ACCOUNT';
  if (resource.startsWith('ROUTE')) return 'ROUTE';
  if (resource.startsWith('STOP')) return 'STOP';
  if (resource.startsWith('FARE')) return 'FARE';
  if (resource.startsWith('FEEDBACK') || resource.startsWith('COMPLAINT')) return 'COMPLAINT';
  if (resource.startsWith('RATING')) return 'RATING';
  if (resource.startsWith('PAYMENT') || resource.startsWith('PAY')) return 'PAYMENT';
  if (resource.startsWith('TICKET')) return 'TICKET';

  if (actionType === BackendAuditActionType.Login || actionType === BackendAuditActionType.Logout) {
    return 'AUTH';
  }
  return 'SYSTEM';
};

export const backendStatusToAuditStatus = (status: BackendAuditStatus | number): AuditStatus => {
  if (status === BackendAuditStatus.Failure || status === 1) return 'FAILURE';
  if (status === BackendAuditStatus.Warning || status === 2) return 'WARNING';
  return 'SUCCESS';
};

export const toAuditLog = (dto: AuditLogDto): AuditLog => {
  const dateObj = new Date(dto.createdAt);
  const formattedDate = !Number.isNaN(dateObj.getTime())
    ? dateObj.toISOString().replace('T', ' ').slice(0, 19)
    : dto.createdAt;

  let parsedDetails: Record<string, unknown> | undefined;
  if (dto.details) {
    try {
      parsedDetails = JSON.parse(dto.details);
    } catch {
      parsedDetails = { raw: dto.details };
    }
  }

  return {
    id: `LOG-${dto.id}`,
    user: dto.username || 'system',
    action: dto.action,
    module: actionTypeToModule(dto.actionType, dto.targetResource),
    description: dto.details || dto.action,
    dateTime: formattedDate,
    status: backendStatusToAuditStatus(dto.status),
    ipAddress: dto.ipAddress || '127.0.0.1',
    targetId: dto.targetResource || undefined,
    details: parsedDetails,
  };
};

export const listAuditLogs = (query?: AuditLogQueryParams, signal?: AbortSignal) =>
  api.get<AuditLogDto[]>('/api/audit-logs', query as Record<string, string | number | boolean | null | undefined>, signal);

export const getAuditLog = (id: number, signal?: AbortSignal) =>
  api.get<AuditLogDto>(`/api/audit-logs/${id}`, undefined, signal);
