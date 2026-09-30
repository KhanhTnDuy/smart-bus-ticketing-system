/**
 * US3 - Nguồn dữ liệu thật cho ba trang quản lý tuyến đường, trạm dừng và giá vé.
 *
 * Hook này thay thế useData() (mockData) ở ba trang đó. Các hàm thao tác giữ đúng
 * chữ ký { success, message } mà các trang đang dùng, chỉ khác là trả về Promise
 * nên chỗ gọi cần await.
 *
 * Ràng buộc từ backend mà giao diện phải tôn trọng:
 * - PUT /api/routes/{id}/stops yêu cầu tối thiểu 2 trạm cho một tuyến, nên không
 *   thể thêm trạm đầu tiên riêng lẻ, cũng không thể xoá xuống còn 1 trạm.
 * - minutesFromStart phải không giảm theo thứ tự trạm. Form không thu thập trường
 *   này, nên trạm thêm mới được gán mốc thời gian sau trạm cuối một khoảng mặc định.
 * - Thêm / sửa / xoá đều cần vai trò Admin hoặc Manager, kèm JWT hợp lệ.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusRoute, BusStop, Fare, PassengerType } from '../types';
import { ApiError } from '../api/client';
import * as rm from '../api/routeManagement';
import {
  RouteFormValues,
  codeFromPassengerType,
  ticketTypeFor,
  toBusRoute,
  toBusStops,
  toFare,
  toRouteRequest,
} from '../api/mappers';

/** Khoảng thời gian mặc định (phút) giữa trạm cuối hiện tại và trạm vừa thêm. */
const DEFAULT_MINUTES_BETWEEN_STOPS = 5;

export interface MutationResult {
  success: boolean;
  message?: string;
}

export interface StopFormValues {
  name: string;
  routeId: string;
  latitude?: number;
  longitude?: number;
}

export interface FareFormValues {
  routeId: string;
  passengerType: PassengerType;
  price: number;
  effectiveDate: string;
}

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

