'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserCog } from 'lucide-react';
import type { ActiveUser } from '../../types';

interface AssignContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: ActiveUser[];
  currentOwnerId: string;
  onAssign: (ownerId: string, reason?: string) => void;
  isPending: boolean;
}

export function AssignContractDialog({
  open,
  onOpenChange,
  users,
  currentOwnerId,
  onAssign,
  isPending,
}: AssignContractDialogProps): React.JSX.Element {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(currentOwnerId);
  const [assignReason, setAssignReason] = useState('');

  const handleClose = (isOpen: boolean): void => {
    if (!isOpen) {
      setSelectedOwnerId('');
      setAssignReason('');
    }
    onOpenChange(isOpen);
  };

  const handleAssign = (): void => {
    if (selectedOwnerId) {
      onAssign(selectedOwnerId, assignReason || undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
                {users.map((user) => (
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
          <Button variant="outline" onClick={() => handleClose(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedOwnerId || selectedOwnerId === currentOwnerId || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserCog className="mr-2 h-4 w-4" />
            )}
            Zuweisen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
