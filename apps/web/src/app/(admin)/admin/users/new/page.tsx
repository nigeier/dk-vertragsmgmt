'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { UserRole, USER_ROLE_LABELS } from '@drykorn/shared';
import { useToast } from '@/hooks/use-toast';

const userSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  department: z.string().optional(),
  password: z
    .string()
    .min(12, 'Mindestens 12 Zeichen')
    .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
    .regex(/[a-z]/, 'Mindestens ein Kleinbuchstabe')
    .regex(/[0-9]/, 'Mindestens eine Zahl')
    .regex(/[^A-Za-z0-9]/, 'Mindestens ein Sonderzeichen'),
  role: z.nativeEnum(UserRole),
});

type UserFormData = z.infer<typeof userSchema>;

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Vollzugriff auf alle Funktionen inkl. Benutzerverwaltung',
  [UserRole.MANAGER]: 'Verträge genehmigen, Partner verwalten, Reports einsehen',
  [UserRole.USER]: 'Eigene Verträge erstellen und bearbeiten',
  [UserRole.VIEWER]: 'Nur Lesezugriff auf Verträge und Dokumente',
};

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'border-red-200 bg-red-50',
  [UserRole.MANAGER]: 'border-blue-200 bg-blue-50',
  [UserRole.USER]: 'border-green-200 bg-green-50',
  [UserRole.VIEWER]: 'border-gray-200 bg-gray-50',
};

export default function NewUserPage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.USER);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: UserRole.USER,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      api.post('/auth/register', {
        ...data,
        role: selectedRole,
      }),
    onSuccess: () => {
      toast({
        title: 'Benutzer erstellt',
        description: 'Der Benutzer wurde erfolgreich angelegt.',
      });
      router.push('/admin/users');
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Benutzer konnte nicht erstellt werden',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: UserFormData): void => {
    createMutation.mutate({ ...data, role: selectedRole });
  };

  const password = watch('password') || '';

  const passwordChecks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Neuer Benutzer</h1>
          <p className="text-muted-foreground">Erstellen Sie einen neuen Systembenutzer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Persönliche Daten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Vorname *</Label>
                    <Input id="firstName" placeholder="Max" {...register('firstName')} />
                    {errors.firstName && (
                      <p className="text-destructive flex items-center gap-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nachname *</Label>
                    <Input id="lastName" placeholder="Mustermann" {...register('lastName')} />
                    {errors.lastName && (
                      <p className="text-destructive flex items-center gap-1 text-sm">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Abteilung</Label>
                  <Input
                    id="department"
                    placeholder="z.B. Einkauf, Vertrieb, IT"
                    {...register('department')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Kontoinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail-Adresse *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="max.mustermann@drykorn.de"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-destructive flex items-center gap-1 text-sm">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Passwort
                </CardTitle>
                <CardDescription>Das initiale Passwort für den Benutzer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sicheres Passwort eingeben"
                      className="pr-10"
                      {...register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="mb-3 text-sm font-medium">Passwort-Anforderungen:</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.length ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {passwordChecks.length ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Mindestens 12 Zeichen
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.uppercase ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {passwordChecks.uppercase ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Ein Großbuchstabe
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.lowercase ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {passwordChecks.lowercase ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Ein Kleinbuchstabe
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.number ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {passwordChecks.number ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Eine Zahl
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        passwordChecks.special ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {passwordChecks.special ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Ein Sonderzeichen
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Role */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Berechtigung
                </CardTitle>
                <CardDescription>Wählen Sie die Rolle für diesen Benutzer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.values(UserRole).map((role) => (
                    <div
                      key={role}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                        selectedRole === role
                          ? `${ROLE_COLORS[role]} border-primary`
                          : 'bg-muted/30 hover:bg-muted/50 border-transparent'
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{USER_ROLE_LABELS[role]}</p>
                          <p className="text-muted-foreground mt-1 text-sm">
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                            selectedRole === role
                              ? 'bg-primary border-primary text-white'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {selectedRole === role && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">Ausgewählte Rolle</p>
                  <Badge variant="secondary" className="mt-2">
                    {USER_ROLE_LABELS[selectedRole]}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Passwort-Status</p>
                  <Badge variant={allChecksPassed ? 'default' : 'secondary'} className="mt-2">
                    {allChecksPassed ? 'Sicher' : 'Unvollständig'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="space-y-3 pt-6">
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <User className="mr-2 h-4 w-4" />
                  )}
                  Benutzer erstellen
                </Button>
                <Link href="/admin/users" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Abbrechen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h4 className="mb-2 font-medium text-blue-800">Hinweise</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Der Benutzer erhält eine E-Mail mit den Zugangsdaten</li>
                  <li>• Das Passwort muss beim ersten Login geändert werden</li>
                  <li>• Die Rolle kann jederzeit angepasst werden</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
