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
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { BusTrip, TripStatus } from '../../types';

export const ScheduleManagementPage: React.FC = () => {
  const { trips, routes, addTrip, updateTrip, deleteTrip } = useData();
  const { success, error } = useToast();
  const showSuccess = success;
  const showError = error;

  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

      return matchesSearch && matchesRoute && matchesStatus;
    });
  }, [trips, routes, searchTerm, routeFilter, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormRouteId(routes[0]?.id || 'r1');
    setFormBusPlate('51B-199.88');
    setFormDriverName('Nguyễn Văn Tuấn');
    setFormAssistantName('Lê Văn Hùng');
    setFormDepartureDate(new Date().toISOString().split('T')[0]);
    setFormDepartureTime('08:00');
    setFormEstimatedArrival('08:45');
    setFormPrice(15000);
    setFormTotalSeats(24);
    setFormStatus('SCHEDULED');
    setIsAddModalOpen(true);
  };

  // Submit Add
  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusPlate.trim() || !formDriverName.trim()) {
      showError('Vui lòng điền đầy đủ biển số xe và tên tài xế');
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
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Chuyến Xe Mới</span>
          </button>
        }
      />

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
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã chuyến, biển số xe, tên tài xế, tuyến đường..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center gap-2">
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
                <input
                  type="text"
                  value={formDriverName}
                  onChange={(e) => setFormDriverName(e.target.value)}
                  placeholder="Họ và tên lái xe"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nhân viên phụ xe / soát vé:
                </label>
                <input
                  type="text"
                  value={formAssistantName}
                  onChange={(e) => setFormAssistantName(e.target.value)}
                  placeholder="Họ và tên nhân viên phục vụ"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                />
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

      {/* DELETE CONFIRM DIALOG */}
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
    </div>
  );
};
