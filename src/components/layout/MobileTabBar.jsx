import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useMobileNav } from '@/contexts/MobileNavContext';
import MoreSheet from './MoreSheet';

const KEYBOARD_THRESHOLD_PX = 150;

// Hides the tab bar while the on-screen keyboard is open (visualViewport shrinks by
// more than a real keyboard's height) — a fixed bottom bar would otherwise float
// above the keyboard and eat form space / enable stray taps (spec §5.1/1.6).
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const onResize = () => {
      setOpen(window.innerHeight - vv.height > KEYBOARD_THRESHOLD_PX);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);
  return open;
}

export default function MobileTabBar() {
  // Tabs, active-route matching, badges, and the "Mais" open state all come from
  // MobileNavContext — the swipe gesture (SwipeableTabArea) shares the exact same
  // state, so tapping and swiping can never fall out of sync (design doc §4).
  const { tabs, hasMore, visibleGroups, aiItem, isActive, badgeFor, moreOpen, setMoreOpen } = useMobileNav();
  const keyboardOpen = useKeyboardOpen();

  const tabIsActive = tabs.some((tab) => isActive(tab.href));
  const moreIsActive = hasMore && !tabIsActive;

  if (tabs.length === 0) return null;

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar transition-transform duration-200 ${
          keyboardOpen ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          height: 'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const badgeCount = badgeFor(tab);
          return (
            <Link
              key={tab.id}
              to={tab.href}
              aria-current={active ? 'page' : undefined}
              aria-label={badgeCount ? `${tab.name}, ${badgeCount} pendentes de aceite` : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 ${
                tabs.length <= 3 ? 'max-w-[168px] mx-auto' : ''
              } ${active ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/60'}`}
              style={{ touchAction: 'manipulation', userSelect: 'none' }}
            >
              <tab.icon
                aria-hidden="true"
                className="h-6 w-6"
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="text-[10px] leading-tight truncate max-w-full">
                {tab.tabLabel || tab.name}
              </span>
              {badgeCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-sidebar"
                  style={{ left: 'calc(50% + 8px)' }}
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          );
        })}

        {hasMore && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${
              moreIsActive || moreOpen ? 'text-sidebar-primary font-semibold' : 'text-sidebar-foreground/60'
            }`}
            style={{ touchAction: 'manipulation', userSelect: 'none' }}
          >
            <MoreHorizontal aria-hidden="true" className="h-6 w-6" strokeWidth={moreIsActive || moreOpen ? 2.5 : 2} />
            <span className="text-[10px] leading-tight">Mais</span>
          </button>
        )}
      </nav>

      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        groups={visibleGroups.map((g) => ({
          ...g,
          items: g.items.filter((item) => !tabs.some((t) => t.id === item.id) && item.id !== 'assistant'),
        })).filter((g) => g.items.length > 0)}
        isActive={isActive}
        badgeFor={badgeFor}
        aiItem={aiItem}
      />
    </>
  );
}
