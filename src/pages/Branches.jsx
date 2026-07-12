import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/permissions';
import { flattenBranchTree, getDescendantIds } from '@/lib/branchTree';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Trash2, Crown, Move } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', code: '', cnpj: '', address: '', city: '', state: '', is_headquarters: false, parent_branch_id: '' };
const ROOT_VALUE = '__root__';

export default function Branches() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { can } = usePermissions(user);
  const canManage = can('manage_branches');
  const BranchEntity = useWorkspaceEntity('Branch');
  const SectorEntity = useWorkspaceEntity('Sector');
  const AssetEntity = useWorkspaceEntity('Asset');

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [moveParentId, setMoveParentId] = useState(ROOT_VALUE);
  const [moving, setMoving] = useState(false);

  const isEnterprise = workspace?.plan === 'enterprise';
  const treeRows = flattenBranchTree(branches);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await BranchEntity.list('-created_date', 200);
    setBranches(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome da filial.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, parent_branch_id: form.parent_branch_id === ROOT_VALUE ? '' : form.parent_branch_id };
      const res = await base44.functions.invoke('createBranch', payload);
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Falha ao criar filial.');
      toast.success('Filial criada.');
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Não foi possível criar a filial.');
    }
    setSaving(false);
  };

  const handleDelete = async (branch) => {
    const childCount = branches.filter((b) => b.parent_branch_id === branch.id).length;
    const [sectorCount, assetCount] = await Promise.all([
      SectorEntity.count({ branch_id: branch.id }),
      AssetEntity.count({ branch_id: branch.id }),
    ]);
    if (childCount + sectorCount + assetCount > 0) {
      toast.error(`Esta filial possui ${childCount} sub-filial(is), ${sectorCount} setor(es) e ${assetCount} ativo(s) vinculados. Remova os vínculos antes de excluir.`);
      return;
    }
    if (!confirm(`Excluir a filial "${branch.name}"? Esta ação não pode ser desfeita.`)) return;
    try { await BranchEntity.del(branch.id); load(); }
    catch (e) { toast.error(e?.message || 'Não foi possível excluir.'); }
  };

  const openMove = (branch) => {
    setMoveTarget(branch);
    setMoveParentId(branch.parent_branch_id || ROOT_VALUE);
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    setMoving(true);
    try {
      const res = await base44.functions.invoke('moveBranch', {
        branch_id: moveTarget.id,
        parent_branch_id: moveParentId === ROOT_VALUE ? null : moveParentId,
      });
      if (!res?.data?.ok) throw new Error(res?.data?.error || 'Falha ao mover filial.');
      toast.success('Filial movida.');
      setMoveTarget(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Não foi possível mover a filial.');
    }
    setMoving(false);
  };

  // Filial em edição não pode virar pai de si mesma nem de nenhuma de suas descendentes (ciclo) --
  // a validação real acontece server-side em moveBranch, isto é só UX (evita o erro óbvio na UI).
  const moveParentOptions = moveTarget
    ? treeRows.filter((b) => b.id !== moveTarget.id && !getDescendantIds(branches, moveTarget.id).has(b.id))
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Filiais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Unidades da empresa para segmentar o patrimônio</p>
        </div>
        {canManage && isEnterprise && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Nova filial</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova filial</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Filial São Paulo" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                  <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                  <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                  <div><Label>UF</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input id="is_hq" type="checkbox" className="h-4 w-4" checked={form.is_headquarters} onChange={(e) => setForm({ ...form, is_headquarters: e.target.checked })} />
                  <Label htmlFor="is_hq" className="cursor-pointer">É a matriz</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? 'Salvando...' : 'Criar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isEnterprise && (
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shrink-0">
            <Crown className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Múltiplas filiais é um recurso do plano Enterprise</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Segmente o patrimônio por unidade, com CNPJ e endereço próprios de cada filial. Faça upgrade para habilitar.
            </p>
            <Link to="/Billing"><Button className="mt-3" size="sm">Ver planos</Button></Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : branches.length === 0 ? (
        isEnterprise && (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium text-foreground">Nenhuma filial cadastrada</p>
            <p className="text-muted-foreground mt-1">Crie a primeira filial para segmentar seus ativos.</p>
          </div>
        )
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm divide-y divide-border">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 p-3 sm:p-4">
              <div className="flex items-center gap-3 min-w-0">
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground truncate">
                    {b.name}
                    {b.is_headquarters && <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Matriz</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[b.code, b.cnpj, [b.city, b.state].filter(Boolean).join('/')].filter(Boolean).join(' • ')}
                  </p>
                </div>
              </div>
              {canManage && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
