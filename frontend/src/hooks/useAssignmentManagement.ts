import { useCallback, useEffect, useState } from 'react';
import { BusAssignment } from '../types';
import { ApiError } from '../api/client';
import * as assignApi from '../api/assignments';
import { INITIAL_ASSIGNMENTS } from '../data/mockData';

export interface MutationResult {
  success: boolean;
  conflict?: boolean;
  message?: string;
  assignment?: BusAssignment;
}

const STORAGE_KEY = 'smart_bus_assignments';

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

/**
 * Kiểm tra trùng lịch tại client khi mất kết nối backend
 */
const checkLocalConflict = (
  candidate: Omit<BusAssignment, 'id'>,
  existingList: BusAssignment[],
  excludeId?: string,
): { hasConflict: boolean; message?: string } => {
  const parseRange = (dateStr: string, shiftHours: string) => {
    const parts = shiftHours.match(/(\d{1,2}:\d{2})\s*[-—–~to]+\s*(\d{1,2}:\d{2})/);
    const d = new Date(dateStr);
    if (!parts) {
      return {
        start: new Date(`${dateStr}T06:00:00`),
        end: new Date(`${dateStr}T18:00:00`),
      };
    }
    const [h1, m1] = parts[1].split(':').map(Number);
    const [h2, m2] = parts[2].split(':').map(Number);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h1, m1);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h2, m2);
    if (end <= start) end.setDate(end.getDate() + 1);
    return { start, end };
  };

  const candRange = parseRange(candidate.date, candidate.shiftHours);

  for (const other of existingList) {
    if (other.status === 'CANCELLED') continue;
    if (excludeId && other.id === excludeId) continue;
    if (other.date !== candidate.date) continue;

    const otherRange = parseRange(other.date, other.shiftHours);
    const hasOverlap = candRange.start < otherRange.end && otherRange.start < candRange.end;
    if (!hasOverlap) continue;

    if (other.busPlate.trim().toUpperCase() === candidate.busPlate.trim().toUpperCase()) {
      return {
        hasConflict: true,
        message: `Phương tiện ${candidate.busPlate} đã có lịch trực ca [${other.id}] (${other.shiftHours} ngày ${other.date}). Trùng lịch vận hành!`,
      };
    }

    if (
      (other.driverId && candidate.driverId && other.driverId === candidate.driverId) ||
      other.driverName.trim().toLowerCase() === candidate.driverName.trim().toLowerCase()
    ) {
      return {
        hasConflict: true,
        message: `Tài xế ${candidate.driverName} đã có lịch trực ca [${other.id}] (${other.shiftHours} ngày ${other.date}). Trùng lịch làm việc!`,
      };
    }

    if (
      candidate.assistantName &&
      other.assistantName &&
      candidate.assistantName.trim().toLowerCase() === other.assistantName.trim().toLowerCase()
    ) {
      return {
        hasConflict: true,
        message: `Phụ xe ${candidate.assistantName} đã có lịch trực ca [${other.id}] (${other.shiftHours} ngày ${other.date}). Trùng lịch làm việc!`,
      };
    }
  }

  return { hasConflict: false };
};

export const useAssignmentManagement = () => {
  const [assignments, setAssignments] = useState<BusAssignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ASSIGNMENTS;
    } catch {
      return INITIAL_ASSIGNMENTS;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const dtos = await assignApi.listAssignments(undefined, signal);
      const mapped = dtos.map(assignApi.toBusAssignment);
      setAssignments(mapped);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(describe(err));
      // Fallback giữ nguyên từ localStorage / INITIAL_ASSIGNMENTS
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const addAssignment = async (data: Omit<BusAssignment, 'id'>): Promise<MutationResult> => {
    try {
      const req = assignApi.toAssignmentRequest(data);
      const createdDto = await assignApi.createAssignment(req);
      const newEntity = assignApi.toBusAssignment(createdDto);

      setAssignments((prev) => {
        const next = [newEntity, ...prev.filter((a) => a.id !== newEntity.id)];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      return { success: true, assignment: newEntity };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        return { success: false, conflict: true, message: err.message };
      }

      // Nếu backend không phản hồi (offline/chưa chạy backend), kiểm tra trùng tại client:
      const localCheck = checkLocalConflict(data, assignments);
      if (localCheck.hasConflict) {
        return { success: false, conflict: true, message: localCheck.message };
      }

      // Lưu tạm local
      const newId = `ASN-${String(assignments.length + 1).padStart(3, '0')}`;
      const fallbackEntity: BusAssignment = { ...data, id: newId };
      setAssignments((prev) => {
        const next = [fallbackEntity, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      return {
        success: true,
        assignment: fallbackEntity,
        message: 'Đã lưu cục bộ (chưa đồng bộ máy chủ).',
      };
    }
  };

  const updateAssignment = async (
    id: string,
    updates: Partial<BusAssignment>,
  ): Promise<MutationResult> => {
    const current = assignments.find((a) => a.id === id);
    if (!current) return { success: false, message: 'Không tìm thấy phân công' };

    const merged: BusAssignment = { ...current, ...updates };

    try {
      const req = assignApi.toAssignmentRequest(merged);
      const updatedDto = await assignApi.updateAssignment(id, req);
      const updatedEntity = assignApi.toBusAssignment(updatedDto);

      setAssignments((prev) => {
        const next = prev.map((a) => (a.id === id ? updatedEntity : a));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      return { success: true, assignment: updatedEntity };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        return { success: false, conflict: true, message: err.message };
      }

      // Kiểm tra trùng lịch tại client nếu offline
      const localCheck = checkLocalConflict(merged, assignments, id);
      if (localCheck.hasConflict) {
        return { success: false, conflict: true, message: localCheck.message };
      }

      setAssignments((prev) => {
        const next = prev.map((a) => (a.id === id ? merged : a));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });

      return { success: true, assignment: merged };
    }
  };

  const deleteAssignment = async (id: string): Promise<MutationResult> => {
    try {
      await assignApi.deleteAssignment(id);
    } catch {
      // Tiếp tục xoá ở state nếu backend trả lỗi mạng
    }

    setAssignments((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

    return { success: true };
  };

  const checkConflict = async (req: assignApi.CheckConflictRequest) => {
    try {
      return await assignApi.checkAssignmentConflict(req);
    } catch {
      return { hasConflict: false };
    }
  };

  return {
    assignments,
    loading,
    error,
    reload: () => load(),
    addAssignment,
    updateAssignment,
    deleteAssignment,
    checkConflict,
  };
};
