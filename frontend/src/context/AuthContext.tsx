import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { ApiError, getToken, setToken } from '../api/client';
import * as authApi from '../api/auth';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  role: Role | null;
  /** Đang kiểm tra token đã lưu khi mở lại ứng dụng. */
  initializing: boolean;
  login: (identity: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateCurrentUserProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'smart_bus_current_user';

const readStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Chỉ coi là đã đăng nhập khi có cả token và thông tin tài khoản đã lưu.
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    getToken() ? readStoredUser() : null,
  );
  const [initializing, setInitializing] = useState(!!getToken());

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
      else localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* localStorage bị chặn thì bỏ qua, phiên chỉ tồn tại trong tab hiện tại */
    }
  }, [currentUser]);

  // Xác nhận token đã lưu còn hiệu lực; nếu hết hạn thì đăng xuất luôn.
  useEffect(() => {
    if (!getToken()) {
      setInitializing(false);
      return;
    }

    let cancelled = false;
    authApi
      .me()
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch((err) => {
        if (cancelled) return;
        // Chỉ xoá phiên khi máy chủ khẳng định token không hợp lệ; lỗi mạng thì giữ lại.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setToken(null);
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (identity: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const user = await authApi.login(identity.trim(), password);
      setCurrentUser(user);
      return { success: true };
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Không đăng nhập được. Kiểm tra backend đã chạy và VITE_API_URL.';
      return { success: false, message };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    void authApi.logout();
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
        initializing,
        login,
        logout,
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
