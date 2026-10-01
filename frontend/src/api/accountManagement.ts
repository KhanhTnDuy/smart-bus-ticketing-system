/**
 * US1 - Quản lý tài khoản và phân quyền người dùng.
 *
 * Khớp với backend SmartBusTicketing.Api/Controllers/AccountsController.cs
 */

import { api } from './client';
import { Role, User, UserStatus } from '../types';

export enum BackendAccountRole {
  Admin = 0,
  Manager = 1,
  Driver = 2,
  Conductor = 3,
  Passenger = 4,
}

export interface AccountDto {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: BackendAccountRole | number | string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface UpdateRoleRequest {
  role: BackendAccountRole | number;
}

export const roleToBackend = (role: Role): BackendAccountRole => {
  switch (role) {
    case 'ADMIN':
      return BackendAccountRole.Admin;
    case 'MANAGER':
      return BackendAccountRole.Manager;
    case 'DRIVER':
      return BackendAccountRole.Driver;
    default:
      return BackendAccountRole.Passenger;
  }
};

export const backendToRole = (role: BackendAccountRole | number | string): Role => {
  if (typeof role === 'string') {
    const r = role.trim().toUpperCase();
    if (r === 'ADMIN' || r === '0') return 'ADMIN';
    if (r === 'MANAGER' || r === '1') return 'MANAGER';
    if (r === 'DRIVER' || r === '2') return 'DRIVER';
    if (r === 'CONDUCTOR' || r === '3') return 'DRIVER'; // Map to driver/staff
    return 'PASSENGER';
  }
  if (role === BackendAccountRole.Admin || role === 0) return 'ADMIN';
  if (role === BackendAccountRole.Manager || role === 1) return 'MANAGER';
  if (role === BackendAccountRole.Driver || role === 2) return 'DRIVER';
  if (role === BackendAccountRole.Conductor || role === 3) return 'DRIVER';
  return 'PASSENGER';
};

export const toUser = (dto: AccountDto): User => {
  const role = backendToRole(dto.role);
  let department = 'Khách hàng';
  const rawRoleStr = String(dto.role).toUpperCase();
  if (role === 'ADMIN') department = 'Ban Giám đốc';
  else if (role === 'MANAGER') department = 'Phòng Điều hành';
  else if (role === 'DRIVER') {
    if (dto.role === BackendAccountRole.Conductor || dto.role === 3 || rawRoleStr === 'CONDUCTOR') {
      department = 'Đội Soát vé';
    } else {
      department = 'Đội Xe buýt';
    }
  }

  return {
    id: String(dto.id),
    username: dto.username,
    fullName: dto.fullName,
    email: dto.email || '',
    phone: dto.phone || '',
    role,
    status: dto.active ? ('ACTIVE' as UserStatus) : ('INACTIVE' as UserStatus),
    createdAt: dto.createdAt ? dto.createdAt.split('T')[0] : '',
    department,
  };
};

export const listAccounts = (
  query?: { search?: string; role?: number; active?: boolean },
  signal?: AbortSignal,
) => api.get<AccountDto[]>('/api/accounts', query, signal);

export const getAccount = (id: number, signal?: AbortSignal) =>
  api.get<AccountDto>(`/api/accounts/${id}`, undefined, signal);

export const createAccount = (body: CreateAccountRequest) =>
  api.post<AccountDto>('/api/accounts', body);

export const updateAccount = (id: number, body: UpdateAccountRequest) =>
  api.put<AccountDto>(`/api/accounts/${id}`, body);

export const updateAccountRole = (id: number, role: BackendAccountRole | number) =>
  api.patch<{ id: number; role: BackendAccountRole }>(`/api/accounts/${id}/role`, { role });

export const deleteAccount = (id: number) => api.del(`/api/accounts/${id}`);
