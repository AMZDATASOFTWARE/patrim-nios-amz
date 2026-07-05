import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { FileText, Plus, Search, Upload, Pencil, Trash2, ShieldCheck, Umbrella, ScrollText, Home } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/depreciation';
import moment from 'moment';

const TYPE_META = {
  garantia: { label: 'Garantia', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  seguro: { label: 'Seguro', icon: Umbrella, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  contrato: { label: 'Contrato', icon: ScrollText, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  locacao: { label: 'Locação', icon: Home, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const EMPTY = {
  type: 'garantia', title: '', asset_id: '', asset_name: '', provider: '',
  policy_number: '', start_date: '', end_date: '', value: '', document_url: '', notes: '',
};

function expiryStatus(end_date) {
  if (!end_date) return null;
  const days = moment(end_date).startOf('day').diff(moment().startOf('day'), 'days');
  if (days < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-700 border-red-200' };
  if (days <= 30) return { label: `Vence em ${days}d`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Vigente', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

export default function Contracts() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_contracts');
  const ContractEntity = useWorkspaceEntity('Contract');
  const AssetEntity = useWorkspaceEntity('Asset');

  const [contracts, setContracts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, a] = await Promise.all([
      ContractEntity.list('end_date', 500),
      AssetEntity.list('name', 2000),
    ]);
    setContracts(c);
    setAssets(a);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openNew = () => { setEditId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ ...EMPTY, ...c, value: c.value ?? '' });
    setOpen(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((f) => ({ ...f, document_url: file_url }));
    } catch (_) {
      toast.error('Falha ao enviar o documento.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Informe um título.'); return; }
    setSaving(true);
    try {
      const asset = assets.find((a) => a.id === form.asset_id);
      const data = {
        type: form.type,
        title: form.title.trim(),
        asset_id: form.asset_id || '',
        asset_name: asset?.name || '',
        provider: form.provider || '',
        policy_number: form.policy_number || '',
        start_date: form.start_date || '',
        end_date: form.end_date || '',
        value: parseFloat(form.value) || 0,
        document_url: form.document_url || '',
        notes: form.notes || '',
      };
      if (editId) await ContractEntity.update(editId, data);
      else await ContractEntity.create(data);
      toast.success(editId ? 'Contrato atualizado.' : 'Contrato cadastrado.');
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await ContractEntity.del(id);
      setContracts((prev) => prev.filter((c) => c.id !== id));
      toast.success('Contrato removido.');
    } catch (e) {
      toast.error(e?.message || 'Não foi possível remover.');
    }
  };

  const filtered = useMemo(() => contracts.filter((c) => {
    if (typeFilter !== 'todos' && c.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) ||
      (c.provider || '').toLowerCase().includes(q) ||
      (c.asset_name || '').toLowerCase().includes(q) ||
      (c.policy_number || '').toLowerCase().includes(q);
  }), [contracts, search, typeFilter]);

  const expiringCount = contracts.filter((c) => {
    const s = expiryStatus(c.end_date);
    return s && s.label !== 'Vigente';
  }).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contratos & Garantias</h1>
          <p className="text-muted-foreground mt-1">
            Garantias, seguros e contratos dos seus ativos
            {expiringCount > 0 && <span className="text-amber-600 font-medium"> • {expiringCount} vencendo/vencido(s)</span>}
          </p>
        </div>
        {canManage && <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título, fornecedor, ativo ou apólice..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum contrato cadastrado</p>
          <p className="text-muted-foreground mt-1">Cadastre garantias, seguros e contratos para acompanhar vencimentos.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const meta = TYPE_META[c.type] || TYPE_META.contrato;
            const Icon = meta.icon;
            const exp = expiryStatus(c.end_date);
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground truncate">{c.title}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                      {exp && <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${exp.color}`}>{exp.label}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {c.provider ? `${c.provider} • ` : ''}
                      {c.asset_name ? `${c.asset_name} • ` : ''}
                      {c.end_date ? `até ${moment(c.end_date).format('DD/MM/YYYY')}` : 'sem vigência'}
                      {c.value ? ` • ${formatCurrency(c.value)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {c.document_url && (
                    <a href={c.document_url} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir documento"><FileText className="h-4 w-4" /></Button>
                    </a>
                  )}
                  {canManage && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover contrato?</AlertDialogTitle>
                            <AlertDialogDescription>“{c.title}” será removido permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(c.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar contrato' : 'Novo contrato / garantia'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Garantia estendida notebook Dell" />
            </div>
            <div>
              <Label>Ativo vinculado (opcional)</Label>
              <Select value={form.asset_id || 'nenhum'} onValueChange={(v) => setForm({ ...form, asset_id: v === 'nenhum' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}{a.plaqueta ? ` (${a.plaqueta})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor / Seguradora</Label>
                <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
              </div>
              <div>
                <Label>Nº Apólice / Contrato</Label>
                <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início da vigência</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Fim da vigência</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Documento</Label>
              {form.document_url ? (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1 truncate">Documento anexado</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, document_url: '' })}>Remover</Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/40 text-sm text-muted-foreground">
                  {uploading ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Enviando...' : 'Anexar arquivo (PDF/imagem)'}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
                </label>
              )}
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
