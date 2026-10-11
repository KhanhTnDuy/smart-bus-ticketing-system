import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Ticket, FileText, RefreshCw } from 'lucide-react';
import { ApiError } from '../../api/client';
import {
  confirmVnPayReturn,
  formatDateTime,
  formatVnd,
  PaymentMethodCode,
  PaymentResultDto,
  startPayment,
} from '../../api/payments';
import { useToast } from '../../context/ToastContext';

/**
 * Trang khách quay về sau khi thanh toán ở cổng VNPay (ReturnUrl). Gửi nguyên query có chữ ký cho máy chủ
 * để kiểm chữ ký và chốt giao dịch; kết quả hiển thị luôn lấy từ máy chủ chứ không đọc từ URL, vì URL có thể
 * bị người dùng sửa.
 */
export const PaymentResultPage: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { error: showError, info } = useToast();

  const [result, setResult] = useState<PaymentResultDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    search ? null : 'Không có thông tin giao dịch. Hãy xem kết quả ở mục Lịch sử thanh toán.'
  );
  const [retrying, setRetrying] = useState(false);
  // StrictMode chạy effect hai lần ở dev: một lời gọi là đủ (máy chủ cũng xử lý lặp lại an toàn).
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current || !search) return;
    requested.current = true;

    confirmVnPayReturn(search)
      .then(setResult)
      .catch((err) =>
        setErrorMessage(err instanceof ApiError ? err.message : 'Không xác minh được kết quả thanh toán.')
      );
  }, [search]);

  const handleRetry = async () => {
    if (!result) return;
    setRetrying(true);
    try {
      const started = await startPayment(result.payment.bookingId, PaymentMethodCode.VnPay);
      if (started.redirected) {
        info('Đang chuyển sang cổng thanh toán VNPay...');
        return;
      }
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không thể thanh toán lại lúc này.');
    }
    setRetrying(false);
  };

  if (!result && !errorMessage) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center text-slate-600 dark:text-slate-300">
        <Loader2 className="w-10 h-10 mx-auto animate-spin text-institutional-700" />
        <p className="mt-4 font-semibold">Đang xác minh kết quả thanh toán...</p>
      </div>
    );
  }

  if (errorMessage || !result) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white dark:bg-[#131e3a] border border-rose-200 dark:border-rose-900 rounded-xl p-8 text-center shadow-sm">
        <XCircle className="w-14 h-14 mx-auto text-rose-500" />
        <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Không xác minh được giao dịch</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate('/passenger/payments')}
          className="mt-6 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-institutional-700 hover:bg-institutional-800 rounded-lg"
        >
          Xem lịch sử thanh toán
        </button>
      </div>
    );
  }

  const { success, message, payment } = result;
  // Giao dịch Success nhưng success=false nghĩa là tiền đã thu mà không xuất được vé: khoản này đang chờ hoàn.
  const awaitingRefund = !success && payment.status === 'Success';

  return (
    <div className="max-w-xl mx-auto mt-12 bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#1e2f57] rounded-xl p-8 text-center shadow-sm">
      {success ? (
        <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500" />
      ) : (
        <XCircle className={`w-14 h-14 mx-auto ${awaitingRefund ? 'text-amber-500' : 'text-rose-500'}`} />
      )}
      <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">
        {success ? 'Thanh toán thành công' : awaitingRefund ? 'Đã nhận tiền, chưa xuất được vé' : 'Thanh toán chưa thành công'}
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>

      <dl className="mt-6 text-left text-sm divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg">
        <Row label="Mã đặt chỗ" value={payment.bookingCode} mono />
        <Row label="Tuyến" value={`${payment.routeCode} · ${payment.routeName}`} />
        <Row label="Ghế" value={payment.seats.join(', ') || '-'} />
        <Row label="Số tiền" value={formatVnd(payment.amount)} />
        {payment.providerTxnId && <Row label="Mã giao dịch VNPay" value={payment.providerTxnId} mono />}
        {payment.paidAt && <Row label="Thời gian" value={formatDateTime(payment.paidAt)} />}
        {payment.invoiceNo && <Row label="Hóa đơn" value={payment.invoiceNo} mono />}
      </dl>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {success ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/passenger/tickets')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-institutional-700 hover:bg-institutional-800 rounded-lg"
            >
              <Ticket className="w-4 h-4" /> Xem vé điện tử
            </button>
            <button
              type="button"
              onClick={() => navigate('/passenger/invoices')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FileText className="w-4 h-4" /> Xem hóa đơn
            </button>
          </>
        ) : (
          <>
            {!awaitingRefund && (
              <button
                type="button"
                disabled={retrying}
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-institutional-700 hover:bg-institutional-800 disabled:opacity-60 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} /> Thanh toán lại
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(awaitingRefund ? '/passenger/payments' : '/passenger/tickets')}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {awaitingRefund ? 'Xem lịch sử thanh toán' : 'Về vé của tôi'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4 px-4 py-2.5">
    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={`font-semibold text-slate-900 dark:text-slate-100 text-right ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
);
