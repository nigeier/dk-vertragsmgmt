'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { api } from '@/lib/api';
import { contractFormSchema, type ContractFormData } from '@/lib/schemas/contract.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  PartnerType,
} from '@drykorn/shared';
import { useToast } from '@/hooks/use-toast';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  isActive: boolean;
}

interface PartnersResponse {
  data: Partner[];
  meta: { total: number };
}

export default function NewContractPage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const { data: partnersData, isLoading: partnersLoading } = useQuery<PartnersResponse>({
    queryKey: ['partners-all'],
    queryFn: async () => {
      const response = await api.get<PartnersResponse>('/partners?limit=1000&isActive=true');
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      type: ContractType.SUPPLIER,
      status: ContractStatus.DRAFT,
      currency: 'EUR',
      autoRenewal: false,
      tags: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const response = await api.post<{ id: string }>('/contracts', {
        ...data,
        tags,
        value: data.value || undefined,
        noticePeriodDays: data.noticePeriodDays || undefined,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Vertrag erstellt',
        description: 'Der Vertrag wurde erfolgreich angelegt.',
      });
      router.push(`/contracts/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Vertrag konnte nicht erstellt werden',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ContractFormData): void => {
    createMutation.mutate(data);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neuer Vertrag</h1>
          <p className="text-muted-foreground">Erfassen Sie die Daten für einen neuen Vertrag</p>
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
                <CardDescription>Allgemeine Vertragsdaten</CardDescription>
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
                      onValueChange={(value) => setValue('type', value as ContractType)}
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
                      onValueChange={(value) => setValue('status', value as ContractStatus)}
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
                <CardDescription>
                  Wählen Sie den Geschäftspartner für diesen Vertrag
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partnersLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="partnerId">Partner *</Label>
                    <Select
                      value={partnerId}
                      onValueChange={(value) => setValue('partnerId', value)}
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
                    {partnersData?.data.length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        Keine Partner vorhanden.{' '}
                        <Link href="/partners" className="text-primary hover:underline">
                          Partner anlegen
                        </Link>
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
                <CardDescription>Zeitraum und Kündigungsfristen</CardDescription>
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
                <CardDescription>Vertragswert und Zahlungsbedingungen</CardDescription>
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
                        EUR
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Währung</Label>
                    <Select
                      value={watch('currency')}
                      onValueChange={(value) => setValue('currency', value)}
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
                <CardDescription>Kategorisieren Sie den Vertrag mit Schlagwörtern</CardDescription>
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
                  <p className="text-muted-foreground text-sm">Vertragsart</p>
                  <Badge variant="outline">{CONTRACT_TYPE_LABELS[selectedType]}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Badge variant="secondary">
                    {CONTRACT_STATUS_LABELS[selectedStatus || ContractStatus.DRAFT]}
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
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Vertrag erstellen
                </Button>
                <Link href="/contracts" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Abbrechen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h4 className="mb-2 font-medium">Hinweise</h4>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>• Felder mit * sind Pflichtfelder</li>
                  <li>• Die Vertragsnummer wird automatisch vergeben</li>
                  <li>• Dokumente können nach dem Erstellen hochgeladen werden</li>
                  <li>• Erinnerungen werden automatisch basierend auf dem Enddatum erstellt</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
