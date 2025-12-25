# Sicherheit

Sicherheit hat bei diesem System höchste Priorität. Dieses Dokument beschreibt alle implementierten Sicherheitsmaßnahmen.

## Authentifizierung

### Keycloak Integration

- **Identity Provider**: Keycloak mit OpenID Connect
- **2FA**: TOTP für alle Benutzer erforderlich
- **Session Management**: Kurze Token-Lebensdauer (15 Min Access Token)
- **Passwort-Policy**:
  - Minimum 12 Zeichen
  - Mindestens 1 Großbuchstabe
  - Mindestens 1 Kleinbuchstabe
  - Mindestens 1 Ziffer
  - Mindestens 1 Sonderzeichen
  - Kein Benutzername im Passwort
  - Passwort-Historie (letzte 5)

### Token-Handling

```typescript
// Access Token Lebensdauer: 15 Minuten
// Refresh Token Lebensdauer: 7 Tage
// Tokens werden im Frontend im localStorage gespeichert
// Bei jedem Request wird der Token validiert
```

## Autorisierung

### Rollenbasierte Zugriffskontrolle (RBAC)

| Rolle   | Beschreibung                                        |
| ------- | --------------------------------------------------- |
| ADMIN   | Voller Zugriff auf alle Funktionen                  |
| MANAGER | Verträge erstellen, bearbeiten, genehmigen, Reports |
| USER    | Eigene Verträge erstellen und bearbeiten            |
| VIEWER  | Nur Lesezugriff                                     |

### Berechtigungen

```typescript
const PERMISSIONS = {
  ADMIN: ['*'],
  MANAGER: [
    'contracts:read',
    'contracts:write',
    'contracts:approve',
    'documents:read',
    'documents:write',
    'reports:read',
    'reports:export',
    'audit:read',
  ],
  USER: ['contracts:read', 'contracts:write', 'documents:read', 'documents:write'],
  VIEWER: ['contracts:read', 'documents:read'],
};
```

## Input-Validierung

### Backend (NestJS)

```typescript
// class-validator mit Whitelist-Modus
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Unbekannte Properties entfernen
    forbidNonWhitelisted: true, // Fehler bei unbekannten Properties
    transform: true, // Automatische Typenkonvertierung
  }),
);
```

### Frontend (Zod)

```typescript
const contractSchema = z.object({
  title: z.string().min(1).max(255),
  value: z.number().min(0).optional(),
  // ...
});
```

## API-Sicherheit

### Rate Limiting

```typescript
// 100 Requests pro Minute pro IP
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100,
    }),
  ],
})
```

### CORS

```typescript
app.enableCors({
  origin: ['https://contracts.drykorn.local'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

### Security Headers (Helmet)

```typescript
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
  }),
);
```

## Datenbank-Sicherheit

### SQL Injection Prevention

- Prisma ORM verwendet parametrisierte Queries
- Keine Raw SQL ohne Parameterisierung

### Verschlüsselung

- Verbindung über SSL/TLS
- Passwörter werden nie in der Anwendung gespeichert (Keycloak)
- Sensible Daten können mit AES-256 verschlüsselt werden

## Dokumentensicherheit

### Upload-Validierung

```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // ...
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
```

### Integrität

- SHA-256 Checksum für jedes hochgeladene Dokument
- Prüfung beim Download

### Zugriffskontrolle

- Keine direkten URLs zu Dokumenten
- Zugriff nur über API mit gültiger Authentifizierung
- Audit-Log für jeden Download

## Audit-Logging

Alle sicherheitsrelevanten Aktionen werden protokolliert:

```typescript
interface AuditLog {
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'DOWNLOAD' | 'EXPORT';
  entityType: string;
  entityId: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  oldValue?: object;
  newValue?: object;
}
```

## Netzwerk-Sicherheit (Production)

### Traefik

- Nur Ports 80 und 443 nach außen exponiert
- Automatische HTTP → HTTPS Umleitung
- TLS 1.2+ mit starken Cipher Suites
- HSTS aktiviert

### Interne Kommunikation

- Alle Services kommunizieren über internes Docker-Netzwerk
- Keine direkte Exposition der Datenbank

## Incident Response

### Logging

- Alle Fehler werden geloggt
- Access-Logs für alle Requests
- Separate Logs für Security-Events

### Überwachung

- Health-Checks für alle Services
- Alerting bei fehlgeschlagenen Login-Versuchen
- Brute-Force-Schutz in Keycloak

## Regelmäßige Maßnahmen

- [ ] Wöchentliche Überprüfung der Audit-Logs
- [ ] Monatliche Überprüfung der Benutzerberechtigungen
- [ ] Quartalsweise Sicherheits-Updates
- [ ] Jährlicher Penetrationstest
