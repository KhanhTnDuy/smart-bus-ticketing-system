import React, { useState } from 'react';
import {
  Calendar,
  Compass,
  MapPin,
  Clock,
  Bus,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';

export const DriverSchedulePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { routes, stops } = useData();

  // Driver assigned route (default to Tuyến 01 or first route)
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || '');

  const assignedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const assignedStops = stops
    .filter((s) => s.routeId === assignedRoute?.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <PageHeader
        title="Lịch Trình Vận Hành & Tuyến Phụ Trách"
        subtitle="Thông tin phân ca lái xe, phương tiện vận tải và lộ trình trạm dừng tuần tự trong ca làm việc."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Tài xế' },
          { label: 'Lịch trình xe buýt' },
        ]}
        icon={<Calendar className="w-5 h-5 text-emerald-500" />}
      />

      {/* 2. Driver Duty Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Driver Badge & Vehicle Information */}
        <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <img
              src={
                currentUser?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullName || 'T')}&background=0c356a&color=fff`
              }
              alt=""
              className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/30"
            />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {currentUser?.fullName}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Mã tài xế: <strong>{currentUser?.id}</strong>
              </div>
              <div className="mt-1">
                <Badge variant="role" value="DRIVER" size="sm" />
              </div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Phương tiện phân công:</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                <Bus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>51B-184.22 (Xe buýt CNG 47 chỗ)</span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Ca làm việc hôm nay:</span>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Ca 1 (05:00 — 13:30)</span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Đội vận tải trực thuộc:</span>
              <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {currentUser?.department || 'Đội Vận Tải 1 — Bến xe Miền Đông'}
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Route Details and Stop Sequence */}
        <div className="md:col-span-2 bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                Lộ Trình Tuyến: [{assignedRoute?.code}] {assignedRoute?.name}
              </span>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cự ly: {assignedRoute?.distance} km • Thời gian chạy: {assignedRoute?.durationMinutes} phút • Giờ chạy: {assignedRoute?.operatingHours}
              </div>
            </div>

            {/* Select route if driver covers other lines */}
            <div>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}: {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sequential Stops Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Danh mục các trạm dừng tuần tự ({assignedStops.length} trạm)
            </h4>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {assignedStops.map((stop) => (
                <div key={stop.id} className="relative flex items-start gap-3.5 pl-1">
                  <div className="w-6 h-6 rounded-full bg-institutional-700 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0 z-10 shadow-sm border-2 border-white dark:border-[#131e3a]">
                    {stop.order}
                  </div>
                  <div className="flex-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0c162d] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {stop.name}
                      </span>
                      {stop.isTerminal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Bến đầu/cuối
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {stop.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
