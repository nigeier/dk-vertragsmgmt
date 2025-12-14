# Deployment

## Übersicht

Das System ist für **internes Netzwerk** konzipiert - kein Internetzugang erforderlich.

| Umgebung | Methode | Ports |
|----------|---------|-------|
| Development | Lokal (ohne Docker) | 3000, 3001 |
| Staging | Docker Compose | 3000, 3001, 8080, 9001 |
| Production | Docker Compose | 4000, 4001, 8080, 9001 |

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
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────────┐    ┌─────────┐    ┌─────────┐
              │Postgres │    │  Redis  │    │  MinIO  │
              │ (intern)│    │ (intern)│    │  :9001  │
              └─────────┘    └─────────┘    └─────────┘
```

## Development (Lokal)

### Voraussetzungen

1. **Node.js 20+** und **npm 10+**
2. **PostgreSQL 18** lokal installiert
3. **Redis 7** lokal installiert
4. **MinIO** lokal installiert (optional)
5. **Keycloak** lokal installiert (optional)

### Setup

```bash
# 1. Dependencies installieren
npm install

# 2. Umgebungsvariablen erstellen
cp .env.example .env.local
# Werte anpassen (Passwörter etc.)

# 3. PostgreSQL Datenbank erstellen
psql -U postgres
CREATE DATABASE drykorn_contracts;
CREATE USER drykorn WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE drykorn_contracts TO drykorn;
\q

# 4. Prisma Migrationen ausführen
npm run db:migrate

# 5. (Optional) Seed-Daten einfügen
npm run db:seed

# 6. Entwicklungsserver starten
npm run dev:all
```

### Einzelne Services

```bash
npm run dev:web   # Nur Frontend (Port 3000)
npm run dev:api   # Nur Backend (Port 3001)
```

## Server-Deployment (Staging & Production)

### Voraussetzungen

- **Docker** und **Docker Compose** installiert
- Server im internen Netzwerk erreichbar
- Mindestens 4 GB RAM, 2 CPUs

### Server vorbereiten

```bash
# 1. Repository auf Server klonen
git clone <repository-url> /opt/drykorn-contracts
cd /opt/drykorn-contracts

# 2. Umgebungsvariablen erstellen
cp .env.example .env

# 3. WICHTIG: Alle Passwörter durch sichere Werte ersetzen!
nano .env
```

### Sichere Passwörter generieren

```bash
# Für DATABASE_PASSWORD, REDIS_PASSWORD, etc.
openssl rand -base64 24

# Für JWT_SECRET
openssl rand -hex 32

# Für ENCRYPTION_KEY
openssl rand -hex 32
```

### .env für Server anpassen

```bash
# Server-IP setzen (WICHTIG!)
SERVER_IP=192.168.1.100

# Für Production die Ports beachten:
# Staging:  Web=3000, API=3001
# Prod:     Web=4000, API=4001
```

## Staging starten

```bash
# Images bauen und starten
docker compose --profile staging up -d --build

# Status prüfen
docker compose --profile staging ps

# Logs anzeigen
docker compose --profile staging logs -f

# Nur API-Logs
docker compose --profile staging logs -f api-staging
```

**Zugriff:**
- Frontend: `http://192.168.1.100:3000`
- API: `http://192.168.1.100:3001`
- Keycloak: `http://192.168.1.100:8080`
- MinIO Console: `http://192.168.1.100:9001`

## Production starten

```bash
# Images bauen und starten
docker compose --profile prod up -d --build

# Status prüfen
docker compose --profile prod ps

# Logs anzeigen
docker compose --profile prod logs -f
```

**Zugriff:**
- Frontend: `http://192.168.1.100:4000`
- API: `http://192.168.1.100:4001`
- Keycloak: `http://192.168.1.100:8080`
- MinIO Console: `http://192.168.1.100:9001`

## Staging UND Production gleichzeitig

Beide Profile können auf demselben Server laufen:

```bash
# Erst Staging
docker compose --profile staging up -d --build

# Dann Production (andere Ports)
docker compose --profile prod up -d --build

# Beide stoppen
docker compose --profile staging --profile prod down
```

| Service | Staging | Production |
|---------|---------|------------|
| Frontend | :3000 | :4000 |
| API | :3001 | :4001 |
| Keycloak | :8080 (geteilt) | :8080 (geteilt) |
| MinIO | :9001 (geteilt) | :9001 (geteilt) |
| PostgreSQL | intern (geteilt) | intern (geteilt) |
| Redis | intern (geteilt) | intern (geteilt) |

