import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  Wrench,
  Bus,
  MapPin,
  User,
  Phone,
  FileText,
  ShieldAlert,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { BusIncident, IncidentType, IncidentSeverity, IncidentStatus } from '../../types';

export const IncidentPage: React.FC = () => {
  const { incidents, routes, reportIncident, processIncident } = useData();
  const { currentUser, role } = useAuth();
  const { success, error } = useToast();
  const showSuccess = success;
  const showError = error;

  const isManagerOrAdmin = role === 'MANAGER' || role === 'ADMIN';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState<BusIncident | null>(null);

  // New Incident Form State
  const [newBusPlate, setNewBusPlate] = useState('');
  const [newRouteId, setNewRouteId] = useState('');
  const [newType, setNewType] = useState<IncidentType>('MECHANICAL');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('MEDIUM');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Process Incident State
  const [processStatus, setProcessStatus] = useState<IncidentStatus>('RESOLVED');
  const [processNotes, setProcessNotes] = useState('');
  const [isSubmittingProcess, setIsSubmittingProcess] = useState(false);

  const getIncidentCode = (inc: BusIncident) => inc.incidentCode || inc.id;
  const getIncidentType = (inc: BusIncident) => inc.incidentType || inc.type || 'MECHANICAL';
  const getIncidentStatus = (inc: BusIncident) => inc.status;
  const getReporterPhone = (inc: BusIncident) => inc.reportedPhone || inc.reporterPhone || '0901234567';
  const getReportedTime = (inc: BusIncident) => inc.reportedTime || inc.createdAt || 'Hôm nay';
  const getRouteName = (routeId: string) => {
    const r = routes.find((item) => item.id === routeId);
    return r ? `${r.code || r.routeCode} - ${r.name}` : routeId;
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const code = getIncidentCode(inc).toLowerCase();
      const plate = inc.busPlate.toLowerCase();
      const routeName = (inc.routeName || getRouteName(inc.routeId)).toLowerCase();
      const reporter = inc.reportedBy.toLowerCase();
      const desc = inc.description.toLowerCase();

      const matchesSearch =
        code.includes(searchTerm.toLowerCase()) ||
        plate.includes(searchTerm.toLowerCase()) ||
        routeName.includes(searchTerm.toLowerCase()) ||
        reporter.includes(searchTerm.toLowerCase()) ||
        desc.includes(searchTerm.toLowerCase());

      const incType = getIncidentType(inc);
      const incStatus = getIncidentStatus(inc);

      const matchesType = typeFilter === 'ALL' || incType === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || incStatus === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [incidents, routes, searchTerm, typeFilter, statusFilter]);

  const handleOpenCreateModal = () => {
    setNewBusPlate('');
    setNewRouteId(routes[0]?.id || '');
    setNewType('MECHANICAL');
    setNewSeverity('MEDIUM');
    setNewLocation('');
    setNewDescription('');
    setIsCreateModalOpen(true);
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusPlate.trim()) {
      showError('Vui lòng nhập biển số xe buýt gặp sự cố');
      return;
    }
    if (!newLocation.trim()) {
      showError('Vui lòng nhập vị trí xảy ra sự cố');
      return;
    }
    if (!newDescription.trim()) {
      showError('Vui lòng mô tả chi tiết sự cố');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = reportIncident({
        busPlate: newBusPlate.trim().toUpperCase(),
        routeId: newRouteId || routes[0]?.id || 'RT-01',
        incidentType: newType,
        location: newLocation.trim(),
        description: newDescription.trim(),
        reportedBy: currentUser?.fullName || 'Hành khách báo cáo',
        reportedPhone: currentUser?.phone || '0901234567',
        severity: newSeverity,
      });

      if (res.success) {
        showSuccess('Báo cáo sự cố đã được gửi khẩn cấp tới Ban Điều Hành!');
        setIsCreateModalOpen(false);
      }
    } catch {
      showError('Không thể gửi báo cáo sự cố lúc này');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenDetail = (incident: BusIncident) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  };

  const handleOpenProcess = (incident: BusIncident) => {
    setSelectedIncident(incident);
    const currStat = getIncidentStatus(incident);
    setProcessStatus(currStat === 'NEW' || currStat === 'REPORTED' ? 'PROCESSING' : currStat);
    setProcessNotes(incident.resolutionNote || incident.resolutionNotes || '');
    setIsProcessModalOpen(true);
  };

  const handleConfirmProcess = async () => {
    if (!selectedIncident) return;

    setIsSubmittingProcess(true);
    try {
      const res = processIncident(selectedIncident.id, processStatus, processNotes);
      if (res.success) {
        showSuccess(`Cập nhật xử lý sự cố ${getIncidentCode(selectedIncident)} thành công!`);
        setIsProcessModalOpen(false);
      }
    } catch {
      showError('Không thể cập nhật sự cố lúc này');
    } finally {
      setIsSubmittingProcess(false);
    }
  };

  const renderTypeBadge = (type: IncidentType) => {
    switch (type) {
      case 'MECHANICAL':
      case 'ENGINE_BREAKDOWN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            Hỏng Động Cơ
          </span>
        );
      case 'PUNCTURE':
      case 'FLAT_TIRE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Thủng Lốp
          </span>
        );
      case 'COLLISION':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800">
            Va Chạm Giao Thông
          </span>
        );
      case 'AC_FAILURE':
      case 'AC_BROKEN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            Hỏng Điều Hòa
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300">
            Sự Cố Khác
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo Cáo & Xử Lý Sự Cố Xe Buýt"
        subtitle="Ghi nhận khẩn cấp các tình huống hỏng hóc, va chạm, sự cố kỹ thuật trên tuyến và điều phối đội cứu hộ kỹ thuật"
        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Vận hành kỹ thuật' },
          { label: 'Sự cố xe' },
        ]}
        action={
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Báo Cáo Sự Cố Khẩn Cấp</span>
          </button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Tổng sự cố tiếp nhận</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {incidents.length} vụ việc
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Mới báo cáo (Chờ xử lý)</div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
            {incidents.filter((i) => i.status === 'NEW' || i.status === 'REPORTED').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đang xử lý / Cứu hộ</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {incidents.filter((i) => i.status === 'PROCESSING' || i.status === 'IN_PROGRESS').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đã khắc phục hoàn tất</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {incidents.filter((i) => i.status === 'RESOLVED').length}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã sự cố, biển số, tuyến, người báo cáo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả loại sự cố</option>
              <option value="MECHANICAL">Hỏng động cơ (Cơ khí)</option>
              <option value="PUNCTURE">Thủng lốp</option>
              <option value="COLLISION">Va chạm</option>
              <option value="AC_FAILURE">Hỏng điều hòa</option>
              <option value="OTHER">Khác</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Mới báo cáo</option>
              <option value="PROCESSING">Đang xử lý</option>
              <option value="RESOLVED">Đã giải quyết</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incident Table */}
      {filteredIncidents.length === 0 ? (
        <EmptyState
          title="Không có sự cố nào"
          description="Hiện tại không có báo cáo sự cố nào phù hợp với bộ lọc tìm kiếm."
          icon={<CheckCircle className="w-12 h-12 text-emerald-500" />}
          action={
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors"
            >
              + Báo cáo sự cố ngay
            </button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã sự cố</th>
                  <th className="py-3 px-4">Biển số / Tuyến</th>
                  <th className="py-3 px-4">Loại sự cố</th>
                  <th className="py-3 px-4">Vị trí xảy ra</th>
                  <th className="py-3 px-4">Người báo</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIncidents.map((inc) => {
                  const code = getIncidentCode(inc);
                  const type = getIncidentType(inc);
                  const status = getIncidentStatus(inc);
                  const phone = getReporterPhone(inc);
                  const routeName = inc.routeName || getRouteName(inc.routeId);

                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {code}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {inc.busPlate}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {routeName}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderTypeBadge(type)}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300" title={inc.location || 'Tại trạm'}>
                        {inc.location || 'Trên tuyến'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {inc.reportedBy}
                        </div>
                        <div className="text-[11px] text-slate-400">{phone}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="incidentStatus" value={status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(inc)}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-institutional-700 dark:text-sky-300 font-semibold rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                            title="Xem chi tiết sự cố"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                          {isManagerOrAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenProcess(inc)}
                              className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold rounded text-xs hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                              title="Xử lý / Điều phối cứu hộ"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>Xử lý</span>
                            </button>
                          )}
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

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="BÁO CÁO SỰ CỐ XE BUÝT KHẨN CẤP"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-800 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Báo cáo này sẽ được chuyển ngay tới Trung tâm điều hành xe buýt để điều động lực lượng kỹ thuật và cứu hộ kịp thời.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Biển số xe buýt gặp sự cố: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: 51B-123.45"
                value={newBusPlate}
                onChange={(e) => setNewBusPlate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] font-mono text-slate-900 dark:text-white uppercase focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Tuyến xe đang chạy:
              </label>
              <select
                value={newRouteId}
                onChange={(e) => setNewRouteId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code || r.routeCode} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Loại sự cố:
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as IncidentType)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
              >
                <option value="MECHANICAL">Hỏng máy / Chết máy</option>
                <option value="PUNCTURE">Thủng lốp / Nổ lốp</option>
                <option value="COLLISION">Va chạm giao thông</option>
                <option value="AC_FAILURE">Hỏng điều hòa nhiệt độ</option>
                <option value="OTHER">Sự cố kỹ thuật khác</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Mức độ nghiêm trọng:
              </label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-bold"
              >
                <option value="LOW">Thấp (Xe vẫn di chuyển chậm được)</option>
                <option value="MEDIUM">Trung bình (Cần kiểm tra tại bến)</option>
                <option value="HIGH">Cao (Xe dừng tại chỗ)</option>
                <option value="CRITICAL">Khẩn cấp (Cần xe cứu hộ ngay)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Vị trí chính xác xảy ra sự cố: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Gần ngã tư Hàng Khay - Tràng Tiền"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Mô tả hiện trạng và yêu cầu hỗ trợ: <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả cụ thể âm thanh, khói, biểu hiện hư hỏng, tình hình hành khách trên xe..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              disabled={isSubmittingCreate}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmittingCreate}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmittingCreate ? 'Đang gửi...' : 'Gửi báo cáo ngay'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      {selectedIncident && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`CHI TIẾT SỰ CỐ XE — ${getIncidentCode(selectedIncident)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 dark:bg-[#0c162d] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-400">Biển số phương tiện</div>
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {selectedIncident.busPlate}
                </div>
              </div>
              <div className="text-right">
                <Badge variant="incidentStatus" value={getIncidentStatus(selectedIncident)} />
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Tuyến xe:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedIncident.routeName || getRouteName(selectedIncident.routeId)}
                </span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Loại sự cố:</span>
                <div>{renderTypeBadge(getIncidentType(selectedIncident))}</div>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-0.5">Vị trí xảy ra sự cố:</span>
                <div className="font-medium text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{selectedIncident.location || 'Tại trạm'}</span>
                </div>
              </div>
              <div className="py-2">
                <span className="text-slate-500 block mb-0.5">Chi tiết phản ánh:</span>
                <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                  {selectedIncident.description}
                </p>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Người báo cáo:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedIncident.reportedBy} ({getReporterPhone(selectedIncident)})
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Thời gian báo:</span>
                <span className="text-slate-900 dark:text-white">
                  {getReportedTime(selectedIncident)}
                </span>
              </div>
              {(selectedIncident.resolutionNote || selectedIncident.resolutionNotes) && (
                <div className="py-2">
                  <span className="text-slate-500 block mb-0.5">Ghi chú khắc phục / Cứu hộ:</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-900">
                    {selectedIncident.resolutionNote || selectedIncident.resolutionNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {isManagerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenProcess(selectedIncident);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Xử lý sự cố này
                </button>
              )}
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

      {/* PROCESS MODAL */}
      {selectedIncident && (
        <Modal
          isOpen={isProcessModalOpen}
          onClose={() => setIsProcessModalOpen(false)}
          title={`ĐIỀU PHỐI & XỬ LÝ SỰ CỐ — ${getIncidentCode(selectedIncident)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-[#0c162d] rounded-lg border border-slate-200 dark:border-slate-800">
              <div>Xe: <strong className="font-mono">{selectedIncident.busPlate}</strong></div>
              <div>Vị trí: <strong>{selectedIncident.location || 'Tại trạm'}</strong></div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Cập nhật trạng thái xử lý: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProcessStatus('PROCESSING')}
                  className={`p-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                    processStatus === 'PROCESSING' || processStatus === 'IN_PROGRESS'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Đang Cứu Hộ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProcessStatus('RESOLVED')}
                  className={`p-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all ${
                    processStatus === 'RESOLVED'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Đã Khắc Phục</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Biện pháp kỹ thuật & Ghi chú điều phối:
              </label>
              <textarea
                rows={3}
                placeholder="VD: Đã cử xe kỹ thuật số 02 thay lốp dự phòng tại hiện trường, xe tiếp tục hành trình..."
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsProcessModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 transition-colors"
                disabled={isSubmittingProcess}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmProcess}
                disabled={isSubmittingProcess}
                className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmittingProcess ? 'Đang lưu...' : 'Xác nhận xử lý'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
