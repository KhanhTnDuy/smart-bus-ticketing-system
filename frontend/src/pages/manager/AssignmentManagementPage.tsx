import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit2,
  Trash2,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAssignmentManagement } from '../../hooks/useAssignmentManagement';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { BusAssignment, ShiftType, AssignmentStatus } from '../../types';

export const AssignmentManagementPage: React.FC = () => {
  const {
    assignments,
    loading: isLoading,
    reload,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  } = useAssignmentManagement();
  const { routes, users, buses, checkAssignmentConflict } = useData();
  const { success, error } = useToast();
  const showSuccess = success;
  const showError = error;

  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState<BusAssignment | null>(null);

  // Form State
  const [formRouteId, setFormRouteId] = useState('');
  const [formBusPlate, setFormBusPlate] = useState('');
  const [formDriverId, setFormDriverId] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formAssistantId, setFormAssistantId] = useState('');
  const [formAssistantName, setFormAssistantName] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formShift, setFormShift] = useState<ShiftType>('CA_SANG');
  const [formShiftHours, setFormShiftHours] = useState('05:30 — 13:30');
  const [formStatus, setFormStatus] = useState<AssignmentStatus>('ASSIGNED');
  const [formNotes, setFormNotes] = useState('');
  const [formConflictWarning, setFormConflictWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available drivers from user list
  const driverUsers = useMemo(() => {
    return users.filter((u) => u.role === 'DRIVER');
  }, [users]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const route = routes.find((r) => r.id === a.routeId || r.code === a.routeId || r.routeCode === a.routeId);
      const routeStr = route ? `${route.code || route.routeCode} ${route.name}` : a.routeId;

      const matchesSearch =
        a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.busPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.assistantName && a.assistantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        routeStr.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesShift = shiftFilter === 'ALL' || a.shift === shiftFilter;
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;

      return matchesSearch && matchesShift && matchesStatus;
    });
  }, [assignments, routes, searchTerm, shiftFilter, statusFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormConflictWarning(null);
    const defaultDriver = driverUsers[0];
    const defaultBus = buses.find((b) => b.status === 'ACTIVE') || buses[0];
    setFormRouteId(routes[0]?.id || 'r1');
    setFormBusPlate(defaultBus ? defaultBus.plateNumber : '51B-201.55');
    setFormDriverId(defaultDriver?.id || 'u3');
    setFormDriverName(defaultDriver?.fullName || 'Nguyễn Văn Tuấn');
    setFormAssistantId('u_as_1');
    setFormAssistantName('Lê Hoàng Nam');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormShift('CA_SANG');
    setFormShiftHours('05:30 — 13:30');
    setFormStatus('ASSIGNED');
    setFormNotes('Phân công ca chạy theo kế hoạch tuần');
    setIsAddModalOpen(true);
  };

  // Conflict Detection Checker (Requirement 7) - Sử dụng hàm kiểm tra thống nhất từ DataContext
  const conflictWarning = useMemo(() => {
    if (!isAddModalOpen && !isEditModalOpen) return null;
    return checkAssignmentConflict(
      {
        busPlate: formBusPlate,
        driverName: formDriverName,
        driverId: formDriverId,
        date: formDate,
        shift: formShift,
      },
      isEditModalOpen && selectedAssignment ? selectedAssignment.id : undefined
    );
  }, [
    isAddModalOpen,
    isEditModalOpen,
    selectedAssignment,
    formBusPlate,
    formDriverName,
    formDriverId,
    formDate,
    formShift,
    checkAssignmentConflict,
  ]);

  // Submit Add
  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusPlate.trim() || !formDriverName.trim()) {
      showError('Vui lòng nhập biển số xe và tên tài xế');
      return;
    }

    setFormConflictWarning(null);
    if (conflictWarning && conflictWarning.hasConflict) {
      showError(conflictWarning.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addAssignment({
        routeId: formRouteId,
        busPlate: formBusPlate.trim().toUpperCase(),
        driverId: formDriverId || 'u_drv_new',
        driverName: formDriverName.trim(),
        assistantId: formAssistantId || undefined,
        assistantName: formAssistantName.trim() || undefined,
        date: formDate,
        shift: formShift,
        shiftHours: formShiftHours,
        status: formStatus,
        notes: formNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccess(`Phân công mới [${res.assignment?.id}] đã được lưu thành công!`);
        setIsAddModalOpen(false);
      } else if (res.conflict) {
        setFormConflictWarning(res.message || 'Phát hiện trùng lịch phân công phương tiện hoặc nhân sự!');
        showError(res.message || 'Trùng lịch điều xe hoặc tài xế!');
      } else {
        showError(res.message || 'Không thể tạo phân công');
      }
    } catch {
      showError('Không thể tạo phân công vào lúc này');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Open Edit Modal
  const handleOpenEdit = (asn: BusAssignment) => {
    setFormConflictWarning(null);
    setSelectedAssignment(asn);
    setFormRouteId(asn.routeId);
    setFormBusPlate(asn.busPlate);
    setFormDriverId(asn.driverId);
    setFormDriverName(asn.driverName);
    setFormAssistantId(asn.assistantId || '');
    setFormAssistantName(asn.assistantName || '');
    setFormDate(asn.date);
    setFormShift(asn.shift);
    setFormShiftHours(asn.shiftHours);
    setFormStatus(asn.status);
    setFormNotes(asn.notes || '');
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    setFormConflictWarning(null);
    if (conflictWarning && conflictWarning.hasConflict) {
      showError(conflictWarning.message);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await updateAssignment(selectedAssignment.id, {
        routeId: formRouteId,
        busPlate: formBusPlate.trim().toUpperCase(),
        driverId: formDriverId,
        driverName: formDriverName.trim(),
        assistantId: formAssistantId || undefined,
        assistantName: formAssistantName.trim() || undefined,
        date: formDate,
        shift: formShift,
        shiftHours: formShiftHours,
        status: formStatus,
        notes: formNotes.trim() || undefined,
      });

      if (res.success) {
        showSuccess(`Đã cập nhật phân công [${selectedAssignment.id}] thành công!`);
        setIsEditModalOpen(false);
      } else if (res.conflict) {
        setFormConflictWarning(res.message || 'Phát hiện trùng lịch phân công phương tiện hoặc nhân sự!');
        showError(res.message || 'Trùng lịch điều xe hoặc tài xế!');
      } else {
        showError(res.message || 'Không thể cập nhật phân công');
      }
    } catch {
      showError('Không thể cập nhật phân công');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Open Detail
  const handleOpenDetail = (asn: BusAssignment) => {
    setSelectedAssignment(asn);
    setIsDetailModalOpen(true);
  };

  // Open Delete Confirm
  const handleOpenDelete = (asn: BusAssignment) => {
    setSelectedAssignment(asn);
    setIsDeleteConfirmOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedAssignment) return;

    try {
      const res = await deleteAssignment(selectedAssignment.id);
      if (res.success) {
        showSuccess(`Đã xóa phân công ca trực [${selectedAssignment.id}] thành công.`);
        setIsDeleteConfirmOpen(false);
        setSelectedAssignment(null);
      } else {
        showError(res.message || 'Không thể xóa phân công ca trực');
      }
    } catch {
      showError('Không thể xóa phân công ca trực');
    }
  };

  const getShiftBadge = (shift: ShiftType) => {
    switch (shift) {
      case 'CA_SANG':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
            Ca Sáng (05:30 - 13:30)
          </span>
        );
      case 'CA_CHIEU':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
            Ca Chiều (13:30 - 21:30)
          </span>
        );
      case 'CA_TOI':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300">
            Ca Tối (18:00 - 23:00)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
            Toàn thời gian
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Phân Công Tài Xế & Phụ Xe"
        subtitle="Điều phối kíp lái, nhân viên soát vé, phương tiện vận hành theo tuyến và ca trực hàng ngày"
        icon={<UserCheck className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành & Quản lý' },
          { label: 'Phân công nhân sự' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              disabled={isLoading}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131e3a] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              title="Làm mới dữ liệu từ máy chủ"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Phân Công Ca Trực Mới</span>
            </button>
          </div>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Tổng ca phân công</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {assignments.length} ca trực
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đã giao ca (Assigned)</div>
          <div className="text-xl font-bold text-institutional-600 dark:text-sky-300 mt-1">
            {assignments.filter((a) => a.status === 'ASSIGNED').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đang trong ca làm việc</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {assignments.filter((a) => a.status === 'IN_PROGRESS').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Hoàn thành ca</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {assignments.filter((a) => a.status === 'COMPLETED').length}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã phân công, lái xe, phụ xe, biển số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả ca trực</option>
              <option value="CA_SANG">Ca Sáng</option>
              <option value="CA_CHIEU">Ca Chiều</option>
              <option value="CA_TOI">Ca Tối</option>
              <option value="TOAN_THOI_GIAN">Toàn thời gian</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ASSIGNED">Đã phân công</option>
              <option value="IN_PROGRESS">Đang chạy ca</option>
              <option value="COMPLETED">Đã kết thúc</option>
              <option value="CANCELLED">Hủy phân công</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignment Table */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          title="Không tìm thấy lịch phân công nào"
          description="Không có bản ghi phân công ca trực nào phù hợp với điều kiện tìm kiếm."
          icon={<UserCheck className="w-12 h-12 text-slate-300" />}
          action={
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold rounded-lg text-xs transition-colors"
            >
              + Thêm phân công
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã phân công</th>
                  <th className="py-3 px-4">Phương tiện / Tuyến</th>
                  <th className="py-3 px-4">Tài xế chính</th>
                  <th className="py-3 px-4">Phụ xe / Soát vé</th>
                  <th className="py-3 px-4">Ngày trực</th>
                  <th className="py-3 px-4">Ca trực / Khung giờ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAssignments.map((asn) => {
                  const route = routes.find((r) => r.id === asn.routeId);
                  const routeDisplay = route ? `${route.code || route.routeCode} - ${route.name}` : asn.routeId;

                  return (
                    <tr
                      key={asn.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300 whitespace-nowrap">
                        {asn.id}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {asn.busPlate}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {routeDisplay}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {asn.driverName}
                        </div>
                        <div className="text-[10px] text-slate-400">ID: {asn.driverId}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {asn.assistantName || 'Không có phụ xe'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium">
                        {asn.date}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>{getShiftBadge(asn.shift)}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {asn.shiftHours}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="assignmentStatus" value={asn.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(asn)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                            title="Xem chi tiết phân công"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(asn)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400"
                            title="Chỉnh sửa phân công"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(asn)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400"
                            title="Xóa phân công"
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
          title={isAddModalOpen ? 'PHÂN CÔNG CA TRỰC MỚI' : `CHỈNH SỬA PHÂN CÔNG — ${selectedAssignment?.id}`}
          maxWidth="xl"
        >
          <form
            onSubmit={isAddModalOpen ? handleConfirmAdd : handleConfirmEdit}
            className="space-y-4 text-xs"
          >
            {formConflictWarning && (
              <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-red-800 dark:text-red-200">
                    Phát hiện xung đột trùng lịch!
                  </div>
                  <div className="mt-0.5 leading-relaxed text-red-700 dark:text-red-300">
                    {formConflictWarning}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Tuyến đường phân công: <span className="text-red-500">*</span>
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
                  Biển số xe buýt vận hành: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formBusPlate}
                  onChange={(e) => setFormBusPlate(e.target.value)}
                  placeholder="VD: 51B-201.55"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] font-mono text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Chọn tài xế chính: <span className="text-red-500">*</span>
                </label>
                <select
                  value={formDriverId}
                  onChange={(e) => {
                    const drv = driverUsers.find((d) => d.id === e.target.value);
                    setFormDriverId(e.target.value);
                    if (drv) setFormDriverName(drv.fullName);
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-medium"
                >
                  {driverUsers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Nhân viên phụ xe / soát vé:
                </label>
                <input
                  type="text"
                  value={formAssistantName}
                  onChange={(e) => setFormAssistantName(e.target.value)}
                  placeholder="Tên nhân viên phụ xe"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ngày làm việc: <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ca làm việc:
                </label>
                <select
                  value={formShift}
                  onChange={(e) => {
                    const sh = e.target.value as ShiftType;
                    setFormShift(sh);
                    if (sh === 'CA_SANG') setFormShiftHours('05:30 — 13:30');
                    else if (sh === 'CA_CHIEU') setFormShiftHours('13:30 — 21:30');
                    else if (sh === 'CA_TOI') setFormShiftHours('18:00 — 23:00');
                    else setFormShiftHours('05:30 — 21:30');
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-medium"
                >
                  <option value="CA_SANG">Ca Sáng</option>
                  <option value="CA_CHIEU">Ca Chiều</option>
                  <option value="CA_TOI">Ca Tối</option>
                  <option value="TOAN_THOI_GIAN">Toàn thời gian</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Khung giờ chạy:
                </label>
                <input
                  type="text"
                  value={formShiftHours}
                  onChange={(e) => setFormShiftHours(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Trạng thái phân công:
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as AssignmentStatus)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-semibold"
                >
                  <option value="ASSIGNED">Đã phân công</option>
                  <option value="IN_PROGRESS">Đang chạy ca</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="CANCELLED">Hủy phân công</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ghi chú điều động:
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú thêm về xăng dầu, bàn giao..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                />
              </div>
            </div>

            {/* Conflict Warning Alert Banner */}
            {conflictWarning && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="block font-semibold">Cảnh báo xung đột trùng lịch xe / nhân sự:</strong>
                  <span>{conflictWarning.message}</span>
                  <span className="block text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                    Quy tắc hệ thống: Một xe buýt hoặc tài xế không thể phục vụ 2 ca chạy chồng chéo thời gian trong cùng một ngày. Lệnh phân công này sẽ bị chặn lưu.
                  </span>
                </div>
              </div>
            )}

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
                  ? 'Tạo phân công ngay'
                  : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAIL MODAL */}
      {selectedAssignment && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`CHI TIẾT PHÂN CÔNG — ${selectedAssignment.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-[#0c162d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-400">Phương tiện điều động</div>
                <div className="text-lg font-black font-mono text-institutional-900 dark:text-white">
                  {selectedAssignment.busPlate}
                </div>
              </div>
              <div className="text-right">
                <Badge variant="assignmentStatus" value={selectedAssignment.status} />
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Mã phân công:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedAssignment.id}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Tài xế chính:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedAssignment.driverName}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Nhân viên phụ xe:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {selectedAssignment.assistantName || 'Không bố trí phụ xe'}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Ngày làm việc:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedAssignment.date}
                </span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Ca làm việc:</span>
                <div>{getShiftBadge(selectedAssignment.shift)}</div>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Khung giờ chạy:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {selectedAssignment.shiftHours}
                </span>
              </div>
              {selectedAssignment.notes && (
                <div className="py-2">
                  <span className="text-slate-500 block mb-0.5">Ghi chú điều hành:</span>
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                    {selectedAssignment.notes}
                  </div>
                </div>
              )}
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
      {selectedAssignment && (
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title="XÓA LỆNH PHÂN CÔNG"
          message={`Bạn có chắc chắn muốn xóa phân công ca trực [${selectedAssignment.id}] của lái xe ${selectedAssignment.driverName} (Xe: ${selectedAssignment.busPlate})?`}
          confirmLabel="Đồng ý xóa"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
        />
      )}
    </div>
  );
};
