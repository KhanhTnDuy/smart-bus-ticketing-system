import React, { useMemo, useState } from 'react';
import { Bus as BusIcon, Plus, Eye, Edit2, Trash2, Search, RotateCcw } from 'lucide-react';
import { useBusManagement } from '../../hooks/useBusManagement';
import { useToast } from '../../context/ToastContext';
import {
  BUS_LIMITS,
  BUS_STATUS_LABEL,
  BackendBusStatus,
  seatCodeOf,
  type BusDetailDto,
  type BusDto,
  type BusRequest,
} from '../../api/busManagement';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';

const STATUS_STYLE: Record<BackendBusStatus, string> = {
  [BackendBusStatus.Active]:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  [BackendBusStatus.Maintenance]:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  [BackendBusStatus.Inactive]:
    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-600',
};

const StatusBadge: React.FC<{ status: BackendBusStatus }> = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 text-[11px] font-bold rounded border ${STATUS_STYLE[status]}`}>
    {BUS_STATUS_LABEL[status]}
  </span>
);

const inputClass =
  'w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500';

interface BusForm {
  plateNumber: string;
  status: BackendBusStatus;
  rows: number;
  columns: number;
  capacity: number;
}

const EMPTY_FORM: BusForm = { plateNumber: '', status: BackendBusStatus.Active, rows: 10, columns: 4, capacity: 40 };

/** Lưới ghế: điền lần lượt từng hàng, hàng cuối có thể thiếu ghế (giống cách backend sinh ghế). */
const SeatGrid: React.FC<{ rows: number; columns: number; capacity: number }> = ({ rows, columns, capacity }) => {
  if (rows < 1 || columns < 1 || capacity < 1) return null;
  const cells = Array.from({ length: Math.min(capacity, rows * columns) }, (_, i) => ({
    row: Math.floor(i / columns) + 1,
    col: (i % columns) + 1,
  }));
  return (
    <div
      className="grid gap-1.5 justify-center"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 2.75rem))` }}
    >
      {cells.map((c) => (
        <div
          key={`${c.row}-${c.col}`}
          className="h-9 flex items-center justify-center rounded border border-institutional-300 dark:border-institutional-700 bg-institutional-50 dark:bg-[#0c162d] text-[11px] font-semibold text-institutional-800 dark:text-sky-300"
        >
          {seatCodeOf(c.row, c.col)}
        </div>
      ))}
    </div>
  );
};

/** Trả về thông báo lỗi nếu form chưa hợp lệ, khớp quy tắc kiểm tra của backend. */
const validate = (f: BusForm): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!f.plateNumber.trim()) errors.plateNumber = 'Vui lòng nhập biển số xe.';
  else if (f.plateNumber.trim().length > 20) errors.plateNumber = 'Biển số tối đa 20 ký tự.';
  if (!Number.isInteger(f.rows) || f.rows < 1 || f.rows > BUS_LIMITS.maxRows)
    errors.rows = `Số hàng từ 1 đến ${BUS_LIMITS.maxRows}.`;
  if (!Number.isInteger(f.columns) || f.columns < 1 || f.columns > BUS_LIMITS.maxColumns)
    errors.columns = `Số cột từ 1 đến ${BUS_LIMITS.maxColumns}.`;
  if (!errors.rows && !errors.columns) {
    if (!Number.isInteger(f.capacity) || f.capacity < 1) errors.capacity = 'Sức chứa phải lớn hơn 0.';
    else if (f.capacity > f.rows * f.columns)
      errors.capacity = `Sức chứa vượt quá số ghế của lưới (${f.rows * f.columns}).`;
    else if (f.capacity <= (f.rows - 1) * f.columns)
      errors.capacity = 'Hàng cuối sẽ trống, hãy giảm số hàng hoặc tăng sức chứa.';
  }
  return errors;
};

