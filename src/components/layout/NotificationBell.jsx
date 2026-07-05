import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { buildDerivedAlerts } from '@/lib/notifications';
import moment from 'moment';

export default function NotificationBell() {
  const { user } = useAuth();
  const NotificationEntity = useWorkspaceEntity('Notification');
  const AssetEntity = useWorkspaceEntity('Asset');
  const [stored, setStored] = useState([]);
  const [derived, setDerived] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [notifs, assets] = await Promise.all([
      NotificationEntity.list('-created_date', 50),
      AssetEntity.list('-created_date', 1000),
    ]);
    setStored(notifs);
    setDerived(buildDerivedAlerts(assets));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadStored = stored.filter((n) => !n.read);
  const unreadCount = unreadStored.length + derived.length;

  const items = useMemo(() => {
    const s = stored.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type || 'info',
      link: n.link,
      read: n.read,
      when: n.created_date,
      stored: true,
    }));
    const d = derived.map((a) => ({ ...a, stored: false, read: false }));
    return [...d, ...s].slice(0, 30);
  }, [stored, derived]);

  const markAllRead = async () => {
    await Promise.all(unreadStored.map((n) => NotificationEntity.update(n.id, { read: true })));
    setStored((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const typeColor = (t) =>
    t === 'warning' ? 'bg-amber-500' : t === 'success' ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notificações">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-semibold text-sm text-foreground">Notificações</span>
          {unreadStored.length > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary flex items-center gap-1 hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> Marcar lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma notificação.</div>
          ) : items.map((n) => {
            const content = (
              <div className={`flex gap-3 p-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${typeColor(n.type)}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  {n.when && <p className="text-[11px] text-muted-foreground mt-0.5">{moment(n.when).fromNow()}</p>}
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => setOpen(false)} className="block hover:bg-muted/40">{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
        <div className="p-2 border-t border-border">
          <Link to="/Notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full text-sm">Ver todas</Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
