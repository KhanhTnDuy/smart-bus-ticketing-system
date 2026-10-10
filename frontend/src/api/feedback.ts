/**
 * US4 - Phản ánh và đánh giá chuyến đi (phía quản lý).
 *
 * Khớp với backend/SmartBusTicketing.Api/Controllers/FeedbackController.cs và
 * FeedbackDto trong DTOs/ApiDtos.cs.
 *
 * Program.cs chưa đăng ký JsonStringEnumConverter nên enum đi qua JSON dưới dạng
 * số; hai enum dưới đây phải giữ đúng thứ tự khai báo trong Models/Enums.cs.
 */

import { api, request } from './client';

export enum FeedbackTypeCode {
  Complaint = 0,
  Review = 1,
}

export enum FeedbackStatusCode {
  ChuaXuLy = 0,
  DangXuLy = 1,
  DaXuLy = 2,
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatusCode, string> = {
  [FeedbackStatusCode.ChuaXuLy]: 'Chưa xử lý',
  [FeedbackStatusCode.DangXuLy]: 'Đang xử lý',
  [FeedbackStatusCode.DaXuLy]: 'Đã xử lý',
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackTypeCode, string> = {
  [FeedbackTypeCode.Complaint]: 'Khiếu nại',
  [FeedbackTypeCode.Review]: 'Đánh giá chuyến đi',
};

export interface FeedbackDto {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerEmail: string | null;
  passengerPhone: string | null;
  routeId: number | null;
  routeCode: string | null;
  routeName: string | null;
  tripId: number | null;
  type: FeedbackTypeCode;
  subject: string;
  content: string;
  rating: number;
  imagePath: string | null;
  status: FeedbackStatusCode;
  processedBy: number | null;
  processedByName: string | null;
  /** Giờ UTC, xem api/datetime.ts. */
  createdAt: string;
}

export interface FeedbackHistoryDto {
  id: number;
  oldStatus: FeedbackStatusCode;
  newStatus: FeedbackStatusCode;
  changedBy: number;
  changedByName: string | null;
  changedAt: string;
}

export interface FeedbackDetailDto extends FeedbackDto {
  history: FeedbackHistoryDto[];
}

/** Khai báo bằng `type` để truyền thẳng vào tham số `query` của api.get. */
export type FeedbackQuery = {
  status?: FeedbackStatusCode;
  type?: FeedbackTypeCode;
  /** Tìm trong tiêu đề, nội dung và tên hành khách. */
  search?: string;
};

export const listFeedbacks = (query?: FeedbackQuery, signal?: AbortSignal) =>
  api.get<FeedbackDto[]>('/api/feedback', query, signal);

export const getFeedback = (id: number, signal?: AbortSignal) =>
  api.get<FeedbackDetailDto>(`/api/feedback/${id}`, undefined, signal);

/** Đổi trạng thái xử lý. Backend ghi thêm một dòng vào lịch sử và nhật ký hệ thống. */
export const updateFeedbackStatus = (id: number, status: FeedbackStatusCode) =>
  request<FeedbackDto>(`/api/feedback/${id}/status`, { method: 'PATCH', body: { status } });

export interface CreateFeedbackRequest {
  passengerId: number;
  routeId?: number;
  tripId?: number;
  type: FeedbackTypeCode;
  subject: string;
  content?: string;
  rating?: number;
  imagePath?: string;
}

/** Hành khách gửi phản ánh hoặc đánh giá. Backend lấy người gửi từ JWT, bỏ qua passengerId trong body. */
export const createFeedback = (body: CreateFeedbackRequest) => api.post<FeedbackDto>('/api/feedback', body);

/** Phản ánh, đánh giá do chính người đăng nhập gửi. */
export const listMyFeedback = (type?: FeedbackTypeCode, signal?: AbortSignal) =>
  api.get<FeedbackDto[]>('/api/feedback/my', { type }, signal);
