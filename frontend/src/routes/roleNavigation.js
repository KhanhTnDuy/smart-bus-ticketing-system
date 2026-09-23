// roleNavigation.js - Cấu hình Phân quyền Menu & Điều hướng tập trung

import {
  Users,
  ShieldCheck,
  MapPin,
  Compass,
  CreditCard,
  MessageSquare,
  Calendar,
  AlertTriangle,
  Star
} from 'lucide-react';

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  DRIVER: 'DRIVER',
  PASSENGER: 'PASSENGER'
};

export const ROLE_LABELS = {
  ADMIN: 'Quản trị viên (Admin)',
  MANAGER: 'Quản lý điều hành',
  DRIVER: 'Tài xế',
  PASSENGER: 'Hành khách'
};

export const DEFAULT_ROUTES = {
  ADMIN: '/users',
  MANAGER: '/manager/routes',
  DRIVER: '/driver/schedule',
  PASSENGER: '/passenger/feedback'
};

export const getDefaultRouteForRole = (role) => {
  return DEFAULT_ROUTES[role] || '/login';
};

/**
 * Cấu hình Menu tập trung dựa trên vai trò (Role-based Navigation Config)
 */
export const MENU_CONFIG = [
  {
    section: 'Quản trị Hệ thống',
    allowedRoles: [ROLES.ADMIN],
    items: [
      {
        id: 'users',
        label: 'Quản lý Tài khoản',
        path: '/users',
        icon: Users,
        allowedRoles: [ROLES.ADMIN]
      },
      {
        id: 'roles-matrix',
        label: 'Ma trận Phân quyền',
        path: '/roles-matrix',
        icon: ShieldCheck,
        allowedRoles: [ROLES.ADMIN]
      }
    ]
  },
  {
    section: 'Điều hành Vận tải',
    allowedRoles: [ROLES.MANAGER, ROLES.ADMIN],
    items: [
      {
        id: 'manager-routes',
        label: 'Quản lý Tuyến xe',
        path: '/manager/routes',
        icon: Compass,
        allowedRoles: [ROLES.MANAGER, ROLES.ADMIN]
      },
      {
        id: 'manager-stations',
        label: 'Quản lý Trạm dừng',
        path: '/manager/stations',
        icon: MapPin,
        allowedRoles: [ROLES.MANAGER, ROLES.ADMIN]
      },
      {
        id: 'manager-fares',
        label: 'Biểu phí & Vé',
        path: '/manager/fares',
        icon: CreditCard,
        allowedRoles: [ROLES.MANAGER, ROLES.ADMIN]
      }
    ]
  },
  {
    section: 'Ca lái & Lịch trình',
    allowedRoles: [ROLES.DRIVER],
    items: [
      {
        id: 'driver-schedule',
        label: 'Lịch trình Ca chạy',
        path: '/driver/schedule',
        icon: Calendar,
        allowedRoles: [ROLES.DRIVER]
      },
      {
        id: 'driver-reports',
        label: 'Báo cáo Sự cố',
        path: '/driver/reports',
        icon: AlertTriangle,
        allowedRoles: [ROLES.DRIVER]
      }
    ]
  },
  {
    section: 'Dịch vụ Hành khách',
    allowedRoles: [ROLES.PASSENGER],
    items: [
      {
        id: 'passenger-feedback',
        label: 'Gửi Phản ánh & Góp ý',
        path: '/passenger/feedback',
        icon: MessageSquare,
        allowedRoles: [ROLES.PASSENGER]
      },
      {
        id: 'passenger-rating',
        label: 'Đánh giá Chuyến đi',
        path: '/passenger/rating',
        icon: Star,
        allowedRoles: [ROLES.PASSENGER]
      }
    ]
  }
];

/**
 * Lọc danh sách menu hợp lệ cho một vai trò
 */
export const getAuthorizedMenu = (userRole) => {
  if (!userRole) return [];

  return MENU_CONFIG.map(section => {
    // Chỉ lấy các mục menu được phép cho role này
    const allowedItems = section.items.filter(item =>
      item.allowedRoles.includes(userRole)
    );

    if (allowedItems.length === 0) return null;

    return {
      ...section,
      items: allowedItems
    };
  }).filter(Boolean);
};
