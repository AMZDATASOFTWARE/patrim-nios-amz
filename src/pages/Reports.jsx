import { useState, useEffect } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Table } from 'lucide-react';
import {
  formatCurrency, calculateCurrentValue, calculateAccumulatedDepreciation,
  calculateMonthlyDepreciation, getUsefulLifeFromRate
} from '@/lib/depreciation';
import moment from 'moment';
import jsPDF from 'jspdf';

const categories = ['Todas', 'Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];

export default function Reports() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [costCenterFilter, setCostCenterFilter] = useState('Todos');
  const [generating, setGenerating] = useState(false);
  const AssetEntity = useWorkspaceEntity('Asset');

  useEffect(() => {
    const load = async () => {
      const data = await AssetEntity.list('-created_date', 200);
      setAssets(data);
      setLoading(false);
    };
    load();
  }, []);

  const costCenters = ['Todos', ...Array.from(new Set(assets.map(a => a.cost_center).filter(Boolean)))];

  const filteredAssets = assets.filter(a => {
    const matchCat = categoryFilter === 'Todas' || a.category === categoryFilter;
    const matchCC = costCenterFilter === 'Todos' || a.cost_center === costCenterFilter;
    return matchCat && matchCC;
  });

  const getRows = () => {
    return filteredAssets.map((asset) => {
      const usefulLife = asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate);
      return {
        name: asset.name,
        category: asset.category,
        location: asset.location || '-',
        status: asset.status || 'Ativo',
        purchaseDate: moment(asset.purchase_date).format('DD/MM/YYYY'),
        acquisitionValue: asset.acquisition_value,
        accumulated: calculateAccumulatedDepreciation(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife),
        currentValue: calculateCurrentValue(asset.purchase_date, asset.acquisition_value, asset.residual_value || 0, usefulLife),
        monthly: calculateMonthlyDepreciation(asset.acquisition_value, asset.residual_value || 0, usefulLife),
        depRate: asset.depreciation_rate,
      };
    });
  };

  const exportPDF = () => {
    setGenerating(true);
    const rows = getRows();
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
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
    
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Exporte relatórios do patrimônio em PDF ou Excel</p>
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
          className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all text-left group"
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
          className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all text-left group"
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
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
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