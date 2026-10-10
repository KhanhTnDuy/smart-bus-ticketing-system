import { useCallback, useEffect, useState } from 'react';
import { BusAssignment } from '../types';
import { ApiError } from '../api/client';
import * as assignApi from '../api/assignments';

export interface MutationResult {
  success: boolean;
  conflict?: boolean;
  message?: string;
  assignment?: BusAssignment;
}

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

/** Kết quả của một thao tác ghi: 409 là trùng lịch xe hoặc nhân sự, các lỗi khác chỉ có thông điệp. */
const toFailure = (err: unknown): MutationResult =>
  err instanceof ApiError && err.status === 409
    ? { success: false, conflict: true, message: err.message }
    : { success: false, message: describe(err) };

/**
 * Phân công xe và nhân sự, đọc ghi thẳng vào backend. Máy chủ là nguồn dữ liệu duy nhất và là nơi kiểm tra
 * trùng lịch: không có dữ liệu mẫu, không lưu cục bộ và không giả vờ thành công khi mất kết nối.
 */
export const useAssignmentManagement = () => {
  const [assignments, setAssignments] = useState<BusAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const dtos = await assignApi.listAssignments(undefined, signal);
      setAssignments(dtos.map(assignApi.toBusAssignment));
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

  const addAssignment = async (
    data: Omit<BusAssignment, 'id'>,
    extra?: { busId?: number; driverId?: number; conductorId?: number; routeId?: number },
  ): Promise<MutationResult> => {
    try {
      const created = await assignApi.createAssignment(assignApi.toCreateTripRequest(data, extra));
      await load();
      return { success: true, assignment: assignApi.toBusAssignment(created) };
    } catch (err) {
      return toFailure(err);
    }
  };

  const updateAssignment = async (
    id: string,
    updates: Partial<BusAssignment>,
    extra?: { busId?: number; driverId?: number; conductorId?: number },
  ): Promise<MutationResult> => {
    const current = assignments.find((a) => a.id === id);
    if (!current) return { success: false, message: 'Không tìm thấy phân công để cập nhật.' };

    try {
      const updated = await assignApi.updateAssignment(id, assignApi.toAssignTripRequest({ ...current, ...updates }, extra));
      await load();
      return { success: true, assignment: assignApi.toBusAssignment(updated) };
    } catch (err) {
      return toFailure(err);
    }
  };

  const deleteAssignment = async (id: string): Promise<MutationResult> => {
    try {
      await assignApi.deleteAssignment(id);
      await load();
      return { success: true };
    } catch (err) {
      return { success: false, message: describe(err) };
    }
  };

  const checkConflict = async (req: assignApi.CheckConflictRequest) => {
    try {
      return await assignApi.checkAssignmentConflict(req);
    } catch (err) {
      // Báo rõ lỗi kết nối hoặc máy chủ thay vì âm thầm trả hasConflict = false.
      return {
        hasConflict: false,
        error: describe(err),
        message: `Không thể kiểm tra trùng lịch với máy chủ: ${describe(err)}`,
      };
    }
  };

  return {
    assignments,
    loading,
    error,
    reload,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    checkConflict,
  };
};
