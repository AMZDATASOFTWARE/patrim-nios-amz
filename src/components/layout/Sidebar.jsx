import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { base44 } from '@/api/base44Client';
import AppFooter from '@/components/AppFooter';
import {
  ROUTE_ALIASES,
  buildNavContext,
  findGroupByPath,
  getVisibleGroups,
} from '@/lib/navigationConfig';
import { useNavGroupsState } from '@/hooks/useNavGroupsState';
import { usePendingTransfersCount } from '@/hooks/usePendingTransfersCount';

const BADGE_CLASS =
  'flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground';

function ItemBadge({ count, collapsed }) {
  if (!count) return null;
  const text = count > 9 ? '9+' : String(count);
  if (collapsed) {
    return <span aria-hidden="true" className={`${BADGE_CLASS} absolute -top-0.5 -right-0.5`}>{text}</span>;
  }
  return <span aria-hidden="true" className={`${BADGE_CLASS} ml-auto`}>{text}</span>;
}

// Module-level (not re-declared per render) so identity stays stable across re-renders.
function NavItem({ item, active, collapsed, badgeCount, touch, onNavigate }) {
  const badgeSr = badgeCount
    ? `, ${badgeCount} ${badgeCount === 1 ? 'aceite pendente' : 'aceites pendentes'}`
    : '';
  const title = collapsed
    ? `${item.name}${badgeCount ? ` · ${badgeCount} pendente(s)` : ''}`
    : undefined;
  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      title={title}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.name + badgeSr : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
        touch ? 'py-3' : item.sublabel && !collapsed ? 'py-2' : 'py-2.5'
      } ${
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      } ${collapsed ? 'justify-center px-2' : ''}`}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      {!collapsed && (
        item.sublabel ? (
          <span className="flex min-w-0 flex-col">
            <span className="truncate leading-5">{item.name}</span>
            <span className={`truncate text-[11px] leading-4 font-normal ${
              active ? 'text-sidebar-primary-foreground/70' : 'text-sidebar-foreground/50'
            }`}>
              {item.sublabel}
            </span>
          </span>
        ) : (
          <span className="truncate">{item.name}</span>
        )
      )}
      {!collapsed && badgeCount > 0 && <span className="sr-only">{badgeSr}</span>}
      <ItemBadge count={badgeCount} collapsed={collapsed} />
    </Link>
  );
}

function GroupHeader({ group, open, onToggle, hasActiveChild }) {
  const showDot = hasActiveChild && !open;
  return (
    <button
      type="button"
      onClick={() => onToggle(group.id)}
      aria-expanded={open}
      aria-controls={`grp-${group.id}`}
      className={`flex h-8 w-full items-center justify-between rounded-md px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground active:bg-sidebar-accent ${
        showDot ? 'text-sidebar-foreground' : 'text-sidebar-foreground/60'
      }`}
    >
      <span className="flex min-w-0 items-center truncate">
        <span className="truncate">{group.label}</span>
        {showDot && <span aria-hidden="true" className="ml-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sidebar-primary" />}
      </span>
      <ChevronDown
        aria-hidden="true"
        className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-0' : '-rotate-90'}`}
      />
    </button>
  );
}

// Animates to the real intrinsic height via grid-template-rows 0fr↔1fr (no JS measuring).
function GroupPanel({ id, open, children }) {
  return (
    <div
      id={id}
      className="grid transition-[grid-template-rows] duration-200 ease-in-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div className="min-h-0 overflow-hidden" inert={open ? undefined : ''}>
        {children}
      </div>
    </div>
  );
}

function GroupedNav({ groups, isActive, navState, pendingTransfers, touch, onNavigate }) {
  const { isOpen, toggle } = navState;
  return (
    <>
      {groups.map((group) => {
        const open = isOpen(group);
        const hasActiveChild = group.items.some((item) => isActive(item.href));
        const items = (
          <ul className="mt-0.5 space-y-0.5">
            {group.items.map((item) => (
              <li key={item.id}>
                <NavItem
                  item={item}
                  active={isActive(item.href)}
                  collapsed={false}
                  touch={touch}
                  badgeCount={item.badge === 'pendingTransfers' ? pendingTransfers : 0}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        );
        if (!group.label) {
          return <div key={group.id} className="mt-4 first:mt-0">{items}</div>;
        }
        return (
          <div key={group.id} className="mt-4 first:mt-0">
            <GroupHeader group={group} open={open} onToggle={toggle} hasActiveChild={hasActiveChild} />
            <GroupPanel id={`grp-${group.id}`} open={open}>{items}</GroupPanel>
          </div>
        );
      })}
    </>
  );
}

function CollapsedRail({ groups, isActive, pendingTransfers }) {
  return (
    <>
      {groups.map((group, idx) => (
        <div key={group.id}>
          {idx > 0 && <div role="separator" className="mx-3 my-2 h-px bg-sidebar-border" />}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={isActive(item.href)}
                collapsed
                badgeCount={item.badge === 'pendingTransfers' ? pendingTransfers : 0}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const navState = useNavGroupsState();
  const pendingTransfers = usePendingTransfersCount();

  const ctx = useMemo(
    () => buildNavContext(user, workspace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.role, user?.is_platform_admin, user?.email, workspace?.owner_email]
  );
  const visibleGroups = useMemo(() => getVisibleGroups(ctx), [ctx]);

  const activeHref = ROUTE_ALIASES[location.pathname] || location.pathname;
  const isActive = (href) => href === activeHref;

  // Deep link into a closed group: the system opens it (without persisting the choice).
  useEffect(() => {
    const group = findGroupByPath(location.pathname);
    if (group?.collapsible) navState.openGroup(group.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navState.openGroup]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-300 ${
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
              <p className="text-xs text-sidebar-foreground/60 truncate">{workspace?.account_type === 'personal' ? 'Conta Pessoal' : 'Empresa'}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Navegação principal" className="flex-1 px-2 py-4 overflow-y-auto">
          {collapsed ? (
            <CollapsedRail groups={visibleGroups} isActive={isActive} pendingTransfers={pendingTransfers} />
          ) : (
            <GroupedNav
              groups={visibleGroups}
              isActive={isActive}
              navState={navState}
              pendingTransfers={pendingTransfers}
            />
          )}
        </nav>

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

        {/* Rodapé institucional */}
        {!collapsed && (
          <div className="border-t border-sidebar-border flex-shrink-0">
            <AppFooter variant="sidebar" />
          </div>
        )}
      </aside>

      {/* Mobile Sidebar (drawer) — kept for the tablet rail; hidden on <768px behind the tab bar */}
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

        {/* Navigation — grouped, touch targets ≥44px, all groups expanded */}
        <nav aria-label="Navegação principal" className="flex-1 px-2 py-4 overflow-y-auto">
          {visibleGroups.map((group) => (
            <div key={group.id} className="mt-4 first:mt-0">
              {group.label && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavItem
                      item={item}
                      active={isActive(item.href)}
                      collapsed={false}
                      touch
                      badgeCount={item.badge === 'pendingTransfers' ? pendingTransfers : 0}
                      onNavigate={onMobileClose}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => base44.auth.logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>

        {/* Rodapé institucional */}
        <div className="border-t border-sidebar-border flex-shrink-0">
          <AppFooter variant="sidebar" />
        </div>
      </aside>
    </>
  );
}
