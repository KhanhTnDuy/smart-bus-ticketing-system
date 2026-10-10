import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  PAYMENT_METHOD_LABEL,
  REFUND_REASON_LABEL,
  REFUND_STATUS_LABEL,
  RefundDto,
  formatDateTime,
  formatVnd,
  listRefunds,
  processRefund,
} from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';
const INPUT =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500';

const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Success: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Failed: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export const RefundManagementPage: React.FC = () => {
  const { success, error: showError } = useToast();
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [target, setTarget] = useState<RefundDto | null>(null);
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRefunds(await listRefunds());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách hoàn tiền.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return refunds.filter(
      (r) =>
        (statusFilter === 'ALL' || r.status === statusFilter) &&
        (!q || r.bookingCode.toLowerCase().includes(q) || r.passengerName.toLowerCase().includes(q) || String(r.id).includes(q)),
    );
  }, [refunds, searchTerm, statusFilter]);

  const pending = refunds.filter((r) => r.status === 'Pending');
  const pendingAmount = pending.reduce((s, r) => s + r.amount, 0);
  const doneAmount = refunds.filter((r) => r.status === 'Success').reduce((s, r) => s + r.amount, 0);

  const openProcess = (r: RefundDto, approveIt: boolean) => {
    setTarget(r);
    setApprove(approveIt);
    setNote('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!approve && !note.trim()) return showError('Vui lòng ghi lý do từ chối hoàn tiền.');
    setIsSubmitting(true);
    try {
      await processRefund(target.id, approve, note.trim() || undefined);
      success(approve ? `Đã hoàn ${formatVnd(target.amount)} cho ${target.passengerName}.` : 'Đã từ chối yêu cầu hoàn tiền.');
      setTarget(null);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không xử lý được yêu cầu hoàn tiền.');
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xử lý hoàn tiền vé"
        subtitle="Yêu cầu hoàn tiền được tạo tự động khi vé đã thanh toán bị hủy hoặc chuyến bị hủy."
        icon={<RotateCcw className="w-5 h-5 text-amber-500" />}
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="px-3.5 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        }
      />

      {loadError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được dữ liệu từ máy chủ: {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ['Chờ xử lý', `${pending.length} yêu cầu`],
          ['Số tiền chờ hoàn', formatVnd(pendingAmount)],
          ['Đã hoàn', formatVnd(doneAmount)],
        ].map(([label, value]) => (
          <div key={label} className={`${CARD} p-4`}>
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
            placeholder="Tìm theo mã đặt chỗ, hành khách, mã yêu cầu..."
            className={`${FILTER} w-full pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FILTER}>
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(REFUND_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading && refunds.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không có yêu cầu hoàn tiền"
          description="Chưa có yêu cầu hoàn tiền nào phù hợp với điều kiện lọc."
          icon={<RotateCcw className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Hành khách</th>
                  <th className="py-3 px-4">Mã đặt chỗ</th>
                  <th className="py-3 px-4">Lý do</th>
                  <th className="py-3 px-4">Số tiền</th>
                  <th className="py-3 px-4">Gửi lúc</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">HT-{r.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{r.passengerName}</div>
                      <div className="text-[11px] text-slate-400">{r.passengerPhone ?? r.passengerEmail ?? ''}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{r.bookingCode}</td>
                    <td className="py-3 px-4">{REFUND_REASON_LABEL[r.reason] ?? r.reason}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatVnd(r.amount)}
                      <div className="text-[11px] font-normal text-slate-400">{PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(r.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${STATUS_STYLE[r.status] ?? ''}`}>
                        {REFUND_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {r.status !== 'Pending' && r.processedByName && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {r.processedByName}
                          {r.note ? ` · ${r.note}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.status === 'Pending' && (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" title="Duyệt hoàn tiền" onClick={() => openProcess(r, true)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button type="button" title="Từ chối" onClick={() => openProcess(r, false)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title={approve ? `Duyệt hoàn tiền HT-${target?.id ?? ''}` : `Từ chối hoàn tiền HT-${target?.id ?? ''}`}
        maxWidth="md"
      >
        {target && (
          <form onSubmit={submit} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white">
                {target.passengerName} · {target.bookingCode}
              </div>
              <div className="text-slate-500">
                {formatVnd(target.amount)} qua {PAYMENT_METHOD_LABEL[target.paymentMethod] ?? target.paymentMethod} ·{' '}
                {REFUND_REASON_LABEL[target.reason] ?? target.reason}
              </div>
            </div>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {approve ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối *'}
              </span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={INPUT} />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTarget(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-lg text-white font-bold disabled:opacity-60 ${approve ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {isSubmitting ? 'Đang xử lý...' : approve ? 'Xác nhận đã hoàn tiền' : 'Từ chối hoàn tiền'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
