'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Loader2,
} from 'lucide-react';
import { UserRole, USER_ROLE_LABELS } from '@drykorn/shared';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface UsersResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-red-100 text-red-800 border-red-200',
  [UserRole.MANAGER]: 'bg-blue-100 text-blue-800 border-blue-200',
  [UserRole.USER]: 'bg-green-100 text-green-800 border-green-200',
  [UserRole.VIEWER]: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function UsersPage(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const role = searchParams.get('role') as UserRole | null;
  const isActive = searchParams.get('isActive');

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin-users', { page, search: searchParams.get('search'), role, isActive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (searchParams.get('search')) params.set('search', searchParams.get('search')!);
      if (role) params.set('role', role);
      if (isActive && isActive !== 'all') params.set('isActive', isActive);
      const response = await api.get<UsersResponse>(`/users?${params.toString()}`);
      return response.data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      api.patch(`/users/${id}/${activate ? 'activate' : 'deactivate'}`),
    onSuccess: (_, { activate }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: activate ? 'Benutzer aktiviert' : 'Benutzer deaktiviert',
        description: `Der Benutzer wurde erfolgreich ${activate ? 'aktiviert' : 'deaktiviert'}.`,
      });
      setUserToToggle(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.patch(`/users/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Rolle aktualisiert',
        description: 'Die Benutzerrolle wurde erfolgreich aktualisiert.',
      });
      setEditingUser(null);
      setSelectedRole(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleFilter = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/admin/users?${params.toString()}`);
  };

  const handlePageChange = (newPage: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/users?${params.toString()}`);
  };

  const openRoleEditor = (user: User): void => {
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const saveRole = (): void => {
    if (editingUser && selectedRole) {
      updateRoleMutation.mutate({ id: editingUser.id, role: selectedRole });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benutzerverwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie Benutzer und deren Berechtigungen</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benutzer</CardTitle>
          <CardDescription>{data?.meta.total || 0} Benutzer im System</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Suche nach Name, E-Mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </form>

            <Select value={role || 'all'} onValueChange={(value) => handleFilter('role', value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rolle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Rollen</SelectItem>
                {Object.values(UserRole).map((r) => (
                  <SelectItem key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={isActive || 'all'}
              onValueChange={(value) => handleFilter('isActive', value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="true">Aktiv</SelectItem>
                <SelectItem value="false">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Abteilung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full font-semibold">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-muted-foreground flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                          {USER_ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openRoleEditor(user)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Rolle bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.isActive ? (
                              <DropdownMenuItem
                                onClick={() => setUserToToggle(user)}
                                className="text-destructive"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deaktivieren
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setUserToToggle(user)}
                                className="text-green-600"
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Aktivieren
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.meta.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Zeige {(page - 1) * 20 + 1} bis {Math.min(page * 20, data.meta.total)} von{' '}
                    {data.meta.total} Benutzern
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === data.meta.totalPages}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="text-muted-foreground h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium">Keine Benutzer gefunden</h3>
              <p className="text-muted-foreground mt-1">
                Benutzer können sich über die Registrierungsseite anmelden und werden dann hier
                angezeigt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle Active Dialog */}
      <AlertDialog open={!!userToToggle} onOpenChange={() => setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Benutzer {userToToggle?.isActive ? 'deaktivieren' : 'aktivieren'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.isActive
                ? `Möchten Sie den Benutzer "${userToToggle?.firstName} ${userToToggle?.lastName}" wirklich deaktivieren? Der Benutzer kann sich nicht mehr anmelden.`
                : `Möchten Sie den Benutzer "${userToToggle?.firstName} ${userToToggle?.lastName}" wieder aktivieren?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                userToToggle &&
                toggleActiveMutation.mutate({
                  id: userToToggle.id,
                  activate: !userToToggle.isActive,
                })
              }
              className={
                userToToggle?.isActive
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {toggleActiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {userToToggle?.isActive ? 'Deaktivieren' : 'Aktivieren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rolle bearbeiten</DialogTitle>
            <DialogDescription>
              Wählen Sie die Rolle für {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.values(UserRole).map((r) => (
              <div
                key={r}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
                  selectedRole === r ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedRole(r)}
              >
                <div>
                  <p className="font-medium">{USER_ROLE_LABELS[r]}</p>
                  <p className="text-muted-foreground text-sm">
                    {r === UserRole.ADMIN && 'Vollzugriff auf alle Funktionen'}
                    {r === UserRole.MANAGER && 'Verträge und Partner verwalten'}
                    {r === UserRole.USER && 'Eigene Verträge bearbeiten'}
                    {r === UserRole.VIEWER && 'Nur Lesezugriff'}
                  </p>
                </div>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedRole === r
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  }`}
                >
                  {selectedRole === r && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Abbrechen
            </Button>
            <Button onClick={saveRole} disabled={!selectedRole || updateRoleMutation.isPending}>
              {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
