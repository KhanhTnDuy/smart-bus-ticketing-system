import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Bus,
  RefreshCw,
  Play,
  Pause,
  MapPin,
  Navigation,
  Gauge,
  Clock,
  Radio,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { BusTracking, TrackingStatus } from '../../types';

export const BusTrackingPage: React.FC = () => {
  const { trackings, routes, refreshSimulatedGps } = useData();
  const { success, info } = useToast();
  const showSuccess = success;
  const showInfo = info;

  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [selectedBusId, setSelectedBusId] = useState<string>(trackings[0]?.busId || trackings[0]?.id || '');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-refresh interval (simulating 6 seconds real-time GPS telemetry)
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refreshSimulatedGps();
      setLastUpdated(new Date());
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshSimulatedGps]);

  const handleManualRefresh = () => {
    refreshSimulatedGps();
    setLastUpdated(new Date());
    showSuccess('Đã cập nhật tọa độ GPS mới nhất từ thiết bị giám sát hành trình!');
  };

  const getBusId = (b: BusTracking) => b.busId || b.id || '';
  const getSpeed = (b: BusTracking) => (typeof b.speedKmH === 'number' ? b.speedKmH : b.speed ?? 0);
  const getCurrentStop = (b: BusTracking) => b.currentLocationName || b.currentStop || 'Trạm trung tâm';
  const getNextStop = (b: BusTracking) => b.nextStopName || b.nextStop || 'Bến xe';
  const getRouteInfo = (routeId: string) => routes.find((r) => r.id === routeId);

  const filteredTrackings = useMemo(() => {
    return trackings.filter((bus) => {
      const bPlate = bus.busPlate.toLowerCase();
      const bDriver = bus.driverName.toLowerCase();
      const rInfo = getRouteInfo(bus.routeId);
      const rCode = (rInfo?.code || rInfo?.routeCode || bus.routeCode || '').toLowerCase();
      const rName = (rInfo?.name || bus.routeName || '').toLowerCase();

      const matchesSearch =
        bPlate.includes(searchTerm.toLowerCase()) ||
        bDriver.includes(searchTerm.toLowerCase()) ||
        rCode.includes(searchTerm.toLowerCase()) ||
        rName.includes(searchTerm.toLowerCase());

      const matchesRoute = routeFilter === 'ALL' || bus.routeId === routeFilter;

      return matchesSearch && matchesRoute;
    });
  }, [trackings, routes, searchTerm, routeFilter]);

  const activeBus = useMemo(() => {
    return (
      trackings.find((b) => getBusId(b) === selectedBusId) ||
      filteredTrackings[0] ||
      trackings[0]
    );
  }, [trackings, selectedBusId, filteredTrackings]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giám Sát Vị Trí Xe Theo Thời Gian Thực (GPS Telemetry)"
        subtitle="Hệ thống giám sát hành trình trực tuyến, tốc độ di chuyển, tọa độ vệ tinh và dự báo thời gian đến trạm"
        icon={<Compass className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Vận hành' },
          { label: 'Giám sát GPS' },
        ]}
      />

      {/* Control & Telemetry Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo biển số (51B-...), tuyến xe, lái xe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Route Filter */}
          <div className="flex items-center gap-2">
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả tuyến đang chạy</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code || r.routeCode} - {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsAutoRefresh(!isAutoRefresh);
              showInfo(
                !isAutoRefresh
                  ? 'Đã bật chế độ tự động cập nhật GPS (mỗi 6 giây)'
                  : 'Đã tạm dừng tự động cập nhật GPS'
              );
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isAutoRefresh
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            {isAutoRefresh ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Pause className="w-3.5 h-3.5" />
                <span>Auto GPS: Đang chạy</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Auto GPS: Tạm dừng</span>
              </>
            )}
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-institutional-600 hover:bg-institutional-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cập nhật vị trí</span>
          </button>

          <span className="text-[11px] text-slate-400 hidden xl:inline">
            Lần cuối: {lastUpdated.toLocaleTimeString('vi-VN')}
          </span>
        </div>
      </div>

      {/* Main Map & Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Simulated Real-Time Radar / GPS Map Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 dark:bg-[#071026] rounded-xl border-2 border-slate-700 dark:border-[#1e2f57] overflow-hidden shadow-xl relative min-h-[480px] flex flex-col justify-between p-4">
            
            {/* Map Header Overlay */}
            <div className="flex justify-between items-center z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-white/10">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Bản Đồ Định Vị Số Vệ Tinh (GPS Urban Grid)
                </span>
              </div>
              <div className="text-xs text-amber-300 font-mono">
                {filteredTrackings.length} xe đang truyền tín hiệu
              </div>
            </div>

            {/* Radar Grid Graphic Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }}
              />
            </div>

            {/* Central Simulated Bus Transit Route Line */}
            <div className="relative my-auto py-12 z-0">
              <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-sky-900/60 -translate-y-1/2 rounded" />
              <div className="absolute top-1/2 left-4 right-4 border-b border-dashed border-sky-400/40 -translate-y-1/2" />

              {/* Render Bus Markers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 px-2">
                {filteredTrackings.map((bus) => {
                  const busId = getBusId(bus);
                  const isSelected = activeBus && getBusId(activeBus) === busId;
                  const speed = getSpeed(bus);
                  const rInfo = getRouteInfo(bus.routeId);

                  return (
                    <div
                      key={busId}
                      onClick={() => setSelectedBusId(busId)}
                      className={`cursor-pointer transition-all p-3 rounded-xl backdrop-blur-md border ${
                        isSelected
                          ? 'bg-institutional-700/90 border-amber-400 ring-2 ring-amber-400 shadow-2xl scale-105'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      {/* Top plate badge */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded shadow-sm">
                          {bus.busPlate}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            bus.status === 'RUNNING' || bus.status === 'ON_ROUTE'
                              ? 'bg-emerald-400 animate-pulse'
                              : bus.status === 'STOPPED' || bus.status === 'ARRIVED_STOP'
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                        />
                      </div>

                      {/* Icon & Speed */}
                      <div className="flex items-center gap-2 my-1">
                        <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {rInfo?.code || rInfo?.routeCode || bus.routeId}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-300 font-semibold">
                            {speed} km/h
                          </div>
                        </div>
                      </div>

                      {/* Location text */}
                      <div className="text-[10px] text-slate-400 mt-2 truncate">
                        Trạm: <strong className="text-slate-200">{getCurrentStop(bus)}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Map Footer Overlay */}
            <div className="z-10 bg-slate-900/80 backdrop-blur-md p-2.5 rounded-lg border border-white/10 flex flex-wrap justify-between items-center text-[11px] text-slate-400 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Đang chạy ({trackings.filter((t) => t.status === 'RUNNING' || t.status === 'ON_ROUTE').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Dừng đón trả ({trackings.filter((t) => t.status === 'STOPPED' || t.status === 'ARRIVED_STOP').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Nghỉ / Bảo dưỡng ({trackings.filter((t) => t.status === 'INACTIVE' || t.status === 'MAINTENANCE').length})
                </span>
              </div>
              <span className="font-mono text-slate-500">Chuẩn tọa độ WGS-84</span>
            </div>
          </div>

          {/* Quick List Table */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase text-slate-700 dark:text-slate-300">
              Danh Sách Thiết Bị Định Vị GPS Đang Hoạt Động
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Biển kiểm soát</th>
                    <th className="py-2.5 px-3">Tuyến</th>
                    <th className="py-2.5 px-3">Tốc độ</th>
                    <th className="py-2.5 px-3">Vị trí hiện tại</th>
                    <th className="py-2.5 px-3">Trạm tiếp theo</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTrackings.map((bus) => {
                    const busId = getBusId(bus);
                    const isSelected = activeBus && getBusId(activeBus) === busId;
                    const rInfo = getRouteInfo(bus.routeId);

                    return (
                      <tr
                        key={busId}
                        onClick={() => setSelectedBusId(busId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-[#162344]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-institutional-700 dark:text-sky-300 font-bold">
                          {bus.busPlate}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-white">
                          {rInfo?.code || rInfo?.routeCode || bus.routeId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {getSpeed(bus)} km/h
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                          {getCurrentStop(bus)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">
                          {getNextStop(bus)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="trackingStatus" value={bus.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Active Vehicle Telemetry Details */}
        <div className="space-y-4">
          {activeBus ? (
            <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm space-y-5">
              {/* Header */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">
                    THÔNG SỐ GIÁM SÁT CHI TIẾT
                  </span>
                  <Badge variant="trackingStatus" value={activeBus.status} />
                </div>
                <h3 className="text-xl font-black text-institutional-900 dark:text-white mt-1">
                  {activeBus.busPlate}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getRouteInfo(activeBus.routeId)?.name || activeBus.routeId}
                </p>
              </div>

              {/* Telemetry Numbers Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-[#0c162d] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-sky-500" />
                    <span>Tốc độ di chuyển</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                    {getSpeed(activeBus)} <span className="text-xs font-normal">km/h</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#0c162d] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Góc hướng di chuyển</span>
                  </div>
                  <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                    {activeBus.heading}°
                  </div>
                </div>
              </div>

              {/* Transit Stops Progress */}
              <div className="space-y-3 bg-slate-50 dark:bg-[#0c162d] p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  Lộ trình di chuyển hiện tại:
                </div>
                
                <div className="space-y-2 relative pl-5 border-l-2 border-institutional-500 ml-2">
                  <div className="relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -left-[26px] top-1 ring-4 ring-white dark:ring-[#0c162d]" />
                    <div className="text-[10px] text-slate-400 uppercase">Vị trí hiện tại</div>
                    <div className="font-bold text-slate-900 dark:text-white">{getCurrentStop(activeBus)}</div>
                  </div>

                  <div className="relative pt-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -left-[26px] top-3 ring-4 ring-white dark:ring-[#0c162d] animate-pulse" />
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">
                      Trạm kế tiếp (Tiếp cận)
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">{getNextStop(activeBus)}</div>
                  </div>
                </div>
              </div>

              {/* Coordinates and Hardware Details */}
              <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tọa độ GPS vệ tinh:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {activeBus.latitude.toFixed(4)}, {activeBus.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tài xế điều khiển:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeBus.driverName}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Tín hiệu GSM/4G:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    Cực tốt (-65 dBm)
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Cập nhật lúc:</span>
                  <span className="text-slate-500 font-mono">
                    {activeBus.updatedTime || 'Vừa xong'}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={handleManualRefresh}
                className="w-full py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kiểm tra tín hiệu xe này</span>
              </button>
            </div>
          ) : (
            <div className="p-5 text-center text-xs text-slate-400">
              Chọn một xe trên bản đồ để xem chi tiết thông số
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
