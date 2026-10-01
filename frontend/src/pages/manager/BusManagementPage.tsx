import React, { useState, useMemo } from 'react';
import {
  Bus,
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  LayoutGrid,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Compass,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { BusVehicle, BusStatus } from '../../types';

export const BusManagementPage: React.FC = () => {
  const { buses, routes, addBus, updateBus, deleteBus } = useData();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedBus, setSelectedBus] = useState<BusVehicle | null>(null);

  // Form State
  const [formPlate, setFormPlate] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formRouteId, setFormRouteId] = useState('');
  const [formRows, setFormRows] = useState(6);
  const [formCols, setFormCols] = useState(4);
  const [formStatus, setFormStatus] = useState<BusStatus>('ACTIVE');
  const [formManufactureYear, setFormManufactureYear] = useState(2023);
  const [formLastInspection, setFormLastInspection] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Computed Capacity
  const calculatedCapacity = useMemo(() => {
    return Number(formRows) * Number(formCols);
  }, [formRows, formCols]);

  // Statistics
  const stats = useMemo(() => {
    const total = buses.length;
    const active = buses.filter((b) => b.status === 'ACTIVE').length;
    const maintenance = buses.filter((b) => b.status === 'MAINTENANCE').length;
    const inactive = buses.filter((b) => b.status === 'INACTIVE').length;
    const totalSeats = buses.reduce((acc, cur) => acc + (cur.capacity || 0), 0);
    return { total, active, maintenance, inactive, totalSeats };
  }, [buses]);

  // Filtered List
  const filteredBuses = useMemo(() => {
    return buses.filter((b) => {
      const route = routes.find((r) => r.id === b.routeId);
      const routeName = route ? `${route.code || route.routeCode} ${route.name}` : '';

      const matchesSearch =
        b.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const matchesRoute = routeFilter === 'ALL' || b.routeId === routeFilter;

      return matchesSearch && matchesStatus && matchesRoute;
    });
  }, [buses, routes, searchTerm, statusFilter, routeFilter]);

  // Reset & Open Add Modal
  const handleOpenAdd = () => {
    setFormPlate('51B-');
    setFormModel('Thaco City TB85S (Euro 5)');
    setFormRouteId(routes[0]?.id || 'RT-01');
    setFormRows(6);
    setFormCols(4);
    setFormStatus('ACTIVE');
    setFormManufactureYear(2023);
    setFormLastInspection(new Date().toISOString().split('T')[0]);
    setFormNotes('Xe đạt tiêu chuẩn khí thải Euro 5, điều hòa 2 dàn lạnh, wifi miễn phí.');
    setIsAddModalOpen(true);
  };

  // Submit Add
  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlate.trim() || formPlate.trim().length < 6) {
      error('Vui lòng nhập biển số xe hợp lệ (VD: 51B-184.22)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = addBus({
        plateNumber: formPlate.trim().toUpperCase(),
        model: formModel.trim() || 'Xe buýt tiêu chuẩn',
        routeId: formRouteId || undefined,
        rows: Number(formRows),
        cols: Number(formCols),
        capacity: calculatedCapacity,
        status: formStatus,
        manufactureYear: Number(formManufactureYear) || 2023,
        lastInspectionDate: formLastInspection,
        notes: formNotes.trim() || undefined,
      });

      if (res.success) {
        success(`Đã thêm thành công xe buýt [${res.bus?.plateNumber}] vào đội xe!`);
        setIsAddModalOpen(false);
      } else {
        error(res.message || 'Không thể thêm xe buýt');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (bus: BusVehicle) => {
    setSelectedBus(bus);
    setFormPlate(bus.plateNumber);
    setFormModel(bus.model);
    setFormRouteId(bus.routeId || '');
    setFormRows(bus.rows || 6);
    setFormCols(bus.cols || 4);
    setFormStatus(bus.status);
    setFormManufactureYear(bus.manufactureYear || 2023);
    setFormLastInspection(bus.lastInspectionDate || new Date().toISOString().split('T')[0]);
    setFormNotes(bus.notes || '');
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;
    if (!formPlate.trim() || formPlate.trim().length < 6) {
      error('Vui lòng nhập biển số xe hợp lệ (VD: 51B-184.22)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = updateBus(selectedBus.id, {
        plateNumber: formPlate.trim().toUpperCase(),
        model: formModel.trim(),
        routeId: formRouteId || undefined,
        rows: Number(formRows),
        cols: Number(formCols),
        capacity: calculatedCapacity,
        status: formStatus,
        manufactureYear: Number(formManufactureYear),
        lastInspectionDate: formLastInspection,
        notes: formNotes.trim() || undefined,
      });

      if (res.success) {
        success(`Đã cập nhật thông tin xe buýt [${formPlate.trim().toUpperCase()}] thành công!`);
        setIsEditModalOpen(false);
      } else {
        error(res.message || 'Không thể cập nhật xe buýt');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Detail / Seat Layout
  const handleOpenDetail = (bus: BusVehicle) => {
    setSelectedBus(bus);
    setIsDetailModalOpen(true);
  };

  // Open Delete
  const handleOpenDelete = (bus: BusVehicle) => {
    setSelectedBus(bus);
    setIsDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!selectedBus) return;
    const res = deleteBus(selectedBus.id);
    if (res.success) {
      success(`Đã xóa xe buýt [${selectedBus.plateNumber}] khỏi hệ thống`);
      setIsDeleteConfirmOpen(false);
    } else {
      error(res.message || 'Không thể xóa xe buýt');
    }
  };

  // Render Seat Grid Helper
  const renderSeatGrid = (rowsCount: number, colsCount: number) => {
    const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const rowsArray = Array.from({ length: rowsCount }, (_, i) => rowLetters[i] || `R${i + 1}`);

    return (
      <div className="bg-slate-100 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
        {/* Cockpit / Driver area */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-dashed border-slate-300 dark:border-slate-600">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-md text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            Vị trí Ghế lái xe
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-md text-xs font-semibold">
            <span>Cửa lên xuống xe 🚪</span>
          </div>
        </div>

        {/* Seat rows */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {rowsArray.map((rowName) => (
            <div key={rowName} className="flex items-center justify-center gap-3">
              <span className="w-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                {rowName}
              </span>

              {/* Left seats */}
              <div className="flex gap-2">
                {Array.from({ length: Math.ceil(colsCount / 2) }, (_, cIdx) => {
                  const seatNum = `${rowName}${cIdx + 1}`;
                  return (
                    <div
                      key={seatNum}
                      className="w-11 h-10 rounded-lg bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm"
                    >
                      <span>{seatNum}</span>
                    </div>
                  );
                })}
              </div>

              {/* Aisle */}
              <div className="w-8 flex justify-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 rotate-90 select-none">
                  LỐI ĐI
                </span>
              </div>

              {/* Right seats */}
              <div className="flex gap-2">
                {Array.from({ length: Math.floor(colsCount / 2) }, (_, cIdx) => {
                  const leftHalf = Math.ceil(colsCount / 2);
                  const seatNum = `${rowName}${leftHalf + cIdx + 1}`;
                  return (
                    <div
                      key={seatNum}
                      className="w-11 h-10 rounded-lg bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm"
                    >
                      <span>{seatNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
          Tổng cộng: <strong className="text-slate-800 dark:text-slate-100">{rowsCount * colsCount} chỗ ngồi</strong> ({rowsCount} hàng × {colsCount} cột)
        </div>
      </div>
    );
  };

  const getStatusBadge = (status: BusStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang hoạt động
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Đang bảo dưỡng
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Tạm ngưng
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Đội xe Buýt"
        subtitle="Quản lý thông tin phương tiện, sức chứa chỗ ngồi, trạng thái vận hành và cấu hình sơ đồ ghế theo hàng/cột"
        action={
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white rounded-lg shadow-sm text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm xe buýt mới</span>
          </button>
        }
      />


      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng đội xe</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total} xe</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang hoạt động</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active} xe</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Đang bảo dưỡng</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.maintenance} xe</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tạm ngưng</p>
            <p className="text-xl font-bold text-slate-600 dark:text-slate-300">{stats.inactive} xe</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng chỗ ngồi</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalSeats} ghế</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm biển số xe, dòng xe, tuyến..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="MAINTENANCE">Đang bảo dưỡng</option>
              <option value="INACTIVE">Tạm ngưng</option>
            </select>
          </div>

          {/* Route Filter */}
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-institutional-500"
          >
            <option value="ALL">Tất cả tuyến xe</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code || r.routeCode} - {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {filteredBuses.length === 0 ? (
          <EmptyState
            title="Không tìm thấy xe buýt nào"
            description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái xe."
            action={
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-1.5 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Thêm xe buýt mới
              </button>
            }
          />
        ) : (

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Mã / Biển số</th>
                  <th className="py-3 px-4">Dòng xe & Thông số</th>
                  <th className="py-3 px-4">Sức chứa & Lưới ghế</th>
                  <th className="py-3 px-4">Tuyến phân bổ</th>
                  <th className="py-3 px-4">Kiểm định & Năm SX</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredBuses.map((bus) => {
                  const assignedRoute = routes.find((r) => r.id === bus.routeId);
                  return (
                    <tr
                      key={bus.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {/* Plate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-institutional-50 dark:bg-institutional-900/40 text-institutional-600 dark:text-institutional-400 rounded-lg">
                            <Bus className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white font-mono text-base">
                              {bus.plateNumber}
                            </span>
                            <p className="text-xs text-slate-400 font-mono">{bus.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Model */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {bus.model}
                        </p>
                        {bus.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs">
                            {bus.notes}
                          </p>
                        )}
                      </td>

                      {/* Capacity & Layout */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded font-semibold text-xs">
                            {bus.capacity} chỗ
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ({bus.rows || 6} hàng × {bus.cols || 4} cột)
                          </span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4">
                        {assignedRoute ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-institutional-600 dark:text-institutional-400">
                              {assignedRoute.code || assignedRoute.routeCode}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                              - {assignedRoute.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa cố định tuyến</span>
                        )}
                      </td>

                      {/* Inspection */}
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          Đăng kiểm: <strong>{bus.lastInspectionDate || 'Chưa cập nhật'}</strong>
                        </p>
                        <p className="text-xs text-slate-400">Năm SX: {bus.manufactureYear || '2023'}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">{getStatusBadge(bus.status)}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(bus)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                            title="Xem sơ đồ ghế"
                          >
                            <LayoutGrid className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(bus)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                            title="Chỉnh sửa xe"
                          >
                            <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(bus)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                            title="Xóa xe"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD BUS MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Xe Buýt Mới & Cấu Hình Sơ Đồ Ghế"
        maxWidth="2xl"
      >

        <form onSubmit={handleConfirmAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Biển số xe buýt <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 51B-184.22"
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dòng xe / Model <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Thaco City TB85S"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tuyến phân bổ ưu tiên
              </label>
              <select
                value={formRouteId}
                onChange={(e) => setFormRouteId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="">-- Xe chạy lưu động / Không cố định --</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code || r.routeCode} - {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái xe
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as BusStatus)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="MAINTENANCE">Đang bảo dưỡng</option>
                <option value="INACTIVE">Tạm ngưng hoạt động</option>
              </select>
            </div>
          </div>

          {/* Seat Layout Configuration */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 dark:text-institutional-400 flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4" />
                Cấu hình sơ đồ ghế (Hàng × Cột)
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">
                Tổng sức chứa: {calculatedCapacity} ghế
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số hàng ghế (Rows)
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={formRows}
                  onChange={(e) => setFormRows(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số cột mỗi hàng (Cols)
                </label>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={formCols}
                  onChange={(e) => setFormCols(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="pt-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Xem trước sơ đồ mặt bằng ghế:
              </p>
              {renderSeatGrid(formRows, formCols)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Năm sản xuất
              </label>
              <input
                type="number"
                min={2000}
                max={2030}
                value={formManufactureYear}
                onChange={(e) => setFormManufactureYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hạn đăng kiểm gần nhất
              </label>
              <input
                type="date"
                value={formLastInspection}
                onChange={(e) => setFormLastInspection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú kỹ thuật / Trang bị kèm theo
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="VD: Cổng sạc USB tại hàng ghế, hệ thống camera AI, cảm biến áp suất lốp..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Thêm xe buýt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT BUS MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Chỉnh Sửa Xe Buýt [${selectedBus?.plateNumber}]`}
        maxWidth="2xl"
      >
        <form onSubmit={handleConfirmEdit} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Biển số xe buýt <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dòng xe / Model <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tuyến phân bổ ưu tiên
              </label>
              <select
                value={formRouteId}
                onChange={(e) => setFormRouteId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="">-- Xe chạy lưu động / Không cố định --</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code || r.routeCode} - {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái xe
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as BusStatus)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="MAINTENANCE">Đang bảo dưỡng</option>
                <option value="INACTIVE">Tạm ngưng hoạt động</option>
              </select>
            </div>
          </div>

          {/* Seat Layout Configuration */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-institutional-600 dark:text-institutional-400 flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4" />
                Cấu hình sơ đồ ghế (Hàng × Cột)
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded">
                Tổng sức chứa: {calculatedCapacity} ghế
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số hàng ghế (Rows)
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={formRows}
                  onChange={(e) => setFormRows(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Số cột mỗi hàng (Cols)
                </label>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={formCols}
                  onChange={(e) => setFormCols(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="pt-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Xem trước sơ đồ mặt bằng ghế:
              </p>
              {renderSeatGrid(formRows, formCols)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Năm sản xuất
              </label>
              <input
                type="number"
                min={2000}
                max={2030}
                value={formManufactureYear}
                onChange={(e) => setFormManufactureYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hạn đăng kiểm gần nhất
              </label>
              <input
                type="date"
                value={formLastInspection}
                onChange={(e) => setFormLastInspection(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú kỹ thuật / Trang bị kèm theo
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu cập nhật'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL / SEAT LAYOUT MODAL */}
      {selectedBus && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Sơ Đồ Ghế & Thông Số Xe [${selectedBus.plateNumber}]`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400">Dòng xe: </span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedBus.model}</strong>
              </div>
              <div>
                <span className="text-slate-400">Trạng thái: </span>
                {getStatusBadge(selectedBus.status)}
              </div>
              <div>
                <span className="text-slate-400">Sức chứa: </span>
                <strong className="text-indigo-600 dark:text-indigo-400">{selectedBus.capacity} chỗ ngồi</strong>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-institutional-600 dark:text-institutional-400" />
                Mặt bằng bố trí ghế ngồi thực tế:
              </p>
              {renderSeatGrid(selectedBus.rows || 6, selectedBus.cols || 4)}
            </div>

            {selectedBus.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                <strong>Ghi chú: </strong> {selectedBus.notes}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa Xe Buýt"
        message={`Bạn có chắc chắn muốn xóa xe buýt [${selectedBus?.plateNumber}] khỏi hệ thống? Dữ liệu này sẽ được ghi vào nhật ký kiểm toán.`}
        confirmLabel="Xác nhận xóa"
        isDangerous={true}
      />
    </div>
  );
};

