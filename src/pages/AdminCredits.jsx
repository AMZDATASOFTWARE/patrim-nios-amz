import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/lib/depreciation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatCard from '@/components/dashboard/StatCard';
import { Coins, TrendingUp, Wallet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminCredits() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [savingPricing, setSavingPricing] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('creditReport', { action: 'report' });
      setReport(res.data);
      setCost(String(res.data.pricing?.cost_per_credit ?? 0.05));
      setPrice(String(res.data.pricing?.price_per_credit ?? 0.15));
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
        cost_per_credit: parseFloat(cost),
        price_per_credit: parseFloat(price),
      });
      toast.success('Precificação atualizada. Novos consumos usarão os novos valores.');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Não foi possível salvar a precificação.');
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

  const totals = report?.totals || { credits: 0, cost_to_me: 0, price_to_client: 0 };
  const rows = report?.rows || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Créditos de IA</h1>
          <p className="text-muted-foreground mt-1">Consumo, custo real e valor faturável por workspace</p>
        </div>
        <Button variant="outline" onClick={loadReport} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Créditos Consumidos" value={totals.credits} subtitle="Todos os workspaces" icon={Coins} />
        <StatCard title="Custo Real (você)" value={formatCurrency(totals.cost_to_me)} subtitle="Custo de plataforma" icon={Wallet} />
        <StatCard title="Valor Faturável" value={formatCurrency(totals.price_to_client)} subtitle="Cobrança projetada" icon={TrendingUp} />
        <StatCard title="Margem Bruta" value={formatCurrency(totals.price_to_client - totals.cost_to_me)} subtitle="Faturável − Custo" icon={TrendingUp} />
      </div>

      {/* Precificação dinâmica */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-card-foreground">Precificação por Crédito</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="cost">Seu custo por crédito (R$)</Label>
            <Input id="cost" type="number" step="0.001" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="price">Preço ao cliente por crédito (R$)</Label>
            <Input id="price" type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <Button onClick={handleSavePricing} disabled={savingPricing}>
            {savingPricing ? 'Salvando...' : 'Salvar precificação'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Margem atual: {parseFloat(cost) > 0 ? `${(((parseFloat(price) || 0) / parseFloat(cost) - 1) * 100).toFixed(0)}%` : '—'}
        </p>
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
                  <TableHead className="text-right">Créditos</TableHead>
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
                    <TableCell className="text-right">{r.credits}</TableCell>
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