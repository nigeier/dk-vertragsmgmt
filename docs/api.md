# API-Dokumentation

## Übersicht

Die REST API ist unter `http://localhost:3001/api/v1` (Development) bzw. `https://api.{domain}/api/v1` (Production) erreichbar.

Eine interaktive Swagger-Dokumentation ist unter `/api/docs` verfügbar.

## Authentifizierung

Alle Endpunkte (außer `/auth/*`) erfordern einen gültigen JWT-Token im Authorization-Header:

```
Authorization: Bearer <access_token>
```

## Endpunkte

### Auth

#### POST /auth/login
Benutzer authentifizieren.

**Request:**
```json
{
  "username": "user@drykorn.de",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 900
}
```

#### POST /auth/refresh
Access Token erneuern.

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

#### GET /auth/me
Aktuellen Benutzer abrufen.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@drykorn.de",
  "firstName": "Max",
  "lastName": "Mustermann",
  "roles": ["USER"]
}
```

### Contracts

#### GET /contracts
Alle Verträge abrufen (mit Paginierung und Filter).

**Query Parameter:**
| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `page` | number | Seitennummer (default: 1) |
| `limit` | number | Einträge pro Seite (default: 20) |
| `search` | string | Volltextsuche |
| `status` | string[] | Filter nach Status |
| `type` | string[] | Filter nach Typ |
| `partnerId` | uuid | Filter nach Partner |
| `sortBy` | string | Sortierfeld |
| `sortOrder` | 'asc' \| 'desc' | Sortierrichtung |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "contractNumber": "DK-2024-00001",
      "title": "Rahmenvertrag Stoffe",
      "type": "SUPPLIER",
      "status": "ACTIVE",
      "partner": { "id": "uuid", "name": "Textile GmbH" },
      "endDate": "2024-12-31",
      "value": 50000,
      "currency": "EUR"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

#### GET /contracts/:id
Einzelnen Vertrag abrufen.

#### POST /contracts
Neuen Vertrag erstellen.

**Request:**
```json
{
  "title": "Neuer Vertrag",
  "type": "SUPPLIER",
  "partnerId": "uuid",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "value": 10000,
  "currency": "EUR"
}
```

#### PUT /contracts/:id
Vertrag aktualisieren.

#### PATCH /contracts/:id/status
Vertragsstatus ändern.

**Request:**
```json
{
  "status": "ACTIVE"
}
```

#### DELETE /contracts/:id
Vertrag löschen (nur Entwürfe).

#### GET /contracts/stats
Vertragsstatistiken abrufen.

**Response:**
```json
{
  "total": 150,
  "byStatus": {
    "DRAFT": 10,
    "ACTIVE": 100,
    "EXPIRED": 30,
    "TERMINATED": 10
  },
  "expiringIn30Days": 5,
  "expiringIn60Days": 12,
  "expiringIn90Days": 20,
  "totalValue": 1500000
}
```

### Documents

#### GET /documents/contract/:contractId
Dokumente eines Vertrags abrufen.

#### GET /documents/:id/download
Dokument herunterladen.

#### POST /documents/upload
Dokument hochladen.

**Request:** `multipart/form-data`
- `file`: Datei
- `contractId`: UUID
- `isMainDocument`: boolean (optional)

**Response:**
```json
{
  "id": "uuid",
  "filename": "vertrag_2024.pdf",
  "originalName": "Vertrag 2024.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "version": 1
}
```

#### DELETE /documents/:id
Dokument löschen.

### Partners

#### GET /partners
Alle Partner abrufen.

#### GET /partners/:id
Partner abrufen.

#### POST /partners
Partner erstellen.

#### PUT /partners/:id
Partner aktualisieren.

#### DELETE /partners/:id
Partner löschen.

### Users

#### GET /users
Alle Benutzer abrufen (nur ADMIN/MANAGER).

#### GET /users/:id
Benutzer abrufen.

#### PATCH /users/:id
Benutzer aktualisieren.

### Notifications

#### GET /notifications
Benachrichtigungen abrufen.

#### GET /notifications/count
Anzahl ungelesener Benachrichtigungen.

#### PATCH /notifications/:id/read
Als gelesen markieren.

#### PATCH /notifications/read-all
Alle als gelesen markieren.

### Deadlines

#### GET /deadlines/upcoming
Anstehende Fristen abrufen.

**Query Parameter:**
| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `days` | number | Tage im Voraus (default: 30) |

#### POST /deadlines
Erinnerung erstellen.

### Audit Log

#### GET /audit-log
Audit-Log abrufen (nur ADMIN/MANAGER).

**Query Parameter:**
| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `userId` | uuid | Filter nach Benutzer |
| `entityType` | string | Filter nach Entity-Typ |
| `action` | string[] | Filter nach Aktion |
| `dateFrom` | date | Von Datum |
| `dateTo` | date | Bis Datum |

## Fehlerbehandlung

Fehler werden im folgenden Format zurückgegeben:

```json
{
  "statusCode": 400,
  "message": ["title must be a string"],
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/contracts"
}
```

### HTTP Status Codes

| Code | Bedeutung |
|------|-----------|
| 200 | Erfolg |
| 201 | Erstellt |
| 204 | Gelöscht (kein Content) |
| 400 | Validierungsfehler |
| 401 | Nicht authentifiziert |
| 403 | Keine Berechtigung |
| 404 | Nicht gefunden |
| 429 | Rate Limit erreicht |
| 500 | Serverfehler |

## Rate Limiting

- **Limit:** 100 Requests pro Minute
- Bei Überschreitung: Status 429
- Header: `X-RateLimit-Remaining`
