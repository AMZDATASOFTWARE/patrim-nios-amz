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
import { Handshake, Plus, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_META = {
  emprestado: { label: 'Emprestado', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  devolvido: { label: 'Devolvido', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  atrasado: { label: 'Atrasado', badge: 'bg-red-100 text-red-700 border-red-200' },
};

const EMPTY = {
  asset_id: '', asset_name: '', borrower_name: '', borrower_sector: '', sector_id: '',
  loan_date: moment().format('YYYY-MM-DD'), expected_return_date: '', notes: '',
};

export default function Loans() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_loans');
  const LoanEntity = useWorkspaceEntity('AssetLoan');
  const AssetEntity = useWorkspaceEntity('Asset');
  const SectorEntity = useWorkspaceEntity('Sector');

  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [l, a, s] = await Promise.all([
      LoanEntity.list('-loan_date', 500),
      AssetEntity.list('-created_date', 1000),
      SectorEntity.list('name', 500),
    ]);
    // Marca como atrasado (visualmente) quem passou da previsão sem devolução — não altera o registro salvo.
    const today = moment().format('YYYY-MM-DD');
    setLoans(l.map((x) => (
      x.status === 'emprestado' && x.expected_return_date && x.expected_return_date < today
        ? { ...x, status: 'atrasado' }
        : x
    )));
    setAssets(a);
    setSectors(s.filter((row) => row.status !== 'inativo'));
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY); setOpen(true); };

  const selectAsset = (assetId) => {
    const asset = assets.find((a) => a.id === assetId);
    setForm({ ...form, asset_id: assetId, asset_name: asset?.name || '' });
  };

  const handleSave = async () => {
    if (!form.asset_id) { toast.error('Selecione o ativo.'); return; }
    if (!form.borrower_name.trim()) { toast.error('Informe o tomador do empréstimo.'); return; }
    if (!form.expected_return_date) { toast.error('Informe a previsão de devolução.'); return; }
    setSaving(true);
    try {
      await LoanEntity.create({ ...form, status: 'emprestado' });
      toast.success('Empréstimo registrado.');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar. Requer papel de administrador ou gerente.');
    }
    setSaving(false);
  };

  const handleReturn = async (loan) => {
    try {
      await LoanEntity.update(loan.id, { status: 'devolvido', actual_return_date: moment().format('YYYY-MM-DD') });
      toast.success('Devolução registrada.');
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível registrar a devolução.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Empréstimos de Ativos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Empréstimo temporário, diferente de transferência permanente — com previsão de devolução</p>
        </div>
        {canManage && <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Novo empréstimo</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : loans.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Handshake className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum empréstimo registrado</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {loans.map((l) => {
            const meta = STATUS_META[l.status] || STATUS_META.emprestado;
            return (
              <div key={l.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-card-foreground truncate">{l.asset_name || '—'}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {l.borrower_name}{l.borrower_sector ? ` (${l.borrower_sector})` : ''} • emprestado em {moment(l.loan_date).format('DD/MM/YYYY')}
                    {l.status === 'devolvido' && l.actual_return_date
                      ? ` • devolvido em ${moment(l.actual_return_date).format('DD/MM/YYYY')}`
                      : ` • previsão ${moment(l.expected_return_date).format('DD/MM/YYYY')}`}
                  </p>
                </div>
                {canManage && l.status !== 'devolvido' && (
                  <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => handleReturn(l)}>
                    <Undo2 className="h-4 w-4" /> Registrar devolução
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo empréstimo</DialogTitle></DialogHeader>
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
              <div><Label>Tomador do empréstimo *</Label><Input value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} /></div>
              <div><Label>Setor/Departamento (texto livre, uso externo)</Label><Input value={form.borrower_sector} onChange={(e) => setForm({ ...form, borrower_sector: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Setor interno (opcional)</Label>
                <Select value={form.sector_id || 'none'} onValueChange={(v) => setForm({ ...form, sector_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum setor cadastrado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem setor</SelectItem>
                    {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Data do empréstimo *</Label><Input type="date" value={form.loan_date} onChange={(e) => setForm({ ...form, loan_date: e.target.value })} /></div>
              <div><Label>Previsão de devolução *</Label><Input type="date" value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })} /></div>
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
