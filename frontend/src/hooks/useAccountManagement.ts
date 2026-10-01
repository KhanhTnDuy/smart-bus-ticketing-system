import { useCallback, useEffect, useState } from 'react';
import type { Role, User, UserStatus } from '../types';
import { ApiError } from '../api/client';
import * as accountApi from '../api/accountManagement';

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

export interface MutationResult {
  success: boolean;
  message?: string;
  data?: User;
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';

export const useAccountManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const dtos = await accountApi.listAccounts(undefined, signal);
      setUsers(dtos.map(accountApi.toUser));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(messageOf(err));
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

  const addAccount = useCallback(async (form: AccountFormValues): Promise<MutationResult> => {
    try {
      const dto = await accountApi.createAccount({
        username: form.username.trim(),
        password: form.password?.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: accountApi.roleToBackend(form.role),
        active: form.status === 'ACTIVE',
      });
      const user = accountApi.toUser(dto);
      setUsers((current) => [user, ...current]);
      return { success: true, data: user };
    } catch (err) {
      return { success: false, message: messageOf(err) };
    }
  }, []);

  const updateAccount = useCallback(async (id: string, form: Partial<AccountFormValues>): Promise<MutationResult> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return { success: false, message: 'ID tài khoản không hợp lệ.' };
    try {
      const dto = await accountApi.updateAccount(numericId, {
        fullName: form.fullName?.trim(),
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        role: form.role ? accountApi.roleToBackend(form.role) : undefined,
        active: form.status === undefined ? undefined : form.status === 'ACTIVE',
        password: form.password,
      });
      const user = accountApi.toUser(dto);
      setUsers((current) => current.map((item) => item.id === id ? user : item));
      return { success: true, data: user };
    } catch (err) {
      return { success: false, message: messageOf(err) };
    }
  }, []);

  const assignRole = useCallback(async (id: string, role: Role): Promise<MutationResult> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return { success: false, message: 'ID tài khoản không hợp lệ.' };
    try {
      await accountApi.updateAccountRole(numericId, accountApi.roleToBackend(role));
      setUsers((current) => current.map((item) => item.id === id ? { ...item, role } : item));
      return { success: true };
    } catch (err) {
      return { success: false, message: messageOf(err) };
    }
  }, []);

  const deleteAccount = useCallback(async (id: string): Promise<MutationResult> => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return { success: false, message: 'ID tài khoản không hợp lệ.' };
    try {
      await accountApi.deleteAccount(numericId);
      setUsers((current) => current.filter((item) => item.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: messageOf(err) };
    }
  }, []);

  return { users, loading, error, reload, addAccount, updateAccount, assignRole, deleteAccount };
};
