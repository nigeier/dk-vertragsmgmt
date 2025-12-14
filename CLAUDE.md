# CLAUDE.md - Drykorn Vertragsmanagement

> Sicherheitskritisches Vertragsmanagement-System für Drykorn. On-premise, nur internes Netzwerk.

## Kritische Regeln

### IMMER tun
- Alle Inputs validieren (Backend: class-validator, Frontend: Zod)
- Audit-Logging bei allen Datenänderungen
- TypeScript strict mode verwenden
- Prisma für Datenbankoperationen (nie raw SQL ohne Parametrisierung)
- Fehler mit deutschen Meldungen für den Benutzer
- Neue API-Endpunkte in Swagger dokumentieren

### NIEMALS tun
- Secrets/Passwörter in Code committen
- `any` Type verwenden (wenn unvermeidbar: `unknown` mit Type Guard)
- Raw SQL Queries ohne Parametrisierung
- Sensible Daten im localStorage speichern (nur httpOnly Cookies)
- CORS für alle Origins öffnen
- Sicherheits-Guards oder Rate Limiting umgehen
- Docker für lokale Entwicklung verwenden (nur Staging/Prod)

## Architektur (vereinfacht)

```
                    ┌─────────────────────────────────┐
                    │     Interner Server             │
                    │   (z.B. 192.168.1.100)          │
                    └─────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   ┌─────────┐               ┌─────────┐               ┌─────────┐
   │   Web   │               │   API   │               │Keycloak │
   │ :3000/  │               │ :3001/  │               │  :8080  │
   │ :4000   │               │ :4001   │               │         │
   └─────────┘               └─────────┘               └─────────┘
        │                           │
        │                    ┌──────┴──────┐
        │                    │             │
        │              ┌─────────┐   ┌─────────┐   ┌─────────┐
        │              │Postgres │   │  Redis  │   │  MinIO  │
        │              │ (intern)│   │ (intern)│   │  :9001  │
        │              └─────────┘   └─────────┘   └─────────┘
        │
        └──────────────► API Calls (HTTP/JSON)
```

**Kein Traefik, kein Reverse Proxy** - Direkter Zugriff über Ports.

## Projektstruktur

```
drykorn-vertragsmanagement/
├── apps/
│   ├── web/                    # Next.js 14+ Frontend
│   │   └── src/
│   │       ├── app/            # App Router Pages
│   │       │   ├── (auth)/     # Öffentlich: Login
│   │       │   └── (dashboard)/# Geschützt: Dashboard, Verträge
│   │       ├── components/     # React-Komponenten
│   │       │   └── ui/         # shadcn/ui Basis
│   │       ├── hooks/          # Custom Hooks
│   │       └── lib/            # Utils, API-Client
│   │
│   └── api/                    # NestJS Backend
│       └── src/
│           ├── common/         # Guards, Interceptors
│           ├── modules/        # Feature-Module
│           │   ├── auth/       # Keycloak-Integration
│           │   ├── contracts/  # Vertragsverwaltung
│           │   ├── documents/  # Dokumente (MinIO)
│           │   └── audit-log/  # Audit-Trail
│           └── prisma/         # Prisma Service
│
├── packages/shared/            # Geteilte Types, Constants
├── infrastructure/             # Keycloak, PostgreSQL, MinIO
└── docs/                       # Dokumentation
```

## Befehle

```bash
# Entwicklung (lokal, OHNE Docker)
npm run dev:all          # Frontend + Backend parallel
npm run dev:web          # Nur Frontend (localhost:3000)
npm run dev:api          # Nur Backend (localhost:3001)

# Datenbank
npm run db:migrate       # Prisma Migrationen
npm run db:generate      # Prisma Client generieren
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Testdaten

# Qualität
npm run lint             # ESLint
npm run test             # Jest Tests
npm run format           # Prettier
npm run build            # Production Build
```

## Deployment (Docker)

```bash
# Staging (Ports 3000, 3001)
docker compose --profile staging up -d --build

# Production (Ports 4000, 4001)
docker compose --profile prod up -d --build

# Beide stoppen
docker compose --profile staging --profile prod down

# Logs
docker compose --profile prod logs -f api-prod
```

### Port-Übersicht

