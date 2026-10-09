import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { listAllTrips } from '../api/scheduleManagement';
import { listMyTickets } from '../api/booking';
import { utcToLocal } from '../api/operations';
import { Role } from '../types';

export interface TripOption {
  tripId: number;
  label: string;
}

const fmt = (iso: string) => {
  const d = utcToLocal(iso);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

interface MyScheduleRow {
  tripId: number;
  routeCode: string;
  routeName: string;
  departureAt: string;
  status: number | string;
}

/**
 * Danh sách chuyến mà người đăng nhập được phép thao tác, lấy từ backend:
 * tài xế và phụ xe là chuyến được phân công, quản lý là các chuyến chưa kết thúc,
 * hành khách là chuyến đã đặt vé.
 */
export const useTripOptions = (role: Role | null) => {
  const [options, setOptions] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;
    (async () => {
      try {
        let list: TripOption[] = [];
        if (role === 'DRIVER') {
          const rows = await api.get<MyScheduleRow[]>('/api/assignments/my-schedule');
          list = rows
            .filter((r) => r.status !== 3 && r.status !== 4 && r.status !== 'Completed' && r.status !== 'Cancelled')
            .map((r) => ({ tripId: r.tripId, label: `TRIP-${r.tripId} · ${r.routeCode} · ${fmt(r.departureAt)}` }));
        } else if (role === 'PASSENGER') {
          const tickets = await listMyTickets();
          const seen = new Set<number>();
          for (const t of tickets) {
            if (seen.has(t.tripId) || t.bookingStatus === 'Cancelled' || t.bookingStatus === 'Expired') continue;
            seen.add(t.tripId);
            list.push({ tripId: t.tripId, label: `TRIP-${t.tripId} · ${t.routeCode} · ${t.departureDate} ${t.departureTime}` });
          }
        } else {
          const trips = await listAllTrips();
          list = trips
            .filter((t) => !['Completed', 'Cancelled', 3, 4].includes(t.status as never))
            .map((t) => ({ tripId: t.tripId, label: `TRIP-${t.tripId} · ${t.routeCode} · ${t.date} ${t.startTime ?? ''}` }));
        }
        if (!cancelled) {
          setOptions(list);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyến.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  return { options, loading, error };
};
