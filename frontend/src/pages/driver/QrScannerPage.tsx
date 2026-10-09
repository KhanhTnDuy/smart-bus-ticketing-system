import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Scan, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { useTripOptions } from '../../hooks/useTripOptions';
import {
  ScanResultName,
  ScanTicketResponse,
  TicketScanDto,
  listScans,
  scanTicket,
  utcToLocal,
} from '../../api/operations';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';

const RESULT_LABEL: Record<ScanResultName, string> = {
  Valid: 'Hợp lệ',
  Invalid: 'Không hợp lệ',
  AlreadyUsed: 'Đã sử dụng',
  WrongTrip: 'Sai chuyến',
  Expired: 'Hết hạn',
};

const RESULT_STYLE: Record<ScanResultName, string> = {
  Valid: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200',
  AlreadyUsed: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200',
  WrongTrip: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200',
  Expired: 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200',
  Invalid: 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200',
};

export const QrScannerPage: React.FC = () => {
  const { role } = useAuth();
  const { error: showError } = useToast();
  const { options: tripOptions, loading: tripsLoading, error: tripError } = useTripOptions(role);

  const [tripId, setTripId] = useState('');
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [last, setLast] = useState<ScanTicketResponse | null>(null);
  const [history, setHistory] = useState<TicketScanDto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tripId && tripOptions[0]) setTripId(String(tripOptions[0].tripId));
  }, [tripOptions, tripId]);

  const loadHistory = useCallback(async () => {
    if (!tripId) {
      setHistory([]);
      return;
    }
    try {
      setHistory(await listScans(Number(tripId)));
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Không tải được lịch sử quét.');
    }
  }, [tripId, showError]);

  useEffect(() => {
    setLast(null);
    void loadHistory();
  }, [loadHistory]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!tripId) return showError('Vui lòng chọn chuyến đang phụ trách.');
    if (!value) return showError('Vui lòng nhập hoặc quét mã QR.');

    setIsScanning(true);
    try {
      setLast(await scanTicket(value, Number(tripId)));
      setCode('');
      await loadHistory();
    } catch (err) {
      setLast(null);
      showError(err instanceof Error ? err.message : 'Không quét được vé.');
    } finally {
      setIsScanning(false);
      inputRef.current?.focus();
    }
  };

  const validCount = history.filter((h) => h.result === 'Valid').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quét mã QR vé xe"
        subtitle="Soát vé hành khách lên xe. Vé hợp lệ được đánh dấu đã sử dụng ngay trong hệ thống."
        icon={<Scan className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Tài xế & Soát vé' }, { label: 'Quét QR vé' }]}
      />

      {tripError && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          Không tải được danh sách chuyến: {tripError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleScan} className={`${CARD} p-5 space-y-4 text-xs`}>
            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Chuyến đang soát vé</span>
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white"
              >
                <option value="">-- Chọn chuyến --</option>
                {tripOptions.map((t) => (
                  <option key={t.tripId} value={String(t.tripId)}>
                    {t.label}
                  </option>
                ))}
              </select>
              {!tripsLoading && tripOptions.length === 0 && (
                <span className="text-[11px] text-amber-600">Bạn chưa được phân công chuyến nào để soát vé.</span>
              )}
            </label>

            <label className="space-y-1 block">
              <span className="font-bold text-slate-700 dark:text-slate-300">Mã QR của vé</span>
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Quét bằng đầu đọc mã vạch hoặc dán mã QR rồi nhấn Enter"
                className="w-full p-3 rounded-lg border-2 border-amber-400 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-mono"
              />
            </label>

            <button
              type="submit"
              disabled={isScanning || !tripId}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-lg flex items-center justify-center gap-2"
            >
              <Scan className="w-4 h-4" />
              {isScanning ? 'Đang kiểm tra...' : 'Kiểm tra vé'}
            </button>
          </form>

          {last && (
            <div className={`p-5 rounded-xl border-2 ${RESULT_STYLE[last.result]}`}>
              <div className="flex items-center gap-3">
                {last.accepted ? (
                  <CheckCircle2 className="w-8 h-8 shrink-0" />
                ) : last.result === 'Invalid' || last.result === 'Expired' ? (
                  <XCircle className="w-8 h-8 shrink-0" />
                ) : (
                  <AlertTriangle className="w-8 h-8 shrink-0" />
                )}
                <div>
                  <div className="text-lg font-bold">{RESULT_LABEL[last.result]}</div>
                  <div className="text-sm">{last.message}</div>
                </div>
              </div>
              {last.ticket && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-4 pt-4 border-t border-current/20">
                  <div>
                    <dt className="opacity-70">Hành khách</dt>
                    <dd className="font-bold">{last.ticket.passengerName}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Ghế</dt>
                    <dd className="font-bold font-mono">{last.ticket.seatCode}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Lên xe</dt>
                    <dd className="font-bold">{last.ticket.boardStop}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Xuống xe</dt>
                    <dd className="font-bold">{last.ticket.alightStop}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="opacity-70">Mã đặt chỗ</dt>
                    <dd className="font-bold font-mono">{last.ticket.bookingCode}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className={`${CARD} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Lịch sử quét ({history.length}) · {validCount} hợp lệ
              </h3>
              <button type="button" onClick={() => void loadHistory()} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Tải lại">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">Chưa có lượt quét nào cho chuyến này.</div>
            ) : (
              <ul className="space-y-2 max-h-[480px] overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {h.passengerName ?? 'Mã không xác định'}
                        {h.seatCode ? ` · ${h.seatCode}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {utcToLocal(h.scannedAt).toLocaleTimeString('vi-VN', { hour12: false })}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${RESULT_STYLE[h.result]}`}>{RESULT_LABEL[h.result]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
