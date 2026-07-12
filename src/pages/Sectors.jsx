import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { flattenBranchTree, branchLabel } from '@/lib/branchTree';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const HQ_VALUE = '__hq__';

const EMPTY = {
  name: '', branch_id: '', accounting_code: '', description: '', status: 'ativo',
};

export default function Sectors() {
  const { user } = useAuth();
  const { can } = usePermissions(user);
  const canManage = can('manage_sectors');
  const SectorEntity = useWorkspaceEntity('Sector');
  const BranchEntity = useWorkspaceEntity('Branch');
  const AssetEntity = useWorkspaceEntity('Asset');
  const MaintenanceEntity = useWorkspaceEntity('MaintenanceRecord');
  const LoanEntity = useWorkspaceEntity('AssetLoan');
  const CollabSectorLinkEntity = useWorkspaceEntity('CollaboratorSectorLink');

  const [sectors, setSectors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      SectorEntity.list('name', 500),
      BranchEntity.list('name', 500),
    ]);
    setSectors(s);
    setBranches(b);
    setLoading(false);
  };

  const branchOptions = flattenBranchTree(branches);

  const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (sector) => {
    setForm({
      name: sector.name || '',
      branch_id: sector.branch_id || '',
      accounting_code: sector.accounting_code || '',
      description: sector.description || '',
      status: sector.status || 'ativo',
    });
    setEditId(sector.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome do setor.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, branch_id: form.branch_id === HQ_VALUE ? '' : form.branch_id };
      if (editId) {
        await SectorEntity.update(editId, payload);
        toast.success('Setor atualizado.');
      } else {
        await SectorEntity.create(payload);
        toast.success('Setor criado.');
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível salvar. Requer papel de administrador ou gerente.');
    }
    setSaving(false);
  };

  const handleDelete = async (sector) => {
    const [assetCount, maintCount, loanCount, collabCount] = await Promise.all([
      AssetEntity.count({ sector_id: sector.id }),
      MaintenanceEntity.count({ sector_id: sector.id }),
      LoanEntity.count({ sector_id: sector.id }),
      CollabSectorLinkEntity.count({ sector_id: sector.id }),
    ]);
    const total = assetCount + maintCount + loanCount + collabCount;
    if (total > 0) {
      toast.error(`Este setor tem ${total} vínculo(s) (ativos, manutenções, empréstimos ou colaboradores). Inative-o em vez de excluir.`);
      return;
    }
    if (!confirm(`Excluir o setor "${sector.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await SectorEntity.del(sector.id);
      toast.success('Setor excluído.');
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível excluir.');
    }
  };

  const toggleStatus = async (sector) => {
    try {
      await SectorEntity.update(sector.id, { status: sector.status === 'ativo' ? 'inativo' : 'ativo' });
      load();
    } catch (e) {
      toast.error(e?.message || 'Não foi possível alterar a situação.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Setores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Departamentos/setores da empresa, vinculados à Sede ou a uma Filial específica</p>
        </div>
        {canManage && <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Novo setor</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : sectors.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <Layers className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-lg font-medium text-foreground">Nenhum setor cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Setores ajudam a organizar ativos, manutenções e colaboradores por departamento</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {sectors.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 sm:p-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-card-foreground truncate">{s.name}</p>
                  {s.status === 'inativo' && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 bg-gray-100 text-gray-600 border-gray-200">Inativo</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {branchLabel(branches, s.branch_id)}
                  {s.accounting_code ? ` • Código ${s.accounting_code}` : ''}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(s)}>
                    {s.status === 'ativo' ? 'Inativar' : 'Ativar'}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar setor' : 'Novo setor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Financeiro" /></div>
            <div>
              <Label>Empresa</Label>
              <Select value={form.branch_id || HQ_VALUE} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={HQ_VALUE}>Sede / Matriz</SelectItem>
                  {branchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{'—'.repeat(b.depth)} {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Código Contábil (Centro de Custo)</Label><Input value={form.accounting_code} onChange={(e) => setForm({ ...form, accounting_code: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            {editId && (
              <div>
                <Label>Situação</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
