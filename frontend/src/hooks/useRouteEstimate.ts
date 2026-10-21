import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { estimateRoute, RouteEstimateDto } from '../api/routeManagement';

/** Trạng thái ô cự ly khi thêm hoặc sửa tuyến: chưa tính, đang tính, đã tính, lỗi, hoặc người dùng đã tự sửa tay. */
export type EstimateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: RouteEstimateDto }
  | { status: 'error'; message: string }
  | { status: 'manual' };

/**
 * Tính cự ly đường bộ giữa hai trạm qua backend. Mỗi lần gọi hủy lần gọi trước còn đang chạy, nên khi người dùng đổi
 * trạm liên tục thì chỉ kết quả của lần chọn cuối được dùng.
 */
export const useRouteEstimate = () => {
  const [state, setState] = useState<EstimateState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  /** Trả kết quả, hoặc null khi lỗi hay đã bị lần gọi mới hơn thay thế. */
  const run = useCallback(async (fromStopId: number, toStopId: number): Promise<RouteEstimateDto | null> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });
    try {
      const result = await estimateRoute(fromStopId, toStopId, controller.signal);
      if (controller.signal.aborted) return null;
      setState({ status: 'done', result });
      return result;
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return null;
      setState({
        status: 'error',
        message: err instanceof ApiError ? err.message : 'Không tính được cự ly giữa hai trạm đã chọn.',
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  const markManual = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'manual' });
  }, []);

  return { state, run, reset, markManual };
};
