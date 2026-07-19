import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Wrench, Plus, CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/depreciation';
import moment from 'moment';

const TYPES = ['Preventiva', 'Corretiva', 'Melhoria'];

export default function Maintenance() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_maintenance');
  const MaintenanceEntity = useWorkspaceEntity('MaintenanceRecord');
  const AssetEntity = useWorkspaceEntity('Asset');
  const SectorEntity = useWorkspaceEntity('Sector');

  const [records, setRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ asset_id: '', scheduled_date: '', type: 'Preventiva', description: '', sector_id: '' });

  const load = async () => {
    setLoading(true);
    const [recs, a, s] = await Promise.all([
      MaintenanceEntity.listAll('-scheduled_date'),
      AssetEntity.listAll('name'),
      SectorEntity.listAll('name'),
    ]);
    setRecords(recs);
    setAssets(a);
    setSectors(s.filter((row) => row.status !== 'inativo'));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const today = moment().startOf('day');

  // Ordens agendadas (status=agendada) + revisões previstas nos ativos (next_review_date).
  const scheduled = useMemo(() => {
    const fromRecords = records
      .filter((r) => r.status === 'agendada' && r.scheduled_date)
      .map((r) => ({
        id: r.id, source: 'record', asset_id: r.asset_id, asset_name: r.asset_name,
        date: r.scheduled_date, type: r.type || 'Preventiva', description: r.description || '', raw: r,
      }));
    const fromAssets = assets
      .filter((a) => a.next_review_date && a.status !== 'Alienado' && a.status !== 'Inativo')
      .map((a) => ({
        id: `asset-${a.id}`, source: 'asset', asset_id: a.id, asset_name: a.name,
        date: a.next_review_date, type: 'Revisão programada', description: 'Data de próxima revisão do ativo', raw: a,
      }));
    return [...fromRecords, ...fromAssets].sort((x, y) => moment(x.date).diff(moment(y.date)));
  }, [records, assets]);

  const overdue = scheduled.filter((s) => moment(s.date).isBefore(today));
  const next30 = scheduled.filter((s) => {
    const d = moment(s.date).startOf('day');
    return !d.isBefore(today) && d.diff(today, 'days') <= 30;
  });
  const later = scheduled.filter((s) => moment(s.date).startOf('day').diff(today, 'days') > 30);

  const history = useMemo(
    () => records.filter((r) => r.status !== 'agendada').sort((x, y) => moment(y.date).diff(moment(x.date))).slice(0, 50),
    [records]
  );

  const totalCost = history.reduce((s, r) => s + (r.cost || 0), 0);

  const handleSchedule = async () => {
    if (!form.asset_id || !form.scheduled_date) { toast.error('Selecione o ativo e a data.'); return; }
    setSaving(true);
    try {
      const asset = assets.find((a) => a.id === form.asset_id);
      await MaintenanceEntity.create({
        asset_id: form.asset_id,
        asset_name: asset?.name || '',
        scheduled_date: form.scheduled_date,
        type: form.type,
        description: form.description,
        sector_id: form.sector_id,
        status: 'agendada',
        cost: 0,
      });
      toast.success('Manutenção agendada.');
      setOpen(false);
      setForm({ asset_id: '', scheduled_date: '', type: 'Preventiva', description: '', sector_id: '' });
      await load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível agendar.');
    }
    setSaving(false);
  };

  const markDone = async (item) => {
    try {
      await MaintenanceEntity.update(item.id, { status: 'concluida', date: moment().format('YYYY-MM-DD') });
      toast.success('Manutenção concluída.');
      await load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível concluir.');
    }
  };

  const Group = ({ title, icon: Icon, tone, items, showDone }) => {
    if (items.length === 0) return null;
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-border">
          <Icon className={`h-5 w-5 ${tone}`} />
          <h2 className="text-sm sm:text-base font-semibold text-foreground">{title}</h2>
          <span className="text-sm text-muted-foreground">({items.length})</span>
        </div>
        <div className="divide-y divide-border">
          {items.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0">
                <Link to={`/AssetDetail?id=${s.asset_id}`} className="font-medium text-foreground hover:underline truncate block">
                  {s.asset_name || '—'}
                </Link>
                <p className="text-xs text-muted-foreground truncate">
                  {moment(s.date).format('DD/MM/YYYY')} • {s.type}{s.description ? ` • ${s.description}` : ''}
                </p>
              </div>
              {showDone && canManage && s.source === 'record' && (
                <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => markDone(s)}>
                  <CheckCircle2 className="h-4 w-4" /> Concluir
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manutenções</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ordens agendadas, revisões previstas e histórico</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Agendar manutenção</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agendar manutenção</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Ativo *</Label>
                  <Select value={form.asset_id} onValueChange={(v) => setForm({ ...form, asset_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar ativo" /></SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}{a.plaqueta ? ` (${a.plaqueta})` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data *</Label>
                    <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Setor</Label>
                  <Select value={form.sector_id || 'none'} onValueChange={(v) => setForm({ ...form, sector_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhum setor cadastrado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem setor</SelectItem>
                      {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSchedule} disabled={saving}>{saving ? 'Salvando...' : 'Agendar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <>
          <Group title="Atrasadas" icon={AlertTriangle} tone="text-red-600" items={overdue} showDone />
          <Group title="Próximos 30 dias" icon={CalendarClock} tone="text-amber-600" items={next30} showDone />
          <Group title="Agendadas (futuras)" icon={CalendarClock} tone="text-blue-600" items={later} showDone />

          {scheduled.length === 0 && (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <CalendarClock className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-lg font-medium text-foreground">Nada agendado</p>
              <p className="text-muted-foreground mt-1">Agende manutenções ou defina a próxima revisão nos ativos.</p>
            </div>
          )}

          {/* Histórico */}
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-sm sm:text-base font-semibold text-foreground">Histórico</h2>
              </div>
              <span className="text-sm text-muted-foreground">Total: {formatCurrency(totalCost)}</span>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhuma manutenção registrada.</div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3 sm:p-4">
                    <div className="min-w-0">
                      <Link to={`/AssetDetail?id=${r.asset_id}`} className="font-medium text-foreground hover:underline truncate block">
                        {r.asset_name || '—'}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.date ? moment(r.date).format('DD/MM/YYYY') : '—'} • {r.type || 'Corretiva'}{r.description ? ` • ${r.description}` : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">{formatCurrency(r.cost || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
