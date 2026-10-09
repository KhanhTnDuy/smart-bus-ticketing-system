import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Bus,
  User,
  Users,
  AlertCircle,
  CheckCircle,
  MapPin,
  ChevronRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAccountManagement } from '../../hooks/useAccountManagement';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { BusTrip, TripStatus, TimetableTemplate } from '../../types';

export const ScheduleManagementPage: React.FC = () => {
  const {
    trips,
    routes,
    buses,
    addTrip,
    addTripsBatch,
    updateTrip,
    deleteTrip,
    timetables,
    addTimetable,
    updateTimetable,
    deleteTimetable,
  } = useData();
  const { success, error } = useToast();
  const showSuccess = success;
  const showError = error;

  // Tài xế và phụ xe lấy từ tài khoản thật trong CSDL. Cả hai đều mang vai trò DRIVER ở frontend,
  // phụ xe phân biệt qua phòng ban "Đội Soát vé" (xem toUser trong api/accountManagement.ts).
  const { users } = useAccountManagement();
  const driverAccounts = useMemo(
    () => users.filter((u) => u.role === 'DRIVER' && u.status === 'ACTIVE' && u.department !== 'Đội Soát vé'),
    [users],
  );
  const conductorAccounts = useMemo(
    () => users.filter((u) => u.role === 'DRIVER' && u.status === 'ACTIVE' && u.department === 'Đội Soát vé'),
    [users],
  );

  const [activeTab, setActiveTab] = useState<'TRIPS' | 'TIMETABLES'>('TRIPS');


  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const [selectedTrip, setSelectedTrip] = useState<BusTrip | null>(null);

  // Form State for Add / Edit
  const [formRouteId, setFormRouteId] = useState('');
  const [formBusPlate, setFormBusPlate] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formAssistantName, setFormAssistantName] = useState('');
  const [formDepartureDate, setFormDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDepartureTime, setFormDepartureTime] = useState('07:30');
  const [formEstimatedArrival, setFormEstimatedArrival] = useState('08:15');
  const [formPrice, setFormPrice] = useState(15000);
  const [formTotalSeats, setFormTotalSeats] = useState(24);
  const [formStatus, setFormStatus] = useState<TripStatus>('SCHEDULED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Timetable Generator (Thiết lập thời gian biểu tự động sinh chuyến)
  const [genRouteId, setGenRouteId] = useState(routes[0]?.id || 'r1');
  const [genDate, setGenDate] = useState(new Date().toISOString().split('T')[0]);
  const [genFirstDeparture, setGenFirstDeparture] = useState('05:30');
  const [genLastDeparture, setGenLastDeparture] = useState('21:00');
  const [genFrequencyMinutes, setGenFrequencyMinutes] = useState(20);
  const [genDurationMinutes, setGenDurationMinutes] = useState(45);
  const [genPrice, setGenPrice] = useState(15000);
  const [genTotalSeats, setGenTotalSeats] = useState(24);
  const [isGenerating, setIsGenerating] = useState(false);

  // Timetable Templates Modals & Form State (Requirement 1)
  const [isAddTimetableOpen, setIsAddTimetableOpen] = useState(false);
  const [isEditTimetableOpen, setIsEditTimetableOpen] = useState(false);
  const [isDeleteTimetableOpen, setIsDeleteTimetableOpen] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<TimetableTemplate | null>(null);

  const [ttRouteId, setTtRouteId] = useState(routes[0]?.id || 'RT-01');
  const [ttName, setTtName] = useState('');
  const [ttFirstDeparture, setTtFirstDeparture] = useState('05:30');
  const [ttLastDeparture, setTtLastDeparture] = useState('21:00');
  const [ttFrequencyMinutes, setTtFrequencyMinutes] = useState(20);
  const [ttDurationMinutes, setTtDurationMinutes] = useState(45);
  const [ttDaysOfWeek, setTtDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [ttPrice, setTtPrice] = useState(7000);
  const [ttTotalSeats, setTtTotalSeats] = useState(24);
  const [ttIsActive, setTtIsActive] = useState(true);
  const [ttNotes, setTtNotes] = useState('');

  const toggleDayOfWeek = (day: number) => {
    setTtDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleOpenAddTimetable = () => {
    const route = routes[0];
    setTtRouteId(route?.id || 'RT-01');
    setTtName(route ? `Thời gian biểu ${route.code || route.routeCode}` : 'Thời gian biểu mẫu');
    setTtFirstDeparture('05:30');
    setTtLastDeparture('21:00');
    setTtFrequencyMinutes(20);
    setTtDurationMinutes(45);
    setTtDaysOfWeek([1, 2, 3, 4, 5, 6, 0]);
    setTtPrice(7000);
    setTtTotalSeats(24);
    setTtIsActive(true);
    setTtNotes('Lịch áp dụng định kỳ theo tuần');
    setIsAddTimetableOpen(true);
  };

  const handleConfirmAddTimetable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttName.trim()) {
      showError('Vui lòng nhập tên thời gian biểu');
      return;
    }
    if (ttDaysOfWeek.length === 0) {
      showError('Vui lòng chọn ít nhất một ngày trong tuần áp dụng');
      return;
    }

    const res = addTimetable({
      routeId: ttRouteId,
      name: ttName.trim(),
      firstDeparture: ttFirstDeparture,
      lastDeparture: ttLastDeparture,
      frequencyMinutes: Number(ttFrequencyMinutes),
      durationMinutes: Number(ttDurationMinutes),
      daysOfWeek: ttDaysOfWeek,
      price: Number(ttPrice),
      totalSeats: Number(ttTotalSeats),
      isActive: ttIsActive,
      notes: ttNotes.trim() || undefined,
    });

    if (res.success) {
      showSuccess(`Đã tạo thành công thời gian biểu mẫu [${res.timetable?.name}]!`);
      setIsAddTimetableOpen(false);
    } else {
      showError(res.message || 'Không thể tạo thời gian biểu');
    }
  };

  const handleOpenEditTimetable = (tt: TimetableTemplate) => {
    setSelectedTimetable(tt);
    setTtRouteId(tt.routeId);
    setTtName(tt.name);
    setTtFirstDeparture(tt.firstDeparture);
    setTtLastDeparture(tt.lastDeparture);
    setTtFrequencyMinutes(tt.frequencyMinutes);
    setTtDurationMinutes(tt.durationMinutes);
    setTtDaysOfWeek(tt.daysOfWeek);
    setTtPrice(tt.price);
    setTtTotalSeats(tt.totalSeats);
    setTtIsActive(tt.isActive);
    setTtNotes(tt.notes || '');
    setIsEditTimetableOpen(true);
  };

  const handleConfirmEditTimetable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimetable) return;
    if (!ttName.trim()) {
      showError('Vui lòng nhập tên thời gian biểu');
      return;
    }

    const res = updateTimetable(selectedTimetable.id, {
      routeId: ttRouteId,
      name: ttName.trim(),
      firstDeparture: ttFirstDeparture,
      lastDeparture: ttLastDeparture,
      frequencyMinutes: Number(ttFrequencyMinutes),
      durationMinutes: Number(ttDurationMinutes),
      daysOfWeek: ttDaysOfWeek,
      price: Number(ttPrice),
      totalSeats: Number(ttTotalSeats),
      isActive: ttIsActive,
      notes: ttNotes.trim() || undefined,
    });

    if (res.success) {
      showSuccess(`Đã cập nhật thời gian biểu mẫu [${selectedTimetable.id}] thành công!`);
      setIsEditTimetableOpen(false);
    } else {
      showError(res.message || 'Không thể cập nhật thời gian biểu');
    }
  };

  const handleOpenDeleteTimetable = (tt: TimetableTemplate) => {
    setSelectedTimetable(tt);
    setIsDeleteTimetableOpen(true);
  };

  const handleConfirmDeleteTimetable = () => {
    if (!selectedTimetable) return;
    const res = deleteTimetable(selectedTimetable.id);
    if (res.success) {
      showSuccess(`Đã xóa thời gian biểu [${selectedTimetable.name}]`);
      setIsDeleteTimetableOpen(false);
      setSelectedTimetable(null);
    }
  };

  const handleGenerateFromTimetable = (tt: TimetableTemplate) => {
    setGenRouteId(tt.routeId);
    setGenFirstDeparture(tt.firstDeparture);
    setGenLastDeparture(tt.lastDeparture);
    setGenFrequencyMinutes(tt.frequencyMinutes);
    setGenDurationMinutes(tt.durationMinutes);
    setGenPrice(tt.price);
    setGenTotalSeats(tt.totalSeats);
    setGenDate(new Date().toISOString().split('T')[0]);
    setIsGenerateModalOpen(true);
  };

  // Preview generated trips based on timetable parameters
  const previewGeneratedTrips = useMemo(() => {
    if (!genFirstDeparture || !genLastDeparture || genFrequencyMinutes <= 0) return [];

    const [startH, startM] = genFirstDeparture.split(':').map(Number);
    const [endH, endM] = genLastDeparture.split(':').map(Number);
    const startTotal = (startH || 0) * 60 + (startM || 0);
    const endTotal = (endH || 0) * 60 + (endM || 0);
    if (startTotal >= endTotal) return [];

    // Lấy danh sách biển số xe thật từ đội xe (ưu tiên xe tuyến hiện tại hoặc xe ACTIVE)
    const activeBuses = buses.filter((b) => b.status === 'ACTIVE');
    const routeBuses = activeBuses.filter((b) => b.routeId === genRouteId);
    const candidateBuses = routeBuses.length > 0 ? routeBuses : activeBuses.length > 0 ? activeBuses : buses;
    const fleetPlates = candidateBuses.map((b) => b.plateNumber);
    const platesToUse = fleetPlates.length > 0 ? fleetPlates : ['51B-184.22'];

    // Chỉ dùng tài xế thật trong CSDL; chưa có tài xế nào thì không sinh chuyến để khỏi gán tên bịa.
    const driversToUse = driverAccounts.map((d) => d.fullName);
    if (driversToUse.length === 0) return [];
    const conductorsToUse = conductorAccounts.map((c) => c.fullName);

    const items: Array<Omit<BusTrip, 'id' | 'bookedSeats'>> = [];
    let cur = startTotal;
    let idx = 0;
    while (cur <= endTotal) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      const depTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const arrTotal = cur + genDurationMinutes;
      const arrH = Math.floor((arrTotal % (24 * 60)) / 60);
      const arrM = arrTotal % 60;
      const arrTime = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;

      const assignedPlate = platesToUse[idx % platesToUse.length];
      const matchedBus = candidateBuses.find((b) => b.plateNumber === assignedPlate);

      items.push({
        routeId: genRouteId,
        busPlate: assignedPlate,
        driverName: driversToUse[idx % driversToUse.length],
        assistantName: conductorsToUse.length > 0 ? conductorsToUse[idx % conductorsToUse.length] : undefined,
        departureDate: genDate,
        departureTime: depTime,
        estimatedArrivalTime: arrTime,
        price: Number(genPrice),
        totalSeats: matchedBus?.capacity || Number(genTotalSeats),
        status: 'SCHEDULED' as TripStatus,
      });

      cur += genFrequencyMinutes;
      idx++;
    }
    return items;
  }, [
    genRouteId,
    genDate,
    genFirstDeparture,
    genLastDeparture,
    genFrequencyMinutes,
    genDurationMinutes,
    genPrice,
    genTotalSeats,
    buses,
    driverAccounts,
    conductorAccounts,
  ]);

  // Handle open generator modal
  const handleOpenGenerateModal = () => {
    const route = routes.find((r) => r.id === genRouteId) || routes[0];
    if (route) {
      setGenRouteId(route.id);
      setGenFrequencyMinutes(route.frequencyMinutes || 20);
      setGenDurationMinutes(route.durationMinutes || 45);
    }
    setGenDate(new Date().toISOString().split('T')[0]);
    setIsGenerateModalOpen(true);
  };

  // Handle confirm generate trips
  const handleConfirmGenerate = () => {
    if (!previewGeneratedTrips.length) {
      showError('Thời gian biểu không hợp lệ (Giờ kết thúc phải sau giờ bắt đầu)');
      return;
    }

    setIsGenerating(true);
    try {
      const res = addTripsBatch(previewGeneratedTrips);
      if (res.success) {
        showSuccess(res.message || `Đã sinh tự động thành công ${res.count} chuyến xe theo thời gian biểu!`);
        setRouteFilter(genRouteId);
        setDateFilter(genDate);
        setActiveTab('TRIPS');
        setIsGenerateModalOpen(false);
      } else {
        showError(res.message || 'Không thể sinh chuyến xe lúc này (có thể do tất cả chuyến đã bị trùng)');
      }
    } catch {
      showError('Lỗi trong quá trình sinh chuyến xe');
    } finally {
      setIsGenerating(false);
    }

  };

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const route = routes.find((r) => r.id === t.routeId);
      const routeName = route ? `${route.code || route.routeCode} ${route.name}` : '';

      const matchesSearch =
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.busPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRoute = routeFilter === 'ALL' || t.routeId === routeFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesDate = dateFilter === 'ALL' || t.departureDate === dateFilter;

      return matchesSearch && matchesRoute && matchesStatus && matchesDate;
    });
  }, [trips, routes, searchTerm, routeFilter, statusFilter, dateFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const defaultBus = buses.find((b) => b.status === 'ACTIVE') || buses[0];
    setFormRouteId(routes[0]?.id || 'r1');
    setFormBusPlate(defaultBus ? defaultBus.plateNumber : '51B-199.88');
    setFormDriverName(driverAccounts[0]?.fullName ?? '');
    setFormAssistantName('');
    setFormDepartureDate(new Date().toISOString().split('T')[0]);
    setFormDepartureTime('08:00');
    setFormEstimatedArrival('08:45');
    setFormPrice(15000);
    setFormTotalSeats(defaultBus ? defaultBus.capacity : 24);
    setFormStatus('SCHEDULED');
    setIsAddModalOpen(true);
  };

  // Tài xế và phụ xe phải là tài khoản thật có đúng vai trò, không cho gõ tên tự do.
  const validateStaff = (): string | null => {
    const driver = formDriverName.trim();
    if (!driverAccounts.some((d) => d.fullName === driver)) {
      return `'${driver}' không phải tài khoản có vai trò Tài xế. Vui lòng chọn tài xế trong danh sách.`;
    }
    const assistant = formAssistantName.trim();
    if (assistant && !conductorAccounts.some((c) => c.fullName === assistant)) {
      return `'${assistant}' không phải tài khoản có vai trò Phụ xe. Vui lòng chọn trong danh sách.`;
    }
    return null;
  };

  // Submit Add
  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusPlate.trim() || !formDriverName.trim()) {
      showError('Vui lòng điền đầy đủ biển số xe và chọn tài xế');
      return;
    }
    const staffError = validateStaff();
    if (staffError) {
      showError(staffError);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = addTrip({
        routeId: formRouteId,
        busPlate: formBusPlate.trim().toUpperCase(),
        driverName: formDriverName.trim(),
        assistantName: formAssistantName.trim() || undefined,
        departureDate: formDepartureDate,
        departureTime: formDepartureTime,
        estimatedArrivalTime: formEstimatedArrival,
        price: Number(formPrice),
        totalSeats: Number(formTotalSeats),
        status: formStatus,
      });

      if (res.success) {
        showSuccess(`Đã tạo thành công chuyến xe mới [${res.data?.id}]!`);
        setIsAddModalOpen(false);
      }
    } catch {
      showError('Không thể tạo chuyến xe vào lúc này');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (trip: BusTrip) => {
    setSelectedTrip(trip);
    setFormRouteId(trip.routeId);
    setFormBusPlate(trip.busPlate);
    setFormDriverName(trip.driverName);
    setFormAssistantName(trip.assistantName || '');
    setFormDepartureDate(trip.departureDate);
    setFormDepartureTime(trip.departureTime);
    setFormEstimatedArrival(trip.estimatedArrivalTime);
    setFormPrice(trip.price);
    setFormTotalSeats(trip.totalSeats);
    setFormStatus(trip.status);
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;
    const staffError = validateStaff();
    if (staffError) {
      showError(staffError);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = updateTrip(selectedTrip.id, {
        routeId: formRouteId,
        busPlate: formBusPlate.trim().toUpperCase(),
        driverName: formDriverName.trim(),
        assistantName: formAssistantName.trim() || undefined,
        departureDate: formDepartureDate,
        departureTime: formDepartureTime,
        estimatedArrivalTime: formEstimatedArrival,
        price: Number(formPrice),
        totalSeats: Number(formTotalSeats),
        status: formStatus,
      });

      if (res.success) {
        showSuccess(`Đã cập nhật chuyến xe [${selectedTrip.id}] thành công!`);
        setIsEditModalOpen(false);
      }
    } catch {
      showError('Không thể cập nhật chuyến xe');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (trip: BusTrip) => {
    setSelectedTrip(trip);
    setIsDetailModalOpen(true);
  };

  // Open Delete Confirm
  const handleOpenDelete = (trip: BusTrip) => {
    setSelectedTrip(trip);
    setIsDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!selectedTrip) return;

    if (selectedTrip.bookedSeats.length > 0) {
      showError(`Không thể xóa chuyến [${selectedTrip.id}] vì đã có ${selectedTrip.bookedSeats.length} hành khách đặt vé.`);
      setIsDeleteConfirmOpen(false);
      return;
    }

    const res = deleteTrip(selectedTrip.id);
    if (res.success) {
      showSuccess(`Đã xóa chuyến xe [${selectedTrip.id}] thành công.`);
      setIsDeleteConfirmOpen(false);
      setSelectedTrip(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản Lý Lịch Trình & Chuyến Xe"
        subtitle="Lập kế hoạch xuất bến, phân công khung giờ chạy, quản lý số ghế khả dụng và theo dõi tiến độ chuyến xe"
        icon={<Calendar className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành & Quản lý' },
          { label: 'Lịch trình chuyến xe' },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGenerateModal}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Thiết Lập Thời Gian Biểu & Sinh Chuyến</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Chuyến Đơn Lẻ</span>
            </button>
          </div>
        }
      />

      {/* Navigation Tabs (Sprint 2 - Quản lý lịch trình & thời gian biểu) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('TRIPS')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'TRIPS'
              ? 'border-institutional-600 text-institutional-600 dark:text-sky-400 bg-institutional-50/50 dark:bg-institutional-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Danh Sách Chuyến Xe ({trips.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TIMETABLES')}
          className={`flex items-center gap-2 py-3 px-5 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'TIMETABLES'
              ? 'border-institutional-600 text-institutional-600 dark:text-sky-400 bg-institutional-50/50 dark:bg-institutional-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Thời Gian Biểu Định Kỳ Theo Tuyến ({timetables.length})</span>
        </button>
      </div>

      {activeTab === 'TRIPS' && (
        <div className="space-y-6">
          {/* KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Tổng chuyến lập lịch</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {trips.length} chuyến
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Chờ xuất bến (Scheduled)</div>
          <div className="text-xl font-bold text-institutional-600 dark:text-sky-300 mt-1">
            {trips.filter((t) => t.status === 'SCHEDULED' || t.status === 'BOARDING').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đang trên hành trình</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {trips.filter((t) => t.status === 'IN_TRANSIT').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Hoàn thành trong ngày</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {trips.filter((t) => t.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã chuyến, biển số xe, tên tài xế, tuyến đường..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả tuyến đường</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code || r.routeCode} - {r.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SCHEDULED">Đã lên lịch</option>
              <option value="BOARDING">Đón khách</option>
              <option value="IN_TRANSIT">Đang chạy</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy chuyến</option>
            </select>

            {/* Date filter for checking generated trips */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Ngày:</span>
              <input
                type="date"
                value={dateFilter === 'ALL' ? '' : dateFilter}
                onChange={(e) => setDateFilter(e.target.value || 'ALL')}
                className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                title="Lọc theo ngày xuất bến để xem danh sách chuyến đã sinh"
              />
              {dateFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setDateFilter('ALL')}
                  className="px-2 py-1 text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded font-semibold"
                >
                  Tất cả ngày
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      {filteredTrips.length === 0 ? (
        <EmptyState
          title="Không tìm thấy chuyến xe nào"
          description="Chưa có chuyến xe nào được ghi nhận phù hợp với điều kiện tìm kiếm."
          icon={<Calendar className="w-12 h-12 text-slate-300" />}
          action={
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold rounded-lg text-xs transition-colors"
            >
              + Thêm chuyến xe
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã chuyến</th>
                  <th className="py-3 px-4">Tuyến đường</th>
                  <th className="py-3 px-4">Xe / Tài xế</th>
                  <th className="py-3 px-4">Khởi hành</th>
                  <th className="py-3 px-4">Đến dự kiến</th>
                  <th className="py-3 px-4">Tỷ lệ đặt chỗ</th>
                  <th className="py-3 px-4">Giá cước</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTrips.map((trip) => {
                  const route = routes.find((r) => r.id === trip.routeId);
                  const bookedCount = trip.bookedSeats.length;
                  const occupancyPercent = Math.round((bookedCount / trip.totalSeats) * 100);

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300 whitespace-nowrap">
                        {trip.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {route?.code || route?.routeCode || 'TUYẾN'}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                          {route?.name || 'Tuyến đô thị'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {trip.busPlate}
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 text-[11px]">
                          TX: {trip.driverName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {trip.departureTime}
                        </div>
                        <div className="text-[11px] text-slate-400">{trip.departureDate}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {trip.estimatedArrivalTime}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {bookedCount}/{trip.totalSeats}
                          </span>
                          <span className="text-[10px] text-slate-400">({occupancyPercent}%)</span>
                        </div>
                        <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              occupancyPercent > 80
                                ? 'bg-red-500'
                                : occupancyPercent > 40
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {trip.price.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="tripStatus" value={trip.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(trip)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                            title="Xem chi tiết và sơ đồ ghế"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(trip)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400"
                            title="Chỉnh sửa chuyến xe"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(trip)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400"
                            title="Xóa chuyến xe"
                          >
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

      {/* ==============================================================
          TAB 2: THỜI GIAN BIỂU ĐỊNH KỲ THEO TUYẾN (Requirement 1)
      ============================================================== */}
      {activeTab === 'TIMETABLES' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-institutional-600 dark:text-sky-400" />
                Thời Gian Biểu Định Kỳ Theo Tuyến (Timetable Templates)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Lập thời gian biểu mẫu (giờ đầu, giờ cuối, tần suất, các ngày chạy trong tuần T2–CN) và sinh chuyến tự động chống trùng.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddTimetable}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thời gian biểu mẫu mới</span>
            </button>
          </div>

          {/* Timetable Templates List */}
          {timetables.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57]">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Chưa có thời gian biểu mẫu nào.
              </p>
              <button
                type="button"
                onClick={handleOpenAddTimetable}
                className="mt-3 px-4 py-2 bg-institutional-600 text-white rounded-lg text-xs font-semibold"
              >
                Tạo thời gian biểu đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timetables.map((tt) => {
                const route = routes.find((r) => r.id === tt.routeId);
                const dayLabels = [
                  { d: 1, label: 'T2' },
                  { d: 2, label: 'T3' },
                  { d: 3, label: 'T4' },
                  { d: 4, label: 'T5' },
                  { d: 5, label: 'T6' },
                  { d: 6, label: 'T7' },
                  { d: 0, label: 'CN' },
                ];

                return (
                  <div
                    key={tt.id}
                    className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4 hover:border-institutional-400 dark:hover:border-sky-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-institutional-100 dark:bg-sky-950/60 text-institutional-700 dark:text-sky-300 border border-institutional-300 dark:border-sky-800">
                            {route?.code || route?.routeCode || tt.routeId}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{tt.id}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5">
                          {tt.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {route?.name || 'Tuyến buýt đô thị'}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          tt.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {tt.isActive ? 'Đang kích hoạt' : 'Tạm ngưng'}
                      </span>
                    </div>

                    {/* Operational Details */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-[#0c162d] rounded-lg text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Khung giờ xuất bến:</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                          {tt.firstDeparture} ➔ {tt.lastDeparture}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tần suất & Thời gian chạy:</span>
                        <strong className="text-institutional-600 dark:text-sky-300 text-xs">
                          {tt.frequencyMinutes} phút/chuyến ({tt.durationMinutes}p/lượt)
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Đơn giá vé cơ bản:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {tt.price.toLocaleString('vi-VN')} VNĐ
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Sức chứa chuyến:</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-xs">
                          {tt.totalSeats} chỗ ngồi
                        </strong>
                      </div>
                    </div>

                    {/* Operating Days of Week */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                        Ngày áp dụng trong tuần:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {dayLabels.map(({ d, label }) => {
                          const isIncluded = tt.daysOfWeek.includes(d);
                          return (
                            <span
                              key={d}
                              className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${
                                isIncluded
                                  ? 'bg-institutional-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-40'
                              }`}
                              title={isIncluded ? `Có áp dụng ${label}` : `Không áp dụng ${label}`}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {tt.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {tt.notes}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleGenerateFromTimetable(tt)}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sinh Chuyến Từ Mẫu Này</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTimetable(tt)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400"
                          title="Chỉnh sửa thời gian biểu mẫu"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteTimetable(tt)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400"
                          title="Xóa thời gian biểu mẫu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT MODAL */}

      {(isAddModalOpen || isEditModalOpen) && (
        <Modal
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
          }}
          title={isAddModalOpen ? 'THÊM MỚI LỊCH CHUYẾN XE' : `CHỈNH SỬA CHUYẾN XE — ${selectedTrip?.id}`}
          maxWidth="xl"
        >
          <form
            onSubmit={isAddModalOpen ? handleConfirmAdd : handleConfirmEdit}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tuyến đường vận hành: <span className="text-red-500">*</span>
                </label>
                <select
                  value={formRouteId}
                  onChange={(e) => setFormRouteId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code || r.routeCode} - {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Biển số xe buýt: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formBusPlate}
                  onChange={(e) => setFormBusPlate(e.target.value)}
                  placeholder="VD: 51B-184.22"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] font-mono text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tài xế chính phụ trách: <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDriverName}
                  onChange={(e) => setFormDriverName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                >
                  <option value="">-- Chọn tài xế --</option>
                  {formDriverName && !driverAccounts.some((d) => d.fullName === formDriverName) && (
                    <option value={formDriverName} disabled>
                      {formDriverName} (không phải tài xế)
                    </option>
                  )}
                  {driverAccounts.map((d) => (
                    <option key={d.id} value={d.fullName}>
                      {d.fullName}
                      {d.phone ? ` (${d.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nhân viên phụ xe / soát vé:
                </label>
                <select
                  value={formAssistantName}
                  onChange={(e) => setFormAssistantName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="">-- Không có phụ xe --</option>
                  {formAssistantName && !conductorAccounts.some((c) => c.fullName === formAssistantName) && (
                    <option value={formAssistantName} disabled>
                      {formAssistantName} (không phải phụ xe)
                    </option>
                  )}
                  {conductorAccounts.map((c) => (
                    <option key={c.id} value={c.fullName}>
                      {c.fullName}
                      {c.phone ? ` (${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ngày khởi hành: <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formDepartureDate}
                  onChange={(e) => setFormDepartureDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giờ xuất bến: <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formDepartureTime}
                  onChange={(e) => setFormDepartureTime(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giờ đến dự kiến: <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formEstimatedArrival}
                  onChange={(e) => setFormEstimatedArrival(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giá cước vé (VNĐ): <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tổng số ghế xe:
                </label>
                <input
                  type="number"
                  min="10"
                  max="45"
                  value={formTotalSeats}
                  onChange={(e) => setFormTotalSeats(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Trạng thái chuyến:
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as TripStatus)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-semibold"
                >
                  <option value="SCHEDULED">Đã lên lịch</option>
                  <option value="BOARDING">Đón khách</option>
                  <option value="IN_TRANSIT">Đang chạy</option>
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="CANCELLED">Hủy chuyến</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 transition-colors"
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting
                  ? 'Đang lưu...'
                  : isAddModalOpen
                  ? 'Tạo chuyến xe ngay'
                  : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* TIMETABLE GENERATOR MODAL (Thiết lập thời gian biểu và sinh danh sách chuyến) */}
      {isGenerateModalOpen && (
        <Modal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          title="THIẾT LẬP THỜI GIAN BIỂU & SINH DANH SÁCH CHUYẾN XE"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  Cơ chế sinh lịch chuyến tự động theo thời gian biểu (Timetable Generator)
                </div>
                <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  Thiết lập giờ xuất bến đầu, giờ chuyến cuối và tần suất giãn cách phút. Hệ thống sẽ tự động tính toán các mốc giờ chạy, giờ đến dự kiến, luân chuyển biển số xe và tài xế để sinh hàng loạt chuyến xe cho ngày được chọn.
                </div>
              </div>
            </div>

            {/* Timetable Configuration Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-[#0c162d] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-1 md:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tuyến đường áp dụng thời gian biểu: <span className="text-red-500">*</span>
                </label>
                <select
                  value={genRouteId}
                  onChange={(e) => {
                    const rId = e.target.value;
                    setGenRouteId(rId);
                    const selectedRoute = routes.find((r) => r.id === rId);
                    if (selectedRoute) {
                      if (selectedRoute.frequencyMinutes) setGenFrequencyMinutes(selectedRoute.frequencyMinutes);
                      if (selectedRoute.durationMinutes) setGenDurationMinutes(selectedRoute.durationMinutes);
                    }
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code || r.routeCode} — {r.name} ({r.startPoint} ⇄ {r.endPoint})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ngày áp dụng sinh chuyến: <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={genDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setGenDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tần suất giãn cách (Phút/chuyến): <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="120"
                    step="5"
                    value={genFrequencyMinutes}
                    onChange={(e) => setGenFrequencyMinutes(Math.max(5, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <div className="flex gap-1">
                    {[10, 15, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setGenFrequencyMinutes(mins)}
                        className={`px-2 py-1 text-[10px] rounded font-bold border transition-colors ${
                          genFrequencyMinutes === mins
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {mins}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giờ chuyến đầu tiên (First departure): <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={genFirstDeparture}
                  onChange={(e) => setGenFirstDeparture(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giờ chuyến cuối cùng (Last departure): <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={genLastDeparture}
                  onChange={(e) => setGenLastDeparture(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Thời gian hành trình 1 lượt:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="15"
                    max="180"
                    step="5"
                    value={genDurationMinutes}
                    onChange={(e) => setGenDurationMinutes(Math.max(10, Number(e.target.value)))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-500 shrink-0 font-medium">phút</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giá cước vé / Chỗ ngồi:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="5000"
                    step="1000"
                    value={genPrice}
                    onChange={(e) => setGenPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    placeholder="VNĐ"
                  />
                  <input
                    type="number"
                    min="12"
                    max="45"
                    value={genTotalSeats}
                    onChange={(e) => setGenTotalSeats(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                    placeholder="Số ghế"
                  />
                </div>
              </div>
            </div>

            {/* PREVIEW GENERATED TRIPS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Danh sách chuyến xe dự kiến sinh:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {previewGeneratedTrips.length} chuyến xe
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {genFirstDeparture} → {genLastDeparture} (giãn cách {genFrequencyMinutes}p)
                </span>
              </div>

              {previewGeneratedTrips.length === 0 ? (
                <div className="p-6 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900">
                  Thời gian bắt đầu phải sớm hơn thời gian kết thúc để sinh chuyến xe.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c162d] divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {previewGeneratedTrips.map((pt, i) => (
                    <div
                      key={i}
                      className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px]">
                          #{i + 1}
                        </span>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {pt.departureTime} → {pt.estimatedArrivalTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {pt.busPlate}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          TX: {pt.driverName}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {pt.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 transition-colors"
                disabled={isGenerating}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerate}
                disabled={isGenerating || previewGeneratedTrips.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all shadow-md flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang sinh các chuyến...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Xác nhận sinh {previewGeneratedTrips.length} chuyến xe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DETAIL MODAL (With 24-seat layout inspection) */}
      {selectedTrip && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`CHI TIẾT CHUYẾN XE — ${selectedTrip.id}`}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Top Info */}
            <div className="bg-slate-50 dark:bg-[#0c162d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-400">Biển số & Lái xe</div>
                <div className="text-base font-black font-mono text-institutional-900 dark:text-white">
                  {selectedTrip.busPlate}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Lái xe: <strong>{selectedTrip.driverName}</strong>
                  {selectedTrip.assistantName && ` • Phụ xe: ${selectedTrip.assistantName}`}
                </div>
              </div>
              <div className="text-right">
                <Badge variant="tripStatus" value={selectedTrip.status} />
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedTrip.price.toLocaleString('vi-VN')} đ / vé
                </div>
              </div>
            </div>

            {/* Time & Route Info */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/40">
              <div>
                <span className="text-slate-400 block text-[10px]">Thời gian xuất bến:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedTrip.departureDate} ({selectedTrip.departureTime})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Thời gian đến dự kiến:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedTrip.estimatedArrivalTime}
                </span>
              </div>
            </div>

            {/* Visual 24-Seat Occupancy Layout */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Sơ đồ chỗ ngồi (Đã đặt {selectedTrip.bookedSeats.length} / {selectedTrip.totalSeats} ghế):
                </span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-700 border" />
                    Trống
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-red-500" />
                    Đã đặt
                  </span>
                </div>
              </div>

              {/* 24 Seats Grid */}
              <div className="grid grid-cols-6 gap-2 p-3 bg-slate-50 dark:bg-[#0c162d] rounded-xl border border-slate-200 dark:border-slate-800">
                {Array.from({ length: selectedTrip.totalSeats }, (_, i) => {
                  const seatCode = `A${String(i + 1).padStart(2, '0')}`;
                  const isBooked = selectedTrip.bookedSeats.includes(seatCode);

                  return (
                    <div
                      key={seatCode}
                      className={`p-2 rounded text-center font-bold text-[11px] border transition-all ${
                        isBooked
                          ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400'
                          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {seatCode}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM DIALOG FOR TRIP */}
      {selectedTrip && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title="XÓA LỊCH CHUYẾN XE"
          message={`Bạn có chắc chắn muốn xóa chuyến xe [${selectedTrip.id}] (Tuyến: ${selectedTrip.routeId}, Xe: ${selectedTrip.busPlate}) khỏi hệ thống vận hành?`}
          confirmLabel="Đồng ý xóa"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
        />
      )}

      {/* ADD / EDIT TIMETABLE MODAL (Requirement 1) */}
      {(isAddTimetableOpen || isEditTimetableOpen) && (
        <Modal
          isOpen={isAddTimetableOpen || isEditTimetableOpen}
          onClose={() => {
            setIsAddTimetableOpen(false);
            setIsEditTimetableOpen(false);
          }}
          title={
            isAddTimetableOpen
              ? 'TẠO THỜI GIAN BIỂU MẪU ĐỊNH KỲ THEO TUYẾN'
              : `CHỈNH SỬA THỜI GIAN BIỂU — ${selectedTimetable?.id}`
          }
          maxWidth="xl"
        >
          <form
            onSubmit={
              isAddTimetableOpen ? handleConfirmAddTimetable : handleConfirmEditTimetable
            }
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tuyến áp dụng: <span className="text-red-500">*</span>
                </label>
                <select
                  value={ttRouteId}
                  onChange={(e) => setTtRouteId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-semibold"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code || r.routeCode} - {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tên thời gian biểu: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ttName}
                  onChange={(e) => setTtName(e.target.value)}
                  placeholder="VD: Lịch ngày thường Tuyến 01"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giờ đầu: <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={ttFirstDeparture}
                  onChange={(e) => setTtFirstDeparture(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-mono font-bold text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giờ cuối: <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={ttLastDeparture}
                  onChange={(e) => setTtLastDeparture(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-mono font-bold text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tần suất (phút): <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  required
                  value={ttFrequencyMinutes}
                  onChange={(e) => setTtFrequencyMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-bold text-center"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Thời lượng (phút):
                </label>
                <input
                  type="number"
                  min={10}
                  max={240}
                  required
                  value={ttDurationMinutes}
                  onChange={(e) => setTtDurationMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-bold text-center"
                />
              </div>
            </div>

            {/* Interactive Day of Week Selector */}
            <div className="p-3 bg-slate-50 dark:bg-[#0c162d] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Các ngày áp dụng trong tuần: <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { d: 1, label: 'Thứ 2' },
                  { d: 2, label: 'Thứ 3' },
                  { d: 3, label: 'Thứ 4' },
                  { d: 4, label: 'Thứ 5' },
                  { d: 5, label: 'Thứ 6' },
                  { d: 6, label: 'Thứ 7' },
                  { d: 0, label: 'Chủ Nhật' },
                ].map(({ d, label }) => {
                  const selected = ttDaysOfWeek.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDayOfWeek(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selected
                          ? 'bg-institutional-600 text-white shadow-sm ring-2 ring-institutional-400'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Giá vé cơ bản (VNĐ):
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={ttPrice}
                  onChange={(e) => setTtPrice(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Sức chứa chỗ ngồi:
                </label>
                <input
                  type="number"
                  min={10}
                  max={80}
                  value={ttTotalSeats}
                  onChange={(e) => setTtTotalSeats(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Ghi chú thời gian biểu:
              </label>
              <textarea
                rows={2}
                value={ttNotes}
                onChange={(e) => setTtNotes(e.target.value)}
                placeholder="VD: Tần suất chạy áp dụng cho giờ cao điểm..."
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ttActiveCheck"
                checked={ttIsActive}
                onChange={(e) => setTtIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-institutional-600 focus:ring-institutional-500"
              />
              <label htmlFor="ttActiveCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kích hoạt áp dụng thời gian biểu này
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsAddTimetableOpen(false);
                  setIsEditTimetableOpen(false);
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold rounded-lg transition-colors shadow-sm"
              >
                {isAddTimetableOpen ? 'Lưu thời gian biểu mẫu' : 'Cập nhật thời gian biểu'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE TIMETABLE CONFIRM DIALOG */}
      {selectedTimetable && (
        <ConfirmDialog
          isOpen={isDeleteTimetableOpen}
          onClose={() => setIsDeleteTimetableOpen(false)}
          onConfirm={handleConfirmDeleteTimetable}
          title="XÓA THỜI GIAN BIỂU MẪU"
          message={`Bạn có chắc chắn muốn xóa thời gian biểu [${selectedTimetable.name}] khỏi hệ thống?`}
          confirmLabel="Đồng ý xóa"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
        />
      )}
    </div>
  );
};

