'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function Header(): React.JSX.Element {
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notificationCount } = useQuery<{ count: number }>({
    queryKey: ['notification-count'],
    queryFn: async () => {
      const response = await api.get<{ count: number }>('/notifications/count');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get<Notification[]>('/notifications?unreadOnly=true');
      return response.data;
    },
  });

  const markAsRead = async (id: string): Promise<void> => {
    try {
      await api.patch(`/notifications/${id}/read`);
      // Aktualisiere die Benachrichtigungsliste
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-count'] });
    } catch {
      toast({
        title: 'Fehler',
        description: 'Benachrichtigung konnte nicht als gelesen markiert werden.',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="bg-card flex h-16 items-center justify-between border-b px-6">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Suche öffnen"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Benachrichtigungen"
            >
              <Bell className="h-5 w-5" />
              {notificationCount && notificationCount.count > 0 && (
                <span className="bg-destructive text-destructive-foreground absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs">
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
                    <span className="text-muted-foreground line-clamp-2 text-sm">
                      {notification.message}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(notification.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </DropdownMenuItem>
                ))}
              </>
            ) : (
              <div className="text-muted-foreground p-4 text-center">
                Keine neuen Benachrichtigungen
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
