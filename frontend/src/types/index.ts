export type Role = 'ADMIN' | 'MANAGER' | 'DRIVER' | 'PASSENGER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  avatarUrl?: string;
  department?: string;
}

export type AuditModule =
  | 'AUTH'
  | 'ACCOUNT'
  | 'ROLE'
  | 'ROUTE'
  | 'STOP'
  | 'FARE'
  | 'COMPLAINT'
  | 'RATING'
  | 'PAYMENT'
  | 'TICKET'
  | 'INVOICE'
  | 'REFUND'
  | 'TRACKING'
  | 'INCIDENT'
  | 'SCHEDULE'
  | 'ASSIGNMENT'
  | 'SYSTEM';

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'WARNING';

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  module: AuditModule;
  description: string;
  dateTime: string;
  status: AuditStatus;
  ipAddress?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

export type RouteStatus = 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';

export interface BusRoute {
  id: string;
  code: string; // e.g. "T01"
  routeCode?: string;
  name: string; // e.g. "Bến xe Trung tâm - Khu Công nghệ cao"
  startPoint: string;
  endPoint: string;
  distance: number; // km
  durationMinutes: number; // minutes
  status: RouteStatus;
  stopCount: number;
  operatingHours: string; // e.g. "05:00 - 21:00"
  frequencyMinutes: number; // e.g. 15
  description?: string;
}

export type StopStatus = 'ACTIVE' | 'INACTIVE';

export interface BusStop {
  id: string;
  name: string;
  address: string;
  routeId: string;
  order: number; // 1, 2, 3...
  status: StopStatus;
  isTerminal?: boolean;
  latitude?: number;
  longitude?: number;
}

export type PassengerType = 'REGULAR' | 'STUDENT' | 'ELDERLY_DISABLED' | 'MONTHLY_PASS';

export type FareStatus = 'ACTIVE' | 'EXPIRED' | 'UPCOMING';

export interface Fare {
  id: string;
  routeId: string;
  passengerType: PassengerType;
  price: number; // VND
  effectiveDate: string; // YYYY-MM-DD
  status: FareStatus;
  notes?: string;
}

export type ComplaintCategory =
  | 'ATTITUDE'
  | 'DELAY'
  | 'OVERCHARGING'
  | 'VEHICLE_QUALITY'
  | 'SAFETY'
  | 'OTHER';

export type ComplaintStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';

export interface Complaint {
  id: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  routeId: string;
  tripDate: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  createdAt: string;
  status: ComplaintStatus;
  adminResponse?: string;
  processedBy?: string;
  processedAt?: string;
}

export interface TripRating {
  id: string;
  passengerName: string;
  passengerEmail: string;
  routeId: string;
  tripDate: string;
  rating: number; // 1 - 5
  review: string;
  createdAt: string;
  busPlate?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
  isRead: boolean;
}

// ==============================================================
// SPRINT 2 TYPES
// ==============================================================

export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface BusTrip {
  id: string; // e.g. "TRIP-101"
  routeId: string;
  busPlate: string; // e.g. "51B-184.22"
  driverName: string;
  assistantName?: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm e.g. "07:30"
  estimatedArrivalTime: string; // HH:mm e.g. "08:15"
  price: number; // VND
  totalSeats: number; // e.g. 24
  bookedSeats: string[]; // e.g. ["A1", "A3", "B2"]
  status: TripStatus;
  tripCode?: string;
  routeName?: string;
  routeCode?: string;
  availableSeats?: number;
  occupiedSeats?: string[];
}

export type SeatState = 'AVAILABLE' | 'SELECTED' | 'BOOKED' | 'DISABLED';

export type PaymentMethod = 'MOMO' | 'VNPAY' | 'ZALOPAY' | 'BANK_TRANSFER';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentRecord {
  id: string; // e.g. "PAY-2026-001"
  ticketId: string;
  passengerName: string;
  passengerEmail: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionCode: string;
  createdAt: string;
  details?: string;
  transactionId?: string;
  ticketCode?: string;
}

export type TicketPaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export type TicketStatus = 'PENDING' | 'PAID' | 'USED' | 'CANCELLED' | 'CHANGED';

