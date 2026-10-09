import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import * as sm from '../api/scheduleManagement';
import { listRoutes, RouteDto } from '../api/routeManagement';
import { listBuses, BusDto, BackendBusStatus } from '../api/busManagement';
import { TripAssignmentDto } from '../api/assignments';

export interface MutationResult {
  success: boolean;
  message?: string;
}

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

/**
 * Dữ liệu trang Lịch trình & Chuyến xe, đọc và ghi thẳng vào backend.
 * Không có dữ liệu mẫu dự phòng: lỗi mạng hoặc lỗi quyền hiện nguyên ra ngoài để người dùng
 * biết thao tác chưa được lưu, thay vì giả vờ thành công rồi mất khi tải lại trang.
 */
export const useScheduleManagement = () => {
  const [trips, setTrips] = useState<TripAssignmentDto[]>([]);
  const [schedules, setSchedules] = useState<sm.ScheduleDto[]>([]);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [buses, setBuses] = useState<BusDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [tripList, scheduleList, routeList, busPage] = await Promise.all([
        sm.listAllTrips(signal),
        sm.listSchedules(signal),
        listRoutes(signal),
        listBuses({ pageSize: 100 }, signal),
      ]);
      setTrips(tripList);
      setSchedules(scheduleList);
      setRoutes(routeList);
      setBuses(busPage.data.filter((b) => b.status === BackendBusStatus.Active));
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

  const mutate = useCallback(
    async <T,>(action: () => Promise<T>): Promise<MutationResult & { data?: T }> => {
      try {
        const data = await action();
        await load();
        return { success: true, data };
      } catch (err) {
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  return {
    trips,
    schedules,
    routes,
    buses,
    loading,
    error,
    reload: () => load(),

    addSchedule: (body: sm.ScheduleRequest) => mutate(() => sm.createSchedule(body)),
    updateSchedule: (id: number, body: sm.ScheduleRequest) => mutate(() => sm.updateSchedule(id, body)),
    deleteSchedule: (id: number) => mutate(() => sm.deleteSchedule(id)),
    generateTrips: (id: number, body: Omit<sm.GenerateTripsRequest, 'dryRun'>) =>
      mutate(() => sm.generateTrips(id, { ...body, dryRun: false })),
    previewTrips: async (id: number, body: Omit<sm.GenerateTripsRequest, 'dryRun'>) => {
      try {
        return { success: true as const, data: await sm.generateTrips(id, { ...body, dryRun: true }) };
      } catch (err) {
        return { success: false as const, message: describe(err) };
      }
    },

    addTrip: (body: Parameters<typeof sm.createTrip>[0]) => mutate(() => sm.createTrip(body)),
    updateTrip: (
      tripId: number,
      time: { departureAt?: string; status?: number },
      staff?: Parameters<typeof sm.assignTripStaff>[1],
    ) =>
      mutate(async () => {
        // Đổi giờ và trạng thái trước để bước gán xe, nhân sự kiểm tra trùng lịch theo giờ mới.
        if (time.departureAt !== undefined || time.status !== undefined) await sm.updateTrip(tripId, time);
        if (staff) await sm.assignTripStaff(tripId, staff);
      }),
    deleteTrip: (tripId: number) => mutate(() => sm.deleteTrip(tripId)),
  };
};
