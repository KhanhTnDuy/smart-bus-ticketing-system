import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff } from 'lucide-react';

interface Props {
  /** Gọi mỗi khi đọc được một mã QR mới. Cùng một mã còn nằm trong khung hình thì không gọi lại. */
  onDetect: (text: string) => void;
}

const SCAN_INTERVAL_MS = 120;
/** Mã đã đọc phải rời khung hình ít nhất chừng này thì lần thấy sau mới tính là một lượt quét mới. */
const REPEAT_GUARD_MS = 4000;
/** Thu nhỏ khung hình trước khi giải mã: đủ nét cho QR của vé mà vẫn nhẹ cho điện thoại cấu hình thấp. */
const MAX_FRAME_WIDTH = 640;

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Trình duyệt đã chặn quyền dùng camera. Hãy cho phép camera cho trang này rồi bấm bật lại.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Không tìm thấy camera trên thiết bị này. Có thể dùng đầu đọc mã vạch hoặc dán mã vào ô bên trên.';
  }
  if (name === 'NotReadableError') {
    return 'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
  }
  return 'Không mở được camera. Hãy thử lại hoặc dùng ô nhập mã bên trên.';
}

/**
 * Quét mã QR vé bằng camera thiết bị (ưu tiên camera sau). Trình duyệt chỉ cấp camera trên HTTPS hoặc localhost.
 * Giải mã bằng jsQR trên canvas nên chạy được cả trình duyệt chưa có BarcodeDetector.
 */
export const QrCameraScanner: React.FC<Props> = ({ onDetect }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSeenRef = useRef<{ text: string; at: number } | null>(null);
  const onDetectRef = useRef(onDetect);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    lastSeenRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? 'Trình duyệt này không hỗ trợ truy cập camera.'
          : 'Trình duyệt chỉ cho mở camera trên kết nối HTTPS hoặc localhost.',
      );
      return;
    }
    setStarting(true);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setActive(true);
    } catch (err) {
      setError(cameraErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    void video.play().catch(() => undefined);

    const timer = window.setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || video.readyState < 2 || !video.videoWidth) return;
      const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
      if (!found?.data) return;

      const now = Date.now();
      const last = lastSeenRef.current;
      const isRepeat = last !== null && last.text === found.data && now - last.at < REPEAT_GUARD_MS;
      lastSeenRef.current = { text: found.data, at: now };
      if (isRepeat) return;
      navigator.vibrate?.(80);
      onDetectRef.current(found.data);
    }, SCAN_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      video.srcObject = null;
    };
  }, [active]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={active ? stop : () => void start()}
        disabled={starting}
        className={`w-full py-3 px-4 min-h-[46px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-colors disabled:opacity-60 ${
          active
            ? 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            : 'border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
        }`}
      >
        {active ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
        {starting ? 'Đang mở camera...' : active ? 'Tắt camera' : 'Bật camera quét vé'}
      </button>

      {error && (
        <div className="p-3 rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className={active ? 'relative overflow-hidden rounded-xl bg-black aspect-[4/3]' : 'hidden'}>
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-amber-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        <div className="absolute bottom-2 inset-x-0 text-center text-[11px] font-semibold text-white/90">
          Đưa mã QR của vé vào khung để quét
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
