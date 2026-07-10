import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Link } from 'react-router-dom';
import { formatCurrency, getUsefulLifeFromRate, getAssetDepreciation } from '@/lib/depreciation';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingDown, ArrowRight } from 'lucide-react';

const categories = ['Todas', 'Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const BASES = [
  { key: 'societaria', label: 'Societária' },
  { key: 'fiscal', label: 'Fiscal' },
  { key: 'diferenca', label: 'Diferença' },
];

export default function Depreciation() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [basis, setBasis] = useState('societaria');
  const AssetEntity = useWorkspaceEntity('Asset');
  const { workspaceId } = AssetEntity;

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    AssetEntity.list('-created_date', 200).then(data => {
      setAssets(data);
      setLoading(false);
    });
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const filteredAssets = assets.filter(a => 
    categoryFilter === 'Todas' || a.category === categoryFilter
  );

  const isDiff = basis === 'diferenca';
  const rows = filteredAssets.map((asset) => {
    const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
    const soc = getAssetDepreciation(asset, 'societaria');
    const fis = getAssetDepreciation(asset, 'fiscal');
    if (isDiff) {
      // Diferença (societária − fiscal) — base temporaria relevante para apuração.
      return {
        ...asset, usefulLife, cip: soc.cip,
        accumulated: soc.accumulated - fis.accumulated,
        currentValue: soc.currentValue - fis.currentValue,
        monthly: soc.monthly - fis.monthly,
        depPct: 0,
        socAcc: soc.accumulated, fisAcc: fis.accumulated,
      };
    }
    const d = basis === 'fiscal' ? fis : soc;
    return { ...asset, ...d, usefulLife };
  });

  const totalAcquisition = rows.reduce((s, r) => s + (r.acquisition_value || 0), 0);
  const totalCurrent = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalAccumulated = rows.reduce((s, r) => s + r.accumulated, 0);
  const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Depreciação</h1>
          <p className="text-muted-foreground mt-1">Cálculo de depreciação pelo Método da Linha Reta</p>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Aquisição</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalAcquisition)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Valor Contábil Atual</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(totalCurrent)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Depreciação Acumulada</p>
          <p className="text-xl font-bold text-destructive mt-1">{formatCurrency(totalAccumulated)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Depreciação Mensal</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalMonthly)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left font-semibold p-4">Ativo</th>
                <th className="text-left font-semibold p-4">Categoria</th>
                <th className="text-right font-semibold p-4">Valor Aquisição</th>
                <th className="text-right font-semibold p-4">Dep. Acumulada</th>
                <th className="text-right font-semibold p-4">Valor Atual</th>
                <th className="text-right font-semibold p-4">Dep. Mensal</th>
                <th className="text-center font-semibold p-4">Progresso</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{row.name}{row.cip ? <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">obra</span> : ''}</td>
                  <td className="p-4 text-muted-foreground">{row.category}</td>
                  <td className="p-4 text-right">{formatCurrency(row.acquisition_value)}</td>
                  <td className="p-4 text-right text-destructive font-medium">{formatCurrency(row.accumulated)}</td>
                  <td className="p-4 text-right text-primary font-medium">{formatCurrency(row.currentValue)}</td>
                  <td className="p-4 text-right">{formatCurrency(row.monthly)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Progress value={row.depPct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-12 text-right">{row.depPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Link to={`/AssetDetail?id=${row.id}`} className="text-primary hover:text-primary/80">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum ativo encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}