| Service | Development | Staging | Production |
|---------|-------------|---------|------------|
| Frontend | localhost:3000 | :3000 | :4000 |
| API | localhost:3001 | :3001 | :4001 |
| Keycloak | localhost:8080 | :8080 | :8080 |
| MinIO Console | localhost:9001 | :9001 | :9001 |

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind |
| State | TanStack Query |
| Forms | React Hook Form + Zod |
| Backend | NestJS |
| ORM | Prisma |
| Validation | class-validator |
| Auth | Keycloak (OIDC) |
| DB | PostgreSQL 18 |
| Storage | MinIO (S3) |
| Cache | Redis |

## Code-Patterns

### Backend: Controller mit Guards

```typescript
@Controller('api/v1/contracts')
@UseGuards(KeycloakAuthGuard)
@ApiTags('Contracts')
export class ContractsController {
  @Get()
  @Roles('ADMIN', 'MANAGER', 'USER')
  findAll() {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateContractDto) {}
}
```

### Backend: DTO mit Validierung

```typescript
export class CreateContractDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Titel ist erforderlich' })
  @MaxLength(255)
  title: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  value?: number;
}
```

### Frontend: API-Hook

```typescript
export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: () => apiClient.get('/contracts').then(res => res.data),
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post('/contracts', data),
    onSuccess: () => queryClient.invalidateQueries(['contracts']),
  });
}
```

### Frontend: Formular mit Zod

```typescript
const schema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  value: z.number().min(0).optional(),
});

const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

## Datenbank

### Haupt-Entitäten
- **User** - Benutzer (sync mit Keycloak)
- **Partner** - Vertragspartner
- **Contract** - Verträge
- **Document** - Dokumente (Files in MinIO)
- **AuditLog** - Audit-Trail

### Schema ändern
```bash
# 1. apps/api/prisma/schema.prisma bearbeiten
# 2. Migration erstellen
npm run db:migrate
```

## API-Endpunkte

Base URL: `http://localhost:3001/api/v1`

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | /auth/login | Login |
| GET | /contracts | Liste |
| POST | /contracts | Erstellen |
| GET | /contracts/:id | Details |
| PATCH | /contracts/:id | Bearbeiten |
| DELETE | /contracts/:id | Löschen |
| POST | /documents/upload | Upload |
| GET | /documents/:id/download | Download |

Swagger UI: `http://localhost:3001/api/docs`

## Rollen & Berechtigungen

| Rolle | Verträge | Dokumente | Reports | Admin |
|-------|----------|-----------|---------|-------|
| ADMIN | Alles | Alles | Alles | Ja |
| MANAGER | CRUD + Genehmigen | CRUD | Alle | Nein |
| USER | Eigene | Eigene | Eigene | Nein |
| VIEWER | Lesen | Lesen | Nein | Nein |

## Sicherheit

### Request-Pipeline
```
Request → Rate Limiter → Auth Guard → Role Guard → Validation → Controller
```

### Audit-Logging
Automatisch via `AuditLogInterceptor`:
- Wer (userId, IP)
- Was (Action, Entity)
- Wann (Timestamp)
- Änderungen (oldValue, newValue)

## Umgebungsvariablen

Wichtigste Variablen in `.env` / `.env.local`:

```bash
# Server (nur Docker)
SERVER_IP=192.168.1.100

# Datenbank
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Auth
KEYCLOAK_URL=http://localhost:8080
JWT_SECRET=<min 32 Zeichen>

# Storage
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
```

## Häufige Aufgaben

### Neuen API-Endpunkt
1. DTO in `modules/[modul]/dto/`
2. Service-Methode
3. Controller-Route mit Swagger-Dekoratoren
4. Test schreiben

### Neue Frontend-Seite
1. Route in `app/(dashboard)/[route]/page.tsx`
2. Komponente in `components/`
3. Hook in `hooks/`

### Datenbankschema ändern
1. `prisma/schema.prisma` bearbeiten
2. `npm run db:migrate`
3. Types werden automatisch aktualisiert

## Ressourcen

- [Architektur](./docs/architecture.md)
- [Sicherheit](./docs/security.md)
- [API](./docs/api.md)
- [Deployment](./docs/deployment.md)
