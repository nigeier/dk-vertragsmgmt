'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { File, Loader2, Upload, X } from 'lucide-react';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, isMainDocument: boolean) => void;
  isPending: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onUpload,
  isPending,
}: UploadDocumentDialogProps): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMainDocument, setIsMainDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = (): void => {
    if (selectedFile) {
      onUpload(selectedFile, isMainDocument);
    }
  };

  const handleClose = (isOpen: boolean): void => {
    if (!isOpen) {
      setSelectedFile(null);
      setIsMainDocument(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          <Button variant="outline" onClick={() => handleClose(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Hochladen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
