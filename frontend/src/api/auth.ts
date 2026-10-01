/**
 * US1 - Đăng nhập, đăng xuất và lấy thông tin tài khoản đang đăng nhập.
 *
 * Backend phát JWT thật (xem backend/SmartBusTicketing.Api/Services/JwtTokenService.cs),
 * token được lưu lại để client.ts tự gắn vào header Authorization của mọi request sau đó.
 */

import { api, setToken } from './client';
import { Role, User, UserStatus } from '../types';

/** Vai trò trong backend: enum AccountRole { Admin, Manager, Driver, Passenger }. */
export type AccountRoleName = 'Admin' | 'Manager' | 'Driver' | 'Passenger';

export interface AccountDto {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: AccountRoleName | number;
  active: boolean;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AccountDto;
}

// Backend serialize enum thành chuỗi, nhưng vẫn chấp nhận cả dạng số cho chắc.
const ROLE_BY_NAME: Record<string, Role> = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  driver: 'DRIVER',
  passenger: 'PASSENGER',
};

const ROLE_BY_INDEX: Role[] = ['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'];

export const toRole = (role: AccountRoleName | number): Role => {
  if (typeof role === 'number') return ROLE_BY_INDEX[role] ?? 'PASSENGER';
  return ROLE_BY_NAME[String(role).toLowerCase()] ?? 'PASSENGER';
};

export const toUser = (dto: AccountDto): User => ({
  id: String(dto.id),
  username: dto.username,
  fullName: dto.fullName,
  email: dto.email ?? '',
  phone: dto.phone ?? '',
  role: toRole(dto.role),
  status: (dto.active ? 'ACTIVE' : 'INACTIVE') as UserStatus,
  // Backend chưa trả createdAt ở các endpoint này.
  createdAt: '',
});

export const login = async (identity: string, password: string): Promise<User> => {
  const result = await api.post<LoginResponse>('/api/auth/login', { identity, password });
  setToken(result.accessToken);
  return toUser(result.user);
};

export const logout = async (): Promise<void> => {
  try {
    await api.post('/api/auth/logout');
  } finally {
    // Token luôn phải bị xoá ở client, kể cả khi gọi API thất bại.
    setToken(null);
  }
};

/** Kiểm tra token còn hiệu lực và lấy lại thông tin tài khoản. */
export const me = async (): Promise<User> => {
  const dto = await api.get<AccountDto>('/api/auth/me');
  return toUser(dto);
};
