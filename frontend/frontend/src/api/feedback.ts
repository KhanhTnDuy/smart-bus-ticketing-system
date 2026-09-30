/**
 * US4 - Phản ánh khiếu nại và đánh giá chất lượng chuyến đi.
 *
 * Khớp với backend SmartBusTicketing.Api/Controllers/FeedbackController.cs
 */

import { api } from './client';
import { Complaint, ComplaintCategory, ComplaintStatus, TripRating } from '../types';

export enum BackendFeedbackType {
  Complaint = 0,
  Review = 1,
}

export enum BackendFeedbackStatus {
  ChuaXuLy = 0,
  DangXuLy = 1,
  DaXuLy = 2,
}

export interface FeedbackPassengerDto {
  id: number;
  username: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}

export interface FeedbackRouteDto {
  id: number;
  code: string;
  name: string;
}

export interface FeedbackDto {
  id: number;
  passengerId: number;
  passenger?: FeedbackPassengerDto | null;
  routeId?: number | null;
  busRoute?: FeedbackRouteDto | null;
  tripId?: number | null;
  type: BackendFeedbackType | number;
  subject: string;
  content: string;
  rating?: number;
  imagePath?: string | null;
  status: BackendFeedbackStatus | number;
  createdAt?: string;
  processedBy?: number | null;
  processedAt?: string;
  adminResponse?: string;
}

export interface CreateFeedbackRequest {
  passengerId?: number;
  routeId?: number;
  tripId?: number;
  type: BackendFeedbackType | number;
  subject: string;
  content: string;
  rating?: number;
  imagePath?: string;
}

export interface FeedbackStatusRequest {
  status: BackendFeedbackStatus | number;
}

export const statusToBackend = (status: ComplaintStatus): BackendFeedbackStatus => {
  switch (status) {
    case 'PROCESSING':
      return BackendFeedbackStatus.DangXuLy;
    case 'RESOLVED':
    case 'REJECTED':
      return BackendFeedbackStatus.DaXuLy;
    default:
      return BackendFeedbackStatus.ChuaXuLy;
  }
};

export const backendToStatus = (status: BackendFeedbackStatus | number): ComplaintStatus => {
  if (status === BackendFeedbackStatus.DangXuLy || status === 1) return 'PROCESSING';
  if (status === BackendFeedbackStatus.DaXuLy || status === 2) return 'RESOLVED';
  return 'PENDING';
};

export const toComplaint = (dto: FeedbackDto): Complaint => {
  return {
    id: `FB-${dto.id}`,
    passengerName: dto.passenger?.fullName || `Hành khách #${dto.passengerId}`,
    passengerEmail: dto.passenger?.email || '',
    passengerPhone: dto.passenger?.phone || '',
    routeId: dto.routeId ? String(dto.routeId) : '',
    tripDate: dto.createdAt ? dto.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    category: 'ATTITUDE' as ComplaintCategory,
    subject: dto.subject,
    description: dto.content || dto.subject,
    createdAt: dto.createdAt ? dto.createdAt.replace('T', ' ').slice(0, 19) : '',
    status: backendToStatus(dto.status),
    adminResponse: dto.adminResponse || undefined,
    processedBy: dto.processedBy ? `Nhân viên #${dto.processedBy}` : undefined,
    processedAt: dto.processedAt ? dto.processedAt.replace('T', ' ').slice(0, 19) : undefined,
  };
};

export const toTripRating = (dto: FeedbackDto): TripRating => {
  return {
    id: `RATE-${dto.id}`,
    passengerName: dto.passenger?.fullName || `Hành khách #${dto.passengerId}`,
    passengerEmail: dto.passenger?.email || '',
    routeId: dto.routeId ? String(dto.routeId) : '',
    tripDate: dto.createdAt ? dto.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    rating: dto.rating && dto.rating >= 1 ? dto.rating : 5,
    review: dto.content || dto.subject,
    createdAt: dto.createdAt ? dto.createdAt.replace('T', ' ').slice(0, 19) : '',
  };
};

export const listFeedbacks = (status?: BackendFeedbackStatus | number, signal?: AbortSignal) =>
  api.get<FeedbackDto[]>(
    '/api/feedback',
    status !== undefined ? { status } : undefined,
    signal,
  );

export const getFeedback = (id: number, signal?: AbortSignal) =>
  api.get<FeedbackDto>(`/api/feedback/${id}`, undefined, signal);

export const createFeedback = (body: CreateFeedbackRequest) =>
  api.post<FeedbackDto>('/api/feedback', body);

export const updateFeedbackStatus = (id: number, status: BackendFeedbackStatus | number) =>
  api.patch<FeedbackDto>(`/api/feedback/${id}/status`, { status });
