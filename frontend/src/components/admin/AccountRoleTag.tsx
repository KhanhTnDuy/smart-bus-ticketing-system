import React from 'react';
import { AccountKind, Role } from '../../types';
import { Badge } from '../common/Badge';

/** Nhãn vai trò của tài khoản. Phụ xe có nhãn riêng thay vì bị hiện như Tài xế. */
export const AccountRoleTag: React.FC<{ kind: AccountKind; size?: 'sm' | 'md' }> = ({ kind, size }) =>
  kind === 'CONDUCTOR' ? (
    <span
      className={`inline-flex items-center rounded border font-bold bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      Phụ xe
    </span>
  ) : (
    <Badge variant="role" value={kind as Role} size={size} />
  );
