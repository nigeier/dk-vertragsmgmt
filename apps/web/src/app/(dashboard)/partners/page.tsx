'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Plus,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Mail,
  Phone,
  User,
  Loader2,
} from 'lucide-react';
import { PartnerType, PARTNER_TYPE_LABELS } from '@drykorn/shared';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  _count?: { contracts: number };
}

interface PartnersResponse {
  data: Partner[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const partnerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  type: z.nativeEnum(PartnerType),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

export default function PartnersPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletePartner, setDeletePartner] = useState<Partner | null>(null);

  const canManage = hasRole('ADMIN') || hasRole('MANAGER');
  const canDelete = hasRole('ADMIN');

  const page = parseInt(searchParams.get('page') || '1');
  const type = searchParams.get('type') as PartnerType | null;
  const isActive = searchParams.get('isActive');

  const { data, isLoading } = useQuery<PartnersResponse>({
    queryKey: ['partners', { page, search: searchParams.get('search'), type, isActive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (searchParams.get('search')) params.set('search', searchParams.get('search')!);
      if (type) params.set('type', type);
      if (isActive !== null && isActive !== 'all') params.set('isActive', isActive);
      const response = await api.get<PartnersResponse>(`/partners?${params.toString()}`);
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      isActive: true,
      type: PartnerType.SUPPLIER,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PartnerFormData) => api.post('/partners', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setIsDialogOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PartnerFormData }) =>
      api.put(`/partners/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setIsDialogOpen(false);
      setEditingPartner(null);
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/partners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      setDeletePartner(null);
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
    router.push(`/partners?${params.toString()}`);
  };

  const handleFilter = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/partners?${params.toString()}`);
  };

  const handlePageChange = (newPage: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/partners?${params.toString()}`);
  };

  const openCreateDialog = (): void => {
    setEditingPartner(null);
    reset({
      isActive: true,
      type: PartnerType.SUPPLIER,
      name: '',
      address: '',
      contactPerson: '',
      email: '',
      phone: '',
      taxId: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (partner: Partner): void => {
    setEditingPartner(partner);
    reset({
      name: partner.name,
      type: partner.type,
      address: partner.address || '',
      contactPerson: partner.contactPerson || '',
      email: partner.email || '',
      phone: partner.phone || '',
      taxId: partner.taxId || '',
      notes: partner.notes || '',
      isActive: partner.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PartnerFormData): void => {
    const cleanedData = {
      ...data,
      email: data.email || undefined,
    };
    if (editingPartner) {
      updateMutation.mutate({ id: editingPartner.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const getTypeBadge = (type: PartnerType): React.JSX.Element => {
    const variants: Record<PartnerType, 'default' | 'secondary' | 'outline'> = {
      [PartnerType.SUPPLIER]: 'default',
      [PartnerType.CUSTOMER]: 'secondary',
      [PartnerType.BOTH]: 'outline',
      [PartnerType.OTHER]: 'outline',
    };
    return <Badge variant={variants[type]}>{PARTNER_TYPE_LABELS[type]}</Badge>;
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Partner</h1>
        {canManage && (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Partner
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partnerübersicht</CardTitle>
          <CardDescription>
            Verwalten Sie Ihre Geschäftspartner, Lieferanten und Kunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Suche nach Name, Kontakt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select value={type || 'all'} onValueChange={(value) => handleFilter('type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                {Object.values(PartnerType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PARTNER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={isActive || 'all'}
              onValueChange={(value) => handleFilter('isActive', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="true">Aktiv</SelectItem>
                <SelectItem value="false">Inaktiv</SelectItem>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Ansprechpartner</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Verträge</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Aktionen</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="text-muted-foreground h-4 w-4" />
                          <span className="font-medium">{partner.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(partner.type)}</TableCell>
                      <TableCell>
                        {partner.contactPerson && (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="text-muted-foreground h-3 w-3" />
                            {partner.contactPerson}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {partner.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="text-muted-foreground h-3 w-3" />
                              <a
                                href={`mailto:${partner.email}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {partner.email}
                              </a>
                            </div>
                          )}
                          {partner.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="text-muted-foreground h-3 w-3" />
                              {partner.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{partner._count?.contracts || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.isActive ? 'default' : 'secondary'}>
                          {partner.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(partner)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletePartner(partner)}
                              >
                                <Trash2 className="text-destructive h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Zeige {(page - 1) * 20 + 1} bis {Math.min(page * 20, data.meta.total)} von{' '}
                    {data.meta.total} Partnern
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
              <Building2 className="text-muted-foreground h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium">Keine Partner gefunden</h3>
              <p className="text-muted-foreground mt-1">
                Erstellen Sie einen neuen Partner oder ändern Sie Ihre Filterkriterien.
              </p>
              {canManage && (
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer Partner
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Partner bearbeiten' : 'Neuer Partner'}</DialogTitle>
            <DialogDescription>
              {editingPartner
                ? 'Bearbeiten Sie die Partnerdaten'
                : 'Erfassen Sie die Daten des neuen Partners'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Typ *</Label>
                <Select
                  value={watch('type')}
                  onValueChange={(value) => setValue('type', value as PartnerType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PartnerType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {PARTNER_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Ansprechpartner</Label>
                <Input id="contactPerson" {...register('contactPerson')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">USt-IdNr.</Label>
                <Input id="taxId" {...register('taxId')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Input id="notes" {...register('notes')} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">Partner ist aktiv</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPartner ? 'Speichern' : 'Erstellen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePartner} onOpenChange={() => setDeletePartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partner löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Partner &quot;{deletePartner?.name}&quot; wirklich löschen? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePartner && deleteMutation.mutate(deletePartner.id)}
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
