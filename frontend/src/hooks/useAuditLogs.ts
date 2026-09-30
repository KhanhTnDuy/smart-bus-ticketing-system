/**
 * US2 - Nguồn dữ liệu thật cho trang Nhật ký hệ thống.
 *
 * Hook này thay thế useData() (mockData) ở AuditLogPage.
 *
 * Việc lọc được đẩy xuống backend (`GET /api/audit-logs`) thay vì lọc trên mảng
 * đã tải, vì bảng nhật ký lớn dần theo thời gian và backend đã hỗ trợ sẵn tham
 * số username / actionType / status / from / to / search.
 *
 * Ngoại lệ: "phân hệ" (module) không có ở backend mà được suy ra khi ánh xạ
 * (xem toAuditLog trong api/mappers.ts), nên bộ lọc phân hệ vẫn chạy ở client.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuditLog } from '../types';
import { ApiError } from '../api/client';
import { AuditActionTypeCode, AuditLogQuery, AuditStatusCode, listAuditLogs } from '../api/auditLogs';
import { toAuditLog } from '../api/mappers';

/** Độ trễ trước khi gọi API, tránh bắn một request cho mỗi ký tự vừa gõ. */
const DEBOUNCE_MS = 300;

export interface AuditLogFilters {
  /** Khớp một phần tên đăng nhập. */
  username: string;
  /** Từ khóa tìm trong thao tác, đối tượng tác động và mô tả. */
  search: string;
  actionType: AuditActionTypeCode | null;
  status: AuditStatusCode | null;
  /** YYYY-MM-DD, để rỗng nghĩa là không giới hạn. */
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditLogFilters = {
  username: '',
  search: '',
  actionType: null,
  status: null,
  from: '',
  to: '',
};

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

const toQuery = (filters: AuditLogFilters): AuditLogQuery => ({
  username: filters.username.trim() || undefined,
  search: filters.search.trim() || undefined,
  actionType: filters.actionType ?? undefined,
  status: filters.status ?? undefined,
  from: filters.from || undefined,
  to: filters.to || undefined,
});

export const useAuditLogs = () => {
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_AUDIT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>(EMPTY_AUDIT_FILTERS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tăng lên để buộc tải lại với cùng bộ lọc (nút "Thử lại" / "Làm mới").
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const dtos = await listAuditLogs(toQuery(appliedFilters), controller.signal);
        setLogs(dtos.map(toAuditLog));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(describe(err));
        // Xoá dữ liệu cũ để không hiển thị kết quả không khớp bộ lọc đang chọn.
        setLogs([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [appliedFilters, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  /** Đặt lại bộ lọc và bỏ qua debounce để danh sách cập nhật ngay. */
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_AUDIT_FILTERS);
    setAppliedFilters(EMPTY_AUDIT_FILTERS);
  }, []);

  const setFilter = useCallback(
    <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== '' && value !== null),
    [filters],
  );

  return useMemo(
    () => ({ logs, loading, error, filters, setFilter, clearFilters, hasActiveFilters, reload }),
    [logs, loading, error, filters, setFilter, clearFilters, hasActiveFilters, reload],
  );
};
