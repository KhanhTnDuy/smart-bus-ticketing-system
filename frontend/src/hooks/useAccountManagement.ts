import { useCallback, useEffect, useState } from 'react';
import { Role, User, UserStatus } from '../types';
import { ApiError } from '../api/client';
import * as acctApi from '../api/accountManagement';

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
  password?: string;
}

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

/**
 * Tài khoản đọc và ghi thẳng vào backend. Máy chủ là nguồn dữ liệu duy nhất: không có dữ liệu mẫu,
 * không lưu bản sao ở localStorage và không giả vờ thành công khi mất kết nối. Mọi lỗi (mạng, quyền,
 * nghiệp vụ) được trả về để giao diện báo cho người dùng biết thao tác chưa được lưu.
 */
export const useAccountManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const dtos = await acctApi.listAccounts(undefined, signal);
      setUsers(dtos.map(acctApi.toUser));
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

  const mutate = useCallback(
    async <T,>(action: () => Promise<T>): Promise<MutationResult & { value?: T }> => {
      try {
        const value = await action();
        await load();
        return { success: true, value };
      } catch (err) {
        return { success: false, message: describe(err) };
      }
    },
    [load],
  );

  const toNumericId = (id: string): number | null => {
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  const addAccount = useCallback(
    async (formData: AccountFormValues): Promise<MutationResult> => {
      const res = await mutate(() =>
        acctApi.createAccount({
          username: formData.username.trim(),
          // Máy chủ bắt buộc có mật khẩu: nếu quản trị không nhập thì sinh một mật khẩu tạm ngẫu nhiên.
          password: formData.password?.trim() || `SmartBus@${Math.floor(100000 + Math.random() * 900000)}`,
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: acctApi.roleToBackend(formData.role),
          active: formData.status === 'ACTIVE',
        }),
      );
      return res.success ? { success: true, data: res.value ? acctApi.toUser(res.value) : undefined } : res;
    },
    [mutate],
  );

  const updateAccount = useCallback(
    async (id: string, formData: Partial<AccountFormValues>): Promise<MutationResult> => {
      const numId = toNumericId(id);
      if (numId === null) return { success: false, message: 'Mã tài khoản không hợp lệ.' };
      return mutate(() =>
        acctApi.updateAccount(numId, {
          fullName: formData.fullName?.trim(),
          email: formData.email?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          role: formData.role ? acctApi.roleToBackend(formData.role) : undefined,
          active: formData.status !== undefined ? formData.status === 'ACTIVE' : undefined,
          password: formData.password,
        }),
      );
    },
    [mutate],
  );

  const assignRole = useCallback(
    async (id: string, newRole: Role): Promise<MutationResult> => {
      const numId = toNumericId(id);
      if (numId === null) return { success: false, message: 'Mã tài khoản không hợp lệ.' };
      return mutate(() => acctApi.updateAccountRole(numId, acctApi.roleToBackend(newRole)));
    },
    [mutate],
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<MutationResult> => {
      const numId = toNumericId(id);
      if (numId === null) return { success: false, message: 'Mã tài khoản không hợp lệ.' };
      return mutate(() => acctApi.deleteAccount(numId));
    },
    [mutate],
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
