import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { 
  calculateCurrentValue, 
  calculateAccumulatedDepreciation, 
  formatCurrency, 
  getUsefulLifeFromRate 
} from '@/lib/depreciation';
import StatCard from '@/components/dashboard/StatCard';
import CategoryChart from '@/components/dashboard/CategoryChart';
import DepreciationChart from '@/components/dashboard/DepreciationChart';
import RecentAssets from '@/components/dashboard/RecentAssets';
import ExternalLinks from '@/components/dashboard/ExternalLinks';
import MaintenanceAlerts from '@/components/dashboard/MaintenanceAlerts';
import CreditUsageCard from '@/components/dashboard/CreditUsageCard';
import { Building2, TrendingDown, Package, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const AssetEntity = useWorkspaceEntity('Asset');
  const { workspaceId } = AssetEntity;

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    AssetEntity.list('-created_date', 500).then(data => {
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

  // Calculate totals
  const totalAcquisition = assets.reduce((sum, a) => sum + (a.acquisition_value || 0), 0);
  
  const totalCurrentValue = assets.reduce((sum, a) => {
    const usefulLife = a.useful_life_years || getUsefulLifeFromRate(a.depreciation_rate);
    return sum + calculateCurrentValue(a.purchase_date, a.acquisition_value, a.residual_value || 0, usefulLife);
  }, 0);
  
  const totalDepreciation = assets.reduce((sum, a) => {
    const usefulLife = a.useful_life_years || getUsefulLifeFromRate(a.depreciation_rate);
    return sum + calculateAccumulatedDepreciation(a.purchase_date, a.acquisition_value, a.residual_value || 0, usefulLife);
  }, 0);

  // Category data
  const categories = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
  const categoryData = categories.map((cat) => {
    const catAssets = assets.filter(a => a.category === cat);
    const value = catAssets.reduce((sum, a) => {
      const usefulLife = a.useful_life_years || getUsefulLifeFromRate(a.depreciation_rate);
      return sum + calculateCurrentValue(a.purchase_date, a.acquisition_value, a.residual_value || 0, usefulLife);
    }, 0);
    return { name: cat, value, count: catAssets.length };
  }).filter(c => c.count > 0);

  const depreciationData = categories.map((cat) => {
    const catAssets = assets.filter(a => a.category === cat);
    const currentValue = catAssets.reduce((sum, a) => {
      const usefulLife = a.useful_life_years || getUsefulLifeFromRate(a.depreciation_rate);
      return sum + calculateCurrentValue(a.purchase_date, a.acquisition_value, a.residual_value || 0, usefulLife);
    }, 0);
    const depreciation = catAssets.reduce((sum, a) => {
      const usefulLife = a.useful_life_years || getUsefulLifeFromRate(a.depreciation_rate);
      return sum + calculateAccumulatedDepreciation(a.purchase_date, a.acquisition_value, a.residual_value || 0, usefulLife);
    }, 0);
    return { name: cat, currentValue, depreciation };
  }).filter(c => c.currentValue > 0 || c.depreciation > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do patrimônio contábil</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Patrimônio Total"
          value={formatCurrency(totalCurrentValue)}
          subtitle="Valor contábil atual"
          icon={Building2}
        />
        <StatCard
          title="Valor de Aquisição"
          value={formatCurrency(totalAcquisition)}
          subtitle="Investimento total"
          icon={DollarSign}
        />
        <StatCard
          title="Depreciação Acumulada"
          value={formatCurrency(totalDepreciation)}
          subtitle="Total depreciado"
          icon={TrendingDown}
        />
        <StatCard
          title="Total de Ativos"
          value={assets.length}
          subtitle={`${assets.filter(a => a.status === 'Ativo').length} ativos em uso`}
          icon={Package}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={categoryData} />
        <DepreciationChart data={depreciationData} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAssets assets={assets} />
        <ExternalLinks />
      </div>

      {/* Consumo de IA */}
      <CreditUsageCard />

      {/* Maintenance & Alerts */}
      <MaintenanceAlerts assets={assets} />
    </div>
  );
}