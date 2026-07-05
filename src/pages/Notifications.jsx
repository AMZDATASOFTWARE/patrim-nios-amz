import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { buildDerivedAlerts } from '@/lib/notifications';
import moment from 'moment';

export default function Notifications() {
  const NotificationEntity = useWorkspaceEntity('Notification');
  const AssetEntity = useWorkspaceEntity('Asset');
  const [stored, setStored] = useState([]);
  const [derived, setDerived] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [notifs, assets] = await Promise.all([
      NotificationEntity.list('-created_date', 200),
      AssetEntity.list('-created_date', 2000),
    ]);
    setStored(notifs);
    setDerived(buildDerivedAlerts(assets));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const unread = stored.filter((n) => !n.read);

  const markRead = async (n) => {
    await NotificationEntity.update(n.id, { read: true });
    setStored((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  };
  const markAll = async () => {
    await Promise.all(unread.map((n) => NotificationEntity.update(n.id, { read: true })));
    setStored((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const items = useMemo(() => {
    const d = derived.map((a) => ({ ...a, stored: false, read: false }));
    const s = stored.map((n) => ({
      id: n.id, title: n.title, body: n.body, type: n.type || 'info',
      link: n.link, read: n.read, when: n.created_date, stored: true, raw: n,
    }));
    return [...d, ...s];
  }, [stored, derived]);

  const dot = (t) => (t === 'warning' ? 'bg-amber-500' : t === 'success' ? 'bg-emerald-500' : 'bg-blue-500');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-1">Alertas de garantia, revisões e avisos do sistema</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" onClick={markAll} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Tudo em dia</p>
          <p className="text-muted-foreground mt-1">Você não tem notificações no momento.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-primary/5' : ''}`}>
              <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${dot(n.type)}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                {n.when && <p className="text-xs text-muted-foreground mt-1">{moment(n.when).format('DD/MM/YYYY HH:mm')}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.link && (
                  <Link to={n.link}><Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-4 w-4" /></Button></Link>
                )}
                {n.stored && !n.read && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => markRead(n.raw)}>Marcar lida</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
