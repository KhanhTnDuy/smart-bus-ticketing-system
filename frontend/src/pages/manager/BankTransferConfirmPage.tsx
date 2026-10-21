import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Landmark, Search, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  PaymentDto,
  confirmBankTransfer,
  formatDateTime,
  formatVnd,
  listAllPayments,
} from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

/**
 * Quản lý đối chiếu sao kê ngân hàng và xác nhận đã nhận tiền chuyển khoản. Khi bật webhook (SePay) phần lớn khoản được tự xác nhận;
 * trang này dành cho các khoản chưa tự khớp (lệch số tiền, ngân hàng báo trễ, chưa nối webhook).
 */
export const BankTransferConfirmPage: React.FC = () => {
  const { success, warning, error: showError } = useToast();
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [target, setTarget] = useState<PaymentDto | null>(null);
  const [bankTxn, setBankTxn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const all = await listAllPayments();
      // Chuyển khoản chờ tiền, và chuyển khoản quá hạn chờ (tiền vẫn có thể về sau, xác nhận được).
      setPayments(all.filter((p) => p.method === 'BankTransfer' && (p.status === 'Pending' || p.status === 'Failed')));
      setLoadError(null);
    } catch (err) {
      if (!silent) setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách chuyển khoản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Dữ liệu do người khác thay đổi ở máy khác thì tự cập nhật, không cần bấm tải lại.
  useAutoRefresh(() => load(true));

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return payments.filter(
      (p) =>
        !q ||
        (p.reference ?? '').toLowerCase().includes(q) ||
        p.bookingCode.toLowerCase().includes(q) ||
        p.passengerName.toLowerCase().includes(q),
    );
  }, [payments, searchTerm]);

  const pendingAmount = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    try {
      const result = await confirmBankTransfer(target.id, bankTxn);
      if (result.success) {
        success(`Đã xác nhận nhận ${formatVnd(target.amount)} của ${target.passengerName}, vé đã có hiệu lực.`);
      } else {
        // Tiền đã vào nhưng lượt đặt hết hạn giữ chỗ: không xuất vé, khoản tiền được mở yêu cầu hoàn.
        warning(result.message);
      }
      setTarget(null);
      await load();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không xác nhận được giao dịch.');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xác nhận chuyển khoản"
        subtitle="Đối chiếu sao kê ngân hàng và xác nhận đã nhận tiền cho các lượt chuyển khoản qua mã VietQR. Nội dung chuyển khoản là mã để nhận ra lượt đặt."
        icon={<Landmark className="w-5 h-5 text-sky-500" />}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] text-slate-400">Đang chờ tiền</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {payments.filter((p) => p.status === 'Pending').length} giao dịch
          </div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] text-slate-400">Tổng tiền đang chờ</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{formatVnd(pendingAmount)}</div>
        </div>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo nội dung chuyển khoản, mã đặt chỗ, hành khách..."
            className={`${FILTER} w-full pl-9`}
          />
        </div>
      </div>

      {loading && payments.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không có giao dịch chuyển khoản nào đang chờ"
          description="Khi khách chọn thanh toán bằng chuyển khoản, giao dịch sẽ hiện ở đây cho tới khi nhận được tiền."
          icon={<Landmark className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 px-4">Nội dung CK</th>
                <th className="py-3 px-4">Mã đặt chỗ</th>
                <th className="py-3 px-4">Hành khách</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Giữ chỗ đến</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800/50">
                  <td className="py-3 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300">{p.reference}</td>
                  <td className="py-3 px-4 font-mono">{p.bookingCode}</td>
                  <td className="py-3 px-4">{p.passengerName}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(p.amount)}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDateTime(p.holdExpiresAt)}</td>
                  <td className="py-3 px-4">
                    {p.status === 'Pending' ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        Chờ tiền
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600">
                        Quá hạn chờ
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setTarget(p);
                          setBankTxn('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Đã nhận tiền
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={target !== null} onClose={() => setTarget(null)} title="Xác nhận đã nhận tiền chuyển khoản" maxWidth="md">
        {target && (
          <form onSubmit={submit} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-0.5">
              <div className="font-bold text-slate-900 dark:text-white">
                {target.passengerName} · {target.bookingCode}
              </div>
              <div className="text-slate-500">
                Nội dung <span className="font-mono font-bold">{target.reference}</span> · {formatVnd(target.amount)}
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Chỉ xác nhận sau khi đã thấy khoản <strong>{formatVnd(target.amount)}</strong> với đúng nội dung trên sao kê. Xác nhận sẽ làm vé có hiệu lực và
              tạo hóa đơn. Nếu lượt đặt đã hết hạn giữ chỗ, vé không được xuất và khoản tiền được mở yêu cầu hoàn.
            </p>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Mã giao dịch trên sao kê (khuyến nghị)</span>
              <input
                type="text"
                value={bankTxn}
                onChange={(e) => setBankTxn(e.target.value)}
                maxLength={64}
                placeholder="vd. FT26285123456"
                className={`${FILTER} w-full`}
              />
              <span className="text-slate-400">Giúp chống xác nhận trùng một khoản tiền cho hai giao dịch.</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTarget(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận đã nhận tiền'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
