import { useEffect, useRef } from 'react';

const DEFAULT_POLL_MS = 15000;

/**
 * Gọi lại `refresh` định kỳ và mỗi khi người dùng quay lại tab hoặc cửa sổ.
 * Backend không có kênh đẩy, nên trang đang mở ở máy khác (tài xế, hành khách) chỉ thấy
 * chuyến quản lý vừa thêm hay đổi khi hỏi lại. `refresh` nên là lần tải im lặng, không bật vòng quay.
 */
export const useAutoRefresh = (refresh: () => void | Promise<unknown>, enabled = true, intervalMs = DEFAULT_POLL_MS) => {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      if (document.visibilityState === 'visible') void refreshRef.current();
    };
    const timer = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [enabled, intervalMs]);
};
