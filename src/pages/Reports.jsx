import { useState, useEffect, useMemo } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Table, AlertTriangle, ImageOff, Clock, LayoutGrid, RectangleHorizontal, RectangleVertical, ScrollText } from 'lucide-react';
import { formatCurrency, getAssetDepreciation } from '@/lib/depreciation';
import { REPORT_CATALOG, REPORT_GROUPS, generateTablePDF, generateAssetSheet } from '@/lib/reportCatalog';
import moment from 'moment';
import jsPDF from 'jspdf';

const categories = ['Todas', 'Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const STALE_DAYS = 90;

export default function Reports() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [costCenterFilter, setCostCenterFilter] = useState('Todos');
  const [generating, setGenerating] = useState(false);
  const AssetEntity = useWorkspaceEntity('Asset');
  const LocationEntity = useWorkspaceEntity('LocationHistory');
  const AttachmentEntity = useWorkspaceEntity('AssetAttachment');
  const RevaluationEntity = useWorkspaceEntity('AssetRevaluation');
  const DisposalEntity = useWorkspaceEntity('AssetDisposal');
  const LoanEntity = useWorkspaceEntity('AssetLoan');
  const AssignmentEntity = useWorkspaceEntity('AssetAssignment');
  const BranchEntity = useWorkspaceEntity('Branch');
  const SectorEntity = useWorkspaceEntity('Sector');
  const InventoryItemEntity = useWorkspaceEntity('InventoryItem');
  const { workspace } = useWorkspace();
  const { workspaceId } = AssetEntity;
  const [locationLatest, setLocationLatest] = useState({});
  const [attachmentAssetIds, setAttachmentAssetIds] = useState(new Set());

  // Dataset do catálogo de relatórios — carregado uma vez, reaproveitado por todos os cards.
  const [catalogData, setCatalogData] = useState({
    revaluations: [], disposals: [], loans: [], assignments: [], branches: [], sectors: [], inventoryItems: [],
  });

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    AssetEntity.listAll('-created_date').then(data => {
      setAssets(data);
      setLoading(false);
    });
    // Última movimentação conhecida por ativo (para o relatório de "parados").
    LocationEntity.listAll('-scanned_at').then((rows) => {
      const latest = {};
      rows.forEach((r) => {
        if (!r.asset_id) return;
        if (!latest[r.asset_id] || r.scanned_at > latest[r.asset_id]) latest[r.asset_id] = r.scanned_at;
      });
      setLocationLatest(latest);
    }).catch(() => {});
    // Ativos que possuem ao menos um anexo (para o relatório "sem foto/documento").
    AttachmentEntity.listAll('-uploaded_at').then((rows) => {
      setAttachmentAssetIds(new Set(rows.map((r) => r.asset_id)));
    }).catch(() => {});

    // Dados do catálogo de relatórios (Onda 5) — mesmas fontes já usadas nas telas dedicadas.
    Promise.all([
      RevaluationEntity.listAll('-revaluation_date').catch(() => []),
      DisposalEntity.listAll('-disposal_date').catch(() => []),
      LoanEntity.listAll('-loan_date').catch(() => []),
      AssignmentEntity.listAll('-assignment_date').catch(() => []),
      BranchEntity.listAll('-created_date').catch(() => []),
      SectorEntity.listAll('name').catch(() => []),
      InventoryItemEntity.listAll('-counted_at').catch(() => []),
    ]).then(([revaluations, disposals, loans, assignments, branches, sectors, inventoryItems]) => {
      setCatalogData({ revaluations, disposals, loans, assignments, branches, sectors, inventoryItems });
    });
  }, [workspaceId]);

  const costCenters = ['Todos', ...Array.from(new Set(assets.map(a => a.cost_center).filter(Boolean)))];

  const filteredAssets = assets.filter(a => {
    const matchCat = categoryFilter === 'Todas' || a.category === categoryFilter;
    const matchCC = costCenterFilter === 'Todos' || a.cost_center === costCenterFilter;
    return matchCat && matchCC;
  });

  const getRows = () => {
    return filteredAssets.map((asset) => {
      const dep = getAssetDepreciation(asset);
      return {
        name: asset.name,
        category: asset.category,
        location: asset.location || '-',
        status: asset.status || 'Ativo',
        purchaseDate: moment(asset.purchase_date).format('DD/MM/YYYY'),
        acquisitionValue: asset.acquisition_value,
        accumulated: dep.accumulated,
        currentValue: dep.currentValue,
        monthly: dep.monthly,
        depRate: asset.depreciation_rate,
      };
    });
  };

  const exportPDF = () => {
    setGenerating(true);
    const rows = getRows();
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.text('Relatório de Patrimônio Contábil', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm')}`, 14, 28);
    doc.text(`Categoria: ${categoryFilter}`, 14, 34);

    const totalAcq = rows.reduce((s, r) => s + r.acquisitionValue, 0);
    const totalCur = rows.reduce((s, r) => s + r.currentValue, 0);
    const totalDep = rows.reduce((s, r) => s + r.accumulated, 0);

    doc.setFontSize(11);
    doc.text(`Patrimônio Total: ${formatCurrency(totalCur)}`, 14, 42);
    doc.text(`Valor de Aquisição: ${formatCurrency(totalAcq)}`, 14, 48);
    doc.text(`Depreciação Acumulada: ${formatCurrency(totalDep)}`, 14, 54);

    // Table header
    let y = 66;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    const headers = ['Ativo', 'Categoria', 'Local', 'Status', 'Data Compra', 'Valor Aquisição', 'Dep. Acumulada', 'Valor Atual', 'Dep. Mensal'];
    const colWidths = [45, 28, 30, 22, 25, 30, 30, 30, 28];
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });

    // Table rows
    doc.setFont(undefined, 'normal');
    y += 6;
    rows.forEach((row) => {
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      x = 14;
      const vals = [
        row.name.substring(0, 20),
        row.category,
        row.location.substring(0, 15),
        row.status,
        row.purchaseDate,
        formatCurrency(row.acquisitionValue),
        formatCurrency(row.accumulated),
        formatCurrency(row.currentValue),
        formatCurrency(row.monthly),
      ];
      vals.forEach((v, i) => {
        doc.text(String(v), x, y);
        x += colWidths[i];
      });
      y += 5;
    });

    doc.save(`patrimonio_${moment().format('YYYYMMDD')}.pdf`);
    setGenerating(false);
  };

  const exportCSV = () => {
    const rows = getRows();
    const headers = ['Nome', 'Categoria', 'Localização', 'Status', 'Data Compra', 'Valor Aquisição', 'Dep. Acumulada', 'Valor Atual', 'Dep. Mensal', 'Taxa Dep. (%)'];
    const csvRows = [
      headers.join(';'),
      ...rows.map(r => [
        `"${r.name}"`,
        r.category,
        `"${r.location}"`,
        r.status,
        r.purchaseDate,
        r.acquisitionValue.toFixed(2),
        r.accumulated.toFixed(2),
        r.currentValue.toFixed(2),
        r.monthly.toFixed(2),
        r.depRate,
      ].join(';'))
    ];

    const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patrimonio_${moment().format('YYYYMMDD')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const rows = getRows();
  const totalAcq = rows.reduce((s, r) => s + r.acquisitionValue, 0);
  const totalCur = rows.reduce((s, r) => s + r.currentValue, 0);
  const totalDep = rows.reduce((s, r) => s + r.accumulated, 0);

  return (
    <ReportsView
      {...{
        assets, filteredAssets, categories, categoryFilter, setCategoryFilter,
        costCenters, costCenterFilter, setCostCenterFilter, exportPDF, exportCSV,
        generating, rows, totalAcq, totalCur, totalDep, locationLatest, attachmentAssetIds,
        catalogData, workspace,
      }}
    />
  );
}

function ReportsView({
  assets, filteredAssets, categories, categoryFilter, setCategoryFilter,
  costCenters, costCenterFilter, setCostCenterFilter, exportPDF, exportCSV,
  generating, rows, totalAcq, totalCur, totalDep, locationLatest, attachmentAssetIds,
  catalogData, workspace,
}) {
  // Relatórios de auditoria (100% computados sobre o conjunto filtrado).
  const audit = useMemo(() => {
    const fullyDepreciated = [];
    const noAttachment = [];
    const stale = [];
    const staleThreshold = moment().subtract(STALE_DAYS, 'days');
    filteredAssets.forEach((a) => {
      const depPct = getAssetDepreciation(a).depPct;
      if (depPct >= 100 && a.status === 'Ativo') fullyDepreciated.push(a);
      if (!a.photo_url && !a.invoice_url && !attachmentAssetIds.has(a.id)) noAttachment.push(a);
      const last = locationLatest[a.id];
      if (!last || moment(last).isBefore(staleThreshold)) stale.push({ ...a, lastMove: last });
    });
    return { fullyDepreciated, noAttachment, stale };
  }, [filteredAssets, locationLatest, attachmentAssetIds]);

  const exportAuditCSV = (list, cols, filename) => {
    const header = cols.map((c) => c.label).join(';');
    const lines = list.map((a) => cols.map((c) => {
      const v = c.get(a);
      return typeof v === 'string' && v.includes(';') ? `"${v}"` : (v ?? '');
    }).join(';'));
    const blob = new Blob(['﻿' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${moment().format('YYYYMMDD')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Exporte relatórios do patrimônio em PDF ou Excel</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={costCenterFilter} onValueChange={setCostCenterFilter}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              {costCenters.map((cc) => (<SelectItem key={cc} value={cc}>{cc}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={exportPDF}
          disabled={generating || rows.length === 0}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground text-lg">Exportar PDF</h3>
              <p className="text-sm text-muted-foreground">Relatório completo em formato PDF</p>
            </div>
          </div>
        </button>

        <button
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Table className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground text-lg">Exportar Excel/CSV</h3>
              <p className="text-sm text-muted-foreground">Dados tabulares para planilha</p>
            </div>
          </div>
        </button>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Resumo - {categoryFilter}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total de Ativos</p>
            <p className="text-2xl font-bold">{rows.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor de Aquisição</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAcq)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Contábil Atual</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCur)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Depreciação Acumulada</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDep)}</p>
          </div>
        </div>
      </div>

      {/* Relatórios de auditoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AuditReportCard
          icon={AlertTriangle}
          color="amber"
          title="Totalmente depreciados em uso"
          description="Bens 100% depreciados ainda com status Ativo"
          count={audit.fullyDepreciated.length}
          onExport={() => exportAuditCSV(
            audit.fullyDepreciated,
            [
              { label: 'Ativo', get: (a) => a.name },
              { label: 'Plaqueta', get: (a) => a.plaqueta || '' },
              { label: 'Categoria', get: (a) => a.category },
              { label: 'Valor Aquisição', get: (a) => (a.acquisition_value || 0).toFixed(2) },
              { label: 'Valor Residual', get: (a) => (a.residual_value || 0).toFixed(2) },
            ],
            'bens_totalmente_depreciados'
          )}
        />
        <AuditReportCard
          icon={ImageOff}
          color="slate"
          title="Sem foto ou documento"
          description="Bens sem nenhuma foto/anexo cadastrado"
          count={audit.noAttachment.length}
          onExport={() => exportAuditCSV(
            audit.noAttachment,
            [
              { label: 'Ativo', get: (a) => a.name },
              { label: 'Plaqueta', get: (a) => a.plaqueta || '' },
              { label: 'Categoria', get: (a) => a.category },
              { label: 'Localização', get: (a) => a.location || '' },
            ],
            'bens_sem_anexo'
          )}
        />
        <AuditReportCard
          icon={Clock}
          color="blue"
          title={`Parados há mais de ${STALE_DAYS} dias`}
          description="Sem nenhuma movimentação de localização registrada"
          count={audit.stale.length}
          onExport={() => exportAuditCSV(
            audit.stale,
            [
              { label: 'Ativo', get: (a) => a.name },
              { label: 'Plaqueta', get: (a) => a.plaqueta || '' },
              { label: 'Categoria', get: (a) => a.category },
              { label: 'Última movimentação', get: (a) => a.lastMove ? moment(a.lastMove).format('DD/MM/YYYY') : 'nunca' },
            ],
            'bens_parados'
          )}
        />
      </div>

      {/* Catálogo de relatórios — inspirado no menu do PatPro (Onda 5) */}
      <ReportCatalogSection assets={assets} catalogData={catalogData} workspace={workspace} />

      {/* Preview table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-card-foreground">Prévia do Relatório</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left font-semibold p-3">Ativo</th>
                <th className="text-left font-semibold p-3">Categoria</th>
                <th className="text-left font-semibold p-3">Status</th>
                <th className="text-right font-semibold p-3">Valor Aquisição</th>
                <th className="text-right font-semibold p-3">Dep. Acumulada</th>
                <th className="text-right font-semibold p-3">Valor Atual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-3 font-medium">{row.name}</td>
                  <td className="p-3 text-muted-foreground">{row.category}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3 text-right">{formatCurrency(row.acquisitionValue)}</td>
                  <td className="p-3 text-right text-destructive">{formatCurrency(row.accumulated)}</td>
                  <td className="p-3 text-right text-primary font-medium">{formatCurrency(row.currentValue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td className="p-3" colSpan={3}>Total</td>
                <td className="p-3 text-right">{formatCurrency(totalAcq)}</td>
                <td className="p-3 text-right text-destructive">{formatCurrency(totalDep)}</td>
                <td className="p-3 text-right text-primary">{formatCurrency(totalCur)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportCatalogSection({ assets, catalogData, workspace }) {
  const [orientation, setOrientation] = useState('landscape');
  const [sheetAssetId, setSheetAssetId] = useState('');

  const ctx = { assets, ...catalogData };

  const handleGenerate = (entry) => {
    const { columns, rows } = entry.build(ctx);
    generateTablePDF({ title: entry.title, columns, rows, workspace, orientation });
  };

  const handleSheet = () => {
    const asset = assets.find((a) => a.id === sheetAssetId);
    if (!asset) return;
    generateAssetSheet({ asset, workspace, orientation: orientation === 'landscape' ? 'portrait' : orientation });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Catálogo de Relatórios</h2>
            <p className="text-sm text-muted-foreground">Relatórios prontos, um clique — inclui reavaliações, baixas/alienações, empréstimos e conferência de inventário</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setOrientation('landscape')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${orientation === 'landscape' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <RectangleHorizontal className="h-3.5 w-3.5" /> Paisagem
          </button>
          <button
            onClick={() => setOrientation('portrait')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${orientation === 'portrait' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <RectangleVertical className="h-3.5 w-3.5" /> Retrato
          </button>
        </div>
      </div>

      {/* Ficha Individual — caso especial, precisa de um ativo selecionado */}
      <div className="flex items-center gap-3 flex-wrap bg-muted/30 border border-border rounded-lg p-3">
        <ScrollText className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-card-foreground">Ficha Individual</p>
          <p className="text-xs text-muted-foreground">Folha detalhada de 1 ativo específico</p>
        </div>
        <Select value={sheetAssetId} onValueChange={setSheetAssetId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Selecione o ativo" /></SelectTrigger>
          <SelectContent>
            {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-2" disabled={!sheetAssetId} onClick={handleSheet}>
          <Download className="h-4 w-4" /> Gerar
        </Button>
      </div>

      {REPORT_GROUPS.map((group) => {
        const entries = REPORT_CATALOG.filter((r) => r.group === group);
        if (entries.length === 0) return null;
        return (
          <div key={group}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleGenerate(entry)}
                  className="text-left border border-border rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all bg-background"
                >
                  <p className="text-sm font-medium text-card-foreground">{entry.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const AUDIT_COLORS = {
  amber: 'bg-amber-50 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
};

function AuditReportCard({ icon: Icon, color, title, description, count, onExport }) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-5 shadow-sm flex flex-col">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${AUDIT_COLORS[color] || AUDIT_COLORS.slate}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-card-foreground text-sm leading-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-end justify-between mt-4">
        <p className="text-3xl font-bold text-card-foreground">{count}</p>
        <Button variant="outline" size="sm" className="gap-2" disabled={count === 0} onClick={onExport}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>
    </div>
  );
}
