import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  ClipboardCheck, Plus, ArrowLeft, Search, ScanLine, CheckCircle2,
  AlertTriangle, XCircle, Clock, Play, PackagePlus, Ban, Camera, CloudOff, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';
import CameraScanner from '@/components/assets/CameraScanner';
import { enqueueScan, loadQueue, clearQueue } from '@/lib/offlineInventory';

const categories = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];

const STATUS_META = {
  pendente: { label: 'Pendente', icon: Clock, color: 'text-slate-500', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  encontrado: { label: 'Encontrado', icon: CheckCircle2, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  divergente: { label: 'Divergente', icon: AlertTriangle, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  nao_encontrado: { label: 'Não encontrado', icon: XCircle, color: 'text-red-600', badge: 'bg-red-100 text-red-700 border-red-200' },
  novo_sobra: { label: 'Novo / sobra', icon: PackagePlus, color: 'text-violet-600', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
};

export default function Inventory() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_inventory');

  const CountEntity = useWorkspaceEntity('InventoryCount');
  const ItemEntity = useWorkspaceEntity('InventoryItem');
  const AssetEntity = useWorkspaceEntity('Asset');

  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    setLoading(true);
    const data = await CountEntity.list('-started_at', 100);
    setCounts(data);
    setLoading(false);
  };

  if (selected) {
    return (
      <InventoryDetail
        inventoryId={selected}
        canManage={canManage}
        userEmail={user?.email}
        ItemEntity={ItemEntity}
        CountEntity={CountEntity}
        onBack={() => { setSelected(null); loadCounts(); }}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventário Físico</h1>
          <p className="text-muted-foreground mt-1">Concilie o cadastro com o que existe fisicamente</p>
        </div>
        {canManage && (
          <NewInventoryDialog
            AssetEntity={AssetEntity}
            CountEntity={CountEntity}
            ItemEntity={ItemEntity}
            userEmail={user?.email}
            onCreated={(id) => setSelected(id)}
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : counts.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum inventário iniciado</p>
          <p className="text-muted-foreground mt-1">
            {canManage ? 'Inicie um novo inventário para conferir seus ativos.' : 'Aguarde um administrador iniciar um inventário.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {counts.map((c) => (
            <InventoryCard key={c.id} count={c} ItemEntity={ItemEntity} onOpen={() => setSelected(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryCard({ count, ItemEntity, onOpen }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    ItemEntity.filter({ inventory_id: count.id }, '-counted_at', 2000).then((items) => {
      const total = items.length;
      const done = items.filter((i) => i.status !== 'pendente').length;
      setStats({ total, done });
    });
  }, [count.id]);

  const pct = stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const isOpen = count.status === 'em_andamento';

  return (
    <button
      onClick={onOpen}
      className="text-left bg-card rounded-xl border border-border p-5 shadow-sm hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{count.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
              isOpen ? 'bg-blue-100 text-blue-700 border-blue-200' :
              count.status === 'concluido' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
              'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {isOpen ? 'Em andamento' : count.status === 'concluido' ? 'Concluído' : 'Cancelado'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Iniciado {count.started_at ? moment(count.started_at).format('DD/MM/YYYY HH:mm') : '—'}
            {count.started_by ? ` • ${count.started_by}` : ''}
          </p>
        </div>
        <div className="text-right min-w-[120px]">
          <p className="text-sm font-medium text-foreground">{stats ? `${stats.done}/${stats.total}` : '…'}</p>
          <Progress value={pct} className="h-2 w-32 mt-1" />
        </div>
      </div>
    </button>
  );
}

function NewInventoryDialog({ AssetEntity, CountEntity, ItemEntity, userEmail, onCreated }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(`Inventário ${moment().format('DD/MM/YYYY')}`);
  const [category, setCategory] = useState('todos');
  const [costCenter, setCostCenter] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    try {
      // Snapshot dos ativos que casam com o filtro no momento da abertura.
      const query = {};
      if (category !== 'todos') query.category = category;
      let assets = await AssetEntity.filter(query, '-created_date', 5000);
      if (costCenter.trim()) {
        const cc = costCenter.trim().toLowerCase();
        assets = assets.filter((a) => (a.cost_center || '').toLowerCase().includes(cc));
      }
      if (assets.length === 0) {
        toast.error('Nenhum ativo encontrado para esse filtro.');
        setCreating(false);
        return;
      }

      const count = await CountEntity.create({
        name: name.trim() || `Inventário ${moment().format('DD/MM/YYYY')}`,
        status: 'em_andamento',
        scope_category: category === 'todos' ? '' : category,
        scope_cost_center: costCenter.trim(),
        started_by: userEmail || '',
        started_at: new Date().toISOString(),
        total_expected: assets.length,
      });

      // Cria um item por ativo (situação inicial: pendente).
      for (const a of assets) {
        await ItemEntity.create({
          inventory_id: count.id,
          asset_id: a.id,
          asset_name: a.name || '',
          plaqueta: a.plaqueta || '',
          expected_location: a.location || '',
          status: 'pendente',
        });
      }

      toast.success(`Inventário criado com ${assets.length} ativo(s).`);
      setOpen(false);
      onCreated(count.id);
    } catch (e) {
      toast.error(e?.message || 'Não foi possível criar o inventário.');
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Inventário</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Iniciar novo inventário</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Grupo de patrimônio</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Centro de custo (opcional)</Label>
            <Input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="Filtra por parte do nome" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="h-4 w-4" />}
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InventoryDetail({ inventoryId, canManage, userEmail, ItemEntity, CountEntity, onBack }) {
  const NotificationEntity = useWorkspaceEntity('Notification');
  const [count, setCount] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [filter, setFilter] = useState('todos');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    load();
    setPending(loadQueue(inventoryId).length);
  }, [inventoryId]);

  // Sincroniza a fila offline quando a conexão volta.
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); flushQueue(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryId]);

  const load = async () => {
    setLoading(true);
    const [cList, iList] = await Promise.all([
      CountEntity.filter({ id: inventoryId }),
      ItemEntity.filter({ inventory_id: inventoryId }, 'asset_name', 2000),
    ]);
    setCount(cList[0] || null);
    setItems(iList);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const s = { pendente: 0, encontrado: 0, divergente: 0, nao_encontrado: 0, novo_sobra: 0 };
    items.forEach((i) => { s[i.status] = (s[i.status] || 0) + 1; });
    return s;
  }, [items]);

  // Sobras não entram no denominador do progresso: elas não fazem parte do
  // universo pré-cadastrado que o inventário está conciliando.
  const total = items.filter((i) => !i.is_surplus).length;
  const done = total - stats.pendente;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const flushQueue = async () => {
    const queue = loadQueue(inventoryId);
    if (queue.length === 0) return;
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncInventoryScans', { inventory_id: inventoryId, scans: queue });
      if (res?.data?.ok) {
        clearQueue(inventoryId);
        setPending(0);
        toast.success(`${res.data.applied} conferência(s) sincronizada(s).`);
      }
    } catch (_) {
      // Mantém a fila para tentar de novo depois.
    }
    setSyncing(false);
  };

  const markItem = async (item, status, extra = {}) => {
    const countedAt = new Date().toISOString();
    // Atualiza a UI imediatamente (otimista).
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status, counted_at: countedAt, ...extra } : i)));
    const payload = { status, counted_by: userEmail || '', counted_at: countedAt, ...extra };

    if (!navigator.onLine) {
      const n = enqueueScan(inventoryId, { item_id: item.id, ...payload });
      setPending(n);
      return;
    }
    try {
      await ItemEntity.update(item.id, payload);
    } catch (e) {
      // Falhou online (conexão instável): enfileira para reenviar depois.
      const n = enqueueScan(inventoryId, { item_id: item.id, ...payload });
      setPending(n);
    }
  };

  const handleAddSurplus = async ({ plaqueta, description, location }) => {
    try {
      const row = await ItemEntity.create({
        inventory_id: inventoryId,
        asset_id: '',
        asset_name: description,
        plaqueta: '',
        found_plaqueta: plaqueta,
        found_description: description,
        found_location: location,
        expected_location: '',
        status: 'novo_sobra',
        is_surplus: true,
        resolution: 'pendente_resolucao',
        counted_by: userEmail || '',
        counted_at: new Date().toISOString(),
      });
      setItems((prev) => [...prev, row]);
      toast.success('Item registrado como novo/sobra.');
    } catch (e) {
      toast.error(e?.message || 'Não foi possível registrar o item.');
    }
  };

  const ignoreSurplus = async (item) => {
    try {
      await ItemEntity.update(item.id, { resolution: 'ignorado' });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, resolution: 'ignorado' } : i)));
    } catch (e) {
      toast.error(e?.message || 'Não foi possível atualizar o item.');
    }
  };

  const registerSurplusAsAsset = async (item, { name, category, purchase_date }) => {
    try {
      const res = await base44.functions.invoke('createAsset', {
        assets: [{
          name,
          category,
          purchase_date,
          plaqueta: item.found_plaqueta || '',
          location: item.found_location || '',
          photo_url: item.found_photo_url || '',
          acquisition_value: 0,
          depreciation_rate: 0,
        }],
      });
      if (!res?.data?.ok || !res.data.created) {
        throw new Error(res?.data?.error || 'Não foi possível cadastrar o ativo.');
      }
      const newAssetId = res.data.ids?.[0] || '';
      await logAudit({
        action: 'created', entity_type: 'Asset', entity_id: newAssetId,
        entity_label: name, summary: `Cadastrou o ativo "${name}" a partir de sobra de inventário`,
        new_data: { name, category, purchase_date },
      });
      await ItemEntity.update(item.id, { resolution: 'cadastrado', resolved_asset_id: newAssetId, asset_id: newAssetId, asset_name: name });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, resolution: 'cadastrado', resolved_asset_id: newAssetId, asset_id: newAssetId, asset_name: name } : i)));
      toast.success('Ativo cadastrado a partir da sobra.');
    } catch (e) {
      toast.error(e?.message || 'Não foi possível cadastrar o ativo.');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    const code = scanCode.trim().toLowerCase();
    if (!code) return;
    const match = items.find(
      (i) => (i.plaqueta || '').toLowerCase() === code || (i.asset_name || '').toLowerCase() === code
    );
    if (!match) {
      toast.error(`Nenhum item com plaqueta/nome "${scanCode}".`);
    } else {
      await markItem(match, 'encontrado');
      toast.success(`${match.asset_name} conferido.`);
    }
    setScanCode('');
  };

  const closeInventory = async () => {
    try {
      // Itens ainda pendentes (do universo pré-cadastrado) ao fechar viram
      // "não encontrado". Sobras (novo_sobra) NÃO entram nesse auto-flip — ficam
      // como backlog aberto, pendente de resolução mesmo após o encerramento.
      const pendentes = items.filter((i) => i.status === 'pendente');
      for (const i of pendentes) {
        await ItemEntity.update(i.id, { status: 'nao_encontrado', counted_by: userEmail || '', counted_at: new Date().toISOString() });
      }
      await CountEntity.update(inventoryId, { status: 'concluido', closed_at: new Date().toISOString() });

      // Notifica quem iniciou o inventário com o resumo da conciliação.
      const divergentes = items.filter((i) => i.status === 'divergente').length;
      const naoEncontrados = pendentes.length + items.filter((i) => i.status === 'nao_encontrado').length;
      const sobrasPendentes = items.filter((i) => i.is_surplus && (!i.resolution || i.resolution === 'pendente_resolucao')).length;
      await NotificationEntity.create({
        user_email: count?.started_by || userEmail || '',
        title: `Inventário concluído: ${count?.name || ''}`,
        body: `${total} itens conferidos • ${divergentes} divergente(s) • ${naoEncontrados} não encontrado(s)` +
          (sobrasPendentes > 0 ? ` • ${sobrasPendentes} item(ns) novo/sobra pendente(s) de resolução.` : '.'),
        type: (divergentes + naoEncontrados + sobrasPendentes) > 0 ? 'warning' : 'success',
        link: '/Inventory',
        read: false,
      }).catch(() => {});

      toast.success('Inventário concluído.');
      onBack();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível concluir o inventário.');
    }
  };

  const filtered = items.filter((i) => {
    if (filter !== 'todos' && i.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (i.asset_name || '').toLowerCase().includes(q) || (i.plaqueta || '').toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const isOpen = count?.status === 'em_andamento';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{count?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {isOpen ? 'Em andamento' : count?.status === 'concluido' ? 'Concluído' : 'Cancelado'}
            {count?.closed_at ? ` • encerrado ${moment(count.closed_at).format('DD/MM/YYYY HH:mm')}` : ''}
          </p>
        </div>
        {isOpen && canManage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Concluir inventário</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Concluir inventário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os {stats.pendente} item(ns) ainda pendentes serão marcados como “não encontrado”. Esta ação encerra o ciclo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={closeInventory}>Concluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Reconciliação */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Progresso da conciliação</span>
          <span className="text-sm text-muted-foreground">{done}/{total} ({pct}%)</span>
        </div>
        <Progress value={pct} className="h-2.5" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const Icon = meta.icon;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? 'todos' : key)}
                className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${filter === key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}
              >
                <Icon className={`h-5 w-5 ${meta.color}`} />
                <div className="text-left">
                  <p className="text-lg font-bold text-foreground leading-none">{stats[key] || 0}</p>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conferência rápida por plaqueta */}
      {isOpen && canManage && (
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleScan} className="bg-card rounded-xl border border-border p-4 shadow-sm flex gap-2 items-center flex-1">
            <ScanLine className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="Bipe ou digite a plaqueta e tecle Enter para marcar como encontrado"
              className="flex-1"
            />
            <Button type="submit" variant="secondary">Conferir</Button>
          </form>
          <AddSurplusDialog onAdd={handleAddSurplus} />
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou plaqueta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Itens */}
      <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum item para este filtro.</div>
        ) : filtered.map((item) => {
          const meta = STATUS_META[item.status] || STATUS_META.pendente;
          const Icon = meta.icon;
          const isPendingSurplus = item.is_surplus && (!item.resolution || item.resolution === 'pendente_resolucao');
          const displayName = item.is_surplus ? (item.found_description || item.asset_name || '—') : (item.asset_name || '—');
          const displayCode = item.is_surplus ? item.found_plaqueta : item.plaqueta;
          const displayLocation = item.is_surplus ? item.found_location : item.expected_location;
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`h-5 w-5 shrink-0 ${meta.color}`} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {displayCode ? `${displayCode} • ` : ''}{displayLocation || 'sem localização'}
                    {item.is_surplus && item.resolution === 'cadastrado' ? ' • cadastrado como ativo' : ''}
                    {item.is_surplus && item.resolution === 'ignorado' ? ' • ignorado' : ''}
                  </p>
                </div>
              </div>
              {item.is_surplus ? (
                isOpen && canManage && isPendingSurplus ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <RegisterSurplusAssetDialog item={item} onConfirm={(vals) => registerSurplusAsAsset(item, vals)} />
                    <Button size="sm" variant="outline" className="h-8 px-2 gap-1" onClick={() => ignoreSurplus(item)}>
                      <Ban className="h-4 w-4" /> Ignorar
                    </Button>
                  </div>
                ) : (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
                )
              ) : isOpen && canManage ? (
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant={item.status === 'encontrado' ? 'default' : 'outline'} className="h-8 px-2" onClick={() => markItem(item, 'encontrado')}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={item.status === 'divergente' ? 'default' : 'outline'} className="h-8 px-2" onClick={() => markItem(item, 'divergente')}>
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant={item.status === 'nao_encontrado' ? 'default' : 'outline'} className="h-8 px-2" onClick={() => markItem(item, 'nao_encontrado')}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddSurplusDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plaqueta, setPlaqueta] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const handleConfirm = async () => {
    if (!description.trim()) { toast.error('Descrição é obrigatória.'); return; }
    setSaving(true);
    await onAdd({ plaqueta: plaqueta.trim(), description: description.trim(), location: location.trim() });
    setSaving(false);
    setOpen(false);
    setPlaqueta(''); setDescription(''); setLocation('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0">
          <PackagePlus className="h-4 w-4" /> Item não cadastrado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar item encontrado sem cadastro</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição do item</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Cadeira giratória preta" />
          </div>
          <div>
            <Label>Plaqueta física (se houver)</Label>
            <Input value={plaqueta} onChange={(e) => setPlaqueta(e.target.value)} />
          </div>
          <div>
            <Label>Localização encontrada</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RegisterSurplusAssetDialog({ item, onConfirm }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(item.found_description || '');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(moment().format('YYYY-MM-DD'));

  const handleConfirm = async () => {
    if (!name.trim()) { toast.error('Descrição é obrigatória.'); return; }
    if (!category) { toast.error('Selecione o grupo de patrimônio.'); return; }
    setSaving(true);
    await onConfirm({ name: name.trim(), category, purchase_date: purchaseDate });
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="h-8 px-2 gap-1">
          <PackagePlus className="h-4 w-4" /> Cadastrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cadastrar ativo a partir da sobra</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição do bem</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Grupo de patrimônio</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de aquisição (estimada)</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor e taxa de depreciação ficam zerados — complete depois na edição do ativo.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
