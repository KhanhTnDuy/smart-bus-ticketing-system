import React, { useEffect, useState } from 'react';
import { listMyTickets, MyTicketDto } from '../../api/booking';
import { TicketQr } from './TicketQr';

interface Props {
  bookingId: number;
}

/** Trạng thái vé của máy chủ sang trạng thái dùng ở TicketQr. */
const uiStatus = (status: string): string => {
  switch (status) {
    case 'Valid':
      return 'PAID';
    case 'Used':
      return 'USED';
    case 'Held':
      return 'PENDING';
    default:
      return 'CANCELLED';
  }
};

/**
 * Mã QR của các vé trong một lượt đặt, hiện ngay sau khi thanh toán xong để khách có thể đưa cho tài xế quét mà
 * không phải mở lại mục Vé điện tử. Mã lấy từ máy chủ nên chỉ hiện đúng cho vé đã thanh toán (Valid).
 */
export const PaidTicketQrs: React.FC<Props> = ({ bookingId }) => {
  const [tickets, setTickets] = useState<MyTicketDto[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    listMyTickets(controller.signal)
      .then((all) => setTickets(all.filter((t) => t.bookingId === bookingId)))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [bookingId]);

  if (failed) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Chưa tải được mã QR. Bạn có thể xem lại ở mục Vé điện tử.
      </p>
    );
  }
  if (!tickets) {
    return <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Đang tạo mã QR vé...</p>;
  }
  if (tickets.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        Mã QR lên xe — đưa cho tài xế hoặc phụ xe quét
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {tickets.map((t) => (
          <div key={t.ticketId} className="flex flex-col items-center gap-1.5">
            <TicketQr value={t.qrCode} status={uiStatus(t.status)} size={150} className="border border-slate-200 shadow-sm" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Ghế {t.seatCode}</span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{t.bookingCode}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
