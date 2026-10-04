/**
 * US5 - Yêu cầu hủy / đổi vé.
 *
 * Hành khách gửi yêu cầu (xem src/api/booking.ts), Admin/Quản lý duyệt hoặc từ chối ở đây.
 * Vé và ghế chỉ thực sự thay đổi khi yêu cầu được duyệt.
 *
 * Khớp 1-1 với DTO backend ở backend/SmartBusTicketing.Api/DTOs/TicketChangeDtos.cs.
 */

import { api } from './client';

export type ChangeRequestStatus = 'Pending' | 'Approved' | 'Rejected';
export type ChangeRequestType = 'Cancel' | 'Exchange';

export interface TicketChangeRequestDto {
  id: number;
  requestType: ChangeRequestType;
  status: ChangeRequestStatus;
  /** Lý do hành khách nhập. Bắt buộc với yêu cầu hủy, tùy chọn với yêu cầu đổi. */
  reason: string | null;
  /** Giờ Việt Nam, đã định dạng yyyy-MM-dd HH:mm bởi máy chủ. Không bọc new Date(). */
  createdAt: string;
  processedAt: string | null;
  processedByName: string | null;

  ticketId: number;
  bookingCode: string;
  seatCode: string;
  ticketStatus: string;
  ticketPrice: number;

  tripId: number;
  routeCode: string;
  routeName: string;
  departureDate: string;
  departureTime: string;
  busPlate: string;

  /** Chỉ có với yêu cầu đổi vé. */
  newTripId: number | null;
  newDepartureDate: string | null;
  newDepartureTime: string | null;
  newBusPlate: string | null;
  newSeatId: number | null;
  newSeatCode: string | null;

  passengerId: number;
  passengerName: string;
  passengerPhone: string | null;
}

export interface ProcessChangeRequestResult {
  message: string;
  changeRequestId: number;
  status: ChangeRequestStatus;
  /** Với yêu cầu đổi vé đã duyệt: vé mới được phát. */
  newTicketId: number | null;
  newSeatCode: string | null;
  bookingCancelled: boolean;
  /** Luôn 0 hiện tại: chưa có luồng thanh toán nên không có giao dịch nào để hoàn. */
  refundAmount: number;
}

/** Yêu cầu của chính hành khách đang đăng nhập. */
export const listMyChangeRequests = (signal?: AbortSignal) =>
  api.get<TicketChangeRequestDto[]>('/api/ticket-change-requests/my', undefined, signal);

/** Toàn bộ yêu cầu, chỉ Admin/Quản lý. Đang chờ được xếp lên đầu. */
export const listChangeRequests = (status?: ChangeRequestStatus, signal?: AbortSignal) =>
  api.get<TicketChangeRequestDto[]>('/api/ticket-change-requests', { status }, signal);

/** Duyệt: đây là lúc vé và ghế thực sự thay đổi. */
export const approveChangeRequest = (id: number) =>
  api.post<ProcessChangeRequestResult>(`/api/ticket-change-requests/${id}/approve`);

/** Từ chối: vé của hành khách không thay đổi gì. */
export const rejectChangeRequest = (id: number) =>
  api.post<ProcessChangeRequestResult>(`/api/ticket-change-requests/${id}/reject`);
