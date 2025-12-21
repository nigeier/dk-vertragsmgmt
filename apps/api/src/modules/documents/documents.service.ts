import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { FileStorageService } from './file-storage.service';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { Document } from '@prisma/client';

// Allowed file types with their magic bytes signatures
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/tiff',
  'image/webp',
  'text/plain',
  'text/csv',
]);

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
  ) {}

  /**
   * Get all documents for a contract (excluding soft-deleted)
   */
  async findByContract(contractId: string, user: AuthenticatedUser): Promise<Document[]> {
    // Verify contract access
    await this.verifyContractAccess(contractId, user);

    return this.prisma.document.findMany({
      where: {
        contractId,
        deletedAt: null, // Exclude soft-deleted
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get document by ID (excluding soft-deleted)
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        contract: {
          select: { ownerId: true, createdById: true },
        },
      },
    });

    if (!document || document.deletedAt !== null) {
      throw new NotFoundException('Dokument nicht gefunden');
    }

    // Verify access
    await this.verifyContractAccess(document.contractId, user);

    return document;
  }

  /**
   * Download document file
   */
  async download(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ stream: Readable; document: Document }> {
    const document = await this.findOne(id, user);

    const stream = await this.fileStorage.getObject(document.storagePath);

    this.logger.log(`Dokument ${id} heruntergeladen von ${user.email}`);

    return { stream, document };
  }

  /**
   * Validate file type using magic bytes (not just MIME type from header)
   */
  private async validateFileType(buffer: Buffer, claimedMimeType: string): Promise<string> {
    // Dynamic import of file-type (ESM module)
    const fileType = await import('file-type');
    const fileTypeFromBuffer = fileType.default?.fromBuffer || fileType.fromBuffer;

    // Check file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Datei zu groß. Maximum: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Detect actual file type from magic bytes
    const detectedType = await fileTypeFromBuffer(buffer);

    // For text files (no magic bytes), trust the extension/mime if it's in allowed list
    if (!detectedType) {
      // Plain text files don't have magic bytes
      if (claimedMimeType === 'text/plain' || claimedMimeType === 'text/csv') {
        // Basic check: ensure it's actually text (no binary characters)
        const sample = buffer.slice(0, 1024).toString('utf8');
        const hasNullBytes = sample.includes('\0');
        if (hasNullBytes) {
          this.logger.warn(`File claims to be ${claimedMimeType} but contains binary data`);
          throw new BadRequestException('Dateiinhalt stimmt nicht mit dem Dateityp überein');
        }
        return claimedMimeType;
      }

      this.logger.warn(`Could not detect file type for claimed MIME: ${claimedMimeType}`);
      throw new BadRequestException('Dateityp konnte nicht erkannt werden');
    }

    const actualMimeType = detectedType.mime;

    // Check if actual type is in allowed list
    if (!ALLOWED_MIME_TYPES.has(actualMimeType)) {
      this.logger.warn(`Blocked upload: detected type ${actualMimeType} not in allowed list`);
      throw new BadRequestException(
        `Dateityp "${actualMimeType}" ist nicht erlaubt. Erlaubt sind: PDF, Word, Excel, Bilder`,
      );
    }

    // Warn if claimed type doesn't match detected type (potential spoofing attempt)
    if (claimedMimeType !== actualMimeType) {
      this.logger.warn(
        `MIME type mismatch: claimed ${claimedMimeType}, detected ${actualMimeType}`,
      );
      // Use the detected (real) type
    }

    return actualMimeType;
  }

  /**
   * Upload a document
   */
  async upload(
    file: Express.Multer.File,
    contractId: string,
    isMainDocument: boolean,
    user: AuthenticatedUser,
  ): Promise<Document> {
    // Verify contract access
    await this.verifyContractAccess(contractId, user);

    // Validate file type using magic bytes (security measure)
    const validatedMimeType = await this.validateFileType(file.buffer, file.mimetype);

    // Calculate checksum for integrity verification
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // Generate unique filename and storage path
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    const year = new Date().getFullYear();
    const storagePath = `${year}/${contractId}/${timestamp}_${randomSuffix}_${sanitizedName}`;

    // Save to local storage (using validated MIME type)
    await this.fileStorage.putObject(storagePath, file.buffer, validatedMimeType);

    // If this is the main document, unset any existing main documents
    if (isMainDocument) {
      await this.prisma.document.updateMany({
        where: { contractId, isMainDocument: true },
        data: { isMainDocument: false },
      });
    }

    // Get current version number
    const existingDocs = await this.prisma.document.count({
      where: {
        contractId,
        originalName: file.originalname,
      },
    });

    // Create document record (using validated MIME type for security)
    const document = await this.prisma.document.create({
      data: {
        filename: `${timestamp}_${randomSuffix}_${sanitizedName}`,
        originalName: file.originalname,
        mimeType: validatedMimeType,
        size: file.size,
        storagePath,
        version: existingDocs + 1,
        isMainDocument,
        checksum,
        contractId,
      },
    });

    this.logger.log(
      `Dokument ${document.id} hochgeladen zu Vertrag ${contractId} von ${user.email}`,
    );

    return document;
  }

  /**
   * Soft delete a document (file remains on disk for recovery)
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    // Verify document exists and user has access
    await this.findOne(id, user);

    // Soft delete - keep file on disk for potential recovery
    await this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
      },
    });

    this.logger.log(`Dokument ${id} soft-deleted von ${user.email}`);
  }

  /**
   * Permanently delete a document (Admin only, for cleanup)
   */
  async permanentDelete(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('Nur Administratoren können Dokumente endgültig löschen');
    }

    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Dokument nicht gefunden');
    }

    // Delete from local storage
    await this.fileStorage.removeObject(document.storagePath);

    // Delete from database
    await this.prisma.document.delete({ where: { id } });

    this.logger.log(`Dokument ${id} permanent gelöscht von ${user.email}`);
  }

  /**
   * Restore a soft-deleted document
   */
  async restore(id: string, user: AuthenticatedUser): Promise<Document> {
    if (!user.roles.includes('ADMIN') && !user.roles.includes('MANAGER')) {
      throw new ForbiddenException('Keine Berechtigung zum Wiederherstellen');
    }

    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Dokument nicht gefunden');
    }

    if (document.deletedAt === null) {
      throw new BadRequestException('Dokument ist nicht gelöscht');
    }

    const restored = await this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
      },
    });

    this.logger.log(`Dokument ${id} wiederhergestellt von ${user.email}`);

    return restored;
  }

  /**
   * Get all soft-deleted documents (Admin only, for trash view)
   */
  async findDeleted(user: AuthenticatedUser): Promise<Document[]> {
    if (!user.roles.includes('ADMIN')) {
      throw new ForbiddenException('Nur Administratoren können gelöschte Dokumente einsehen');
    }

    return this.prisma.document.findMany({
      where: {
        deletedAt: { not: null },
      },
      include: {
        contract: {
          select: { id: true, title: true, contractNumber: true },
        },
        deletedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  /**
   * Verify user has access to the contract
   */
  private async verifyContractAccess(contractId: string, user: AuthenticatedUser): Promise<void> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { ownerId: true, createdById: true },
    });

    if (!contract) {
      throw new NotFoundException('Vertrag nicht gefunden');
    }

    if (user.roles.includes('ADMIN')) {
      return;
    }

    if (contract.ownerId !== user.id && contract.createdById !== user.id) {
      throw new ForbiddenException('Zugriff verweigert');
    }
  }
}
