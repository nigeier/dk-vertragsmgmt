'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ContractStatus,
  ContractType,
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
} from '@drykorn/shared';

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  endDate: string | null;
  value: number | null;
  currency: string;
  partner: { id: string; name: string };
}

interface ContractsResponse {
  data: Contract[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function ContractsPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') as ContractStatus | null;
  const type = searchParams.get('type') as ContractType | null;

  const { data, isLoading } = useQuery<ContractsResponse>({
    queryKey: ['contracts', { page, search, status, type }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      return api.get(`/contracts?${params.toString()}`).then((res) => res.data);
    },
  });

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/contracts?${params.toString()}`);
  };

  const handleFilter = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/contracts?${params.toString()}`);
  };

  const handlePageChange = (newPage: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/contracts?${params.toString()}`);
  };

  const getStatusBadge = (status: ContractStatus): React.JSX.Element => {
    const variants: Record<ContractStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [ContractStatus.ACTIVE]: 'default',
      [ContractStatus.DRAFT]: 'secondary',
      [ContractStatus.PENDING_APPROVAL]: 'outline',
      [ContractStatus.EXPIRED]: 'destructive',
      [ContractStatus.TERMINATED]: 'destructive',
      [ContractStatus.ARCHIVED]: 'secondary',
    };
    return (
      <Badge variant={variants[status]}>
        {CONTRACT_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const formatCurrency = (value: number | null, currency: string): string => {
    if (value === null) return '-';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Verträge</h1>
        <Link href="/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Vertrag
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vertragsübersicht</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Suche nach Titel, Nummer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select
              value={status || 'all'}
              onValueChange={(value) => handleFilter('status', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {Object.values(ContractStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {CONTRACT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={type || 'all'}
              onValueChange={(value) => handleFilter('type', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Vertragsart" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Arten</SelectItem>
                {Object.values(ContractType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {CONTRACT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vertragsnr.</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enddatum</TableHead>
                    <TableHead className="text-right">Wert</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((contract) => (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {contract.contractNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {contract.title}
                        </div>
                      </TableCell>
                      <TableCell>{contract.partner.name}</TableCell>
                      <TableCell>{CONTRACT_TYPE_LABELS[contract.type]}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        {contract.endDate
                          ? new Date(contract.endDate).toLocaleDateString('de-DE')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(contract.value, contract.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Zeige {(page - 1) * 20 + 1} bis{' '}
                    {Math.min(page * 20, data.meta.total)} von {data.meta.total}{' '}
                    Verträgen
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
              <FileText className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Keine Verträge gefunden</h3>
              <p className="mt-1 text-muted-foreground">
                Erstellen Sie einen neuen Vertrag oder ändern Sie Ihre Filterkriterien.
              </p>
              <Link href="/contracts/new" className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer Vertrag
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
