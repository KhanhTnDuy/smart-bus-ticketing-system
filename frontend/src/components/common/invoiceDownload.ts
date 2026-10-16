import { InvoiceDto, PAYMENT_METHOD_LABEL, formatDateTime, formatVnd } from '../../api/payments';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * Tải hóa đơn thành một tệp HTML tự chứa để khách hoặc quản trị in, lưu trữ. Dùng chung cho trang hóa đơn của
 * hành khách (/passenger/invoices) và trang hóa đơn của quản trị (/manager/invoices).
 */
export const downloadInvoice = (inv: InvoiceDto) => {
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
