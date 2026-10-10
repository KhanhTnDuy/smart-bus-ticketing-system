import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationDto } from '../../api/notifications';

/** Giờ backend trả về là UTC nhưng không có hậu tố Z. */
const parseUtc = (iso: string) => new Date(iso.endsWith('Z') ? iso : `${iso}Z`);

const timeAgo = (iso: string): string => {
  const minutes = Math.floor((Date.now() - parseUtc(iso).getTime()) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return parseUtc(iso).toLocaleDateString('vi-VN');
};

export const NotificationBell: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { items, unreadCount, error, refresh, markRead, markAllRead } = useNotifications(!!currentUser);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) void refresh();
  };

  const onClickItem = (n: NotificationDto) => {
    void markRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="p-2 sm:p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-institutional-700 dark:hover:text-sky-400 bg-slate-100 dark:bg-[#18284f] hover:bg-slate-200 dark:hover:bg-[#203668] border border-slate-200 dark:border-[#22396e] transition-colors relative"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#131e3a] rounded-lg shadow-2xl border border-slate-200 dark:border-[#223561] py-2 z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-[#1e2f57]">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Thông báo ({unreadCount} chưa đọc)
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] text-institutional-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> Đọc tất cả
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1e2f57]">
            {error && <div className="p-3 text-xs text-rose-600">Không tải được thông báo: {error}</div>}
            {!error && items.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">Chưa có thông báo nào</div>
            ) : (
              items.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => onClickItem(n)}
                  className={`w-full text-left p-3 text-xs transition-colors ${
                    n.isRead
                      ? 'opacity-65 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      : 'bg-blue-50/50 dark:bg-[#19274c] hover:bg-blue-50 dark:hover:bg-[#1e305e]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
