import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Role,
  BusRoute,
  BusStop,
  Fare,
  Complaint,
  ComplaintStatus,
  TripRating,
  AuditLog,
  NotificationItem,
  BusTrip,
  Ticket,
  PaymentRecord,
  ElectronicInvoice,
  RefundRequest,
  BusTracking,
  BusIncident,
  BusAssignment,
  ShiftType,
  BusVehicle,
  TimetableTemplate,
  PaymentMethod,
  RefundStatus,
  IncidentStatus,
  TicketStatus,
  PassengerVerification,
  Voucher,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_ROUTES,
  INITIAL_STOPS,
  INITIAL_FARES,
  INITIAL_COMPLAINTS,
  INITIAL_RATINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TRIPS,
  INITIAL_TICKETS,
  INITIAL_PAYMENTS,
  INITIAL_INVOICES,
  INITIAL_REFUNDS,
  INITIAL_TRACKINGS,
  INITIAL_INCIDENTS,
  INITIAL_ASSIGNMENTS,
  INITIAL_BUSES,
  INITIAL_TIMETABLES,
  INITIAL_VERIFICATIONS,
  INITIAL_VOUCHERS,
} from '../data/mockData';
import { useAuth } from './AuthContext';
interface DataContextType {
  // Accounts (Sprint 1)
  users: User[];
  addAccount: (userData: Omit<User, 'id' | 'createdAt'>) => { success: boolean; message?: string; data?: User };
  updateAccount: (id: string, updates: Partial<User>) => { success: boolean; message?: string };
  deleteAccount: (id: string) => { success: boolean; message?: string };
  assignRole: (userId: string, newRole: Role) => { success: boolean; message?: string };

  // Routes (Sprint 1)
  routes: BusRoute[];
  addRoute: (routeData: Omit<BusRoute, 'id' | 'stopCount'>) => { success: boolean; message?: string; data?: BusRoute };
  updateRoute: (id: string, updates: Partial<BusRoute>) => { success: boolean; message?: string };
  deleteRoute: (id: string) => { success: boolean; message?: string };

  // Stops (Sprint 1)
  stops: BusStop[];
  getStopsByRoute: (routeId: string) => BusStop[];
  addStop: (stopData: Omit<BusStop, 'id' | 'order'>) => { success: boolean; message?: string; data?: BusStop };
  updateStop: (id: string, updates: Partial<BusStop>) => { success: boolean; message?: string };
  deleteStop: (id: string) => { success: boolean; message?: string };
  moveStopUp: (stopId: string) => { success: boolean; message?: string };
  moveStopDown: (stopId: string) => { success: boolean; message?: string };

  // Fares (Sprint 1)
  fares: Fare[];
  getFaresByRoute: (routeId: string) => Fare[];
  addFare: (fareData: Omit<Fare, 'id'>) => { success: boolean; message?: string; data?: Fare };
  updateFare: (id: string, updates: Partial<Fare>) => { success: boolean; message?: string };
  deleteFare: (id: string) => { success: boolean; message?: string };

  // Complaints (Sprint 1)
  complaints: Complaint[];
  addComplaint: (data: Omit<Complaint, 'id' | 'createdAt' | 'status'>) => { success: boolean; message?: string; data?: Complaint };
  updateComplaintStatus: (id: string, status: ComplaintStatus, response?: string) => { success: boolean; message?: string };

  // Ratings (Sprint 1)
  ratings: TripRating[];
  addRating: (data: Omit<TripRating, 'id' | 'createdAt'>) => { success: boolean; message?: string; data?: TripRating };

  // Audit Logs (Sprint 1)
  auditLogs: AuditLog[];
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'dateTime'>) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // ==============================================================
  // SPRINT 2 METHODS
  // ==============================================================

  // Trips / Schedules (Sprint 2)
  trips: BusTrip[];
  addTrip: (tripData: Omit<BusTrip, 'id' | 'bookedSeats'>) => { success: boolean; message?: string; data?: BusTrip };
  addTripsBatch: (tripsData: Array<Omit<BusTrip, 'id' | 'bookedSeats'>>) => { success: boolean; count: number; skippedCount?: number; message?: string; data?: BusTrip[] };
  updateTrip: (id: string, updates: Partial<BusTrip>) => { success: boolean; message?: string };
  deleteTrip: (id: string) => { success: boolean; message?: string };

  // Bookings & Tickets (Sprint 2)
  tickets: Ticket[];
  bookTicket: (bookingData: {
    tripId: string;
    routeId: string;
    seatNumber: string;
    passengerName: string;
    passengerEmail: string;
    passengerPhone: string;
    price: number;
    busPlate: string;
    departureDate: string;
    departureTime: string;
  }) => { success: boolean; message?: string; data?: Ticket };
  cancelTicket: (ticketId: string, reason: string) => { success: boolean; message?: string };
  changeTicket: (
    ticketId: string,
    newTripId: string,
    newSeat: string
  ) => { success: boolean; message?: string; newTicket?: Ticket };

  // Payments & Invoices (Sprint 2)
  payments: PaymentRecord[];
  invoices: ElectronicInvoice[];
  processPayment: (
    ticketId: string,
    method: PaymentMethod
  ) => Promise<{ success: boolean; message?: string; payment?: PaymentRecord; invoice?: ElectronicInvoice }>;

  // Refunds (Sprint 2)
  refunds: RefundRequest[];
  requestRefund: (ticketId: string, reason: string) => { success: boolean; message?: string; refund?: RefundRequest };
  processRefund: (refundId: string, status: RefundStatus, adminNote?: string) => { success: boolean; message?: string };

  // Real-time GPS Tracking (Sprint 2)
  trackings: BusTracking[];
  refreshSimulatedGps: () => void;

  // Bus Incidents (Sprint 2)
  incidents: BusIncident[];
  reportIncident: (data: Omit<BusIncident, 'id' | 'reportedTime' | 'status'>) => { success: boolean; message?: string; incident?: BusIncident };
  processIncident: (incidentId: string, status: IncidentStatus, resolutionNote?: string) => { success: boolean; message?: string };

  // Driver/Assistant Assignments (Sprint 2)
  assignments: BusAssignment[];
  checkAssignmentConflict: (
    data: {
      busPlate?: string;
      driverName?: string;
      driverId?: string;
      date?: string;
      shift?: ShiftType;
    },
    excludeId?: string
  ) => {
    hasConflict: boolean;
    type?: 'BUS' | 'DRIVER';
    message: string;
    conflicting?: BusAssignment;
  } | null;
  addAssignment: (data: Omit<BusAssignment, 'id'>) => { success: boolean; message?: string; assignment?: BusAssignment };
  updateAssignment: (id: string, updates: Partial<BusAssignment>) => { success: boolean; message?: string };
  deleteAssignment: (id: string) => { success: boolean; message?: string };

  // QR Code Verification (Sprint 2)
  scanQrCode: (qrString: string) => {
    valid: boolean;
    status: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'INVALID';
    ticket?: Ticket;
    message: string;
  };

  // Bus Fleet (Sprint 2 - Quản lý xe buýt)
  buses: BusVehicle[];
  addBus: (data: Omit<BusVehicle, 'id'>) => { success: boolean; message?: string; bus?: BusVehicle };
  updateBus: (id: string, updates: Partial<BusVehicle>) => { success: boolean; message?: string };
  deleteBus: (id: string) => { success: boolean; message?: string };

  // Timetables (Sprint 2 - Quản lý thời gian biểu)
  timetables: TimetableTemplate[];
  addTimetable: (data: Omit<TimetableTemplate, 'id'>) => { success: boolean; message?: string; timetable?: TimetableTemplate };
  updateTimetable: (id: string, updates: Partial<TimetableTemplate>) => { success: boolean; message?: string };
  deleteTimetable: (id: string) => { success: boolean; message?: string };

  // Verifications (Hồ sơ xét duyệt đối tượng ưu đãi)
  verifications: PassengerVerification[];
  approveVerification: (id: string, validUntil?: string, reviewerName?: string) => { success: boolean; message?: string };
  rejectVerification: (id: string, reason: string, reviewerName?: string) => { success: boolean; message?: string };
  addVerification: (item: Omit<PassengerVerification, 'id' | 'submittedAt' | 'status'>) => { success: boolean; message?: string; verification?: PassengerVerification };
  deleteVerification: (id: string) => { success: boolean; message?: string };

  // Vouchers (Mã giảm giá Marketing)
  vouchers: Voucher[];
  addVoucher: (data: Omit<Voucher, 'id' | 'createdAt' | 'usedCount' | 'remainingCount' | 'isActive' | 'status'>) => { success: boolean; message?: string; voucher?: Voucher };
  updateVoucher: (id: number, updates: Partial<Voucher>) => { success: boolean; message?: string };
  deleteVoucher: (id: number) => { success: boolean; message?: string };
  toggleVoucherStatus: (id: number) => { success: boolean; message?: string };
}


