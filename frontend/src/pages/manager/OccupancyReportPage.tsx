import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw, Download } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { listRoutes, RouteDto } from '../../api/routeManagement';
import { LOAD_STATUS_LABEL, LoadStatus, OccupancyReport, getOccupancyReport } from '../../api/occupancyReport';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

const STATUS_STYLE: Record<LoadStatus, string> = {
  OVERLOAD: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  OPTIMAL: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  LOW: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  NO_TICKETS: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  NO_BUS: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800',
};

const BAR_COLOR: Record<LoadStatus, string> = {
  OVERLOAD: 'bg-rose-500',
  OPTIMAL: 'bg-emerald-500',
  LOW: 'bg-amber-500',
  NO_TICKETS: 'bg-slate-400',
  NO_BUS: 'bg-fuchsia-400',
};

const iso = (d: Date) => d.toLocaleDateString('en-CA');
const parseUtc = (s: string) => new Date(s.endsWith('Z') ? s : `${s}Z`);
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export const OccupancyReportPage: React.FC = () => {
  const { error: showError } = useToast();
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [routeId, setRouteId] = useState('ALL');
  const [status, setStatus] = useState<LoadStatus | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState(iso(new Date()));
  const [endDate, setEndDate] = useState(iso(new Date(Date.now() + 7 * 86400000)));

  const [report, setReport] = useState<OccupancyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listRoutes()
      .then(setRoutes)
      .catch(() => setRoutes([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getOccupancyReport({ startDate, endDate, routeId, status }));
      setLoadError(null);
    } catch (err) {
      setReport(null);
      setLoadError(err instanceof Error ? err.message : 'Không tải được thống kê.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, routeId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    if (!report || report.trips.length === 0) return showError('Chưa có dữ liệu để xuất.');
    const lines = [
      ['Mã chuyến', 'Tuyến', 'Khởi hành', 'Xe', 'Tài xế', 'Số ghế', 'Đã đặt', 'Tỷ lệ (%)', 'Trạng thái'].map(csvCell).join(','),
      ...report.trips.map((t) =>
        [
          `TRIP-${t.tripId}`,
          t.routeCode,
          parseUtc(t.departureAt).toLocaleString('vi-VN'),
          t.busPlate ?? '',
          t.driverName ?? '',
          t.totalSeats,
          t.occupiedSeats,
          t.occupancyPercent,
          LOAD_STATUS_LABEL[t.loadStatus],
        ]
          .map(csvCell)
          .join(','),
      ),
    ];
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ty-le-lap-day-${iso(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = report?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thống kê tỷ lệ lấp đầy theo chuyến"
        subtitle="Tỷ lệ ghế đã đặt trên sức chứa của xe, cảnh báo chuyến quá tải, tải thấp, chưa gán xe hoặc chưa có vé."
        icon={<BarChart3 className="w-5 h-5 text-sky-500" />}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
            <button type="button" onClick={exportCsv} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              <span>Xuất CSV</span>
            </button>
          </div>
        }
      />

      {loadError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được thống kê từ máy chủ: {loadError}
        </div>
      )}

      <div className={`${CARD} p-4 flex flex-wrap gap-3 items-center`}>
        <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className={FILTER}>
          <option value="ALL">Tất cả tuyến</option>
          {routes.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.code} - {r.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as LoadStatus | 'ALL')} className={FILTER}>
          <option value="ALL">Tất cả mức tải</option>
          {(Object.keys(LOAD_STATUS_LABEL) as LoadStatus[]).map((k) => (
            <option key={k} value={k}>
              {LOAD_STATUS_LABEL[k]}
            </option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FILTER} title="Từ ngày" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={FILTER} title="Đến ngày" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold">Số chuyến</div>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{s?.totalTrips ?? 0}</div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold">Tỷ lệ lấp đầy trung bình</div>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{s?.averageOccupancyPercent ?? 0}%</div>
          <div className="text-[11px] text-slate-400">
            {s?.occupiedSeats ?? 0}/{s?.totalSeats ?? 0} ghế (chỉ tính chuyến đã có xe)
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold">Cần chú ý</div>
          <div className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">{(s?.overload ?? 0) + (s?.noBus ?? 0)}</div>
          <div className="text-[11px] text-slate-400">
            {s?.overload ?? 0} quá tải · {s?.noBus ?? 0} chưa gán xe
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold">Tải thấp / chưa có vé</div>
          <div className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">{(s?.low ?? 0) + (s?.noTickets ?? 0)}</div>
          <div className="text-[11px] text-slate-400">
            {s?.low ?? 0} tải thấp · {s?.noTickets ?? 0} chưa có vé
          </div>
        </div>
      </div>

      {loading && !report ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : !report || report.trips.length === 0 ? (
        <EmptyState title="Không có chuyến nào" description="Không có chuyến nào trong khoảng thời gian và điều kiện đã chọn." icon={<BarChart3 className="w-12 h-12 text-slate-300" />} />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Chuyến</th>
                  <th className="py-3 px-4">Khởi hành</th>
                  <th className="py-3 px-4">Xe / Tài xế</th>
                  <th className="py-3 px-4 w-1/4">Lấp đầy</th>
                  <th className="py-3 px-4">Mức tải</th>
                  <th className="py-3 px-4">Đề xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.trips.map((t) => {
                  const dep = parseUtc(t.departureAt);
                  return (
                    <tr key={t.tripId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 align-top">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-institutional-600 dark:text-sky-400">TRIP-{t.tripId}</div>
                        <div className="text-[11px] text-slate-400">{t.routeCode}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">{dep.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                        <div className="text-[11px] text-slate-400">{dep.toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-amber-600 dark:text-amber-400">{t.busPlate ?? 'Chưa gán xe'}</div>
                        <div className="text-[11px] text-slate-400">{t.driverName ?? 'Chưa gán tài xế'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-2 ${BAR_COLOR[t.loadStatus]}`} style={{ width: `${Math.min(100, t.occupancyPercent)}%` }} />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.loadStatus === 'NO_BUS' ? 'Chưa có sức chứa' : `${t.occupiedSeats}/${t.totalSeats} ghế (${t.occupancyPercent}%)`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border whitespace-nowrap ${STATUS_STYLE[t.loadStatus]}`}>{LOAD_STATUS_LABEL[t.loadStatus]}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs">{t.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
