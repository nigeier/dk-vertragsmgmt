import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const MIN_JWT_SECRET_LENGTH = 32;

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('AuthModule');
        const secret = configService.get<string>('JWT_SECRET');

        // Sicherheits-Validierung: JWT_SECRET muss mindestens 32 Zeichen lang sein
        if (!secret) {
          throw new Error('JWT_SECRET ist nicht konfiguriert');
        }
        if (secret.length < MIN_JWT_SECRET_LENGTH) {
          throw new Error(
            `JWT_SECRET muss mindestens ${MIN_JWT_SECRET_LENGTH} Zeichen lang sein (aktuell: ${secret.length})`,
          );
        }

        logger.log('JWT Konfiguration validiert');

        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRATION', '15m'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
