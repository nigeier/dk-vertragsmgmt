/**
 * Document-related types shared between frontend and backend
 */

export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  minioKey: string;
  version: number;
  isMainDocument: boolean;
  checksum: string;
  contractId: string;
  createdAt: Date;
}

export interface DocumentListItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  version: number;
  isMainDocument: boolean;
  createdAt: Date;
}

export interface DocumentUploadRequest {
  contractId: string;
  isMainDocument?: boolean;
}

export interface DocumentUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  version: number;
}

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/tiff',
] as const;

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.tiff',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const MIME_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF-Dokument',
  'application/msword': 'Word-Dokument (alt)',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word-Dokument',
  'application/vnd.ms-excel': 'Excel-Tabelle (alt)',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel-Tabelle',
  'image/png': 'PNG-Bild',
  'image/jpeg': 'JPEG-Bild',
  'image/tiff': 'TIFF-Bild',
};
