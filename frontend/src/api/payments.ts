/**
 * Thanh toán, hóa đơn và hoàn tiền.
 *
 * Khớp với backend PaymentsController (/api/payments), InvoicesController (/api/invoices) và
 * RefundsController (/api/refunds). Enum PaymentMethod đi qua JSON dưới dạng số, theo thứ tự trong Enums.cs.
 */

import { api } from './client';

export enum PaymentMethodCode {
  Momo = 0,
  VnPay = 1,
  ZaloPay = 2,
  Card = 3,
  BankTransfer = 4,
}

export const PAYMENT_METHOD_OPTIONS: { code: PaymentMethodCode; label: string }[] = [
  { code: PaymentMethodCode.Momo, label: 'Ví MoMo' },
  { code: PaymentMethodCode.VnPay, label: 'VNPay' },
  { code: PaymentMethodCode.ZaloPay, label: 'ZaloPay' },
  { code: PaymentMethodCode.BankTransfer, label: 'Chuyển khoản ngân hàng' },
  { code: PaymentMethodCode.Card, label: 'Thẻ ngân hàng' },
];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  Momo: 'Ví MoMo',
  VnPay: 'VNPay',
  ZaloPay: 'ZaloPay',
  Card: 'Thẻ ngân hàng',
  BankTransfer: 'Chuyển khoản',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  Pending: 'Chờ thanh toán',
  Success: 'Thành công',
  Failed: 'Thất bại',
  Refunded: 'Đã hoàn tiền',
};

export const REFUND_STATUS_LABEL: Record<string, string> = {
  Pending: 'Chờ xử lý',
  Success: 'Đã hoàn tiền',
  Failed: 'Từ chối',
};

export const REFUND_REASON_LABEL: Record<string, string> = {
  PaymentFailed: 'Thanh toán lỗi',
  TicketCancelled: 'Hủy vé',
  TripCancelled: 'Hủy chuyến',
};

export interface RefundSummary {
  id: number;
  amount: number;
  status: string;
  reason: string;
  createdAt: string;
  processedAt: string | null;
  note: string | null;
}

export interface PaymentDto {
  id: number;
  bookingId: number;
  bookingCode: string;
  passengerId: number;
  passengerName: string;
  method: string;
  amount: number;
  status: string;
  providerTxnId: string | null;
  paidAt: string | null;
  tripId: number;
  routeCode: string;
  routeName: string;
  departureAt: string;
  seats: string[];
  invoiceId: number | null;
  invoiceNo: string | null;
  refundedAmount: number;
  refunds: RefundSummary[];
}

export interface InvoiceDto {
  id: number;
  passengerId: number;
  invoiceNo: string;
  paymentId: number;
  bookingCode: string;
  passengerName: string;
  email: string | null;
  total: number;
  method: string;
  paidAt: string | null;
  routeCode: string;
  routeName: string;
  departureAt: string;
  seats: string[];
}

export interface RefundDto {
  id: number;
  paymentId: number;
  bookingCode: string;
  passengerName: string;
  passengerEmail: string | null;
  passengerPhone: string | null;
  paymentMethod: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  processedByName: string | null;
  note: string | null;
  changeRequestId: number | null;
}

export const payBooking = (bookingId: number, method: PaymentMethodCode) =>
  api.post<PaymentDto>('/api/payments', { bookingId, method });

export const listMyPayments = (signal?: AbortSignal) => api.get<PaymentDto[]>('/api/payments/my', undefined, signal);

export const listAllPayments = (signal?: AbortSignal) => api.get<PaymentDto[]>('/api/payments', undefined, signal);

export const listMyInvoices = (signal?: AbortSignal) => api.get<InvoiceDto[]>('/api/invoices/my', undefined, signal);

export const listAllInvoices = (signal?: AbortSignal) => api.get<InvoiceDto[]>('/api/invoices', undefined, signal);

export const listRefunds = (signal?: AbortSignal) => api.get<RefundDto[]>('/api/refunds', undefined, signal);

export const listMyRefunds = (signal?: AbortSignal) => api.get<RefundDto[]>('/api/refunds/my', undefined, signal);

export const processRefund = (id: number, approve: boolean, note?: string) =>
  api.patch<RefundDto>(`/api/refunds/${id}/process`, { approve, note });

export const formatVnd = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} đ`;

/** Giờ backend trả về là UTC nhưng không có hậu tố Z. */
export const parseUtc = (iso: string): Date => new Date(iso.endsWith('Z') ? iso : `${iso}Z`);

export const formatDateTime = (iso: string | null): string => {
  if (!iso) return '-';
  const d = parseUtc(iso);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })} ${d.toLocaleDateString('vi-VN')}`;
};
