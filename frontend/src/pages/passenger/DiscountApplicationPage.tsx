import React, { useCallback, useEffect, useState } from 'react';
import { BadgePercent, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ProtectedDocument } from '../../components/common/ProtectedDocument';
import { listPassengerTypes, PassengerTypeDto } from '../../api/routeManagement';
import {
  APPLICATION_STATUS_LABEL,
  ApplicationStatus,
  DiscountApplicationDto,
  listMyApplications,
  submitApplication,
  uploadDocument,
} from '../../api/discountApplications';
import { formatDateTime } from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const INPUT =
  'w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500';

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export const DiscountApplicationPage: React.FC = () => {
  const { success, error: showError } = useToast();
  const [types, setTypes] = useState<PassengerTypeDto[]>([]);
  const [applications, setApplications] = useState<DiscountApplicationDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, mine] = await Promise.all([listPassengerTypes(), listMyApplications()]);
      const discounted = t.filter((x) => x.discountPercent > 0);
      setTypes(discounted);
      setApplications(mine);
      setTypeId((prev) => prev || (discounted[0] ? String(discounted[0].id) : ''));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được dữ liệu.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasPending = applications.some((a) => a.status === 'Pending');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeId) return showError('Vui lòng chọn đối tượng ưu đãi.');
    if (!file) return showError('Vui lòng chọn ảnh hoặc tệp PDF giấy tờ minh chứng.');
    setIsSubmitting(true);
    try {
      const uploaded = await uploadDocument(file);
      await submitApplication(Number(typeId), uploaded.url);
      success('Đã gửi hồ sơ. Ban quản lý sẽ xét duyệt và thông báo kết quả cho bạn.');
      setFile(null);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không gửi được hồ sơ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đăng ký ưu đãi giá vé"
        subtitle="Học sinh, sinh viên, người cao tuổi... nộp giấy tờ để được giảm giá vé. Hồ sơ được duyệt sẽ tự áp dụng khi bạn đặt vé."
        icon={<BadgePercent className="w-5 h-5 text-emerald-500" />}
      />

      {loadError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được dữ liệu từ máy chủ: {loadError}
        </div>
      )}

      <form onSubmit={submit} className={`${CARD} p-5 space-y-4 text-xs`}>
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nộp hồ sơ mới</h3>
        {hasPending && (
          <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            Bạn đang có một hồ sơ chờ duyệt. Vui lòng đợi kết quả trước khi nộp hồ sơ khác.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Đối tượng ưu đãi *</span>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={INPUT}>
              {types.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} (giảm {t.discountPercent}%)
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="font-bold text-slate-700 dark:text-slate-300">Giấy tờ minh chứng * (JPG, PNG hoặc PDF, tối đa 5 MB)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={INPUT}
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || hasPending}
            className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 disabled:opacity-60 text-white font-bold rounded-lg flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {isSubmitting ? 'Đang gửi...' : 'Gửi hồ sơ'}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hồ sơ của bạn ({applications.length})</h3>
        <button type="button" onClick={() => void load()} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Tải lại">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {applications.length === 0 ? (
        <EmptyState title="Chưa có hồ sơ nào" description="Hồ sơ bạn nộp sẽ hiện ở đây cùng kết quả duyệt." icon={<BadgePercent className="w-12 h-12 text-slate-300" />} />
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className={`${CARD} p-4 text-xs space-y-2`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">HS-{a.id}</span>{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{a.passengerTypeName}</span>{' '}
                  <span className="text-slate-400">giảm {a.discountPercent}%</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${STATUS_STYLE[a.status]}`}>{APPLICATION_STATUS_LABEL[a.status]}</span>
              </div>
              <div className="text-slate-500">
                Nộp lúc {formatDateTime(a.submittedAt)}
                {a.status === 'Approved' && a.validUntil ? ` · ưu đãi có hiệu lực đến ${a.validUntil}` : ''}
              </div>
              {a.status === 'Rejected' && a.rejectReason && (
                <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">Lý do từ chối: {a.rejectReason}</div>
              )}
              <button type="button" onClick={() => setExpanded(expanded === a.id ? null : a.id)} className="text-institutional-600 dark:text-sky-400 font-bold hover:underline">
                {expanded === a.id ? 'Ẩn giấy tờ' : 'Xem giấy tờ đã nộp'}
              </button>
              {expanded === a.id && <ProtectedDocument url={a.documentUrl} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
