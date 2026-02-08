import { useState } from 'react';
import { Bell, Clock, AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useNotificationsContext } from '@/contexts/NotificationsContext';
import { Notification } from '@/types/notifications';
import { cn } from '@/lib/utils';

export function NotificationsCenter() {
  const { notifications, unreadCount, dismissNotification, clearAll } = useNotificationsContext();
  const [open, setOpen] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-orange-50 border-orange-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'pencairan') {
      const status = (notification as any).submissionStatus;
      if (status === 'draft' || status === 'reject_bendahara' || status === 'reject_ppk' || status === 'reject_ppspm') {
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      }
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    if (notification.type === 'sbml_spk') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  };

  const formatTime = (date: Date, displayTime?: string) => {
    // If displayTime is provided (formatted time for pencairan), use it
    if (displayTime) {
      return displayTime;
    }
    
    // Otherwise use relative time format
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return new Date(date).toLocaleDateString('id-ID');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-foreground hover:bg-primary-foreground/10"
          title="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs rounded-full font-semibold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                {unreadCount} baru
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {notifications.map((notif, idx) => (
                <div key={notif.id}>
                  <div
                    className={cn(
                      'p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer group',
                      getPriorityBg(notif.priority)
                    )}
                    onClick={() => {
                      if (notif.actionUrl) {
                        window.location.href = notif.actionUrl;
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notif)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground line-clamp-2">
                              {notif.title}
                            </p>
                            <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">
                              {notif.message}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notif.id);
                            }}
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus notifikasi"
                          >
                            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {formatTime(notif.createdAt, notif.displayTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {idx < notifications.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t p-3 flex gap-2">
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs flex-1"
              >
                Hapus Semua
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
