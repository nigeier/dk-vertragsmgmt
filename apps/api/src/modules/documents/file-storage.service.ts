import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, unlink, stat, access } from 'fs/promises';
import { Readable } from 'stream';
import { join, dirname, resolve, normalize } from 'path';
import { pipeline } from 'stream/promises';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private storagePath: string;

  constructor(private readonly configService: ConfigService) {
    // Default storage path: ./data/documents
    this.storagePath = this.configService.get<string>(
      'STORAGE_PATH',
      join(process.cwd(), 'data', 'documents'),
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      this.logger.log(`Dateispeicher bereit: ${this.storagePath}`);
    } catch (error) {
      this.logger.error('Fehler beim Initialisieren des Dateispeichers', error);
      throw error;
    }
  }

  /**
   * Sicherstellen dass das Speicherverzeichnis existiert
   */
  private async ensureStorageDirectory(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
  }

  /**
   * Validiert und gibt den sicheren absoluten Pfad zurück
   * Verhindert Path Traversal Angriffe (z.B. ../../etc/passwd)
   */
  private getSecurePath(relativePath: string): string {
    // Normalisiere und resolve den Pfad
    const normalizedRelative = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = resolve(this.storagePath, normalizedRelative);

    // Prüfe ob der aufgelöste Pfad innerhalb des Speicherverzeichnisses liegt
    const resolvedStoragePath = resolve(this.storagePath);
    if (!fullPath.startsWith(resolvedStoragePath)) {
      this.logger.warn(`Path Traversal Versuch blockiert: ${relativePath}`);
      throw new BadRequestException('Ungültiger Dateipfad');
    }

    return fullPath;
  }

  /**
   * Datei speichern
   */
  async putObject(relativePath: string, buffer: Buffer, _contentType: string): Promise<void> {
    const fullPath = this.getSecurePath(relativePath);
    const directory = dirname(fullPath);

    // Verzeichnis erstellen falls nicht vorhanden
    await mkdir(directory, { recursive: true });

    // Buffer als Stream schreiben
    const readable = Readable.from(buffer);
    const writable = createWriteStream(fullPath);

    await pipeline(readable, writable);

    this.logger.debug(`Datei gespeichert: ${relativePath}`);
  }

  /**
   * Datei abrufen
   */
  async getObject(relativePath: string): Promise<Readable> {
    const fullPath = this.getSecurePath(relativePath);

    // Prüfen ob Datei existiert
    try {
      await access(fullPath);
    } catch {
      throw new NotFoundException(`Datei nicht gefunden: ${relativePath}`);
    }

    return createReadStream(fullPath);
  }

  /**
   * Datei löschen
   */
  async removeObject(relativePath: string): Promise<void> {
    const fullPath = this.getSecurePath(relativePath);

    try {
      await unlink(fullPath);
      this.logger.debug(`Datei gelöscht: ${relativePath}`);
    } catch (error: unknown) {
      // Ignoriere Fehler wenn Datei nicht existiert
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Prüfen ob Datei existiert
   */
  async objectExists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.getSecurePath(relativePath);
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Datei-Metadaten abrufen
   */
  async getObjectStat(relativePath: string): Promise<{ size: number; mtime: Date }> {
    const fullPath = this.getSecurePath(relativePath);

    const stats = await stat(fullPath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  /**
   * Absoluten Pfad zur Datei zurückgeben (für direkte Downloads)
   */
  getFullPath(relativePath: string): string {
    return this.getSecurePath(relativePath);
  }
}
