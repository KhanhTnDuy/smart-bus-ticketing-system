/**
 * Thông báo của người đăng nhập, khớp với backend NotificationsController (/api/notifications).
 */

import { api } from './client';

export type NotificationTypeName = 'BusArriving' | 'Delay' | 'Incident' | 'Other';

export interface NotificationDto {
  id: number;
  type: NotificationTypeName;
  title: string;
  message: string;
  /** Trang mở ra khi bấm vào thông báo, vd /passenger/payments. */
  link: string | null;
  tripId: number | null;
  isRead: boolean;
  /** Giờ UTC, không có hậu tố Z. */
  createdAt: string;
}

export interface NotificationList {
  unreadCount: number;
  items: NotificationDto[];
}

export const listMyNotifications = (take = 30, signal?: AbortSignal) =>
  api.get<NotificationList>('/api/notifications/my', { take }, signal);

export const markNotificationRead = (id: number) => api.patch<void>(`/api/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.post<void>('/api/notifications/read-all');
