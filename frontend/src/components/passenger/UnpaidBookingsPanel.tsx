import React, { useEffect, useMemo, useState } from 'react';
import { Clock, CreditCard } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../api/client';
import { MyTicketDto } from '../../api/booking';
import { PAYMENT_METHOD_OPTIONS, PaymentMethodCode, formatVnd, parseUtc, payBooking } from '../../api/payments';

interface UnpaidBooking {
  bookingId: number;
  bookingCode: string;
  routeCode: string;
  departure: string;
  seats: string[];
  amount: number;
  holdExpiresAt: Date;
}

interface Props {
  tickets: MyTicketDto[];
  onPaid: () => void;
}

/**
 * Các lượt đặt đã giữ chỗ nhưng chưa thanh toán và còn trong thời hạn giữ chỗ (10 phút).
 * Hết hạn thì ghế được nhả và lượt đặt tự biến mất khỏi danh sách này.
 */
export const UnpaidBookingsPanel: React.FC<Props> = ({ tickets, onPaid }) => {
  const { success, error } = useToast();
  const [now, setNow] = useState(() => Date.now());
  const [method, setMethod] = useState<Record<number, PaymentMethodCode>>({});
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const bookings = useMemo(() => {
    const map = new Map<number, UnpaidBooking>();
    for (const t of tickets) {
      if (t.status !== 'Held' || t.bookingStatus !== 'Pending') continue;
      const expires = parseUtc(t.holdExpiresAt);
      const existing = map.get(t.bookingId);
      if (existing) {
        existing.seats.push(t.seatCode);
      } else {
        map.set(t.bookingId, {
          bookingId: t.bookingId,
          bookingCode: t.bookingCode,
          routeCode: t.routeCode,
          departure: `${t.departureTime} ${t.departureDate}`,
          seats: [t.seatCode],
          amount: t.bookingFinalAmount,
          holdExpiresAt: expires,
        });
      }
    }
    return [...map.values()].filter((b) => b.holdExpiresAt.getTime() > now);
  }, [tickets, now]);

  if (bookings.length === 0) return null;

  const pay = async (b: UnpaidBooking) => {
    setPayingId(b.bookingId);
    try {
      const payment = await payBooking(b.bookingId, method[b.bookingId] ?? PaymentMethodCode.Momo);
      success(`Đã thanh toán ${formatVnd(payment.amount)} cho ${b.bookingCode}. Hóa đơn ${payment.invoiceNo ?? ''}.`);
      onPaid();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Thanh toán không thành công.');
      onPaid();
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {bookings.map((b) => {
        const minutes = Math.max(0, Math.ceil((b.holdExpiresAt.getTime() - now) / 60000));
        return (
          <div
            key={b.bookingId}
            className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex flex-wrap items-center gap-3 text-xs"
          >
            <div className="flex-1 min-w-[220px]">
              <div className="font-bold text-slate-900 dark:text-white">
                Chờ thanh toán · {b.bookingCode} · tuyến {b.routeCode}
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Ghế {b.seats.join(', ')} · {b.departure} · <strong>{formatVnd(b.amount)}</strong>
              </div>
              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 mt-0.5">
                <Clock className="w-3 h-3" /> Còn khoảng {minutes} phút giữ chỗ
              </div>
            </div>
            <select
              value={method[b.bookingId] ?? PaymentMethodCode.Momo}
              onChange={(e) => setMethod((m) => ({ ...m, [b.bookingId]: Number(e.target.value) }))}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white"
            >
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={payingId === b.bookingId}
              onClick={() => void pay(b)}
              className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 disabled:opacity-60 text-white font-bold rounded-lg flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              {payingId === b.bookingId ? 'Đang thanh toán...' : 'Thanh toán ngay'}
            </button>
          </div>
        );
      })}
    </div>
  );
};
