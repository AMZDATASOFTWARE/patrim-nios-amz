import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { ROUTE_ALIASES, buildNavContext, getVisibleGroups } from '@/lib/navigationConfig';

/**
 * One button per GROUP (not per item), 768-1023 landscape only (visibility is a
 * plain CSS media query in index.css — no matchMedia/JS, so rotating the device
 * never flickers). Tapping a multi-item group opens the drawer scrolled to it;
 * a single-item group (Relatórios) navigates straight there.
 */
export default function TabletRail({ onGroupTap }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useWorkspace();

  const ctx = useMemo(
    () => buildNavContext(user, workspace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.role, user?.is_platform_admin, user?.email, workspace?.owner_email]
  );
  const visibleGroups = useMemo(() => getVisibleGroups(ctx), [ctx]);

  const activeHref = ROUTE_ALIASES[location.pathname] || location.pathname;
  const activeGroup = visibleGroups.find((g) => g.items.some((i) => i.href === activeHref));

  const handleTap = (group) => {
    if (group.items.length === 1) {
      navigate(group.items[0].href);
    } else {
      onGroupTap(group.id);
    }
  };

  return (
    <aside
      className="tablet-rail fixed left-0 top-0 z-30 h-screen w-16 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3"
      aria-label="Grupos de navegação"
    >
      {visibleGroups.map((group) => {
        const isActiveGroup = group.id === activeGroup?.id;
        const Icon = group.icon;
        return (
          <button
            key={group.id}
            type="button"
            title={group.label || group.items[0]?.name}
            aria-label={group.label || group.items[0]?.name}
            onClick={() => handleTap(group)}
            className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
              isActiveGroup
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
          >
            {isActiveGroup && (
              <span aria-hidden="true" className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
            )}
            <Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        );
      })}
    </aside>
  );
}
