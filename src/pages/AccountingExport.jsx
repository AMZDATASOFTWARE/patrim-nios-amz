import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { FileDown, Plus, Trash2, Landmark } from 'lucide-react';
import { getAssetDepreciation, formatCurrency } from '@/lib/depreciation';
import { toast } from 'sonner';
import moment from 'moment';

const MATCH_LABELS = { categoria: 'Categoria', centro_custo: 'Centro de custo (legado)', setor: 'Setor', todos: 'Todos os ativos' };
const EMPTY = { match_type: 'categoria', match_value: '', debit_account: '', credit_account: '', cost_center_code: '', history_template: 'Depreciacao mensal', notes: '' };

export default function AccountingExport() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_accounting_export');
  const RuleEntity = useWorkspaceEntity('AccountMappingRule');
  const AssetEntity = useWorkspaceEntity('Asset');
  const SectorEntity = useWorkspaceEntity('Sector');

  const [rules, setRules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [competence, setCompetence] = useState(moment().format('YYYY-MM'));
  const [basis, setBasis] = useState('societaria');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [r, a, s] = await Promise.all([RuleEntity.listAll('-created_date'), AssetEntity.listAll('-created_date'), SectorEntity.listAll('name')]);
    setRules(r);
    setAssets(a);
    setSectors(s);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.debit_account.trim() || !form.credit_account.trim()) { toast.error('Informe as contas de débito e crédito.'); return; }
    setSaving(true);
    try {
      await RuleEntity.create(form);
      toast.success('Regra salva.');
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar a regra.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try { await RuleEntity.del(id); load(); } catch (e) { toast.error(e?.message || 'Falha ao excluir.'); }
  };

  // Resolve a conta para um ativo: primeiro regra por categoria, depois por centro de custo, depois "todos".
  const ruleFor = (asset) => {
    return rules.find((r) => r.match_type === 'categoria' && r.match_value === asset.category)
      || rules.find((r) => r.match_type === 'setor' && r.match_value === (asset.sector_id || ''))
      || rules.find((r) => r.match_type === 'centro_custo' && r.match_value === (asset.cost_center || ''))
      || rules.find((r) => r.match_type === 'todos')
      || null;
  };

  const sectorLabelFor = (id) => sectors.find((s) => s.id === id)?.name || 'Setor removido';

  const generate = () => {
    if (rules.length === 0) { toast.error('Configure ao menos uma regra de mapeamento antes de exportar.'); return; }
    const dateStr = moment(competence, 'YYYY-MM').endOf('month').format('DD/MM/YYYY');
    const header = ['Data', 'Conta Debito', 'Conta Credito', 'Centro de Custo', 'Valor', 'Historico', 'Ativo'];
    const lines = [];
    let unmapped = 0;
    assets.forEach((a) => {
      const dep = getAssetDepreciation(a, basis);
      if (dep.cip || dep.monthly <= 0) return;
      const rule = ruleFor(a);
      if (!rule) { unmapped++; return; }
      lines.push([
        dateStr,
        rule.debit_account,
        rule.credit_account,
        rule.cost_center_code || '',
        dep.monthly.toFixed(2),
        `"${(rule.history_template || 'Depreciacao mensal')} - ${a.name} (${competence})"`,
        `"${a.name}"`,
      ].join(';'));
    });
    if (lines.length === 0) { toast.error('Nenhum lançamento gerado para esta competência.'); return; }
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = `lancamentos_depreciacao_${competence}_${basis}.csv`; el.click();
    URL.revokeObjectURL(url);
    toast.success(`${lines.length} lançamento(s) exportado(s).${unmapped > 0 ? ` ${unmapped} ativo(s) sem regra foram ignorados.` : ''}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Exportação Contábil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gere os lançamentos de depreciação em CSV para importar em qualquer ERP contábil</p>
      </div>

      {/* Gerar export */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Gerar lançamentos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Competência</Label>
            <Input type="month" value={competence} onChange={(e) => setCompetence(e.target.value)} />
          </div>
          <div>
            <Label>Livro</Label>
            <Select value={basis} onValueChange={setBasis}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="societaria">Societária</SelectItem>
                <SelectItem value="fiscal">Fiscal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} className="gap-2"><FileDown className="h-4 w-4" /> Exportar CSV</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Um lançamento por ativo depreciável (Débito = despesa de depreciação, Crédito = depreciação acumulada), pela regra de conta correspondente. Ativos em obra ou sem depreciação no mês são ignorados.
        </p>
      </div>

      {/* Regras de mapeamento */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-card-foreground">Regras de mapeamento de conta</h2>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nova regra</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova regra de conta</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Aplica-se a</Label>
                    <Select value={form.match_type} onValueChange={(v) => setForm({ ...form, match_type: v, match_value: '' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="categoria">Categoria</SelectItem>
                        <SelectItem value="setor">Setor</SelectItem>
                        <SelectItem value="todos">Todos os ativos (padrão)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.match_type === 'categoria' && (
                    <div>
                      <Label>Categoria</Label>
                      <Input value={form.match_value} onChange={(e) => setForm({ ...form, match_value: e.target.value })} placeholder="Ex: Veículos" />
                    </div>
                  )}
                  {form.match_type === 'setor' && (
                    <div>
                      <Label>Setor</Label>
                      <Select
                        value={form.match_value || 'none'}
                        onValueChange={(v) => {
                          const sector = sectors.find((s) => s.id === v);
                          setForm({ ...form, match_value: v === 'none' ? '' : v, cost_center_code: sector?.accounting_code || form.cost_center_code });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione o setor</SelectItem>
                          {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Conta de débito</Label><Input value={form.debit_account} onChange={(e) => setForm({ ...form, debit_account: e.target.value })} placeholder="Ex: 3.1.2.01" /></div>
                    <div><Label>Conta de crédito</Label><Input value={form.credit_account} onChange={(e) => setForm({ ...form, credit_account: e.target.value })} placeholder="Ex: 1.2.3.09" /></div>
                    <div><Label>Cód. centro de custo</Label><Input value={form.cost_center_code} onChange={(e) => setForm({ ...form, cost_center_code: e.target.value })} /></div>
                    <div><Label>Histórico padrão</Label><Input value={form.history_template} onChange={(e) => setForm({ ...form, history_template: e.target.value })} /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Landmark className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma regra configurada. Crie ao menos uma para poder exportar.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground">
                    {MATCH_LABELS[r.match_type]}{r.match_value ? `: ${r.match_type === 'setor' ? sectorLabelFor(r.match_value) : r.match_value}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">Débito {r.debit_account} • Crédito {r.credit_account}{r.cost_center_code ? ` • CC ${r.cost_center_code}` : ''}</p>
                </div>
                {canManage && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
