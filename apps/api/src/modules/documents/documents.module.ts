import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MinioService } from './minio.service';
import { AuthModule } from '../auth/auth.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    AuthModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        storage: memoryStorage(),
        limits: {
          fileSize: 50 * 1024 * 1024, // 50 MB
        },
        fileFilter: (
          _req: Express.Request,
          file: Express.Multer.File,
          callback: (error: Error | null, acceptFile: boolean) => void,
        ) => {
          const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/png',
            'image/jpeg',
            'image/tiff',
          ];
          if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error('Invalid file type'), false);
          }
        },
      }),
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, MinioService],
  exports: [DocumentsService, MinioService],
})
export class DocumentsModule {}
