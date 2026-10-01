/** Account-management API adapter using the repository's existing HTTP client and role model. */
import { api } from './client';
import type { Role, User } from '../types';

export enum BackendAccountRole {
  Admin = 0,
  Manager = 1,
  Driver = 2,
  Passenger = 3,
}

export interface AccountDto {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: BackendAccountRole | number | string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccountRequest {
  username: string;
  password?: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: BackendAccountRole | number;
  active: boolean;
}

export interface UpdateAccountRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: BackendAccountRole | number;
  active?: boolean;
  password?: string;
}

export const roleToBackend = (role: Role): BackendAccountRole => {
  switch (role) {
    case 'ADMIN': return BackendAccountRole.Admin;
    case 'MANAGER': return BackendAccountRole.Manager;
    case 'DRIVER': return BackendAccountRole.Driver;
    default: return BackendAccountRole.Passenger;
  }
};

export const backendToRole = (role: AccountDto['role']): Role => {
  const value = String(role).trim().toUpperCase();
  if (value === 'ADMIN' || value === '0') return 'ADMIN';
  if (value === 'MANAGER' || value === '1') return 'MANAGER';
  if (value === 'DRIVER' || value === '2') return 'DRIVER';
  return 'PASSENGER';
};

export const toUser = (dto: AccountDto): User => ({
  id: String(dto.id),
  username: dto.username,
  fullName: dto.fullName,
  email: dto.email ?? '',
  phone: dto.phone ?? '',
  role: backendToRole(dto.role),
  status: dto.active ? 'ACTIVE' : 'INACTIVE',
  createdAt: dto.createdAt?.split('T')[0] ?? '',
});

export const listAccounts = (query?: { search?: string; role?: number; active?: boolean }, signal?: AbortSignal) =>
  api.get<AccountDto[]>('/api/accounts', query, signal);

export const getAccount = (id: number, signal?: AbortSignal) =>
  api.get<AccountDto>(`/api/accounts/${id}`, undefined, signal);

export const createAccount = (body: CreateAccountRequest) =>
  api.post<AccountDto>('/api/accounts', body);

export const updateAccount = (id: number, body: UpdateAccountRequest) =>
  api.put<AccountDto>(`/api/accounts/${id}`, body);

export const updateAccountRole = (id: number, role: BackendAccountRole | number) =>
  api.patch<{ id: number; role: BackendAccountRole }>(`/api/accounts/${id}/role`, { role });

export const deleteAccount = (id: number) => api.del(`/api/accounts/${id}`);
