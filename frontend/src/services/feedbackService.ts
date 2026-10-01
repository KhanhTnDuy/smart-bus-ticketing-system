import { apiRequest } from './apiClient';
import { Complaint, ComplaintStatus, TripRating } from '../types';

export const feedbackService = {
  // Complaints (Phản ánh & khiếu nại)
  async getComplaints(): Promise<Complaint[]> {
    return await apiRequest<Complaint[]>('/complaints', { method: 'GET' });
  },

  async createComplaint(data: Omit<Complaint, 'id' | 'createdAt' | 'status'>): Promise<Complaint> {
    return await apiRequest<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    adminResponse?: string,
    processedBy?: string
  ): Promise<Complaint> {
    return await apiRequest<Complaint>(`/complaints/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminResponse, processedBy }),
    });
  },

  // Ratings (Đánh giá sao & nhận xét)
  async getRatings(routeId?: string): Promise<TripRating[]> {
    const endpoint = routeId ? `/ratings?routeId=${routeId}` : '/ratings';
    return await apiRequest<TripRating[]>(endpoint, { method: 'GET' });
  },

  async createRating(data: Omit<TripRating, 'id' | 'createdAt'>): Promise<TripRating> {
    return await apiRequest<TripRating>('/ratings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
