import { useCallback, useEffect, useState } from 'react';
import { AuditLog } from '../types';
import { ApiError } from '../api/client';
import * as auditApi from '../api/auditLog';
import { INITIAL_AUDIT_LOGS } from '../data/mockData';

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

export const useAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('smart_bus_audit_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for backend query
  const [filters, setFilters] = useState<auditApi.AuditLogQueryParams>({});

  const load = useCallback(
    async (currentFilters?: auditApi.AuditLogQueryParams, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const dtos = await auditApi.listAuditLogs(currentFilters ?? filters, signal);
        const mapped = dtos.map(auditApi.toAuditLog);
        setAuditLogs(mapped);
        try {
          localStorage.setItem('smart_bus_audit_logs', JSON.stringify(mapped));
        } catch {
          /* ignore */
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(describe(err));
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(filters, controller.signal);
    return () => controller.abort();
  }, [load, filters]);

  const reload = useCallback(() => load(filters), [load, filters]);

  return {
    auditLogs,
    loading,
    error,
    reload,
    filters,
    setFilters,
  };
};
