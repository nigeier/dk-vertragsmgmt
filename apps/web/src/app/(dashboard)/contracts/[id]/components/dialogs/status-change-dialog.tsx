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
import { ContractStatus, CONTRACT_STATUS_LABELS } from '@drykorn/shared';

interface StatusChangeDialogProps {
  status: ContractStatus | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (status: ContractStatus) => void;
  isPending: boolean;
}

export function StatusChangeDialog({
  status,
  onOpenChange,
  onConfirm,
  isPending,
}: StatusChangeDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={!!status} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Status ändern</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie den Status auf &quot;{status && CONTRACT_STATUS_LABELS[status]}&quot;
            ändern?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={() => status && onConfirm(status)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bestätigen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
