import { useCallback, useEffect, useState } from 'react';
import { Complaint, ComplaintStatus, TripRating } from '../types';
import { ApiError } from '../api/client';
import * as fbApi from '../api/feedback';
import { INITIAL_COMPLAINTS, INITIAL_RATINGS } from '../data/mockData';

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

export const useFeedbackManagement = () => {
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    try {
      const saved = localStorage.getItem('smart_bus_complaints');
      return saved ? JSON.parse(saved) : INITIAL_COMPLAINTS;
    } catch {
      return INITIAL_COMPLAINTS;
    }
  });

  const [ratings, setRatings] = useState<TripRating[]>(() => {
    try {
      const saved = localStorage.getItem('smart_bus_ratings');
      return saved ? JSON.parse(saved) : INITIAL_RATINGS;
    } catch {
      return INITIAL_RATINGS;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const dtos = await fbApi.listFeedbacks(undefined, signal);
      const complaintDtos = dtos.filter((d) => d.type === fbApi.BackendFeedbackType.Complaint || d.type === 0);
      const ratingDtos = dtos.filter((d) => d.type === fbApi.BackendFeedbackType.Review || d.type === 1);

      const mappedComplaints = complaintDtos.map(fbApi.toComplaint);
      const mappedRatings = ratingDtos.map(fbApi.toTripRating);

      setComplaints(mappedComplaints);
      setRatings(mappedRatings);

      try {
        localStorage.setItem('smart_bus_complaints', JSON.stringify(mappedComplaints));
        localStorage.setItem('smart_bus_ratings', JSON.stringify(mappedRatings));
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(describe(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  const addComplaint = useCallback(
    async (data: {
      routeId?: string;
      subject: string;
      description: string;
      tripDate?: string;
      category?: string;
    }): Promise<{ success: boolean; message?: string; data?: Complaint }> => {
      try {
        const numRouteId = data.routeId && !Number.isNaN(Number(data.routeId)) ? Number(data.routeId) : undefined;
        const res = await fbApi.createFeedback({
          routeId: numRouteId,
          type: fbApi.BackendFeedbackType.Complaint,
          subject: data.subject.trim(),
          content: data.description.trim(),
        });
        const mapped = fbApi.toComplaint(res);
        await load();
        return { success: true, data: mapped };
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          const fallback: Complaint = {
            id: `CMP-${Date.now().toString().slice(-4)}`,
            passengerName: 'Hành khách',
            passengerEmail: '',
            passengerPhone: '',
            routeId: data.routeId || '',
            tripDate: data.tripDate || new Date().toISOString().split('T')[0],
            category: 'ATTITUDE',
            subject: data.subject,
            description: data.description,
            createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
            status: 'PENDING',
          };
          setComplaints((prev) => [fallback, ...prev]);
          return { success: true, data: fallback };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  const addRating = useCallback(
    async (data: {
      routeId?: string;
      rating: number;
      review: string;
      tripDate?: string;
    }): Promise<{ success: boolean; message?: string; data?: TripRating }> => {
      try {
        const numRouteId = data.routeId && !Number.isNaN(Number(data.routeId)) ? Number(data.routeId) : undefined;
        const res = await fbApi.createFeedback({
          routeId: numRouteId,
          type: fbApi.BackendFeedbackType.Review,
          subject: `Đánh giá ${data.rating} sao`,
          content: data.review.trim() || `Đánh giá ${data.rating} sao`,
          rating: data.rating,
        });
        const mapped = fbApi.toTripRating(res);
        await load();
        return { success: true, data: mapped };
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          const fallback: TripRating = {
            id: `RATE-${Date.now().toString().slice(-4)}`,
            passengerName: 'Hành khách',
            passengerEmail: '',
            routeId: data.routeId || '',
            tripDate: data.tripDate || new Date().toISOString().split('T')[0],
            rating: data.rating,
            review: data.review,
            createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };
          setRatings((prev) => [fallback, ...prev]);
          return { success: true, data: fallback };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  const updateComplaintStatus = useCallback(
    async (id: string, status: ComplaintStatus): Promise<{ success: boolean; message?: string }> => {
      try {
        const rawId = id.replace(/^(FB-|CMP-)/, '');
        const numId = Number(rawId);
        if (Number.isNaN(numId)) {
          setComplaints((prev) =>
            prev.map((c) => (c.id === id ? { ...c, status } : c)),
          );
          return { success: true };
        }

        await fbApi.updateFeedbackStatus(numId, fbApi.statusToBackend(status));
        await load();
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          setComplaints((prev) =>
            prev.map((c) => (c.id === id ? { ...c, status } : c)),
          );
          return { success: true };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  return {
    complaints,
    ratings,
    loading,
    error,
    reload,
    addComplaint,
    addRating,
    updateComplaintStatus,
  };
};
