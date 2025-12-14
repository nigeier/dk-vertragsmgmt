import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from './minio.service';
import { AuthenticatedUser } from '../../common/guards/keycloak-auth.guard';
import { Document } from '@prisma/client';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * Get all documents for a contract
   */
  async findByContract(contractId: string, user: AuthenticatedUser): Promise<Document[]> {
    // Verify contract access
    await this.verifyContractAccess(contractId, user);

    return this.prisma.document.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get document by ID
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

    if (!document) {
      throw new NotFoundException('Document not found');
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

    const stream = await this.minioService.getObject(document.minioKey);

    this.logger.log(`Document ${id} downloaded by ${user.email}`);

    return { stream, document };
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

    // Calculate checksum for integrity verification
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const minioKey = `contracts/${contractId}/${timestamp}_${randomSuffix}_${sanitizedName}`;

    // Upload to MinIO
    await this.minioService.putObject(minioKey, file.buffer, file.mimetype);

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

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        filename: `${timestamp}_${randomSuffix}_${sanitizedName}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        minioKey,
        version: existingDocs + 1,
        isMainDocument,
        checksum,
        contractId,
      },
    });

    this.logger.log(`Document ${document.id} uploaded to contract ${contractId} by ${user.email}`);

    return document;
  }

  /**
   * Delete a document
   */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const document = await this.findOne(id, user);

    // Delete from MinIO
    await this.minioService.removeObject(document.minioKey);

    // Delete from database
    await this.prisma.document.delete({ where: { id } });

    this.logger.log(`Document ${id} deleted by ${user.email}`);
  }

  /**
   * Verify user has access to the contract
   */
  private async verifyContractAccess(
    contractId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { ownerId: true, createdById: true },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (user.roles.includes('ADMIN')) {
      return;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { keycloakId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    if (contract.ownerId !== dbUser.id && contract.createdById !== dbUser.id) {
      throw new ForbiddenException('Access denied');
    }
  }
}
