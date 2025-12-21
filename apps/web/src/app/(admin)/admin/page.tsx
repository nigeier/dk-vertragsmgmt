'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  FileText,
  Building2,
  ScrollText,
  UserPlus,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import {
  AuditAction,
  EntityType,
  AUDIT_ACTION_LABELS,
  ENTITY_TYPE_LABELS,
  UserRole,
  USER_ROLE_LABELS,
} from '@drykorn/shared';

interface UsersResponse {
  data: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
  }>;
  meta: { total: number };
}

interface AuditLogResponse {
  data: Array<{
    id: string;
    action: AuditAction;
    entityType: EntityType;
    user: { firstName: string; lastName: string };
    createdAt: string;
  }>;
}

interface ContractStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  expiringIn30Days: number;
  expiringIn90Days: number;
}

interface PartnersResponse {
  data: Array<{ id: string }>;
  meta: { total: number };
}

export default function AdminDashboardPage(): React.JSX.Element {
  const { data: usersData, isLoading: usersLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      const response = await api.get<UsersResponse>('/users?limit=1000');
      return response.data;
    },
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditLogResponse>({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const response = await api.get<AuditLogResponse>('/audit-log?limit=10');
      return response.data;
    },
  });

  const { data: contractStats } = useQuery<ContractStats>({
    queryKey: ['contract-stats'],
    queryFn: async () => {
      const response = await api.get<ContractStats>('/contracts/stats');
      return response.data;
    },
  });

  const { data: partnersData } = useQuery<PartnersResponse>({
    queryKey: ['partners-stats'],
    queryFn: async () => {
      const response = await api.get<PartnersResponse>('/partners?limit=1');
      return response.data;
    },
  });

  // Calculate user stats
  const userStats = {
    total: usersData?.meta.total || 0,
    active: usersData?.data.filter((u) => u.isActive).length || 0,
    inactive: usersData?.data.filter((u) => !u.isActive).length || 0,
    byRole: Object.values(UserRole).reduce(
      (acc, role) => {
        acc[role] = usersData?.data.filter((u) => u.role === role).length || 0;
        return acc;
      },
      {} as Record<UserRole, number>,
    ),
  };

  const getActionIcon = (action: AuditAction): React.ReactNode => {
    switch (action) {
      case AuditAction.CREATE:
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case AuditAction.UPDATE:
        return <Activity className="h-4 w-4 text-blue-600" />;
      case AuditAction.DELETE:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Systemübersicht und Schnellzugriff auf Verwaltungsfunktionen
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Benutzer gesamt</p>
                {usersLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold">{userStats.total}</p>
                )}
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Badge variant="default" className="bg-green-100 text-green-800">
                {userStats.active} aktiv
              </Badge>
              {userStats.inactive > 0 && (
                <Badge variant="secondary">{userStats.inactive} inaktiv</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Verträge</p>
                <p className="text-3xl font-bold">{contractStats?.total || 0}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              {(contractStats?.expiringIn30Days ?? 0) > 0 && (
                <Badge variant="destructive">
                  {contractStats?.expiringIn30Days} laufen bald ab
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Partner</p>
                <p className="text-3xl font-bold">{partnersData?.meta.total || 0}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Audit-Einträge</p>
                <p className="text-3xl font-bold">{auditData?.data ? '10+' : '-'}</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <ScrollText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Benutzer nach Rolle
            </CardTitle>
            <CardDescription>Verteilung der Berechtigungsstufen</CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(UserRole).map((role) => {
                  const count = userStats.byRole[role] || 0;
                  const percentage =
                    userStats.total > 0 ? Math.round((count / userStats.total) * 100) : 0;
                  return (
                    <div key={role} className="flex items-center gap-3">
                      <div className="w-24 text-sm font-medium">{USER_ROLE_LABELS[role]}</div>
                      <div className="h-2 flex-1 rounded-full bg-gray-100">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-sm">
                        <span className="font-medium">{count}</span>
                        <span className="text-muted-foreground ml-1">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 border-t pt-4">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full">
                  Alle Benutzer anzeigen
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Letzte Aktivitäten
            </CardTitle>
            <CardDescription>Kürzlich durchgeführte Aktionen</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : auditData?.data && auditData.data.length > 0 ? (
              <div className="space-y-3">
                {auditData.data.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {getActionIcon(log.action)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {log.user.firstName} {log.user.lastName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {AUDIT_ACTION_LABELS[log.action]} • {ENTITY_TYPE_LABELS[log.entityType]}
                      </p>
                    </div>
                    <p className="text-muted-foreground whitespace-nowrap text-xs">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Keine Aktivitäten vorhanden
              </p>
            )}
            <div className="mt-4 border-t pt-4">
              <Link href="/admin/audit-log">
                <Button variant="outline" className="w-full">
                  Vollständiges Audit-Log
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Schnellaktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/users/new">
              <Button variant="outline" className="h-auto w-full flex-col py-4">
                <UserPlus className="text-primary mb-2 h-8 w-8" />
                <span className="font-medium">Neuer Benutzer</span>
                <span className="text-muted-foreground text-xs">Benutzer anlegen</span>
              </Button>
            </Link>
            <Link href="/admin/audit-log">
              <Button variant="outline" className="h-auto w-full flex-col py-4">
                <ScrollText className="text-primary mb-2 h-8 w-8" />
                <span className="font-medium">Audit-Log</span>
                <span className="text-muted-foreground text-xs">Aktivitäten prüfen</span>
              </Button>
            </Link>
            <Link href="/admin/system">
              <Button variant="outline" className="h-auto w-full flex-col py-4">
                <Shield className="text-primary mb-2 h-8 w-8" />
                <span className="font-medium">Systemstatus</span>
                <span className="text-muted-foreground text-xs">System prüfen</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