const DataContext = createContext<DataContextType | undefined>(undefined);

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
  }
  return defaultValue;
};

// Safe ID generator that finds the maximum numeric suffix to prevent collision on deleted records
const generateNextSequentialId = (
  items: Array<{ id: string | number }>,
  prefix: string,
  padLength: number = 2
): string => {
  const maxNum = items.reduce((max, item) => {
    const regex = new RegExp(`^${prefix}-?(\\d+)`, 'i');
    const match = String(item.id).match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      return !isNaN(num) ? Math.max(max, num) : max;
    }
    return max;
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(padLength, '0')}`;
};

const generateYearPrefixId = (
  items: Array<{ id: string }>,
  prefix: string,
  padLength: number = 3
): string => {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}`;
  const maxNum = items.reduce((max, item) => {
    const regex = new RegExp(`^${fullPrefix}-?(\\d+)`, 'i');
    const match = item.id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      return !isNaN(num) ? Math.max(max, num) : max;
    }
    return max;
  }, 0);
  return `${fullPrefix}-${String(maxNum + 1).padStart(padLength, '0')}`;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // SPRINT 1 STATE
  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage('smart_bus_users', INITIAL_USERS)
  );
  const [routes, setRoutes] = useState<BusRoute[]>(() =>
    loadFromStorage('smart_bus_routes', INITIAL_ROUTES)
  );
  const [stops, setStops] = useState<BusStop[]>(() =>
    loadFromStorage('smart_bus_stops', INITIAL_STOPS)
  );
  const [fares, setFares] = useState<Fare[]>(() =>
    loadFromStorage('smart_bus_fares', INITIAL_FARES)
  );
  const [complaints, setComplaints] = useState<Complaint[]>(() =>
    loadFromStorage('smart_bus_complaints', INITIAL_COMPLAINTS)
  );
  const [ratings, setRatings] = useState<TripRating[]>(() =>
    loadFromStorage('smart_bus_ratings', INITIAL_RATINGS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadFromStorage('smart_bus_audit_logs', INITIAL_AUDIT_LOGS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadFromStorage('smart_bus_notifications', INITIAL_NOTIFICATIONS)
  );

  // SPRINT 2 STATE
  const [trips, setTrips] = useState<BusTrip[]>(() =>
    loadFromStorage('smart_bus_trips', INITIAL_TRIPS)
  );
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    loadFromStorage('smart_bus_tickets', INITIAL_TICKETS)
  );
  const [payments, setPayments] = useState<PaymentRecord[]>(() =>
    loadFromStorage('smart_bus_payments', INITIAL_PAYMENTS)
  );
  const [invoices, setInvoices] = useState<ElectronicInvoice[]>(() =>
    loadFromStorage('smart_bus_invoices', INITIAL_INVOICES)
  );
  const [refunds, setRefunds] = useState<RefundRequest[]>(() =>
    loadFromStorage('smart_bus_refunds', INITIAL_REFUNDS)
  );
  const [trackings, setTrackings] = useState<BusTracking[]>(() =>
    loadFromStorage('smart_bus_trackings', INITIAL_TRACKINGS)
  );
  const [incidents, setIncidents] = useState<BusIncident[]>(() =>
    loadFromStorage('smart_bus_incidents', INITIAL_INCIDENTS)
  );
  const [assignments, setAssignments] = useState<BusAssignment[]>(() =>
    loadFromStorage('smart_bus_assignments', INITIAL_ASSIGNMENTS)
  );
  const [buses, setBuses] = useState<BusVehicle[]>(() =>
    loadFromStorage('smart_bus_buses', INITIAL_BUSES)
  );
  const [timetables, setTimetables] = useState<TimetableTemplate[]>(() =>
    loadFromStorage('smart_bus_timetables', INITIAL_TIMETABLES)
  );
  const [verifications, setVerifications] = useState<PassengerVerification[]>(() =>
    loadFromStorage('smart_bus_verifications', INITIAL_VERIFICATIONS)
  );
  const [vouchers, setVouchers] = useState<Voucher[]>(() =>
    loadFromStorage('smart_bus_vouchers', INITIAL_VOUCHERS)
  );


  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('smart_bus_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('smart_bus_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem('smart_bus_stops', JSON.stringify(stops));
  }, [stops]);

  useEffect(() => {
    localStorage.setItem('smart_bus_fares', JSON.stringify(fares));
  }, [fares]);

  useEffect(() => {
    localStorage.setItem('smart_bus_complaints', JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem('smart_bus_ratings', JSON.stringify(ratings));
  }, [ratings]);

  useEffect(() => {
    localStorage.setItem('smart_bus_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('smart_bus_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Sync Sprint 2 state to LocalStorage
  useEffect(() => {
    localStorage.setItem('smart_bus_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('smart_bus_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('smart_bus_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('smart_bus_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('smart_bus_refunds', JSON.stringify(refunds));
  }, [refunds]);

  useEffect(() => {
    localStorage.setItem('smart_bus_trackings', JSON.stringify(trackings));
  }, [trackings]);

  useEffect(() => {
    localStorage.setItem('smart_bus_incidents', JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('smart_bus_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('smart_bus_buses', JSON.stringify(buses));
  }, [buses]);

  useEffect(() => {
    localStorage.setItem('smart_bus_timetables', JSON.stringify(timetables));
  }, [timetables]);

  useEffect(() => {
    localStorage.setItem('smart_bus_verifications', JSON.stringify(verifications));
  }, [verifications]);

  useEffect(() => {
    localStorage.setItem('smart_bus_vouchers', JSON.stringify(vouchers));
  }, [vouchers]);


  // Keep route stopCount in sync with actual stops
  useEffect(() => {
    setRoutes((currentRoutes) =>
      currentRoutes.map((r) => {
        const count = stops.filter((s) => s.routeId === r.id).length;
        if (r.stopCount !== count) {
          return { ...r, stopCount: count };
        }
        return r;
      })
    );
  }, [stops]);

  const getActorName = () => {
    if (!currentUser) return 'Hệ thống (SYSTEM)';
    return `${currentUser.fullName} (${currentUser.username})`;
  };

  const getFormattedNow = () => {
    const now = new Date();
    return (
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(now.getDate()).padStart(2, '0') +
      ' ' +
      String(now.getHours()).padStart(2, '0') +
      ':' +
      String(now.getMinutes()).padStart(2, '0') +
      ':' +
      String(now.getSeconds()).padStart(2, '0')
    );
  };

  // Helper: record audit log
  const addAuditLog = (entry: Omit<AuditLog, 'id' | 'dateTime'>) => {
    const formattedDate = getFormattedNow();
    const newLog: AuditLog = {
      id: `LOG-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      dateTime: formattedDate,
      ...entry,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // ------------------------------------------
  // SPRINT 1: USER / ACCOUNT OPERATIONS
  // ------------------------------------------
  const addAccount = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const validRoles: Role[] = ['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'];
    if (!validRoles.includes(userData.role)) {
      return { success: false, message: 'Vai trò người dùng không hợp lệ.' };
    }

    const existsEmail = users.some(
      (u) => u.email.toLowerCase() === userData.email.toLowerCase().trim()
    );
    if (existsEmail) {
      return { success: false, message: 'Địa chỉ email này đã được sử dụng.' };
    }

    const existsUser = users.some(
      (u) => u.username.toLowerCase() === userData.username.toLowerCase().trim()
    );
    if (existsUser) {
      return { success: false, message: 'Tên đăng nhập này đã tồn tại trong hệ thống.' };
    }

    const newId = generateNextSequentialId(users, 'USR', 3);
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: getFormattedNow(),
    };

    setUsers((prev) => [newUser, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Thêm tài khoản người dùng',
      module: 'ACCOUNT',
      description: `Tạo mới tài khoản [${newUser.username}] - ${newUser.fullName} với vai trò ${newUser.role}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newUser };
  };

  const updateAccount = (id: string, updates: Partial<User>) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'Không tìm thấy tài khoản cần cập nhật.' };
    }

    if (updates.role) {
      const validRoles: Role[] = ['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'];
      if (!validRoles.includes(updates.role)) {
        return { success: false, message: 'Vai trò được chọn không hợp lệ.' };
      }
    }

    if (updates.email && updates.email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const exists = users.some(
        (u) => u.id !== id && u.email.toLowerCase() === updates.email!.toLowerCase().trim()
      );
      if (exists) {
        return { success: false, message: 'Email này đã được sử dụng bởi tài khoản khác.' };
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật thông tin tài khoản',
      module: 'ACCOUNT',
      description: `Cập nhật thông tin tài khoản ${targetUser.fullName} (${targetUser.username})`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteAccount = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy tài khoản để xóa.' };
    }

    if (target.id === currentUser?.id) {
      return { success: false, message: 'Bạn không thể xóa chính tài khoản đang đăng nhập.' };
    }

    setUsers((prev) => prev.filter((u) => u.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa tài khoản người dùng',
      module: 'ACCOUNT',
      description: `Đã xóa tài khoản ${target.fullName} (${target.username}), vai trò ${target.role}`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const assignRole = (userId: string, newRole: Role) => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Không tìm thấy tài khoản.' };
    }

    const validRoles: Role[] = ['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'];
    if (!validRoles.includes(newRole)) {
      return { success: false, message: 'Vai trò không hợp lệ.' };
    }

    const oldRole = target.role;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Phân quyền vai trò',
      module: 'ROLE',
      description: `Thay đổi vai trò cho ${target.fullName} (${target.username}) từ ${oldRole} thành ${newRole}`,
      status: 'SUCCESS',
      targetId: userId,
    });

    return { success: true };
  };

  // ------------------------------------------
  // SPRINT 1: ROUTE OPERATIONS
  // ------------------------------------------
  const addRoute = (routeData: Omit<BusRoute, 'id' | 'stopCount'>) => {
    if (!routeData.code.trim()) {
      return { success: false, message: 'Mã tuyến/tên tuyến không được để trống.' };
    }
    if (!routeData.startPoint.trim() || !routeData.endPoint.trim()) {
      return { success: false, message: 'Điểm đầu và điểm cuối tuyến không được để trống.' };
    }
    if (routeData.distance <= 0) {
      return { success: false, message: 'Cự ly tuyến phải lớn hơn 0 km.' };
    }

    const existsCode = routes.some(
      (r) => r.code.toLowerCase().trim() === routeData.code.toLowerCase().trim()
    );
    if (existsCode) {
      return { success: false, message: 'Mã số tuyến này đã tồn tại.' };
    }

    const newId = generateNextSequentialId(routes, 'RT', 2);
    const newRoute: BusRoute = {
      ...routeData,
      id: newId,
      stopCount: 0,
    };

    setRoutes((prev) => [newRoute, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Thêm tuyến xe buýt',
      module: 'ROUTE',
      description: `Thêm tuyến mới: [${newRoute.code}] ${newRoute.name} (${newRoute.startPoint} -> ${newRoute.endPoint})`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newRoute };
  };

  const updateRoute = (id: string, updates: Partial<BusRoute>) => {
    const target = routes.find((r) => r.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy tuyến đường.' };
    }

    if (updates.code) {
      const exists = routes.some(
        (r) => r.id !== id && r.code.toLowerCase().trim() === updates.code!.toLowerCase().trim()
      );
      if (exists) {
        return { success: false, message: 'Mã số tuyến xe đã tồn tại.' };
      }
    }

    if (updates.distance !== undefined && updates.distance <= 0) {
      return { success: false, message: 'Cự ly tuyến đường phải lớn hơn 0 km.' };
    }

    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật tuyến xe buýt',
      module: 'ROUTE',
      description: `Cập nhật thông tin tuyến [${target.code}] - ${target.name}`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteRoute = (id: string) => {
    const target = routes.find((r) => r.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy tuyến xe cần xóa.' };
    }

    setStops((prev) => prev.filter((s) => s.routeId !== id));
    setFares((prev) => prev.filter((f) => f.routeId !== id));
    setRoutes((prev) => prev.filter((r) => r.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa tuyến xe buýt',
      module: 'ROUTE',
      description: `Xóa tuyến [${target.code}] ${target.name} cùng dữ liệu trạm và vé liên quan`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  // ------------------------------------------
  // SPRINT 1: STOP OPERATIONS
  // ------------------------------------------
  const getStopsByRoute = (routeId: string) => {
    return stops
      .filter((s) => s.routeId === routeId)
      .sort((a, b) => a.order - b.order);
  };

  const addStop = (stopData: Omit<BusStop, 'id' | 'order'>) => {
    const routeExists = routes.some((r) => r.id === stopData.routeId);
    if (!routeExists) {
      return { success: false, message: 'Tuyến đường liên kết không tồn tại.' };
    }
    if (!stopData.name.trim()) {
      return { success: false, message: 'Tên trạm dừng không được để trống.' };
    }
    if (!stopData.address.trim()) {
      return { success: false, message: 'Địa chỉ vị trí trạm không được để trống.' };
    }

    const routeStops = stops.filter((s) => s.routeId === stopData.routeId);
    const nextOrder = routeStops.length + 1;
    const newId = `STP-${Date.now().toString().slice(-6)}`;

    const newStop: BusStop = {
      ...stopData,
      id: newId,
      order: nextOrder,
    };

    setStops((prev) => [...prev, newStop]);

    const routeObj = routes.find((r) => r.id === stopData.routeId);
    addAuditLog({
      user: getActorName(),
      action: 'Thêm trạm dừng xe buýt',
      module: 'STOP',
      description: `Thêm trạm dừng mới "${newStop.name}" vào tuyến ${routeObj?.code || stopData.routeId} ở vị trí thứ ${nextOrder}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newStop };
  };

  const updateStop = (id: string, updates: Partial<BusStop>) => {
    const target = stops.find((s) => s.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy trạm dừng.' };
    }

    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật thông tin trạm dừng',
      module: 'STOP',
      description: `Cập nhật thông tin trạm "${target.name}"`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteStop = (id: string) => {
    const target = stops.find((s) => s.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy trạm dừng cần xóa.' };
    }

    const { routeId, order } = target;

    setStops((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      return remaining.map((s) => {
        if (s.routeId === routeId && s.order > order) {
          return { ...s, order: s.order - 1 };
        }
        return s;
      });
    });

    addAuditLog({
      user: getActorName(),
      action: 'Xóa trạm dừng xe buýt',
      module: 'STOP',
      description: `Đã xóa trạm dừng "${target.name}" khỏi tuyến ${target.routeId}`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const moveStopUp = (stopId: string) => {
    const currentStop = stops.find((s) => s.id === stopId);
    if (!currentStop) {
      return { success: false, message: 'Không tìm thấy trạm dừng.' };
    }
    if (currentStop.order <= 1) {
      return { success: false, message: 'Trạm dừng đã ở vị trí đầu tiên của lộ trình.' };
    }

    const prevOrder = currentStop.order - 1;
    setStops((prev) =>
      prev.map((s) => {
        if (s.routeId === currentStop.routeId) {
          if (s.id === stopId) {
            return { ...s, order: prevOrder };
          }
          if (s.order === prevOrder) {
            return { ...s, order: currentStop.order };
          }
        }
        return s;
      })
    );

    addAuditLog({
      user: getActorName(),
      action: 'Thay đổi thứ tự trạm dừng (Lên)',
      module: 'STOP',
      description: `Đẩy trạm "${currentStop.name}" lên vị trí thứ ${prevOrder}`,
      status: 'SUCCESS',
      targetId: stopId,
    });

    return { success: true };
  };

  const moveStopDown = (stopId: string) => {
    const currentStop = stops.find((s) => s.id === stopId);
    if (!currentStop) {
      return { success: false, message: 'Không tìm thấy trạm dừng.' };
    }

    const routeStops = stops.filter((s) => s.routeId === currentStop.routeId);
    const maxOrder = Math.max(...routeStops.map((s) => s.order));

    if (currentStop.order >= maxOrder) {
      return { success: false, message: 'Trạm dừng đã ở vị trí cuối cùng của lộ trình.' };
    }

    const nextOrder = currentStop.order + 1;
    setStops((prev) =>
      prev.map((s) => {
        if (s.routeId === currentStop.routeId) {
          if (s.id === stopId) {
            return { ...s, order: nextOrder };
          }
          if (s.order === nextOrder) {
            return { ...s, order: currentStop.order };
          }
        }
        return s;
      })
    );

    addAuditLog({
      user: getActorName(),
      action: 'Thay đổi thứ tự trạm dừng (Xuống)',
      module: 'STOP',
      description: `Đẩy trạm "${currentStop.name}" xuống vị trí thứ ${nextOrder}`,
      status: 'SUCCESS',
      targetId: stopId,
    });

    return { success: true };
  };

  // ------------------------------------------
  // SPRINT 1: FARE OPERATIONS
  // ------------------------------------------
  const getFaresByRoute = (routeId: string) => {
    return fares.filter((f) => f.routeId === routeId);
  };

  const addFare = (fareData: Omit<Fare, 'id'>) => {
    const routeExists = routes.some((r) => r.id === fareData.routeId);
    if (!routeExists) {
      return { success: false, message: 'Tuyến đường liên kết không tồn tại.' };
    }
    if (isNaN(fareData.price) || fareData.price < 0) {
      return { success: false, message: 'Giá vé phải là số nguyên dương hoặc bằng 0 (miễn phí).' };
    }
    if (!fareData.effectiveDate) {
      return { success: false, message: 'Ngày hiệu lực không được để trống.' };
    }

    const newId = `FAR-${Date.now().toString().slice(-5)}`;
    const newFare: Fare = { ...fareData, id: newId };

    setFares((prev) => [newFare, ...prev]);

    const routeObj = routes.find((r) => r.id === fareData.routeId);
    addAuditLog({
      user: getActorName(),
      action: 'Thêm biểu giá vé',
      module: 'FARE',
      description: `Thêm mức giá vé ${fareData.price.toLocaleString('vi-VN')} VNĐ cho ${fareData.passengerType} tại tuyến ${routeObj?.code || fareData.routeId}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newFare };
  };

  const updateFare = (id: string, updates: Partial<Fare>) => {
    const target = fares.find((f) => f.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy mức giá vé.' };
    }
    if (updates.price !== undefined && (isNaN(updates.price) || updates.price < 0)) {
      return { success: false, message: 'Giá vé không thể là số âm.' };
    }

    setFares((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật giá vé',
      module: 'FARE',
      description: `Cập nhật biểu giá vé ID ${id}`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteFare = (id: string) => {
    const target = fares.find((f) => f.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy biểu giá vé để xóa.' };
    }

    setFares((prev) => prev.filter((f) => f.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa biểu giá vé',
      module: 'FARE',
      description: `Đã xóa biểu giá vé ID ${id} (${target.passengerType}: ${target.price} VNĐ)`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  // ------------------------------------------
  // SPRINT 1: COMPLAINTS
  // ------------------------------------------
  const addComplaint = (data: Omit<Complaint, 'id' | 'createdAt' | 'status'>) => {
    if (!data.subject.trim() || !data.description.trim() || !data.routeId) {
      return { success: false, message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' };
    }

    const formattedDate = getFormattedNow();
    const newId = generateYearPrefixId(complaints, 'CMP', 3);
    const newComplaint: Complaint = {
      ...data,
      id: newId,
      status: 'PENDING',
      createdAt: formattedDate,
    };

    setComplaints((prev) => [newComplaint, ...prev]);

    const newNotif: NotificationItem = {
      id: 'NOTIF-' + Date.now(),
      title: 'Khiếu nại mới từ hành khách',
      message: `Hành khách ${data.passengerName} gửi khiếu nại: "${data.subject}"`,
      createdAt: 'Vừa xong',
      type: 'WARNING',
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Gửi khiếu nại dịch vụ',
      module: 'COMPLAINT',
      description: `Hành khách gửi khiếu nại mã [${newId}] - Chủ đề: "${data.subject}"`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newComplaint };
  };

  const updateComplaintStatus = (
    id: string,
    status: ComplaintStatus,
    adminResponse?: string
  ) => {
    const target = complaints.find((c) => c.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy khiếu nại.' };
    }

    const formattedDate = getFormattedNow();
    const statusLabels: Record<ComplaintStatus, string> = {
      PENDING: 'Chờ xử lý',
      PROCESSING: 'Đang xử lý',
      RESOLVED: 'Đã xử lý',
      REJECTED: 'Từ chối',
    };

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              adminResponse: adminResponse !== undefined ? adminResponse : c.adminResponse,
              processedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Quản lý vận hành',
              processedAt: formattedDate,
            }
          : c
      )
    );

    addAuditLog({
      user: getActorName(),
      action: 'Xử lý khiếu nại',
      module: 'COMPLAINT',
      description: `Cập nhật trạng thái khiếu nại [${id}] sang "${statusLabels[status]}"`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  // ------------------------------------------
  // SPRINT 1: RATINGS
  // ------------------------------------------
  const addRating = (data: Omit<TripRating, 'id' | 'createdAt'>) => {
    if (data.rating < 1 || data.rating > 5 || !data.routeId) {
      return { success: false, message: 'Thông tin đánh giá không hợp lệ (Bắt buộc từ 1 đến 5 sao).' };
    }

    const formattedDate = getFormattedNow();
    const newId = generateYearPrefixId(ratings, 'RAT', 3);
    const newRating: TripRating = {
      ...data,
      id: newId,
      createdAt: formattedDate,
    };

    setRatings((prev) => [newRating, ...prev]);

    const routeObj = routes.find((r) => r.id === data.routeId);
    addAuditLog({
      user: getActorName(),
      action: 'Đánh giá chuyến đi',
      module: 'RATING',
      description: `Gửi đánh giá ${data.rating} sao cho tuyến ${routeObj?.code || data.routeId}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newRating };
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // ==============================================================
  // SPRINT 2 IMPLEMENTATIONS
  // ==============================================================

  // 1. TRIPS / SCHEDULES (Sprint 2)
  const addTrip = (tripData: Omit<BusTrip, 'id' | 'bookedSeats'>) => {
    const newId = `TRIP-${Math.floor(100 + Math.random() * 900)}`;
    const newTrip: BusTrip = {
      ...tripData,
      id: newId,
      bookedSeats: [],
    };
    setTrips((prev) => [newTrip, ...prev]);

    const route = routes.find((r) => r.id === tripData.routeId);
    addAuditLog({
      user: getActorName(),
      action: 'Thêm lịch chạy xe',
      module: 'SCHEDULE',
      description: `Tạo chuyến xe mới [${newId}] tuyến ${route?.code || tripData.routeId} lúc ${tripData.departureTime} ngày ${tripData.departureDate}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, data: newTrip };
  };

  const addTripsBatch = (tripsData: Array<Omit<BusTrip, 'id' | 'bookedSeats'>>) => {
    if (!tripsData.length) return { success: false, count: 0, skippedCount: 0, message: 'Danh sách chuyến rỗng' };

    // Chống trùng chuyến: Lọc bỏ các chuyến đã tồn tại cùng tuyến, cùng ngày và cùng giờ khởi hành
    const nonDuplicateTrips = tripsData.filter((candidate) => {
      const alreadyExists = trips.some(
        (existing) =>
          existing.routeId === candidate.routeId &&
          existing.departureDate === candidate.departureDate &&
          existing.departureTime === candidate.departureTime
      );
      return !alreadyExists;
    });

    const skippedCount = tripsData.length - nonDuplicateTrips.length;

    if (nonDuplicateTrips.length === 0) {
      return {
        success: false,
        count: 0,
        skippedCount,
        message: `Tất cả ${tripsData.length} chuyến trong khung giờ này đã tồn tại trên hệ thống (chống trùng chuyến).`,
      };
    }

    const baseNum = Math.floor(100 + Math.random() * 800);
    const createdTrips: BusTrip[] = nonDuplicateTrips.map((tripData, idx) => ({
      ...tripData,
      id: `TRIP-${baseNum + idx}`,
      bookedSeats: [],
    }));

    setTrips((prev) => [...createdTrips, ...prev]);

    const route = routes.find((r) => r.id === tripsData[0].routeId);
    addAuditLog({
      user: getActorName(),
      action: 'Sinh lịch chuyến tự động',
      module: 'SCHEDULE',
      description: `Sinh tự động ${createdTrips.length} chuyến xe (đã lọc ${skippedCount} chuyến trùng) theo thời gian biểu tuyến ${route?.code || tripsData[0].routeId} ngày ${tripsData[0].departureDate}`,
      status: 'SUCCESS',
      targetId: createdTrips[0]?.id,
    });

    return {
      success: true,
      count: createdTrips.length,
      skippedCount,
      data: createdTrips,
      message: skippedCount > 0
        ? `Đã tạo ${createdTrips.length} chuyến mới (đã tự động bỏ qua ${skippedCount} chuyến bị trùng giờ).`
        : `Đã sinh thành công toàn bộ ${createdTrips.length} chuyến xe theo lịch trình!`,
    };
  };


  const updateTrip = (id: string, updates: Partial<BusTrip>) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật chuyến xe',
      module: 'SCHEDULE',
      description: `Cập nhật lịch chuyến xe mã [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteTrip = (id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa chuyến xe',
      module: 'SCHEDULE',
      description: `Hủy lịch chuyến xe mã [${id}] khỏi hệ thống`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  // 2. BOOKINGS & TICKETS (Sprint 2)
  const bookTicket = (bookingData: {
    tripId: string;
    routeId: string;
    seatNumber: string;
    passengerName: string;
    passengerEmail: string;
    passengerPhone: string;
    price: number;
    busPlate: string;
    departureDate: string;
    departureTime: string;
  }) => {
    // Support single or multiple comma-separated seats (e.g. "A1, A2")
    const seatsToBook = bookingData.seatNumber
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Check if any seat already booked in trip
    const trip = trips.find((t) => t.id === bookingData.tripId);
    if (trip && seatsToBook.some((s) => trip.bookedSeats.includes(s))) {
      return { success: false, message: 'Một hoặc nhiều ghế đã chọn đã có người đặt trước.' };
    }

    const newTicketId = `TKT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newQrCode = `SMARTBUS-${newTicketId}-${bookingData.seatNumber}-VALID`;

    const newTicket: Ticket = {
      id: newTicketId,
      passengerId: currentUser?.id,
      passengerName: bookingData.passengerName,
      passengerEmail: bookingData.passengerEmail,
      passengerPhone: bookingData.passengerPhone,
      tripId: bookingData.tripId,
      routeId: bookingData.routeId,
      departureDate: bookingData.departureDate,
      departureTime: bookingData.departureTime,
      seatNumber: bookingData.seatNumber,
      busPlate: bookingData.busPlate,
      price: bookingData.price,
      paymentStatus: 'PENDING',
      ticketStatus: 'PENDING',
      qrCodeData: newQrCode,
      createdAt: getFormattedNow(),
    };

    // Update tickets
    setTickets((prev) => [newTicket, ...prev]);

    // Mark seats as booked in trip
    setTrips((prev) =>
      prev.map((t) =>
        t.id === bookingData.tripId
          ? { ...t, bookedSeats: [...t.bookedSeats, ...seatsToBook] }
          : t
      )
    );

    addAuditLog({
      user: getActorName(),
      action: 'Đặt chỗ vé xe buýt',
      module: 'TICKET',
      description: `Hành khách ${bookingData.passengerName} tạo vé [${newTicketId}], ghế ${bookingData.seatNumber}, chuyến ${bookingData.tripId}`,
      status: 'SUCCESS',
      targetId: newTicketId,
    });

    return { success: true, data: newTicket };
  };

  // Cancel Ticket
  const cancelTicket = (ticketId: string, reason: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return { success: false, message: 'Không tìm thấy vé xe để hủy.' };
    }

    if (ticket.ticketStatus === 'CANCELLED') {
      return { success: false, message: 'Vé này đã được hủy trước đó.' };
    }

    const formattedDate = getFormattedNow();

    // 1. Update ticket status
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              ticketStatus: 'CANCELLED',
              paymentStatus: t.paymentStatus === 'PAID' ? 'REFUNDED' : t.paymentStatus,
              cancelledAt: formattedDate,
              cancelReason: reason,
              qrCodeData: `SMARTBUS-${ticket.id}-CANCELLED`,
            }
          : t
      )
    );

    // 2. Free up the seat in the trip (support comma-separated multi-seat tickets e.g. "A1, A2")
    const seatsToFree = ticket.seatNumber
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === ticket.tripId
          ? { ...trip, bookedSeats: trip.bookedSeats.filter((s) => !seatsToFree.includes(s)) }
          : trip
      )
    );

    // 3. If paid, create refund record
    if (ticket.paymentStatus === 'PAID') {
      const newRefId = `REF-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
      const newRefund: RefundRequest = {
        id: newRefId,
        ticketId: ticket.id,
        paymentId: ticket.paymentId,
        passengerName: ticket.passengerName,
        passengerPhone: ticket.passengerPhone,
        passengerEmail: ticket.passengerEmail,
        amount: ticket.price,
        refundReason: reason || 'Hành khách yêu cầu hủy vé trực tuyến',
        refundStatus: 'PROCESSING',
        requestDate: formattedDate,
      };
      setRefunds((prev) => [newRefund, ...prev]);

      // Update payment record to REFUNDED
      if (ticket.paymentId) {
        setPayments((prev) =>
          prev.map((p) => (p.id === ticket.paymentId ? { ...p, status: 'REFUNDED' } : p))
        );
      }
    }

    addAuditLog({
      user: getActorName(),
      action: 'Hủy vé xe buýt',
      module: 'TICKET',
      description: `Hành khách hủy vé [${ticketId}], ghế ${ticket.seatNumber}. Lý do: "${reason}"`,
      status: 'SUCCESS',
      targetId: ticketId,
    });

    return { success: true, message: 'Hủy vé thành công. Chỗ ngồi đã được giải phóng.' };
  };

  // Change Ticket (Đổi vé)
  const changeTicket = (
    ticketId: string,
    newTripId: string,
    newSeat: string
  ) => {
    const oldTicket = tickets.find((t) => t.id === ticketId);
    if (!oldTicket) {
      return { success: false, message: 'Không tìm thấy vé xe cần đổi.' };
    }

    const newTrip = trips.find((t) => t.id === newTripId);
    if (!newTrip) {
      return { success: false, message: 'Chuyến xe mới không tồn tại.' };
    }

    const oldSeats = oldTicket.seatNumber
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const newSeats = newSeat
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (newSeats.some((s) => newTrip.bookedSeats.includes(s))) {
      return { success: false, message: `Ghế ${newSeat} của chuyến mới đã có người chọn.` };
    }

    const formattedDate = getFormattedNow();
    const newTicketId = `TKT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newQrCode = `SMARTBUS-${newTicketId}-${newSeat}-VALID`;

    // 1. Mark old ticket as CHANGED
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              ticketStatus: 'CHANGED',
              changedToTicketId: newTicketId,
              qrCodeData: `SMARTBUS-${t.id}-CHANGED`,
            }
          : t
      )
    );

    // 2. Free old seat and occupy new seat in trips
    setTrips((prev) =>
      prev.map((trip) => {
        if (trip.id === oldTicket.tripId && trip.id === newTripId) {
          return {
            ...trip,
            bookedSeats: [...trip.bookedSeats.filter((s) => !oldSeats.includes(s)), ...newSeats],
          };
        } else if (trip.id === oldTicket.tripId) {
          return {
            ...trip,
            bookedSeats: trip.bookedSeats.filter((s) => !oldSeats.includes(s)),
          };
        } else if (trip.id === newTripId) {
          return {
            ...trip,
            bookedSeats: [...trip.bookedSeats, ...newSeats],
          };
        }
        return trip;
      })
    );

    // 3. Create new ticket
    const newTicket: Ticket = {
      id: newTicketId,
      passengerId: oldTicket.passengerId,
      passengerName: oldTicket.passengerName,
      passengerEmail: oldTicket.passengerEmail,
      passengerPhone: oldTicket.passengerPhone,
      tripId: newTripId,
      routeId: newTrip.routeId,
      departureDate: newTrip.departureDate,
      departureTime: newTrip.departureTime,
      seatNumber: newSeat,
      busPlate: newTrip.busPlate,
      price: newTrip.price,
      paymentId: oldTicket.paymentId,
      paymentMethod: oldTicket.paymentMethod,
      paymentStatus: oldTicket.paymentStatus,
      ticketStatus: 'PAID',
      qrCodeData: newQrCode,
      createdAt: formattedDate,
    };

    setTickets((prev) => [newTicket, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Đổi vé xe buýt',
      module: 'TICKET',
      description: `Đổi vé [${ticketId}] (ghế ${oldTicket.seatNumber}) sang vé mới [${newTicketId}] (ghế ${newSeat}, chuyến ${newTripId})`,
      status: 'SUCCESS',
      targetId: newTicketId,
    });

    return { success: true, message: 'Đổi vé xe thành công!', newTicket };
  };

  // 3. PAYMENTS & INVOICES (Sprint 2)
  const processPayment = async (
    ticketId: string,
    method: PaymentMethod
  ): Promise<{ success: boolean; message?: string; payment?: PaymentRecord; invoice?: ElectronicInvoice }> => {
    // Simulated network delay
    await new Promise((r) => setTimeout(r, 600));

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      return { success: false, message: 'Không tìm thấy vé để thanh toán.' };
    }

    const formattedDate = getFormattedNow();
    const paymentId = `PAY-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const invoiceId = `INV-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const prefix =
      method === 'MOMO'
        ? 'MM'
        : method === 'VNPAY'
        ? 'VNP'
        : method === 'ZALOPAY'
        ? 'ZP'
        : 'VCB';
    const transactionCode = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;

    const newPayment: PaymentRecord = {
      id: paymentId,
      ticketId,
      passengerName: ticket.passengerName,
      passengerEmail: ticket.passengerEmail,
      amount: ticket.price,
      method,
      status: 'SUCCESS',
      transactionCode,
      createdAt: formattedDate,
      details: `Thanh toán thành công ${ticket.price.toLocaleString('vi-VN')} VNĐ qua ${method}`,
    };

    const route = routes.find((r) => r.id === ticket.routeId);
    const vatRate = 0.08;
    const vatAmount = Math.round(ticket.price * vatRate);
    const netAmount = ticket.price - vatAmount;

    const newInvoice: ElectronicInvoice = {
      id: invoiceId,
      ticketId,
      paymentId,
      customerName: ticket.passengerName,
      customerEmail: ticket.passengerEmail,
      customerPhone: ticket.passengerPhone,
      routeName: route?.name || 'Tuyến xe buýt thông minh',
      routeCode: route?.code || 'Tuyến xe',
      seatNumber: ticket.seatNumber,
      departureDate: ticket.departureDate,
      departureTime: ticket.departureTime,
      amount: netAmount,
      vatRate,
      vatAmount,
      totalAmount: ticket.price,
      paymentMethod: method,
      invoiceDate: formattedDate,
      status: 'ISSUED',
      signingAuthority: 'CỤC QUẢN LÝ GIAO THÔNG VẬN TẢI ĐÔ THỊ (KÝ ĐIỆN TỬ BỞI TRUNG TÂM QUẢN LÝ GTCC)',
    };

    // Update ticket
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              paymentId,
              paymentMethod: method,
              paymentStatus: 'PAID',
              ticketStatus: 'PAID',
              qrCodeData: `SMARTBUS-${t.id}-${t.seatNumber}-VALID`,
            }
          : t
      )
    );

    // Save payment and invoice
    setPayments((prev) => [newPayment, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Thanh toán vé xe thành công',
      module: 'PAYMENT',
      description: `Giao dịch [${paymentId}] thanh toán ${ticket.price.toLocaleString('vi-VN')} VNĐ qua ${method} cho vé [${ticketId}]`,
      status: 'SUCCESS',
      targetId: paymentId,
    });

    return { success: true, payment: newPayment, invoice: newInvoice };
  };

  // 4. REFUNDS (Sprint 2)
  const requestRefund = (ticketId: string, reason: string) => {
    return cancelTicket(ticketId, reason);
  };

  const processRefund = (refundId: string, status: RefundStatus, adminNote?: string) => {
    const formattedDate = getFormattedNow();

    setRefunds((prev) =>
      prev.map((r) =>
        r.id === refundId
          ? {
              ...r,
              refundStatus: status,
              adminNote: adminNote || r.adminNote,
              resolvedDate: formattedDate,
              processedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Quản lý vận hành',
            }
          : r
      )
    );

    addAuditLog({
      user: getActorName(),
      action: 'Xử lý yêu cầu hoàn tiền',
      module: 'REFUND',
      description: `Cập nhật trạng thái hoàn tiền [${refundId}] sang "${status}"`,
      status: 'SUCCESS',
      targetId: refundId,
    });

    return { success: true, message: 'Cập nhật trạng thái hoàn tiền thành công!' };
  };

  // 5. GPS REAL-TIME TRACKING (Sprint 2)
  const refreshSimulatedGps = () => {
    setTrackings((prev) =>
      prev.map((bus) => {
        if (bus.status === 'RUNNING') {
          // Jiggle coordinates slightly
          const latJiggle = (Math.random() - 0.5) * 0.003;
          const lngJiggle = (Math.random() - 0.5) * 0.003;
          const newSpeed = Math.floor(25 + Math.random() * 25);
          return {
            ...bus,
            latitude: +(bus.latitude + latJiggle).toFixed(4),
            longitude: +(bus.longitude + lngJiggle).toFixed(4),
            speedKmH: newSpeed,
            updatedTime: 'Vừa xong',
          };
        } else if (bus.status === 'STOPPED') {
          // 50% chance to start moving
          if (Math.random() > 0.5) {
            return {
              ...bus,
              status: 'RUNNING',
              speedKmH: 28,
              updatedTime: 'Vừa xong',
            };
          }
        }
        return { ...bus, updatedTime: 'Vừa xong' };
      })
    );
  };

  // 6. BUS INCIDENTS (Sprint 2)
  const reportIncident = (data: Omit<BusIncident, 'id' | 'reportedTime' | 'status'>) => {
    if (!data.routeId || !data.busPlate || !data.description.trim()) {
      return { success: false, message: 'Vui lòng cung cấp đầy đủ thông tin sự cố.' };
    }

    const formattedDate = getFormattedNow();
    const newId = `INC-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
    const newIncident: BusIncident = {
      ...data,
      id: newId,
      reportedTime: formattedDate,
      status: 'NEW',
    };

    setIncidents((prev) => [newIncident, ...prev]);

    // Push notification
    const newNotif: NotificationItem = {
      id: 'NOTIF-' + Date.now(),
      title: 'Báo cáo sự cố xe mới!',
      message: `Sự cố trên xe ${data.busPlate}: "${data.description}"`,
      createdAt: 'Vừa xong',
      type: 'WARNING',
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Báo cáo sự cố xe buýt',
      module: 'INCIDENT',
      description: `Báo cáo sự cố [${newId}] xe ${data.busPlate} - Loại: ${data.incidentType}`,
      status: 'WARNING',
      targetId: newId,
    });

    return { success: true, incident: newIncident };
  };

  const processIncident = (
    incidentId: string,
    status: IncidentStatus,
    resolutionNote?: string
  ) => {
    const formattedDate = getFormattedNow();

    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status,
              resolutionNote: resolutionNote || inc.resolutionNote,
              resolvedBy: currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Ban điều hành kỹ thuật',
              resolvedTime: formattedDate,
            }
          : inc
      )
    );

    addAuditLog({
      user: getActorName(),
      action: 'Xử lý báo cáo sự cố xe',
      module: 'INCIDENT',
      description: `Cập nhật trạng thái sự cố [${incidentId}] sang "${status}"`,
      status: 'SUCCESS',
      targetId: incidentId,
    });

    return { success: true, message: 'Đã cập nhật phương án xử lý sự cố!' };
  };

  // 7. DRIVER & ASSISTANT ASSIGNMENTS (Sprint 2 - Kiểm tra trùng lịch)
  const isShiftOverlapping = (
    shift1: ShiftType,
    date1: string,
    shift2: ShiftType,
    date2: string
  ): boolean => {
    if (date1 !== date2) return false;
    if (shift1 === 'TOAN_THOI_GIAN' || shift2 === 'TOAN_THOI_GIAN') return true;
    return shift1 === shift2;
  };

  const checkAssignmentConflict = (
    data: {
      busPlate?: string;
      driverName?: string;
      driverId?: string;
      date?: string;
      shift?: ShiftType;
    },
    excludeId?: string
  ): {
    hasConflict: boolean;
    type?: 'BUS' | 'DRIVER';
    message: string;
    conflicting?: BusAssignment;
  } | null => {
    const targetPlate = (data.busPlate || '').trim().toUpperCase();
    const targetDriver = (data.driverName || '').trim().toLowerCase();
    const targetDate = data.date || '';
    const targetShift = data.shift;

    if (!targetDate || !targetShift || (!targetPlate && !targetDriver)) {
      return null;
    }

    const conflicting = assignments.find((a) => {
      if (excludeId && a.id === excludeId) return false;
      if (a.status === 'CANCELLED') return false;
      const overlaps = isShiftOverlapping(targetShift, targetDate, a.shift, a.date);
      if (!overlaps) return false;

      if (targetPlate && a.busPlate.trim().toUpperCase() === targetPlate) return true;
      if (
        (data.driverId && a.driverId === data.driverId) ||
        (targetDriver && a.driverName.trim().toLowerCase() === targetDriver)
      ) {
        return true;
      }
      return false;
    });

    if (conflicting) {
      const isBus = Boolean(targetPlate && conflicting.busPlate.trim().toUpperCase() === targetPlate);
      const hoursInfo = conflicting.shiftHours ? ` (${conflicting.shiftHours})` : '';
      const message = isBus
        ? `Xung đột trùng lịch: Xe buýt [${targetPlate}] đã được xếp ca "${conflicting.shift}"${hoursInfo} ngày ${targetDate} (Lệnh: ${conflicting.id}, Tuyến: ${conflicting.routeId}).`
        : `Xung đột trùng lịch: Tài xế [${data.driverName || conflicting.driverName}] đã có ca trực "${conflicting.shift}"${hoursInfo} ngày ${targetDate} (Lệnh: ${conflicting.id}, Tuyến: ${conflicting.routeId}).`;

      return {
        hasConflict: true,
        type: isBus ? 'BUS' : 'DRIVER',
        message,
        conflicting,
      };
    }

    return null;
  };

  const addAssignment = (data: Omit<BusAssignment, 'id'>) => {
    if (!data.routeId || !data.busPlate || !data.driverName) {
      return { success: false, message: 'Vui lòng điền đủ thông tin phân công.' };
    }

    // Kiểm tra trùng lịch xe hoặc tài xế trong cùng ngày & ca làm việc (Requirement 7)
    const conflict = checkAssignmentConflict(data);
    if (conflict?.hasConflict) {
      return { success: false, message: conflict.message };
    }

    const normalizedPlate = data.busPlate.trim().toUpperCase();
    const newId = generateNextSequentialId(assignments, 'ASN', 3);
    const newAssignment: BusAssignment = {
      ...data,
      id: newId,
      busPlate: normalizedPlate,
    };

    setAssignments((prev) => [newAssignment, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Thêm phân công lái xe / phụ xe',
      module: 'ASSIGNMENT',
      description: `Phân công tài xế ${data.driverName} điều khiển xe ${normalizedPlate} tuyến ${data.routeId}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, assignment: newAssignment };
  };

  const updateAssignment = (id: string, updates: Partial<BusAssignment>) => {
    // Kiểm tra trùng lịch khi cập nhật (loại trừ chính id đang sửa)
    const current = assignments.find((a) => a.id === id);
    if (current) {
      const conflict = checkAssignmentConflict(
        {
          busPlate: updates.busPlate || current.busPlate,
          driverName: updates.driverName || current.driverName,
          driverId: updates.driverId || current.driverId,
          date: updates.date || current.date,
          shift: updates.shift || current.shift,
        },
        id
      );

      if (conflict?.hasConflict) {
        return {
          success: false,
          message: conflict.message,
        };
      }
    }

    setAssignments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updates,
              ...(updates.busPlate ? { busPlate: updates.busPlate.trim().toUpperCase() } : {}),
            }
          : a
      )
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật phân công lái/phụ xe',
      module: 'ASSIGNMENT',
      description: `Cập nhật nội dung phân công mã [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa phân công ca trực',
      module: 'ASSIGNMENT',
      description: `Xóa lệnh phân công ca làm việc [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  // 8. BUS FLEET MANAGEMENT (Sprint 2 - Quản lý xe buýt)
  const addBus = (data: Omit<BusVehicle, 'id'>) => {
    const normalizedPlate = data.plateNumber.trim().toUpperCase();
    const existing = buses.find(
      (b) => b.plateNumber.trim().toUpperCase() === normalizedPlate
    );
    if (existing) {
      return { success: false, message: `Biển số xe [${data.plateNumber}] đã tồn tại trong đội xe!` };
    }

    const newId = generateNextSequentialId(buses, 'BUS', 2);
    const newBus: BusVehicle = {
      ...data,
      id: newId,
      plateNumber: normalizedPlate,
    };

    setBuses((prev) => [newBus, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Thêm mới xe buýt vào đội xe',
      module: 'VEHICLE',
      description: `Thêm xe buýt [${newBus.plateNumber}] sức chứa ${newBus.capacity} chỗ (${newBus.rows} hàng x ${newBus.cols} cột)`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, bus: newBus };
  };

  const updateBus = (id: string, updates: Partial<BusVehicle>) => {
    if (updates.plateNumber) {
      const normalizedPlate = updates.plateNumber.trim().toUpperCase();
      const duplicate = buses.find(
        (b) => b.id !== id && b.plateNumber.trim().toUpperCase() === normalizedPlate
      );
      if (duplicate) {
        return { success: false, message: `Biển số xe [${updates.plateNumber}] đã được sử dụng bởi xe khác!` };
      }
    }

    setBuses((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              ...updates,
              ...(updates.plateNumber ? { plateNumber: updates.plateNumber.trim().toUpperCase() } : {}),
            }
          : b
      )
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật thông tin xe buýt',
      module: 'VEHICLE',
      description: `Cập nhật thông số/trạng thái xe [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteBus = (id: string) => {
    setBuses((prev) => prev.filter((b) => b.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa xe buýt khỏi hệ thống',
      module: 'VEHICLE',
      description: `Xóa xe buýt mã [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  // 9. TIMETABLE TEMPLATES (Sprint 2 - Quản lý thời gian biểu)
  const addTimetable = (data: Omit<TimetableTemplate, 'id'>) => {
    const newId = generateNextSequentialId(timetables, 'TT', 3);
    const newTimetable: TimetableTemplate = {
      ...data,
      id: newId,
    };

    setTimetables((prev) => [newTimetable, ...prev]);

    const route = routes.find((r) => r.id === data.routeId);
    addAuditLog({
      user: getActorName(),
      action: 'Tạo thời gian biểu mẫu theo tuyến',
      module: 'SCHEDULE',
      description: `Tạo mẫu thời gian biểu [${data.name}] tuyến ${route?.code || data.routeId} (${data.firstDeparture} - ${data.lastDeparture}, tần suất ${data.frequencyMinutes}p)`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, timetable: newTimetable };
  };

  const updateTimetable = (id: string, updates: Partial<TimetableTemplate>) => {
    setTimetables((prev) =>
      prev.map((tt) => (tt.id === id ? { ...tt, ...updates } : tt))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật thời gian biểu mẫu',
      module: 'SCHEDULE',
      description: `Cập nhật thời gian biểu mã [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const deleteTimetable = (id: string) => {
    setTimetables((prev) => prev.filter((tt) => tt.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa thời gian biểu mẫu',
      module: 'SCHEDULE',
      description: `Xóa mẫu thời gian biểu mã [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };


  // 8. QR CODE SCANNING (Sprint 2)
  const scanQrCode = (qrString: string) => {
    const cleanStr = qrString.trim();
    const matched = tickets.find(
      (t) => t.qrCodeData === cleanStr || t.id.toLowerCase() === cleanStr.toLowerCase()
    );

    if (!matched) {
      return {
        valid: false,
        status: 'INVALID' as const,
        message: 'Mã QR không hợp lệ hoặc không tồn tại trong cơ sở dữ liệu vé xe buýt.',
      };
    }

    if (matched.ticketStatus === 'CANCELLED') {
      return {
        valid: false,
        status: 'CANCELLED' as const,
        ticket: matched,
        message: 'Vé này đã bị hủy bỏ và không còn giá trị di chuyển.',
      };
    }

    if (matched.ticketStatus === 'USED') {
      return {
        valid: false,
        status: 'ALREADY_USED' as const,
        ticket: matched,
        message: 'Vé này đã được quét sử dụng trước đó.',
      };
    }

    // Ticket is valid and PAID -> mark as USED
    setTickets((prev) =>
      prev.map((t) => (t.id === matched.id ? { ...t, ticketStatus: 'USED' } : t))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Quét vé xe buýt QR thành công',
      module: 'TICKET',
      description: `Tiếp viên quét vé QR hợp lệ [${matched.id}] - Ghế ${matched.seatNumber}, khách ${matched.passengerName}`,
      status: 'SUCCESS',
      targetId: matched.id,
    });

    return {
      valid: true,
      status: 'VALID' as const,
      ticket: { ...matched, ticketStatus: 'USED' as const },
      message: 'Vé hợp lệ! Chào mừng hành khách lên xe.',
    };
  };

  // 9. DISCOUNT VERIFICATION OPERATIONS (Sprint 2 / US17)
  const approveVerification = (id: string, validUntil?: string, reviewerName?: string) => {
    const target = verifications.find((v) => v.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy hồ sơ ưu đãi.' };
    }

    const reviewer = reviewerName || getActorName();
    const approvedAt = new Date().toISOString();
    const expiryDate =
      validUntil ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setVerifications((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'APPROVED',
              reviewedBy: reviewer,
              reviewedAt: approvedAt,
              validUntil: expiryDate,
              rejectReason: undefined,
            }
          : v
      )
    );

    // Update user record if matching
    if (target.accountId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.accountId
            ? {
                ...u,
                isStudentVerified: target.beneficiaryType === 'STUDENT' ? true : u.isStudentVerified,
                beneficiaryType: target.beneficiaryType,
                discountValidUntil: expiryDate,
              }
            : u
        )
      );
    }

    addAuditLog({
      user: reviewer,
      action: 'Duyệt hồ sơ đối tượng ưu đãi',
      module: 'VERIFICATION',
      description: `Đã duyệt hồ sơ ưu đãi [${target.id}] cho hành khách ${target.passengerName} (${target.beneficiaryType}), hiệu lực đến ${expiryDate}`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const rejectVerification = (id: string, reason: string, reviewerName?: string) => {
    const target = verifications.find((v) => v.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy hồ sơ ưu đãi.' };
    }
    if (!reason.trim()) {
      return { success: false, message: 'Vui lòng nhập lý do từ chối hồ sơ.' };
    }

    const reviewer = reviewerName || getActorName();
    const reviewedAt = new Date().toISOString();

    setVerifications((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'REJECTED',
              rejectReason: reason.trim(),
              reviewedBy: reviewer,
              reviewedAt,
            }
          : v
      )
    );

    addAuditLog({
      user: reviewer,
      action: 'Từ chối hồ sơ đối tượng ưu đãi',
      module: 'VERIFICATION',
      description: `Từ chối hồ sơ [${target.id}] của ${target.passengerName}. Lý do: ${reason.trim()}`,
      status: 'SUCCESS',
      targetId: id,
    });

    return { success: true };
  };

  const addVerification = (item: Omit<PassengerVerification, 'id' | 'submittedAt' | 'status'>) => {
    const newId = generateYearPrefixId(verifications, 'VER', 3);
    const newVerification: PassengerVerification = {
      ...item,
      id: newId,
      status: 'PENDING',
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setVerifications((prev) => [newVerification, ...prev]);

    addAuditLog({
      user: getActorName(),
      action: 'Nộp hồ sơ ưu đãi mới',
      module: 'VERIFICATION',
      description: `Hành khách ${item.passengerName} nộp hồ sơ ưu đãi đối tượng ${item.beneficiaryType}`,
      status: 'SUCCESS',
      targetId: newId,
    });

    return { success: true, verification: newVerification };
  };

  const deleteVerification = (id: string) => {
    setVerifications((prev) => prev.filter((v) => v.id !== id));
    addAuditLog({
      user: getActorName(),
      action: 'Xóa hồ sơ ưu đãi',
      module: 'VERIFICATION',
      description: `Đã xóa hồ sơ ưu đãi [${id}]`,
      status: 'SUCCESS',
      targetId: id,
    });
    return { success: true };
  };

  // 10. VOUCHER / PROMOTION OPERATIONS (Sprint 2 / US18)
  const addVoucher = (data: Omit<Voucher, 'id' | 'createdAt' | 'usedCount' | 'remainingCount' | 'isActive' | 'status'>) => {
    const upperCode = data.code.trim().toUpperCase();
    if (vouchers.some((v) => v.code.toUpperCase() === upperCode)) {
      return { success: false, message: `Mã giảm giá "${upperCode}" đã tồn tại trên hệ thống.` };
    }

    const newId = vouchers.reduce((max, v) => Math.max(max, Number(v.id) || 0), 0) + 1;
    const newVoucher: Voucher = {
      ...data,
      id: newId,
      code: upperCode,
      usedCount: 0,
      remainingCount: data.usageLimit,
      isActive: true,
      active: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setVouchers((prev) => [newVoucher, ...prev]);

    const isPercent = data.discountType === 'Percent';
    addAuditLog({
      user: getActorName(),
      action: 'Tạo mã giảm giá mới',
      module: 'VOUCHER',
      description: `Tạo voucher ${upperCode} (${isPercent ? `${data.discountValue}%` : `${data.discountValue.toLocaleString()} VNĐ`})`,
      status: 'SUCCESS',
      targetId: String(newId),
    });

    return { success: true, voucher: newVoucher };
  };

  const updateVoucher = (id: number, updates: Partial<Voucher>) => {
    const target = vouchers.find((v) => v.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy mã giảm giá.' };
    }

    if (updates.code) {
      const upperCode = updates.code.trim().toUpperCase();
      if (vouchers.some((v) => v.id !== id && v.code.toUpperCase() === upperCode)) {
        return { success: false, message: `Mã giảm giá "${upperCode}" đã trùng với một voucher khác.` };
      }
      updates.code = upperCode;
    }

    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );

    addAuditLog({
      user: getActorName(),
      action: 'Cập nhật mã giảm giá',
      module: 'VOUCHER',
      description: `Cập nhật thông tin voucher [${target.code}]`,
      status: 'SUCCESS',
      targetId: String(id),
    });

    return { success: true };
  };

  const deleteVoucher = (id: number) => {
    const target = vouchers.find((v) => v.id === id);
    setVouchers((prev) => prev.filter((v) => v.id !== id));

    addAuditLog({
      user: getActorName(),
      action: 'Xóa mã giảm giá',
      module: 'VOUCHER',
      description: `Đã xóa mã voucher [${target ? target.code : id}]`,
      status: 'SUCCESS',
      targetId: String(id),
    });

    return { success: true };
  };

  const toggleVoucherStatus = (id: number) => {
    const target = vouchers.find((v) => v.id === id);
    if (!target) {
      return { success: false, message: 'Không tìm thấy voucher.' };
    }

    const nextState = !(target.active ?? target.isActive);
    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: nextState, isActive: nextState, status: nextState ? 'ACTIVE' : 'EXPIRED' } : v))
    );

    addAuditLog({
      user: getActorName(),
      action: nextState ? 'Kích hoạt voucher' : 'Tạm ngưng voucher',
      module: 'VOUCHER',
      description: `Đã ${nextState ? 'kích hoạt' : 'tắt kích hoạt'} mã giảm giá [${target.code}]`,
      status: 'SUCCESS',
      targetId: String(id),
    });

    return { success: true };
  };

  return (
    <DataContext.Provider
      value={{
        // SPRINT 1
        users,
        addAccount,
        updateAccount,
        deleteAccount,
        assignRole,

        routes,
        addRoute,
        updateRoute,
        deleteRoute,

        stops,
        getStopsByRoute,
        addStop,
        updateStop,
        deleteStop,
        moveStopUp,
        moveStopDown,

        fares,
        getFaresByRoute,
        addFare,
        updateFare,
        deleteFare,

        complaints,
        addComplaint,
        updateComplaintStatus,

        ratings,
        addRating,

        auditLogs,
        addAuditLog,

        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,

        // SPRINT 2
        trips,
        addTrip,
        addTripsBatch,
        updateTrip,
        deleteTrip,

        tickets,
        bookTicket,
        cancelTicket,
        changeTicket,

        payments,
        invoices,
        processPayment,

        refunds,
        requestRefund,
        processRefund,

        trackings,
        refreshSimulatedGps,

        incidents,
        reportIncident,
        processIncident,

        assignments,
        checkAssignmentConflict,
        addAssignment,
        updateAssignment,
        deleteAssignment,

        buses,
        addBus,
        updateBus,
        deleteBus,

        timetables,
        addTimetable,
        updateTimetable,
        deleteTimetable,

        scanQrCode,

        // US17: Beneficiary Verifications
        verifications,
        approveVerification,
        rejectVerification,
        addVerification,
        deleteVerification,

        // US18: Vouchers & Promotions
        vouchers,
        addVoucher,
        updateVoucher,
        deleteVoucher,
        toggleVoucherStatus,
      }}

    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
