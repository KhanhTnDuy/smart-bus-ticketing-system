/**
 * SCRUM-54/55/56/62 - Tra cứu chuyến, sơ đồ ghế và xác nhận đặt vé.
 *
 * Các kiểu dưới đây khớp 1-1 với DTO của backend:
 * - backend/SmartBusTicketing.Api/DTOs/TripDtos.cs
 * - backend/SmartBusTicketing.Api/DTOs/TripSeatMapDtos.cs
 * - backend/SmartBusTicketing.Api/DTOs/ConfirmBookingDto.cs
 */

import { api } from './client';
import { Ticket, TicketStatus } from '../types';

// ---------- Kiểu dữ liệu theo DTO backend ----------

/** Giá vé của một đối tượng hành khách trên chuyến, backend đã tính sẵn phần giảm. */
export interface TripPassengerFareDto {
  passengerTypeId: number;
  passengerTypeCode: string;
  passengerTypeName: string;
  discountPercent: number;
  price: number;
}

export interface TripDto {
  id: number;
  tripId: number;
  tripCode: string;
  routeId: number;
  routeCode: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  /** Điểm đi/đến cụ thể của lượt tìm kiếm, chỉ là tên trạm nên không dùng để đặt vé được. */
  departurePoint: string;
  arrivalPoint: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  estimatedArrivalTime: string;
  travelDate: string;
  busPlate: string;
  vehicle: string;
  driverName: string;
  assistantName: string | null;
  price: number;
  totalSeats: number;
  bookedSeats: string[];
  availableSeats: number;
  prices: TripPassengerFareDto[];
  status: string;
  delayMinutes: number;
}

export interface TripSeatDto {
  seatId: number;
  seatCode: string;
  row: number;
  column: number;
  status: string;
  isAvailable: boolean;
}

/** Ghế gửi lên là SeatId (số) chứ không phải mã ghế; điểm lên/xuống là StopId của tuyến. */
export interface ConfirmBookingRequest {
  tripId: number;
  seatIds: number[];
  boardStopId: number;
  alightStopId: number;
}

export interface ConfirmBookingResponse {
  message: string;
  bookingId: number;
  bookingCode: string;
  tripId: number;
  bookedSeats: string[];
  totalSeats: number;
  /**
   * Số tiền do máy chủ chốt. Backend tính theo hồ sơ đối tượng ưu đãi đã được duyệt
   * của tài khoản, KHÔNG theo đối tượng người dùng chọn trên giao diện, nên giá trị
   * này có thể khác số hiển thị lúc chọn ghế. Luôn hiển thị số của máy chủ.
   */
  finalAmount: number;
  /** Hết thời điểm này mà chưa thanh toán thì chỗ được nhả cho khách khác. */
  holdExpiresAt: string;
}

/** Một vé của hành khách đang đăng nhập; mỗi ghế là một vé riêng. */
export interface MyTicketDto {
  ticketId: number;
  bookingId: number;
  bookingCode: string;
  qrCode: string;
  seatCode: string;
  /** Held | Valid | Used | Cancelled | Exchanged | Expired */
  status: string;
  /** Pending | Confirmed | Cancelled | Expired */
  bookingStatus: string;
  holdExpiresAt: string;
  tripId: number;
  routeId: number;
  routeCode: string;
  routeName: string;
  departureDate: string;
  departureTime: string;
  busPlate: string;
  boardStopName: string;
  alightStopName: string;
  /** Giá của riêng vé này (tổng tiền lượt đặt chia số vé). */
  price: number;
  bookingFinalAmount: number;
  passengerName: string;
  passengerPhone: string | null;
}

export interface TripSearchParams {
  /** Tên trạm, ID trạm, hoặc điểm đầu/cuối tuyến. */
  from?: string;
  to?: string;
  /** Định dạng YYYY-MM-DD. */
  date?: string;
  routeId?: number;
}

// ---------- Hàm gọi API ----------

/** SCRUM-54/55: tìm chuyến theo điểm đi, điểm đến và ngày. Không cần đăng nhập. */
export const searchTrips = (params: TripSearchParams, signal?: AbortSignal) =>
  api.get<TripDto[]>('/api/trips/search', { ...params }, signal);

/** Sơ đồ ghế thật của chuyến. Chuyến chưa gán xe sẽ trả về mảng rỗng. */
export const getTripSeats = (tripId: number, signal?: AbortSignal) =>
  api.get<TripSeatDto[]>(`/api/trips/${tripId}/seats`, undefined, signal);

