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
import { PackageX, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/depreciation';
import { toast } from 'sonner';
import moment from 'moment';

const TYPE_META = {
  baixa: { label: 'Baixa', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  alienacao: { label: 'Alienação (venda)', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
};

const NEW_STATUS = { baixa: 'Inativo', alienacao: 'Alienado' };

const EMPTY = {
  asset_id: '', asset_name: '', disposal_type: 'baixa', disposal_date: moment().format('YYYY-MM-DD'),
  reason: '', buyer_name: '', buyer_document: '', sale_value: '', invoice_number: '', auction_reference: '', notes: '',
};

export default function Disposals() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_disposals');
  const DisposalEntity = useWorkspaceEntity('AssetDisposal');
  const AssetEntity = useWorkspaceEntity('Asset');

  const [disposals, setDisposals] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [d, a] = await Promise.all([
      DisposalEntity.list('-disposal_date', 500),
      AssetEntity.filter({}, '-created_date', 1000),
    ]);
    setDisposals(d);
    // Só oferece ativos ainda não baixados/alienados como candidatos.
    setAssets(a.filter((x) => x.status !== 'Inativo' && x.status !== 'Alienado'));
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY); setOpen(true); };

  const selectAsset = (assetId) => {
    const asset = assets.find((a) => a.id === assetId);
    setForm({ ...form, asset_id: assetId, asset_name: asset?.name || '' });
  };

  const handleSave = async () => {
    if (!form.asset_id) { toast.error('Selecione o ativo.'); return; }
    setSaving(true);
    try {
      const data = {
        asset_id: form.asset_id,
        asset_name: form.asset_name,
        disposal_type: form.disposal_type,
        disposal_date: form.disposal_date,
        notes: form.notes,
      };
      if (form.disposal_type === 'baixa') {
        data.reason = form.reason;
      } else {
        data.buyer_name = form.buyer_name;
        data.buyer_document = form.buyer_document;
        data.sale_value = parseFloat(form.sale_value) || 0;
        data.invoice_number = form.invoice_number;
        data.auction_reference = form.auction_reference;
      }
      await DisposalEntity.create(data);
      await AssetEntity.update(form.asset_id, { status: NEW_STATUS[form.disposal_type] });
      toast.success('Saída de patrimônio registrada.');
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
          <h1 className="text-3xl font-bold text-foreground">Baixa / Alienação de Patrimônio</h1>
          <p className="text-muted-foreground mt-1">Registre descarte simples (baixa) ou venda com nota fiscal (alienação)</p>
        </div>
        {canManage && <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Nova saída</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : disposals.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <PackageX className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhuma baixa/alienação registrada</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {disposals.map((d) => {
            const meta = TYPE_META[d.disposal_type] || TYPE_META.baixa;
            return (
              <div key={d.id} className="flex items-center justify-between gap-3 p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-card-foreground truncate">{d.asset_name || '—'}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {moment(d.disposal_date).format('DD/MM/YYYY')}
                    {d.disposal_type === 'baixa' && d.reason ? ` • ${d.reason}` : ''}
                    {d.disposal_type === 'alienacao' ? ` • ${d.buyer_name || 'comprador não informado'} • ${formatCurrency(d.sale_value)}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova saída de patrimônio</DialogTitle></DialogHeader>
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
            <div>
              <Label>Tipo de saída *</Label>
              <Select value={form.disposal_type} onValueChange={(v) => setForm({ ...form, disposal_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa (descarte simples)</SelectItem>
                  <SelectItem value="alienacao">Alienação (venda/leilão)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.disposal_date} onChange={(e) => setForm({ ...form, disposal_date: e.target.value })} />
            </div>

            {form.disposal_type === 'baixa' ? (
              <div><Label>Motivo</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Comprador</Label><Input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} /></div>
                <div><Label>CNPJ/CPF do comprador</Label><Input value={form.buyer_document} onChange={(e) => setForm({ ...form, buyer_document: e.target.value })} /></div>
                <div><Label>Valor de venda (R$)</Label><Input type="number" step="0.01" value={form.sale_value} onChange={(e) => setForm({ ...form, sale_value: e.target.value })} /></div>
                <div><Label>Nota fiscal de saída</Label><Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></div>
                <div className="col-span-2"><Label>Referência do leilão</Label><Input value={form.auction_reference} onChange={(e) => setForm({ ...form, auction_reference: e.target.value })} /></div>
              </div>
            )}
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
