import { apiRequest } from './apiClient';
import { AuditLog } from '../types';

export interface AuditLogSearchParams {
  module?: string;
  status?: string;
  date?: string;
  search?: string;
}

export const auditService = {
  async getAll(params?: AuditLogSearchParams): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.module && params.module !== 'ALL') query.append('module', params.module);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    const endpoint = queryString ? `/audit-logs?${queryString}` : '/audit-logs';

    return await apiRequest<AuditLog[]>(endpoint, { method: 'GET' });
  },

  async create(entry: Omit<AuditLog, 'id' | 'dateTime'>): Promise<AuditLog> {
    return await apiRequest<AuditLog>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },
};
