'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { api } from '@/lib/api';
import { contractFormSchema, type ContractFormData } from '@/lib/schemas/contract.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  Euro,
  Tag,
  Loader2,
  Save,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  ContractType,
  ContractStatus,
  CONTRACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from '@drykorn/shared';
import { useToast } from '@/hooks/use-toast';
import type { ContractForEdit, PartnersResponse } from '../types';

export default function EditContractPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const contractId = params.id as string;

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: contract, isLoading: contractLoading } = useQuery<ContractForEdit>({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const response = await api.get<ContractForEdit>(`/contracts/${contractId}`);
      return response.data;
    },
    enabled: !!contractId,
  });

  const { data: partnersData, isLoading: partnersLoading } = useQuery<PartnersResponse>({
    queryKey: ['partners-all'],
    queryFn: async () => {
      const response = await api.get<PartnersResponse>('/partners?limit=1000');
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
  });

  // Initialize form with contract data
  useEffect(() => {
    if (contract && !isInitialized) {
      reset({
        title: contract.title,
        description: contract.description || '',
        type: contract.type,
        status: contract.status,
        startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
        endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
        noticePeriodDays: contract.noticePeriodDays || null,
        autoRenewal: contract.autoRenewal,
        value: contract.value || null,
        currency: contract.currency,
        paymentTerms: contract.paymentTerms || '',
        partnerId: contract.partnerId,
      });
      setTags(contract.tags || []);
      setIsInitialized(true);
    }
  }, [contract, reset, isInitialized]);

  const updateMutation = useMutation({
    mutationFn: (data: ContractFormData) =>
      api.put(`/contracts/${contractId}`, {
        ...data,
        tags,
        value: data.value || undefined,
        noticePeriodDays: data.noticePeriodDays || undefined,
        description: data.description || undefined,
        paymentTerms: data.paymentTerms || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Vertrag aktualisiert',
        description: 'Die Änderungen wurden erfolgreich gespeichert.',
      });
      router.push(`/contracts/${contractId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Vertrag konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContractFormData): void => {
    updateMutation.mutate(data);
  };

  const addTag = (): void => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string): void => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const selectedType = watch('type');
  const selectedStatus = watch('status');
  const partnerId = watch('partnerId');

  if (contractLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="text-muted-foreground h-12 w-12" />
        <h2 className="mt-4 text-xl font-semibold">Vertrag nicht gefunden</h2>
        <Link href="/contracts" className="mt-4">
          <Button>Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/contracts/${contractId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Vertrag bearbeiten</h1>
          <p className="text-muted-foreground font-mono">{contract.contractNumber}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Grundinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    placeholder="z.B. Liefervertrag Stoffe 2024"
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="text-destructive flex items-center gap-1 text-sm">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <textarea
                    id="description"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Detaillierte Beschreibung des Vertrags..."
                    {...register('description')}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Vertragsart *</Label>
                    <Select
                      value={selectedType}
                      onValueChange={(value) =>
                        setValue('type', value as ContractType, { shouldDirty: true })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vertragsart wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ContractType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {CONTRACT_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) =>
                        setValue('status', value as ContractStatus, { shouldDirty: true })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ContractStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {CONTRACT_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partner Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Vertragspartner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="partnerId">Partner *</Label>
                    <Select
                      value={partnerId}
                      onValueChange={(value) => setValue('partnerId', value, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Partner auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {partnersData?.data.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="text-muted-foreground h-4 w-4" />
                              {partner.name}
                              {!partner.isActive && (
                                <Badge variant="secondary" className="ml-2">
                                  Inaktiv
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.partnerId && (
                      <p className="text-destructive flex items-center gap-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.partnerId.message}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Laufzeit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Startdatum</Label>
                    <Input id="startDate" type="date" {...register('startDate')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Enddatum</Label>
                    <Input id="endDate" type="date" {...register('endDate')} />
                    {errors.endDate && (
                      <p className="text-destructive flex items-center gap-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="noticePeriodDays">Kündigungsfrist (Tage)</Label>
                    <Input
                      id="noticePeriodDays"
                      type="number"
                      min="0"
                      placeholder="z.B. 90"
                      {...register('noticePeriodDays', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Automatische Verlängerung</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="autoRenewal"
                        {...register('autoRenewal')}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="autoRenewal" className="font-normal">
                        Vertrag verlängert sich automatisch
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Finanzen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="value">Vertragswert</Label>
                    <div className="relative">
                      <Input
                        id="value"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pr-12"
                        {...register('value', { valueAsNumber: true })}
                      />
                      <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2">
                        {watch('currency') || 'EUR'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Währung</Label>
                    <Select
                      value={watch('currency')}
                      onValueChange={(value) => setValue('currency', value, { shouldDirty: true })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="GBP">GBP - Britisches Pfund</SelectItem>
                        <SelectItem value="CHF">CHF - Schweizer Franken</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Zahlungsbedingungen</Label>
                  <Input
                    id="paymentTerms"
                    placeholder="z.B. 30 Tage netto"
                    {...register('paymentTerms')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Tag eingeben und Enter drücken"
                  />
                  <Button type="button" variant="secondary" onClick={addTag}>
                    Hinzufügen
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">Vertragsnummer</p>
                  <p className="font-mono font-medium">{contract.contractNumber}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">Vertragsart</p>
                  <Badge variant="outline">
                    {selectedType ? CONTRACT_TYPE_LABELS[selectedType] : '-'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Badge variant="secondary">
                    {selectedStatus ? CONTRACT_STATUS_LABELS[selectedStatus] : '-'}
                  </Badge>
                </div>
                {partnerId && partnersData?.data && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Partner</p>
                    <p className="font-medium">
                      {partnersData.data.find((p) => p.id === partnerId)?.name}
                    </p>
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Änderungen speichern
                </Button>
                <Link href={`/contracts/${contractId}`} className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Abbrechen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Warning */}
            {isDirty && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-yellow-800">
                    Sie haben ungespeicherte Änderungen. Vergessen Sie nicht zu speichern!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
