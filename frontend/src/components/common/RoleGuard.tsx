import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { AccessDeniedPage } from '../../pages/common/AccessDeniedPage';

interface RoleGuardProps {
  allowedRoles: Role[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    return <AccessDeniedPage />;
  }

  return children ? <>{children}</> : <Outlet />;
};
