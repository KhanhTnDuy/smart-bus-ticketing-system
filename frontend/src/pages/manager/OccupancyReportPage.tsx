import React, { useState, useMemo } from 'react';
import {
  Users,
  Bus,
  Calendar,
  Filter,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { TripOccupancyItem, OccupancyLoadStatus } from '../../types';

export const OccupancyReportPage: React.FC = () => {
  const { trips, routes, buses } = useData();

  // Filters
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to the date of first trip or today
    return trips.length > 0 ? trips[0].departureDate : new Date().toISOString().split('T')[0];
  });
  const [loadStatusFilter, setLoadStatusFilter] = useState<string>('ALL');

  // Available unique dates in trips for quick picker
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      if (t.departureDate) set.add(t.departureDate);
    });
    return Array.from(set).sort();
  }, [trips]);

  // Compute Occupancy Analysis for all trips
  const analyzedTrips: TripOccupancyItem[] = useMemo(() => {
    return trips.map((trip) => {
      const route = routes.find((r) => r.id === trip.routeId);
      const bookedCount = trip.bookedSeats ? trip.bookedSeats.length : 0;
      const bus = buses.find((b) => b.plateNumber === trip.busPlate);

      const hasBus = Boolean(
        trip.busPlate &&
          trip.busPlate !== 'Chưa gán xe' &&
          trip.busPlate.trim() !== '' &&
          trip.totalSeats > 0
      );

      let loadStatus: OccupancyLoadStatus;
      let occupancyPercent = 0;
      let recommendation = '';

      if (!hasBus) {
        loadStatus = 'NO_BUS';
        occupancyPercent = 0;
        recommendation = 'Chưa bố trí phương tiện. Cần gán xe và tài xế trước giờ xuất bến!';
      } else if (bookedCount === 0) {
        loadStatus = 'NO_TICKETS';
        occupancyPercent = 0;
        recommendation = 'Chưa có hành khách đặt chỗ. Xem xét gộp chuyến hoặc đẩy khuyến mại tuyến.';
      } else {
        occupancyPercent = Math.round((bookedCount / trip.totalSeats) * 100);
        if (occupancyPercent >= 85) {
          loadStatus = 'OVERLOAD';
          recommendation =
            'Tỷ lệ lấp đầy rất cao (>85%). Đề xuất tăng tần suất chuyến hoặc nâng cấp lên xe 45 chỗ.';
        } else if (occupancyPercent >= 60) {
          loadStatus = 'OPTIMAL';
          recommendation =
            'Tỷ lệ lấp đầy lý tưởng (60-85%). Giữ nguyên quy mô phương tiện và lịch chạy.';
        } else {
          loadStatus = 'LOW';
          recommendation =
            'Tỷ lệ lấp đầy thấp (<60%). Đề xuất thu gọn quy mô sang xe 16-29 chỗ để tiết kiệm nhiên liệu.';
        }
      }

      return {
        tripId: trip.id,
        routeId: trip.routeId,
        routeCode: route?.code || route?.routeCode || 'TUYẾN',
        routeName: route?.name || 'Tuyến xe buýt',
        busPlate: hasBus ? trip.busPlate : undefined,
        busModel: bus?.model || (hasBus ? `${trip.totalSeats} chỗ` : 'Chưa rõ'),
        driverName: trip.driverName || 'Chưa gán',
        departureTime: trip.departureTime,
        departureDate: trip.departureDate,
        totalSeats: trip.totalSeats,
        bookedSeatsCount: bookedCount,
        occupancyPercent,
        loadStatus,
        recommendation,
      };
    });
  }, [trips, routes, buses]);

  // Filtered List
  const filteredList = useMemo(() => {
    return analyzedTrips.filter((item) => {
      const matchRoute = selectedRouteId === 'ALL' || item.routeId === selectedRouteId;
      const matchDate = !selectedDate || item.departureDate === selectedDate;
      const matchStatus = loadStatusFilter === 'ALL' || item.loadStatus === loadStatusFilter;
      return matchRoute && matchDate && matchStatus;
    });
  }, [analyzedTrips, selectedRouteId, selectedDate, loadStatusFilter]);

  // Aggregate Metrics & KPIs
  const stats = useMemo(() => {
    const total = filteredList.length;
    const tripsWithBus = filteredList.filter((item) => item.loadStatus !== 'NO_BUS');
    const totalSeats = tripsWithBus.reduce((sum, item) => sum + item.totalSeats, 0);
    const totalBooked = tripsWithBus.reduce((sum, item) => sum + item.bookedSeatsCount, 0);

    const avgOccupancy =
      totalSeats > 0 ? Math.round((totalBooked / totalSeats) * 100) : 0;

    const overloaded = filteredList.filter((item) => item.loadStatus === 'OVERLOAD').length;
    const optimal = filteredList.filter((item) => item.loadStatus === 'OPTIMAL').length;
    const low = filteredList.filter((item) => item.loadStatus === 'LOW').length;
    const noTickets = filteredList.filter((item) => item.loadStatus === 'NO_TICKETS').length;
    const noBus = filteredList.filter((item) => item.loadStatus === 'NO_BUS').length;

    return {
      total,
      totalSeats,
      totalBooked,
      avgOccupancy,
      overloaded,
      optimal,
      low,
      noTickets,
      noBus,
    };
  }, [filteredList]);

  // Reset filter
  const handleResetFilters = () => {
    setSelectedRouteId('ALL');
    setSelectedDate(availableDates[0] || '');
    setLoadStatusFilter('ALL');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo tỷ lệ lấp đầy & Đề xuất quy mô xe"
        description="Theo dõi hệ số sử dụng ghế trên từng chuyến xe để tối ưu hóa việc phân bổ phương tiện 16, 29 hoặc 45 chỗ."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Số chuyến khảo sát
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.total}{' '}
              <span className="text-xs font-normal text-slate-400">chuyến</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Đã đặt: {stats.totalBooked} / {stats.totalSeats} ghế
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Bus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Lấp đầy trung bình
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats.avgOccupancy}%
            </p>
            <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${
                  stats.avgOccupancy >= 75
                    ? 'bg-emerald-500'
                    : stats.avgOccupancy >= 50
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(stats.avgOccupancy, 100)}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Chuyến quá tải (&gt;85%)
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {stats.overloaded}{' '}
              <span className="text-xs font-normal text-slate-400">chuyến</span>
            </p>
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Cần nâng cấp xe lớn
            </p>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Tải thấp (&lt;60%) &amp; Trống
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {stats.low + stats.noTickets}{' '}
              <span className="text-xs font-normal text-slate-400">chuyến</span>
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              Đề xuất hạ quy mô xe
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Route filter */}
          <div className="flex items-center gap-2">
            <Bus className="w-4 h-4 text-slate-400" />
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả tuyến xe</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code || r.routeCode} - {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={loadStatusFilter}
              onChange={(e) => setLoadStatusFilter(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả tình trạng tải</option>
              <option value="OVERLOAD">Quá tải (&gt;85%)</option>
              <option value="OPTIMAL">Tối ưu (60% - 85%)</option>
              <option value="LOW">Tải thấp (&lt;60%)</option>
              <option value="NO_TICKETS">Chưa có vé (0%)</option>
              <option value="NO_BUS">Chưa gán xe</option>
            </select>
          </div>
        </div>

        {(selectedRouteId !== 'ALL' || loadStatusFilter !== 'ALL') && (
          <button
            onClick={handleResetFilters}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-1 text-xs"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        )}
      </div>

      {/* Exception Notice Banner (if any unassigned bus) */}
      {stats.noBus > 0 && (
        <div className="p-4 bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-800 rounded-xl flex items-center justify-between text-xs text-fuchsia-900 dark:text-fuchsia-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-fuchsia-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                Phát hiện {stats.noBus} chuyến xe chưa được gán phương tiện trong ngày đã chọn!
              </p>
              <p className="text-fuchsia-700 dark:text-fuchsia-300">
                Các chuyến này đang không có thông số số ghế khả dụng. Hãy vào Quản lý Lịch chạy để phân công xe nhằm tránh ảnh hưởng đến hành khách.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bar Chart Visualization (Tỷ lệ lấp đầy theo khung giờ) */}
      {filteredList.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Biểu đồ tỷ lệ lấp đầy theo chuyến xe trong ngày ({selectedDate})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đường đứt nét đỏ thể hiện ngưỡng quá tải 85%; đường đứt nét vàng thể hiện ngưỡng tải thấp 60%.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-rose-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Quá tải (&gt;85%)
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Tối ưu (60-85%)
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Thấp (&lt;60%)
              </span>
            </div>
          </div>

          <div className="pt-6 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 items-end min-h-[180px]">
              {filteredList.map((item) => {
                const heightPercent = item.loadStatus === 'NO_BUS' ? 10 : Math.max(item.occupancyPercent, 6);
                let barColor = 'bg-slate-300 dark:bg-slate-700';
                if (item.loadStatus === 'OVERLOAD') barColor = 'bg-rose-500';
                else if (item.loadStatus === 'OPTIMAL') barColor = 'bg-emerald-500';
                else if (item.loadStatus === 'LOW') barColor = 'bg-amber-500';
                else if (item.loadStatus === 'NO_BUS') barColor = 'bg-fuchsia-400';

                return (
                  <div key={item.tripId} className="flex flex-col items-center group relative">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {item.loadStatus === 'NO_BUS' ? 'N/A' : `${item.occupancyPercent}%`}
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-t-lg h-36 flex items-end justify-center p-1 relative overflow-hidden">
                      <div
                        className={`w-full ${barColor} rounded-t transition-all duration-500 group-hover:opacity-90`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.departureTime}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.routeCode}
                      </div>
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 w-48 p-2.5 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
                      <p className="font-bold">{item.tripId} • {item.departureTime}</p>
                      <p className="text-[11px] text-slate-300">{item.routeName}</p>
                      <p className="text-[11px] mt-1">
                        Xe: {item.busPlate || 'Chưa gán xe'} ({item.busModel})
                      </p>
                      <p className="text-[11px]">
                        Khách: {item.bookedSeatsCount} / {item.totalSeats} ghế
                      </p>
                      <p className="text-[10px] text-amber-300 mt-1">
                        {item.recommendation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Table: Detailed Occupancy and Vehicle Sizing Recommendation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <EmptyState
            title="Không có dữ liệu chuyến xe"
            description="Không tìm thấy chuyến xe nào chạy trong ngày hoặc tuyến xe đã chọn."
            actionLabel="Đặt lại bộ lọc"
            onAction={handleResetFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-4">Mã chuyến</th>
                  <th className="px-5 py-4">Tuyến &amp; Giờ chạy</th>
                  <th className="px-5 py-4">Phương tiện hiện tại</th>
                  <th className="px-5 py-4">Số ghế đã đặt</th>
                  <th className="px-5 py-4">Tỷ lệ lấp đầy</th>
                  <th className="px-5 py-4">Tình trạng</th>
                  <th className="px-5 py-4">Đề xuất quy mô xe (Sizing)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredList.map((item) => (
                  <tr
                    key={item.tripId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {item.tripId}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.routeCode} - {item.routeName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        {item.departureTime} • {item.departureDate}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {item.busPlate ? (
                        <div>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {item.busPlate}
                          </span>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {item.busModel} (Tổng {item.totalSeats} ghế)
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800">
                          Chưa gán xe
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {item.loadStatus === 'NO_BUS' ? (
                        <span className="text-xs text-slate-400 italic">Chưa xác định</span>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.bookedSeatsCount}
                          </span>
                          <span className="text-xs text-slate-500"> / {item.totalSeats} chỗ</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 min-w-[130px]">
                      {item.loadStatus === 'NO_BUS' ? (
                        <span className="text-xs text-slate-400">N/A</span>
                      ) : (
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1">
                            <span
                              className={
                                item.occupancyPercent >= 85
                                  ? 'text-rose-600'
                                  : item.occupancyPercent >= 60
                                  ? 'text-emerald-600'
                                  : item.occupancyPercent > 0
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                              }
                            >
                              {item.occupancyPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                item.occupancyPercent >= 85
                                  ? 'bg-rose-500'
                                  : item.occupancyPercent >= 60
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(item.occupancyPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="occupancyStatus" value={item.loadStatus} />
                    </td>
                    <td className="px-5 py-4 max-w-sm">
                      <div className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{item.recommendation}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
