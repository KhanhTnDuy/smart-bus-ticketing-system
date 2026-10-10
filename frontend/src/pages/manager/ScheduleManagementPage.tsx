import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Search, Plus, Eye, Edit2, Trash2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useScheduleManagement } from '../../hooks/useScheduleManagement';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { TripAssignmentDto, AvailableBusDto, AvailableStaffDto } from '../../api/assignments';
import {
  DAY_OPTIONS,
  DayCode,
  GenerateTripsResult,
  ScheduleDto,
  TRIP_STATUS_LABEL,
  TripStatusName,
  availableBuses,
  availableStaff,
  toTripStatusName,
  tripStatusToCode,
  vietnamToUtcIso,
} from '../../api/scheduleManagement';

const INPUT =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';
const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const PRIMARY_BTN =
  'px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-60';

const STATUS_STYLE: Record<TripStatusName, string> = {
  Scheduled: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  Running: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Delayed: 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  Completed:
    'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

const StatusPill: React.FC<{ status: TripStatusName }> = ({ status }) => (
  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${STATUS_STYLE[status]}`}>
    {TRIP_STATUS_LABEL[status]}
  </span>
);

const todayLocal = () => new Date().toLocaleDateString('en-CA'); // yyyy-MM-dd theo giờ máy

interface TripForm {
  routeId: string;
  date: string;
  time: string;
  busId: string;
  driverId: string;
  conductorId: string;
  status: TripStatusName;
}

const emptyTripForm = (routeId = ''): TripForm => ({
  routeId,
  date: todayLocal(),
  time: '08:00',
  busId: '',
  driverId: '',
  conductorId: '',
  status: 'Scheduled',
});

interface ScheduleForm {
  routeId: string;
  firstDeparture: string;
  lastDeparture: string;
  frequencyMinutes: number;
  days: DayCode[];
}

const emptyScheduleForm = (routeId = ''): ScheduleForm => ({
  routeId,
  firstDeparture: '05:30',
  lastDeparture: '21:00',
  frequencyMinutes: 20,
  days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
});

export const ScheduleManagementPage: React.FC = () => {
  const {
    trips,
    schedules,
    routes,
    loading,
    error: loadError,
    reload,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    generateTrips,
    previewTrips,
    addTrip,
    updateTrip,
    deleteTrip,
  } = useScheduleManagement();
  const { success, error: showError } = useToast();

  const [activeTab, setActiveTab] = useState<'TRIPS' | 'SCHEDULES'>('TRIPS');
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Chuyến xe ----
  const [tripModal, setTripModal] = useState<'ADD' | 'EDIT' | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripAssignmentDto | null>(null);
  const [detailTrip, setDetailTrip] = useState<TripAssignmentDto | null>(null);
  const [deleteTripTarget, setDeleteTripTarget] = useState<TripAssignmentDto | null>(null);
  const [tripForm, setTripForm] = useState<TripForm>(emptyTripForm());
  const [busOptions, setBusOptions] = useState<AvailableBusDto[]>([]);
  const [driverOptions, setDriverOptions] = useState<AvailableStaffDto[]>([]);
  const [conductorOptions, setConductorOptions] = useState<AvailableStaffDto[]>([]);

  // ---- Lịch trình ----
  const [scheduleModal, setScheduleModal] = useState<'ADD' | 'EDIT' | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDto | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ScheduleDto | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm());
  const [generateTarget, setGenerateTarget] = useState<ScheduleDto | null>(null);
  const [genFrom, setGenFrom] = useState(todayLocal());
  const [genTo, setGenTo] = useState(todayLocal());
  const [genPreview, setGenPreview] = useState<GenerateTripsResult | null>(null);

  // Tải xe và nhân sự còn rảnh vào đúng giờ chuyến, backend đã loại các xe, người bị trùng lịch.
  useEffect(() => {
    if (!tripModal || !tripForm.routeId || !tripForm.date || !tripForm.time) return;
    const routeId = Number(tripForm.routeId);
    const departureAt = vietnamToUtcIso(tripForm.date, tripForm.time);
    const excludeId = selectedTrip?.tripId;
    let cancelled = false;
    Promise.all([
      availableBuses(departureAt, routeId, excludeId),
      availableStaff(0, departureAt, routeId, excludeId),
      availableStaff(1, departureAt, routeId, excludeId),
    ])
      .then(([b, d, c]) => {
        if (cancelled) return;
        setBusOptions(b);
        setDriverOptions(d);
        setConductorOptions(c);
      })
      .catch((err) => {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Không tải được danh sách xe và nhân sự.');
      });
    return () => {
      cancelled = true;
    };
  }, [tripModal, tripForm.routeId, tripForm.date, tripForm.time, selectedTrip, showError]);

  const routeLabel = (r: { code: string; name: string }) => `${r.code} - ${r.name}`;

  const filteredTrips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return trips.filter((t) => {
      const matchSearch =
        !q ||
        String(t.tripId).includes(q) ||
        t.routeCode.toLowerCase().includes(q) ||
        t.routeName.toLowerCase().includes(q) ||
        t.busPlate.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q);
      const matchRoute = routeFilter === 'ALL' || String(t.routeId) === routeFilter;
      const matchStatus = statusFilter === 'ALL' || toTripStatusName(t.status) === statusFilter;
      const matchDate = !dateFilter || t.date === dateFilter;
      return matchSearch && matchRoute && matchStatus && matchDate;
    });
  }, [trips, searchTerm, routeFilter, statusFilter, dateFilter]);

  const countStatus = (...names: TripStatusName[]) => trips.filter((t) => names.includes(toTripStatusName(t.status))).length;

  // ---------- Chuyến xe: thêm, sửa, xóa ----------

  const openAddTrip = () => {
    setSelectedTrip(null);
    setTripForm(emptyTripForm(routes[0] ? String(routes[0].id) : ''));
    setTripModal('ADD');
  };

  const openEditTrip = (t: TripAssignmentDto) => {
    setSelectedTrip(t);
    setTripForm({
      routeId: String(t.routeId),
      date: t.date,
      time: t.startTime ?? '08:00',
      busId: t.bus ? String(t.bus.id) : '',
      driverId: t.driver ? String(t.driver.accountId) : '',
      conductorId: t.conductor ? String(t.conductor.accountId) : '',
      status: toTripStatusName(t.status),
    });
    setTripModal('EDIT');
  };

  const submitTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripForm.routeId) return showError('Vui lòng chọn tuyến đường.');
    if (!tripForm.driverId) return showError('Vui lòng chọn tài xế trong danh sách.');

    setIsSubmitting(true);
    const departureAt = vietnamToUtcIso(tripForm.date, tripForm.time);
    const busId = tripForm.busId ? Number(tripForm.busId) : undefined;
    const driverId = Number(tripForm.driverId);
    const conductorId = tripForm.conductorId ? Number(tripForm.conductorId) : undefined;

    const res =
      tripModal === 'ADD'
        ? await addTrip({ routeId: Number(tripForm.routeId), departureAt, busId, driverId, conductorId })
        : await updateTrip(
            selectedTrip!.tripId,
            { departureAt, status: tripStatusToCode(tripForm.status) },
            { busId, driverId, conductorId },
          );
    setIsSubmitting(false);

    if (res.success) {
      success(tripModal === 'ADD' ? 'Đã tạo chuyến xe và lưu vào hệ thống.' : 'Đã cập nhật chuyến xe.');
      setTripModal(null);
    } else {
      showError(res.message || 'Không lưu được chuyến xe.');
    }
  };

  const confirmDeleteTrip = async () => {
    if (!deleteTripTarget) return;
    const res = await deleteTrip(deleteTripTarget.tripId);
    if (res.success) success(`Đã xóa chuyến #${deleteTripTarget.tripId}.`);
    else showError(res.message || 'Không xóa được chuyến xe.');
    setDeleteTripTarget(null);
  };

  // ---------- Lịch trình: thêm, sửa, xóa, sinh chuyến ----------

  const openAddSchedule = () => {
    setSelectedSchedule(null);
    setScheduleForm(emptyScheduleForm(routes[0] ? String(routes[0].id) : ''));
    setScheduleModal('ADD');
  };

  const openEditSchedule = (s: ScheduleDto) => {
    setSelectedSchedule(s);
    setScheduleForm({
      routeId: String(s.routeId),
      firstDeparture: s.firstDeparture,
      lastDeparture: s.lastDeparture,
      frequencyMinutes: s.frequencyMinutes,
      days: s.daysOfWeek,
    });
    setScheduleModal('EDIT');
  };

  const submitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.routeId) return showError('Vui lòng chọn tuyến đường.');
    if (scheduleForm.days.length === 0) return showError('Chọn ít nhất một ngày chạy trong tuần.');

    setIsSubmitting(true);
    const body = {
      routeId: Number(scheduleForm.routeId),
      firstDeparture: scheduleForm.firstDeparture,
      lastDeparture: scheduleForm.lastDeparture,
      frequencyMinutes: Number(scheduleForm.frequencyMinutes),
      daysOfWeek: DAY_OPTIONS.map((d) => d.code).filter((c) => scheduleForm.days.includes(c)),
    };
    const res = scheduleModal === 'ADD' ? await addSchedule(body) : await updateSchedule(selectedSchedule!.id, body);
    setIsSubmitting(false);

    if (res.success) {
      success(scheduleModal === 'ADD' ? 'Đã tạo lịch trình.' : 'Đã cập nhật lịch trình.');
      setScheduleModal(null);
    } else {
      showError(res.message || 'Không lưu được lịch trình.');
    }
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return;
    const res = await deleteSchedule(deleteScheduleTarget.id);
    if (res.success) success('Đã xóa lịch trình.');
    else showError(res.message || 'Không xóa được lịch trình.');
    setDeleteScheduleTarget(null);
  };

  const openGenerate = (s: ScheduleDto) => {
    setGenerateTarget(s);
    setGenFrom(todayLocal());
    setGenTo(todayLocal());
    setGenPreview(null);
  };

  const runPreview = async () => {
    if (!generateTarget) return;
    setIsSubmitting(true);
    const res = await previewTrips(generateTarget.id, { fromDate: genFrom, toDate: genTo });
    setIsSubmitting(false);
    if (res.success) setGenPreview(res.data);
    else showError(res.message);
  };

  const confirmGenerate = async () => {
    if (!generateTarget) return;
    setIsSubmitting(true);
    const res = await generateTrips(generateTarget.id, { fromDate: genFrom, toDate: genTo });
    setIsSubmitting(false);
    if (res.success) {
      success(`Đã sinh ${res.data?.created ?? 0} chuyến, bỏ qua ${res.data?.skipped ?? 0} chuyến đã có.`);
      setGenerateTarget(null);
    } else {
      showError(res.message || 'Không sinh được chuyến.');
    }
  };

  const toggleDay = (code: DayCode) =>
    setScheduleForm((f) => ({ ...f, days: f.days.includes(code) ? f.days.filter((d) => d !== code) : [...f.days, code] }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý lịch trình & chuyến xe"
        subtitle="Lập kế hoạch xuất bến, phân công xe và nhân sự cho từng chuyến. Mọi thay đổi được lưu vào cơ sở dữ liệu."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => void reload()} className={PRIMARY_BTN} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
            {activeTab === 'TRIPS' ? (
              <button type="button" onClick={openAddTrip} className={PRIMARY_BTN} disabled={routes.length === 0}>
                <Plus className="w-4 h-4" />
                <span>Thêm chuyến</span>
              </button>
            ) : (
              <button type="button" onClick={openAddSchedule} className={PRIMARY_BTN} disabled={routes.length === 0}>
                <Plus className="w-4 h-4" />
                <span>Thêm lịch trình</span>
              </button>
            )}
          </div>
        }
      />

      {loadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Không tải được dữ liệu từ máy chủ: {loadError}</span>
        </div>
      )}

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {(
          [
            ['TRIPS', `Danh sách chuyến xe (${trips.length})`, Calendar],
            ['SCHEDULES', `Lịch trình định kỳ (${schedules.length})`, Clock],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
              activeTab === key
                ? 'border-institutional-600 text-institutional-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'TRIPS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Tổng số chuyến', trips.length, ''],
              ['Đã lên lịch', countStatus('Scheduled'), 'text-institutional-600 dark:text-sky-300'],
              ['Đang chạy / trễ giờ', countStatus('Running', 'Delayed'), 'text-amber-600 dark:text-amber-400'],
              ['Hoàn thành', countStatus('Completed'), 'text-emerald-600 dark:text-emerald-400'],
            ].map(([label, value, color]) => (
              <div key={label as string} className={`${CARD} p-4`}>
                <div className="text-slate-400 text-xs font-semibold">{label}</div>
                <div className={`text-xl font-bold mt-1 text-slate-900 dark:text-white ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className={`${CARD} p-4 flex flex-wrap gap-3 items-center`}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã chuyến, biển số, tài xế, tuyến..."
                className={`${FILTER} w-full pl-9`}
              />
            </div>
            <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className={FILTER}>
              <option value="ALL">Tất cả tuyến đường</option>
              {routes.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {routeLabel(r)}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FILTER}>
              <option value="ALL">Tất cả trạng thái</option>
              {(Object.keys(TRIP_STATUS_LABEL) as TripStatusName[]).map((s) => (
                <option key={s} value={s}>
                  {TRIP_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={FILTER}
              title="Lọc theo ngày xuất bến"
            />
          </div>

          {loading && trips.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
          ) : filteredTrips.length === 0 ? (
            <EmptyState
              title="Không tìm thấy chuyến xe nào"
              description="Chưa có chuyến xe phù hợp với điều kiện lọc. Thêm chuyến lẻ hoặc sinh chuyến từ lịch trình định kỳ."
              icon={<Calendar className="w-12 h-12 text-slate-300" />}
            />
          ) : (
            <div className={`${CARD} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Mã chuyến</th>
                      <th className="py-3 px-4">Tuyến đường</th>
                      <th className="py-3 px-4">Xe / Tài xế</th>
                      <th className="py-3 px-4">Khởi hành</th>
                      <th className="py-3 px-4">Đến dự kiến</th>
                      <th className="py-3 px-4">Vé đặt</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTrips.map((t) => {
                      const capacity = t.bus?.capacity ?? 0;
                      const booked = t.bookedTicketsCount ?? 0;
                      return (
                        <tr key={t.tripId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono font-bold text-institutional-600 dark:text-sky-400">TRIP-{t.tripId}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{t.routeCode}</div>
                            <div className="text-[11px] text-slate-400">{t.routeName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-amber-600 dark:text-amber-400">{t.busPlate || 'Chưa gán xe'}</div>
                            <div className="text-[11px] text-slate-500">TX: {t.driverName || 'Chưa gán'}</div>
                            {t.assistantName && <div className="text-[11px] text-slate-400">Phụ xe: {t.assistantName}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{t.startTime}</div>
                            <div className="text-[11px] text-slate-400">{t.date}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{t.endTime}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                            {booked}
                            {capacity > 0 ? `/${capacity}` : ''}
                          </td>
                          <td className="py-3 px-4">
                            <StatusPill status={toTripStatusName(t.status)} />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-1.5">
                              <button type="button" title="Chi tiết" onClick={() => setDetailTrip(t)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button type="button" title="Sửa" onClick={() => openEditTrip(t)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button type="button" title="Xóa" onClick={() => setDeleteTripTarget(t)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'SCHEDULES' &&
        (schedules.length === 0 ? (
          <EmptyState
            title="Chưa có lịch trình định kỳ"
            description="Tạo lịch trình theo tuyến (giờ chuyến đầu, chuyến cuối, tần suất) rồi sinh chuyến tự động."
            icon={<Clock className="w-12 h-12 text-slate-300" />}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {schedules.map((s) => (
              <div key={s.id} className={`${CARD} p-5 space-y-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-institutional-100 dark:bg-sky-950/60 text-institutional-700 dark:text-sky-300 border border-institutional-300 dark:border-sky-800">
                      {s.routeCode}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">{s.routeName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {s.firstDeparture} - {s.lastDeparture}, {s.frequencyMinutes} phút/chuyến, {s.tripsPerDay} chuyến mỗi ngày chạy
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" title="Sửa" onClick={() => openEditSchedule(s)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" title="Xóa" onClick={() => setDeleteScheduleTarget(s)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  {DAY_OPTIONS.map((d) => (
                    <span
                      key={d.code}
                      className={`px-2 py-1 rounded text-[11px] font-bold ${
                        s.daysOfWeek.includes(d.code)
                          ? 'bg-institutional-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {d.label}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Đã sinh {s.generatedTripCount} chuyến</span>
                  <button type="button" onClick={() => openGenerate(s)} className={PRIMARY_BTN}>
                    <Sparkles className="w-4 h-4" />
                    <span>Sinh chuyến</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* Thêm / sửa chuyến */}
      <Modal
        isOpen={tripModal !== null}
        onClose={() => setTripModal(null)}
        title={tripModal === 'ADD' ? 'Thêm chuyến xe' : `Sửa chuyến TRIP-${selectedTrip?.tripId ?? ''}`}
        maxWidth="2xl"
      >
        <form onSubmit={submitTrip} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 sm:col-span-3 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Tuyến đường *</span>
              <select
                value={tripForm.routeId}
                onChange={(e) => setTripForm({ ...tripForm, routeId: e.target.value, busId: '', driverId: '', conductorId: '' })}
                disabled={tripModal === 'EDIT'}
                className={INPUT}
              >
                {routes.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {routeLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Ngày khởi hành *</span>
              <input type="date" required value={tripForm.date} onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })} className={INPUT} />
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Giờ xuất bến *</span>
              <input type="time" required value={tripForm.time} onChange={(e) => setTripForm({ ...tripForm, time: e.target.value })} className={INPUT} />
            </label>
            {tripModal === 'EDIT' && (
              <label className="space-y-1 block">
                <span className="font-bold text-slate-700 dark:text-slate-300">Trạng thái</span>
                <select value={tripForm.status} onChange={(e) => setTripForm({ ...tripForm, status: e.target.value as TripStatusName })} className={INPUT}>
                  {(Object.keys(TRIP_STATUS_LABEL) as TripStatusName[]).map((s) => (
                    <option key={s} value={s}>
                      {TRIP_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Xe buýt</span>
              <select value={tripForm.busId} onChange={(e) => setTripForm({ ...tripForm, busId: e.target.value })} className={INPUT}>
                <option value="">-- Chưa gán xe --</option>
                {busOptions.map((b) => (
                  <option key={b.id} value={String(b.id)} disabled={!b.isAvailable && String(b.id) !== tripForm.busId}>
                    {b.plateNumber} ({b.capacity} chỗ){b.isAvailable ? '' : ` - ${b.unavailableReason ?? 'Không rảnh'}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Tài xế *</span>
              <select value={tripForm.driverId} onChange={(e) => setTripForm({ ...tripForm, driverId: e.target.value })} className={INPUT}>
                <option value="">-- Chọn tài xế --</option>
                {driverOptions.map((d) => (
                  <option key={d.accountId} value={String(d.accountId)} disabled={!d.isAvailable && String(d.accountId) !== tripForm.driverId}>
                    {d.fullName}
                    {d.phone ? ` (${d.phone})` : ''}
                    {d.isAvailable ? '' : ` - ${d.unavailableReason ?? 'Không rảnh'}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Phụ xe</span>
              <select value={tripForm.conductorId} onChange={(e) => setTripForm({ ...tripForm, conductorId: e.target.value })} className={INPUT}>
                <option value="">-- Không có phụ xe --</option>
                {conductorOptions.map((c) => (
                  <option key={c.accountId} value={String(c.accountId)} disabled={!c.isAvailable && String(c.accountId) !== tripForm.conductorId}>
                    {c.fullName}
                    {c.phone ? ` (${c.phone})` : ''}
                    {c.isAvailable ? '' : ` - ${c.unavailableReason ?? 'Không rảnh'}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTripModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
              {isSubmitting ? 'Đang lưu...' : tripModal === 'ADD' ? 'Tạo chuyến' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Chi tiết chuyến */}
      <Modal isOpen={detailTrip !== null} onClose={() => setDetailTrip(null)} title={`Chuyến TRIP-${detailTrip?.tripId ?? ''}`} maxWidth="lg">
        {detailTrip && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {[
              ['Tuyến', `${detailTrip.routeCode} - ${detailTrip.routeName}`],
              ['Điểm đi', detailTrip.routeStartPoint ?? ''],
              ['Điểm đến', detailTrip.routeEndPoint ?? ''],
              ['Khởi hành', `${detailTrip.startTime} ngày ${detailTrip.date}`],
              ['Đến dự kiến', detailTrip.endTime ?? ''],
              ['Xe', detailTrip.busPlate || 'Chưa gán'],
              ['Tài xế', detailTrip.driverName || 'Chưa gán'],
              ['Phụ xe', detailTrip.assistantName || 'Không có'],
              ['Vé đặt', `${detailTrip.bookedTicketsCount ?? 0}${detailTrip.bus ? `/${detailTrip.bus.capacity}` : ''}`],
              ['Trễ', `${detailTrip.delayMinutes ?? 0} phút`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-400 font-semibold">{k}</dt>
                <dd className="text-slate-900 dark:text-white font-medium">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="text-slate-400 font-semibold">Trạng thái</dt>
              <dd>
                <StatusPill status={toTripStatusName(detailTrip.status)} />
              </dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteTripTarget !== null}
        onClose={() => setDeleteTripTarget(null)}
        onConfirm={() => void confirmDeleteTrip()}
        title="Xóa chuyến xe"
        message={`Bạn có chắc chắn muốn xóa chuyến TRIP-${deleteTripTarget?.tripId} (${deleteTripTarget?.routeCode} lúc ${deleteTripTarget?.startTime} ngày ${deleteTripTarget?.date})? Chuyến đã có vé đặt sẽ không xóa được.`}
        isDangerous
      />

      {/* Thêm / sửa lịch trình */}
      <Modal
        isOpen={scheduleModal !== null}
        onClose={() => setScheduleModal(null)}
        title={scheduleModal === 'ADD' ? 'Thêm lịch trình định kỳ' : 'Sửa lịch trình'}
        maxWidth="lg"
      >
        <form onSubmit={submitSchedule} className="space-y-4 text-xs">
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Tuyến đường *</span>
            <select value={scheduleForm.routeId} onChange={(e) => setScheduleForm({ ...scheduleForm, routeId: e.target.value })} className={INPUT}>
              {routes.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {routeLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Chuyến đầu *</span>
              <input type="time" required value={scheduleForm.firstDeparture} onChange={(e) => setScheduleForm({ ...scheduleForm, firstDeparture: e.target.value })} className={INPUT} />
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Chuyến cuối *</span>
              <input type="time" required value={scheduleForm.lastDeparture} onChange={(e) => setScheduleForm({ ...scheduleForm, lastDeparture: e.target.value })} className={INPUT} />
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Tần suất (phút) *</span>
              <input type="number" min={5} max={240} required value={scheduleForm.frequencyMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, frequencyMinutes: Number(e.target.value) })} className={INPUT} />
            </label>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-300">Ngày chạy trong tuần *</span>
            <div className="flex gap-1.5">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => toggleDay(d.code)}
                  className={`px-3 py-1.5 rounded font-bold ${
                    scheduleForm.days.includes(d.code) ? 'bg-institutional-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setScheduleModal(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu lịch trình'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteScheduleTarget !== null}
        onClose={() => setDeleteScheduleTarget(null)}
        onConfirm={() => void confirmDeleteSchedule()}
        title="Xóa lịch trình"
        message={`Bạn có chắc chắn muốn xóa lịch trình tuyến ${deleteScheduleTarget?.routeCode} (${deleteScheduleTarget?.firstDeparture} - ${deleteScheduleTarget?.lastDeparture})?`}
        isDangerous
      />

      {/* Sinh chuyến */}
      <Modal
        isOpen={generateTarget !== null}
        onClose={() => setGenerateTarget(null)}
        title={`Sinh chuyến - tuyến ${generateTarget?.routeCode ?? ''}`}
        subtitle="Chuyến đã tồn tại (cùng lịch trình, cùng giờ) được bỏ qua nên sinh lại không bị trùng."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Từ ngày</span>
              <input type="date" value={genFrom} onChange={(e) => { setGenFrom(e.target.value); setGenPreview(null); }} className={INPUT} />
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Đến ngày (tối đa 31 ngày)</span>
              <input type="date" value={genTo} onChange={(e) => { setGenTo(e.target.value); setGenPreview(null); }} className={INPUT} />
            </label>
          </div>
          {genPreview && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              Sẽ tạo <b>{genPreview.created}</b> chuyến, bỏ qua <b>{genPreview.skipped}</b> chuyến đã có
              {genPreview.skippedPast > 0 ? ` và ${genPreview.skippedPast} mốc giờ đã trôi qua` : ''}.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setGenerateTarget(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
              Đóng
            </button>
            <button type="button" onClick={() => void runPreview()} disabled={isSubmitting} className="px-4 py-2 rounded-lg border border-institutional-600 text-institutional-600 dark:text-sky-400 font-bold">
              Xem trước
            </button>
            <button type="button" onClick={() => void confirmGenerate()} disabled={isSubmitting || (genPreview !== null && genPreview.created === 0)} className={PRIMARY_BTN}>
              {isSubmitting ? 'Đang xử lý...' : 'Sinh chuyến'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
