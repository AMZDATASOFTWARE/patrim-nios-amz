import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer as DrawerPrimitive } from 'vaul';
import { LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * Bottom sheet listing every visible nav item not promoted to a tab.
 * History-backed so the Android back gesture closes it instead of leaving the app
 * (see spec §5.4): opening pushes a dummy history entry; any dismiss path — drag,
 * scrim tap, or back button — goes through history.back(), never setOpen(false)
 * directly, so the dummy entry is always consumed and never left orphaned.
 */
export default function MoreSheet({ open, onOpenChange, groups, isActive, badgeFor, aiItem }) {
  const navigate = useNavigate();
  const pushedRef = useRef(false);

  useEffect(() => {
    if (open && !pushedRef.current) {
      window.history.pushState({ moreSheet: true }, '');
      pushedRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onOpenChange(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [onOpenChange]);

  useEffect(() => () => {
    // Guard: if the sheet unmounts while its dummy entry is still current, clean it up.
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }, []);

  const dismiss = () => {
    if (pushedRef.current) {
      window.history.back(); // triggers popstate → onOpenChange(false)
    } else {
      onOpenChange(false);
    }
  };

  const handleNavigate = (href) => {
    // back() first (consumes the dummy entry) then navigate — never the reverse,
    // or the back() would undo the navigation instead of the sheet.
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
    navigate(href);
  };

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={(next) => { if (!next) dismiss(); }}
      snapPoints={[0.6, 0.92]}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-sidebar-border bg-sidebar outline-none"
          aria-label="Mais opções de navegação"
        >
          <DrawerPrimitive.Title className="sr-only">Mais opções de navegação</DrawerPrimitive.Title>
          <div className="flex justify-center pt-3 pb-2">
            <div aria-hidden="true" className="h-1 w-9 rounded-full bg-sidebar-foreground/30" />
          </div>

          <div
            className="flex-1 overflow-y-auto px-2 pb-2"
            style={{ overscrollBehavior: 'contain' }}
          >
            {aiItem && (
              <button
                type="button"
                onClick={() => handleNavigate(aiItem.href)}
                className="mb-2 flex w-full items-center gap-3 rounded-lg bg-sidebar-accent px-4 py-3 text-sm font-medium text-sidebar-foreground"
              >
                <aiItem.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span>{aiItem.name}</span>
              </button>
            )}

            {groups.map((group) => (
              <div key={group.id} className="mt-3 first:mt-0">
                {group.label && (
                  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {group.label}
                  </p>
                )}
                <ul>
                  {group.items.map((item) => {
                    const badgeCount = badgeFor(item);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleNavigate(item.href)}
                          aria-current={isActive(item.href) ? 'page' : undefined}
                          className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors duration-150 ${
                            isActive(item.href)
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/70 active:bg-sidebar-accent'
                          }`}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          {item.sublabel ? (
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate leading-5">{item.name}</span>
                              <span className="truncate text-xs font-normal text-sidebar-foreground/50">{item.sublabel}</span>
                            </span>
                          ) : (
                            <span className="truncate">{item.name}</span>
                          )}
                          {badgeCount > 0 && (
                            <span
                              aria-hidden="true"
                              className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
                            >
                              {badgeCount > 9 ? '9+' : badgeCount}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="flex-shrink-0 border-t border-sidebar-border p-2"
            style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={() => base44.auth.logout()}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-destructive"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
