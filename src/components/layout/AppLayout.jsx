import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import FluidBackground from '@/components/landing/FluidBackground';
import { SoundProvider, useSound } from '@/lib/SoundContext';
import SoundToggle from './SoundToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { ROUTE_PERMISSIONS, PLATFORM_ADMIN_ROUTES } from '@/lib/routePermissions';

// Tela de acesso restrito — mostrada quando o papel do usuário não permite a rota.
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold text-foreground">Acesso restrito</h1>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Você não tem permissão para acessar esta página. Fale com um administrador da sua empresa
        se precisar de acesso.
      </p>
      <Link to="/Dashboard"><Button className="mt-6">Voltar ao Dashboard</Button></Link>
    </div>
  );
}

function AppLayoutInner() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  useEffect(() => { setIsDark(theme === 'dark'); }, [theme]);
  const { playBubble } = useSound();

  // Guard de rota (defesa-em-profundidade): a proteção primária dos dados é server-side.
  const requiredPermission = ROUTE_PERMISSIONS[pathname];
  const requiresPlatformAdmin = PLATFORM_ADMIN_ROUTES.includes(pathname);
  const denied =
    (requiredPermission && !can(requiredPermission)) ||
    (requiresPlatformAdmin && !user?.is_platform_admin);

  return (
    <div className="min-h-screen bg-background">
      {/* Background animado interativo (apenas no tema noturno) */}
      {isDark && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <FluidBackground density={60} onInteract={playBubble} style={{ position: 'absolute', inset: 0 }} />
        </div>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main
        className={`transition-all duration-300 min-h-screen relative ${
          collapsed ? 'lg:pl-16' : 'lg:pl-64'
        } ${isDark ? 'z-10' : ''}`}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 h-14 px-4 border-b border-border bg-card sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-foreground lg:hidden">Patrimônio</span>
          <div className="ml-auto flex items-center gap-1">
            <SoundToggle />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {denied ? <AccessDenied /> : <Outlet />}
        </div>
      </main>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SoundProvider>
      <AppLayoutInner />
    </SoundProvider>
  );
}