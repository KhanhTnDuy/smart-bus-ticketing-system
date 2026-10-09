import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Search, Eye, Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { InvoiceDto, PAYMENT_METHOD_LABEL, formatDateTime, formatVnd, listMyInvoices } from '../../api/payments';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** Tải hóa đơn thành một tệp HTML tự chứa để khách in hoặc lưu. */
const downloadInvoice = (inv: InvoiceDto) => {
  const rows: [string, string][] = [
    ['Số hóa đơn', inv.invoiceNo],
    ['Mã đặt chỗ', inv.bookingCode],
    ['Khách hàng', inv.passengerName],
    ['Email', inv.email ?? '-'],
    ['Tuyến', `${inv.routeCode} - ${inv.routeName}`],
    ['Khởi hành', formatDateTime(inv.departureAt)],
    ['Ghế', inv.seats.join(', ')],
    ['Phương thức', PAYMENT_METHOD_LABEL[inv.method] ?? inv.method],
    ['Thanh toán lúc', formatDateTime(inv.paidAt)],
    ['Tổng tiền', formatVnd(inv.total)],
  ];
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Hóa đơn ${escapeHtml(inv.invoiceNo)}</title>
<style>body{font-family:Arial,sans-serif;max-width:640px;margin:32px auto;color:#0f172a}h1{font-size:20px}table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b;width:38%}</style></head>
<body><h1>HÓA ĐƠN ĐIỆN TỬ VÉ XE BUÝT</h1><table>${rows
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td><b>${escapeHtml(v)}</b></td></tr>`)
    .join('')}</table></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${inv.invoiceNo}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

export const InvoicePage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detail, setDetail] = useState<InvoiceDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setInvoices(await listMyInvoices());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDetail(i)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Xem
                </button>
                <button type="button" onClick={() => downloadInvoice(i)} className="px-3 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Tải hóa đơn
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
