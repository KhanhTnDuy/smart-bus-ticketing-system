import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage';
import { Loading } from '../components/common/Loading';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading text="Đang xác thực thông tin đăng nhập..." />;
  }

  // 1. Kiểm tra chưa đăng nhập -> Chuyển hướng về trang Login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Kiểm tra vai trò (Role Guard thực thụ)
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <UnauthorizedPage requiredRoles={allowedRoles} currentRole={role} />;
  }

  // 3. Đã đăng nhập và có đúng quyền -> Cho phép truy cập
  return <Outlet />;
};
