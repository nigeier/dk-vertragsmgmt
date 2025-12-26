import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Production: nur error, warn, log - Development: alle Level
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevels: ('error' | 'warn' | 'log' | 'debug' | 'verbose')[] = isProduction
    ? ['error', 'warn', 'log']
    : ['error', 'warn', 'log', 'debug', 'verbose'];

  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });

  const configService = app.get(ConfigService);

  // Request Body Size Limits (Security: prevent large payload attacks)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ limit: '1mb', extended: true }));

  // Cookie Parser für httpOnly Cookie Auth
  app.use(cookieParser());

  // Security: Helmet for HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS Configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  // Global Validation Pipe with security settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // Swagger Documentation (disable in production if needed)
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Drykorn Vertragsmanagement API')
      .setDescription('API für das Drykorn Vertragsmanagement-System')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .addTag('auth', 'Authentifizierung')
      .addTag('contracts', 'Vertragsverwaltung')
      .addTag('documents', 'Dokumentenverwaltung')
      .addTag('partners', 'Partnerverwaltung')
      .addTag('users', 'Benutzerverwaltung')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get<number>('API_PORT', 3001);
  const host = configService.get<string>('API_HOST', '0.0.0.0');

  await app.listen(port, host);

  console.log(`
  ================================================
  🚀 Drykorn Vertragsmanagement API
  ================================================
  Environment: ${configService.get('NODE_ENV', 'development')}
  Server:      http://${host}:${port}
  API Docs:    http://${host}:${port}/api/docs
  ================================================
  `);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
