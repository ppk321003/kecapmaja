import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification } from '@/types/notifications';

export interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
  _setNotifications: (notifs: Notification[]) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.length;

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const _setNotifications = useCallback((newNotifications: Notification[]) => {
    setNotifications(newNotifications);
  }, []);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    isLoading,
    dismissNotification,
    clearAll,
    _setNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return context;
}
