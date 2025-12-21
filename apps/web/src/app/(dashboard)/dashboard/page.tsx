'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertTriangle, Clock, TrendingUp, Users, Calendar } from 'lucide-react';
import { CONTRACT_STATUS_LABELS, type ContractStats } from '@drykorn/shared';
import Link from 'next/link';

interface ExpiringContract {
  id: string;
  title: string;
  contractNumber: string;
  endDate: string;
  partner: {
    name: string;
  };
}

export default function DashboardPage(): React.JSX.Element {
  const { data: stats, isLoading } = useQuery<ContractStats>({
    queryKey: ['contract-stats'],
    queryFn: async () => {
      const response = await api.get<ContractStats>('/contracts/stats');
      return response.data;
    },
  });

  const { data: expiring } = useQuery<ExpiringContract[]>({
    queryKey: ['expiring-contracts'],
    queryFn: async () => {
      const response = await api.get<ExpiringContract[]>('/contracts/expiring?days=30');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verträge gesamt</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-muted-foreground text-xs">{stats?.byStatus?.ACTIVE ?? 0} aktiv</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laufen bald ab</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats?.expiringIn30Days ?? 0}</div>
            <p className="text-muted-foreground text-xs">In den nächsten 30 Tagen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamtwert</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalValue ?? 0)}</div>
            <p className="text-muted-foreground text-xs">Aktive Verträge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entwürfe</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byStatus?.DRAFT ?? 0}</div>
            <p className="text-muted-foreground text-xs">Zur Bearbeitung</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Verträge nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.byStatus &&
                Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          status === 'ACTIVE'
                            ? 'bg-green-500'
                            : status === 'DRAFT'
                              ? 'bg-gray-500'
                              : status === 'EXPIRED'
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                        }`}
                      />
                      <span className="text-sm">
                        {CONTRACT_STATUS_LABELS[status as keyof typeof CONTRACT_STATUS_LABELS]}
                      </span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bald ablaufende Verträge</CardTitle>
            <Link
              href="/contracts?status=ACTIVE&expiring=30"
              className="text-primary text-sm hover:underline"
            >
              Alle anzeigen
            </Link>
          </CardHeader>
          <CardContent>
            {expiring && expiring.length > 0 ? (
              <div className="space-y-4">
                {expiring
                  .slice(0, 5)
                  .map(
                    (contract: {
                      id: string;
                      title: string;
                      endDate: string;
                      partner: { name: string };
                    }) => (
                      <Link
                        key={contract.id}
                        href={`/contracts/${contract.id}`}
                        className="hover:bg-muted flex items-center justify-between rounded-lg p-2"
                      >
                        <div>
                          <p className="font-medium">{contract.title}</p>
                          <p className="text-muted-foreground text-sm">{contract.partner.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-amber-500">
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {new Date(contract.endDate).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      </Link>
                    ),
                  )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">
                Keine Verträge laufen in den nächsten 30 Tagen ab.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/contracts/new"
              className="hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <FileText className="text-primary h-8 w-8" />
              <div>
                <p className="font-medium">Neuer Vertrag</p>
                <p className="text-muted-foreground text-sm">Vertrag erstellen</p>
              </div>
            </Link>
            <Link
              href="/partners"
              className="hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Users className="text-primary h-8 w-8" />
              <div>
                <p className="font-medium">Partner</p>
                <p className="text-muted-foreground text-sm">Verwalten</p>
              </div>
            </Link>
            <Link
              href="/deadlines"
              className="hover:bg-muted flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <Clock className="text-primary h-8 w-8" />
              <div>
                <p className="font-medium">Fristen</p>
                <p className="text-muted-foreground text-sm">Übersicht</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
