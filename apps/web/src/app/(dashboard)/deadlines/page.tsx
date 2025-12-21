'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building2,
  Trash2,
  Loader2,
  Bell,
  BellOff,
} from 'lucide-react';
import { ReminderType, REMINDER_TYPE_LABELS } from '@drykorn/shared';
import { formatDate } from '@/lib/utils';

interface UpcomingDeadline {
  id: string;
  type: ReminderType;
  reminderDate: string;
  message?: string;
  isSent: boolean;
  contractId: string;
  contractNumber: string;
  contractTitle: string;
  partnerName: string;
  daysUntil: number;
}

export default function DeadlinesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [daysFilter, setDaysFilter] = useState<string>('30');
  const [deleteReminder, setDeleteReminder] = useState<UpcomingDeadline | null>(null);

  const { data: deadlines, isLoading } = useQuery<UpcomingDeadline[]>({
    queryKey: ['deadlines', daysFilter],
    queryFn: async () => {
      const response = await api.get<UpcomingDeadline[]>(`/deadlines/upcoming?days=${daysFilter}`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/deadlines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      setDeleteReminder(null);
    },
  });

  const getUrgencyColor = (days: number): string => {
    if (days <= 7) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 14) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 30) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getUrgencyIcon = (days: number): React.JSX.Element => {
    if (days <= 7) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (days <= 14) return <Clock className="h-5 w-5 text-orange-600" />;
    if (days <= 30) return <Calendar className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  const getTypeBadge = (type: ReminderType): React.JSX.Element => {
    const variants: Record<ReminderType, 'default' | 'secondary' | 'outline'> = {
      [ReminderType.EXPIRATION]: 'destructive' as 'default',
      [ReminderType.RENEWAL]: 'default',
      [ReminderType.CUSTOM]: 'secondary',
    };
    return <Badge variant={variants[type]}>{REMINDER_TYPE_LABELS[type]}</Badge>;
  };

  const groupedDeadlines = deadlines?.reduce(
    (acc, deadline) => {
      const days = deadline.daysUntil;
      let group: string;
      if (days <= 7) group = 'Diese Woche';
      else if (days <= 14) group = 'Nächste Woche';
      else if (days <= 30) group = 'Diesen Monat';
      else group = 'Später';

      if (!acc[group]) acc[group] = [];
      acc[group].push(deadline);
      return acc;
    },
    {} as Record<string, UpcomingDeadline[]>,
  );

  const groupOrder = ['Diese Woche', 'Nächste Woche', 'Diesen Monat', 'Später'];

  // Statistics
  const stats = {
    total: deadlines?.length || 0,
    urgent: deadlines?.filter((d) => d.daysUntil <= 7).length || 0,
    soon: deadlines?.filter((d) => d.daysUntil > 7 && d.daysUntil <= 30).length || 0,
    sent: deadlines?.filter((d) => d.isSent).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fristen & Erinnerungen</h1>
          <p className="text-muted-foreground">Behalten Sie wichtige Vertragstermine im Blick</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 rounded-full p-3">
                <Calendar className="text-primary h-6 w-6" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Gesamt</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Dringend (≤7 Tage)</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-yellow-100 p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Bald fällig (≤30 Tage)</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.soon}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Versendet</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Anstehende Fristen</CardTitle>
              <CardDescription>
                Alle Erinnerungen für die nächsten {daysFilter} Tage
              </CardDescription>
            </div>
            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Tage</SelectItem>
                <SelectItem value="14">14 Tage</SelectItem>
                <SelectItem value="30">30 Tage</SelectItem>
                <SelectItem value="60">60 Tage</SelectItem>
                <SelectItem value="90">90 Tage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : deadlines && deadlines.length > 0 ? (
            <div className="space-y-8">
              {groupOrder.map((group) => {
                const items = groupedDeadlines?.[group];
                if (!items?.length) return null;

                return (
                  <div key={group}>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      {group === 'Diese Woche' && (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      {group === 'Nächste Woche' && <Clock className="h-5 w-5 text-orange-600" />}
                      {group === 'Diesen Monat' && <Calendar className="h-5 w-5 text-yellow-600" />}
                      {group === 'Später' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      {group}
                      <Badge variant="secondary">{items.length}</Badge>
                    </h3>
                    <div className="space-y-3">
                      {items.map((deadline) => (
                        <div
                          key={deadline.id}
                          className={`rounded-lg border p-4 ${getUrgencyColor(deadline.daysUntil)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              {getUrgencyIcon(deadline.daysUntil)}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/contracts/${deadline.contractId}`}
                                    className="font-semibold hover:underline"
                                  >
                                    {deadline.contractTitle}
                                  </Link>
                                  {getTypeBadge(deadline.type)}
                                  {deadline.isSent ? (
                                    <Badge variant="outline" className="text-green-600">
                                      <Bell className="mr-1 h-3 w-3" />
                                      Versendet
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      <BellOff className="mr-1 h-3 w-3" />
                                      Ausstehend
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {deadline.contractNumber}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {deadline.partnerName}
                                  </span>
                                </div>
                                {deadline.message && (
                                  <p className="text-sm opacity-80">{deadline.message}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold">
                                  {formatDate(new Date(deadline.reminderDate))}
                                </p>
                                <p className="text-sm">
                                  {deadline.daysUntil === 0
                                    ? 'Heute'
                                    : deadline.daysUntil === 1
                                      ? 'Morgen'
                                      : `in ${deadline.daysUntil} Tagen`}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteReminder(deadline)}
                              >
                                <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="text-muted-foreground h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium">Keine Fristen gefunden</h3>
              <p className="text-muted-foreground mt-1">
                Es stehen keine Erinnerungen in den nächsten {daysFilter} Tagen an.
              </p>
              <Link href="/contracts" className="mt-4">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Zu den Verträgen
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReminder} onOpenChange={() => setDeleteReminder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erinnerung löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Erinnerung für &quot;{deleteReminder?.contractTitle}&quot; wirklich
              löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReminder && deleteMutation.mutate(deleteReminder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
