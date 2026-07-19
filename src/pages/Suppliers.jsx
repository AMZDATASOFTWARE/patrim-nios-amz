import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pencil, Trash2, Globe, Phone, Mail, Building2, ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY = { name: '', trade_name: '', cnpj: '', email: '', phone: '', website: '', contact_name: '', address: '', city: '', state: '', zip_code: '', category: 'Outros', status: 'Ativo', payment_terms: '', bank_info: '', notes: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const SupplierEntity = useWorkspaceEntity('Supplier');
  const { workspaceId } = SupplierEntity;

  useEffect(() => { if (workspaceId) load(); }, [workspaceId]);

  const load = async () => {
    const data = await SupplierEntity.listAll('-created_date');
    setSuppliers(data);
    setLoading(false);
  };

  const openNew = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); setOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) await SupplierEntity.update(editId, form);
    else await SupplierEntity.create(form);
    setOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir fornecedor?')) { await SupplierEntity.del(id); load(); }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.trade_name && s.trade_name.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor = { Ativo: 'bg-emerald-100 text-emerald-700', Inativo: 'bg-gray-100 text-gray-600', Bloqueado: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{suppliers.length} fornecedores cadastrados</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Fornecedor</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar fornecedores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.trade_name || s.cnpj}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[s.status] || statusColor.Ativo}`}>{s.status}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{s.category}</span>
                {expanded === s.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {expanded === s.id && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border pt-3 sm:pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {s.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><a href={`mailto:${s.email}`} className="text-primary hover:underline">{s.email}</a></div>}
                  {s.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{s.phone}</span></div>}
                  {s.website && <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-muted-foreground" /><a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{s.website}</a></div>}
                  {s.contact_name && <div className="text-sm"><span className="text-muted-foreground">Contato: </span>{s.contact_name}</div>}
                  {s.address && <div className="text-sm"><span className="text-muted-foreground">Endereço: </span>{s.address}, {s.city}/{s.state}</div>}
                  {s.payment_terms && <div className="text-sm"><span className="text-muted-foreground">Pagamento: </span>{s.payment_terms}</div>}
                </div>
                {s.notes && <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{s.notes}</p>}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /> Editar</Button>
                  <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /> Excluir</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum fornecedor encontrado</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Label>Razão Social *</Label><Input value={form.name} onChange={e => f('name', e.target.value)} required /></div>
              <div><Label>Nome Fantasia</Label><Input value={form.trade_name} onChange={e => f('trade_name', e.target.value)} /></div>
              <div><Label>CNPJ *</Label><Input value={form.cnpj} onChange={e => f('cnpj', e.target.value)} required placeholder="00.000.000/0001-00" /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
              <div><Label>Site</Label><Input value={form.website} onChange={e => f('website', e.target.value)} placeholder="https://" /></div>
              <div><Label>Nome do Contato</Label><Input value={form.contact_name} onChange={e => f('contact_name', e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={e => f('address', e.target.value)} /></div>
              <div><Label>Cidade</Label><Input value={form.city} onChange={e => f('city', e.target.value)} /></div>
              <div><Label>Estado</Label><Input value={form.state} onChange={e => f('state', e.target.value)} placeholder="SP" /></div>
              <div><Label>CEP</Label><Input value={form.zip_code} onChange={e => f('zip_code', e.target.value)} /></div>
              <div><Label>Categoria</Label>
                <Select value={form.category} onValueChange={v => f('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Tecnologia','Veículos','Imóveis','Manutenção','Seguros','Outros'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => f('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Ativo','Inativo','Bloqueado'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Cond. Pagamento</Label><Input value={form.payment_terms} onChange={e => f('payment_terms', e.target.value)} placeholder="Ex: 30/60/90 dias" /></div>
              <div className="sm:col-span-2"><Label>Dados Bancários</Label><Input value={form.bank_info} onChange={e => f('bank_info', e.target.value)} placeholder="Banco, ag., conta..." /></div>
              <div className="sm:col-span-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} /></div>
            </div>
            <Button type="submit" className="w-full">{editId ? 'Atualizar' : 'Cadastrar'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}