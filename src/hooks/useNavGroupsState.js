import { useCallback, useState } from 'react';
import { NAV_GROUPS } from '@/lib/navigationConfig';

// Versioned key — bump to v2 if group ids ever change shape.
const STORAGE_KEY = 'nav_groups_v1';
// First visit: Patrimônio open (headerless groups are always open and never stored).
const DEFAULT_OPEN = { patrimonio: true };
const VALID_IDS = new Set(NAV_GROUPS.filter((g) => g.collapsible).map((g) => g.id));

function readStored() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    // Unknown key = stale/corrupted config → silent reset to default.
    for (const key of Object.keys(parsed)) {
      if (!VALID_IDS.has(key)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(next) {
  // Safari private mode throws on setItem — the sidebar works fine without persistence.
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

/**
 * Open/closed state of collapsible sidebar groups.
 * User toggles persist; system auto-opens (deep link into a closed group) do not,
 * so the user's saved preference is never overwritten by navigation.
 */
export function useNavGroupsState() {
  const [openMap, setOpenMap] = useState(() => readStored() ?? DEFAULT_OPEN);

  const isOpen = useCallback(
    (group) => !group.collapsible || !!openMap[group.id],
    [openMap]
  );

  const toggle = useCallback((groupId) => {
    setOpenMap((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      persist(next);
      return next;
    });
  }, []);

  const openGroup = useCallback((groupId) => {
    setOpenMap((prev) => (prev[groupId] ? prev : { ...prev, [groupId]: true }));
  }, []);

  return { isOpen, toggle, openGroup };
}
