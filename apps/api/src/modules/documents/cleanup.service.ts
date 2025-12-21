import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { FileStorageService } from './file-storage.service';

@Injectable()
export class DocumentCleanupService {
  private readonly logger = new Logger(DocumentCleanupService.name);

  // Retention period in days before permanent deletion
  private readonly RETENTION_DAYS = 90;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
  ) {}

  /**
   * Runs daily at 2:00 AM to clean up old soft-deleted documents
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupDeletedDocuments(): Promise<void> {
    this.logger.log('Starting scheduled document cleanup...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    try {
      // Find all documents deleted before the cutoff date
      const documentsToDelete = await this.prisma.document.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: cutoffDate,
          },
        },
        select: {
          id: true,
          originalName: true,
          storagePath: true,
          deletedAt: true,
        },
      });

      if (documentsToDelete.length === 0) {
        this.logger.log('No documents to clean up');
        return;
      }

      this.logger.log(`Found ${documentsToDelete.length} documents to permanently delete`);

      let successCount = 0;
      let errorCount = 0;

      for (const doc of documentsToDelete) {
        try {
          // Delete file from storage
          await this.fileStorage.removeObject(doc.storagePath);

          // Delete from database
          await this.prisma.document.delete({
            where: { id: doc.id },
          });

          successCount++;
          this.logger.log(`Permanently deleted: ${doc.originalName} (ID: ${doc.id})`);
        } catch (error) {
          errorCount++;
          this.logger.error(`Failed to delete document ${doc.id}: ${String(error)}`);
        }
      }

      // Create audit log entry for the cleanup
      await this.prisma.auditLog.create({
        data: {
          action: 'DELETE',
          entityType: 'SystemCleanup',
          entityId: 'scheduled-cleanup',
          newValue: {
            documentsDeleted: successCount,
            documentsFailed: errorCount,
            retentionDays: this.RETENTION_DAYS,
            executedAt: new Date().toISOString(),
          },
          userId: await this.getSystemUserId(),
        },
      });

      this.logger.log(`Document cleanup completed: ${successCount} deleted, ${errorCount} failed`);
    } catch (error) {
      this.logger.error('Document cleanup failed:', error);
    }
  }

  /**
   * Get or create a system user for automated tasks
   */
  private async getSystemUserId(): Promise<string> {
    const systemUser = await this.prisma.user.findFirst({
      where: { email: 'system@drykorn.internal' },
    });

    if (systemUser) {
      return systemUser.id;
    }

    // Create system user if not exists
    const newSystemUser = await this.prisma.user.create({
      data: {
        email: 'system@drykorn.internal',
        passwordHash: '', // No password - can't login
        firstName: 'System',
        lastName: 'Automatisierung',
        role: 'ADMIN',
        isActive: false, // Deactivated - can't login
        department: 'IT-System',
      },
    });

    return newSystemUser.id;
  }

  /**
   * Manual cleanup trigger (for admin use)
   */
  async manualCleanup(): Promise<{ deleted: number; failed: number }> {
    this.logger.log('Manual cleanup triggered');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const documentsToDelete = await this.prisma.document.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });

    let deleted = 0;
    let failed = 0;

    for (const doc of documentsToDelete) {
      try {
        await this.fileStorage.removeObject(doc.storagePath);
        await this.prisma.document.delete({ where: { id: doc.id } });
        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    pendingCleanup: number;
    nextCleanupDate: Date;
    retentionDays: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const pendingCleanup = await this.prisma.document.count({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
    });

    // Next cleanup at 2:00 AM
    const now = new Date();
    const nextCleanup = new Date(now);
    nextCleanup.setHours(2, 0, 0, 0);
    if (nextCleanup <= now) {
      nextCleanup.setDate(nextCleanup.getDate() + 1);
    }

    return {
      pendingCleanup,
      nextCleanupDate: nextCleanup,
      retentionDays: this.RETENTION_DAYS,
    };
  }
}
