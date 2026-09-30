import { useCallback, useEffect, useState } from 'react';
import { Role, User, UserStatus } from '../types';
import { ApiError } from '../api/client';
import * as acctApi from '../api/accountManagement';
import { INITIAL_USERS } from '../data/mockData';

export interface MutationResult {
  success: boolean;
  message?: string;
  data?: User;
}

export interface AccountFormValues {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  department?: string;
  password?: string;
}

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

export const useAccountManagement = () => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('smart_bus_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const dtos = await acctApi.listAccounts(undefined, signal);
      const mapped = dtos.map(acctApi.toUser);
      setUsers(mapped);
      try {
        localStorage.setItem('smart_bus_users', JSON.stringify(mapped));
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(describe(err));
      // Fallback data giữ nguyên từ localStorage/INITIAL_USERS
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

  const addAccount = useCallback(
    async (formData: AccountFormValues): Promise<MutationResult> => {
      try {
        const req: acctApi.CreateAccountRequest = {
          username: formData.username.trim(),
          password: formData.password || 'MatKhau@123',
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: acctApi.roleToBackend(formData.role),
          active: formData.status === 'ACTIVE',
        };
        const dto = await acctApi.createAccount(req);
        const newUser = acctApi.toUser(dto);
        await load();
        return { success: true, data: newUser };
      } catch (err) {
        // Fallback local update nếu API không kết nối được
        if (err instanceof ApiError && err.status === 0) {
          const fallbackUser: User = {
            id: `USR-${Date.now().toString().slice(-4)}`,
            username: formData.username.trim(),
            fullName: formData.fullName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            role: formData.role,
            status: formData.status,
            createdAt: new Date().toISOString().split('T')[0],
            department: formData.department,
          };
          setUsers((prev) => [fallbackUser, ...prev]);
          return { success: true, data: fallbackUser };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  const updateAccount = useCallback(
    async (id: string, formData: Partial<AccountFormValues>): Promise<MutationResult> => {
      try {
        const numId = Number(id);
        if (Number.isNaN(numId)) {
          // ID kiểu mock (không phải số nguyên), cập nhật state nội bộ
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, ...formData } : u)),
          );
          return { success: true };
        }

        const req: acctApi.UpdateAccountRequest = {
          fullName: formData.fullName?.trim(),
          email: formData.email?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          role: formData.role ? acctApi.roleToBackend(formData.role) : undefined,
          active: formData.status !== undefined ? formData.status === 'ACTIVE' : undefined,
          password: formData.password,
        };
        await acctApi.updateAccount(numId, req);
        await load();
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, ...formData } : u)),
          );
          return { success: true };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  const assignRole = useCallback(
    async (id: string, newRole: Role): Promise<MutationResult> => {
      try {
        const numId = Number(id);
        if (Number.isNaN(numId)) {
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)),
          );
          return { success: true };
        }

        await acctApi.updateAccountRole(numId, acctApi.roleToBackend(newRole));
        await load();
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          setUsers((prev) =>
            prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)),
          );
          return { success: true };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<MutationResult> => {
      try {
        const numId = Number(id);
        if (Number.isNaN(numId)) {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          return { success: true };
        }

        await acctApi.deleteAccount(numId);
        await load();
        return { success: true };
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          return { success: true };
        }
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  return {
    users,
    loading,
    error,
    reload,
    addAccount,
    updateAccount,
    assignRole,
    deleteAccount,
  };
};
