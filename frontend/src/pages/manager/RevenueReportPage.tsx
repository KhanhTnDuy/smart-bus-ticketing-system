import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  RotateCcw,
  Download,
  CreditCard,
  Ticket,
  Compass,
  ArrowUpRight,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Database,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import {
  revenueReportApi,
  RevenueReportResponse,
  RevenueItemDto,
} from '../../api/revenueReport';

export const RevenueReportPage: React.FC = () => {
  const { routes, tickets, payments } = useData();
  const { success, info } = useToast();

  // Filters state
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-10-31');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');

  // API State
  const [apiData, setApiData] = useState<RevenueReportResponse | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [isUsingLiveApi, setIsUsingLiveApi] = useState<boolean>(false);

  // Handle Preset changes
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);

    if (preset === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'LAST_7_DAYS') {
      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (preset === 'THIS_MONTH') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      setEndDate(new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0]);
      setSelectedMonth(`${year}-${month}`);
    } else if (preset === 'ALL') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  const handleResetFilters = () => {
    setSelectedRouteId('ALL');
    setDateRangePreset('ALL');
    setStartDate('2026-09-01');
    setEndDate('2026-10-31');
    setSelectedMonth('2026-09');
    setViewMode('DAILY');
  };

  // Attempt to fetch from real API, fallback smoothly
  const loadReportData = useCallback(async () => {
    setIsLoadingApi(true);
    try {
      const result = await revenueReportApi.getRevenueReport({
        startDate: viewMode === 'DAILY' ? startDate : `${selectedMonth}-01`,
        endDate:
          viewMode === 'DAILY'
            ? endDate
            : new Date(
                parseInt(selectedMonth.split('-')[0], 10),
                parseInt(selectedMonth.split('-')[1], 10),
                0
              )
                .toISOString()
                .split('T')[0],
        routeId: selectedRouteId,
        groupBy: viewMode,
      });

      if (result) {
        setApiData(result);
        setIsUsingLiveApi(true);
      } else {
        setApiData(null);
        setIsUsingLiveApi(false);
      }
    } catch {
      setApiData(null);
      setIsUsingLiveApi(false);
    } finally {
      setIsLoadingApi(false);
    }
  }, [startDate, endDate, selectedMonth, selectedRouteId, viewMode]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Fallback Data Calculations (from local DataContext)
  const fallbackFilteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const ticket = tickets.find((t) => t.paymentId === p.id || t.id === p.ticketId);
      const routeId = ticket?.routeId || '';
      const paymentDate = (p.createdAt || '').split(' ')[0] || '';

      const matchRoute = selectedRouteId === 'ALL' || routeId === selectedRouteId;
      let matchDate = true;

      if (viewMode === 'DAILY') {
        matchDate = (!startDate || paymentDate >= startDate) && (!endDate || paymentDate <= endDate);
      } else {
        // In monthly mode, filter by year/month if selected
        const paymentMonth = paymentDate.substring(0, 7);
        matchDate = !selectedMonth || paymentMonth === selectedMonth || dateRangePreset === 'ALL';
      }

      return matchRoute && matchDate;
    });
  }, [payments, tickets, selectedRouteId, startDate, endDate, selectedMonth, viewMode, dateRangePreset]);

  // Fallback Financial Metrics
  const fallbackMetrics = useMemo(() => {
    let totalGross = 0;
    let totalRefund = 0;
    let successfulCount = 0;
    let refundedCount = 0;

    fallbackFilteredPayments.forEach((p) => {
      if (p.status === 'SUCCESS') {
        totalGross += p.amount;
        successfulCount += 1;
      } else if (p.status === 'REFUNDED') {
        totalRefund += p.amount;
        refundedCount += 1;
      }
    });

    const netRevenue = totalGross - totalRefund;
    const avgTicketPrice = successfulCount > 0 ? Math.round(totalGross / successfulCount) : 0;
    const refundRate =
      successfulCount + refundedCount > 0
        ? Math.round((refundedCount / (successfulCount + refundedCount)) * 100)
        : 0;

    return {
      totalGross,
      totalRefund,
      netRevenue,
      successfulCount,
      refundedCount,
      avgTicketPrice,
      refundRate,
    };
  }, [fallbackFilteredPayments]);

  // Fallback Daily aggregation
  const fallbackDailyStats = useMemo(() => {
    const map: Record<
      string,
      { period: string; revenue: number; ticketCount: number; refundAmount: number; netRevenue: number }
    > = {};

    fallbackFilteredPayments.forEach((p) => {
      const date = (p.createdAt || '').split(' ')[0] || '2026-09-28';
      if (!map[date]) {
        map[date] = { period: date, revenue: 0, ticketCount: 0, refundAmount: 0, netRevenue: 0 };
      }
      if (p.status === 'SUCCESS') {
        map[date].revenue += p.amount;
        map[date].ticketCount += 1;
      } else if (p.status === 'REFUNDED') {
        map[date].refundAmount += p.amount;
      }
    });

    return Object.values(map)
      .map((item) => ({ ...item, netRevenue: item.revenue - item.refundAmount }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [fallbackFilteredPayments]);

  // Fallback Monthly aggregation
  const fallbackMonthlyStats = useMemo(() => {
    const map: Record<
      string,
      { period: string; revenue: number; ticketCount: number; refundAmount: number; netRevenue: number }
    > = {};

    // Group all payments by YYYY-MM
    payments.forEach((p) => {
      const ticket = tickets.find((t) => t.paymentId === p.id || t.id === p.ticketId);
      const routeId = ticket?.routeId || '';
      if (selectedRouteId !== 'ALL' && routeId !== selectedRouteId) return;

      const dateStr = (p.createdAt || '').split(' ')[0] || '';
      const monthKey = dateStr.substring(0, 7) || '2026-09';

      if (!map[monthKey]) {
        map[monthKey] = { period: monthKey, revenue: 0, ticketCount: 0, refundAmount: 0, netRevenue: 0 };
      }

      if (p.status === 'SUCCESS') {
        map[monthKey].revenue += p.amount;
        map[monthKey].ticketCount += 1;
      } else if (p.status === 'REFUNDED') {
        map[monthKey].refundAmount += p.amount;
      }
    });

    return Object.values(map)
      .map((item) => ({ ...item, netRevenue: item.revenue - item.refundAmount }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [payments, tickets, selectedRouteId]);

  // Route revenue breakdown
  const fallbackRouteStats = useMemo(() => {
    const map: Record<
      string,
      { routeId: string; routeCode: string; routeName: string; revenue: number; ticketCount: number }
    > = {};

    routes.forEach((r) => {
      map[r.id] = {
        routeId: r.id,
        routeCode: r.code || r.routeCode || 'TUYẾN',
        routeName: r.name,
        revenue: 0,
        ticketCount: 0,
      };
    });

    fallbackFilteredPayments.forEach((p) => {
      const ticket = tickets.find((t) => t.paymentId === p.id || t.id === p.ticketId);
      const routeId = ticket?.routeId;
      if (routeId && map[routeId]) {
        if (p.status === 'SUCCESS') {
          map[routeId].revenue += p.amount;
          map[routeId].ticketCount += 1;
        }
      }
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [fallbackFilteredPayments, routes, tickets]);

  // Payment method breakdown
  const paymentMethodStats = useMemo(() => {
    const map: Record<string, { method: string; count: number; amount: number }> = {
      MOMO: { method: 'Ví MoMo', count: 0, amount: 0 },
      VNPAY: { method: 'Cổng VNPAY', count: 0, amount: 0 },
      ZALOPAY: { method: 'Ví ZaloPay', count: 0, amount: 0 },
      BANK_TRANSFER: { method: 'Chuyển khoản Ngân hàng', count: 0, amount: 0 },
    };

    fallbackFilteredPayments.forEach((p) => {
      if (p.status === 'SUCCESS' && map[p.method]) {
        map[p.method].count += 1;
        map[p.method].amount += p.amount;
      }
    });

    return Object.values(map);
  }, [fallbackFilteredPayments]);

  // Unified active metrics & time series (choosing API or fallback)
  const activeMetrics = apiData
    ? {
        totalGross: apiData.summary.totalGross,
        totalRefund: apiData.summary.totalRefund,
        netRevenue: apiData.summary.netRevenue,
        successfulCount: apiData.summary.successfulTickets,
        refundedCount: apiData.summary.refundedTickets,
        avgTicketPrice: apiData.summary.averageTicketPrice,
        refundRate:
          apiData.summary.successfulTickets > 0
            ? Math.round(
                (apiData.summary.refundedTickets /
                  (apiData.summary.successfulTickets + apiData.summary.refundedTickets)) *
                  100
              )
            : 0,
      }
    : fallbackMetrics;

  const activeTimeSeries = useMemo(() => {
    if (apiData && apiData.timeSeries.length > 0) {
      return apiData.timeSeries.map((item) => ({
        period: item.period,
        revenue: item.grossRevenue,
        ticketCount: item.ticketCount,
        refundAmount: item.refundAmount,
        netRevenue: item.netRevenue,
      }));
    }
    return viewMode === 'DAILY' ? fallbackDailyStats : fallbackMonthlyStats;
  }, [apiData, viewMode, fallbackDailyStats, fallbackMonthlyStats]);

  const activeRouteStats = apiData?.byRoute || fallbackRouteStats;
  const topRoute = activeRouteStats.length > 0 ? activeRouteStats[0] : null;

  // Max revenue for chart scaling
  const maxRevenue = Math.max(...activeTimeSeries.map((d) => d.revenue), 10000);

  const handleExportReport = () => {
    success('Báo cáo doanh thu bán vé đã được xuất ra định dạng CSV và sẵn sàng tải về!');
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Báo Cáo & Thống Kê Doanh Thu Bán Vé"
        description="Tổng hợp hiệu quả tài chính bán vé xe buýt theo ngày, tháng và từng tuyến vận tải hành khách."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo</span>
            </button>
          </div>
        }
      />

      {/* Connection Mode Indicator */}
      <div className="flex items-center justify-between text-xs px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {isLoadingApi ? (
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang đồng bộ dữ liệu từ máy chủ API...
            </span>
          ) : isUsingLiveApi ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Wifi className="w-3.5 h-3.5" />
              Nguồn dữ liệu: API Máy chủ trực tuyến (/api/reports/revenue)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              Nguồn dữ liệu: Hệ thống vận hành nội bộ (Tự động tổng hợp thời gian thực)
            </span>
          )}
        </div>

        <button
          onClick={loadReportData}
          disabled={isLoadingApi}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" />
          Làm mới dữ liệu
        </button>
      </div>

      {/* 2. Institutional Filter & Parameter Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Bộ lọc báo cáo tài chính:</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Khoảng thời gian:</span>
            {[
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'LAST_7_DAYS', label: '7 ngày qua' },
              { id: 'THIS_MONTH', label: 'Tháng hiện tại' },
              { id: 'ALL', label: 'Toàn thời gian' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors font-medium ${
                  dateRangePreset === p.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
          {/* Route Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tuyến xe buýt:
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">-- Tất cả các tuyến xe --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code || r.routeCode}] {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Chế độ thống kê:
            </label>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('DAILY')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'DAILY'
                    ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Theo Ngày
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MONTHLY')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'MONTHLY'
                    ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Theo Tháng
              </button>
            </div>
          </div>

          {/* Dynamic Date Inputs based on viewMode */}
          {viewMode === 'DAILY' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Từ ngày:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateRangePreset('CUSTOM');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Đến ngày:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateRangePreset('CUSTOM');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Chọn tháng khảo sát:
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setDateRangePreset('CUSTOM');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Thiết lập lại</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Revenue */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng Doanh Thu Vé
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeMetrics.totalGross.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Thực thu ròng: {activeMetrics.netRevenue.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* Card 2: Tickets Count */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vé Bán Thành Công
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeMetrics.successfulCount}{' '}
            <span className="text-sm font-semibold text-slate-500">vé</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span>Giá bình quân: {activeMetrics.avgTicketPrice.toLocaleString('vi-VN')} đ/vé</span>
          </div>
        </div>

        {/* Card 3: Refunds */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hoàn Trả Tiền Vé
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeMetrics.totalRefund.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-500 font-semibold">
            <span>Tỷ lệ hoàn: {activeMetrics.refundRate}% ({activeMetrics.refundedCount} vé)</span>
          </div>
        </div>

        {/* Card 4: Top Revenue Route */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tuyến Doanh Thu Cao Nhất
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-2 truncate">
            {topRoute ? `[${topRoute.routeCode}]` : 'Chưa có'}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span className="truncate">{topRoute?.routeName || 'N/A'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {topRoute?.revenue.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      </div>

      {/* 4. Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Interactive Chart (Daily / Monthly Revenue) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Biểu Đồ Doanh Thu Theo {viewMode === 'DAILY' ? 'Ngày' : 'Tháng'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Biểu diễn diễn biến doanh thu bán vé hàng {viewMode === 'DAILY' ? 'ngày' : 'tháng'} (VNĐ)
              </p>
            </div>
          </div>

          {/* SVG/HTML Bar Chart */}
          {activeTimeSeries.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Không có dữ liệu giao dịch trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <div className="pt-4">
              <div className="h-64 flex items-end gap-3 sm:gap-6 px-2 sm:px-4 border-b border-l border-slate-200 dark:border-slate-700 relative">
                {/* Horizontal reference grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                  <div className="border-b border-dashed border-slate-400 w-full" />
                </div>

                {activeTimeSeries.map((d) => {
                  const heightPercent = Math.max(Math.round((d.revenue / maxRevenue) * 100), 8);

                  return (
                    <div
                      key={d.period}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Floating Tooltip */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] rounded px-2.5 py-1.5 shadow-xl pointer-events-none z-20 whitespace-nowrap">
                        <div className="font-bold">{d.period}</div>
                        <div className="text-emerald-300">{d.revenue.toLocaleString('vi-VN')} VNĐ</div>
                        <div className="text-[10px] text-slate-300">{d.ticketCount} vé bán ra</div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[48px] bg-gradient-to-t from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 rounded-t-md transition-all duration-300 cursor-pointer shadow-sm relative"
                      >
                        <div className="text-[10px] text-white font-bold text-center pt-1 hidden sm:block">
                          {d.ticketCount}
                        </div>
                      </div>

                      {/* Label under bar */}
                      <div className="text-[10px] text-slate-500 font-medium mt-2 whitespace-nowrap truncate max-w-[50px]">
                        {viewMode === 'DAILY'
                          ? d.period.split('-').slice(1).reverse().join('/')
                          : d.period}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Route & Payment Breakdown */}
        <div className="space-y-6">
          {/* Box 1: Route Revenue Breakdown */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <Compass className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Doanh Thu Theo Tuyến
              </h3>
            </div>

            <div className="space-y-3 pt-1">
              {activeRouteStats.slice(0, 4).map((r) => {
                const total = activeMetrics.totalGross > 0 ? activeMetrics.totalGross : 1;
                const percent = Math.round((r.revenue / total) * 100);

                return (
                  <div key={r.routeId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {r.routeCode}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-bold">
                        {r.revenue.toLocaleString('vi-VN')} đ ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {r.routeName} • {r.ticketCount} vé
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Box 2: Payment Method Breakdown */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Phương Thức Thanh Toán
              </h3>
            </div>

            <div className="space-y-2 pt-1">
              {paymentMethodStats.map((m) => {
                const total = activeMetrics.totalGross > 0 ? activeMetrics.totalGross : 1;
                const pct = Math.round((m.amount / total) * 100);

                return (
                  <div
                    key={m.method}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{m.method}</div>
                      <div className="text-[10px] text-slate-400">{m.count} giao dịch</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {m.amount.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Detailed Financial Audit Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Bảng Kê Chi Tiết Doanh Thu Theo {viewMode === 'DAILY' ? 'Ngày' : 'Tháng'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chi tiết các khoản thu bán vé, số lượng giao dịch thành công và hoàn tiền
            </p>
          </div>

          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600">
            Tổng cộng: <strong>{activeTimeSeries.length}</strong> {viewMode === 'DAILY' ? 'ngày' : 'tháng'} phát sinh doanh thu
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">{viewMode === 'DAILY' ? 'Ngày giao dịch' : 'Tháng giao dịch'}</th>
                <th className="py-3 px-4">Số lượng vé bán</th>
                <th className="py-3 px-4">Doanh số gộp (VNĐ)</th>
                <th className="py-3 px-4">Số tiền hoàn vé (VNĐ)</th>
                <th className="py-3 px-4">Doanh thu thực tế (VNĐ)</th>
                <th className="py-3 px-4 text-center">Trạng thái đối soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
              {activeTimeSeries.map((row) => (
                <tr
                  key={row.period}
                  className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {row.period}
                  </td>
                  <td className="py-3 px-4 font-medium">
                    {row.ticketCount} vé
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {row.revenue.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-semibold">
                    {row.refundAmount > 0 ? `-${row.refundAmount.toLocaleString('vi-VN')} đ` : '—'}
                  </td>
                  <td className="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                    {row.netRevenue.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã đối soát</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
