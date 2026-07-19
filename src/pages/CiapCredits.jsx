import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Landmark, Plus, Download, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/depreciation';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_META = {
  em_apropriacao: { label: 'Em apropriação', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  concluido: { label: 'Concluído', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  suspenso: { label: 'Suspenso', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const EMPTY = {
  asset_id: '', asset_name: '', nf_entry_date: '', icms_value: '', installments_total: '48',
  pis_cofins_base: '', pis_rate: '1.65', cofins_rate: '7.6', regime: 'nao_cumulativo', status: 'em_apropriacao', notes: '',
};

export default function CiapCredits() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_fiscal_credits');
  const CiapEntity = useWorkspaceEntity('CiapCredit');
  const AssetEntity = useWorkspaceEntity('Asset');

  const [credits, setCredits] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [c, a] = await Promise.all([
      CiapEntity.listAll('-created_date'),
      AssetEntity.listAll('-created_date'),
    ]);
    setCredits(c);
    setAssets(a);
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (c) => {
    setForm({
      asset_id: c.asset_id || '', asset_name: c.asset_name || '',
      nf_entry_date: c.nf_entry_date || '', icms_value: c.icms_value ?? '',
      installments_total: String(c.installments_total ?? 48), pis_cofins_base: c.pis_cofins_base ?? '',
      pis_rate: String(c.pis_rate ?? 1.65), cofins_rate: String(c.cofins_rate ?? 7.6),
      regime: c.regime || 'nao_cumulativo', status: c.status || 'em_apropriacao', notes: c.notes || '',
    });
    setEditId(c.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.asset_id) { toast.error('Selecione o ativo.'); return; }
    const icms = parseFloat(form.icms_value) || 0;
    const total = parseFloat(form.installments_total) || 48;
    if (icms <= 0) { toast.error('Informe o valor do ICMS.'); return; }
    setSaving(true);
    const data = {
      asset_id: form.asset_id,
      asset_name: form.asset_name,
      nf_entry_date: form.nf_entry_date || undefined,
      icms_value: icms,
      installments_total: total,
      monthly_credit_value: icms / total,
      pis_cofins_base: parseFloat(form.pis_cofins_base) || 0,
      pis_rate: parseFloat(form.pis_rate) || 0,
      cofins_rate: parseFloat(form.cofins_rate) || 0,
      regime: form.regime,
      status: form.status,
      notes: form.notes,
    };
    try {
      if (editId) await CiapEntity.update(editId, data);
      else await CiapEntity.create({ ...data, installments_appropriated: 0 });
      toast.success('Crédito CIAP salvo.');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar. Requer papel de administrador.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try { await CiapEntity.del(id); load(); }
    catch (e) { toast.error(e?.message || 'Não foi possível excluir.'); }
  };

  const exportCSV = () => {
    const header = ['Ativo', 'NF entrada', 'ICMS (R$)', 'Parcelas', 'Apropriadas', 'Credito mensal', 'Base PIS/COFINS', 'PIS %', 'COFINS %', 'Regime', 'Situacao'];
    const lines = credits.map((c) => [
      `"${c.asset_name || ''}"`, c.nf_entry_date || '', (c.icms_value || 0).toFixed(2),
      c.installments_total || 48, c.installments_appropriated || 0, (c.monthly_credit_value || 0).toFixed(2),
      (c.pis_cofins_base || 0).toFixed(2), c.pis_rate || 0, c.cofins_rate || 0, c.regime || '', c.status || '',
    ].join(';'));
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ciap_${moment().format('YYYYMMDD')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalIcms = credits.reduce((s, c) => s + (c.icms_value || 0), 0);
  const totalMonthly = credits.filter((c) => c.status === 'em_apropriacao').reduce((s, c) => s + (c.monthly_credit_value || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Créditos Fiscais (CIAP)</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Crédito de ICMS do ativo imobilizado (Bloco G) e créditos PIS/COFINS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={credits.length === 0}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          {canManage && <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Novo crédito</Button>}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        ⚠️ Os valores default (1/48, alíquotas PIS/COFINS) são uma simplificação. A regra real do CIAP proporciona o crédito pelas saídas tributadas do mês — <strong>revise com seu contador antes de usar para apuração fiscal.</strong> A apropriação mensal roda automaticamente por uma automação agendada.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-3 sm:p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Créditos cadastrados</p>
          <p className="text-2xl font-bold mt-1">{credits.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 sm:p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">ICMS total do imobilizado</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalIcms)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 sm:p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Crédito mensal (em apropriação)</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalMonthly)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : credits.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Landmark className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum crédito CIAP cadastrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {credits.map((c) => {
            const meta = STATUS_META[c.status] || STATUS_META.em_apropriacao;
            const total = c.installments_total || 48;
            const done = c.installments_appropriated || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-card-foreground truncate">{c.asset_name || '—'}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ICMS {formatCurrency(c.icms_value)} • {formatCurrency(c.monthly_credit_value)}/mês • {done}/{total} parcelas
                  </p>
                  <Progress value={pct} className="h-1.5 mt-1 max-w-xs" />
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} crédito CIAP</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ativo *</Label>
              <Select value={form.asset_id} onValueChange={(v) => setForm({ ...form, asset_id: v, asset_name: assets.find((a) => a.id === v)?.name || '' })}>
                <SelectTrigger><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data de entrada da NF</Label><Input type="date" value={form.nf_entry_date} onChange={(e) => setForm({ ...form, nf_entry_date: e.target.value })} /></div>
              <div><Label>Valor do ICMS (R$) *</Label><Input type="number" step="0.01" value={form.icms_value} onChange={(e) => setForm({ ...form, icms_value: e.target.value })} /></div>
              <div><Label>Parcelas (padrão 48)</Label><Input type="number" value={form.installments_total} onChange={(e) => setForm({ ...form, installments_total: e.target.value })} /></div>
              <div>
                <Label>Regime</Label>
                <Select value={form.regime} onValueChange={(v) => setForm({ ...form, regime: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_cumulativo">Não cumulativo</SelectItem>
                    <SelectItem value="cumulativo">Cumulativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Base PIS/COFINS (R$)</Label><Input type="number" step="0.01" value={form.pis_cofins_base} onChange={(e) => setForm({ ...form, pis_cofins_base: e.target.value })} /></div>
              <div><Label>Situação</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_apropriacao">Em apropriação</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Alíquota PIS (%)</Label><Input type="number" step="0.01" value={form.pis_rate} onChange={(e) => setForm({ ...form, pis_rate: e.target.value })} /></div>
              <div><Label>Alíquota COFINS (%)</Label><Input type="number" step="0.01" value={form.cofins_rate} onChange={(e) => setForm({ ...form, cofins_rate: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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