export const BusManagementPage: React.FC = () => {
  const { buses, loading, error: loadError, reload, getDetail, addBus, updateBus, deleteBus } = useBusManagement();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<BusDto | null>(null);
  const [form, setForm] = useState<BusForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [viewing, setViewing] = useState<BusDetailDto | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [deleting, setDeleting] = useState<BusDto | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return buses.filter(
      (b) =>
        (!term || b.plateNumber.toLowerCase().includes(term)) &&
        (filterStatus === 'ALL' || b.status === Number(filterStatus)),
    );
  }, [buses, searchTerm, filterStatus]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (bus: BusDto) => {
    setEditing(bus);
    setForm({
      plateNumber: bus.plateNumber,
      status: bus.status,
      rows: bus.rows || 1,
      columns: bus.columns || 1,
      capacity: bus.capacity,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openView = async (bus: BusDto) => {
    setIsLoadingView(true);
    const detail = await getDetail(bus.id);
    setIsLoadingView(false);
    if (!detail) {
      error('Không tải được sơ đồ ghế của xe.');
      return;
    }
    setViewing(detail);
  };

  // Đổi số hàng / cột thì sức chứa mặc định là kín lưới, người dùng vẫn sửa lại được.
  const setLayout = (rows: number, columns: number) =>
    setForm((f) => ({ ...f, rows, columns, capacity: rows > 0 && columns > 0 ? rows * columns : f.capacity }));

  const handleSubmit = async () => {
    const errs = validate(form);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const body: BusRequest = {
      plateNumber: form.plateNumber.trim(),
      capacity: form.capacity,
      status: form.status,
      rows: form.rows,
      columns: form.columns,
    };
    setIsSaving(true);
    const result = editing ? await updateBus(editing.id, body) : await addBus(body);
    setIsSaving(false);

    if (result.success) {
      success(result.message ?? 'Đã lưu xe buýt.');
      setIsFormOpen(false);
    } else {
      error(result.message ?? 'Không lưu được xe buýt.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const result = await deleteBus(deleting.id);
    if (result.success) success(result.message ?? 'Đã xoá xe buýt.');
    else error(result.message ?? 'Không xoá được xe buýt.');
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý xe buýt"
        subtitle="Thêm, sửa, xoá xe (biển số, sức chứa, trạng thái) và tạo sơ đồ ghế theo hàng / cột."
        icon={<BusIcon className="w-5 h-5" />}
        action={
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-institutional-700 hover:bg-institutional-800 text-white rounded-md text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm xe
          </button>
        }
      />

      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50">
          <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
            Không tải được danh sách xe: {loadError}
          </span>
          <button
            onClick={() => void reload()}
            className="px-3 py-1.5 text-xs font-bold rounded-md border border-rose-400 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo biển số..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputClass} sm:w-48`}>
          <option value="ALL">Tất cả trạng thái</option>
          {Object.values(BackendBusStatus)
            .filter((v): v is BackendBusStatus => typeof v === 'number')
            .map((s) => (
              <option key={s} value={s}>
                {BUS_STATUS_LABEL[s]}
              </option>
            ))}
        </select>
        <button
          onClick={() => {
            setSearchTerm('');
            setFilterStatus('ALL');
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Đặt lại
        </button>
      </div>

      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
        {loading ? (
          <LoadingState message="Đang tải danh sách xe..." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Chưa có xe buýt" description="Chưa có xe nào phù hợp. Bấm Thêm xe để tạo xe và sơ đồ ghế." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Biển số</th>
                  <th className="px-4 py-3 text-center">Sức chứa</th>
                  <th className="px-4 py-3 text-center">Sơ đồ ghế</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Số chuyến</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1e2f57]">
                {filtered.map((b) => (
                  <tr key={b.id} className="text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0c162d]/60">
                    <td className="px-4 py-3 font-bold">{b.plateNumber}</td>
                    <td className="px-4 py-3 text-center">{b.capacity}</td>
                    <td className="px-4 py-3 text-center">
                      {b.rows} hàng x {b.columns} cột
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-center">{b.tripCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => void openView(b)}
                          disabled={isLoadingView}
                          title="Xem sơ đồ ghế"
                          className="p-1.5 rounded text-institutional-700 dark:text-sky-300 hover:bg-institutional-50 dark:hover:bg-[#0c162d] disabled:opacity-50"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(b)}
                          title="Sửa xe"
                          className="p-1.5 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-[#0c162d]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(b)}
                          title="Xoá xe"
                          className="p-1.5 rounded text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-[#0c162d]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => !isSaving && setIsFormOpen(false)}
        title={editing ? `Sửa xe ${editing.plateNumber}` : 'Thêm xe buýt'}
        subtitle="Nhập thông tin xe và cấu hình sơ đồ ghế theo hàng / cột."
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Biển số xe</span>
              <input
                type="text"
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                placeholder="51B-123.45"
                className={inputClass}
              />
              {formErrors.plateNumber && <span className="text-[11px] text-rose-600">{formErrors.plateNumber}</span>}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Trạng thái</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: Number(e.target.value) as BackendBusStatus })}
                className={inputClass}
              >
                {Object.values(BackendBusStatus)
                  .filter((v): v is BackendBusStatus => typeof v === 'number')
                  .map((s) => (
                    <option key={s} value={s}>
                      {BUS_STATUS_LABEL[s]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Số hàng ghế</span>
              <input
                type="number"
                min={1}
                max={BUS_LIMITS.maxRows}
                value={form.rows}
                onChange={(e) => setLayout(Number(e.target.value), form.columns)}
                className={inputClass}
              />
              {formErrors.rows && <span className="text-[11px] text-rose-600">{formErrors.rows}</span>}
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Số cột ghế</span>
              <input
                type="number"
                min={1}
                max={BUS_LIMITS.maxColumns}
                value={form.columns}
                onChange={(e) => setLayout(form.rows, Number(e.target.value))}
                className={inputClass}
              />
              {formErrors.columns && <span className="text-[11px] text-rose-600">{formErrors.columns}</span>}
            </label>
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sức chứa (số ghế)</span>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                className={inputClass}
              />
              {formErrors.capacity && <span className="text-[11px] text-rose-600">{formErrors.capacity}</span>}
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-[#1e2f57] p-3 max-h-64 overflow-auto">
            <SeatGrid rows={form.rows} columns={form.columns} capacity={form.capacity} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsFormOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-institutional-700 hover:bg-institutional-800 text-white disabled:opacity-60"
            >
              {isSaving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm xe'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? `Sơ đồ ghế xe ${viewing.bus.plateNumber}` : ''}
        subtitle={viewing ? `${viewing.seats.length} ghế, ${viewing.bus.rows} hàng x ${viewing.bus.columns} cột` : undefined}
        maxWidth="xl"
      >
        {viewing && (
          <div className="max-h-96 overflow-auto">
            <SeatGrid rows={viewing.bus.rows} columns={viewing.bus.columns} capacity={viewing.seats.length} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
        title="Xoá xe buýt"
        message="Xe đã xếp vào chuyến hoặc từng bán vé sẽ không xoá được, hãy chuyển sang Ngừng hoạt động."
        itemName={deleting?.plateNumber}
        confirmLabel="Xoá xe"
        isDangerous
      />
    </div>
  );
};
