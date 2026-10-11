/**
 * Hồ sơ đăng ký ưu đãi giá vé, khớp với backend DiscountApplicationsController
 * (/api/discount-applications) và UploadsController (/api/uploads).
 */

import { api, uploadFile } from './client';

export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected';

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
};

export interface DiscountApplicationDto {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerEmail: string | null;
  passengerPhone: string | null;
  passengerTypeId: number;
  passengerTypeCode: string;
  passengerTypeName: string;
  discountPercent: number;
  documentUrl: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  /** yyyy-MM-dd */
  validUntil: string | null;
  rejectReason: string | null;
}

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
}

export const uploadDocument = (file: File) => uploadFile<UploadResult>('/api/uploads', file);

export const submitApplication = (passengerTypeId: number, documentUrl: string) =>
  api.post<DiscountApplicationDto>('/api/discount-applications', { passengerTypeId, documentUrl });

export const listMyApplications = (signal?: AbortSignal) =>
  api.get<DiscountApplicationDto[]>('/api/discount-applications/my', undefined, signal);

export const listApplications = (status?: ApplicationStatus, signal?: AbortSignal) =>
  api.get<DiscountApplicationDto[]>('/api/discount-applications', { status }, signal);

export const reviewApplication = (id: number, approve: boolean, options: { validUntil?: string; rejectReason?: string } = {}) =>
  api.post<DiscountApplicationDto>(`/api/discount-applications/${id}/review`, { approve, ...options });