export const useRouteManagement = () => {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [fares, setFares] = useState<Fare[]>([]);
  const [passengerTypes, setPassengerTypes] = useState<rm.PassengerTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Giữ nguyên bản DTO của trạm theo tuyến để không mất minutesFromStart khi
  // sắp xếp lại hoặc gỡ trạm (kiểu BusStop của frontend không có trường này).
  const routeStopsRef = useRef<Map<string, rm.RouteStopDto[]>>(new Map());

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [routeDtos, fareDtos, types] = await Promise.all([
        rm.listRoutes(signal),
        rm.listFares(undefined, signal),
        rm.listPassengerTypes(signal),
      ]);

      // Trạm phải lấy theo từng tuyến vì thứ tự dừng nằm ở bảng route_stops.
      const perRoute = await Promise.all(
        routeDtos.map(async (route) => ({
          routeId: String(route.id),
          dtos: await rm.listRouteStops(route.id, signal),
        })),
      );

      const map = new Map<string, rm.RouteStopDto[]>();
      const allStops: BusStop[] = [];
      perRoute.forEach(({ routeId, dtos }) => {
        const ordered = [...dtos].sort((a, b) => a.stopOrder - b.stopOrder);
        map.set(routeId, ordered);
        allStops.push(...toBusStops(ordered, routeId));
      });
      routeStopsRef.current = map;

      setRoutes(routeDtos.map(toBusRoute));
      setStops(allStops);
      setFares(fareDtos.map(toFare));
      setPassengerTypes(types);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(describe(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  /** Chạy một thao tác ghi rồi tải lại dữ liệu để giao diện khớp với cơ sở dữ liệu. */
  const mutate = useCallback(
    async (action: () => Promise<unknown>): Promise<MutationResult> => {
      try {
        await action();
        await load();
        return { success: true };
      } catch (err) {
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  // ---------- Tuyến đường ----------

  const addRoute = useCallback(
    (form: RouteFormValues) => mutate(() => rm.createRoute(toRouteRequest(form))),
    [mutate],
  );

  const updateRoute = useCallback(
    (id: string, form: RouteFormValues) => mutate(() => rm.updateRoute(Number(id), toRouteRequest(form))),
    [mutate],
  );

  const deleteRoute = useCallback((id: string) => mutate(() => rm.deleteRoute(Number(id))), [mutate]);

  // ---------- Trạm dừng theo tuyến ----------

  const currentRouteStops = useCallback(
    (routeId: string): rm.RouteStopDto[] => routeStopsRef.current.get(routeId) ?? [],
    [],
  );

  const asItems = (dtos: rm.RouteStopDto[]): rm.RouteStopItem[] =>
    dtos.map((s) => ({ stopId: s.stopId, minutesFromStart: s.minutesFromStart }));

  const addStop = useCallback(
    async (form: StopFormValues): Promise<MutationResult> => {
      const routeId = form.routeId;
      if (!routeId) return { success: false, message: 'Vui lòng chọn tuyến đường liên kết.' };

      const existing = currentRouteStops(routeId);
      const lastMinutes = existing.length ? existing[existing.length - 1].minutesFromStart : 0;

      try {
        const created = await rm.createStop({
          name: form.name.trim(),
          latitude: Number(form.latitude ?? 0),
          longitude: Number(form.longitude ?? 0),
        });

        const items: rm.RouteStopItem[] = [
          ...asItems(existing),
          {
            stopId: created.id,
            minutesFromStart: existing.length ? lastMinutes + DEFAULT_MINUTES_BETWEEN_STOPS : 0,
          },
        ];

        if (items.length < 2) {
          await load();
          return {
            success: false,
            message:
              'Backend yêu cầu mỗi tuyến có tối thiểu 2 trạm. Trạm đã được tạo trong danh mục, ' +
              'hãy thêm tiếp một trạm nữa để gán vào tuyến.',
          };
        }

        await rm.replaceRouteStops(Number(routeId), items);
        await load();
        return { success: true };
      } catch (err) {
        await load();
        return { success: false, message: describe(err) };
      }
    },
    [currentRouteStops, load],
  );

  const updateStop = useCallback(
    (id: string, updates: Partial<BusStop>): Promise<MutationResult> => {
      const current = stops.find((s) => s.id === id);
      return mutate(() =>
        rm.updateStop(Number(id), {
          name: (updates.name ?? current?.name ?? '').trim(),
          latitude: Number(updates.latitude ?? current?.latitude ?? 0),
          longitude: Number(updates.longitude ?? current?.longitude ?? 0),
        }),
      );
    },
    [mutate, stops],
  );

  /**
   * Gỡ trạm khỏi tuyến. Sau đó thử xoá luôn khỏi danh mục dùng chung; nếu trạm còn
   * thuộc tuyến khác hoặc đã có vé phát hành thì backend từ chối và trạm được giữ lại.
   */
  const deleteStop = useCallback(
    async (id: string): Promise<MutationResult> => {
      const target = stops.find((s) => s.id === id);
      if (!target) return { success: false, message: 'Không tìm thấy trạm dừng.' };

      const remaining = currentRouteStops(target.routeId).filter((s) => String(s.stopId) !== id);
      if (remaining.length < 2) {
        return {
          success: false,
          message:
            'Mỗi tuyến phải còn tối thiểu 2 trạm. Hãy thêm trạm thay thế trước khi gỡ trạm này, ' +
            'hoặc xoá cả tuyến nếu không còn dùng.',
        };
      }

      try {
        await rm.replaceRouteStops(Number(target.routeId), asItems(remaining));
        try {
          await rm.deleteStop(Number(id));
        } catch {
          // Trạm vẫn được tuyến khác dùng hoặc đã có vé: giữ trong danh mục là đúng.
        }
        await load();
        return { success: true };
      } catch (err) {
        return { success: false, message: describe(err) };
      }
    },
    [currentRouteStops, load, stops],
  );

  const swapStops = useCallback(
    async (id: string, delta: number): Promise<MutationResult> => {
      const target = stops.find((s) => s.id === id);
      if (!target) return { success: false, message: 'Không tìm thấy trạm dừng.' };

      const ordered = [...currentRouteStops(target.routeId)];
      const index = ordered.findIndex((s) => String(s.stopId) === id);
      const swapWith = index + delta;
      if (index < 0 || swapWith < 0 || swapWith >= ordered.length) {
        return { success: false, message: 'Trạm đã ở vị trí đầu hoặc cuối tuyến.' };
      }

      // Đổi chỗ hai trạm nhưng giữ nguyên dãy mốc thời gian để không vi phạm
      // ràng buộc minutesFromStart không giảm theo thứ tự.
      const minutes = ordered.map((s) => s.minutesFromStart);
      const reordered = [...ordered];
      [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

      const items: rm.RouteStopItem[] = reordered.map((s, i) => ({
        stopId: s.stopId,
        minutesFromStart: minutes[i],
      }));

      return mutate(() => rm.replaceRouteStops(Number(target.routeId), items));
    },
    [currentRouteStops, mutate, stops],
  );

  const moveStopUp = useCallback((id: string) => swapStops(id, -1), [swapStops]);
  const moveStopDown = useCallback((id: string) => swapStops(id, 1), [swapStops]);

  // ---------- Giá vé ----------

  const passengerTypeId = useCallback(
    (passengerType: PassengerType): number | null => {
      const code = codeFromPassengerType(passengerType);
      return passengerTypes.find((t) => t.code.toUpperCase() === code)?.id ?? null;
    },
    [passengerTypes],
  );

  const toFareRequest = useCallback(
    (form: FareFormValues): rm.FareRequest | string => {
      const typeId = passengerTypeId(form.passengerType);
      if (typeId === null) {
        return `Không tìm thấy đối tượng hành khách tương ứng (${codeFromPassengerType(form.passengerType)}) trong cơ sở dữ liệu.`;
      }
      return {
        routeId: Number(form.routeId),
        ticketType: ticketTypeFor(form.passengerType),
        passengerTypeId: typeId,
        price: Number(form.price),
        effectiveFrom: form.effectiveDate,
      };
    },
    [passengerTypeId],
  );

  const addFare = useCallback(
    async (form: FareFormValues): Promise<MutationResult> => {
      const body = toFareRequest(form);
      if (typeof body === 'string') return { success: false, message: body };
      return mutate(() => rm.createFare(body));
    },
    [mutate, toFareRequest],
  );

  const updateFare = useCallback(
    async (id: string, updates: Partial<Fare>): Promise<MutationResult> => {
      const current = fares.find((f) => f.id === id);
      if (!current) return { success: false, message: 'Không tìm thấy giá vé.' };

      const body = toFareRequest({
        routeId: updates.routeId ?? current.routeId,
        passengerType: updates.passengerType ?? current.passengerType,
        price: updates.price ?? current.price,
        effectiveDate: updates.effectiveDate ?? current.effectiveDate,
      });
      if (typeof body === 'string') return { success: false, message: body };
      return mutate(() => rm.updateFare(Number(id), body));
    },
    [fares, mutate, toFareRequest],
  );

  const deleteFare = useCallback((id: string) => mutate(() => rm.deleteFare(Number(id))), [mutate]);

  return useMemo(
    () => ({
      routes,
      stops,
      fares,
      passengerTypes,
      loading,
      error,
      reload,
      addRoute,
      updateRoute,
      deleteRoute,
      addStop,
      updateStop,
      deleteStop,
      moveStopUp,
      moveStopDown,
      addFare,
      updateFare,
      deleteFare,
    }),
    [
      routes, stops, fares, passengerTypes, loading, error, reload,
      addRoute, updateRoute, deleteRoute,
      addStop, updateStop, deleteStop, moveStopUp, moveStopDown,
      addFare, updateFare, deleteFare,
    ],
  );
};
