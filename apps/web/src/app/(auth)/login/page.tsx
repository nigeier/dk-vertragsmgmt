'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Bitte gültige E-Mail-Adresse eingeben'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Focus first 2FA input when 2FA step is shown
  useEffect(() => {
    if (requires2FA && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [requires2FA]);

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data.email, data.password);

      if (result.requiresTwoFactor) {
        setCredentials({ email: data.email, password: data.password });
        setRequires2FA(true);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (): Promise<void> => {
    if (!credentials) return;

    const code = twoFactorCode.join('');
    if (code.length !== 6) {
      setError('Bitte geben Sie den vollständigen 6-stelligen Code ein.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(credentials.email, credentials.password, code);
      router.push('/dashboard');
    } catch {
      setError('Ungültiger 2FA-Code. Bitte versuchen Sie es erneut.');
      setTwoFactorCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string): void => {
    // Nur Ziffern erlauben
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...twoFactorCode];
    newCode[index] = value;
    setTwoFactorCode(newCode);

    // Automatisch zum nächsten Feld wechseln
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Automatisch absenden wenn alle 6 Ziffern eingegeben
    if (value && index === 5 && newCode.every((digit) => digit !== '')) {
      setTimeout(() => handleTwoFactorSubmit(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    // Bei Backspace zum vorherigen Feld wechseln
    if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Enter zum Absenden
    if (e.key === 'Enter') {
      handleTwoFactorSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent): void => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...twoFactorCode];

    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }

    setTwoFactorCode(newCode);

    // Focus auf das letzte ausgefüllte oder nächste leere Feld
    const nextEmptyIndex = newCode.findIndex((digit) => digit === '');
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
      // Automatisch absenden wenn vollständig
      setTimeout(() => handleTwoFactorSubmit(), 100);
    }
  };

  const handleBack = (): void => {
    setRequires2FA(false);
    setCredentials(null);
    setTwoFactorCode(['', '', '', '', '', '']);
    setError(null);
  };

  // 2FA Code Eingabe
  if (requires2FA) {
    return (
      <div className="from-drykorn-50 to-drykorn-100 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <ShieldCheck className="text-primary-foreground h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">Zwei-Faktor-Authentifizierung</CardTitle>
            <CardDescription>
              Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-2">
                {twoFactorCode.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isLoading}
                    className="h-14 w-12 text-center text-2xl font-bold"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <Button
                onClick={handleTwoFactorSubmit}
                className="w-full"
                disabled={isLoading || twoFactorCode.some((d) => d === '')}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Bestätigen
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Anmeldung
              </Button>

              <div className="text-muted-foreground text-center text-xs">
                <p>Der Code wird alle 30 Sekunden erneuert.</p>
                <p>Öffnen Sie Ihre Authenticator-App (z.B. Google Authenticator).</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard Login-Formular
  return (
    <div className="from-drykorn-50 to-drykorn-100 flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Lock className="text-primary-foreground h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Drykorn Vertragsmanagement</CardTitle>
          <CardDescription>Melden Sie sich mit Ihren Zugangsdaten an</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
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
              <Label htmlFor="password">Passwort</Label>
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
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Anmelden
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Noch kein Konto? </span>
            <Link href="/register" className="text-primary hover:underline">
              Jetzt registrieren
            </Link>
          </div>

          <div className="text-muted-foreground mt-2 text-center text-xs">
            <p>Bei Problemen wenden Sie sich an die IT-Abteilung.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
