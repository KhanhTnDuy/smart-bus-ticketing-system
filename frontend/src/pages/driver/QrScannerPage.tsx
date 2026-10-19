import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Scan, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ShieldAlert, Camera } from 'lucide-react';
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
import { ApiError } from '../../api/client';
import { QrCameraScanner } from '../../components/driver/QrCameraScanner';

const CARD = 'bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm';

const RESULT_LABEL: Record<ScanResultName, string> = {
  Valid: 'Hợp lệ — Mời lên xe',
  Invalid: 'Không hợp lệ',
  AlreadyUsed: 'Đã sử dụng',
  WrongTrip: 'Sai chuyến',
  Expired: 'Hết hạn',
};

const RESULT_STYLE: Record<ScanResultName, string> = {
  Valid: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200',
  AlreadyUsed: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
  WrongTrip: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
  Expired: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200',
  Invalid: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200',
};

export const QrScannerPage: React.FC = () => {
  const { role } = useAuth();
  const { error: showError } = useToast();
  const { options: tripOptions, loading: tripsLoading, error: tripError } = useTripOptions(role);

  const [tripId, setTripId] = useState('');
  const [code, setCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [last, setLast] = useState<ScanTicketResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<TicketScanDto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanBusyRef = useRef(false);

  useEffect(() => {
    if (tripId || !tripOptions.length) return;
    // Chọn sẵn chuyến có giờ chạy gần hiện tại nhất (danh sách còn cả chuyến cũ chưa đóng), không phải chuyến đầu danh sách.
    const now = Date.now();
    const nearest = tripOptions.reduce((best, t) =>
      t.departureMs !== undefined && (best.departureMs === undefined || Math.abs(t.departureMs - now) < Math.abs(best.departureMs - now)) ? t : best);
    setTripId(String(nearest.tripId));
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
    setErrorMessage(null);
    void loadHistory();
  }, [loadHistory]);

  const submitScan = async (rawValue: string, fromCamera = false) => {
    const value = rawValue.trim();
    if (!tripId) return showError('Vui lòng chọn chuyến đang phụ trách.');
    if (!value) return showError('Vui lòng nhập hoặc quét mã QR.');
    // Camera có thể đọc ra mã mới khi lượt trước còn đang chờ máy chủ: bỏ qua thay vì gửi chồng.
    if (scanBusyRef.current) return;

    scanBusyRef.current = true;
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const res = await scanTicket(value, Number(tripId));
      setLast(res);
      setCode('');
      await loadHistory();
    } catch (err) {
      setLast(null);
      let msg = 'Không quét được vé.';
      if (err instanceof ApiError) {
        if (err.status === 403) {
          msg = err.message && !err.message.includes('HTTP 403')
            ? err.message
            : 'Nhân viên không được phân công phục vụ chuyến này.';
        } else if (err.status === 400) {
          msg = err.message && !err.message.includes('HTTP 400')
            ? err.message
            : 'Dữ liệu quét vé không hợp lệ. Vui lòng kiểm tra lại.';
        } else if (err.status === 404) {
          msg = err.message || 'Không tìm thấy chuyến hoặc dữ liệu vé.';
        } else if (err.status >= 500) {
          msg = 'Hệ thống máy chủ đang bận. Vui lòng thử lại sau.';
        } else {
          msg = err.message || `Yêu cầu thất bại (HTTP ${err.status}).`;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
      showError(msg);
    } finally {
      scanBusyRef.current = false;
      setIsScanning(false);
      // Đang quét bằng camera thì không giành focus, tránh bàn phím ảo che khung hình trên điện thoại.
      if (!fromCamera) inputRef.current?.focus();
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    void submitScan(code);
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
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white text-sm min-h-[46px]"
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
                className="w-full p-3.5 rounded-xl border-2 border-amber-400 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white font-mono text-base min-h-[50px]"
              />
            </label>

            <button
              type="submit"
              disabled={isScanning || !tripId}
              className="w-full py-3.5 px-4 min-h-[50px] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Scan className="w-5 h-5" />
              {isScanning ? 'Đang kiểm tra...' : 'Kiểm tra vé'}
            </button>
          </form>

          <div className={`${CARD} p-5 space-y-3 text-xs`}>
            <QrCameraScanner onDetect={(text) => void submitScan(text, true)} />
            {/* Lưu ý camera trên thiết bị di động */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Camera className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <span className="font-semibold">Lưu ý camera di động:</span> Trình duyệt chỉ cấp quyền camera trên kết nối HTTPS (hoặc localhost khi thử trên máy tính). Nếu không dùng được camera, phụ xe vẫn có thể dùng đầu đọc mã vạch hoặc dán/nhập mã QR vào ô phía trên.
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-5 rounded-xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-8 h-8 shrink-0 text-rose-600 dark:text-rose-400" />
                <div>
                  <div className="text-lg font-bold">Cảnh báo phân quyền & soát vé</div>
                  <div className="text-sm font-medium">{errorMessage}</div>
                </div>
              </div>
            </div>
          )}

          {last && (
            <div className={`p-5 rounded-xl border-2 ${RESULT_STYLE[last.result] || RESULT_STYLE.Invalid}`}>
              <div className="flex items-center gap-3">
                {last.accepted ? (
                  <CheckCircle2 className="w-8 h-8 shrink-0" />
                ) : last.result === 'Invalid' || last.result === 'Expired' ? (
                  <XCircle className="w-8 h-8 shrink-0" />
                ) : (
                  <AlertTriangle className="w-8 h-8 shrink-0" />
                )}
                <div>
                  <div className="text-lg font-bold">{RESULT_LABEL[last.result] || last.result}</div>
                  <div className="text-sm">{last.message || 'Đã kiểm tra mã QR.'}</div>
                </div>
              </div>
              {last.ticket && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-4 pt-4 border-t border-current/20">
                  <div>
                    <dt className="opacity-70">Hành khách</dt>
                    <dd className="font-bold">{last.ticket.passengerName || 'Hành khách'}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Ghế</dt>
                    <dd className="font-bold font-mono">{last.ticket.seatCode || '---'}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Lên xe</dt>
                    <dd className="font-bold">{last.ticket.boardStop || '---'}</dd>
                  </div>
                  <div>
                    <dt className="opacity-70">Xuống xe</dt>
                    <dd className="font-bold">{last.ticket.alightStop || '---'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="opacity-70">Mã đặt chỗ</dt>
                    <dd className="font-bold font-mono">{last.ticket.bookingCode || '---'}</dd>
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
