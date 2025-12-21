'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  Euro,
  Tag,
  Loader2,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  File,
  User,
  UserCog,
  Bell,
  X,
} from 'lucide-react';
import {
  ContractType,
  ContractStatus,
  CONTRACT_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
  ReminderType,
  REMINDER_TYPE_LABELS,
} from '@drykorn/shared';
import { formatDate, formatCurrency, daysUntil } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  description?: string;
  type: ContractType;
  status: ContractStatus;
  startDate?: string;
  endDate?: string;
  noticePeriodDays?: number;
  autoRenewal: boolean;
  value?: number;
  currency: string;
  paymentTerms?: string;
  tags: string[];
  partner: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
  reminders: Array<{
    id: string;
    type: ReminderType;
    reminderDate: string;
    isSent: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ActiveUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function ContractDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statusToChange, setStatusToChange] = useState<ContractStatus | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMainDocument, setIsMainDocument] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [assignReason, setAssignReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contractId = params.id as string;
  const canManage = hasRole('ADMIN') || hasRole('MANAGER');

  const { data: contract, isLoading } = useQuery<Contract>({
    queryKey: ['contract', contractId],
    queryFn: async () => {
      const response = await api.get<Contract>(`/contracts/${contractId}`);
      return response.data;
    },
    enabled: !!contractId,
  });

  // Query für aktive Benutzer (für Zuweisung)
  const { data: activeUsers = [] } = useQuery<ActiveUser[]>({
    queryKey: ['users', 'active'],
    queryFn: async () => {
      const response = await api.get<ActiveUser[]>('/users/active/list');
      return response.data;
    },
    enabled: canManage && showAssignDialog,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contracts/${contractId}`),
    onSuccess: () => {
      toast({
        title: 'Vertrag gelöscht',
        description: 'Der Vertrag wurde erfolgreich gelöscht.',
      });
      router.push('/contracts');
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Vertrag konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: ContractStatus) =>
      api.patch(`/contracts/${contractId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast({
        title: 'Status geändert',
        description: 'Der Vertragsstatus wurde aktualisiert.',
      });
      setStatusToChange(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Status konnte nicht geändert werden',
        variant: 'destructive',
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(
        `/documents/upload?contractId=${contractId}&isMainDocument=${isMainDocument}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast({
        title: 'Dokument hochgeladen',
        description: 'Das Dokument wurde erfolgreich hochgeladen.',
      });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setIsMainDocument(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Dokument konnte nicht hochgeladen werden',
        variant: 'destructive',
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => api.delete(`/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast({
        title: 'Dokument gelöscht',
        description: 'Das Dokument wurde erfolgreich gelöscht.',
      });
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Dokument konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: { ownerId: string; reason?: string }) =>
      api.patch(`/contracts/${contractId}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast({
        title: 'Vertrag zugewiesen',
        description: 'Der Vertrag wurde erfolgreich neu zugewiesen.',
      });
      setShowAssignDialog(false);
      setSelectedOwnerId('');
      setAssignReason('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Vertrag konnte nicht zugewiesen werden',
        variant: 'destructive',
      });
    },
  });

  const handleAssign = (): void => {
    if (selectedOwnerId) {
      assignMutation.mutate({
        ownerId: selectedOwnerId,
        reason: assignReason || undefined,
      });
    }
  };

  const handleDownload = async (documentId: string, fileName: string): Promise<void> => {
    try {
      const blob = await api.downloadBlob(`/documents/${documentId}/download`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Fehler',
        description: 'Dokument konnte nicht heruntergeladen werden',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = (): void => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <Badge variant={variants[status]} className="text-sm">
        {CONTRACT_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const getDaysUntilEnd = (): { days: number; color: string; icon: React.ReactNode } | null => {
    if (!contract?.endDate) return null;
    const days = daysUntil(contract.endDate);
    if (days <= 0) {
      return { days: 0, color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> };
    }
    if (days <= 30) {
      return { days, color: 'text-orange-600', icon: <Clock className="h-4 w-4" /> };
    }
    if (days <= 90) {
      return { days, color: 'text-yellow-600', icon: <Calendar className="h-4 w-4" /> };
    }
    return { days, color: 'text-green-600', icon: <CheckCircle2 className="h-4 w-4" /> };
  };

  const expiryInfo = getDaysUntilEnd();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="text-muted-foreground h-12 w-12" />
        <h2 className="mt-4 text-xl font-semibold">Vertrag nicht gefunden</h2>
        <p className="text-muted-foreground mt-2">
          Der angeforderte Vertrag existiert nicht oder wurde gelöscht.
        </p>
        <Link href="/contracts" className="mt-4">
          <Button>Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contracts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{contract.title}</h1>
              {getStatusBadge(contract.status)}
            </div>
            <p className="text-muted-foreground font-mono">{contract.contractNumber}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`/contracts/${contractId}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Bearbeiten
              </Button>
            </Link>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vertragsdetails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Beschreibung</p>
                  <p className="mt-1">{contract.description}</p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-sm">Vertragsart</p>
                  <p className="mt-1 font-medium">{CONTRACT_TYPE_LABELS[contract.type]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Automatische Verlängerung</p>
                  <p className="mt-1 font-medium">{contract.autoRenewal ? 'Ja' : 'Nein'}</p>
                </div>
              </div>

              {contract.tags.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-2 text-sm">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {contract.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Vertragspartner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{contract.partner.name}</p>
                  {contract.partner.email && (
                    <p className="text-muted-foreground text-sm">{contract.partner.email}</p>
                  )}
                  {contract.partner.phone && (
                    <p className="text-muted-foreground text-sm">{contract.partner.phone}</p>
                  )}
                </div>
                <Link href={`/partners`}>
                  <Button variant="outline" size="sm">
                    Zum Partner
                  </Button>
                </Link>
              </div>
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
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-sm">Startdatum</p>
                  <p className="mt-1 font-medium">
                    {contract.startDate ? formatDate(contract.startDate) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Enddatum</p>
                  <p className="mt-1 font-medium">
                    {contract.endDate ? formatDate(contract.endDate) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Kündigungsfrist</p>
                  <p className="mt-1 font-medium">
                    {contract.noticePeriodDays ? `${contract.noticePeriodDays} Tage` : '-'}
                  </p>
                </div>
              </div>
              {expiryInfo && (
                <div className={`mt-4 flex items-center gap-2 ${expiryInfo.color}`}>
                  {expiryInfo.icon}
                  <span className="font-medium">
                    {expiryInfo.days === 0
                      ? 'Vertrag ist abgelaufen'
                      : `Läuft in ${expiryInfo.days} Tagen ab`}
                  </span>
                </div>
              )}
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
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-sm">Vertragswert</p>
                  <p className="mt-1 text-2xl font-bold">
                    {contract.value ? formatCurrency(contract.value, contract.currency) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Zahlungsbedingungen</p>
                  <p className="mt-1 font-medium">{contract.paymentTerms || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5" />
                Dokumente
                {contract.documents.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {contract.documents.length}
                  </Badge>
                )}
              </CardTitle>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Hochladen
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {contract.documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Größe</TableHead>
                      <TableHead>Hochgeladen</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <File className="text-muted-foreground h-4 w-4" />
                            {doc.originalName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.mimeType.split('/')[1]?.toUpperCase() || 'DATEI'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(doc.size)}
                        </TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.id, doc.originalName)}
                              title="Herunterladen"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDocumentToDelete(doc.id)}
                                title="Löschen"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center py-8">
                  <File className="mb-2 h-10 w-10" />
                  <p>Keine Dokumente vorhanden</p>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowUploadDialog(true)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Erstes Dokument hochladen
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Change */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Status ändern</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={contract.status}
                  onValueChange={(value) => setStatusToChange(value as ContractStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ContractStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {CONTRACT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Erinnerungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.reminders.length > 0 ? (
                <div className="space-y-3">
                  {contract.reminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{REMINDER_TYPE_LABELS[reminder.type]}</p>
                        <p className="text-muted-foreground text-sm">
                          {formatDate(reminder.reminderDate)}
                        </p>
                      </div>
                      <Badge variant={reminder.isSent ? 'default' : 'outline'}>
                        {reminder.isSent ? 'Versendet' : 'Ausstehend'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Keine Erinnerungen eingerichtet</p>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-sm">Verantwortlich</p>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="text-muted-foreground h-4 w-4" />
                    <span>
                      {contract.owner.firstName} {contract.owner.lastName}
                    </span>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOwnerId(contract.owner.id);
                        setShowAssignDialog(true);
                      }}
                      title="Vertrag zuweisen"
                    >
                      <UserCog className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Erstellt von</p>
                <div className="mt-1 flex items-center gap-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span>
                    {contract.createdBy.firstName} {contract.createdBy.lastName}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Erstellt am</p>
                <p className="mt-1">{formatDate(contract.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Zuletzt geändert</p>
                <p className="mt-1">{formatDate(contract.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vertrag löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Vertrag &quot;{contract.title}&quot; wirklich löschen? Diese Aktion
              kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Dialog */}
      <AlertDialog open={!!statusToChange} onOpenChange={() => setStatusToChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Status ändern</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den Status auf &quot;
              {statusToChange && CONTRACT_STATUS_LABELS[statusToChange]}&quot; ändern?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusToChange && statusMutation.mutate(statusToChange)}
            >
              {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokument hochladen</DialogTitle>
            <DialogDescription>Laden Sie ein Dokument zu diesem Vertrag hoch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Datei auswählen</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="flex-1"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </div>
              {selectedFile && (
                <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
                  <File className="text-muted-foreground h-5 w-5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isMainDocument"
                checked={isMainDocument}
                onCheckedChange={(checked) => setIsMainDocument(checked as boolean)}
              />
              <Label htmlFor="isMainDocument" className="text-sm font-normal">
                Als Hauptdokument markieren
              </Label>
            </div>
            <p className="text-muted-foreground text-xs">
              Erlaubte Dateitypen: PDF, Word, Excel, Bilder (max. 10 MB)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie dieses Dokument wirklich löschen? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && deleteDocumentMutation.mutate(documentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocumentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Contract Dialog */}
      <Dialog
        open={showAssignDialog}
        onOpenChange={(open) => {
          setShowAssignDialog(open);
          if (!open) {
            setSelectedOwnerId('');
            setAssignReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vertrag zuweisen</DialogTitle>
            <DialogDescription>
              Wählen Sie einen neuen Verantwortlichen für diesen Vertrag.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Neuer Verantwortlicher</Label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger id="owner">
                  <SelectValue placeholder="Benutzer auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-muted-foreground text-xs">({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Grund (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Grund für die Neuzuweisung..."
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-muted-foreground text-xs">
                Der Grund wird im Audit-Log gespeichert.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                !selectedOwnerId ||
                selectedOwnerId === contract.owner.id ||
                assignMutation.isPending
              }
            >
              {assignMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCog className="mr-2 h-4 w-4" />
              )}
              Zuweisen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
