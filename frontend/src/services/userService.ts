import { apiRequest } from './apiClient';
import { mapBackendUserToFrontend } from './authService';
import { User, Role } from '../types';

export const userService = {
  async getAll(): Promise<User[]> {
    const list = await apiRequest<any[]>('/users', { method: 'GET' });
    return (list || []).map(mapBackendUserToFrontend);
  },

  async create(userData: {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: Role;
    status?: string;
    password?: string;
    department?: string;
  }): Promise<User> {
    const payload = {
      name: userData.fullName,
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      status: userData.status || 'ACTIVE',
      password: userData.password || '123456',
      notes: userData.department || '',
    };

    const res = await apiRequest<any>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return mapBackendUserToFrontend(res);
  },

  async update(id: string | number, updates: Partial<User>): Promise<User> {
    const payload: Record<string, any> = {};
    if (updates.fullName !== undefined) payload.name = updates.fullName;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.department !== undefined) payload.notes = updates.department;

    const res = await apiRequest<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return mapBackendUserToFrontend(res);
  },

  async assignRole(userId: string | number, role: Role): Promise<User> {
    return this.update(userId, { role });
  },

  async delete(id: string | number): Promise<{ success: boolean }> {
    return await apiRequest<{ success: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};
