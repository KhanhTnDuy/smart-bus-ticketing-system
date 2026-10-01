import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from './LoadingState';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  // Khi mở lại ứng dụng, token đã lưu đang được xác nhận với máy chủ. Chưa xong thì
  // không đẩy về trang đăng nhập, nếu không người dùng bị đăng xuất oan mỗi lần tải lại.
  if (initializing) {
    return <LoadingState message="Đang xác thực phiên làm việc..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
