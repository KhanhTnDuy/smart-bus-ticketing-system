import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, TrendingUp, Ticket, RotateCcw, Trophy } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { listRoutes, RouteDto } from '../../api/routeManagement';
import { PAYMENT_METHOD_LABEL, formatVnd } from '../../api/payments';
import { RevenueReportResponse, revenueReportApi } from '../../api/revenueReport';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

const iso = (d: Date) => d.toLocaleDateString('en-CA'); // yyyy-MM-dd theo giờ máy

const presetRange = (preset: string): [string, string] => {
  const now = new Date();
  if (preset === 'TODAY') return [iso(now), iso(now)];
  if (preset === 'LAST_7_DAYS') return [iso(new Date(now.getTime() - 6 * 86400000)), iso(now)];
  if (preset === 'THIS_MONTH') return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
  return ['', ''];
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export const RevenueReportPage: React.FC = () => {
  const { error: showError } = useToast();

  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [routeId, setRouteId] = useState('ALL');
  const [preset, setPreset] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  const [report, setReport] = useState<RevenueReportResponse | null>(null);
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
      setReport(await revenueReportApi.getRevenueReport({ startDate, endDate, routeId, groupBy }));
      setLoadError(null);
    } catch (err) {
      setReport(null);
      setLoadError(err instanceof Error ? err.message : 'Không tải được báo cáo doanh thu.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, routeId, groupBy]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPreset = (p: string) => {
    setPreset(p);
    const [s, e] = presetRange(p);
    setStartDate(s);
    setEndDate(e);
  };

  const summary = report?.summary;
  const maxPeriod = useMemo(() => Math.max(1, ...(report?.timeSeries ?? []).map((t) => t.grossRevenue)), [report]);
  const topRoute = report?.byRoute[0];
  const refundRate = summary && summary.totalGross > 0 ? Math.round((summary.totalRefund / summary.totalGross) * 100) : 0;

  const exportCsv = () => {
    if (!report) return showError('Chưa có dữ liệu để xuất.');
    const lines = [
      ['Kỳ', 'Số vé', 'Tổng thu', 'Hoàn tiền', 'Thực thu'].map(csvCell).join(','),
      ...report.timeSeries.map((t) => [t.period, t.ticketCount, t.grossRevenue, t.refundAmount, t.netRevenue].map(csvCell).join(',')),
      '',
      ['Tuyến', 'Số vé', 'Doanh thu'].map(csvCell).join(','),
      ...report.byRoute.map((r) => [`${r.routeCode} - ${r.routeName}`, r.ticketCount, r.revenue].map(csvCell).join(',')),
    ];
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-doanh-thu-${iso(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo doanh thu bán vé"
        subtitle="Doanh thu từ các lượt đặt đã thanh toán, theo ngày hoặc tháng và theo tuyến. Vé hủy được tách thành hoàn tiền."
        icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
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
            <button
              type="button"
              onClick={exportCsv}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Xuất CSV</span>
            </button>
          </div>
        }
      />

      {loadError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được báo cáo từ máy chủ: {loadError}
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
        <select value={preset} onChange={(e) => applyPreset(e.target.value)} className={FILTER}>
          <option value="ALL">Toàn thời gian</option>
          <option value="TODAY">Hôm nay</option>
          <option value="LAST_7_DAYS">7 ngày qua</option>
          <option value="THIS_MONTH">Tháng hiện tại</option>
          <option value="CUSTOM">Tùy chọn</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPreset('CUSTOM');
          }}
          className={FILTER}
          title="Từ ngày"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPreset('CUSTOM');
          }}
          className={FILTER}
          title="Đến ngày"
        />
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'DAILY' | 'MONTHLY')} className={FILTER}>
          <option value="DAILY">Theo ngày</option>
          <option value="MONTHLY">Theo tháng</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Tổng thu
          </div>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{formatVnd(summary?.totalGross ?? 0)}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Thực thu {formatVnd(summary?.netRevenue ?? 0)}</div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5" /> Vé bán thành công
          </div>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{summary?.successfulTickets ?? 0} vé</div>
          <div className="text-[11px] text-slate-400">Giá trung bình {formatVnd(summary?.averageTicketPrice ?? 0)}</div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Hoàn tiền
          </div>
          <div className="text-xl font-bold mt-1 text-rose-600 dark:text-rose-400">{formatVnd(summary?.totalRefund ?? 0)}</div>
          <div className="text-[11px] text-slate-400">
            {refundRate}% tổng thu ({summary?.refundedTickets ?? 0} vé)
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Tuyến cao nhất
          </div>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{topRoute?.routeCode ?? '-'}</div>
          <div className="text-[11px] text-slate-400 truncate">{topRoute ? `${topRoute.routeName} · ${formatVnd(topRoute.revenue)}` : 'Chưa có dữ liệu'}</div>
        </div>
      </div>

      {loading && !report ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : !report || report.timeSeries.length === 0 ? (
        <EmptyState
          title="Chưa có doanh thu"
          description="Chưa có lượt đặt vé nào được thanh toán trong khoảng thời gian và tuyến đã chọn."
          icon={<TrendingUp className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${CARD} p-5 lg:col-span-2 space-y-3`}>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Doanh thu {groupBy === 'DAILY' ? 'theo ngày' : 'theo tháng'}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">Kỳ</th>
                    <th className="py-2 pr-3">Vé</th>
                    <th className="py-2 pr-3 w-1/3">Tổng thu</th>
                    <th className="py-2 pr-3 text-right">Hoàn</th>
                    <th className="py-2 text-right">Thực thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.timeSeries.map((t) => (
                    <tr key={t.period}>
                      <td className="py-2 pr-3 font-mono text-slate-700 dark:text-slate-200">{t.period}</td>
                      <td className="py-2 pr-3">{t.ticketCount}</td>
                      <td className="py-2 pr-3">
                        <div className="h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-2 bg-institutional-600" style={{ width: `${Math.round((t.grossRevenue / maxPeriod) * 100)}%` }} />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{formatVnd(t.grossRevenue)}</div>
                      </td>
                      <td className="py-2 pr-3 text-right text-rose-600 dark:text-rose-400">{t.refundAmount > 0 ? formatVnd(t.refundAmount) : '-'}</td>
                      <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(t.netRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${CARD} p-5 space-y-3`}>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Theo tuyến</h3>
              {report.byRoute.map((r) => {
                const total = report.byRoute.reduce((s, x) => s + x.revenue, 0) || 1;
                return (
                  <div key={r.routeId} className="text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{r.routeCode}</span>
                      <span className="text-slate-500">
                        {formatVnd(r.revenue)} ({Math.round((r.revenue / total) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                      <div className="h-2 bg-emerald-500" style={{ width: `${Math.round((r.revenue / total) * 100)}%` }} />
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {r.routeName} · {r.ticketCount} vé
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`${CARD} p-5 space-y-2`}>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Phương thức thanh toán</h3>
              {(report.byPaymentMethod ?? []).length === 0 ? (
                <div className="text-xs text-slate-400">Chưa có giao dịch.</div>
              ) : (
                (report.byPaymentMethod ?? []).map((m) => (
                  <div key={m.method} className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-200">{PAYMENT_METHOD_LABEL[m.method] ?? m.method}</span>
                    <span className="text-slate-500">
                      {m.count} giao dịch · {formatVnd(m.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
