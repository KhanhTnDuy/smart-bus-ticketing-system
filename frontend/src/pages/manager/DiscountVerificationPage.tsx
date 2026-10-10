import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileCheck2, Search, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ProtectedDocument } from '../../components/common/ProtectedDocument';
import {
  APPLICATION_STATUS_LABEL,
  ApplicationStatus,
  DiscountApplicationDto,
  listApplications,
  reviewApplication,
} from '../../api/discountApplications';
import { formatDateTime } from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';
const INPUT =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500';

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

const oneYearFromToday = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-CA');
};

export const DiscountVerificationPage: React.FC = () => {
  const { success, error: showError } = useToast();
  const [items, setItems] = useState<DiscountApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApplicationStatus>('Pending');

  const [target, setTarget] = useState<DiscountApplicationDto | null>(null);
  const [mode, setMode] = useState<'VIEW' | 'APPROVE' | 'REJECT'>('VIEW');
  const [validUntil, setValidUntil] = useState(oneYearFromToday());
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listApplications());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách hồ sơ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter(
      (a) =>
        (statusFilter === 'ALL' || a.status === statusFilter) &&
        (!q || a.passengerName.toLowerCase().includes(q) || (a.passengerEmail ?? '').toLowerCase().includes(q) || a.passengerTypeName.toLowerCase().includes(q)),
    );
  }, [items, searchTerm, statusFilter]);

  const count = (s: ApplicationStatus) => items.filter((a) => a.status === s).length;

  const open = (a: DiscountApplicationDto, m: 'VIEW' | 'APPROVE' | 'REJECT') => {
    setTarget(a);
    setMode(m);
    setValidUntil(oneYearFromToday());
    setReason('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (mode === 'REJECT' && !reason.trim()) return showError('Vui lòng nhập lý do từ chối hồ sơ.');
    setIsSubmitting(true);
    try {
      await reviewApplication(
        target.id,
        mode === 'APPROVE',
        mode === 'APPROVE' ? { validUntil } : { rejectReason: reason.trim() },
      );
      success(mode === 'APPROVE' ? `Đã duyệt hồ sơ của ${target.passengerName}.` : `Đã từ chối hồ sơ của ${target.passengerName}.`);
      setTarget(null);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không xử lý được hồ sơ.');
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duyệt hồ sơ đối tượng ưu đãi"
        subtitle="Xét giấy tờ minh chứng của hành khách đăng ký giá vé ưu đãi. Hồ sơ đã duyệt và còn hạn sẽ tự áp dụng khi hành khách đặt vé."
        icon={<FileCheck2 className="w-5 h-5 text-emerald-500" />}
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

      <div className="grid grid-cols-3 gap-4">
        {(['Pending', 'Approved', 'Rejected'] as ApplicationStatus[]).map((s) => (
          <div key={s} className={`${CARD} p-4`}>
            <div className="text-slate-400 text-xs font-semibold">{APPLICATION_STATUS_LABEL[s]}</div>
            <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{count(s)}</div>
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
            placeholder="Tìm theo tên, email, loại đối tượng..."
            className={`${FILTER} w-full pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ApplicationStatus)} className={FILTER}>
          <option value="ALL">Tất cả trạng thái</option>
          {(Object.keys(APPLICATION_STATUS_LABEL) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Không có hồ sơ" description="Không có hồ sơ phù hợp với điều kiện lọc." icon={<FileCheck2 className="w-12 h-12 text-slate-300" />} />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã</th>
                  <th className="py-3 px-4">Hành khách</th>
                  <th className="py-3 px-4">Đối tượng</th>
                  <th className="py-3 px-4">Nộp lúc</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">HS-{a.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{a.passengerName}</div>
                      <div className="text-[11px] text-slate-400">{a.passengerEmail ?? a.passengerPhone ?? ''}</div>
                    </td>
                    <td className="py-3 px-4">
                      {a.passengerTypeName}
                      <div className="text-[11px] text-slate-400">Giảm {a.discountPercent}%</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(a.submittedAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${STATUS_STYLE[a.status]}`}>{APPLICATION_STATUS_LABEL[a.status]}</span>
                      {a.status === 'Approved' && a.validUntil && <div className="text-[11px] text-slate-400 mt-0.5">đến {a.validUntil}</div>}
                      {a.status === 'Rejected' && a.rejectReason && <div className="text-[11px] text-slate-400 mt-0.5">{a.rejectReason}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" title="Xem giấy tờ" onClick={() => open(a, 'VIEW')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        {a.status === 'Pending' && (
                          <>
                            <button type="button" title="Duyệt" onClick={() => open(a, 'APPROVE')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button type="button" title="Từ chối" onClick={() => open(a, 'REJECT')} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
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

      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title={mode === 'APPROVE' ? `Duyệt hồ sơ HS-${target?.id ?? ''}` : mode === 'REJECT' ? `Từ chối hồ sơ HS-${target?.id ?? ''}` : `Hồ sơ HS-${target?.id ?? ''}`}
        maxWidth="lg"
      >
        {target && (
          <form onSubmit={submit} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-white">
                {target.passengerName} · {target.passengerTypeName} (giảm {target.discountPercent}%)
              </div>
              <div className="text-slate-500">
                {target.passengerEmail ?? ''} {target.passengerPhone ? `· ${target.passengerPhone}` : ''}
              </div>
            </div>

            <div>
              <div className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Giấy tờ minh chứng</div>
              <ProtectedDocument url={target.documentUrl} />
            </div>

            {mode === 'APPROVE' && (
              <label className="space-y-1 block">
                <span className="font-bold text-slate-700 dark:text-slate-300">Ưu đãi có hiệu lực đến *</span>
                <input type="date" required value={validUntil} min={new Date().toLocaleDateString('en-CA')} onChange={(e) => setValidUntil(e.target.value)} className={INPUT} />
              </label>
            )}
            {mode === 'REJECT' && (
              <label className="space-y-1 block">
                <span className="font-bold text-slate-700 dark:text-slate-300">Lý do từ chối *</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="VD: Ảnh thẻ sinh viên mờ, thiếu năm học" className={INPUT} />
              </label>
            )}
            {target.status !== 'Pending' && (
              <div className="text-slate-500">
                {APPLICATION_STATUS_LABEL[target.status]} bởi {target.reviewedByName ?? '-'} lúc {formatDateTime(target.reviewedAt)}.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTarget(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
                Đóng
              </button>
              {mode !== 'VIEW' && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-white font-bold disabled:opacity-60 ${mode === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  {isSubmitting ? 'Đang xử lý...' : mode === 'APPROVE' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                </button>
              )}
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
