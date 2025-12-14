# Architektur

## Überblick

Das Drykorn Vertragsmanagement-System ist als Monorepo mit separaten Frontend- und Backend-Anwendungen aufgebaut. Das System läuft **ausschließlich im internen Netzwerk** - kein Internetzugang erforderlich.

## System-Architektur

```
                    ┌─────────────────────────────────┐
                    │     Interner Server             │
                    │   (z.B. 192.168.1.100)          │
                    └─────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   Next.js     │           │    NestJS     │           │   Keycloak    │
│   Frontend    │           │    Backend    │           │    (Auth)     │
│  :3000/:4000  │           │  :3001/:4001  │           │    :8080      │
└───────┬───────┘           └───────┬───────┘           └───────────────┘
        │                           │
        │                           ▼
        │                   ┌───────────────┐
        │                   │   Prisma ORM  │
        │                   └───────┬───────┘
        │                           │
        │           ┌───────────────┼───────────────┐
        │           ▼               ▼               ▼
        │     ┌─────────┐     ┌─────────┐     ┌─────────┐
        │     │Postgres │     │  Redis  │     │  MinIO  │
        │     │   18    │     │ (Cache) │     │(Storage)│
        │     │ (intern)│     │ (intern)│     │  :9001  │
        │     └─────────┘     └─────────┘     └─────────┘
        │
        └──────────────────► API Calls (HTTP/JSON)
```

### Vereinfachte Architektur

- **Kein Reverse Proxy (Traefik)** - Direkter Zugriff über Ports
- **Kein SSL/TLS** - Internes Netzwerk, vertrauenswürdig
- **Keine Subdomains** - Nur IP + Port
- **Ein Docker Compose** - Profile für Staging/Prod

### Port-Übersicht

| Service | Development | Staging | Production |
|---------|-------------|---------|------------|
| Frontend | localhost:3000 | :3000 | :4000 |
| Backend API | localhost:3001 | :3001 | :4001 |
| Keycloak | localhost:8080 | :8080 | :8080 |
| MinIO Console | localhost:9001 | :9001 | :9001 |
| PostgreSQL | localhost:5432 | intern | intern |
| Redis | localhost:6379 | intern | intern |

## Schichtenarchitektur

### Frontend (Next.js)

```
src/
├── app/                 # App Router (Pages)
│   ├── (auth)/          # Öffentliche Auth-Seiten
│   │   └── login/
│   └── (dashboard)/     # Geschützte Bereiche
│       ├── dashboard/
│       ├── contracts/
│       ├── partners/
│       └── settings/
├── components/
│   ├── ui/              # shadcn/ui Basiskomponenten
│   ├── layout/          # Layout-Komponenten
│   └── [feature]/       # Feature-spezifische Komponenten
├── hooks/               # Custom React Hooks
├── lib/                 # Utilities & API Client
└── types/               # TypeScript Types
```

### Backend (NestJS)

```
src/
├── main.ts              # Entry Point
├── app.module.ts        # Root Module
├── common/
│   ├── decorators/      # Custom Decorators (@Roles, @CurrentUser)
│   ├── filters/         # Exception Filters
│   ├── guards/          # Auth Guards (KeycloakAuthGuard)
│   ├── interceptors/    # AuditLogInterceptor
│   └── pipes/           # Validation Pipes
├── config/              # Configuration
├── modules/
│   ├── auth/            # Authentifizierung (Keycloak)
│   ├── contracts/       # Vertragsverwaltung
│   ├── documents/       # Dokumentenverwaltung (MinIO)
│   ├── partners/        # Partnerverwaltung
│   ├── users/           # Benutzerverwaltung
│   ├── audit-log/       # Audit-Logging
│   ├── notifications/   # Benachrichtigungen
│   └── deadlines/       # Fristen & Erinnerungen
└── prisma/              # Prisma Service
```

## Datenfluss

### Authentifizierung

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│ Frontend │───▶│ Backend  │───▶│ Keycloak │
│ (Login)  │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                     │               │               │
                     │               │◀──────────────┘
                     │               │  (JWT Token)
                     │◀──────────────┘
                     │  (Token im State)
```

1. Benutzer gibt Credentials im Frontend ein
2. Frontend sendet Login-Request an Backend
3. Backend leitet an Keycloak weiter
4. Keycloak validiert und gibt Tokens zurück
5. Backend erstellt/aktualisiert lokalen User
6. Frontend speichert Token im Auth-Context

### Vertragserstellung

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│ Frontend │───▶│ Backend  │───▶│ Postgres │
│ (Form)   │    │   Zod    │    │class-val │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │
                                     ▼
                              ┌──────────┐
                              │ AuditLog │
                              └──────────┘
```

1. Benutzer füllt Formular aus
2. Frontend validiert mit Zod
3. Request an Backend mit JWT
4. Backend validiert mit class-validator
5. Prisma speichert in PostgreSQL
6. Audit-Log wird automatisch erstellt
7. Response an Frontend

### Dokumenten-Upload

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│ Frontend │───▶│ Backend  │───▶│  MinIO   │
│ (File)   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                     │               │
                                     ▼               │
                              ┌──────────┐          │
                              │ Postgres │◀─────────┘
                              │(Metadata)│  (Checksum)
                              └──────────┘
```

1. Benutzer wählt Datei aus
2. Frontend prüft Dateityp und -größe
3. Multipart Upload an Backend
4. Backend berechnet SHA-256 Checksum
5. Datei wird in MinIO gespeichert
6. Metadaten in PostgreSQL
7. Audit-Log wird erstellt

## Sicherheitsschichten

```
┌──────────────────────────────────────────────────┐
│                    NestJS                         │
│  - Helmet (Security Headers)                     │
│  - CORS (Origin Validation)                      │
│  - Throttler (Rate Limiting)                     │
│  - JWT Validation                                │
└──────────────────────────────────────────────────┘
                        │
┌──────────────────────────────────────────────────┐
│                  Application                      │
│  - Input Validation (class-validator)            │
│  - Role-Based Access Control                     │
│  - Audit Logging (alle CRUD-Ops)                 │
└──────────────────────────────────────────────────┘
                        │
┌──────────────────────────────────────────────────┐
│                   Database                        │
│  - Prisma ORM (SQL Injection Prevention)         │
│  - Keine direkte Exposition (Docker intern)      │
└──────────────────────────────────────────────────┘
```

## Deployment-Optionen

### Option 1: Nur Staging ODER Prod

```bash
# Staging
docker compose --profile staging up -d

# Oder Production
docker compose --profile prod up -d
```

### Option 2: Staging UND Prod auf gleichem Server

```bash
# Beide starten (unterschiedliche Ports)
docker compose --profile staging up -d
docker compose --profile prod up -d

# Staging:  Web :3000, API :3001
# Prod:     Web :4000, API :4001
```

### Shared Services

PostgreSQL, Redis, Keycloak und MinIO werden zwischen Staging und Prod geteilt. Für echte Trennung:
- Separate Datenbanken in PostgreSQL
- Separate MinIO Buckets
- Separate Keycloak Realms

## Skalierung

Das System ist für Single-Server-Betrieb ausgelegt. Bei Bedarf kann skaliert werden:

- **Horizontal**: Mehrere API-Instanzen mit Load Balancer
- **Datenbank**: PostgreSQL Read Replicas
- **Cache**: Redis Cluster
- **Storage**: MinIO Distributed Mode

Für die aktuelle Nutzung (internes Team) ist dies nicht erforderlich.
