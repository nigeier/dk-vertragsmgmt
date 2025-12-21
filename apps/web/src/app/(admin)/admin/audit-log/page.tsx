'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  FileText,
  Building2,
  Bell,
  Download,
  Eye,
  Pencil,
  Trash2,
  Plus,
  FileDown,
  Loader2,
} from 'lucide-react';
import { AuditAction, EntityType, AUDIT_ACTION_LABELS, ENTITY_TYPE_LABELS } from '@drykorn/shared';
import { formatDateTime } from '@/lib/utils';

interface AuditLogEntry {
  id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  contract?: {
    contractNumber: string;
    title: string;
  };
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ACTION_ICONS: Record<AuditAction, React.ReactNode> = {
  [AuditAction.CREATE]: <Plus className="h-4 w-4 text-green-600" />,
  [AuditAction.READ]: <Eye className="h-4 w-4 text-blue-600" />,
  [AuditAction.UPDATE]: <Pencil className="h-4 w-4 text-yellow-600" />,
  [AuditAction.DELETE]: <Trash2 className="h-4 w-4 text-red-600" />,
  [AuditAction.DOWNLOAD]: <Download className="h-4 w-4 text-purple-600" />,
  [AuditAction.EXPORT]: <Download className="h-4 w-4 text-indigo-600" />,
};

const ACTION_COLORS: Record<AuditAction, string> = {
  [AuditAction.CREATE]: 'bg-green-100 text-green-800 border-green-200',
  [AuditAction.READ]: 'bg-blue-100 text-blue-800 border-blue-200',
  [AuditAction.UPDATE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [AuditAction.DELETE]: 'bg-red-100 text-red-800 border-red-200',
  [AuditAction.DOWNLOAD]: 'bg-purple-100 text-purple-800 border-purple-200',
  [AuditAction.EXPORT]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const ENTITY_ICONS: Record<EntityType, React.ReactNode> = {
  [EntityType.CONTRACT]: <FileText className="h-4 w-4" />,
  [EntityType.DOCUMENT]: <ScrollText className="h-4 w-4" />,
  [EntityType.PARTNER]: <Building2 className="h-4 w-4" />,
  [EntityType.USER]: <User className="h-4 w-4" />,
  [EntityType.REMINDER]: <Bell className="h-4 w-4" />,
};

export default function AuditLogPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const action = searchParams.get('action') as AuditAction | null;
  const entityType = searchParams.get('entityType') as EntityType | null;
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const blob = await api.downloadBlob(`/audit-log/export?${params.toString()}`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      console.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ['audit-log', { page, action, entityType, dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const response = await api.get<AuditLogResponse>(`/audit-log?${params.toString()}`);
      return response.data;
    },
  });

  const handleFilter = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/admin/audit-log?${params.toString()}`);
  };

  const handleDateFilter = (): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (localDateFrom) {
      params.set('dateFrom', localDateFrom);
    } else {
      params.delete('dateFrom');
    }
    if (localDateTo) {
      params.set('dateTo', localDateTo);
    } else {
      params.delete('dateTo');
    }
    params.set('page', '1');
    router.push(`/admin/audit-log?${params.toString()}`);
  };

  const handlePageChange = (newPage: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/audit-log?${params.toString()}`);
  };

  const clearFilters = (): void => {
    setLocalDateFrom('');
    setLocalDateTo('');
    router.push('/admin/audit-log');
  };

  const hasActiveFilters = action || entityType || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit-Log</h1>
        <p className="text-muted-foreground">Protokoll aller Systemaktivitäten und Änderungen</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Aktivitätsprotokoll
              </CardTitle>
              <CardDescription>{data?.meta.total || 0} Einträge gefunden</CardDescription>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Filter zurücksetzen
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                CSV Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <Select
              value={action || 'all'}
              onValueChange={(value) => handleFilter('action', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Aktion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktionen</SelectItem>
                {Object.values(AuditAction).map((a) => (
                  <SelectItem key={a} value={a}>
                    <div className="flex items-center gap-2">
                      {ACTION_ICONS[a]}
                      {AUDIT_ACTION_LABELS[a]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={entityType || 'all'}
              onValueChange={(value) => handleFilter('entityType', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Objekt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Objekte</SelectItem>
                {Object.values(EntityType).map((e) => (
                  <SelectItem key={e} value={e}>
                    <div className="flex items-center gap-2">
                      {ENTITY_ICONS[e]}
                      {ENTITY_TYPE_LABELS[e]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <Input
                type="date"
                value={localDateFrom}
                onChange={(e) => setLocalDateFrom(e.target.value)}
                className="w-36"
                placeholder="Von"
              />
              <span className="text-muted-foreground">bis</span>
              <Input
                type="date"
                value={localDateTo}
                onChange={(e) => setLocalDateTo(e.target.value)}
                className="w-36"
                placeholder="Bis"
              />
              <Button variant="secondary" size="sm" onClick={handleDateFilter}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Zeitpunkt</TableHead>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Aktion</TableHead>
                    <TableHead>Objekt</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP-Adresse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
                            {log.user.firstName[0]}
                            {log.user.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-muted-foreground text-xs">{log.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${ACTION_COLORS[log.action]} flex w-fit items-center gap-1`}
                        >
                          {ACTION_ICONS[log.action]}
                          {AUDIT_ACTION_LABELS[log.action]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ENTITY_ICONS[log.entityType]}
                          <span>{ENTITY_TYPE_LABELS[log.entityType]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.contract ? (
                          <div className="text-sm">
                            <p className="font-medium">{log.contract.title}</p>
                            <p className="text-muted-foreground font-mono text-xs">
                              {log.contract.contractNumber}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-mono text-xs">
                            {log.entityId.slice(0, 8)}...
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground font-mono text-xs">
                          {log.ipAddress || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Zeige {(page - 1) * 25 + 1} bis {Math.min(page * 25, data.meta.total)} von{' '}
                    {data.meta.total} Einträgen
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                      Seite {page} von {data.meta.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === data.meta.totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <ScrollText className="text-muted-foreground h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium">Keine Einträge gefunden</h3>
              <p className="text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Versuchen Sie, die Filterkriterien anzupassen.'
                  : 'Es wurden noch keine Aktivitäten protokolliert.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Aktionen</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(AuditAction).map((a) => (
                  <Badge
                    key={a}
                    variant="outline"
                    className={`${ACTION_COLORS[a]} flex items-center gap-1`}
                  >
                    {ACTION_ICONS[a]}
                    {AUDIT_ACTION_LABELS[a]}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Objekttypen</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(EntityType).map((e) => (
                  <Badge key={e} variant="secondary" className="flex items-center gap-1">
                    {ENTITY_ICONS[e]}
                    {ENTITY_TYPE_LABELS[e]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
