/**
 * SCRUM-54/55/56/62 - Tra cứu chuyến, sơ đồ ghế và xác nhận đặt vé.
 *
 * Các kiểu dưới đây khớp 1-1 với DTO của backend:
 * - backend/SmartBusTicketing.Api/DTOs/TripDtos.cs
 * - backend/SmartBusTicketing.Api/DTOs/TripSeatMapDtos.cs
 * - backend/SmartBusTicketing.Api/DTOs/ConfirmBookingDto.cs
 */

import { api } from './client';

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
