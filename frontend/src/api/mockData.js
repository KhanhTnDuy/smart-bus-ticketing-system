// mockData.js - Dữ liệu khởi tạo & cơ chế lưu trữ giả lập cho module Auth & User Role

const STORAGE_KEY_USERS = 'smartbus_mock_users';
const STORAGE_KEY_ROLES = 'smartbus_mock_roles';

export const INITIAL_USERS = [
  {
    id: 1,
    username: 'admin',
    name: 'Nguyễn Văn Quản Trị',
    email: 'admin@smartbus.vn',
    phone: '0901234567',
    password: 'password123',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2026-01-10T08:30:00.000Z',
    notes: 'Quản trị viên tối cao hệ thống SmartBus'
  },
  {
    id: 2,
    username: 'manager_minh',
    name: 'Trần Văn Minh',
    email: 'minh.tran@smartbus.vn',
    phone: '0912345678',
    password: 'password123',
    role: 'MANAGER',
    status: 'ACTIVE',
    createdAt: '2026-02-15T09:15:00.000Z',
    notes: 'Quản lý điều hành tuyến xe buýt và biểu phí'
  },
  {
    id: 3,
    username: 'driver_tuan',
    name: 'Lê Hoàng Tuấn',
    email: 'tuan.le@smartbus.vn',
    phone: '0987654321',
    password: 'password123',
    role: 'DRIVER',
    status: 'ACTIVE',
    createdAt: '2026-03-01T07:00:00.000Z',
    notes: 'Tài xế tuyến số 08 (Bến Thành - Chợ Lớn)'
  },
  {
    id: 4,
    username: 'passenger_an',
    name: 'Phạm Thị Thúy An',
    email: 'thuyan.pham@gmail.com',
    phone: '0933445566',
    password: 'password123',
    role: 'PASSENGER',
    status: 'ACTIVE',
    createdAt: '2026-03-12T14:20:00.000Z',
    notes: 'Hành khách thường xuyên sử dụng vé tháng'
  },
  {
    id: 5,
    username: 'driver_duc',
    name: 'Võ Minh Đức',
    email: 'duc.vo@smartbus.vn',
    phone: '0977889900',
    password: 'password123',
    role: 'DRIVER',
    status: 'INACTIVE',
    createdAt: '2026-02-20T10:00:00.000Z',
    notes: 'Tài xế đang tạm nghỉ phép dưỡng thương'
  },
  {
    id: 6,
    username: 'manager_huong',
    name: 'Đặng Thu Hương',
    email: 'huong.dang@smartbus.vn',
    phone: '0944556677',
    password: 'password123',
    role: 'MANAGER',
    status: 'ACTIVE',
    createdAt: '2026-02-25T11:45:00.000Z',
    notes: 'Quản lý tiếp nhận phản hồi & đánh giá dịch vụ'
  },
  {
    id: 7,
    username: 'passenger_hung',
    name: 'Đỗ Hữu Hùng',
    email: 'hung.do@yahoo.com',
    phone: '0966112233',
    password: 'password123',
    role: 'PASSENGER',
    status: 'INACTIVE',
    createdAt: '2026-03-15T16:00:00.000Z',
    notes: 'Tài khoản tạm khóa do vi phạm chính sách vé'
  }
];

// Định nghĩa ma trận quyền hạn theo 4 vai trò
export const ROLE_PERMISSIONS_MATRIX = [
  {
    module: 'Quản trị Tài khoản & Phân quyền',
    permissions: [
      { key: 'user_view', name: 'Xem danh sách tài khoản', roles: ['ADMIN'] },
      { key: 'user_create', name: 'Thêm tài khoản mới', roles: ['ADMIN'] },
      { key: 'user_edit', name: 'Chỉnh sửa tài khoản & vai trò', roles: ['ADMIN'] },
      { key: 'user_delete', name: 'Xóa / Khóa tài khoản', roles: ['ADMIN'] }
    ]
  },
  {
    module: 'Vận hành Tuyến xe & Biểu phí',
    permissions: [
      { key: 'route_manage', name: 'Quản lý tuyến đường xe buýt', roles: ['ADMIN', 'MANAGER'] },
      { key: 'station_manage', name: 'Quản lý trạm dừng & nhà ga', roles: ['ADMIN', 'MANAGER'] },
      { key: 'fare_manage', name: 'Quản lý biểu phí & chính sách vé', roles: ['ADMIN', 'MANAGER'] }
    ]
  },
  {
    module: 'Lịch trình & Ca lái xe',
    permissions: [
      { key: 'driver_schedule_view', name: 'Xem lịch trình ca lái cá nhân', roles: ['DRIVER'] },
      { key: 'driver_trip_report', name: 'Báo cáo sự cố & chuyến đi', roles: ['DRIVER'] }
    ]
  },
  {
    module: 'Dịch vụ Hành khách & Đánh giá',
    permissions: [
      { key: 'feedback_send', name: 'Gửi phản ánh & khiếu nại', roles: ['PASSENGER'] },
      { key: 'trip_rate', name: 'Đánh giá chất lượng chuyến xe', roles: ['PASSENGER'] },
      { key: 'feedback_resolve', name: 'Xử lý phản ánh từ hành khách', roles: ['ADMIN', 'MANAGER'] }
    ]
  }
];

export const mockStorage = {
  getUsers: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_USERS;
    }
  },

  setUsers: (users) => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  },

  resetUsers: () => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
};
