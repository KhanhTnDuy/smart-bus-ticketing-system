import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../api/authService';

const AuthContext = createContext(null);

const getInitialAuthState = () => {
  try {
    const token = localStorage.getItem('smartbus_token');
    const userStr = localStorage.getItem('smartbus_current_user');
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) };
    }
  } catch {
    // Dọn dẹp nếu JSON bị hỏng
    localStorage.removeItem('smartbus_token');
    localStorage.removeItem('smartbus_current_user');
  }
  return { token: null, user: null };
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(getInitialAuthState);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (identifier, password) => {
    setIsLoading(true);
    try {
      const result = await authService.login(identifier, password);
      setAuthState({ token: result.token, user: result.user });
      localStorage.setItem('smartbus_token', result.token);
      localStorage.setItem('smartbus_current_user', JSON.stringify(result.user));
      return result.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setAuthState({ token: null, user: null });
      localStorage.removeItem('smartbus_token');
      localStorage.removeItem('smartbus_current_user');
      setIsLoading(false);
    }
  };

  // Hỗ trợ chuyển đổi nhanh role phục vụ test / demo
  const switchRole = (targetRole) => {
    const targetUser = authService.getDemoUserByRole(targetRole);
    if (targetUser) {
      const demoToken = `smartbus_switched_token_${targetUser.id}`;
      setAuthState({ token: demoToken, user: targetUser });
      localStorage.setItem('smartbus_token', demoToken);
      localStorage.setItem('smartbus_current_user', JSON.stringify(targetUser));
      return targetUser;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        isAuthenticated: !!authState.user,
        role: authState.user?.role || null,
        isLoading,
        login,
        logout,
        switchRole
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
