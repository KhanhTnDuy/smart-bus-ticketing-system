import React from 'react';
import { Shield, ShieldAlert, Bus, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export const RoleBadge = ({ role }) => {
  switch (role) {
    case 'ADMIN':
      return (
        <span className="badge badge-admin">
          <ShieldAlert size={12} />
          Admin
        </span>
      );
    case 'MANAGER':
      return (
        <span className="badge badge-manager">
          <Shield size={12} />
          Quản lý
        </span>
      );
    case 'DRIVER':
      return (
        <span className="badge badge-driver">
          <Bus size={12} />
          Tài xế
        </span>
      );
    case 'PASSENGER':
      return (
        <span className="badge badge-passenger">
          <UserCheck size={12} />
          Hành khách
        </span>
      );
    default:
      return <span className="badge">{role}</span>;
  }
};

export const StatusBadge = ({ status }) => {
  const isActive = status === 'ACTIVE';
  return (
    <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
      <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} />
      {isActive ? 'Đang hoạt động' : 'Tạm khóa'}
    </span>
  );
};
