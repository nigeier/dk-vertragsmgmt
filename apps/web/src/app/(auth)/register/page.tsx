'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Vorname muss mindestens 2 Zeichen haben'),
    lastName: z.string().min(2, 'Nachname muss mindestens 2 Zeichen haben'),
    email: z.string().email('Bitte gültige E-Mail-Adresse eingeben'),
    department: z.string().optional(),
    password: z
      .string()
      .min(8, 'Passwort muss mindestens 8 Zeichen haben')
      .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
      .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
      .regex(/\d/, 'Passwort muss mindestens eine Zahl enthalten')
      .regex(
        /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~';]/,
        'Passwort muss mindestens ein Sonderzeichen enthalten',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        department: data.department || undefined,
      });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="from-drykorn-50 to-drykorn-100 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Registrierung erfolgreich!</CardTitle>
            <CardDescription>Ihre Registrierung wurde eingereicht.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-md p-4 text-sm">
              <p className="mb-2 font-medium">Wie geht es weiter?</p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1">
                <li>Ein Administrator wurde über Ihre Registrierung informiert</li>
                <li>Sie erhalten eine E-Mail, sobald Ihr Konto freigeschaltet wurde</li>
                <li>Danach können Sie sich mit Ihren Zugangsdaten anmelden</li>
              </ul>
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Anmeldung
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="from-drykorn-50 to-drykorn-100 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <UserPlus className="text-primary-foreground h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Konto erstellen</CardTitle>
          <CardDescription>Registrieren Sie sich für das Vertragsmanagement</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  placeholder="Max"
                  {...register('firstName')}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-destructive text-xs">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname *</Label>
                <Input
                  id="lastName"
                  placeholder="Mustermann"
                  {...register('lastName')}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-destructive text-xs">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="max.mustermann@drykorn.de"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Abteilung</Label>
              <Input
                id="department"
                placeholder="z.B. Einkauf, Vertrieb, IT"
                {...register('department')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
              <p className="text-muted-foreground text-xs">
                Mind. 8 Zeichen, Groß-/Kleinbuchstaben, Zahl und Sonderzeichen
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrieren
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Bereits registriert? </span>
            <Link href="/login" className="text-primary hover:underline">
              Anmelden
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
