# Drykorn Vertragsmanagement

Sicherheitskritisches Vertragsmanagement-System für Drykorn. On-premise gehostet auf internem Server (kein Internetzugang erforderlich).

## Tech-Stack

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **shadcn/ui** Komponenten
- **TanStack Query** für State Management
- **React Hook Form + Zod** für Formulare

### Backend
- **NestJS**
- **TypeScript** (strict mode)
- **Prisma** ORM
- **class-validator** für Validierung
- **Swagger/OpenAPI** Dokumentation

### Infrastruktur
- **PostgreSQL 18**
- **Redis** (Sessions & Cache)
- **MinIO** (Dokumentenspeicher)
- **Keycloak** (Identity Management)
- **Docker** (nur Staging/Prod)

## Projektstruktur

```
drykorn-vertragsmanagement/
├── apps/
│   ├── web/          # Next.js Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared/       # Geteilte Types & Utils
├── infrastructure/   # Keycloak, PostgreSQL, MinIO Configs
└── docs/             # Dokumentation
```

## Lokale Entwicklung

### Voraussetzungen

1. **Node.js 20+** und **npm 10+**
2. **PostgreSQL 18** lokal installiert
3. **Redis 7** lokal installiert
4. **MinIO** lokal installiert (optional)
5. **Keycloak** lokal installiert (optional)

### Setup

```bash
# 1. Repository klonen
git clone <repository-url>
cd drykorn-vertragsmanagement

# 2. Dependencies installieren
npm install

# 3. Umgebungsvariablen konfigurieren
cp .env.example .env.local
# Anpassen der Werte in .env.local

# 4. PostgreSQL-Datenbank erstellen
psql -U postgres
CREATE DATABASE drykorn_contracts;
CREATE USER drykorn WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE drykorn_contracts TO drykorn;
\q

# 5. Prisma Migrationen ausführen
npm run db:migrate

# 6. Seed-Daten einfügen (optional)
npm run db:seed

# 7. Entwicklungsserver starten
npm run dev:all
```

### Einzelne Services starten

```bash
npm run dev:web   # Nur Frontend (Port 3000)
npm run dev:api   # Nur Backend (Port 3001)
```

## Server-Deployment (Staging/Production)

Docker Compose mit Profiles für Staging und Production auf demselben Server:

```bash
# .env auf Server erstellen und konfigurieren
cp .env.example .env
# SERVER_IP und Passwörter setzen!

# Staging starten (Ports 3000, 3001)
docker compose --profile staging up -d --build

# Production starten (Ports 4000, 4001)
docker compose --profile prod up -d --build

# Status prüfen
docker compose --profile staging ps
docker compose --profile prod ps
```

### Port-Übersicht

| Service | Staging | Production |
|---------|---------|------------|
| Frontend | :3000 | :4000 |
| API | :3001 | :4001 |
| Keycloak | :8080 | :8080 |
| MinIO Console | :9001 | :9001 |

## Verfügbare Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Startet Frontend |
| `npm run dev:all` | Startet Frontend und Backend parallel |
| `npm run build` | Baut alle Anwendungen |
| `npm run lint` | Führt ESLint aus |
| `npm run test` | Führt Tests aus |
| `npm run db:migrate` | Führt Prisma-Migrationen aus |
| `npm run db:seed` | Fügt Seed-Daten ein |
| `npm run db:studio` | Öffnet Prisma Studio |

## Sicherheit

- Alle Inputs werden validiert (class-validator, Zod)
- Rate Limiting aktiviert
- Helmet für Security Headers
- CORS strikt konfiguriert
- Audit-Logging für alle CRUD-Operationen
- 2FA über Keycloak (TOTP)
- Passwort-Policy: min. 12 Zeichen, Komplexität erforderlich

## API-Dokumentation

Im Entwicklungsmodus ist Swagger verfügbar unter:
- Lokal: `http://localhost:3001/api/docs`
- Staging: `http://<SERVER_IP>:3001/api/docs`
- Prod: `http://<SERVER_IP>:4001/api/docs`

## Dokumentation

- [Architektur](./docs/architecture.md)
- [Sicherheit](./docs/security.md)
- [API](./docs/api.md)
- [Deployment](./docs/deployment.md)

## Lizenz

Proprietär - Nur für internen Gebrauch bei Drykorn.
