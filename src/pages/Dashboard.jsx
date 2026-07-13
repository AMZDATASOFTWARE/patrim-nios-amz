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
  computePatrimonioTrend,
  computeAttention,
} from '@/lib/dashboardKpis';
import StatCard from '@/components/dashboard/StatCard';
import KpiSectionCard from '@/components/dashboard/KpiSectionCard';
import AttentionStrip from '@/components/dashboard/AttentionStrip';
import ExpiringItemsWidget from '@/components/dashboard/ExpiringItemsWidget';
import CategoryChart from '@/components/dashboard/CategoryChart';
import DepreciationChart from '@/components/dashboard/DepreciationChart';
import RecentAssets from '@/components/dashboard/RecentAssets';
import ExternalLinks from '@/components/dashboard/ExternalLinks';
import MaintenanceAlerts from '@/components/dashboard/MaintenanceAlerts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import moment from 'moment';
import {
  Building2, TrendingDown, Package, DollarSign, Truck, Wrench, Landmark, Building, Activity,
  ArrowLeftRight, CalendarClock, ClipboardCheck, ClipboardList, LayoutDashboard,
} from 'lucide-react';

// Todas as entidades abaixo têm leitura escopada por workspace_id via RLS
// (algumas — Collaborator/AssetAssignment — também por papel: admin/manager/
// viewer veem tudo do workspace, o papel 'user' só a própria linha). O mesmo
// componente e as mesmas seções renderizam para todos os papéis; a diferença
// de conteúdo nesses dois casos vem inteiramente da RLS já existente, não de
// nenhuma checagem nova aqui. CreditUsage/PricingConfig (dados de dono de
// plataforma) nunca são buscados nesta tela.

// Mapeia cada chave da AttentionStrip para ícone/label/rota (camada de UI).
const ATTENTION_META = {
  transfers: { icon: ArrowLeftRight, label: 'transferências pendentes', to: '/Transfers' },
  maintenance: { icon: Wrench, label: 'manutenções atrasadas', to: '/Maintenance' },
  assignments: { icon: ClipboardCheck, label: 'atribuições atrasadas', to: '/Assets' },
  expirations: { icon: CalendarClock, label: 'vencimentos em 30 dias', to: '/Contracts' },
  inventory: { icon: ClipboardList, label: 'itens de inventário divergentes', to: '/Inventory' },
};

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

  const loadData = (showSpinner = true) => {
    if (!workspaceId) return;
    if (showSpinner) setLoading(true);
    // listAll pagina em lotes de 1000 até trazer tudo — sem corte silencioso nos KPIs.
    Promise.all([
      AssetEntity.listAll(),
      AttachmentEntity.listAll(),
      TransferEntity.listAll(),
      AssignmentEntity.listAll(),
      MaintenanceEntity.listAll(),
      ContractEntity.listAll(),
      CiapEntity.listAll(),
      InventoryItemEntity.listAll(),
      BranchEntity.listAll(),
      SupplierEntity.listAll(),
      CollaboratorEntity.listAll(),
      AuditLogEntity.listAll(),
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
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  // Recarrega em segundo plano quando o usuário volta para a aba/tela —
  // mantém o Dashboard atualizado após mudanças feitas em outras páginas.
  useEffect(() => {
    const onFocus = () => loadData(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
  const trend = computePatrimonioTrend(assets, 12);

  const attentionItems = computeAttention({ transfers, maintenanceRecords, assignments, inventoryItems, expiringItems })
    .map((it) => ({ ...it, ...ATTENTION_META[it.key] }));

  // Distribuição por categoria — via getAssetDepreciation (trata obra em
  // andamento e base fiscal, o que os helpers antigos ignoravam).
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
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="relative">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do patrimônio da sua empresa</p>
        </div>
        {updatedAt && (
          <p className="absolute top-0 right-0 text-[10px] leading-none text-muted-foreground">
            Atualizado {moment(updatedAt).format('DD/MM HH:mm')}
          </p>
        )}
      </div>

      {/* Faixa de atenção (urgente no topo, sempre visível — independe da aba) */}
      <AttentionStrip items={attentionItems} />

      <Tabs defaultValue="geral" className="space-y-3 sm:space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="geral" className="gap-1.5"><LayoutDashboard className="h-4 w-4" />Visão Geral</TabsTrigger>
            <TabsTrigger value="operacao" className="gap-1.5"><Truck className="h-4 w-4" />Operação</TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-1.5"><Landmark className="h-4 w-4" />Fiscal &amp; Contábil</TabsTrigger>
            <TabsTrigger value="cadastros" className="gap-1.5"><Building className="h-4 w-4" />Cadastros</TabsTrigger>
            <TabsTrigger value="ativos" className="gap-1.5"><Package className="h-4 w-4" />Ativos Recentes</TabsTrigger>
          </TabsList>
        </div>

        {/* Visão Geral: os KPIs mais importantes, pensado pra caber sem rolar */}
        <TabsContent value="geral" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <StatCard
              title="Patrimônio Total"
              value={formatCurrency(overview.totals.totalCurrentValue)}
              subtitle="Valor contábil atual"
              icon={Building2}
              size="lg"
              accent
              delta={{ value: trend.deltaPct, up: trend.deltaPct >= 0 }}
              sparklineData={trend.series}
              className="col-span-2"
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
              subtitle={`${overview.totals.activeCount} em uso`}
              icon={Package}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <CategoryChart data={categoryData} />
            <DepreciationChart data={depreciationData} />
          </div>

          <KpiSectionCard
            title="Documentação e Conservação"
            subtitle="Qualidade do cadastro patrimonial"
            icon={Package}
            kpis={overview.kpis}
            size="sm"
          />
        </TabsContent>

        {/* Operação: atividade do dia a dia */}
        <TabsContent value="operacao" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <KpiSectionCard title="Operação de Campo" subtitle="Transferências, termos e inventário" icon={Truck} kpis={fieldOpsKpis} />
            <KpiSectionCard title="Manutenção & Contratos" subtitle="Preventiva, custos e vigências" icon={Wrench} kpis={maintenanceKpis} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <ExpiringItemsWidget items={expiringItems} compact />
            <MaintenanceAlerts assets={assets} compact />
          </div>
        </TabsContent>

        {/* Fiscal & Contábil: consultado com menos frequência, sozinho na aba */}
        <TabsContent value="fiscal">
          <KpiSectionCard
            title="Fiscal & Contábil"
            subtitle="CIAP, PIS/COFINS e base fiscal"
            icon={Landmark}
            kpis={fiscalKpis}
            size="lg"
          />
        </TabsContent>

        {/* Cadastros: estrutural, consultado ocasionalmente */}
        <TabsContent value="cadastros" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <KpiSectionCard title="Cadastros & Estrutura" subtitle="Filiais, setores, fornecedores e colaboradores" icon={Building} kpis={registriesKpis} />
            <KpiSectionCard title="Atividade do Sistema" subtitle="Movimentações registradas hoje" icon={Activity} kpis={activityKpis} />
          </div>
        </TabsContent>

        {/* Ativos Recentes: referência */}
        <TabsContent value="ativos" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <RecentAssets assets={assets} />
            <ExternalLinks />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}