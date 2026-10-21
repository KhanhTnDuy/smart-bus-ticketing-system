import React, { useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { BadgeDollarSign, Route as RouteIcon, Ruler } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import {
  DistanceFare,
  RouteFareMatrix,
  describeBand,
  formatKm,
  getRouteFareMatrix,
  listDistanceFares,
} from '../../api/distanceFares';
import { PassengerTypeDto, RouteDto, listPassengerTypes, listRoutes } from '../../api/routeManagement';
import { formatVnd } from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

/** Giá của một bậc cho một đối tượng, giảm theo tỷ lệ ưu đãi như lúc bán vé (làm tròn đến đồng). */
const discounted = (price: number, discountPercent: number) => Math.round((price * (100 - discountPercent)) / 100);

/**
 * Bảng giá vé niêm yết: giá theo bậc km hành trình và giá cụ thể từng chặng của mỗi tuyến. Công khai cho mọi người dùng đã đăng nhập;
 * số tiền thật khi đặt vé do máy chủ tính đúng theo bảng này.
 */
export const FareTablePage: React.FC = () => {
  const [bands, setBands] = useState<DistanceFare[]>([]);
  const [types, setTypes] = useState<PassengerTypeDto[]>([]);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<RouteFareMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tự làm mới nền: quản lý đổi bảng giá thì khách thấy giá mới, không phải tải lại trang.
  const [tick, setTick] = useState(0);
  useAutoRefresh(() => setTick((n) => n + 1));

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([listDistanceFares(controller.signal), listPassengerTypes(controller.signal), listRoutes(controller.signal)])
      .then(([b, t, r]) => {
        setBands(b);
        setTypes(t);
        const active = r.filter((x) => x.active);
        setRoutes(active);
        // Giữ tuyến người dùng đang chọn khi nạp lại nền.
        if (active.length > 0) setRouteId((prev) => (prev !== null && active.some((x) => x.id === prev) ? prev : active[0].id));
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (tick > 0) return;
        setError(err instanceof Error ? err.message : 'Không tải được bảng giá.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [tick]);

  useEffect(() => {
    if (routeId === null) return;
    const controller = new AbortController();
    getRouteFareMatrix(routeId, controller.signal)
      .then(setMatrix)
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (tick > 0) return;
        setMatrix(null);
      });
    return () => controller.abort();
  }, [routeId, tick]);

  const standard = types.find((t) => t.code === 'STANDARD') ?? types[0];
  const others = useMemo(() => types.filter((t) => t.id !== standard?.id), [types, standard]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng giá vé niêm yết"
        subtitle="Giá vé tính theo số km hành trình, từ trạm lên đến trạm xuống. Học sinh/sinh viên, người cao tuổi... được giảm theo đối tượng."
        icon={<BadgeDollarSign className="w-5 h-5 text-emerald-500" />}
      />

      {error && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được dữ liệu từ máy chủ: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải bảng giá...</div>
      ) : bands.length === 0 ? (
        <EmptyState
          title="Chưa lập bảng giá theo km"
          description="Hiện đơn vị chưa niêm yết bảng giá theo km; vé được tính theo giá cố định của tuyến."
          icon={<Ruler className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <>
          <div className={`${CARD} overflow-x-auto`}>
            <div className="px-4 pt-4 flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <Ruler className="w-4 h-4 text-sky-500" /> Giá theo bậc km hành trình
            </div>
            <table className="w-full text-xs mt-3">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">Số km hành trình</th>
                  <th className="py-3 px-4 text-right">{standard?.name ?? 'Hành khách thường'}</th>
                  {others.map((t) => (
                    <th key={t.id} className="py-3 px-4 text-right">
                      {t.name} (-{t.discountPercent}%)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bands.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{describeBand(b)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(b.price)}</td>
                    {others.map((t) => (
                      <td key={t.id} className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">
                        {formatVnd(discounted(b.price, t.discountPercent))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-3 text-[11px] text-slate-400">
              Số km hành trình là khoảng cách từ trạm lên đến trạm xuống dọc theo tuyến. Đúng bằng mốc trên của một bậc thì tính bậc đó (vd. đúng 8 km thuộc bậc "trên 3 đến 8 km").
            </p>
          </div>

          <div className={`${CARD} p-4 space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <RouteIcon className="w-4 h-4 text-amber-500" /> Giá từng chặng theo tuyến
              </div>
              <select value={routeId ?? ''} onChange={(e) => setRouteId(Number(e.target.value))} className={FILTER}>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </option>
                ))}
              </select>
            </div>

            {matrix && matrix.legs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-3 px-3">Từ trạm</th>
                      <th className="py-3 px-3">Đến trạm</th>
                      <th className="py-3 px-3 text-right">Km</th>
                      <th className="py-3 px-3 text-right">{standard?.name ?? 'Thường'}</th>
                      {others.map((t) => (
                        <th key={t.id} className="py-3 px-3 text-right">
                          {t.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.legs.map((l) => (
                      <tr key={`${l.fromStopId}-${l.toStopId}`} className="border-b border-slate-50 dark:border-slate-800/50">
                        <td className="py-2.5 px-3">{l.fromStopName}</td>
                        <td className="py-2.5 px-3">{l.toStopName}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatKm(l.distanceKm)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {l.prices.length > 0 ? formatVnd(l.prices.find((p) => p.passengerTypeId === standard?.id)?.price ?? l.prices[0].price) : '—'}
                        </td>
                        {others.map((t) => (
                          <td key={t.id} className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                            {l.prices.length > 0 ? formatVnd(l.prices.find((p) => p.passengerTypeId === t.id)?.price ?? 0) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4">Tuyến này chưa có dữ liệu km giữa các trạm.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
