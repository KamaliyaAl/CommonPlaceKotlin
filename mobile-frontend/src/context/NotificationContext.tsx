import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppNotification } from '../types';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  // Banner queue — the first item is shown, consumer pops it after display
  bannerQueue: AppNotification[];
  dismissBanner: () => void;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bannerQueue, setBannerQueue] = useState<AppNotification[]>([]);
  // Track which notification IDs have already been queued for banner display
  const shownIds = useRef<Set<string>>(new Set());

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const fetched = await api.getNotifications(user.uid);
      setNotifications(fetched);

      // Enqueue newly arrived unread notifications as banners
      const newUnread = fetched.filter(
        n => !n.read && !shownIds.current.has(n.id)
      );
      if (newUnread.length > 0) {
        newUnread.forEach(n => shownIds.current.add(n.id));
        setBannerQueue(prev => [...prev, ...newUnread]);
      }
    } catch {
      // silently ignore polling errors
    }
  }, [user?.uid]);

  // Start polling when user is logged in
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setBannerQueue([]);
      shownIds.current.clear();
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.uid, fetchNotifications]);

  const dismissBanner = useCallback(() => {
    setBannerQueue(prev => prev.slice(1));
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.uid) return;
    await api.markAllNotificationsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user?.uid]);

  const refresh = useCallback(() => fetchNotifications(), [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, bannerQueue, dismissBanner, markAllRead, markRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
