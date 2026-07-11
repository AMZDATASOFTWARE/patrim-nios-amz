import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { getAssetDepreciation, formatCurrency } from '@/lib/depreciation';
import {
  computeAssetOverview,
  computeFieldOps,
  computeMaintenanceContracts,
  computeFiscal,
  computeRegistries,
  computeActivity,
  computeUpcomingExpirations,
} from '@/lib/dashboardKpis';
import StatCard from '@/components/dashboard/StatCard';
import KpiSectionCard from '@/components/dashboard/KpiSectionCard';
import ExpiringItemsWidget from '@/components/dashboard/ExpiringItemsWidget';
import CategoryChart from '@/components/dashboard/CategoryChart';
import DepreciationChart from '@/components/dashboard/DepreciationChart';
import RecentAssets from '@/components/dashboard/RecentAssets';
import ExternalLinks from '@/components/dashboard/ExternalLinks';
import MaintenanceAlerts from '@/components/dashboard/MaintenanceAlerts';
import moment from 'moment';
import { Building2, TrendingDown, Package, DollarSign, Truck, Wrench, Landmark, Building, Activity } from 'lucide-react';

// Todas as entidades abaixo têm leitura escopada por workspace_id via RLS
// (algumas — Collaborator/AssetAssignment — também por papel: admin/manager/
// viewer veem tudo do workspace, o papel 'user' só a própria linha). O mesmo
// componente e as mesmas seções renderizam para todos os papéis; a diferença
// de conteúdo nesses dois casos vem inteiramente da RLS já existente, não de
// nenhuma checagem nova aqui. CreditUsage/PricingConfig (dados de dono de
// plataforma) nunca são buscados nesta tela.
const ENTITY_LIMIT = 1000;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const AssetEntity = useWorkspaceEntity('Asset');
  const AttachmentEntity = useWorkspaceEntity('AssetAttachment');
  const TransferEntity = useWorkspaceEntity('AssetTransfer');
  const AssignmentEntity = useWorkspaceEntity('AssetAssignment');
  const MaintenanceEntity = useWorkspaceEntity('MaintenanceRecord');
  const ContractEntity = useWorkspaceEntity('Contract');
  const CiapEntity = useWorkspaceEntity('CiapCredit');
  const InventoryItemEntity = useWorkspaceEntity('InventoryItem');
  const BranchEntity = useWorkspaceEntity('Branch');
  const SupplierEntity = useWorkspaceEntity('Supplier');
  const CollaboratorEntity = useWorkspaceEntity('Collaborator');
  const AuditLogEntity = useWorkspaceEntity('AuditLog');

  const { workspaceId } = AssetEntity;

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      AssetEntity.list('-created_date', ENTITY_LIMIT),
      AttachmentEntity.list('-created_date', ENTITY_LIMIT),
      TransferEntity.list('-created_date', ENTITY_LIMIT),
      AssignmentEntity.list('-created_date', ENTITY_LIMIT),
      MaintenanceEntity.list('-created_date', ENTITY_LIMIT),
      ContractEntity.list('-created_date', ENTITY_LIMIT),
      CiapEntity.list('-created_date', ENTITY_LIMIT),
      InventoryItemEntity.list('-created_date', ENTITY_LIMIT),
      BranchEntity.list('-created_date', ENTITY_LIMIT),
      SupplierEntity.list('-created_date', ENTITY_LIMIT),
      CollaboratorEntity.list('-created_date', ENTITY_LIMIT),
      AuditLogEntity.list('-created_date', ENTITY_LIMIT),
    ]).then(([
      assets, attachments, transfers, assignments, maintenanceRecords,
      contracts, ciapCredits, inventoryItems, branches, suppliers,
      collaborators, auditLogs,
    ]) => {
      setData({
        assets, attachments, transfers, assignments, maintenanceRecords,
        contracts, ciapCredits, inventoryItems, branches, suppliers,
        collaborators, auditLogs,
      });
      setUpdatedAt(new Date());
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const {
    assets, attachments, transfers, assignments, maintenanceRecords,
    contracts, ciapCredits, inventoryItems, branches, suppliers,
    collaborators, auditLogs,
  } = data;

  const overview = computeAssetOverview(assets, attachments);
  const fieldOpsKpis = computeFieldOps({ transfers, assignments, inventoryItems });
  const maintenanceKpis = computeMaintenanceContracts({ maintenanceRecords, contracts });
  const fiscalKpis = computeFiscal({ assets, ciapCredits });
  const registriesKpis = computeRegistries({ branches, suppliers, collaborators, assignments });
  const activityKpis = computeActivity(auditLogs);
  const expiringItems = computeUpcomingExpirations(assets, contracts);

  // Distribuição por categoria — agora via getAssetDepreciation (trata obra
  // em andamento e base fiscal, o que os helpers antigos ignoravam).
  const categories = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
  const categoryData = categories.map((cat) => {
    const catAssets = assets.filter(a => a.category === cat);
    const value = catAssets.reduce((sum, a) => sum + getAssetDepreciation(a, 'societaria').currentValue, 0);
    return { name: cat, value, count: catAssets.length };
  }).filter(c => c.count > 0);

  const depreciationData = categories.map((cat) => {
    const catAssets = assets.filter(a => a.category === cat);
    const currentValue = catAssets.reduce((sum, a) => sum + getAssetDepreciation(a, 'societaria').currentValue, 0);
    const depreciation = catAssets.reduce((sum, a) => sum + getAssetDepreciation(a, 'societaria').accumulated, 0);
    return { name: cat, currentValue, depreciation };
  }).filter(c => c.currentValue > 0 || c.depreciation > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral completa do patrimônio da sua empresa</p>
        </div>
        {updatedAt && (
          <p className="text-xs text-muted-foreground">
            Atualizado em {moment(updatedAt).format('DD/MM/YYYY [às] HH:mm')}
          </p>
        )}
      </div>

      {/* Visão geral patrimonial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Patrimônio Total"
          value={formatCurrency(overview.totals.totalCurrentValue)}
          subtitle="Valor contábil atual"
          icon={Building2}
        />
        <StatCard
          title="Valor de Aquisição"
          value={formatCurrency(overview.totals.totalAcquisition)}
          subtitle="Investimento total"
          icon={DollarSign}
        />
        <StatCard
          title="Depreciação Acumulada"
          value={formatCurrency(overview.totals.totalAccumulated)}
          subtitle="Total depreciado"
          icon={TrendingDown}
        />
        <StatCard
          title="Total de Ativos"
          value={overview.totals.totalAssets}
          subtitle={`${overview.totals.activeCount} ativos em uso`}
          icon={Package}
        />
      </div>
      <KpiSectionCard title="Documentação e Conservação" icon={Package} kpis={overview.kpis} />

      {/* Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={categoryData} />
        <DepreciationChart data={depreciationData} />
      </div>

      {/* Alertas & Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringItemsWidget items={expiringItems} />
        <MaintenanceAlerts assets={assets} />
      </div>

      {/* Operação de Campo / Manutenção & Contratos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KpiSectionCard title="Operação de Campo" icon={Truck} kpis={fieldOpsKpis} />
        <KpiSectionCard title="Manutenção & Contratos" icon={Wrench} kpis={maintenanceKpis} />
      </div>

      {/* Fiscal & Contábil / Cadastros & Estrutura */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KpiSectionCard title="Fiscal & Contábil" icon={Landmark} kpis={fiscalKpis} />
        <KpiSectionCard title="Cadastros & Estrutura" icon={Building} kpis={registriesKpis} />
      </div>

      {/* Atividade do sistema */}
      <KpiSectionCard title="Atividade do Sistema (hoje)" icon={Activity} kpis={activityKpis} />

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAssets assets={assets} />
        <ExternalLinks />
      </div>
    </div>
  );
}
