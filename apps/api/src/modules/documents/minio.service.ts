import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'drykorn-contracts');

    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.configService.get<number>('MINIO_PORT', 9000),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', ''),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
      this.logger.log(`MinIO bucket '${this.bucketName}' is ready`);
    } catch (error) {
      this.logger.error('Failed to initialize MinIO', error);
      // Don't throw - allow app to start without MinIO in development
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        throw error;
      }
    }
  }

  /**
   * Ensure the bucket exists
   */
  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucketName);
    if (!exists) {
      await this.client.makeBucket(this.bucketName, 'eu-central-1');
      this.logger.log(`Created bucket: ${this.bucketName}`);

      // Set bucket policy for private access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Deny',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${this.bucketName}/*`,
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
          },
        ],
      };

      await this.client.setBucketPolicy(this.bucketName, JSON.stringify(policy));
    }
  }

  /**
   * Upload an object to MinIO
   */
  async putObject(
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  /**
   * Get an object from MinIO
   */
  async getObject(objectName: string): Promise<Readable> {
    return this.client.getObject(this.bucketName, objectName);
  }

  /**
   * Remove an object from MinIO
   */
  async removeObject(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucketName, objectName);
  }

  /**
   * Check if an object exists
   */
  async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get object metadata
   */
  async getObjectStat(objectName: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucketName, objectName);
  }

  /**
   * Generate a presigned URL for download
   */
  async getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
  }
}
