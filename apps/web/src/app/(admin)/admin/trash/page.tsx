'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
  Trash2,
  RotateCcw,
  File,
  AlertTriangle,
  Clock,
  Loader2,
  FileText,
  Image,
  FileSpreadsheet,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DeletedDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  deletedAt: string;
  contract: {
    id: string;
    title: string;
    contractNumber: string;
  };
  deletedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function TrashPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [documentToRestore, setDocumentToRestore] = useState<DeletedDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DeletedDocument | null>(null);

  const { data: documents, isLoading } = useQuery<DeletedDocument[]>({
    queryKey: ['deleted-documents'],
    queryFn: async () => {
      const response = await api.get<DeletedDocument[]>('/documents/admin/deleted');
      return response.data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-documents'] });
      toast({
        title: 'Dokument wiederhergestellt',
        description: 'Das Dokument wurde erfolgreich wiederhergestellt.',
      });
      setDocumentToRestore(null);
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Dokument konnte nicht wiederhergestellt werden',
        variant: 'destructive',
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-documents'] });
      toast({
        title: 'Dokument endgültig gelöscht',
        description: 'Das Dokument wurde unwiderruflich gelöscht.',
      });
      setDocumentToDelete(null);
    },
    onError: () => {
      toast({
        title: 'Fehler',
        description: 'Dokument konnte nicht gelöscht werden',
        variant: 'destructive',
      });
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): React.ReactNode => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-purple-600" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-600" />;
    }
    return <File className="h-4 w-4 text-blue-600" />;
  };

  const getDaysUntilPermanentDeletion = (deletedAt: string): number => {
    const deletedDate = new Date(deletedAt);
    const permanentDeleteDate = new Date(deletedDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (permanentDeleteDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.max(0, daysRemaining);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Papierkorb</h1>
        <p className="text-muted-foreground">
          Gelöschte Dokumente werden nach 90 Tagen automatisch endgültig entfernt
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Gelöschte Dokumente
              </CardTitle>
              <CardDescription>{documents?.length || 0} Dokumente im Papierkorb</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dokument</TableHead>
                  <TableHead>Vertrag</TableHead>
                  <TableHead>Gelöscht von</TableHead>
                  <TableHead>Gelöscht am</TableHead>
                  <TableHead>Verbleibend</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const daysRemaining = getDaysUntilPermanentDeletion(doc.deletedAt);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.mimeType)}
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatFileSize(doc.size)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.contract.title}</p>
                          <p className="text-muted-foreground font-mono text-xs">
                            {doc.contract.contractNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {doc.deletedBy.firstName} {doc.deletedBy.lastName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{formatDateTime(doc.deletedAt)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            daysRemaining <= 7
                              ? 'destructive'
                              : daysRemaining <= 30
                                ? 'outline'
                                : 'secondary'
                          }
                          className="flex w-fit items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {daysRemaining} Tage
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentToRestore(doc)}
                          >
                            <RotateCcw className="mr-1 h-4 w-4" />
                            Wiederherstellen
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDocumentToDelete(doc)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Endgültig löschen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
              <Trash2 className="mb-4 h-12 w-12" />
              <h3 className="text-lg font-medium">Papierkorb ist leer</h3>
              <p className="mt-1">Es befinden sich keine gelöschten Dokumente im Papierkorb.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-800">Hinweis zur automatischen Bereinigung</h4>
              <p className="mt-1 text-sm text-amber-700">
                Dokumente im Papierkorb werden nach 90 Tagen automatisch und unwiderruflich
                gelöscht. Stellen Sie wichtige Dokumente rechtzeitig wieder her.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <AlertDialog open={!!documentToRestore} onOpenChange={() => setDocumentToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument wiederherstellen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie das Dokument &quot;{documentToRestore?.originalName}&quot;
              wiederherstellen? Es wird wieder dem Vertrag &quot;{documentToRestore?.contract.title}
              &quot; zugeordnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToRestore && restoreMutation.mutate(documentToRestore.id)}
            >
              {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wiederherstellen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Endgültig löschen
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-destructive font-semibold">
                Diese Aktion kann nicht rückgängig gemacht werden!
              </span>
              <br />
              <br />
              Das Dokument &quot;{documentToDelete?.originalName}&quot; wird unwiderruflich von
              Server und Datenbank entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                documentToDelete && permanentDeleteMutation.mutate(documentToDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {permanentDeleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