export interface Ticket {
  id: string; // e.g. "TKT-2026-001"
  passengerId?: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  tripId: string;
  routeId: string;
  departureDate: string;
  departureTime: string;
  seatNumber: string; // e.g. "A2"
  busPlate: string;
  price: number;
  paymentId?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus: TicketPaymentStatus;
  ticketStatus: TicketStatus;
  qrCodeData: string;
  createdAt: string;
  cancelledAt?: string;
  cancelReason?: string;
  changedToTicketId?: string;
  ticketCode?: string;
  routeName?: string;
  status?: TicketStatus;
  qrCodeValue?: string;
}

export interface ElectronicInvoice {
  id: string; // e.g. "INV-2026-001"
  ticketId: string;
  paymentId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerTaxCode?: string;
  customerAddress?: string;
  routeName: string;
  routeCode: string;
  seatNumber: string;
  departureDate: string;
  departureTime: string;
  amount: number;
  vatRate: number; // e.g. 0.08
  vatAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  invoiceDate: string;
  status: 'ISSUED' | 'CANCELLED';
  signingAuthority: string;
  invoiceNumber?: string;
  ticketCode?: string;
  taxCode?: string;
  amountBeforeTax?: number;
  taxAmount?: number;
  createdAt?: string;
}

export type RefundStatus = 'NOT_REQUESTED' | 'PROCESSING' | 'REFUNDED' | 'REJECTED' | 'PENDING' | 'APPROVED';

export interface RefundRequest {
  id: string; // e.g. "REF-2026-001"
  ticketId: string;
  paymentId?: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  amount: number;
  refundReason: string;
  refundStatus: RefundStatus;
  requestDate: string;
  resolvedDate?: string;
  adminNote?: string;
  processedBy?: string;
  refundCode?: string;
  ticketCode?: string;
  reason?: string;
  status?: RefundStatus;
  createdAt?: string;
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
}

export type TrackingStatus = 'RUNNING' | 'STOPPED' | 'ARRIVED_STOP' | 'INACTIVE' | 'ON_ROUTE' | 'DELAYED' | 'MAINTENANCE';

export interface BusTracking {
  busId: string;
  busPlate: string;
  routeId: string;
  currentLocationName: string;
  nextStopName: string;
  speedKmH: number;
  driverName: string;
  latitude: number;
  longitude: number;
  status: TrackingStatus;
  updatedTime: string;
  heading: number; // 0-360 degrees
  id?: string;
  routeCode?: string;
  routeName?: string;
  speed?: number;
  currentStop?: string;
  nextStop?: string;
  estimatedArrival?: string;
  updatedAt?: string;
}

export type IncidentType =
  | 'MECHANICAL'
  | 'PUNCTURE'
  | 'COLLISION'
  | 'AC_FAILURE'
  | 'PASSENGER_HEALTH'
  | 'ENGINE_BREAKDOWN'
  | 'FLAT_TIRE'
  | 'AC_BROKEN'
  | 'OTHER';

export type IncidentStatus = 'NEW' | 'PROCESSING' | 'RESOLVED' | 'REPORTED' | 'IN_PROGRESS';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BusIncident {
  id: string; // e.g. "INC-2026-001"
  routeId: string;
  busPlate: string;
  incidentType: IncidentType;
  description: string;
  location?: string;
  reportedBy: string;
  reportedPhone?: string;
  reportedTime: string;
  status: IncidentStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedTime?: string;
  incidentCode?: string;
  routeName?: string;
  type?: IncidentType;
  severity?: IncidentSeverity;
  reporterPhone?: string;
  createdAt?: string;
  resolutionNotes?: string;
}

export type ShiftType = 'CA_SANG' | 'CA_CHIEU' | 'CA_TOI' | 'TOAN_THOI_GIAN';

export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface BusAssignment {
  id: string; // e.g. "ASN-001"
  routeId: string;
  busPlate: string;
  driverId: string;
  driverName: string;
  assistantId?: string;
  assistantName?: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  shiftHours: string; // e.g. "05:00 — 13:30"
  status: AssignmentStatus;
  notes?: string;
}
