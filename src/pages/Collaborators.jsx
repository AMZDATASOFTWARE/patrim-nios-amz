import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Users, Pencil, Trash2, Package } from 'lucide-react';
import { maskCpf } from '@/lib/mask';
import moment from 'moment';

const EMPTY = { name: '', cpf: '', email: '', phone: '', department: '', role: '', registration_number: '', status: 'Ativo', hire_date: '', notes: '' };
const statusColors = { Ativo: 'bg-emerald-100 text-emerald-700', Inativo: 'bg-gray-100 text-gray-500', Afastado: 'bg-amber-100 text-amber-700' };

export default function Collaborators() {
  const [collaborators, setCollaborators] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const CollabEntity = useWorkspaceEntity('Collaborator');
  const AssignEntity = useWorkspaceEntity('AssetAssignment');
  const { workspaceId } = CollabEntity;

  useEffect(() => { if (workspaceId) load(); }, [workspaceId]);

  const load = async () => {
    const [c, a] = await Promise.all([
      CollabEntity.list('-created_date', 200),
      AssignEntity.filter({ status: 'Ativo' }, '-assignment_date', 500),
    ]);
    setCollaborators(c);
    setAssignments(a);
    setLoading(false);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY, ...c }); setOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editing) {
      await CollabEntity.update(editing.id, form);
    } else {
      await CollabEntity.create(form);
    }
    setOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este colaborador?')) return;
    await CollabEntity.delete(id);
    load();
  };

  const filtered = collaborators.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf && c.cpf.includes(search)) ||
    (c.department && c.department.toLowerCase().includes(search.toLowerCase()))
  );

  const activeAssetsFor = (collabName) =>
    assignments.filter(a => a.collaborator_name === collabName).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">Gerencie os colaboradores que possuem ativos sob sua responsabilidade</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Colaborador</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF ou setor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum colaborador encontrado</p>
          <p className="text-sm mt-1">Cadastre colaboradores para vincular aos termos de responsabilidade</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const assets = activeAssetsFor(c.name);
            return (
              <div key={c.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm leading-tight">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.role || c.department || '—'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[c.status] || statusColors.Ativo}`}>{c.status}</span>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground mb-4">
                  <p><span className="font-medium text-foreground">CPF:</span> {maskCpf(c.cpf)}</p>
                  {c.department && <p><span className="font-medium text-foreground">Setor:</span> {c.department}</p>}
                  {c.email && <p><span className="font-medium text-foreground">E-mail:</span> {c.email}</p>}
                  {c.registration_number && <p><span className="font-medium text-foreground">Matrícula:</span> {c.registration_number}</p>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{assets} ativo(s) em uso</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={form.name} onChange={e => f('name', e.target.value)} required />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={e => f('cpf', e.target.value)} required placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input value={form.registration_number} onChange={e => f('registration_number', e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => f('phone', e.target.value)} />
              </div>
              <div>
                <Label>Departamento / Setor</Label>
                <Input value={form.department} onChange={e => f('department', e.target.value)} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input value={form.role} onChange={e => f('role', e.target.value)} />
              </div>
              <div>
                <Label>Data de Admissão</Label>
                <Input type="date" value={form.hire_date} onChange={e => f('hire_date', e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => f('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
              </div>
            </div>
            <Button type="submit" className="w-full">{editing ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}