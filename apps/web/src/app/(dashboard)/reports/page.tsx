'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Euro,
  Calendar,
  PieChart,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  ContractStatus,
  ContractType,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
} from '@drykorn/shared';
import { formatCurrency } from '@/lib/utils';

interface ContractStats {
  total: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  totalValue: number;
}

interface ExpiringContract {
  id: string;
  contractNumber: string;
  title: string;
  endDate: string;
  partner: { name: string };
  value: number | null;
  currency: string;
}

export default function ReportsPage(): React.JSX.Element {
  const { data: stats, isLoading: statsLoading } = useQuery<ContractStats>({
    queryKey: ['contract-stats'],
    queryFn: async () => {
      const response = await api.get<ContractStats>('/contracts/stats');
      return response.data;
    },
  });

  const { data: expiringContracts, isLoading: expiringLoading } = useQuery<ExpiringContract[]>({
    queryKey: ['expiring-contracts'],
    queryFn: async () => {
      const response = await api.get<ExpiringContract[]>('/contracts/expiring?days=90');
      return response.data;
    },
  });

  const statusColors: Record<ContractStatus, string> = {
    [ContractStatus.ACTIVE]: 'bg-green-500',
    [ContractStatus.DRAFT]: 'bg-gray-400',
    [ContractStatus.PENDING_APPROVAL]: 'bg-yellow-500',
    [ContractStatus.EXPIRED]: 'bg-red-500',
    [ContractStatus.TERMINATED]: 'bg-red-700',
    [ContractStatus.ARCHIVED]: 'bg-gray-600',
  };

  const typeColors: Record<ContractType, string> = {
    [ContractType.SUPPLIER]: 'bg-blue-500',
    [ContractType.CUSTOMER]: 'bg-green-500',
    [ContractType.EMPLOYMENT]: 'bg-purple-500',
    [ContractType.LEASE]: 'bg-orange-500',
    [ContractType.LICENSE]: 'bg-pink-500',
    [ContractType.NDA]: 'bg-gray-500',
    [ContractType.SERVICE]: 'bg-cyan-500',
    [ContractType.OTHER]: 'bg-gray-400',
  };

  const getStatusPercentage = (status: ContractStatus): number => {
    if (!stats?.total || stats.total === 0) return 0;
    return Math.round((stats.byStatus[status] / stats.total) * 100);
  };

  const getTypePercentage = (type: ContractType): number => {
    if (!stats?.total || stats.total === 0) return 0;
    return Math.round((stats.byType[type] / stats.total) * 100);
  };

  const getDaysUntilExpiry = (endDate: string): number => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getExpiryBadge = (days: number): React.JSX.Element => {
    if (days <= 7) {
      return <Badge variant="destructive">Dringend</Badge>;
    }
    if (days <= 30) {
      return <Badge className="bg-orange-500">Bald fällig</Badge>;
    }
    return <Badge variant="secondary">In {days} Tagen</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Berichte & Statistiken</h1>
        <p className="text-muted-foreground">Übersicht und Analysen Ihrer Vertragslandschaft</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 rounded-full p-3">
                  <FileText className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Verträge gesamt</p>
                  <p className="text-3xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Aktive Verträge</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.byStatus[ContractStatus.ACTIVE] || 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-yellow-100 p-3">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Laufen in 30 Tagen ab</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats?.expiringIn30Days || 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {statsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <Euro className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Gesamtvolumen</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats?.totalValue || 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status and Type Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Verteilung nach Status
            </CardTitle>
            <CardDescription>Aktuelle Statusverteilung aller Verträge</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(ContractStatus).map((status) => {
                  const count = stats?.byStatus[status] || 0;
                  const percentage = getStatusPercentage(status);
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
                      <span className="flex-1 text-sm">{CONTRACT_STATUS_LABELS[status]}</span>
                      <span className="text-sm font-medium">{count}</span>
                      <div className="h-2 w-24 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${statusColors[status]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right text-sm">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Verteilung nach Vertragsart
            </CardTitle>
            <CardDescription>Anzahl der Verträge nach Kategorie</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.values(ContractType).map((type) => {
                  const count = stats?.byType[type] || 0;
                  const percentage = getTypePercentage(type);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${typeColors[type]}`} />
                      <span className="flex-1 text-sm">{CONTRACT_TYPE_LABELS[type]}</span>
                      <span className="text-sm font-medium">{count}</span>
                      <div className="h-2 w-24 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${typeColors[type]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right text-sm">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Ablaufende Verträge (nächste 90 Tage)
          </CardTitle>
          <CardDescription>
            Verträge, die bald ablaufen und Aufmerksamkeit erfordern
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiringLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : expiringContracts && expiringContracts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vertrag</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Ablaufdatum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Wert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringContracts.map((contract) => {
                  const days = getDaysUntilExpiry(contract.endDate);
                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{contract.title}</p>
                          <p className="text-muted-foreground text-sm">{contract.contractNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="text-muted-foreground h-4 w-4" />
                          {contract.partner.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(contract.endDate).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>{getExpiryBadge(days)}</TableCell>
                      <TableCell className="text-right">
                        {contract.value ? formatCurrency(contract.value, contract.currency) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-medium">Keine ablaufenden Verträge</h3>
              <p className="text-muted-foreground mt-1">
                In den nächsten 90 Tagen laufen keine Verträge ab.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiry Timeline */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={stats?.expiringIn30Days ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Nächste 30 Tage</p>
                <p className="text-3xl font-bold">{stats?.expiringIn30Days || 0}</p>
              </div>
              <AlertTriangle
                className={`h-8 w-8 ${stats?.expiringIn30Days ? 'text-red-500' : 'text-muted-foreground'}`}
              />
            </div>
          </CardContent>
        </Card>
        <Card className={stats?.expiringIn60Days ? 'border-yellow-200 bg-yellow-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Nächste 60 Tage</p>
                <p className="text-3xl font-bold">{stats?.expiringIn60Days || 0}</p>
              </div>
              <Clock
                className={`h-8 w-8 ${stats?.expiringIn60Days ? 'text-yellow-500' : 'text-muted-foreground'}`}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Nächste 90 Tage</p>
                <p className="text-3xl font-bold">{stats?.expiringIn90Days || 0}</p>
              </div>
              <Calendar className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
