import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Search, Eye, Download, RefreshCw, Mail, Scale } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { downloadInvoice } from '../../components/common/invoiceDownload';
import { useToast } from '../../context/ToastContext';
import {
  InvoiceDto,
  InvoiceFilters,
  InvoiceSummaryDto,
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  formatVnd,
  getInvoiceSummary,
  listAllInvoices,
  sendInvoiceEmail,
} from '../../api/payments';
import { RouteDto, listRoutes } from '../../api/routeManagement';
import { revenueReportApi } from '../../api/revenueReport';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';
const FILTER =
  'py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';

const EMAIL_STATUS: Record<InvoiceDto['emailStatus'], { label: string; style: string }> = {
  Sent: { label: 'Đã gửi email', style: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  Pending: { label: 'Đang gửi email...', style: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  Failed: { label: 'Gửi email thất bại', style: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  NoAddress: { label: 'Chưa có email nhận', style: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' },
};

const METHODS = ['ALL', 'Momo', 'VnPay', 'ZaloPay', 'BankTransfer'];

const EMPTY_FILTERS: InvoiceFilters = { from: '', to: '', routeId: 'ALL', method: 'ALL', emailStatus: 'ALL', search: '' };

/**
 * Trang hóa đơn cho quản trị (SCRUM-99): xem và lọc toàn bộ hóa đơn, tải về, gửi lại email.
 *
 * Bộ lọc kỳ dùng **ngày khởi hành của chuyến**, đúng mốc mà báo cáo doanh thu dùng, nên tổng tiền hóa đơn đối
 * chiếu thẳng được với doanh thu cùng kỳ; trang lấy cả hai số và báo ngay khi lệch.
 */
export const InvoiceManagementPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [summary, setSummary] = useState<InvoiceSummaryDto | null>(null);
  const [revenueGross, setRevenueGross] = useState<number | null>(null);
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDto | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const { success, error: showError } = useToast();

  const [filters, setFilters] = useState<InvoiceFilters>(EMPTY_FILTERS);
  // Chỉ gửi bộ lọc lên máy chủ khi bấm "Lọc", tránh gọi API theo từng phím gõ.
  const [applied, setApplied] = useState<InvoiceFilters>(EMPTY_FILTERS);

  useEffect(() => {
    const c = new AbortController();
    listRoutes(c.signal).then(setRoutes).catch(() => setRoutes([]));
    return () => c.abort();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([listAllInvoices(applied), getInvoiceSummary(applied)]);
      setInvoices(list);
      setSummary(sum);

      // Doanh thu cùng kỳ, cùng tuyến để đối chiếu. Lỗi ở đây không được làm hỏng danh sách hóa đơn.
      try {
        const report = await revenueReportApi.getRevenueReport({
          startDate: applied.from || undefined,
          endDate: applied.to || undefined,
          routeId: applied.routeId,
          groupBy: 'DAILY',
        });
        setRevenueGross(report.summary?.totalGross ?? null);
      } catch {
        setRevenueGross(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách hóa đơn.');
      setInvoices([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { void load(); }, [load]);

  const resend = async (inv: InvoiceDto) => {
    setSendingId(inv.id);
    try {
      await sendInvoiceEmail(inv.id);
      success(`Đã xếp hàng gửi lại hóa đơn ${inv.invoiceNo}.`);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không gửi lại được hóa đơn.');
    } finally {
      setSendingId(null);
    }
  };

  // Chỉ đối chiếu khi cả hai số cùng sẵn sàng và bộ lọc không cắt bớt hóa đơn theo tiêu chí mà báo cáo
  // doanh thu không có (phương thức, tình trạng email, từ khóa).
  const comparable = summary !== null && revenueGross !== null
    && (!applied.method || applied.method === 'ALL')
    && (!applied.emailStatus || applied.emailStatus === 'ALL')
    && !applied.search?.trim();
  const matches = comparable && Math.abs(summary!.total - revenueGross!) < 1;

  const periodLabel = useMemo(() => {
    if (!applied.from && !applied.to) return 'toàn bộ thời gian';
    return `${applied.from || '…'} → ${applied.to || '…'}`;
  }, [applied]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hóa Đơn Điện Tử"
        subtitle="Toàn bộ hóa đơn của các giao dịch thanh toán thành công. Lọc theo kỳ, tuyến, phương thức và tình trạng gửi email."
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Quản lý' }, { label: 'Hóa đơn' }]}
        icon={<FileText className="w-5 h-5 text-sky-500" />}
      />

      <div className={`${CARD} p-4 space-y-3`}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Từ ngày khởi hành</span>
            <input type="date" className={`${FILTER} w-full`} value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Đến ngày khởi hành</span>
            <input type="date" className={`${FILTER} w-full`} value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Tuyến</span>
            <select className={`${FILTER} w-full`} value={filters.routeId ?? 'ALL'}
              onChange={(e) => setFilters((f) => ({ ...f, routeId: e.target.value }))}>
              <option value="ALL">Tất cả tuyến</option>
              {routes.map((r) => <option key={r.id} value={String(r.id)}>{r.code}: {r.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Phương thức</span>
            <select className={`${FILTER} w-full`} value={filters.method ?? 'ALL'}
              onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}>
              {METHODS.map((m) => <option key={m} value={m}>{m === 'ALL' ? 'Tất cả' : PAYMENT_METHOD_LABEL[m] ?? m}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Gửi email</span>
            <select className={`${FILTER} w-full`} value={filters.emailStatus ?? 'ALL'}
              onChange={(e) => setFilters((f) => ({ ...f, emailStatus: e.target.value }))}>
              <option value="ALL">Tất cả</option>
              <option value="Sent">Đã gửi</option>
              <option value="Pending">Đang gửi</option>
              <option value="Failed">Thất bại</option>
              <option value="NoAddress">Chưa có email</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Tìm kiếm</span>
            <input type="text" placeholder="Số hóa đơn, mã đặt chỗ, tên khách" className={`${FILTER} w-full`}
              value={filters.search ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') setApplied({ ...filters }); }} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setApplied({ ...filters })}
            className="px-4 py-2 rounded-lg bg-institutional-700 hover:bg-institutional-800 text-white text-xs font-bold flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Lọc
          </button>
          <button type="button" onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); }}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
            Bỏ lọc
          </button>
          <button type="button" onClick={() => void load()}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Tải lại
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] uppercase font-bold text-slate-500">Số hóa đơn ({periodLabel})</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{summary?.count ?? '—'}</div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] uppercase font-bold text-slate-500">Tổng tiền hóa đơn</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{summary ? formatVnd(summary.total) : '—'}</div>
        </div>
        <div className={`${CARD} p-4`}>
          <div className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> Đối chiếu doanh thu
          </div>
          {!comparable ? (
            <div className="text-xs text-slate-500 pt-1">
              {revenueGross === null ? 'Chưa lấy được báo cáo doanh thu.' : 'Bỏ lọc phương thức, email và từ khóa để đối chiếu.'}
            </div>
          ) : (
            <div className={`text-sm font-bold pt-1 ${matches ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {matches ? 'Khớp doanh thu cùng kỳ' : 'Lệch so với doanh thu'}
              <div className="text-[11px] font-medium text-slate-500">Doanh thu gộp: {formatVnd(revenueGross!)}</div>
            </div>
          )}
        </div>
      </div>

      <div className={CARD}>
        {loading ? (
          <div className="text-center text-xs text-slate-400 py-10">Đang tải dữ liệu...</div>
        ) : error ? (
          <div className="p-4 text-xs text-rose-600 dark:text-rose-300">Không tải được dữ liệu từ máy chủ: {error}</div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={<FileText className="w-6 h-6" />} title="Chưa có hóa đơn nào"
            description="Không có hóa đơn nào khớp bộ lọc hiện tại." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-[#0c162d] text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="text-left p-3">Số hóa đơn</th>
                  <th className="text-left p-3">Khách hàng</th>
                  <th className="text-left p-3">Tuyến</th>
                  <th className="text-left p-3">Khởi hành</th>
                  <th className="text-left p-3">Phương thức</th>
                  <th className="text-right p-3">Tổng tiền</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-right p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{i.invoiceNo}</td>
                    <td className="p-3">{i.passengerName}</td>
                    <td className="p-3">{i.routeCode}</td>
                    <td className="p-3 font-mono">{formatDateTime(i.departureAt)}</td>
                    <td className="p-3">{PAYMENT_METHOD_LABEL[i.method] ?? i.method}</td>
                    <td className="p-3 text-right font-bold">{formatVnd(i.total)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${EMAIL_STATUS[i.emailStatus].style}`}>
                        {EMAIL_STATUS[i.emailStatus].label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => setDetail(i)} title="Xem chi tiết"
                          className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => downloadInvoice(i)} title="Tải hóa đơn"
                          className="px-2 py-1.5 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => void resend(i)} disabled={sendingId === i.id || i.emailStatus === 'NoAddress'}
                          title={i.emailStatus === 'NoAddress' ? 'Hóa đơn chưa có địa chỉ email' : 'Gửi lại email'}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40">
                          <Mail className="w-3.5 h-3.5" />
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

      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={`Hóa đơn ${detail?.invoiceNo ?? ''}`}>
        {detail && (
          <div className="space-y-2 text-xs">
            {([
              ['Mã đặt chỗ', detail.bookingCode],
              ['Khách hàng', detail.passengerName],
              ['Email', detail.email || '—'],
              ['Tuyến', `${detail.routeCode} - ${detail.routeName}`],
              ['Khởi hành', formatDateTime(detail.departureAt)],
              ['Ghế', detail.seats.join(', ')],
              ['Phương thức', PAYMENT_METHOD_LABEL[detail.method] ?? detail.method],
              ['Thanh toán lúc', formatDateTime(detail.paidAt)],
              ['Tổng tiền', formatVnd(detail.total)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-slate-500">{k}</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">{v}</span>
              </div>
            ))}
            <button type="button" onClick={() => downloadInvoice(detail)}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-bold flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Tải hóa đơn
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
