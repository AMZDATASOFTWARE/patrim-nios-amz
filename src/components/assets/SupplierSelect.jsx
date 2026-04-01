import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierSelect({ value, onChange }) {
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const SupplierEntity = useWorkspaceEntity('Supplier');

  useEffect(() => {
    SupplierEntity.list('name', 200).then(setSuppliers);
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.cnpj) return;
    setSaving(true);
    const created = await SupplierEntity.create({ ...form, status: 'Ativo' });
    setSuppliers((prev) => [...prev, created]);
    onChange({ supplier_id: created.id, supplier_name: created.name });
    toast.success('Fornecedor cadastrado!');
    setOpen(false);
    setForm({ name: '', cnpj: '', email: '', phone: '' });
    setSaving(false);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={value || ''}
        onValueChange={(id) => {
          const sup = suppliers.find((s) => s.id === id);
          if (sup) onChange({ supplier_id: sup.id, supplier_name: sup.name });
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Selecionar fornecedor..." />
        </SelectTrigger>
        <SelectContent>
          {suppliers.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.name}{s.trade_name ? ` (${s.trade_name})` : ''}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)} title="Cadastrar novo fornecedor">
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Razão Social *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <Label>CNPJ *</Label>
              <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contato@empresa.com" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="button" disabled={!form.name || !form.cnpj || saving} onClick={handleCreate}>
                {saving ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}