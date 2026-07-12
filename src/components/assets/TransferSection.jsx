import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_META = {
  pendente: { label: 'Aguardando aceite', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  aceito: { label: 'Aceita', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  recusado: { label: 'Recusada', badge: 'bg-red-100 text-red-700 border-red-200' },
  cancelado: { label: 'Cancelada', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function TransferSection({ assetId, assetName, canManage }) {
  const TransferEntity = useWorkspaceEntity('AssetTransfer');
  const SectorEntity = useWorkspaceEntity('Sector');
  const [transfers, setTransfers] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ recipient_email: '', recipient_name: '', to_location: '', to_cost_center: '', to_sector_id: '', reason: '' });

  useEffect(() => { load(); }, [assetId]);

  const load = async () => {
    const [data, s] = await Promise.all([
      TransferEntity.filter({ asset_id: assetId }, '-requested_at', 50),
      SectorEntity.list('name', 500),
    ]);
    setTransfers(data);
    setSectors(s.filter((row) => row.status !== 'inativo'));
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.recipient_email.trim()) { toast.error('Informe o e-mail do destinatário.'); return; }
    setSending(true);
    try {
      const res = await base44.functions.invoke('requestAssetTransfer', { asset_id: assetId, ...form });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Falha ao solicitar transferência.');
      toast.success('Solicitação enviada ao destinatário.');
      setOpen(false);
      setForm({ recipient_email: '', recipient_name: '', to_location: '', to_cost_center: '', to_sector_id: '', reason: '' });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Não foi possível solicitar a transferência.');
    }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">Transferências</h2>
          <p className="text-sm text-muted-foreground">Movimentação com aceite do destinatário</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Solicitar transferência</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Solicitar transferência de "{assetName}"</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>E-mail do destinatário *</Label>
                  <Input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} placeholder="quem vai receber o bem" />
                </div>
                <div>
                  <Label>Nome do destinatário</Label>
                  <Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nova localização</Label>
                    <Input value={form.to_location} onChange={(e) => setForm({ ...form, to_location: e.target.value })} />
                  </div>
                  <div>
                    <Label>Novo setor</Label>
                    <Select value={form.to_sector_id || 'none'} onValueChange={(v) => setForm({ ...form, to_sector_id: v === 'none' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="Nenhum setor cadastrado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem setor</SelectItem>
                        {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={sending}>
                  {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Enviar solicitação'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ArrowLeftRight className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhuma transferência registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transfers.map((t) => {
            const meta = STATUS_META[t.status] || STATUS_META.pendente;
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                <div className="min-w-0">
                  <p className="text-sm text-card-foreground truncate">
                    Para <span className="font-medium">{t.recipient_name || t.recipient_email}</span>
                    {t.to_location ? ` → ${t.to_location}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.requested_at ? moment(t.requested_at).format('DD/MM/YYYY HH:mm') : ''}
                    {t.reason ? ` • ${t.reason}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
