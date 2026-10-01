import { apiRequest, TOKEN_STORAGE_KEY } from './apiClient';
import { User, Role } from '../types';

export interface LoginResponse {
  token?: string;
  user: any;
  message?: string;
}

export function mapBackendUserToFrontend(u: any): User {
  if (!u) return u;
  return {
    id: String(u.id || ''),
    fullName: u.name || u.fullName || u.username || 'Người dùng',
    username: u.username || '',
    email: u.email || '',
    phone: u.phone || '',
    role: (u.role as Role) || 'PASSENGER',
    status: (u.status === 'INACTIVE' ? 'LOCKED' : u.status) || 'ACTIVE',
    department: u.department || u.notes || '',
    avatarUrl: u.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: u.createdAt || new Date().toISOString(),
  };
}

export const authService = {
  async login(identifier: string, password: string): Promise<{ success: boolean; message?: string; user?: User; token?: string }> {
    try {
      const res = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      if (res.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      }

      const mappedUser = mapBackendUserToFrontend(res.user);
      return {
        success: true,
        user: mappedUser,
        token: res.token,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Đăng nhập thất bại',
      };
    }
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await apiRequest<any>('/auth/me', {
        method: 'GET',
      });
      return mapBackendUserToFrontend(res);
    } catch (e) {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },
};
