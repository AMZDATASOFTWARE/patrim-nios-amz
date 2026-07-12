import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Scale, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, getAssetDepreciation } from '@/lib/depreciation';
import { toast } from 'sonner';
import moment from 'moment';

const EMPTY = {
  asset_id: '', asset_name: '', revaluation_date: moment().format('YYYY-MM-DD'),
  appraised_value: '', appraised_residual_value: '', new_useful_life_years: '', notes: '',
};

export default function Revaluations() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_revaluations');
  const RevaluationEntity = useWorkspaceEntity('AssetRevaluation');
  const AssetEntity = useWorkspaceEntity('Asset');

  const [revaluations, setRevaluations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [r, a] = await Promise.all([
      RevaluationEntity.list('-revaluation_date', 500),
      AssetEntity.list('-created_date', 1000),
    ]);
    setRevaluations(r);
    setAssets(a);
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY); setOpen(true); };

  const selectAsset = (assetId) => {
    const asset = assets.find((a) => a.id === assetId);
    setForm({ ...form, asset_id: assetId, asset_name: asset?.name || '' });
  };

  const handleSave = async () => {
    const asset = assets.find((a) => a.id === form.asset_id);
    if (!asset) { toast.error('Selecione o ativo.'); return; }
    const appraisedValue = parseFloat(form.appraised_value) || 0;
    if (appraisedValue <= 0) { toast.error('Informe o valor avaliado.'); return; }

    const dep = getAssetDepreciation(asset);
    const previousValue = dep.currentValue;
    const delta = appraisedValue - previousValue;

    setSaving(true);
    try {
      await RevaluationEntity.create({
        asset_id: asset.id,
        asset_name: asset.name,
        revaluation_date: form.revaluation_date,
        previous_value: previousValue,
        previous_residual_value: asset.residual_value || 0,
        previous_rate: asset.depreciation_rate || 0,
        previous_accumulated_depreciation: dep.accumulated,
        appraised_value: appraisedValue,
        appraised_residual_value: parseFloat(form.appraised_residual_value) || 0,
        new_useful_life_years: parseFloat(form.new_useful_life_years) || asset.useful_life_years || 0,
        gain_amount: delta > 0 ? delta : 0,
        loss_amount: delta < 0 ? Math.abs(delta) : 0,
        notes: form.notes,
      });

      // Reavaliação passa a ser o novo ponto de partida da depreciação —
      // getAssetDepreciation recalcula dali em diante sem precisar de lógica nova.
      await AssetEntity.update(asset.id, {
        acquisition_value: appraisedValue,
        residual_value: parseFloat(form.appraised_residual_value) || asset.residual_value || 0,
        useful_life_years: parseFloat(form.new_useful_life_years) || asset.useful_life_years || 0,
        purchase_date: form.revaluation_date,
      });

      toast.success('Reavaliação registrada.');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar. Requer papel de administrador ou gerente.');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reavaliações de Ativos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Registre nova avaliação de valor, preservando o histórico anterior de depreciação</p>
        </div>
        {canManage && <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Nova reavaliação</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : revaluations.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Scale className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhuma reavaliação registrada</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {revaluations.map((r) => {
            const isGain = (r.gain_amount || 0) > 0;
            return (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-card-foreground truncate">{r.asset_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {moment(r.revaluation_date).format('DD/MM/YYYY')} • {formatCurrency(r.previous_value)} → {formatCurrency(r.appraised_value)}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                  isGain ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatCurrency(isGain ? r.gain_amount : r.loss_amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova reavaliação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Ativo *</Label>
              <Select value={form.asset_id} onValueChange={selectAsset}>
                <SelectTrigger><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data da reavaliação *</Label><Input type="date" value={form.revaluation_date} onChange={(e) => setForm({ ...form, revaluation_date: e.target.value })} /></div>
              <div><Label>Valor avaliado (R$) *</Label><Input type="number" step="0.01" value={form.appraised_value} onChange={(e) => setForm({ ...form, appraised_value: e.target.value })} /></div>
              <div><Label>Valor residual avaliado (R$)</Label><Input type="number" step="0.01" value={form.appraised_residual_value} onChange={(e) => setForm({ ...form, appraised_residual_value: e.target.value })} /></div>
              <div><Label>Nova vida útil (anos)</Label><Input type="number" value={form.new_useful_life_years} onChange={(e) => setForm({ ...form, new_useful_life_years: e.target.value })} /></div>
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
