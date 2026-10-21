import React, { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Ruler, Plus, Edit2, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  DistanceFare,
  createDistanceFare,
  deleteDistanceFare,
  describeBand,
  findFareGaps,
  listDistanceFares,
  updateDistanceFare,
} from '../../api/distanceFares';
import { formatVnd } from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const INPUT =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500';

interface FormState {
  fromKm: string;
  toKm: string;
  price: string;
}

const EMPTY: FormState = { fromKm: '', toKm: '', price: '' };

/**
 * Quản lý bảng giá vé niêm yết theo km hành trình. Mỗi bậc là (từ km, đến km]: hành trình trên "từ km" và không quá "đến km" thì giá là
 * giá bậc đó; bậc cuối để trống "đến km". Các bậc không được chồng lấn; còn khoảng km chưa có giá thì cảnh báo vì hành trình đó sẽ quay về
 * giá cố định của tuyến.
 */
export const DistanceFarePage: React.FC = () => {
  const { success, error: showError } = useToast();
  const [bands, setBands] = useState<DistanceFare[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DistanceFare | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleting, setDeleting] = useState<DistanceFare | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setBands(await listDistanceFares());
      setLoadError(null);
    } catch (err) {
      if (silent) return;
      setLoadError(err instanceof Error ? err.message : 'Không tải được bảng giá.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Dữ liệu do người khác thay đổi ở máy khác thì tự cập nhật, không cần bấm tải lại.
  useAutoRefresh(() => load(true));

  const openNew = () => {
    // Gợi ý bậc kế tiếp: bắt đầu đúng chỗ bậc cuối kết thúc để không để hở.
    const last = [...bands].sort((a, b) => a.fromKm - b.fromKm).at(-1);
    setForm({ fromKm: last?.toKm != null ? String(last.toKm) : bands.length === 0 ? '0' : '', toKm: '', price: '' });
    setEditing('new');
  };

  const openEdit = (b: DistanceFare) => {
    setForm({ fromKm: String(b.fromKm), toKm: b.toKm === null ? '' : String(b.toKm), price: String(b.price) });
    setEditing(b);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromKm = Number(form.fromKm);
    const toKm = form.toKm.trim() === '' ? null : Number(form.toKm);
    const price = Number(form.price);
    if (form.fromKm.trim() === '' || Number.isNaN(fromKm) || fromKm < 0) return showError('Km bắt đầu phải là số từ 0 trở lên.');
    if (toKm !== null && (Number.isNaN(toKm) || toKm <= fromKm)) return showError('Km kết thúc phải lớn hơn km bắt đầu (hoặc để trống nếu là bậc cuối).');
    if (Number.isNaN(price) || price <= 0) return showError('Giá vé phải lớn hơn 0.');

    setSubmitting(true);
    try {
      if (editing === 'new') await createDistanceFare({ fromKm, toKm, price });
      else if (editing) await updateDistanceFare(editing.id, { fromKm, toKm, price });
      success('Đã lưu bậc giá.');
      setEditing(null);
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không lưu được bậc giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await deleteDistanceFare(deleting.id);
      success('Đã xóa bậc giá.');
      setDeleting(null);
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không xóa được bậc giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const gaps = bands.length > 0 ? findFareGaps(bands) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng giá vé theo km"
        subtitle="Giá vé niêm yết theo số km hành trình (từ trạm lên đến trạm xuống). Học sinh/sinh viên, người cao tuổi... được giảm theo đối tượng."
        icon={<Ruler className="w-5 h-5 text-sky-500" />}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
            <button
              type="button"
              onClick={openNew}
              className="px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm bậc giá</span>
            </button>
          </div>
        }
      />

      {loadError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được dữ liệu từ máy chủ: {loadError}
        </div>
      )}

      {gaps.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Chưa có giá cho: <strong>{gaps.join('; ')}</strong>. Hành trình rơi vào khoảng này sẽ tính theo giá cố định của tuyến (hoặc 7.000 đ nếu tuyến chưa có giá).
          </span>
        </div>
      )}

      {!loading && bands.length === 0 ? (
        <EmptyState
          title="Chưa lập bảng giá theo km"
          description="Chưa có bậc giá nào nên vé đang tính theo giá cố định của tuyến. Bấm Thêm bậc giá để lập bảng giá niêm yết."
          icon={<Ruler className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Số km hành trình</th>
                <th className="py-3 px-4">Từ (km, không tính)</th>
                <th className="py-3 px-4">Đến (km, tính cả)</th>
                <th className="py-3 px-4 text-right">Giá vé thường</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 dark:border-slate-800/50">
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{describeBand(b)}</td>
                  <td className="py-3 px-4 font-mono">{b.fromKm}</td>
                  <td className="py-3 px-4 font-mono">{b.toKm ?? 'không giới hạn'}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(b.price)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" title="Sửa" onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button type="button" title="Xóa" onClick={() => setDeleting(b)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600">
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

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Thêm bậc giá' : 'Sửa bậc giá'} maxWidth="md">
        <form onSubmit={submit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Trên (km) *</span>
              <input type="number" min="0" step="0.01" value={form.fromKm} onChange={(e) => setForm({ ...form, fromKm: e.target.value })} className={INPUT} />
            </label>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Đến (km), tính cả mốc</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.toKm}
                onChange={(e) => setForm({ ...form, toKm: e.target.value })}
                placeholder="Để trống nếu là bậc cuối"
                className={INPUT}
              />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Giá vé hành khách thường (đồng) *</span>
            <input type="number" min="1" step="500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={INPUT} />
          </label>
          <p className="text-slate-400">Các bậc không được chồng lấn nhau. Ví dụ bậc 3 đến 8 km áp cho hành trình trên 3 km và không quá 8 km.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
              Hủy
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-institutional-600 hover:bg-institutional-700 disabled:opacity-60 text-white font-bold">
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleting !== null} onClose={() => setDeleting(null)} title="Xóa bậc giá" maxWidth="sm">
        {deleting && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Xóa bậc <strong>{describeBand(deleting)}</strong> ({formatVnd(deleting.price)})? Hành trình rơi vào bậc này sẽ không còn giá theo km.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleting(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void confirmDelete()}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold"
              >
                {submitting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