/** SCRUM-62: xác nhận đặt vé, giữ chỗ trong 10 phút. Bắt buộc đăng nhập. */
export const confirmBooking = (body: ConfirmBookingRequest) =>
  api.post<ConfirmBookingResponse>('/api/bookings', body);

export interface CancelTicketResult {
  message: string;
  ticketId: number;
  seatCode: string;
  changeRequestId: number;
  /** Luôn 0 hiện tại: chưa có luồng thanh toán nên không có giao dịch nào để hoàn. */
  refundAmount: number;
  /** Lượt đặt đã bị đóng vì không còn vé nào còn hiệu lực. */
  bookingCancelled: boolean;
}

export interface ExchangeTicketResult {
  message: string;
  oldTicketId: number;
  newTicketId: number;
  newSeatCode: string;
  newTripId: number;
  newDepartureDate: string;
  newDepartureTime: string;
  changeRequestId: number;
  /** Luôn 0 hiện tại: chưa thu thêm hay hoàn phần chênh giá. */
  priceDifference: number;
}

/** Hủy vé của chính mình; ghế được nhả ngay. Lý do là bắt buộc, 3–255 ký tự. */
export const cancelTicket = (ticketId: number, reason: string) =>
  api.post<CancelTicketResult>(`/api/tickets/${ticketId}/cancel`, { reason });

/** Đổi vé sang chuyến và ghế khác. Vé cũ thành Exchanged, một vé mới được phát. */
export const exchangeTicket = (ticketId: number, newTripId: number, newSeatId: number) =>
  api.post<ExchangeTicketResult>(`/api/tickets/${ticketId}/exchange`, { newTripId, newSeatId });

/**
 * Vé của chính tài khoản đang đăng nhập. Máy chủ đã lọc theo tài khoản nên không
 * có cách xem vé của người khác, kể cả vai trò quản trị: hệ thống chưa có endpoint
 * liệt kê toàn bộ vé.
 */
export const listMyTickets = (signal?: AbortSignal) =>
  api.get<MyTicketDto[]>('/api/bookings/my', undefined, signal);

/** Trạng thái vé của backend quy về tập trạng thái mà giao diện đang dùng. */
const mapTicketStatus = (status: string): TicketStatus => {
  switch (status) {
    case 'Valid':
      return 'PAID';
    case 'Used':
      return 'USED';
    case 'Exchanged':
      return 'CHANGED';
    case 'Cancelled':
      // Vé quá hạn giữ chỗ cũng về đây: giao diện chưa có trạng thái "hết hạn" riêng.
      return 'CANCELLED';
    case 'Expired':
      return 'CANCELLED';
    default:
      // Held: đã giữ chỗ nhưng chưa thanh toán.
      return 'PENDING';
  }
};

/**
 * Đưa vé từ máy chủ về đúng kiểu `Ticket` mà các trang hiện có đang dùng,
 * để không phải viết lại giao diện.
 *
 * Hai trường giao diện cần mà backend chưa lưu:
 * - `createdAt`: bảng bookings không có cột thời điểm tạo, nên để trống thay vì bịa.
 * - `passengerEmail`: endpoint không trả email, cũng để trống.
 */
export const toTicket = (dto: MyTicketDto): Ticket => ({
  // Mã vé ghép từ mã đặt chỗ và mã ghế: vừa duy nhất, vừa tra lại được lượt đặt.
  id: `${dto.bookingCode}-${dto.seatCode}`,
  passengerId: undefined,
  passengerName: dto.passengerName,
  passengerEmail: '',
  passengerPhone: dto.passengerPhone ?? '',
  tripId: String(dto.tripId),
  routeId: String(dto.routeId),
  routeName: `${dto.routeCode} - ${dto.routeName}`,
  departureDate: dto.departureDate,
  departureTime: dto.departureTime,
  seatNumber: dto.seatCode,
  busPlate: dto.busPlate,
  price: dto.price,
  paymentStatus: dto.status === 'Valid' || dto.status === 'Used' ? 'PAID' : 'PENDING',
  ticketStatus: mapTicketStatus(dto.status),
  status: mapTicketStatus(dto.status),
  qrCodeData: dto.qrCode,
  qrCodeValue: dto.qrCode,
  ticketCode: dto.bookingCode,
  createdAt: '',
});
