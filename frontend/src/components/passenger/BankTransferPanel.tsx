import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, Landmark, Loader2 } from 'lucide-react';
import { PaymentDto, formatVnd, getPayment, parseUtc } from '../../api/payments';

interface Props {
  payment: PaymentDto;
  /** Gọi khi máy chủ báo đã nhận tiền (giao dịch Success). */
  onPaid: (payment: PaymentDto) => void;
  /** Gọi khi hết thời gian giữ chỗ mà chưa thấy tiền. */
  onExpired?: () => void;
}

const POLL_MS = 4000;

/**
 * Chuyển khoản qua mã VietQR vào tài khoản của đơn vị. Hiện mã QR (quét bằng app ngân hàng sẽ điền sẵn tài khoản, số tiền và nội dung),
 * thông tin chuyển khoản để sao chép, đồng hồ giữ chỗ, và tự hỏi máy chủ mỗi vài giây xem đã nhận tiền chưa. Nội dung chuyển khoản là
 * bắt buộc: hệ thống dựa vào đó để biết khoản tiền thuộc lượt đặt nào.
 */
export const BankTransferPanel: React.FC<Props> = ({ payment, onPaid, onExpired }) => {
  const transfer = payment.transfer;
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const finished = useRef(false);

  const expiresAt = transfer ? parseUtc(transfer.expiresAt).getTime() : 0;
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const clock = minutes + ':' + seconds;

  // Hỏi máy chủ định kỳ: quản lý xác nhận tay hoặc webhook ngân hàng sẽ đổi giao dịch sang Success.
  useEffect(() => {
    const timer = setInterval(async () => {
      const current = Date.now();
      setNow(current);
      if (finished.current) return;

      // Hết giờ giữ chỗ: báo cho trang cha (ghế đã được nhả).
      if (expiresAt > 0 && current >= expiresAt) {
        finished.current = true;
        onExpired?.();
        return;
      }

      try {
        const latest = await getPayment(payment.id);
        if (latest.status === 'Success' || latest.status === 'Refunded') {
          finished.current = true;
          onPaid(latest);
        }
      } catch {
        // Lỗi mạng tạm thời: vòng sau thử lại.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [payment.id, expiresAt, onPaid, onExpired]);

  if (!transfer) {
    return (
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
        Giao dịch này không còn chờ chuyển khoản.
      </div>
    );
  }

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      // Trình duyệt chặn clipboard: khách vẫn tự chép được.
    }
  };

  const rows: { key: string; label: string; value: string; display?: string; strong?: boolean }[] = [
    { key: 'bank', label: 'Ngân hàng', value: transfer.bankName },
    { key: 'acc', label: 'Số tài khoản', value: transfer.accountNumber, strong: true },
    { key: 'name', label: 'Chủ tài khoản', value: transfer.accountName },
    { key: 'amount', label: 'Số tiền', value: String(Math.round(transfer.amount)), display: formatVnd(transfer.amount), strong: true },
    { key: 'memo', label: 'Nội dung (bắt buộc)', value: transfer.memo, strong: true },
  ];

  const urgent = secondsLeft <= 60;

  return (
    <div className="space-y-4 text-xs">
      <div
        className={
          'flex items-center justify-between gap-3 p-3 rounded-lg border ' +
          (urgent
            ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
            : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200')
        }
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Chuyển khoản trong thời gian giữ chỗ. Hết giờ ghế sẽ được nhả cho người khác.</span>
        </div>
        <span className="font-mono font-black text-lg" aria-label="Thời gian giữ chỗ còn lại">
          {clock}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
        <div className="shrink-0 text-center">
          {qrFailed ? (
            <div className="w-56 h-56 flex items-center justify-center text-center p-4 rounded-lg border-2 border-dashed border-slate-300 text-slate-500">
              Không tải được mã QR. Hãy chuyển khoản thủ công theo thông tin bên cạnh.
            </div>
          ) : (
            <img
              src={transfer.qrUrl}
              alt="Mã VietQR chuyển khoản"
              onError={() => setQrFailed(true)}
              className="w-56 h-auto rounded-lg border border-slate-200 bg-white"
            />
          )}
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <Landmark className="w-3.5 h-3.5" /> Quét bằng app ngân hàng bất kỳ
          </p>
        </div>

        <dl className="flex-1 w-full divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 px-3 py-2">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">{r.label}</dt>
                <dd className={'font-mono ' + (r.strong ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200')}>
                  {r.display ?? r.value}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => void copy(r.key, r.value)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Sao chép"
              >
                {copied === r.key ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-900">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>
          Đang chờ nhận tiền. Chuyển <strong>đúng số tiền</strong> và <strong>đúng nội dung {transfer.memo}</strong>; vé sẽ tự có hiệu lực ngay khi hệ
          thống nhận được tiền (có thể mất vài phút nếu cần nhân viên đối soát).
        </span>
      </div>
    </div>
  );
};
