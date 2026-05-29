import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  Building2,
  TrendingDown,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Map,
  QrCode,
  Truck,
  Users,
  Settings,
  Landmark,
  CreditCard,
  Banknote,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { getPlan } from '@/lib/plans';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { base44 } from '@/api/base44Client';

// requiredPermission: permissão necessária para ver o item
// adminOnly: apenas admin da plataforma (super admin) vê
const navigation = [
  { name: 'Dashboard',       href: '/Dashboard',        icon: LayoutDashboard, requiredPermission: 'view_dashboard' },
  { name: 'Ativos',          href: '/Assets',            icon: Package,         requiredPermission: 'view_assets' },
  { name: 'Mapa',            href: '/AssetMap',          icon: Map,             requiredPermission: 'view_map' },
  { name: 'Etiquetas / QR',  href: '/AssetLabel',        icon: QrCode,          requiredPermission: 'view_labels' },
  { name: 'Depreciação',     href: '/Depreciation',      icon: TrendingDown,    requiredPermission: 'view_depreciation' },
  { name: 'Relatórios',      href: '/Reports',           icon: FileText,        requiredPermission: 'view_reports' },
  { name: 'Fornecedores',    href: '/Suppliers',         icon: Truck,           requiredPermission: 'view_suppliers' },
  { name: 'Colaboradores',   href: '/Collaborators',     icon: Users,           requiredPermission: 'view_users' },
  { name: 'Empresa',         href: '/CompanyProfile',    icon: Landmark,        requiredPermission: 'view_company' },
  { name: 'Usuários',        href: '/UsersManagement',   icon: Users,           requiredPermission: 'view_users' },
  { name: 'Configurações',   href: '/Settings',          icon: Settings,        requiredPermission: 'view_settings' },
  { name: 'Plano & Cobrança',href: '/Billing',           icon: CreditCard,      requiredPermission: 'view_billing' },
  { name: 'Pagamentos',      href: '/AdminPayments',     icon: Banknote,        adminOnly: true },
  { name: 'Super Admin',     href: '/SuperAdmin',        icon: ShieldAlert,     adminOnly: true },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const isSuperAdmin = user?.role === 'admin';

  const visibleNav = navigation.filter(item => {
    if (item.adminOnly) return isSuperAdmin;
    if (item.requiredPermission) return can(item.requiredPermission);
    return true;
  });

  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        onClick={onMobileClose}
        title={collapsed ? item.name : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        } ${collapsed ? 'justify-center px-2' : ''}`}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className={`flex h-16 items-center border-b border-sidebar-border flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-sidebar-foreground leading-tight truncate">{workspace?.name || 'Patrimônio'}</h1>
              <p className="text-xs text-sidebar-foreground/60 truncate">{workspace?.plan === 'personal' ? 'Conta Pessoal' : 'Empresa'}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* Plan badge */}
        {!collapsed && workspace && (
          <div className="px-3 pb-3">
            <a href="/Billing" className="block bg-sidebar-accent/60 hover:bg-sidebar-accent rounded-lg px-3 py-2 transition-colors">
              <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 font-semibold">Plano atual</p>
              <p className="text-sm font-bold text-sidebar-primary capitalize">{getPlan(workspace?.plan)?.name || 'Starter'}</p>
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          <button
            onClick={() => base44.auth.logout()}
            title={collapsed ? 'Sair' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>

          {/* Toggle button */}
          <button
            onClick={onToggle}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all ${collapsed ? 'justify-center px-2' : ''}`}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 flex-shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 flex-shrink-0" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar (drawer) */}
      <aside
        className={`lg:hidden fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground leading-tight">Patrimônio</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema Contábil</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => base44.auth.logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}