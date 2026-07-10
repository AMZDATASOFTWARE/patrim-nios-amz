import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe';

/**
 * Wraps the routed content. Only arms the swipe gesture when the current route is
 * EXACTLY one of the bottom tab's hrefs — never on detail/form pages or anything
 * reached via "Mais" (design doc §1), so canvases (signature), the camera scanner,
 * and in-progress forms are never at risk of an accidental navigation swipe.
 * `className="contents"` keeps this a pure event boundary with no layout effect.
 */
export default function SwipeableTabArea({ children }) {
  const { pathname } = useLocation();
  const { tabs, goToRelative } = useMobileNav();
  const isSwipeablePage = tabs.some((tab) => tab.href === pathname);

  const runTransition = useCallback((delta) => {
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => goToRelative(delta));
    } else {
      goToRelative(delta);
    }
  }, [goToRelative]);

  const onSwipeLeft = useCallback(() => runTransition(1), [runTransition]); // next tab
  const onSwipeRight = useCallback(() => runTransition(-1), [runTransition]); // previous tab

  const ref = useHorizontalSwipe({
    enabled: isSwipeablePage,
    onSwipeLeft,
    onSwipeRight,
  });

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
}
