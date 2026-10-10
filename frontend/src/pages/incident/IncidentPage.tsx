import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, Plus, Eye, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useTripOptions } from '../../hooks/useTripOptions';
import {
  INCIDENT_TYPE_LABEL,
  IncidentDto,
  IncidentStatusCode,
  IncidentTypeCode,
  createIncident,
  listIncidents,
  resolveIncident,
  utcToLocal,
} from '../../api/operations';

const INPUT =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';
const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const PRIMARY_BTN =
  'px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-60';

const fmtDateTime = (iso: string) => {
  const d = utcToLocal(iso);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })} ${d.toLocaleDateString('vi-VN')}`;
};

const StatusPill: React.FC<{ status: IncidentStatusCode }> = ({ status }) =>
  status === IncidentStatusCode.Resolved ? (
    <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
      Đã xử lý
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
      Đang mở
    </span>
  );

export const IncidentPage: React.FC = () => {
  const { role } = useAuth();
  const { success, error: showError } = useToast();
  const isManagement = role === 'MANAGER' || role === 'ADMIN';
  const isPassenger = role === 'PASSENGER';

  const [incidents, setIncidents] = useState<IncidentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { options: tripOptions, error: tripError } = useTripOptions(role);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<IncidentDto | null>(null);
  const [resolveTarget, setResolveTarget] = useState<IncidentDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tripId, setTripId] = useState('');
  const [type, setType] = useState<IncidentTypeCode>(IncidentTypeCode.Breakdown);
  const [delay, setDelay] = useState(0);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIncidents(await listIncidents());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách sự cố.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return incidents.filter((i) => {
      const matchSearch =
        !q ||
        String(i.id).includes(q) ||
        i.routeCode.toLowerCase().includes(q) ||
        (i.busPlate ?? '').toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.reporterName.toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || String(i.incidentType) === typeFilter;
      const matchStatus = statusFilter === 'ALL' || String(i.status) === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [incidents, searchTerm, typeFilter, statusFilter]);

  const openCreate = () => {
    setTripId(tripOptions[0] ? String(tripOptions[0].tripId) : '');
    setType(IncidentTypeCode.Breakdown);
    setDelay(0);
    setLocation('');
    setDescription('');
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId) return showError('Vui lòng chọn chuyến xe gặp sự cố.');
    if (!location.trim()) return showError('Vui lòng nhập vị trí xảy ra sự cố.');
    if (!description.trim()) return showError('Vui lòng mô tả sự cố.');

    setIsSubmitting(true);
    try {
      await createIncident({
        tripId: Number(tripId),
        incidentType: type,
        delayMinutes: isPassenger ? 0 : Number(delay),
        location: location.trim(),
        description: description.trim(),
      });
      success('Đã gửi báo cáo sự cố tới Ban Điều Hành.');
      setCreateOpen(false);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không gửi được báo cáo sự cố.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setIsSubmitting(true);
    try {
      await resolveIncident(resolveTarget.id, note.trim() || undefined);
      success(`Đã đóng sự cố #${resolveTarget.id}.`);
      setResolveTarget(null);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không đóng được sự cố.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCount = incidents.filter((i) => i.status === IncidentStatusCode.Open).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isManagement ? 'Quản lý sự cố xe buýt' : 'Báo cáo sự cố'}
        subtitle={
          isManagement
            ? 'Tiếp nhận, theo dõi và đóng các sự cố do tài xế, phụ xe và hành khách báo về.'
            : 'Báo sự cố trên chuyến của bạn để Ban Điều Hành xử lý kịp thời.'
        }
        icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className={PRIMARY_BTN} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
            <button type="button" onClick={openCreate} className={PRIMARY_BTN}>
              <Plus className="w-4 h-4" />
              <span>Báo sự cố</span>
            </button>
          </div>
        }
      />

      {(loadError || tripError) && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được dữ liệu từ máy chủ: {loadError || tripError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          ['Tổng số sự cố', incidents.length],
          ['Đang mở', openCount],
          ['Đã xử lý', incidents.length - openCount],
        ].map(([label, value]) => (
          <div key={label as string} className={`${CARD} p-4`}>
            <div className="text-slate-400 text-xs font-semibold">{label}</div>
            <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{value}</div>
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
            placeholder="Tìm theo mã, tuyến, biển số, vị trí, người báo..."
            className={`${FILTER} w-full pl-9`}
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={FILTER}>
          <option value="ALL">Tất cả loại sự cố</option>
          {(Object.keys(INCIDENT_TYPE_LABEL) as unknown as IncidentTypeCode[]).map((k) => (
            <option key={k} value={String(k)}>
              {INCIDENT_TYPE_LABEL[Number(k) as IncidentTypeCode]}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FILTER}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value={String(IncidentStatusCode.Open)}>Đang mở</option>
          <option value={String(IncidentStatusCode.Resolved)}>Đã xử lý</option>
        </select>
      </div>

      {loading && incidents.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có sự cố nào"
          description="Không có báo cáo sự cố phù hợp với điều kiện lọc."
          icon={<AlertTriangle className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Chuyến / Xe</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Vị trí</th>
                  <th className="py-3 px-4">Trễ</th>
                  <th className="py-3 px-4">Người báo</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">SC-{i.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        TRIP-{i.tripId} · {i.routeCode}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{i.busPlate ?? 'Chưa gán xe'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{INCIDENT_TYPE_LABEL[i.incidentType]}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[180px] truncate" title={i.location}>
                      {i.location}
                    </td>
                    <td className="py-3 px-4">{i.delayMinutes > 0 ? `${i.delayMinutes} phút` : '-'}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200">{i.reporterName}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{fmtDateTime(i.createdAt)}</td>
                    <td className="py-3 px-4">
                      <StatusPill status={i.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" title="Chi tiết" onClick={() => setDetail(i)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        {isManagement && i.status === IncidentStatusCode.Open && (
                          <button
                            type="button"
                            title="Đóng sự cố"
                            onClick={() => {
                              setResolveTarget(i);
                              setNote('');
                            }}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Báo sự cố" maxWidth="lg">
        <form onSubmit={submitCreate} className="space-y-4 text-xs">
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Chuyến xe *</span>
            <select value={tripId} onChange={(e) => setTripId(e.target.value)} className={INPUT}>
              <option value="">-- Chọn chuyến --</option>
              {tripOptions.map((t) => (
                <option key={t.tripId} value={String(t.tripId)}>
                  {t.label}
                </option>
              ))}
            </select>
            {tripOptions.length === 0 && (
              <span className="text-[11px] text-amber-600">
                {isPassenger ? 'Bạn chưa có vé trên chuyến nào.' : 'Chưa có chuyến nào được phân công cho bạn.'}
              </span>
            )}
          </label>
          <div className={`grid gap-3 ${isPassenger ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Loại sự cố *</span>
              <select value={type} onChange={(e) => setType(Number(e.target.value))} className={INPUT}>
                {(Object.keys(INCIDENT_TYPE_LABEL) as unknown as IncidentTypeCode[]).map((k) => (
                  <option key={k} value={Number(k)}>
                    {INCIDENT_TYPE_LABEL[Number(k) as IncidentTypeCode]}
                  </option>
                ))}
              </select>
            </label>
            {!isPassenger && (
              <label className="space-y-1 block">
                <span className="font-bold text-slate-700 dark:text-slate-300">Dự kiến trễ (phút)</span>
                <input type="number" min={0} max={600} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className={INPUT} />
              </label>
            )}
          </div>
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Vị trí xảy ra *</span>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Ngã tư Hàng Xanh" className={INPUT} />
          </label>
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Mô tả *</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Mô tả tình trạng sự cố" className={INPUT} />
          </label>
          {!isPassenger && delay > 0 && (
            <p className="text-[11px] text-slate-500">
              Chuyến sẽ chuyển sang trạng thái Trễ giờ và hành khách đã đặt vé trên chuyến được thông báo.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={`Sự cố SC-${detail?.id ?? ''}`} maxWidth="lg">
        {detail && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {[
              ['Chuyến', `TRIP-${detail.tripId} (${detail.routeCode} - ${detail.routeName})`],
              ['Xe', detail.busPlate ?? 'Chưa gán xe'],
              ['Loại', INCIDENT_TYPE_LABEL[detail.incidentType]],
              ['Dự kiến trễ', detail.delayMinutes > 0 ? `${detail.delayMinutes} phút` : 'Không'],
              ['Vị trí', detail.location],
              ['Người báo', `${detail.reporterName}${detail.reporterPhone ? ` (${detail.reporterPhone})` : ''}`],
              ['Báo lúc', fmtDateTime(detail.createdAt)],
              ['Đóng lúc', detail.resolvedAt ? fmtDateTime(detail.resolvedAt) : '-'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-400 font-semibold">{k}</dt>
                <dd className="text-slate-900 dark:text-white font-medium">{v}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="text-slate-400 font-semibold">Mô tả</dt>
              <dd className="text-slate-900 dark:text-white whitespace-pre-wrap">{detail.description}</dd>
            </div>
            {detail.status === IncidentStatusCode.Resolved && (
              <div className="col-span-2">
                <dt className="text-slate-400 font-semibold">Xử lý bởi {detail.resolvedByName ?? ''}</dt>
                <dd className="text-slate-900 dark:text-white whitespace-pre-wrap">{detail.resolutionNote || 'Không có ghi chú.'}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>

      <Modal isOpen={resolveTarget !== null} onClose={() => setResolveTarget(null)} title={`Đóng sự cố SC-${resolveTarget?.id ?? ''}`} maxWidth="md">
        <form onSubmit={submitResolve} className="space-y-4 text-xs">
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Ghi chú xử lý</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="VD: Đã điều xe thay thế, kéo xe hỏng về bãi" className={INPUT} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setResolveTarget(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className={PRIMARY_BTN}>
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận đã xử lý'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
