'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Verträge', href: '/contracts', icon: FileText },
  { name: 'Partner', href: '/partners', icon: Users },
  { name: 'Fristen', href: '/deadlines', icon: Clock },
  { name: 'Berichte', href: '/reports', icon: BarChart3 },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();
  const { logout, user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="bg-card flex h-screen w-64 flex-col border-r">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <span className="text-primary-foreground text-lg font-bold">D</span>
          </div>
          <span className="text-lg font-semibold">Drykorn</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin Link */}
        {isAdmin && (
          <div className="mt-4 border-t pt-4">
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-red-600 text-white'
                  : 'text-red-600 hover:bg-red-50',
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              Administration
            </Link>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="bg-muted mb-3 rounded-lg p-3">
          <p className="text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-muted-foreground text-xs">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="text-muted-foreground w-full justify-start"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </div>
  );
}
