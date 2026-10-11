import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Lock } from 'lucide-react';

interface Props {
  /** Chuỗi mã QR của vé từ máy chủ (Ticket.QrCode). Máy quét vé gửi đúng chuỗi này lên /api/ticket-scans. */
  value: string;
  /** Trạng thái vé trên giao diện: PAID, PENDING, USED, CANCELLED, CHANGED. */
  status: string;
  size?: number;
  className?: string;
}

/**
 * Mã QR thật của vé. Chỉ vé đã thanh toán (PAID) mới hiện mã quét được: vé đang giữ chỗ chưa quét được ở máy
 * chủ, nên hiện mã sẵn ở đó sẽ khiến khách tưởng đã có vé. Vé đã dùng, hủy hoặc đổi cũng không hiện mã, tránh
 * bị chụp lại để đưa cho người khác.
 */
export const TicketQr: React.FC<Props> = ({ value, status, size = 112, className = '' }) => {
  if (status === 'PAID' && value) {
    return (
      <div className={`inline-flex bg-white p-1.5 rounded ${className}`}>
        <QRCodeSVG value={value} size={size} level="M" marginSize={0} title="Mã QR vé xe buýt" />
      </div>
    );
  }

  const label =
    status === 'PENDING'
      ? 'Thanh toán để nhận mã QR'
      : status === 'USED'
        ? 'Vé đã sử dụng'
        : 'Vé không còn hiệu lực';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 text-center rounded border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 px-2 ${className}`}
      style={{ width: size + 12, height: size + 12 }}
    >
      <Lock className="w-6 h-6" />
      <span className="text-[10px] font-semibold leading-tight">{label}</span>
    </div>
  );
};