**Hinweis:** Für echte Trennung separate Datenbanken in PostgreSQL erstellen:
- `drykorn_contracts_staging`
- `drykorn_contracts_prod`

## Updates einspielen

```bash
# 1. Code aktualisieren
cd /opt/drykorn-contracts
git pull origin main

# 2. Backup erstellen (siehe unten)

# 3. Images neu bauen und Container aktualisieren
docker compose --profile prod up -d --build

# 4. Migrationen ausführen (falls nötig)
docker compose --profile prod exec api-prod npm run db:migrate
```

## Backup

### Datenbank-Backup

```bash
# Backup erstellen
docker compose --profile prod exec postgres \
  pg_dump -U drykorn drykorn_contracts > backup_$(date +%Y%m%d).sql

# Backup wiederherstellen
docker compose --profile prod exec -T postgres \
  psql -U drykorn drykorn_contracts < backup_20241215.sql
```

### MinIO-Backup (Dokumente)

```bash
# MinIO Client installieren (einmalig)
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
./mc alias set drykorn http://192.168.1.100:9000 ACCESS_KEY SECRET_KEY

# Backup
./mc mirror drykorn/drykorn-contracts ./backup/documents/

# Restore
./mc mirror ./backup/documents/ drykorn/drykorn-contracts
```

### Automatisches Backup (Cron)

```bash
# /etc/cron.d/drykorn-backup
0 2 * * * root /opt/drykorn-contracts/scripts/backup.sh
```

## Monitoring & Health Checks

### Status prüfen

```bash
# Container-Status
docker compose --profile prod ps

# Ressourcenverbrauch
docker stats

# Health-Endpoints
curl http://192.168.1.100:4001/api/v1/health  # API
curl http://192.168.1.100:4000                 # Web
curl http://192.168.1.100:8080/health/ready    # Keycloak
```

### Logs

```bash
# Alle Logs
docker compose --profile prod logs -f

# Nur Fehler
docker compose --profile prod logs -f 2>&1 | grep -i error

# Letzte 100 Zeilen API
docker compose --profile prod logs --tail 100 api-prod
```

## Troubleshooting

### Container startet nicht

```bash
# Status und Exit-Code prüfen
docker compose --profile prod ps -a

# Detaillierte Logs
docker compose --profile prod logs api-prod

# Container manuell starten für Debug
docker compose --profile prod run --rm api-prod sh
```

### Datenbank-Verbindung fehlgeschlagen

1. Postgres-Container läuft?
   ```bash
   docker compose --profile prod ps postgres
   ```

2. Credentials in `.env` korrekt?

3. Health-Check:
   ```bash
   docker compose --profile prod exec postgres \
     pg_isready -U drykorn -d drykorn_contracts
   ```

### Keycloak startet langsam

Keycloak braucht beim ersten Start Zeit für Initialisierung. Warten Sie 1-2 Minuten.

```bash
# Health prüfen
docker compose --profile prod logs -f keycloak | grep -i ready
```

### Port bereits belegt

```bash
# Welcher Prozess nutzt den Port?
netstat -tlnp | grep 3000

# Oder mit lsof
lsof -i :3000
```

## Firewall-Konfiguration

Für internes Netzwerk nur benötigte Ports öffnen:

```bash
# UFW (Ubuntu)
ufw allow from 192.168.1.0/24 to any port 3000  # Staging Web
ufw allow from 192.168.1.0/24 to any port 3001  # Staging API
ufw allow from 192.168.1.0/24 to any port 4000  # Prod Web
ufw allow from 192.168.1.0/24 to any port 4001  # Prod API
ufw allow from 192.168.1.0/24 to any port 8080  # Keycloak
ufw allow from 192.168.1.0/24 to any port 9001  # MinIO Console
```

## Checkliste vor Go-Live

- [ ] Alle `CHANGE_ME_*` Passwörter in `.env` ersetzt
- [ ] `SERVER_IP` korrekt gesetzt
- [ ] PostgreSQL Backup getestet
- [ ] Keycloak Admin-Zugang funktioniert
- [ ] Erster Benutzer in Keycloak angelegt
- [ ] MinIO Bucket existiert
- [ ] Health-Checks alle grün
- [ ] Firewall konfiguriert
