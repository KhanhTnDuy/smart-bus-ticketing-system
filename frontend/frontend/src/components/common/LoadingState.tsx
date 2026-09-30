import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Đang tải dữ liệu hệ thống...',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
      <Loader2 className={`${iconSize} animate-spin text-institutional-600 dark:text-sky-400 mb-3`} />
      <span className="text-xs font-medium tracking-wide">{message}</span>
    </div>
  );
};
