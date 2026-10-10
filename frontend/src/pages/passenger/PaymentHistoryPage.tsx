import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Search, Eye, RefreshCw, FileText } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PaymentDto,
  REFUND_REASON_LABEL,
  REFUND_STATUS_LABEL,
  formatDateTime,
  formatVnd,
  listMyPayments,
} from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

const STATUS_STYLE: Record<string, string> = {
  Success: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  Refunded: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  Pending: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  Failed: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export const PaymentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detail, setDetail] = useState<PaymentDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments(await listMyPayments());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử thanh toán.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return payments.filter(
      (p) =>
        (statusFilter === 'ALL' || p.status === statusFilter) &&
        (!q ||
          p.bookingCode.toLowerCase().includes(q) ||
          p.routeCode.toLowerCase().includes(q) ||
          (p.providerTxnId ?? '').toLowerCase().includes(q) ||
          (p.invoiceNo ?? '').toLowerCase().includes(q)),
    );
  }, [payments, searchTerm, statusFilter]);

  const paid = payments.filter((p) => p.status === 'Success' || p.status === 'Refunded').reduce((s, p) => s + p.amount, 0);
  const refunded = payments.reduce((s, p) => s + p.refundedAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sử thanh toán"
        subtitle="Các giao dịch thanh toán vé của bạn, kèm hóa đơn và các khoản đã hoàn tiền."
        icon={<CreditCard className="w-5 h-5 text-emerald-500" />}
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

      {error && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được dữ liệu từ máy chủ: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ['Số giao dịch', String(payments.length)],
          ['Tổng đã thanh toán', formatVnd(paid)],
          ['Đã hoàn tiền', formatVnd(refunded)],
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
            placeholder="Tìm theo mã đặt chỗ, tuyến, mã giao dịch, số hóa đơn..."
            className={`${FILTER} w-full pl-9`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FILTER}>
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {loading && payments.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có giao dịch nào"
          description="Các giao dịch sẽ xuất hiện ở đây sau khi bạn thanh toán vé."
          icon={<CreditCard className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã đặt chỗ</th>
                  <th className="py-3 px-4">Tuyến / Ghế</th>
                  <th className="py-3 px-4">Phương thức</th>
                  <th className="py-3 px-4">Số tiền</th>
                  <th className="py-3 px-4">Thanh toán lúc</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300">{p.bookingCode}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.routeCode}</div>
                      <div className="text-[11px] text-slate-400">Ghế {p.seats.join(', ')}</div>
                    </td>
                    <td className="py-3 px-4">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(p.amount)}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(p.paidAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${STATUS_STYLE[p.status] ?? ''}`}>
                        {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button type="button" title="Chi tiết" onClick={() => setDetail(p)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={`Giao dịch ${detail?.bookingCode ?? ''}`} maxWidth="lg">
        {detail && (
          <div className="space-y-4 text-xs">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                ['Mã giao dịch', detail.providerTxnId ?? '-'],
                ['Phương thức', PAYMENT_METHOD_LABEL[detail.method] ?? detail.method],
                ['Số tiền', formatVnd(detail.amount)],
                ['Thanh toán lúc', formatDateTime(detail.paidAt)],
                ['Tuyến', `${detail.routeCode} - ${detail.routeName}`],
                ['Khởi hành', formatDateTime(detail.departureAt)],
                ['Ghế', detail.seats.join(', ')],
                ['Đã hoàn', formatVnd(detail.refundedAmount)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-400 font-semibold">{k}</dt>
                  <dd className="text-slate-900 dark:text-white font-medium break-all">{v}</dd>
                </div>
              ))}
            </dl>

            {detail.refunds.length > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-slate-700 dark:text-slate-300">Hoàn tiền</div>
                {detail.refunds.map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 flex justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatVnd(r.amount)} · {REFUND_REASON_LABEL[r.reason] ?? r.reason}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Gửi {formatDateTime(r.createdAt)}
                        {r.note ? ` · ${r.note}` : ''}
                      </div>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{REFUND_STATUS_LABEL[r.status] ?? r.status}</span>
                  </div>
                ))}
              </div>
            )}

            {detail.invoiceNo && (
              <button
                type="button"
                onClick={() => navigate('/passenger/invoices')}
                className="px-4 py-2 rounded-lg border border-institutional-600 text-institutional-600 dark:text-sky-400 font-bold flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Xem hóa đơn {detail.invoiceNo}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
