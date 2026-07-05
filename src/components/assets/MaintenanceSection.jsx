import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wrench, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/depreciation';
import moment from 'moment';

export default function MaintenanceSection({ assetId, assetName = '' }) {
  const MaintenanceEntity = useWorkspaceEntity('MaintenanceRecord');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    provider: '',
    type: 'Corretiva',
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
    await MaintenanceEntity.create({
      ...form,
      asset_id: assetId,
      asset_name: assetName,
      status: 'concluida',
      cost: parseFloat(form.cost) || 0,
    });
    setForm({ date: new Date().toISOString().split('T')[0], description: '', cost: '', provider: '', type: 'Corretiva' });
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