'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Server,
  Database,
  HardDrive,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Info,
  MemoryStick,
  Activity,
  Globe,
  Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  version: string;
  environment: string;
  uptime: number;
  database: {
    connected: boolean;
    latency: number;
  };
  storage: {
    used: number;
    total: number;
  };
  memory: {
    used: number;
    total: number;
  };
}

interface ContractStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  expiringIn30Days: number;
  expiringIn90Days: number;
}

interface PartnersResponse {
  data: Array<{ id: string }>;
  meta: { total: number };
}

interface UsersResponse {
  data: Array<{ id: string }>;
  meta: { total: number };
}

export default function SystemPage(): React.JSX.Element {
  const { toast } = useToast();
  const [showCacheDialog, setShowCacheDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Simulated system status (in real app, this would come from an API)
  const systemStatus: SystemStatus = {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Date.now() - 1000 * 60 * 60 * 24 * 3, // 3 days
    database: {
      connected: true,
      latency: 12,
    },
    storage: {
      used: 1.2 * 1024 * 1024 * 1024, // 1.2 GB
      total: 10 * 1024 * 1024 * 1024, // 10 GB
    },
    memory: {
      used: 256 * 1024 * 1024, // 256 MB
      total: 512 * 1024 * 1024, // 512 MB
    },
  };

  const { data: contractStats } = useQuery<ContractStats>({
    queryKey: ['contract-stats'],
    queryFn: async () => {
      const response = await api.get<ContractStats>('/contracts/stats');
      return response.data;
    },
  });

  const { data: partnersData } = useQuery<PartnersResponse>({
    queryKey: ['partners-stats'],
    queryFn: async () => {
      const response = await api.get<PartnersResponse>('/partners?limit=1');
      return response.data;
    },
  });

  const { data: usersData } = useQuery<UsersResponse>({
    queryKey: ['users-stats'],
    queryFn: async () => {
      const response = await api.get<UsersResponse>('/users?limit=1');
      return response.data;
    },
  });

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatUptime = (startTime: number): string => {
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleClearCache = async (): Promise<void> => {
    setIsClearing(true);
    // Simulate cache clearing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsClearing(false);
    setShowCacheDialog(false);
    toast({
      title: 'Cache geleert',
      description: 'Der System-Cache wurde erfolgreich geleert.',
    });
  };

  const storagePercentage = (systemStatus.storage.used / systemStatus.storage.total) * 100;
  const memoryPercentage = (systemStatus.memory.used / systemStatus.memory.total) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Systemeinstellungen</h1>
        <p className="text-muted-foreground">Systemstatus, Konfiguration und Wartung</p>
      </div>

      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">API-Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  <span className="font-medium text-green-600">Online</span>
                </div>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <Server className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Datenbank</p>
                <div className="mt-1 flex items-center gap-2">
                  {systemStatus.database.connected ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{systemStatus.database.latency}ms</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">Offline</span>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Database className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Uptime</p>
                <p className="mt-1 font-medium">{formatUptime(systemStatus.uptime)}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Version</p>
                <p className="mt-1 font-medium">v{systemStatus.version}</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <Info className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Ressourcen
            </CardTitle>
            <CardDescription>Aktuelle Systemauslastung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">Speicher</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {formatBytes(systemStatus.storage.used)} /{' '}
                  {formatBytes(systemStatus.storage.total)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full ${
                    storagePercentage > 80 ? 'bg-red-500' : 'bg-primary'
                  }`}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {storagePercentage.toFixed(1)}% belegt
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm font-medium">Arbeitsspeicher</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {formatBytes(systemStatus.memory.used)} / {formatBytes(systemStatus.memory.total)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full ${
                    memoryPercentage > 80 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${memoryPercentage}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">{memoryPercentage.toFixed(1)}% belegt</p>
            </div>
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Datenbank-Statistiken
            </CardTitle>
            <CardDescription>Aktuelle Datensätze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-2xl font-bold">{contractStats?.total || 0}</p>
                <p className="text-muted-foreground text-sm">Verträge</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-2xl font-bold">{partnersData?.meta?.total || 0}</p>
                <p className="text-muted-foreground text-sm">Partner</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-2xl font-bold">{usersData?.meta?.total || 0}</p>
                <p className="text-muted-foreground text-sm">Benutzer</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-2xl font-bold">-</p>
                <p className="text-muted-foreground text-sm">Dokumente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Konfiguration
          </CardTitle>
          <CardDescription>Aktuelle Systemeinstellungen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Globe className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Umgebung</p>
                  <p className="text-muted-foreground text-sm">Aktive Umgebung</p>
                </div>
              </div>
              <Badge variant={systemStatus.environment === 'production' ? 'default' : 'secondary'}>
                {systemStatus.environment === 'production' ? 'Production' : 'Development'}
              </Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Lock className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Authentifizierung</p>
                  <p className="text-muted-foreground text-sm">JWT-basiert</p>
                </div>
              </div>
              <Badge variant="default">Aktiv</Badge>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Shield className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="font-medium">Rate Limiting</p>
                  <p className="text-muted-foreground text-sm">100 req/min</p>
                </div>
              </div>
              <Badge variant="default">Aktiv</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Wartung
          </CardTitle>
          <CardDescription>Systemwartung und Bereinigung</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Cache leeren</p>
                <p className="text-muted-foreground text-sm">
                  Leert alle temporären Daten und Caches
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowCacheDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Leeren
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">System-Health-Check</p>
                <p className="text-muted-foreground text-sm">Prüft alle Systemkomponenten</p>
              </div>
              <Button variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Prüfen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary flex h-12 w-12 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-xl font-bold">D</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Drykorn Vertragsmanagement</h3>
              <p className="text-muted-foreground">Version {systemStatus.version}</p>
              <p className="text-muted-foreground mt-2 text-sm">
                Sicherheitskritisches Vertragsmanagement-System für interne Nutzung.
                <br />
                Bei Fragen wenden Sie sich an die IT-Abteilung.
              </p>
              <div className="mt-4 flex gap-2">
                <Badge variant="outline">NestJS</Badge>
                <Badge variant="outline">Next.js 14</Badge>
                <Badge variant="outline">PostgreSQL</Badge>
                <Badge variant="outline">Prisma</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear Cache Dialog */}
      <AlertDialog open={showCacheDialog} onOpenChange={setShowCacheDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cache leeren</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie den System-Cache wirklich leeren? Dies kann vorübergehend zu langsameren
              Ladezeiten führen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache} disabled={isClearing}>
              {isClearing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Wird geleert...
                </>
              ) : (
                'Cache leeren'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
