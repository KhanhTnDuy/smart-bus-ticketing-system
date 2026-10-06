import React from 'react';
import {
  Role,
  RouteStatus,
  UserStatus,
  ComplaintStatus,
  AuditStatus,
  TicketStatus,
  PaymentStatus,
  RefundStatus,
  TrackingStatus,
  IncidentStatus,
  TripStatus,
  AssignmentStatus,
  BusStatus,
  VerificationStatus,
  DiscountBeneficiaryType,
  OccupancyLoadStatus,
} from '../../types';

interface BadgeProps {
  variant?:
    | 'role'
    | 'routeStatus'
    | 'busStatus'
    | 'stopStatus'
    | 'fareStatus'
    | 'complaintStatus'
    | 'auditStatus'
    | 'userStatus'
    | 'ticketStatus'
    | 'paymentStatus'
    | 'refundStatus'
    | 'trackingStatus'
    | 'incidentStatus'
    | 'tripStatus'
    | 'assignmentStatus'
    | 'verificationStatus'
    | 'voucherStatus'
    | 'beneficiaryType'
    | 'occupancyStatus'
    | 'custom';
  value: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'custom',
  value,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let badgeStyle =
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';

  if (variant === 'role') {
    switch (value as Role) {
      case 'ADMIN':
        badgeStyle =
          'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800';
        break;
      case 'MANAGER':
        badgeStyle =
          'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
        break;
      case 'DRIVER':
        badgeStyle =
          'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
        break;
      case 'PASSENGER':
        badgeStyle =
          'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
        break;
    }
  } else if (variant === 'userStatus') {
    switch (value as UserStatus) {
      case 'ACTIVE':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'INACTIVE':
        badgeStyle =
          'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
      case 'LOCKED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800';
        break;
    }
  } else if (variant === 'routeStatus' || variant === 'busStatus') {
    switch (value as RouteStatus | BusStatus) {
      case 'ACTIVE':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'SUSPENDED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'MAINTENANCE':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'INACTIVE':
        badgeStyle =
          'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
    }
  } else if (variant === 'complaintStatus') {
    switch (value as ComplaintStatus) {
      case 'PENDING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'PROCESSING':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'RESOLVED':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'REJECTED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
    }
  } else if (variant === 'auditStatus') {
    switch (value as AuditStatus) {
      case 'SUCCESS':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'FAILURE':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'WARNING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
        break;
    }
  } else if (variant === 'ticketStatus') {
    switch (value as TicketStatus) {
      case 'PAID':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'PENDING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'USED':
        badgeStyle =
          'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800';
        break;
      case 'CANCELLED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'CHANGED':
        badgeStyle =
          'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800';
        break;
    }
  } else if (variant === 'paymentStatus') {
    switch (value as PaymentStatus) {
      case 'SUCCESS':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'PROCESSING':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'PENDING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'FAILED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'REFUNDED':
        badgeStyle =
          'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
    }
  } else if (variant === 'refundStatus') {
    switch (value as RefundStatus) {
      case 'REFUNDED':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'PROCESSING':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'REJECTED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'NOT_REQUESTED':
        badgeStyle =
          'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
    }
  } else if (variant === 'trackingStatus') {
    switch (value as TrackingStatus) {
      case 'RUNNING':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'STOPPED':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'ARRIVED_STOP':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'INACTIVE':
        badgeStyle =
          'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
    }
  } else if (variant === 'incidentStatus') {
    switch (value as IncidentStatus) {
      case 'NEW':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'PROCESSING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'RESOLVED':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
    }
  } else if (variant === 'tripStatus') {
    switch (value as TripStatus) {
      case 'SCHEDULED':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'BOARDING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'IN_TRANSIT':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'COMPLETED':
        badgeStyle =
          'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
      case 'CANCELLED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
    }
  } else if (variant === 'assignmentStatus') {
    switch (value as AssignmentStatus) {
      case 'ASSIGNED':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'IN_PROGRESS':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'COMPLETED':
        badgeStyle =
          'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        break;
      case 'CANCELLED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
    }
  } else if (variant === 'verificationStatus') {
    switch (value as VerificationStatus) {
      case 'PENDING':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'APPROVED':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'REJECTED':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
    }
  } else if (variant === 'beneficiaryType') {
    switch (value as DiscountBeneficiaryType) {
      case 'STUDENT':
        badgeStyle =
          'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
        break;
      case 'ELDERLY':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'DISABILITY':
        badgeStyle =
          'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800';
        break;
      case 'WORKER':
        badgeStyle =
          'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800';
        break;
    }
  } else if (variant === 'occupancyStatus') {
    switch (value as OccupancyLoadStatus) {
      case 'OVERLOAD':
        badgeStyle =
          'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
        break;
      case 'OPTIMAL':
        badgeStyle =
          'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
        break;
      case 'LOW':
        badgeStyle =
          'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
        break;
      case 'NO_TICKETS':
        badgeStyle =
          'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
        break;
      case 'NO_BUS':
        badgeStyle =
          'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-400 dark:border-fuchsia-800';
        break;
    }
  } else if (variant === 'voucherStatus') {
    if (value === 'ACTIVE' || value === 'true') {
      badgeStyle =
        'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
    } else if (value === 'EXPIRED') {
      badgeStyle =
        'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
    } else {
      badgeStyle =
        'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  }

  // Label translations
  const getDisplayLabel = () => {
    if (variant === 'verificationStatus' && value === 'PENDING') {
      return 'Chờ duyệt';
    }
    if (variant === 'voucherStatus') {
      if (value === 'ACTIVE' || value === 'true') return 'Đang kích hoạt';
      if (value === 'EXPIRED') return 'Đã hết hạn';
      return 'Tạm ngưng';
    }

    switch (value) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'MANAGER':
        return 'Quản lý vận hành';
      case 'DRIVER':
        return 'Tài xế';
      case 'PASSENGER':
        return 'Hành khách';
      case 'ACTIVE':
        return 'Hoạt động';
      case 'INACTIVE':
        return 'Tạm ngưng';
      case 'LOCKED':
        return 'Đã khóa';
      case 'SUSPENDED':
        return 'Đình chỉ';
      case 'MAINTENANCE':
        return 'Bảo trì';
      case 'PENDING':
        return 'Chờ xử lý';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'RESOLVED':
        return 'Đã xử lý';
      case 'REJECTED':
        return 'Từ chối';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'STUDENT':
        return 'Học sinh / Sinh viên';
      case 'ELDERLY':
        return 'Người cao tuổi (≥60)';
      case 'DISABILITY':
        return 'Người khuyết tật';
      case 'WORKER':
        return 'Công nhân KCN';
      case 'OVERLOAD':
        return 'Quá tải (>85%)';
      case 'OPTIMAL':
        return 'Tối ưu (60-85%)';
      case 'LOW':
        return 'Thấp (<60%)';
      case 'NO_TICKETS':
        return 'Chưa có vé (0%)';
      case 'NO_BUS':
        return 'Chưa gán xe';
      case 'SUCCESS':
        return 'Thành công';
      case 'FAILURE':
      case 'FAILED':
        return 'Thất bại';
      case 'WARNING':
        return 'Cảnh báo';
      case 'PAID':
        return 'Đã thanh toán';
      case 'USED':
        return 'Đã sử dụng';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'CHANGED':
        return 'Đã đổi vé';
      case 'REFUNDED':
        return 'Đã hoàn tiền';
      case 'NOT_REQUESTED':
        return 'Chưa yêu cầu';
      case 'RUNNING':
        return 'Đang chạy';
      case 'STOPPED':
        return 'Đang dừng';
      case 'ARRIVED_STOP':
        return 'Đã đến trạm';
      case 'NEW':
        return 'Mới';
      case 'SCHEDULED':
        return 'Lên lịch';
      case 'BOARDING':
        return 'Đang đón khách';
      case 'IN_TRANSIT':
        return 'Đang di chuyển';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'ASSIGNED':
        return 'Đã phân công';
      case 'IN_PROGRESS':
        return 'Đang thực hiện';
      default:
        return value;
    }
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-wide whitespace-nowrap ${badgeStyle} ${sizeClasses} ${className}`}
    >
      {getDisplayLabel()}
    </span>
  );
};
