'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Settings2,
  Lock,
  Smartphone,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
    newPassword: z
      .string()
      .min(12, 'Passwort muss mindestens 12 Zeichen haben')
      .regex(/[A-Z]/, 'Passwort muss einen Großbuchstaben enthalten')
      .regex(/[a-z]/, 'Passwort muss einen Kleinbuchstaben enthalten')
      .regex(/[0-9]/, 'Passwort muss eine Zahl enthalten')
      .regex(/[^A-Za-z0-9]/, 'Passwort muss ein Sonderzeichen enthalten'),
    confirmPassword: z.string().min(1, 'Passwort-Bestätigung ist erforderlich'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

interface TwoFactorStatusResponse {
  enabled: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  USER: 'Benutzer',
  VIEWER: 'Betrachter',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  USER: 'bg-green-100 text-green-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

export default function SettingsPage(): React.JSX.Element {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Password state
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // 2FA state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [disableCode, setDisableCode] = useState(['', '', '', '', '', '']);
  const [secretCopied, setSecretCopied] = useState(false);
  const setupInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const disableInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // 2FA Status Query
  const { data: twoFactorStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const { data } = await api.get<TwoFactorStatusResponse>('/auth/2fa/status');
      return data;
    },
  });

  // Password mutation
  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      api.post('/auth/change-password', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      setShowSuccessDialog(true);
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Passwort konnte nicht geändert werden',
        variant: 'destructive',
      });
    },
  });

  // 2FA Setup mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup');
      return data;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setShowSetupDialog(true);
      setVerificationCode(['', '', '', '', '', '']);
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || '2FA-Setup konnte nicht gestartet werden',
        variant: 'destructive',
      });
    },
  });

  // 2FA Enable mutation
  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      await api.post('/auth/2fa/enable', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      setShowSetupDialog(false);
      setSetupData(null);
      toast({
        title: '2FA aktiviert',
        description: 'Zwei-Faktor-Authentifizierung wurde erfolgreich aktiviert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Ungültiger Bestätigungscode',
        variant: 'destructive',
      });
      setVerificationCode(['', '', '', '', '', '']);
      setupInputRefs.current[0]?.focus();
    },
  });

  // 2FA Disable mutation
  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      await api.post('/auth/2fa/disable', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      setShowDisableDialog(false);
      toast({
        title: '2FA deaktiviert',
        description: 'Zwei-Faktor-Authentifizierung wurde deaktiviert.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fehler',
        description: error.message || 'Ungültiger Bestätigungscode',
        variant: 'destructive',
      });
      setDisableCode(['', '', '', '', '', '']);
      disableInputRefs.current[0]?.focus();
    },
  });

  // Focus first input when dialogs open
  useEffect(() => {
    if (showSetupDialog && setupData && setupInputRefs.current[0]) {
      setTimeout(() => setupInputRefs.current[0]?.focus(), 100);
    }
  }, [showSetupDialog, setupData]);

  useEffect(() => {
    if (showDisableDialog && disableInputRefs.current[0]) {
      setTimeout(() => disableInputRefs.current[0]?.focus(), 100);
    }
  }, [showDisableDialog]);

  const onPasswordSubmit = (data: PasswordFormData): void => {
    passwordMutation.mutate(data);
  };

  const handleCodeChange = (
    index: number,
    value: string,
    codeState: string[],
    setCodeState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    onComplete?: () => void,
  ): void => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...codeState];
    newCode[index] = value;
    setCodeState(newCode);

    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((digit) => digit !== '') && onComplete) {
      setTimeout(onComplete, 100);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    codeState: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ): void => {
    if (e.key === 'Backspace' && !codeState[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent,
    setCodeState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    onComplete?: () => void,
  ): void => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];

    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }

    setCodeState(newCode);

    const nextEmptyIndex = newCode.findIndex((digit) => digit === '');
    if (nextEmptyIndex !== -1) {
      refs.current[nextEmptyIndex]?.focus();
    } else {
      refs.current[5]?.focus();
      if (onComplete) setTimeout(onComplete, 100);
    }
  };

  const handleVerifySetup = (): void => {
    const code = verificationCode.join('');
    if (code.length === 6) {
      enableMutation.mutate(code);
    }
  };

  const handleDisable2FA = (): void => {
    const code = disableCode.join('');
    if (code.length === 6) {
      disableMutation.mutate(code);
    }
  };

  const copySecret = (): void => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const is2FAEnabled = twoFactorStatus?.enabled ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihr Profil und Ihre Kontoeinstellungen
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil
            </CardTitle>
            <CardDescription>Ihre persönlichen Kontoinformationen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="bg-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">E-Mail</Label>
                <div className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Anzeigename</Label>
                <div className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
                  <User className="text-muted-foreground h-4 w-4" />
                  <span>
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Vorname</Label>
                <div className="bg-muted/50 rounded-md border px-3 py-2">{user?.firstName}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Nachname</Label>
                <div className="bg-muted/50 rounded-md border px-3 py-2">{user?.lastName}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Berechtigung
            </CardTitle>
            <CardDescription>Ihre zugewiesene Rolle</CardDescription>
          </CardHeader>
          <CardContent>
            {user?.role && (
              <div
                className={`flex items-center gap-3 rounded-lg px-4 py-3 ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}
              >
                <Shield className="h-5 w-5" />
                <div>
                  <p className="font-medium">{ROLE_LABELS[user.role] || user.role}</p>
                  <p className="text-xs opacity-80">
                    {user.role === 'ADMIN' && 'Vollzugriff auf alle Funktionen'}
                    {user.role === 'MANAGER' && 'Verträge und Partner verwalten'}
                    {user.role === 'USER' && 'Eigene Verträge bearbeiten'}
                    {user.role === 'VIEWER' && 'Nur Lesezugriff'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Zwei-Faktor-Authentifizierung (2FA)
          </CardTitle>
          <CardDescription>
            Schützen Sie Ihr Konto mit einer zusätzlichen Sicherheitsebene
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatus ? (
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lade Status...
            </div>
          ) : is2FAEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3 text-green-800">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-medium">2FA ist aktiviert</p>
                  <p className="text-sm opacity-80">
                    Ihr Konto ist durch Zwei-Faktor-Authentifizierung geschützt
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  setDisableCode(['', '', '', '', '', '']);
                  setShowDisableDialog(true);
                }}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                2FA deaktivieren
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">2FA ist nicht aktiviert</p>
                  <p className="text-sm opacity-80">
                    Aktivieren Sie 2FA für zusätzliche Sicherheit
                  </p>
                </div>
              </div>
              <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
                {setupMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                2FA aktivieren
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Passwort ändern
          </CardTitle>
          <CardDescription>Ändern Sie Ihr Passwort regelmäßig für mehr Sicherheit</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onPasswordSubmit)}>
          <CardContent className="space-y-4">
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Aktuelles Passwort</Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showPassword ? 'text' : 'password'}
                    {...register('oldPassword')}
                    className="pr-10"
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
                {errors.oldPassword && (
                  <p className="text-destructive text-sm">{errors.oldPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    {...register('newPassword')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p className="text-destructive text-sm">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="mb-2 text-sm font-medium">Passwort-Anforderungen:</p>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Mindestens 12 Zeichen
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Mindestens ein Großbuchstabe
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Mindestens ein Kleinbuchstabe
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Mindestens eine Zahl
                  </li>
                  <li className="flex items-center gap-2">
                    <Lock className="h-3 w-3" />
                    Mindestens ein Sonderzeichen
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Passwort ändern
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Systeminformationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Umgebung</p>
              <Badge variant="outline">Development</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">API-Status</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Verbunden</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">
              Passwort erfolgreich geändert
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Ihr Passwort wurde erfolgreich aktualisiert. Verwenden Sie Ihr neues Passwort bei der
              nächsten Anmeldung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>
              Verstanden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              2FA einrichten
            </DialogTitle>
            <DialogDescription>
              Scannen Sie den QR-Code mit Ihrer Authenticator-App
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center rounded-lg bg-white p-4">
                <QRCodeSVG value={setupData.qrCodeUrl} size={200} level="M" />
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  Oder geben Sie diesen Code manuell ein:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-sm">
                    {setupData.secret}
                  </code>
                  <Button type="button" variant="outline" size="icon" onClick={copySecret}>
                    {secretCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label>Bestätigungscode eingeben:</Label>
                <div className="flex justify-center gap-2">
                  {verificationCode.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        setupInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleCodeChange(
                          index,
                          e.target.value,
                          verificationCode,
                          setVerificationCode,
                          setupInputRefs,
                          handleVerifySetup,
                        )
                      }
                      onKeyDown={(e) => handleKeyDown(index, e, verificationCode, setupInputRefs)}
                      onPaste={
                        index === 0
                          ? (e) =>
                              handlePaste(e, setVerificationCode, setupInputRefs, handleVerifySetup)
                          : undefined
                      }
                      disabled={enableMutation.isPending}
                      className="h-12 w-10 text-center text-xl font-bold"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSetupDialog(false)}
              disabled={enableMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleVerifySetup}
              disabled={enableMutation.isPending || verificationCode.some((d) => d === '')}
            >
              {enableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aktivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-center">2FA deaktivieren</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Sind Sie sicher? Ihr Konto wird weniger geschützt sein. Geben Sie zur Bestätigung
              Ihren 2FA-Code ein.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex justify-center gap-2 py-4">
            {disableCode.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => {
                  disableInputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) =>
                  handleCodeChange(
                    index,
                    e.target.value,
                    disableCode,
                    setDisableCode,
                    disableInputRefs,
                    handleDisable2FA,
                  )
                }
                onKeyDown={(e) => handleKeyDown(index, e, disableCode, disableInputRefs)}
                onPaste={
                  index === 0
                    ? (e) => handlePaste(e, setDisableCode, disableInputRefs, handleDisable2FA)
                    : undefined
                }
                disabled={disableMutation.isPending}
                className="h-12 w-10 text-center text-xl font-bold"
              />
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableMutation.isPending}>Abbrechen</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={disableMutation.isPending || disableCode.some((d) => d === '')}
            >
              {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deaktivieren
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
