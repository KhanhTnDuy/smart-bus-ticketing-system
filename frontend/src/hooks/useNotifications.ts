import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NotificationDto,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';

const POLL_MS = 30000;

/**
 * Thông báo thật từ backend. Không có kênh đẩy nên hỏi lại mỗi 30 giây và khi người dùng quay lại tab;
 * đánh dấu đã đọc được cập nhật ngay trên giao diện rồi mới gửi lên máy chủ.
 */
export const useNotifications = (enabled: boolean) => {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await listMyNotifications();
      if (!aliveRef.current) return;
      setItems(res.items);
      setUnreadCount(res.unreadCount);
      setError(null);
    } catch (err) {
      if (aliveRef.current) setError(err instanceof Error ? err.message : 'Không tải được thông báo.');
    }
  }, [enabled]);

  useEffect(() => {
    aliveRef.current = true;
    if (!enabled) {
      setItems([]);
      setUnreadCount(0);
      return () => {
        aliveRef.current = false;
      };
    }
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      aliveRef.current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  const markRead = useCallback(
    async (id: number) => {
      const target = items.find((n) => n.id === id);
      if (!target || target.isRead) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markNotificationRead(id);
      } catch {
        void refresh();
      }
    },
    [items, refresh],
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void refresh();
    }
  }, [refresh]);

  return { items, unreadCount, error, refresh, markRead, markAllRead };
};
