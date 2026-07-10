import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import {
  ROUTE_ALIASES,
  buildNavContext,
  getMobileTabs,
  getVisibleGroups,
} from '@/lib/navigationConfig';
import { usePendingTransfersCount } from '@/hooks/usePendingTransfersCount';

// Sentinel landing spot at the end of the swipeable sequence when there's overflow —
// reaching it opens the "Mais" sheet instead of navigating (spatially consistent
// with tapping "Mais", which sits right after the last real tab in the bar).
const MORE_TAB = { id: '__more__', href: null };

const MobileNavContext = createContext(null);

/**
 * Single source of truth for the mobile bottom-nav (tabs, "Mais" sheet state,
 * badges) shared by MobileTabBar (taps) and SwipeableTabArea (swipe gesture) so
 * neither can drift out of sync with the other — see design doc §4.
 */
export function MobileNavProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const pendingTransfers = usePendingTransfersCount();
  const [moreOpen, setMoreOpen] = useState(false);

  const ctx = useMemo(
    () => buildNavContext(user, workspace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.role, user?.is_platform_admin, user?.email, workspace?.owner_email]
  );
  const { tabs, hasMore } = useMemo(() => getMobileTabs(ctx), [ctx]);
  const visibleGroups = useMemo(() => getVisibleGroups(ctx), [ctx]);
  const aiItem = useMemo(
    () => visibleGroups.flatMap((g) => g.items).find((i) => i.id === 'assistant'),
    [visibleGroups]
  );

  const activeHref = ROUTE_ALIASES[location.pathname] || location.pathname;
  const isActive = useCallback((href) => href === activeHref, [activeHref]);
  const badgeFor = useCallback(
    (item) => (item.badge === 'pendingTransfers' ? pendingTransfers : 0),
    [pendingTransfers]
  );

  const sequence = useMemo(
    () => (hasMore ? [...tabs, MORE_TAB] : tabs),
    [tabs, hasMore]
  );
  const currentTabIndex = tabs.findIndex((tab) => isActive(tab.href));

  const goToRelative = useCallback((delta) => {
    if (currentTabIndex === -1) return; // not on an exact tab route — nothing to do
    const target = sequence[currentTabIndex + delta];
    if (!target) return; // clamped at the ends
    if (target.id === MORE_TAB.id) {
      setMoreOpen(true);
    } else {
      navigate(target.href);
    }
  }, [currentTabIndex, sequence, navigate]);

  const value = useMemo(() => ({
    tabs,
    hasMore,
    sequence,
    visibleGroups,
    aiItem,
    isActive,
    badgeFor,
    pendingTransfers,
    moreOpen,
    setMoreOpen,
    currentTabIndex,
    goToRelative,
  }), [tabs, hasMore, sequence, visibleGroups, aiItem, isActive, badgeFor, pendingTransfers, moreOpen, currentTabIndex, goToRelative]);

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav must be used within a MobileNavProvider');
  return ctx;
}
