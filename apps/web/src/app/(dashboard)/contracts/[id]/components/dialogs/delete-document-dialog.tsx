'use client';

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
import { Loader2 } from 'lucide-react';

interface DeleteDocumentDialogProps {
  documentId: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (documentId: string) => void;
  isPending: boolean;
}

export function DeleteDocumentDialog({
  documentId,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteDocumentDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={!!documentId} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dokument löschen</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie dieses Dokument wirklich löschen? Diese Aktion kann nicht rückgängig gemacht
            werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => documentId && onConfirm(documentId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
