import { useEffect, useRef } from 'react';

const EDGE_EXCLUSION_PX = 24; // defer to the OS edge-back gesture near the screen edges
const DISTANCE_THRESHOLD_RATIO = 0.25; // 25% of viewport width
const VELOCITY_THRESHOLD_PX_MS = 0.5; // "flick" — mirrors MoreSheet's own drag-to-dismiss feel
const AXIS_LOCK_PX = 10; // movement needed before committing to horizontal vs. vertical
const MOBILE_MEDIA_QUERY = '(max-width: 767.98px)';

// Walks up from the touched element looking for a horizontally-scrollable ancestor
// (an overflow-x-auto table, a carousel, ...) that still has room to move in the
// direction of travel — if found, the gesture belongs to it, not to page navigation.
function hasScrollableAncestorInDirection(target, root, dx) {
  let node = target;
  while (node && node !== root && node !== document.body) {
    if (node.hasAttribute?.('data-swipe-disable')) return true; // explicit opt-out
    if (node.nodeType === 1) {
      const style = window.getComputedStyle(node);
      const scrollable = /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
      if (scrollable) {
        const atLeftEdge = node.scrollLeft <= 0;
        const atRightEdge = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
        if (dx < 0 && !atRightEdge) return true; // dragging left, scroller can still reveal more to the right
        if (dx > 0 && !atLeftEdge) return true; // dragging right, scroller can still reveal more to the left
      }
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * Passive, no-preventDefault horizontal swipe detector. Never manipulates the DOM
 * mid-gesture (design doc §2 — "direto e leve") — only measures, then fires
 * onSwipeLeft/onSwipeRight once a completed gesture clears the distance/velocity
 * threshold. Bails out automatically: near screen edges (OS back gesture), on
 * vertical drags (page scroll), over nested horizontal scrollers, inside
 * `data-swipe-disable` regions, and above the mobile breakpoint.
 */
export function useHorizontalSwipe({ enabled, onSwipeLeft, onSwipeRight }) {
  const ref = useRef(null);
  const gestureRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return; // checked once per gesture, not on resize
      const touch = e.touches[0];
      const vw = window.innerWidth;
      if (touch.clientX < EDGE_EXCLUSION_PX || touch.clientX > vw - EDGE_EXCLUSION_PX) {
        return; // too close to the edge — let the OS back gesture win
      }
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: e.timeStamp,
        target: e.target,
        axis: null, // 'x' | 'y' | null (undecided)
      };
    };

    const onTouchMove = (e) => {
      const g = gestureRef.current;
      if (!g || g.axis === 'y' || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - g.startX;
      const dy = touch.clientY - g.startY;

      if (g.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return; // not enough movement yet
        if (Math.abs(dy) >= Math.abs(dx)) {
          g.axis = 'y'; // vertical scroll — stop tracking, never fires
          return;
        }
        if (hasScrollableAncestorInDirection(g.target, el, dx)) {
          gestureRef.current = null; // hand off to the nested scroller
          return;
        }
        g.axis = 'x';
      }
    };

    const onTouchEnd = (e) => {
      const g = gestureRef.current;
      gestureRef.current = null;
      if (!g || g.axis !== 'x') return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - g.startX;
      const dt = Math.max(1, e.timeStamp - g.startTime);
      const velocity = Math.abs(dx) / dt;
      const distanceOk = Math.abs(dx) >= window.innerWidth * DISTANCE_THRESHOLD_RATIO;
      const velocityOk = velocity >= VELOCITY_THRESHOLD_PX_MS;
      if (!distanceOk && !velocityOk) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    };

    const onTouchCancel = () => { gestureRef.current = null; };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [enabled, onSwipeLeft, onSwipeRight]);

  return ref;
}
