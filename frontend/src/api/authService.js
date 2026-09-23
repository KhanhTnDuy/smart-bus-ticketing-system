// authService.js - Dịch vụ Xác thực & Phiên đăng nhập

import { apiClient, USE_MOCK } from './apiClient.js';
import { mockStorage, INITIAL_USERS } from './mockData.js';

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  /**
   * Đăng nhập với username hoặc email và password
   */
  login: async (identifier, password) => {
    if (!USE_MOCK) {
      return await apiClient.post('/auth/login', { identifier, password });
    }

    await delay(350);
    const users = mockStorage.getUsers();
    const cleanId = (identifier || '').trim().toLowerCase();

    const user = users.find(
      u => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );

    if (!user) {
      throw new Error('Tài khoản hoặc email không tồn tại trong hệ thống.');
    }

    if (user.password !== password) {
      throw new Error('Mật khẩu không chính xác. Vui lòng thử lại!');
    }

    if (user.status === 'INACTIVE') {
      throw new Error('Tài khoản của bạn hiện đang bị khóa hoặc tạm ngừng hoạt động. Vui lòng liên hệ Admin.');
    }

    // Không trả về password về phía frontend
    const { password: _, ...userSafe } = user;
    const token = `smartbus_jwt_token_${user.id}_${Date.now()}`;

    return {
      token,
      user: userSafe
    };
  },

  /**
   * Đăng xuất người dùng
   */
  logout: async () => {
    if (!USE_MOCK) {
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Bỏ qua lỗi mạng khi logout
      }
    }
    localStorage.removeItem('smartbus_token');
    localStorage.removeItem('smartbus_current_user');
    return { success: true };
  },

  /**
   * Lấy thông tin user hiện tại từ token / API
   */
  getCurrentUser: async () => {
    if (!USE_MOCK) {
      return await apiClient.get('/auth/me');
    }
    const savedUser = localStorage.getItem('smartbus_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  },

  /**
   * Danh sách tài khoản demo cho 4 vai trò để test nhanh
   */
  getDemoAccounts: () => {
    return [
      { role: 'ADMIN', roleName: 'Admin', username: 'admin', password: 'password123', desc: 'Quản trị viên toàn hệ thống' },
      { role: 'MANAGER', roleName: 'Quản lý', username: 'manager_minh', password: 'password123', desc: 'Điều hành tuyến & biểu phí' },
      { role: 'DRIVER', roleName: 'Tài xế', username: 'driver_tuan', password: 'password123', desc: 'Lái xe ca & lịch trình' },
      { role: 'PASSENGER', roleName: 'Hành khách', username: 'passenger_an', password: 'password123', desc: 'Tra cứu & gửi phản hồi' }
    ];
  },

  getDemoUserByRole: (role) => {
    const users = mockStorage.getUsers();
    const user = users.find(u => u.role === role && u.status === 'ACTIVE');
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
};
