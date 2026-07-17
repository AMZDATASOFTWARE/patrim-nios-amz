import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wrench, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/depreciation';
import { logAudit } from '@/lib/audit';
import { toast } from 'sonner';
import moment from 'moment';

export default function MaintenanceSection({ assetId, assetName = '' }) {
  const navigate = useNavigate();
  const MaintenanceEntity = useWorkspaceEntity('MaintenanceRecord');
  const AssetEntity = useWorkspaceEntity('Asset');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    provider: '',
    type: 'Corretiva',
    technician_name: '',
    parts_used: '',
    checklist: '',
    useful_life_impact: 'nenhum',
    useful_life_impact_years: '',
  });

  useEffect(() => {
    loadRecords();
  }, [assetId]);

  const loadRecords = async () => {
    // filter do helper injeta workspace_id — isola manutenções por tenant.
    const data = await MaintenanceEntity.filter({ asset_id: assetId }, '-date', 50);
    setRecords(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const impactYears = parseFloat(form.useful_life_impact_years) || 0;
    const record = await MaintenanceEntity.create({
      ...form,
      asset_id: assetId,
      asset_name: assetName,
      status: 'concluida',
      cost: parseFloat(form.cost) || 0,
      useful_life_impact_years: form.useful_life_impact === 'estende' ? impactYears : undefined,
    });

    // CPC 01 (redução ao valor recuperável / vida útil): manutenção que agrega vida útil ajusta
    // useful_life_years automaticamente (decisão do usuário — sem revisão humana intermediária).
    // "Reduz" (possível perda de valor) não é calculado automaticamente aqui — não há laudo/valor
    // de avaliação disponível neste formulário; o usuário é direcionado para Reavaliações.
    if (form.useful_life_impact === 'estende' && impactYears > 0) {
      try {
        const assets = await AssetEntity.filter({ id: assetId });
        const asset = assets[0];
        if (asset) {
          const newUsefulLife = (asset.useful_life_years || 0) + impactYears;
          await AssetEntity.update(assetId, { useful_life_years: newUsefulLife });
          await logAudit({
            action: 'updated', entity_type: 'Asset', entity_id: assetId,
            entity_label: assetName, summary: `Manutenção agregou ${impactYears} ano(s) de vida útil (registro ${record?.id || ''})`,
            old_data: { useful_life_years: asset.useful_life_years }, new_data: { useful_life_years: newUsefulLife },
          });
          toast.success(`Vida útil do ativo ajustada: +${impactYears} ano(s) (agora ${newUsefulLife} anos).`);
        }
      } catch (_) {
        toast.error('Manutenção registrada, mas não foi possível ajustar a vida útil do ativo automaticamente.');
      }
    } else if (form.useful_life_impact === 'reduz') {
      toast.info('Considere registrar uma Reavaliação para formalizar a possível perda de valor deste ativo.', {
        action: { label: 'Abrir Reavaliações', onClick: () => navigate(`/Revaluations?asset_id=${assetId}`) },
      });
    }

    setForm({ date: new Date().toISOString().split('T')[0], description: '', cost: '', provider: '', type: 'Corretiva', technician_name: '', parts_used: '', checklist: '', useful_life_impact: 'nenhum', useful_life_impact_years: '' });
    setOpen(false);
    loadRecords();
  };

  const handleDelete = async (recordId) => {
    await MaintenanceEntity.del(recordId);
    loadRecords();
  };

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Histórico de Manutenções</h2>
          <p className="text-sm text-muted-foreground">{records.length} registro(s) • Total: {formatCurrency(totalCost)}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nova Manutenção
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Manutenção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventiva">Preventiva</SelectItem>
                    <SelectItem value="Corretiva">Corretiva</SelectItem>
                    <SelectItem value="Melhoria">Melhoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Custo (R$)</Label>
                  <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
                </div>
                <div>
                  <Label>Técnico responsável</Label>
                  <Input value={form.technician_name} onChange={(e) => setForm({ ...form, technician_name: e.target.value })} />
                </div>
                <div>
                  <Label>Peças utilizadas</Label>
                  <Input value={form.parts_used} onChange={(e) => setForm({ ...form, parts_used: e.target.value })} placeholder="Ex: 2x correia, 1x filtro" />
                </div>
              </div>
              <div>
                <Label>Checklist (um item por linha)</Label>
                <Textarea value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} rows={3} placeholder={"Verificar nível de óleo\nTestar freios\nLimpar filtros"} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Impacto na Vida útil (CPC 01)</Label>
                  <Select value={form.useful_life_impact} onValueChange={(v) => setForm({ ...form, useful_life_impact: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                      <SelectItem value="estende">Estende vida útil</SelectItem>
                      <SelectItem value="reduz">Reduz valor (possível perda)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.useful_life_impact === 'estende' && (
                  <div>
                    <Label>Anos adicionais</Label>
                    <Input type="number" step="0.5" min="0" value={form.useful_life_impact_years} onChange={(e) => setForm({ ...form, useful_life_impact_years: e.target.value })} placeholder="Ex: 2" />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">Registrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wrench className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhuma manutenção registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="flex items-start justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    record.type === 'Preventiva' ? 'bg-blue-100 text-blue-700' :
                    record.type === 'Melhoria' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {record.type}
                  </span>
                  <span className="text-sm text-muted-foreground">{moment(record.date).format('DD/MM/YYYY')}</span>
                </div>
                <p className="text-sm text-card-foreground">{record.description}</p>
                {record.provider && <p className="text-xs text-muted-foreground mt-1">Fornecedor: {record.provider}</p>}
                {record.technician_name && <p className="text-xs text-muted-foreground">Técnico: {record.technician_name}</p>}
                {record.parts_used && <p className="text-xs text-muted-foreground">Peças: {record.parts_used}</p>}
                {record.checklist && (
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside space-y-0.5">
                    {record.checklist.split('\n').filter((l) => l.trim()).map((l, idx) => <li key={idx}>{l}</li>)}
                  </ul>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="font-semibold text-card-foreground">{formatCurrency(record.cost)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(record.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}