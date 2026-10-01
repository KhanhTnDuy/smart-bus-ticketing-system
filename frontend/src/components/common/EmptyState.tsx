import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Chưa có dữ liệu',
  description = 'Không tìm thấy bản ghi nào phù hợp với điều kiện tìm kiếm hoặc dữ liệu hiện đang trống.',
  action,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#101b38]/40 my-4">
      <div className="p-3 bg-white dark:bg-[#162244] rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 mb-3 shadow-sm">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
