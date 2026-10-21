import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { FileText, Search, Eye, Download, RefreshCw, Mail } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ApiError } from '../../api/client';
import { downloadInvoice } from '../../components/common/invoiceDownload';
import { useToast } from '../../context/ToastContext';
import {
  InvoiceDto,
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  formatVnd,
  listMyInvoices,
  sendInvoiceEmail,
} from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

const EMAIL_STATUS: Record<InvoiceDto['emailStatus'], { label: string; style: string }> = {
  Sent: { label: 'Đã gửi email', style: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  Pending: { label: 'Đang gửi email...', style: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  Failed: { label: 'Gửi email thất bại', style: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  NoAddress: { label: 'Chưa có email nhận', style: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' },
};

export const InvoicePage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detail, setDetail] = useState<InvoiceDto | null>(null);
  const { success, error: showError } = useToast();
  // Hóa đơn chưa có địa chỉ email: hỏi khách nhập địa chỉ trước khi gửi.
  const [emailTarget, setEmailTarget] = useState<InvoiceDto | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingId, setSendingId] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setInvoices(await listMyInvoices());
      setError(null);
    } catch (err) {
      if (silent) return;
      setError(err instanceof Error ? err.message : 'Không tải được danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Dữ liệu do người khác thay đổi ở máy khác thì tự cập nhật, không cần bấm tải lại.
  useAutoRefresh(() => load(true));

  // Email gửi trong nền: còn hóa đơn đang chờ gửi thì tự làm mới mỗi 5 giây cho tới khi xong.
  const hasPending = invoices.some((i) => i.emailStatus === 'Pending');
  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => {
      listMyInvoices()
        .then(setInvoices)
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [hasPending]);

  const handleSendEmail = async (inv: InvoiceDto, email?: string) => {
    setSendingId(inv.id);
    try {
      const updated = await sendInvoiceEmail(inv.id, email);
      setInvoices((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEmailTarget(null);
      setEmailInput('');
      success('Đã yêu cầu gửi hóa đơn qua email. Vui lòng kiểm tra hộp thư trong ít phút.');
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không gửi được yêu cầu gửi email.');
    } finally {
      setSendingId(null);
    }
  };

  const onSendClick = (inv: InvoiceDto) => {
    if (inv.emailStatus === 'NoAddress') {
      setEmailTarget(inv);
      setEmailInput('');
      return;
    }
    void handleSendEmail(inv);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return invoices.filter(
      (i) => !q || i.invoiceNo.toLowerCase().includes(q) || i.bookingCode.toLowerCase().includes(q) || i.routeCode.toLowerCase().includes(q),
    );
  }, [invoices, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hóa đơn điện tử"
        subtitle="Hóa đơn của các lượt thanh toán vé thành công. Tải về để in hoặc lưu trữ."
        icon={<FileText className="w-5 h-5 text-sky-500" />}
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

      <div className={`${CARD} p-4`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo số hóa đơn, mã đặt chỗ, tuyến..."
            className={`${FILTER} w-full pl-9`}
          />
        </div>
      </div>

      {loading && invoices.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có hóa đơn nào"
          description="Hóa đơn được tạo tự động sau mỗi lần thanh toán vé thành công."
          icon={<FileText className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((i) => (
            <div key={i.id} className={`${CARD} p-5 space-y-3`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono font-bold text-institutional-700 dark:text-sky-300">{i.invoiceNo}</div>
                  <div className="text-xs text-slate-500">
                    {i.bookingCode} · tuyến {i.routeCode} · ghế {i.seats.join(', ')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(i.total)}</div>
                  <div className="text-[11px] text-slate-400">{formatDateTime(i.paidAt)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${EMAIL_STATUS[i.emailStatus].style}`}>
                  {EMAIL_STATUS[i.emailStatus].label}
                  {i.emailStatus === 'Sent' && i.sentAt ? ` · ${formatDateTime(i.sentAt)}` : ''}
                </span>
                <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={sendingId === i.id || i.emailStatus === 'Pending'}
                  onClick={() => onSendClick(i)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" /> {i.emailStatus === 'Sent' ? 'Gửi lại email' : 'Gửi email'}
                </button>
                <button type="button" onClick={() => setDetail(i)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Xem
                </button>
                <button type="button" onClick={() => downloadInvoice(i)} className="px-3 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Tải hóa đơn
                </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={emailTarget !== null}
        onClose={() => setEmailTarget(null)}
        title="Nhận hóa đơn qua email"
        maxWidth="md"
      >
        {emailTarget && (
          <form
            className="space-y-4 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendEmail(emailTarget, emailInput);
            }}
          >
            <p className="text-slate-600 dark:text-slate-300">
              Tài khoản của bạn chưa có email. Nhập địa chỉ để nhận hóa đơn <strong>{emailTarget.invoiceNo}</strong>.
            </p>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="ban@example.com"
              className={`${FILTER} w-full`}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEmailTarget(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-bold">
                Hủy
              </button>
              <button
                type="submit"
                disabled={sendingId === emailTarget.id || !emailInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 disabled:opacity-60 text-white font-bold"
              >
                Gửi hóa đơn
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={`Hóa đơn ${detail?.invoiceNo ?? ''}`} maxWidth="lg">
        {detail && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            {[
              ['Khách hàng', detail.passengerName],
              ['Email', detail.email ?? '-'],
              ['Mã đặt chỗ', detail.bookingCode],
              ['Tuyến', `${detail.routeCode} - ${detail.routeName}`],
              ['Khởi hành', formatDateTime(detail.departureAt)],
              ['Ghế', detail.seats.join(', ')],
              ['Phương thức', PAYMENT_METHOD_LABEL[detail.method] ?? detail.method],
              ['Thanh toán lúc', formatDateTime(detail.paidAt)],
              ['Tổng tiền', formatVnd(detail.total)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-400 font-semibold">{k}</dt>
                <dd className="text-slate-900 dark:text-white font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
};
