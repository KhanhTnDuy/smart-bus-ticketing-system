import React, { useState } from 'react';
import {
  QrCode,
  Scan,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Bus,
  MapPin,
  Check,
  RefreshCw,
  Search,
  Sparkles,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Ticket } from '../../types';

interface ScanHistoryEntry {
  id: string;
  time: string;
  qrCode: string;
  status: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'INVALID';
  message: string;
  ticket?: Ticket;
}

export const QrScannerPage: React.FC = () => {
  const { tickets, routes, scanQrCode } = useData();
  const { success, error, warning } = useToast();

  const [inputCode, setInputCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'INVALID' | null;
    message: string;
    ticket?: Ticket;
  } | null>(null);

  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);

  const handleScan = (codeToScan: string) => {
    if (!codeToScan.trim()) {
      error('Vui lòng nhập mã QR để quét kiểm tra');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    // Realistic scan delay (500ms)
    setTimeout(() => {
      const result = scanQrCode(codeToScan.trim());
      setIsScanning(false);

      const entry: ScanHistoryEntry = {
        id: 'SCAN-' + Date.now(),
        time: new Date().toLocaleTimeString('vi-VN'),
        qrCode: codeToScan.trim(),
        status: result.status,
        message: result.message,
        ticket: result.ticket,
      };

      setScanResult({
        status: result.status,
        message: result.message,
        ticket: result.ticket,
      });

      setScanHistory((prev) => [entry, ...prev.slice(0, 9)]);

      if (result.status === 'VALID') {
        success(result.message, 'Hợp lệ');
      } else if (result.status === 'ALREADY_USED') {
        warning(result.message, 'Cảnh báo');
      } else {
        error(result.message, 'Không hợp lệ');
      }
    }, 450);
  };

  const getRouteName = (routeId?: string) => {
    if (!routeId) return '';
    const r = routes.find((item) => item.id === routeId);
    return r ? `${r.code || r.routeCode} - ${r.name}` : routeId;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quét & Kiểm Tra Mã QR Vé Xe"
        subtitle="Hệ thống mô phỏng kiểm soát vé hành khách lên xe, xác thực tính hợp lệ và ghi nhận lượt đi theo thời gian thực"
        icon={<Scan className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Tài xế & Soát vé' },
          { label: 'Quét QR vé' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: QR Scanner Viewfinder & Input Simulator (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Simulated Camera Viewfinder Container */}
          <div className="bg-slate-900 dark:bg-[#071026] rounded-2xl border-2 border-slate-700 dark:border-[#1e2f57] p-6 text-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[380px]">
            
            {/* Background Grid Accent */}
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
            </div>

            {/* Viewfinder Frame with animated scan line */}
            <div className="relative w-64 h-64 border-2 border-white/20 rounded-2xl flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl -translate-x-1 -translate-y-1" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl translate-x-1 -translate-y-1" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl -translate-x-1 translate-y-1" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl translate-x-1 translate-y-1" />

              {/* Laser Scan Line */}
              {isScanning ? (
                <div className="absolute left-2 right-2 h-1 bg-red-500 shadow-[0_0_15px_#ef4444] animate-bounce z-20" />
              ) : (
                <div className="absolute left-2 right-2 h-0.5 bg-emerald-400/80 shadow-[0_0_10px_#34d399] animate-pulse z-20" />
              )}

              {/* Central Target / QR Mock */}
              <div className="flex flex-col items-center justify-center text-center p-4">
                <QrCode
                  className={`w-28 h-28 transition-transform ${
                    isScanning ? 'scale-110 text-amber-400 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span className="text-[11px] font-mono text-slate-300 mt-2">
                  {isScanning ? 'ĐANG QUÉT MÃ QR...' : 'HƯỚNG CAMERA VÀO MÃ QR'}
                </span>
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chế độ kiểm vé tự động: Tiêu chuẩn mã hóa SmartBus-2026</span>
            </div>
          </div>

          {/* Preset Test Scenarios (Quick Simulation Buttons) */}
          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Tình Huống Kiểm Thử Mô Phỏng (Test Presets)
              </span>
              <span className="text-[10px] text-slate-400">Chọn để kiểm tra ngay</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  const val = 'SMARTBUS-TKT-2026-001-A2-VALID';
                  setInputCode(val);
                  handleScan(val);
                }}
                className="p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>1. Vé hợp lệ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const val = 'SMARTBUS-TKT-2026-003-A4-USED';
                  setInputCode(val);
                  handleScan(val);
                }}
                className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>2. Đã sử dụng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const val = 'SMARTBUS-TKT-2026-004-CANCELLED';
                  setInputCode(val);
                  handleScan(val);
                }}
                className="p-2.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-100 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <XCircle className="w-4 h-4 text-red-600" />
                <span>3. Vé đã hủy</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const val = 'FAKE-QR-CODE-INVALID-999';
                  setInputCode(val);
                  handleScan(val);
                }}
                className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition-colors flex flex-col items-center gap-1 text-center"
              >
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <span>4. Mã không tồn tại</span>
              </button>
            </div>
          </div>

          {/* Manual Input Search Box */}
          <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Hoặc nhập mã vé / chuỗi ký tự QR thủ công:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="VD: SMARTBUS-TKT-2026-001-A2-VALID hoặc TKT-2026-001..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan(inputCode)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleScan(inputCode)}
                disabled={isScanning || !inputCode.trim()}
                className="px-5 py-2.5 bg-institutional-600 hover:bg-institutional-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Scan className="w-4 h-4" />
                <span>Quét vé</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result & Live Shift History (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Active Scan Result Card */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
            <div className="p-3.5 bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>KẾT QUẢ XÁC THỰC VÉ</span>
              {scanResult && (
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date().toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>

            <div className="p-5">
              {!scanResult ? (
                <div className="text-center py-10 space-y-2 text-slate-400 text-xs">
                  <Scan className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 animate-pulse" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">
                    Chưa quét vé nào
                  </p>
                  <p className="text-[11px]">
                    Sử dụng các nút tình huống mô phỏng hoặc nhập mã QR để bắt đầu kiểm tra.
                  </p>
                </div>
              ) : scanResult.status === 'VALID' ? (
                /* VALID RESULT */
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 rounded-xl text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                      <Check className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      VÉ HỢP LỆ — CHO PHÉP LÊN XE
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400">
                      {scanResult.message}
                    </div>
                  </div>

                  {scanResult.ticket && (
                    <div className="bg-slate-50 dark:bg-[#0c162d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500">Mã vé:</span>
                        <span className="font-mono font-bold text-institutional-600 dark:text-sky-400">
                          {scanResult.ticket.id}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500">Hành khách:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {scanResult.ticket.passengerName}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500">Tuyến xe:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {getRouteName(scanResult.ticket.routeId)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2 items-center">
                        <span className="text-slate-500">Vị trí ghế:</span>
                        <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black text-sm rounded shadow-sm">
                          {scanResult.ticket.seatNumber}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-slate-500">Biển kiểm soát:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {scanResult.ticket.busPlate}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Giá cước đã thanh toán:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {scanResult.ticket.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : scanResult.status === 'ALREADY_USED' ? (
                /* ALREADY USED RESULT */
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 rounded-xl text-center space-y-2">
                    <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-md">
                      <Clock className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                      VÉ ĐÃ SỬ DỤNG TRƯỚC ĐÓ
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400">
                      {scanResult.message}
                    </div>
                  </div>

                  {scanResult.ticket && (
                    <div className="bg-slate-50 dark:bg-[#0c162d] p-3 rounded-lg border text-xs space-y-1">
                      <div>Mã vé: <strong>{scanResult.ticket.id}</strong></div>
                      <div>Hành khách: <strong>{scanResult.ticket.passengerName}</strong></div>
                      <div>Ghế: <strong>{scanResult.ticket.seatNumber}</strong></div>
                    </div>
                  )}
                </div>
              ) : (
                /* CANCELLED OR INVALID RESULT */
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-xl text-center space-y-2">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                      <XCircle className="w-7 h-7" />
                    </div>
                    <div className="text-sm font-black text-red-700 dark:text-red-300 uppercase tracking-wide">
                      {scanResult.status === 'CANCELLED' ? 'VÉ NÀY ĐÃ BỊ HỦY' : 'MÃ QR KHÔNG HỢP LỆ'}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {scanResult.message}
                    </div>
                  </div>

                  {scanResult.ticket && (
                    <div className="bg-slate-50 dark:bg-[#0c162d] p-3 rounded-lg border text-xs space-y-1">
                      <div>Mã vé: <strong>{scanResult.ticket.id}</strong></div>
                      <div>Lý do hủy: <strong className="text-red-500">{scanResult.ticket.cancelReason || 'Hành khách yêu cầu hủy vé'}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Shift Scans History List */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
                <span>Nhật Ký Quét Vé Ca Trực</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {scanHistory.length} lượt quét
              </span>
            </div>

            {scanHistory.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                Chưa có lượt quét nào trong phiên làm việc này.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                {scanHistory.map((entry) => (
                  <div key={entry.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#162344] transition-colors">
                    <div className="space-y-0.5">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {entry.ticket?.id || entry.qrCode}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {entry.ticket?.passengerName ? `${entry.ticket.passengerName} (Ghế ${entry.ticket.seatNumber})` : 'Mã không xác định'}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.status === 'VALID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : entry.status === 'ALREADY_USED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {entry.status === 'VALID'
                          ? 'Hợp lệ'
                          : entry.status === 'ALREADY_USED'
                          ? 'Đã quét'
                          : entry.status === 'CANCELLED'
                          ? 'Đã hủy'
                          : 'Không hợp lệ'}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400">{entry.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
