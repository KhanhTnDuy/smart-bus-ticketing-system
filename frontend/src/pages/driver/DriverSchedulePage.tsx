import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, Bus, MapPin, UserCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { api } from '../../api/client';
import { toTripStatusName, TRIP_STATUS_LABEL } from '../../api/scheduleManagement';

interface RouteStopSummary {
  stopId: number;
  stopName: string;
  stopOrder: number;
  minutesFromStart: number;
}

/** Khớp với DriverScheduleDto của backend (GET /api/assignments/my-schedule). */
interface MyTrip {
  tripId: number;
  routeCode: string;
  routeName: string;
  startPoint: string;
  endPoint: string;
  departureAt: string;
  estimatedArrivalAt: string;
  status: number | string;
  duty: string;
  busPlate?: string | null;
  busCapacity?: number | null;
  partnerName?: string | null;
  partnerPhone?: string | null;
  partnerDuty?: string | null;
  stops: RouteStopSummary[];
}

/** Giờ backend trả về là UTC nhưng không có hậu tố Z. */
const toLocal = (iso: string) => new Date(iso.endsWith('Z') ? iso : `${iso}Z`);

export const DriverSchedulePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrips(await api.get<MyTrip[]>('/api/assignments/my-schedule'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được lịch trình.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch Trình Vận Hành & Tuyến Phụ Trách"
        subtitle="Các chuyến bạn được phân công, kèm xe, người đi cùng và lộ trình trạm dừng."
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Tài xế' }, { label: 'Lịch trình xe buýt' }]}
        icon={<Calendar className="w-5 h-5 text-emerald-500" />}
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        }
      />

      <div className="flex items-center gap-3 p-4 bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
        <img
          src={
            currentUser?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullName || 'T')}&background=0c356a&color=fff`
          }
          alt=""
          className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/30"
        />
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">{currentUser?.fullName}</h3>
          <div className="mt-1">
            <Badge variant="role" value="DRIVER" size="sm" />
          </div>
        </div>
        <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">{trips.length} chuyến được phân công</div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được lịch trình từ máy chủ: {error}
        </div>
      )}

      {!loading && !error && trips.length === 0 && (
        <div className="text-center text-xs text-slate-400 py-10 bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57]">
          Bạn chưa được phân công chuyến nào. Quản lý sẽ phân công ở mục Lịch trình & Phân công.
        </div>
      )}

      <div className="space-y-4">
        {trips.map((t) => {
          const dep = toLocal(t.departureAt);
          const arr = toLocal(t.estimatedArrivalAt);
          const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
          return (
            <div
              key={t.tripId}
              className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-institutional-100 dark:bg-sky-950/60 text-institutional-700 dark:text-sky-300 border border-institutional-300 dark:border-sky-800">
                      {t.routeCode}
                    </span>
                    <span className="font-mono text-xs text-slate-400">TRIP-{t.tripId}</span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{t.duty}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">{t.routeName}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {t.startPoint} → {t.endPoint}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    {dep.toLocaleTimeString('vi-VN', timeFmt)} - {arr.toLocaleTimeString('vi-VN', timeFmt)}
                  </div>
                  <div className="text-slate-400">{dep.toLocaleDateString('vi-VN')}</div>
                  <div className="mt-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                    {TRIP_STATUS_LABEL[toTripStatusName(t.status)]}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Phương tiện</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <Bus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.busPlate ? `${t.busPlate} (${t.busCapacity ?? '?'} chỗ)` : 'Chưa gán xe'}</span>
                  </div>
                </div>
                <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">{t.partnerDuty ?? 'Đồng nghiệp'}</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {t.partnerName ? `${t.partnerName}${t.partnerPhone ? ` (${t.partnerPhone})` : ''}` : 'Không có'}
                    </span>
                  </div>
                </div>
              </div>

              {t.stops.length > 0 && (
                <ol className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {[...t.stops]
                    .sort((a, b) => a.stopOrder - b.stopOrder)
                    .map((s) => (
                      <li key={s.stopId} className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                        {s.stopOrder}. {s.stopName} (+{s.minutesFromStart}p)
                      </li>
                    ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
