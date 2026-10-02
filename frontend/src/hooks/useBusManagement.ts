/**
 * SCRUM-49 - Nguồn dữ liệu thật cho trang quản lý xe buýt.
 *
 * Các hàm thao tác trả về { success, message } như useRouteManagement để trang
 * hiển thị toast thống nhất. Thao tác cần vai trò Admin hoặc Manager, kèm JWT hợp lệ.
 */

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import * as busApi from '../api/busManagement';
import type { BusDetailDto, BusDto, BusRequest } from '../api/busManagement';

export interface BusMutationResult {
  success: boolean;
  message?: string;
}

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

export const useBusManagement = () => {
  const [buses, setBuses] = useState<BusDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      // Trang lọc / tìm kiếm ở phía client nên lấy tối đa 100 xe một lần (giới hạn của backend).
      const page = await busApi.listBuses({ pageSize: 100 }, signal);
      setBuses(page.data);
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

  const getDetail = useCallback(async (id: number): Promise<BusDetailDto | null> => {
    try {
      return await busApi.getBus(id);
    } catch {
      return null;
    }
  }, []);

  const addBus = async (body: BusRequest): Promise<BusMutationResult> => {
    try {
      const created = await busApi.createBus(body);
      await load();
      return { success: true, message: `Đã thêm xe ${created.bus.plateNumber} với ${created.seats.length} ghế.` };
    } catch (err) {
      return { success: false, message: describe(err) };
    }
  };

  const updateBus = async (id: number, body: BusRequest): Promise<BusMutationResult> => {
    try {
      const updated = await busApi.updateBus(id, body);
      await load();
      return { success: true, message: `Đã cập nhật xe ${updated.bus.plateNumber}.` };
    } catch (err) {
      return { success: false, message: describe(err) };
    }
  };

  const deleteBus = async (id: number): Promise<BusMutationResult> => {
    try {
      await busApi.deleteBus(id);
      await load();
      return { success: true, message: 'Đã xoá xe buýt.' };
    } catch (err) {
      return { success: false, message: describe(err) };
    }
  };

  return { buses, loading, error, reload: () => load(), getDetail, addBus, updateBus, deleteBus };
};
