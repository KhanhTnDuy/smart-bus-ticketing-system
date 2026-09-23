import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, getDefaultRouteForRole } from './roleNavigation';

import { MainLayout } from '../components/layout/MainLayout';
import { AuthLayout } from '../components/layout/AuthLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { RoleMatrixPage } from '../pages/admin/RoleMatrixPage';
import { ManagerPlaceholder } from '../pages/manager/ManagerPlaceholder';
import { DriverPlaceholder } from '../pages/driver/DriverPlaceholder';
import { PassengerPlaceholder } from '../pages/passenger/PassengerPlaceholder';
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';

// Component tự động chuyển hướng trang chủ dựa theo vai trò của user
const RoleRootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const defaultRoute = getDefaultRouteForRole(role);
  return <Navigate to={defaultRoute} replace />;
};

// Component ngăn chặn truy cập /login khi đã đăng nhập
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    const defaultRoute = getDefaultRouteForRole(role);
    return <Navigate to={defaultRoute} replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Route công khai: Đăng nhập */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
      </Route>

      {/* Route yêu cầu đăng nhập: Bọc trong MainLayout */}
      <Route element={<MainLayout />}>
        {/* Trang chủ tự động điều hướng */}
        <Route path="/" element={<RoleRootRedirect />} />

        {/* 1. Phân hệ ADMIN: Quản trị Tài khoản & Phân quyền */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/roles-matrix" element={<RoleMatrixPage />} />
        </Route>

        {/* 2. Phân hệ MANAGER (Quản lý & Admin được truy cập) */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.MANAGER, ROLES.ADMIN]} />}>
          <Route path="/manager/routes" element={<ManagerPlaceholder title="Quản lý Tuyến xe buýt" />} />
          <Route path="/manager/stations" element={<ManagerPlaceholder title="Quản lý Trạm dừng" />} />
          <Route path="/manager/fares" element={<ManagerPlaceholder title="Quản lý Biểu phí & Vé" />} />
        </Route>

        {/* 3. Phân hệ DRIVER: Dành riêng cho Tài xế */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.DRIVER]} />}>
          <Route path="/driver/schedule" element={<DriverPlaceholder title="Lịch trình Ca chạy" />} />
          <Route path="/driver/reports" element={<DriverPlaceholder title="Báo cáo Sự cố Ca chạy" />} />
        </Route>

        {/* 4. Phân hệ PASSENGER: Dành riêng cho Hành khách */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.PASSENGER]} />}>
          <Route path="/passenger/feedback" element={<PassengerPlaceholder title="Gửi Phản ánh & Góp ý" />} />
          <Route path="/passenger/rating" element={<PassengerPlaceholder title="Đánh giá Chuyến xe" />} />
        </Route>

        {/* Trang 403 Forbidden trực tiếp (nếu cần truy cập) */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* 404 Không tìm thấy */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
