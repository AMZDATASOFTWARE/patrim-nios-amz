/**
 * Single source of truth for app navigation (sidebar, mobile tab bar, tablet rail).
 *
 * Visibility semantics mirror the previous flat Sidebar filter EXACTLY:
 *  - platformAdminOnly  -> user.is_platform_admin
 *  - billing            -> canManageBilling(user, workspace) (owner always sees /Billing)
 *  - permission         -> can(user, permission)
 * Item permissions were intentionally NOT changed by the regrouping.
 */
import {
  LayoutDashboard, Sparkles, Package, ClipboardCheck, ArrowLeftRight, Map, QrCode,
  Wrench, FileSignature, TrendingDown, Percent, FileDown, FileText,
  Landmark, Building2, Truck, Users, UserCog, ArrowUpDown, History, Settings,
  CreditCard, ShieldCheck, Coins, Home, Boxes, Hammer, Calculator, FolderOpen,
  SlidersHorizontal, Server,
} from 'lucide-react';
import { can, canManageBilling } from '@/lib/permissions';
import { ROUTE_PERMISSIONS } from '@/lib/routePermissions';

/**
 * @typedef {Object} NavItem
 * @property {string} id            - stable id (localStorage/tests key; label may change freely)
 * @property {string} name          - pt-BR label
 * @property {string} href
 * @property {import('lucide-react').LucideIcon} icon
 * @property {string} [permission]
 * @property {boolean} [billing]
 * @property {boolean} [platformAdminOnly]
 * @property {string} [sublabel]
 * @property {string} [tabLabel]    - short label for the mobile tab bar
 * @property {string} [badge]       - badge key resolved by the caller (e.g. 'pendingTransfers')
 *
 * @typedef {Object} NavGroup
 * @property {string} id
 * @property {string|null} label    - null = headerless section (Visão Geral, Relatórios)
 * @property {import('lucide-react').LucideIcon} icon - group icon (tablet rail only)
 * @property {boolean} collapsible
 * @property {boolean} [platformAdminOnly]
 * @property {NavItem[]} items
 */

export const NAV_GROUPS = [
  {
    id: 'visao_geral', label: null, icon: Home, collapsible: false,
    items: [
      { id: 'dashboard', name: 'Dashboard', href: '/Dashboard', icon: LayoutDashboard, permission: 'view_dashboard', tabLabel: 'Início' },
      { id: 'assistant', name: 'Assistente IA', href: '/Assistant', icon: Sparkles, permission: 'view_dashboard' },
    ],
  },
  {
    id: 'patrimonio', label: 'Patrimônio', icon: Boxes, collapsible: true,
    items: [
      { id: 'assets', name: 'Ativos', href: '/Assets', icon: Package, permission: 'view_assets' },
      { id: 'inventory', name: 'Inventário', href: '/Inventory', icon: ClipboardCheck, permission: 'view_inventory' },
      { id: 'transfers', name: 'Transferências', href: '/Transfers', icon: ArrowLeftRight, permission: 'view_transfers', tabLabel: 'Transferir', badge: 'pendingTransfers' },
      { id: 'map', name: 'Mapa', href: '/AssetMap', icon: Map, permission: 'view_map' },
      { id: 'labels', name: 'Etiquetas / QR', href: '/AssetLabel', icon: QrCode, permission: 'view_labels' },
    ],
  },
  {
    id: 'manutencao_contratos', label: 'Manutenção & Contratos', icon: Hammer, collapsible: true,
    items: [
      { id: 'maintenance', name: 'Manutenções', href: '/Maintenance', icon: Wrench, permission: 'view_maintenance' },
      { id: 'contracts', name: 'Contratos', href: '/Contracts', icon: FileSignature, permission: 'view_contracts' },
    ],
  },
  {
    id: 'fiscal_contabil', label: 'Fiscal & Contábil', icon: Calculator, collapsible: true,
    items: [
      { id: 'depreciation', name: 'Depreciação', href: '/Depreciation', icon: TrendingDown, permission: 'view_depreciation' },
      // Percent (was Landmark) — Landmark stays exclusive to Empresa; fixes icon collision in collapsed mode.
      { id: 'ciap', name: 'Créditos CIAP', href: '/CiapCredits', icon: Percent, permission: 'view_fiscal_credits' },
      { id: 'accounting_export', name: 'Export. Contábil', href: '/AccountingExport', icon: FileDown, permission: 'view_accounting_export' },
    ],
  },
  {
    id: 'relatorios', label: null, icon: FileText, collapsible: false,
    items: [
      { id: 'reports', name: 'Relatórios', href: '/Reports', icon: FileText, permission: 'view_reports' },
    ],
  },
  {
    id: 'cadastros', label: 'Cadastros', icon: FolderOpen, collapsible: true,
    items: [
      { id: 'company', name: 'Empresa', href: '/CompanyProfile', icon: Landmark, permission: 'view_company' },
      { id: 'branches', name: 'Filiais', href: '/Branches', icon: Building2, permission: 'view_branches' },
      { id: 'suppliers', name: 'Fornecedores', href: '/Suppliers', icon: Truck, permission: 'view_suppliers' },
      { id: 'collaborators', name: 'Colaboradores', href: '/Collaborators', icon: Users, permission: 'view_users', sublabel: 'responsáveis por ativos' },
    ],
  },
  {
    id: 'administracao', label: 'Administração', icon: SlidersHorizontal, collapsible: true,
    items: [
      { id: 'import_export', name: 'Importar/Exportar', href: '/ImportExport', icon: ArrowUpDown, permission: 'view_reports' },
      // UserCog (was Users) — Users stays exclusive to Colaboradores; access accounts vs. asset custodians.
      { id: 'users', name: 'Usuários', href: '/UsersManagement', icon: UserCog, permission: 'view_users' },
      { id: 'audit', name: 'Auditoria', href: '/AuditTrail', icon: History, permission: 'view_audit' },
      { id: 'settings', name: 'Configurações', href: '/Settings', icon: Settings, permission: 'view_settings' },
      { id: 'billing', name: 'Plano & Cobrança', href: '/Billing', icon: CreditCard, billing: true },
    ],
  },
  {
    id: 'plataforma', label: 'Plataforma', icon: Server, collapsible: true, platformAdminOnly: true,
    items: [
      { id: 'super_admin', name: 'Admin da Plataforma', href: '/SuperAdmin', icon: ShieldCheck, platformAdminOnly: true },
      { id: 'ai_credits', name: 'Créditos de IA', href: '/AdminCredits', icon: Coins, platformAdminOnly: true },
    ],
  },
];

