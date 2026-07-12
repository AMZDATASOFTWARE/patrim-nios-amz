import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/depreciation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatCard from '@/components/dashboard/StatCard';
import { Coins, TrendingUp, Wallet, RefreshCw, MessageSquare, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminCredits() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    plan_price: '517.37',
    plan_message_credits: '500',
    plan_integration_credits: '20000',
    message_share_percent: '50',
    price_per_message_credit: '1.55',
    price_per_integration_credit: '0.04',
  });
  const [savingPricing, setSavingPricing] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('creditReport', { action: 'report' });
      setReport(res.data);
      const p = res.data.pricing;
      if (p) {
        setForm({
          plan_price: String(p.plan_price ?? 517.37),
          plan_message_credits: String(p.plan_message_credits ?? 500),
          plan_integration_credits: String(p.plan_integration_credits ?? 20000),
          message_share_percent: String(p.message_share_percent ?? 50),
          price_per_message_credit: String(p.price_per_message_credit ?? 1.55),
          price_per_integration_credit: String(p.price_per_integration_credit ?? 0.04),
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível carregar o relatório.');
    }
    setLoading(false);
  };

  useEffect(() => { loadReport(); }, []);

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      await base44.functions.invoke('creditReport', {
        action: 'updatePricing',
        plan_price: parseFloat(form.plan_price),
        plan_message_credits: parseFloat(form.plan_message_credits),
        plan_integration_credits: parseFloat(form.plan_integration_credits),
        message_share_percent: parseFloat(form.message_share_percent),
        price_per_message_credit: parseFloat(form.price_per_message_credit),
        price_per_integration_credit: parseFloat(form.price_per_integration_credit),
      });
      toast.success('Configuração salva. Novos consumos usarão o novo rateio.');
      loadReport();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível salvar a configuração.');
    }
    setSavingPricing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totals = report?.totals || { message_credits: 0, integration_credits: 0, credits: 0, cost_to_me: 0, price_to_client: 0 };
  const rows = report?.rows || [];

  // Custos unitários derivados do rateio do plano (recalculados em tempo real conforme o formulário).
  const planPrice = parseFloat(form.plan_price) || 0;
  const msgPool = parseFloat(form.plan_message_credits) || 1;
  const intPool = parseFloat(form.plan_integration_credits) || 1;
  const share = Math.min(100, Math.max(0, parseFloat(form.message_share_percent) || 0));
  const costPerMessage = (planPrice * (share / 100)) / msgPool;
  const costPerIntegration = (planPrice * ((100 - share) / 100)) / intPool;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Créditos de IA</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Consumo, custo real (rateio do plano) e valor faturável por workspace</p>
        </div>
        <Button variant="outline" onClick={loadReport} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Créditos de Mensagens" value={totals.message_credits} subtitle="Todos os workspaces" icon={MessageSquare} />
        <StatCard title="Créditos de Integrações" value={totals.integration_credits} subtitle="Todos os workspaces" icon={Plug} />
        <StatCard title="Custo Real (você)" value={formatCurrency(totals.cost_to_me)} subtitle="Rateio do seu plano" icon={Wallet} />
        <StatCard title="Valor Faturável" value={formatCurrency(totals.price_to_client)} subtitle="Cobrança projetada" icon={TrendingUp} />
        <StatCard title="Margem Bruta" value={formatCurrency(totals.price_to_client - totals.cost_to_me)} subtitle="Faturável − Custo" icon={Coins} />
      </div>

      {/* Rateio proporcional ao plano */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Rateio do Plano & Precificação</h2>
        <p className="text-sm text-muted-foreground">
          O custo real de cada crédito é derivado do valor mensal do seu plano, rateado entre os dois tipos de crédito.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="plan_price">Valor mensal do plano (R$)</Label>
            <Input id="plan_price" type="number" step="0.01" value={form.plan_price} onChange={(e) => setForm({ ...form, plan_price: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="msg_pool">Créditos de mensagens inclusos</Label>
            <Input id="msg_pool" type="number" value={form.plan_message_credits} onChange={(e) => setForm({ ...form, plan_message_credits: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="int_pool">Créditos de integrações inclusos</Label>
            <Input id="int_pool" type="number" value={form.plan_integration_credits} onChange={(e) => setForm({ ...form, plan_integration_credits: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="share">% do plano atribuído a mensagens</Label>
            <Input id="share" type="number" min="0" max="100" value={form.message_share_percent} onChange={(e) => setForm({ ...form, message_share_percent: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="price_msg">Preço ao cliente / crédito de mensagem (R$)</Label>
            <Input id="price_msg" type="number" step="0.001" value={form.price_per_message_credit} onChange={(e) => setForm({ ...form, price_per_message_credit: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="price_int">Preço ao cliente / crédito de integração (R$)</Label>
            <Input id="price_int" type="number" step="0.001" value={form.price_per_integration_credit} onChange={(e) => setForm({ ...form, price_per_integration_credit: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>Custo real derivado: <span className="font-medium text-card-foreground">R$ {costPerMessage.toFixed(4)}</span> por crédito de mensagem · <span className="font-medium text-card-foreground">R$ {costPerIntegration.toFixed(4)}</span> por crédito de integração</p>
          </div>
          <Button onClick={handleSavePricing} disabled={savingPricing}>
            {savingPricing ? 'Salvando...' : 'Salvar configuração'}
          </Button>
        </div>
      </div>

      {/* Consumo por workspace */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-semibold text-card-foreground">Consumo por Workspace</h2>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">Nenhum consumo registrado ainda.</p>
        ) : (
          <div className="p-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Mensagens</TableHead>
                  <TableHead className="text-right">Integrações</TableHead>
                  <TableHead className="text-right">Custo (você)</TableHead>
                  <TableHead className="text-right">Faturável</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Último uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.workspace_id}>
                    <TableCell className="font-medium">{r.workspace_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.owner_email}</TableCell>
                    <TableCell className="capitalize">{r.plan}</TableCell>
                    <TableCell className="text-right">{r.message_credits}</TableCell>
                    <TableCell className="text-right">{r.integration_credits}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.cost_to_me)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.price_to_client)}</TableCell>
                    <TableCell className={`text-right font-medium ${r.margin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(r.margin)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.last_event ? format(new Date(r.last_event), 'dd/MM/yyyy HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}