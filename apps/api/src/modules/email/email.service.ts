import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface ContractExpirationEmail {
  to: string;
  userName: string;
  contractTitle: string;
  contractNumber: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  contractUrl: string;
}

export interface PasswordResetEmail {
  to: string;
  userName: string;
  resetToken: string;
  resetUrl: string;
}

export interface AccountLockedEmail {
  to: string;
  userName: string;
  lockDurationMinutes: number;
  ipAddress: string;
}

export interface TwoFactorEnabledEmail {
  to: string;
  userName: string;
}

export interface ContractAssignedEmail {
  to: string;
  userName: string;
  contractTitle: string;
  contractNumber: string;
  assignedBy: string;
  contractUrl: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isEnabled: boolean;
  private readonly frontendUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    // E-Mail nur senden wenn SMTP konfiguriert ist
    this.isEnabled = !!this.configService.get<string>('SMTP_HOST');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    if (!this.isEnabled) {
      this.logger.warn('SMTP nicht konfiguriert - E-Mails werden nur geloggt');
    }
  }

  /**
   * Sendet E-Mail bei auslaufendem Vertrag
   */
  async sendContractExpirationReminder(data: ContractExpirationEmail): Promise<void> {
    const subject = `Vertrag läuft aus: ${data.contractTitle} (${data.contractNumber})`;

    if (!this.isEnabled) {
      this.logger.log(`[E-Mail simuliert] An: ${data.to}, Betreff: ${subject}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject,
        template: 'contract-expiration',
        context: {
          userName: data.userName,
          contractTitle: data.contractTitle,
          contractNumber: data.contractNumber,
          expirationDate: this.formatDate(data.expirationDate),
          daysUntilExpiration: data.daysUntilExpiration,
          contractUrl: data.contractUrl,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Vertragsablauf-Erinnerung gesendet an ${data.to}`);
    } catch (error) {
      this.logger.error(`Fehler beim Senden der Vertragsablauf-Erinnerung an ${data.to}`, error);
      throw error;
    }
  }

  /**
   * Sendet E-Mail bei gesperrtem Account
   */
  async sendAccountLockedEmail(data: AccountLockedEmail): Promise<void> {
    const subject = 'Ihr Konto wurde vorübergehend gesperrt';

    if (!this.isEnabled) {
      this.logger.log(`[E-Mail simuliert] An: ${data.to}, Betreff: ${subject}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject,
        template: 'account-locked',
        context: {
          userName: data.userName,
          lockDurationMinutes: data.lockDurationMinutes,
          ipAddress: data.ipAddress,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Account-Sperrung-E-Mail gesendet an ${data.to}`);
    } catch (error) {
      this.logger.error(`Fehler beim Senden der Account-Sperrung-E-Mail an ${data.to}`, error);
      throw error;
    }
  }

  /**
   * Sendet E-Mail bei 2FA Aktivierung
   */
  async sendTwoFactorEnabledEmail(data: TwoFactorEnabledEmail): Promise<void> {
    const subject = 'Zwei-Faktor-Authentifizierung aktiviert';

    if (!this.isEnabled) {
      this.logger.log(`[E-Mail simuliert] An: ${data.to}, Betreff: ${subject}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject,
        template: '2fa-enabled',
        context: {
          userName: data.userName,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`2FA-Aktivierung-E-Mail gesendet an ${data.to}`);
    } catch (error) {
      this.logger.error(`Fehler beim Senden der 2FA-Aktivierung-E-Mail an ${data.to}`, error);
      throw error;
    }
  }

  /**
   * Sendet E-Mail bei Vertragszuweisung
   */
  async sendContractAssignedEmail(data: ContractAssignedEmail): Promise<void> {
    const subject = `Neuer Vertrag zugewiesen: ${data.contractTitle}`;

    if (!this.isEnabled) {
      this.logger.log(`[E-Mail simuliert] An: ${data.to}, Betreff: ${subject}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: data.to,
        subject,
        template: 'contract-assigned',
        context: {
          userName: data.userName,
          contractTitle: data.contractTitle,
          contractNumber: data.contractNumber,
          assignedBy: data.assignedBy,
          contractUrl: data.contractUrl,
          frontendUrl: this.frontendUrl,
        },
      });

      this.logger.log(`Vertragszuweisungs-E-Mail gesendet an ${data.to}`);
    } catch (error) {
      this.logger.error(`Fehler beim Senden der Vertragszuweisungs-E-Mail an ${data.to}`, error);
      throw error;
    }
  }

  /**
   * Sendet generische E-Mail
   */
  async sendGenericEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log(`[E-Mail simuliert] An: ${to}, Betreff: ${subject}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        html,
      });

      this.logger.log(`E-Mail gesendet an ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Fehler beim Senden der E-Mail an ${to}`, error);
      throw error;
    }
  }

  /**
   * Testet die SMTP-Verbindung
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // Sende Test-E-Mail an den konfigurierten Admin
      const adminEmail = this.configService.get<string>('SMTP_TEST_EMAIL');
      if (adminEmail) {
        await this.mailerService.sendMail({
          to: adminEmail,
          subject: 'SMTP Test - Drykorn Vertragsmanagement',
          text: 'Dies ist eine Test-E-Mail zur Überprüfung der SMTP-Konfiguration.',
        });
        this.logger.log('SMTP Test erfolgreich');
      }
      return true;
    } catch (error) {
      this.logger.error('SMTP Test fehlgeschlagen', error);
      return false;
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
}