// Routes that logically belong to a nav item but never appear in the nav.
export const ROUTE_ALIASES = {
  '/AssetDetail': '/Assets',
  '/AssetForm': '/Assets',
};

// Mobile tab candidates in priority order; remaining visible items are
// promoted in group order while slots (minus the "Mais" slot) are free.
const MOBILE_TAB_PRIORITY = ['dashboard', 'assets', 'inventory', 'transfers'];

/** Builds the visibility context from the already-available auth/workspace contexts. */
export function buildNavContext(user, workspace) {
  return { user, workspace, can: (permission) => can(user, permission) };
}

/** Same semantics as the previous flat Sidebar filter — do not fork this logic. */
export function isItemVisible(item, ctx) {
  if (item.platformAdminOnly) return !!ctx.user?.is_platform_admin;
  if (item.billing) return canManageBilling(ctx.user, ctx.workspace);
  if (item.permission) return ctx.can(item.permission);
  return true;
}

/** @returns {NavItem[]} */
export function getVisibleItems(group, ctx) {
  if (group.platformAdminOnly && !ctx.user?.is_platform_admin) return [];
  return group.items.filter((item) => isItemVisible(item, ctx));
}

/** Groups with at least one visible item; empty groups never render. */
export function getVisibleGroups(ctx) {
  return NAV_GROUPS
    .map((group) => ({ ...group, items: getVisibleItems(group, ctx) }))
    .filter((group) => group.items.length > 0);
}

/**
 * Deterministic mobile tab allocation. Guarantees: never an empty "Mais",
 * never a "Mais" hiding a single item (it gets promoted into the last slot).
 * @returns {{ tabs: NavItem[], hasMore: boolean }}
 */
export function getMobileTabs(ctx, max = 5) {
  const visible = NAV_GROUPS.flatMap((group) => getVisibleItems(group, ctx));
  const tabs = MOBILE_TAB_PRIORITY
    .map((id) => visible.find((item) => item.id === id))
    .filter(Boolean);
  const remaining = visible.filter((item) => !tabs.includes(item));
  while (remaining.length > 0 && tabs.length < max) {
    if (remaining.length === 1 && tabs.length === max - 1) {
      tabs.push(remaining.shift());
      break;
    }
    if (tabs.length < max - 1) {
      tabs.push(remaining.shift());
    } else {
      break;
    }
  }
  return { tabs, hasMore: remaining.length > 0 };
}

/** Group owning a pathname (alias-aware). null when the route lives outside the nav. */
export function findGroupByPath(pathname) {
  const href = ROUTE_ALIASES[pathname] || pathname;
  return NAV_GROUPS.find((group) => group.items.some((item) => item.href === href)) || null;
}

// Routes legitimately outside the nav (public/detail pages handled elsewhere).
const NON_NAV_ROUTES = new Set(Object.keys(ROUTE_ALIASES));

/** DEV-only guard: a new route added to ROUTE_PERMISSIONS must get a nav group (or an alias). */
export function validateNavConfig() {
  if (!import.meta.env.DEV) return;
  const navHrefs = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)));
  for (const route of Object.keys(ROUTE_PERMISSIONS)) {
    if (!navHrefs.has(route) && !NON_NAV_ROUTES.has(route)) {
      console.warn(`[navigationConfig] Rota "${route}" está em ROUTE_PERMISSIONS mas não em NAV_GROUPS — item novo sem grupo?`);
    }
  }
  const ids = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
  if (new Set(ids).size !== ids.length) {
    console.warn('[navigationConfig] ids de itens duplicados em NAV_GROUPS.');
  }
}

validateNavConfig();
