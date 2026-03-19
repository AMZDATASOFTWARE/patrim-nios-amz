import { useState } from 'react';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, User } from 'lucide-react';

export default function WorkspaceSetup() {
  const { createWorkspace } = useWorkspace();
  const [plan, setPlan] = useState(null); // 'personal' or 'business'
  const [form, setForm] = useState({ name: '', cnpj: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await createWorkspace({ ...form, plan });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-8 text-white text-center">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Bem-vindo ao PatrimônioApp</h1>
          <p className="text-blue-200 mt-2 text-sm">Configure sua conta para começar</p>
        </div>

        {!plan ? (
          <div className="p-8 space-y-4">
            <h2 className="text-lg font-semibold text-center text-slate-700 mb-6">Como você vai usar o sistema?</h2>
            <button
              onClick={() => setPlan('personal')}
              className="w-full flex items-center gap-4 p-5 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="h-14 w-14 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-slate-500 group-hover:text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Uso Pessoal</p>
                <p className="text-sm text-slate-500 mt-0.5">Gerencie seus próprios bens e patrimônios pessoais</p>
              </div>
            </button>

            <button
              onClick={() => setPlan('business')}
              className="w-full flex items-center gap-4 p-5 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="h-14 w-14 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-7 w-7 text-slate-500 group-hover:text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Empresa</p>
                <p className="text-sm text-slate-500 mt-0.5">Gerencie o patrimônio de uma empresa com equipe e colaboradores</p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <button type="button" onClick={() => setPlan(null)} className="text-sm text-blue-600 hover:underline">← Voltar</button>
            <h2 className="text-lg font-semibold text-slate-700">
              {plan === 'personal' ? 'Dados da conta pessoal' : 'Dados da empresa'}
            </h2>

            <div>
              <Label>{plan === 'personal' ? 'Seu nome *' : 'Razão Social / Nome da Empresa *'}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder={plan === 'personal' ? 'Ex: João Silva' : 'Ex: Empresa LTDA'}
              />
            </div>

            {plan === 'business' && (
              <>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? 'Criando...' : 'Criar conta e entrar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}