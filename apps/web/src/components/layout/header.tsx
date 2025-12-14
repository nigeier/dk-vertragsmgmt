'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function Header(): React.JSX.Element {
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: notificationCount } = useQuery<{ count: number }>({
    queryKey: ['notification-count'],
    queryFn: () => api.get('/notifications/count').then((res) => res.data),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?unreadOnly=true').then((res) => res.data),
  });

  const markAsRead = async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <Input
              type="search"
              placeholder="Suche..."
              className="w-64"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount && notificationCount.count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {notificationCount.count > 9 ? '9+' : notificationCount.count}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {notifications && notifications.length > 0 ? (
              <>
                {notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex flex-col items-start gap-1 p-3"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <span className="font-medium">{notification.title}</span>
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Keine neuen Benachrichtigungen
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
