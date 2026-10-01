import { apiRequest } from './apiClient';
import { BusRoute, BusStop, Fare } from '../types';

export const routeService = {
  // Routes
  async getRoutes(): Promise<BusRoute[]> {
    return await apiRequest<BusRoute[]>('/routes', { method: 'GET' });
  },

  async createRoute(routeData: Omit<BusRoute, 'id' | 'stopCount'>): Promise<BusRoute> {
    return await apiRequest<BusRoute>('/routes', {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
  },

  async updateRoute(id: string, updates: Partial<BusRoute>): Promise<BusRoute> {
    return await apiRequest<BusRoute>(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteRoute(id: string): Promise<{ success: boolean }> {
    return await apiRequest<{ success: boolean }>(`/routes/${id}`, {
      method: 'DELETE',
    });
  },

  // Stops
  async getStops(routeId?: string): Promise<BusStop[]> {
    const endpoint = routeId ? `/stops?routeId=${routeId}` : '/stops';
    return await apiRequest<BusStop[]>(endpoint, { method: 'GET' });
  },

  async createStop(stopData: Omit<BusStop, 'id' | 'order'>): Promise<BusStop> {
    return await apiRequest<BusStop>('/stops', {
      method: 'POST',
      body: JSON.stringify(stopData),
    });
  },

  async updateStop(id: string, updates: Partial<BusStop>): Promise<BusStop> {
    return await apiRequest<BusStop>(`/stops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteStop(id: string): Promise<{ success: boolean }> {
    return await apiRequest<{ success: boolean }>(`/stops/${id}`, {
      method: 'DELETE',
    });
  },

  // Fares
  async getFares(routeId?: string): Promise<Fare[]> {
    const endpoint = routeId ? `/fares?routeId=${routeId}` : '/fares';
    return await apiRequest<Fare[]>(endpoint, { method: 'GET' });
  },

  async createFare(fareData: Omit<Fare, 'id'>): Promise<Fare> {
    return await apiRequest<Fare>('/fares', {
      method: 'POST',
      body: JSON.stringify(fareData),
    });
  },

  async updateFare(id: string, updates: Partial<Fare>): Promise<Fare> {
    return await apiRequest<Fare>(`/fares/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteFare(id: string): Promise<{ success: boolean }> {
    return await apiRequest<{ success: boolean }>(`/fares/${id}`, {
      method: 'DELETE',
    });
  },
};
