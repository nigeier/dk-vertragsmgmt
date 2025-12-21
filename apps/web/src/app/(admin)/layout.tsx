'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  Users,
  Shield,
  ScrollText,
  Settings,
  ArrowLeft,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Benutzer', href: '/admin/users', icon: Users },
  { name: 'Audit-Log', href: '/admin/audit-log', icon: ScrollText },
  { name: 'Papierkorb', href: '/admin/trash', icon: Trash2 },
  { name: 'System', href: '/admin/system', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && !hasRole('ADMIN')) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, hasRole, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="bg-card w-64 border-r p-4">
          <Skeleton className="mb-8 h-8 w-32" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasRole('ADMIN')) {
    return <div />;
  }

  return (
    <div className="bg-background flex h-screen">
      {/* Admin Sidebar */}
      <div className="bg-card flex w-64 flex-col border-r">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-red-600">Admin</span>
          </div>
        </div>

        {/* Back to App */}
        <div className="border-b p-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur App
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {adminNavigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="border-t p-4">
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
            <div className="flex items-center gap-2 font-medium">
              <Shield className="h-4 w-4" />
              Administrator-Bereich
            </div>
            <p className="mt-1 opacity-80">
              Änderungen hier wirken sich auf das gesamte System aus.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl py-8">{children}</div>
      </main>
    </div>
  );
}
