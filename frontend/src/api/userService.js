// userService.js - Dịch vụ Quản lý Tài khoản & Phân quyền Người dùng

import { apiClient, USE_MOCK } from './apiClient.js';
import { mockStorage } from './mockData.js';

const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

export const userService = {
  /**
   * Lấy danh sách tất cả người dùng
   */
  getUsers: async () => {
    if (!USE_MOCK) {
      return await apiClient.get('/users');
    }
    await delay();
    const users = mockStorage.getUsers();
    // Ẩn mật khẩu khi trả về danh sách
    return users.map(({ password: _, ...user }) => user);
  },

  /**
   * Lấy thông tin chi tiết một người dùng theo ID
   */
  getUserById: async (id) => {
    if (!USE_MOCK) {
      return await apiClient.get(`/users/${id}`);
    }
    await delay();
    const users = mockStorage.getUsers();
    const user = users.find(u => u.id === Number(id));
    if (!user) return null;
    const { password: _, ...userSafe } = user;
    return userSafe;
  },

  /**
   * Thêm người dùng mới
   */
  createUser: async (userData) => {
    if (!USE_MOCK) {
      return await apiClient.post('/users', userData);
    }
    await delay(300);
    const users = mockStorage.getUsers();

    const cleanUsername = (userData.username || '').trim();
    const cleanEmail = (userData.email || '').trim().toLowerCase();

    // 1. Kiểm tra trùng username
    const usernameExists = users.some(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (usernameExists) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên khác!`);
    }

    // 2. Kiểm tra trùng email
    if (cleanEmail) {
      const emailExists = users.some(
        u => u.email.toLowerCase() === cleanEmail
      );
      if (emailExists) {
        throw new Error(`Địa chỉ email "${cleanEmail}" đã được đăng ký cho tài khoản khác!`);
      }
    }

    const newUser = {
      id: Date.now(),
      username: cleanUsername,
      name: (userData.name || '').trim(),
      email: cleanEmail,
      phone: (userData.phone || '').trim(),
      password: userData.password || 'password123',
      role: userData.role || 'PASSENGER',
      status: userData.status || 'ACTIVE',
      notes: (userData.notes || '').trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [newUser, ...users];
    mockStorage.setUsers(updated);

    const { password: _, ...safeUser } = newUser;
    return safeUser;
  },

  /**
   * Chỉnh sửa thông tin người dùng
   */
  updateUser: async (id, userData) => {
    if (!USE_MOCK) {
      return await apiClient.put(`/users/${id}`, userData);
    }
    await delay(300);
    const users = mockStorage.getUsers();
    const targetIndex = users.findIndex(u => u.id === Number(id));

    if (targetIndex === -1) {
      throw new Error('Không tìm thấy tài khoản cần cập nhật!');
    }

    const currentUser = users[targetIndex];
    const cleanEmail = userData.email !== undefined ? userData.email.trim().toLowerCase() : currentUser.email;

    // Kiểm tra trùng email với tài khoản khác
    if (cleanEmail && cleanEmail !== currentUser.email.toLowerCase()) {
      const emailExists = users.some(
        u => u.id !== Number(id) && u.email.toLowerCase() === cleanEmail
      );
      if (emailExists) {
        throw new Error(`Email "${cleanEmail}" đang thuộc về một tài khoản khác!`);
      }
    }

    const updatedUser = {
      ...currentUser,
      name: userData.name !== undefined ? userData.name.trim() : currentUser.name,
      email: cleanEmail,
      phone: userData.phone !== undefined ? userData.phone.trim() : currentUser.phone,
      role: userData.role || currentUser.role,
      status: userData.status || currentUser.status,
      notes: userData.notes !== undefined ? userData.notes.trim() : currentUser.notes,
      // Cập nhật mật khẩu nếu có truyền vào
      password: (userData.password && userData.password.trim() !== '') 
        ? userData.password.trim() 
        : currentUser.password
    };

    users[targetIndex] = updatedUser;
    mockStorage.setUsers([...users]);

    const { password: _, ...safeUser } = updatedUser;
    return safeUser;
  },

  /**
   * Xóa tài khoản người dùng
   */
  deleteUser: async (id) => {
    if (!USE_MOCK) {
      return await apiClient.delete(`/users/${id}`);
    }
    await delay(250);
    const users = mockStorage.getUsers();
    const filtered = users.filter(u => u.id !== Number(id));
    mockStorage.setUsers(filtered);
    return { success: true };
  },

  /**
   * Cập nhật nhanh vai trò của người dùng
   */
  updateUserRole: async (id, newRole) => {
    return userService.updateUser(id, { role: newRole });
  },

  /**
   * Cập nhật nhanh trạng thái hoạt động
   */
  updateUserStatus: async (id, newStatus) => {
    return userService.updateUser(id, { status: newStatus });
  }
};
