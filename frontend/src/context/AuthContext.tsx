import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { INITIAL_USERS } from '../data/mockData';

import { authService } from '../services/authService';
import { TOKEN_STORAGE_KEY } from '../services/apiClient';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  role: Role | null;
  login: (identity: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchUser: (userId: string) => void;
  updateCurrentUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'smart_bus_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored user', e);
    }
    // Default to Admin logged-in for initial demo experience or allow immediate navigation
    return INITIAL_USERS[0]; // Admin: Nguyen Van An
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [currentUser]);

  // Kiểm tra token khi khởi động
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      authService.getMe().then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      }).catch(() => {
        // Token hết hạn hoặc server offline
      });
    }
  }, []);

  const login = async (identity: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanIdentity = identity.trim();

    // 1. Thử gọi API Backend thật (/api/v1/auth/login)
    try {
      const apiResult = await authService.login(cleanIdentity, password);
      if (apiResult.success && apiResult.user) {
        setCurrentUser(apiResult.user);
        return { success: true };
      }
      // Nếu Backend trả về thông báo lỗi nghiệp vụ cụ thể (sai mật khẩu, tài khoản bị khóa, v.v.)
      if (apiResult.message && !apiResult.message.includes('Offline') && !apiResult.message.includes('kết nối')) {
        return { success: false, message: apiResult.message };
      }
    } catch (err: any) {
      console.warn('Backend login endpoint unavailable, trying local fallback...', err);
    }

    // 2. Fallback kiểm tra dữ liệu local khi Backend offline
    await new Promise((resolve) => setTimeout(resolve, 300));
    const lowerIdentity = cleanIdentity.toLowerCase();

    const matchedUser = INITIAL_USERS.find(
      (u) => u.email.toLowerCase() === lowerIdentity || u.username.toLowerCase() === lowerIdentity
    );

    if (!matchedUser) {
      return {
        success: false,
        message: 'Tài khoản hoặc email không tồn tại trong hệ thống.',
      };
    }

    if (matchedUser.status === 'LOCKED') {
      return {
        success: false,
        message: 'Tài khoản của bạn hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên.',
      };
    }

    // Default mock passwords
    const expectedPassword =
      matchedUser.role === 'ADMIN'
        ? 'admin123'
        : matchedUser.role === 'MANAGER'
        ? 'manager123'
        : matchedUser.role === 'DRIVER'
        ? 'driver123'
        : 'passenger123';

    if (password !== expectedPassword && password !== '123456') {
      return {
        success: false,
        message: `Mật khẩu không chính xác. Gợi ý: ${expectedPassword}`,
      };
    }

    setCurrentUser(matchedUser);
    return { success: true };
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Bỏ qua lỗi mạng khi logout
    }
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const switchUser = (userId: string) => {
    const found = INITIAL_USERS.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const updateCurrentUserProfile = (updates: Partial<User>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        role: currentUser?.role || null,
        login,
        logout,
        switchUser,
        updateCurrentUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
