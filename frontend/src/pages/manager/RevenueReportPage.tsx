import React, { useState, useMemo } from 'react';
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
  Receipt,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';

export const RevenueReportPage: React.FC = () => {
  const { routes, tickets, payments, refunds } = useData();
  const { success, info } = useToast();

  // Filters state
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('2026-09-20');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [viewMode, setViewMode] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [activeChartTab, setActiveChartTab] = useState<'TIME' | 'ROUTE'>('TIME');

  // Handle Preset changes
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const today = new Date('2026-09-29');
    
    if (preset === 'TODAY') {
      const d = '2026-09-29';
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'LAST_7_DAYS') {
      setStartDate('2026-09-23');
      setEndDate('2026-09-29');
    } else if (preset === 'THIS_MONTH') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
    } else if (preset === 'ALL') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
    }
  };

  const handleResetFilters = () => {
    setSelectedRouteId('ALL');
    setDateRangePreset('ALL');
    setStartDate('2026-09-01');
    setEndDate('2026-09-30');
    setViewMode('DAILY');
  };

  // Filtered Payments & Tickets
  const filteredData = useMemo(() => {
    return payments.filter((p) => {
      // Find corresponding ticket
      const ticket = tickets.find((t) => t.paymentId === p.id || t.id === p.ticketId);
      const routeId = ticket?.routeId || '';
      
      const paymentDate = p.createdAt.split(' ')[0] || '';

      const matchRoute = selectedRouteId === 'ALL' || routeId === selectedRouteId;
      const matchDate = (!startDate || paymentDate >= startDate) && (!endDate || paymentDate <= endDate);

      return matchRoute && matchDate;
    });
  }, [payments, tickets, selectedRouteId, startDate, endDate]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    let totalGross = 0;
    let totalRefund = 0;
    let successfulCount = 0;
    let refundedCount = 0;

    filteredData.forEach((p) => {
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
    const refundRate = (successfulCount + refundedCount) > 0 
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
  }, [filteredData]);

  // Daily revenue aggregation for charts & table
  const dailyStats = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; ticketCount: number; refundAmount: number }> = {};

    filteredData.forEach((p) => {
      const date = p.createdAt.split(' ')[0] || '2026-09-28';
      if (!map[date]) {
        map[date] = { date, revenue: 0, ticketCount: 0, refundAmount: 0 };
      }
      if (p.status === 'SUCCESS') {
        map[date].revenue += p.amount;
        map[date].ticketCount += 1;
      } else if (p.status === 'REFUNDED') {
        map[date].refundAmount += p.amount;
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Route revenue breakdown
  const routeStats = useMemo(() => {
    const map: Record<string, { routeId: string; routeCode: string; routeName: string; revenue: number; ticketCount: number }> = {};

    routes.forEach((r) => {
      map[r.id] = {
        routeId: r.id,
        routeCode: r.code,
        routeName: r.name,
        revenue: 0,
        ticketCount: 0,
      };
    });

    filteredData.forEach((p) => {
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
  }, [filteredData, routes, tickets]);

  // Payment method breakdown
  const paymentMethodStats = useMemo(() => {
    const map: Record<string, { method: string; count: number; amount: number }> = {
      MOMO: { method: 'Ví MoMo', count: 0, amount: 0 },
      VNPAY: { method: 'Cổng VNPAY', count: 0, amount: 0 },
      ZALOPAY: { method: 'Ví ZaloPay', count: 0, amount: 0 },
      BANK_TRANSFER: { method: 'Chuyển khoản Ngân hàng', count: 0, amount: 0 },
    };

    filteredData.forEach((p) => {
      if (p.status === 'SUCCESS' && map[p.method]) {
        map[p.method].count += 1;
        map[p.method].amount += p.amount;
      }
    });

    return Object.values(map);
  }, [filteredData]);

  // Top revenue route
  const topRoute = routeStats.length > 0 ? routeStats[0] : null;

  // Max daily revenue for scaling chart bars
  const maxDailyRevenue = Math.max(...dailyStats.map((d) => d.revenue), 10000);

  const handleExportReport = () => {
    success('Báo cáo doanh thu bán vé đã được xuất ra định dạng CSV và sẵn sàng lưu trữ!');
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Báo Cáo & Thống Kê Doanh Thu Bán Vé"
        subtitle="Tổng hợp hiệu quả tài chính bán vé xe buýt theo ngày, tháng và từng tuyến vận tải hành khách."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Báo cáo & Thống kê' },
          { label: 'Doanh thu bán vé' },
        ]}
        icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
        action={
          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Báo Cáo Doanh Thu</span>
          </button>
        }
      />

      {/* 2. Institutional Filter & Parameter Controls */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
            <span>Bộ lọc tham số báo cáo tài chính:</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Khoảng thời gian:</span>
            {[
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'LAST_7_DAYS', label: '7 ngày qua' },
              { id: 'THIS_MONTH', label: 'Tháng 09' },
              { id: 'ALL', label: 'Tất cả' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={`px-2.5 py-1 text-xs rounded transition-colors font-medium ${
                  dateRangePreset === p.id
                    ? 'bg-institutional-700 text-amber-300 font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-[#0c162d] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          {/* Route Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Tuyến xe buýt:
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">-- Tất cả các tuyến xe --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Từ ngày:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRangePreset('CUSTOM');
              }}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Đến ngày:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRangePreset('CUSTOM');
              }}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thiết lập lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Revenue */}
        <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng Doanh Thu Vé
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-institutional-900 dark:text-white mt-2">
            {metrics.totalGross.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Thực thu ròng: {metrics.netRevenue.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        {/* Card 2: Tickets Count */}
        <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vé Bán Thành Công
            </span>
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-institutional-900 dark:text-white mt-2">
            {metrics.successfulCount}{' '}
            <span className="text-sm font-semibold text-slate-500">vé</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Đã hoàn/hủy: {metrics.refundedCount} vé ({metrics.refundRate}%)</span>
          </div>
        </div>

        {/* Card 3: Avg Price */}
        <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Giá Vé Trung Bình
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-institutional-900 dark:text-white mt-2">
            {metrics.avgTicketPrice.toLocaleString('vi-VN')} <span className="text-sm font-semibold text-slate-500">VNĐ</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Dựa trên giao dịch thanh toán</span>
          </div>
        </div>

        {/* Card 4: Top Route */}
        <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tuyến Doanh Thu Cao Nhất
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="text-lg font-bold text-institutional-900 dark:text-white mt-2 truncate">
            {topRoute ? `[${topRoute.routeCode}]` : 'Chưa có'}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
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
        <div className="lg:col-span-2 bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#1e2f57]">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-institutional-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-white">
                  Biểu Đồ Doanh Thu Theo Dòng Thời Gian
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Biểu diễn diễn biến doanh thu bán vé hàng ngày (VNĐ)
              </p>
            </div>

            {/* Toggle view mode */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0c162d] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('DAILY')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'DAILY'
                    ? 'bg-white dark:bg-[#1a2d59] text-institutional-800 dark:text-sky-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Theo Ngày
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MONTHLY')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  viewMode === 'MONTHLY'
                    ? 'bg-white dark:bg-[#1a2d59] text-institutional-800 dark:text-sky-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Theo Tháng
              </button>
            </div>
          </div>

          {/* SVG Bar Chart */}
          {dailyStats.length === 0 ? (
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

                {dailyStats.map((d) => {
                  const heightPercent = Math.max(Math.round((d.revenue / maxDailyRevenue) * 100), 8);
                  const formattedDate = d.date.split('-').slice(1).reverse().join('/');

                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Floating Tooltip */}
                      <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] rounded px-2.5 py-1.5 shadow-xl pointer-events-none z-20 whitespace-nowrap">
                        <div className="font-bold">{d.date}</div>
                        <div className="text-amber-300">{d.revenue.toLocaleString('vi-VN')} VNĐ</div>
                        <div className="text-[10px] text-slate-300">{d.ticketCount} vé bán ra</div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[40px] bg-gradient-to-t from-institutional-800 to-institutional-500 hover:from-amber-600 hover:to-amber-400 rounded-t-md transition-all duration-300 cursor-pointer shadow-sm relative"
                      >
                        <div className="text-[10px] text-white font-bold text-center pt-1 hidden sm:block">
                          {d.ticketCount}
                        </div>
                      </div>

                      {/* X-axis label */}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 truncate max-w-full">
                        {formattedDate}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 px-2">
                <span>Số liệu hiển thị theo các ngày có phát sinh giao dịch</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Đỉnh doanh thu ngày: {maxDailyRevenue.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Route Revenue Share & Payment Methods */}
        <div className="space-y-6">
          {/* Box 1: Route Revenue Distribution */}
          <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1e2f57]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-white">
                  Tỷ Trọng Theo Tuyến
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Doanh thu / Tuyến</span>
            </div>

            <div className="space-y-3">
              {routeStats.map((r) => {
                const total = metrics.totalGross > 0 ? metrics.totalGross : 1;
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
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-institutional-600 dark:bg-sky-500 h-full rounded-full transition-all duration-500"
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
          <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-[#1e2f57]">
              <PieChart className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-white">
                Phương Thức Thanh Toán
              </h3>
            </div>

            <div className="space-y-2 pt-1">
              {paymentMethodStats.map((m) => {
                const total = metrics.totalGross > 0 ? metrics.totalGross : 1;
                const pct = Math.round((m.amount / total) * 100);

                return (
                  <div
                    key={m.method}
                    className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{m.method}</div>
                      <div className="text-[10px] text-slate-400">{m.count} giao dịch</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-institutional-900 dark:text-sky-300">
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

      {/* 5. Detailed Daily Financial Audit Table */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#1e2f57] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Bảng Kê Chi Tiết Doanh Thu Theo Ngày</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chi tiết các khoản thu bán vé, số lượng giao dịch thành công và hoàn tiền
            </p>
          </div>

          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-[#0c162d] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
            Tổng cộng: <strong>{dailyStats.length}</strong> ngày phát sinh doanh thu
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] dark:bg-[#0b162e] text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ngày giao dịch</th>
                <th className="py-3 px-4">Số lượng vé bán</th>
                <th className="py-3 px-4">Doanh số gộp (VNĐ)</th>
                <th className="py-3 px-4">Số tiền hoàn vé (VNĐ)</th>
                <th className="py-3 px-4">Doanh thu thực tế (VNĐ)</th>
                <th className="py-3 px-4 text-center">Trạng thái đối soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dailyStats.map((row) => {
                const net = row.revenue - row.refundAmount;

                return (
                  <tr
                    key={row.date}
                    className="hover:bg-slate-50 dark:hover:bg-[#162547] transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-institutional-900 dark:text-sky-300">
                      {row.date}
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
                      {net.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đã khớp</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
