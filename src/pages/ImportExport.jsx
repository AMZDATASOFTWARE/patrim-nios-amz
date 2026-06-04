import { useState, useRef } from 'react';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Info } from 'lucide-react';
import moment from 'moment';

// Colunas obrigatórias e opcionais do template
const REQUIRED_COLS = ['name', 'category', 'acquisition_value', 'purchase_date', 'depreciation_rate'];
const ALL_COLS = [
  'name', 'category', 'acquisition_value', 'purchase_date', 'depreciation_rate',
  'plaqueta', 'description', 'account', 'cost_center', 'useful_life_years',
  'residual_value', 'depreciation_start_date', 'location', 'status',
  'conservation_state', 'serial_number', 'fiscal_document', 'warranty_expiry_date',
  'next_review_date', 'supplier_name', 'notes'
];

const COL_LABELS = {
  name: 'Descrição do Bem *',
  category: 'Grupo de Patrimônio *',
  acquisition_value: 'Valor de Aquisição (R$) *',
  purchase_date: 'Data de Aquisição (AAAA-MM-DD) *',
  depreciation_rate: 'Taxa de Depreciação Anual (%) *',
  plaqueta: 'Plaqueta / Código',
  description: 'Detalhes Adicionais',
  account: 'Conta Contábil',
  cost_center: 'Centro de Custo',
  useful_life_years: 'Vida Útil (anos)',
  residual_value: 'Valor Residual (R$)',
  depreciation_start_date: 'Início da Depreciação (AAAA-MM-DD)',
  location: 'Localização Física',
  status: 'Status',
  conservation_state: 'Estado de Conservação',
  serial_number: 'Número de Série',
  fiscal_document: 'Número da Nota Fiscal',
  warranty_expiry_date: 'Vencimento da Garantia (AAAA-MM-DD)',
  next_review_date: 'Data da Próxima Revisão (AAAA-MM-DD)',
  supplier_name: 'Fornecedor',
  notes: 'Observações',
};

const SAMPLE_ROWS = [
  ['Notebook Dell Inspiron 15', 'Equipamentos', '4500', '2023-06-01', '20', 'PAT-001', 'Uso administrativo', '', 'TI', '5', '450', '2023-06-01', 'Escritório Central', 'Ativo', 'Bom', 'SN-12345', 'NF-001', '2025-06-01', '', 'Dell Brasil', ''],
  ['Veículo Toyota Corolla', 'Veículos', '95000', '2022-03-15', '20', 'PAT-002', 'Uso da diretoria', '', 'Administrativo', '5', '9500', '2022-03-15', 'Garagem', 'Ativo', 'Ótimo', 'ABC1D234', 'NF-002', '', '', '', ''],
];

const VALID_CATEGORIES = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const VALID_STATUSES = ['Ativo', 'Em Manutenção', 'Inativo', 'Alienado'];
const VALID_STATES = ['Novo', 'Ótimo', 'Bom', 'Regular', 'Ruim'];

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.replace(/\r$/, ''));
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

function validateRow(row, index) {
  const errors = [];
  
  if (!row.name?.trim()) errors.push('Nome obrigatório');
  if (!VALID_CATEGORIES.includes(row.category)) errors.push(`Categoria inválida: "${row.category}". Use: ${VALID_CATEGORIES.join(', ')}`);
  if (!row.acquisition_value || isNaN(parseFloat(row.acquisition_value))) errors.push('Valor de aquisição inválido');
  if (!row.purchase_date || !moment(row.purchase_date, 'YYYY-MM-DD', true).isValid()) errors.push('Data de aquisição inválida (use AAAA-MM-DD)');
  if (!row.depreciation_rate || isNaN(parseFloat(row.depreciation_rate))) errors.push('Taxa de depreciação inválida');
  if (row.status && !VALID_STATUSES.includes(row.status)) errors.push(`Status inválido: "${row.status}"`);
  if (row.conservation_state && !VALID_STATES.includes(row.conservation_state)) errors.push(`Estado inválido: "${row.conservation_state}"`);

  return errors;
}

function rowToAsset(row) {
  return {
    name: row.name?.trim(),
    category: row.category?.trim(),
    acquisition_value: parseFloat(row.acquisition_value),
    purchase_date: row.purchase_date?.trim(),
    depreciation_rate: parseFloat(row.depreciation_rate),
    plaqueta: row.plaqueta?.trim() || undefined,
    description: row.description?.trim() || undefined,
    account: row.account?.trim() || undefined,
    cost_center: row.cost_center?.trim() || undefined,
    useful_life_years: row.useful_life_years ? parseFloat(row.useful_life_years) : undefined,
    residual_value: row.residual_value ? parseFloat(row.residual_value) : undefined,
    depreciation_start_date: row.depreciation_start_date?.trim() || undefined,
    location: row.location?.trim() || undefined,
    status: row.status?.trim() || 'Ativo',
    conservation_state: row.conservation_state?.trim() || undefined,
    serial_number: row.serial_number?.trim() || undefined,
    fiscal_document: row.fiscal_document?.trim() || undefined,
    warranty_expiry_date: row.warranty_expiry_date?.trim() || undefined,
    next_review_date: row.next_review_date?.trim() || undefined,
    supplier_name: row.supplier_name?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
  };
}

export default function ImportExport() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { rows, errors }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { success, failed }
  const fileInputRef = useRef();
  const AssetEntity = useWorkspaceEntity('Asset');

  // ── Exportar template ──────────────────────────────────────────
  const downloadTemplate = () => {
    const header = ALL_COLS.map(c => COL_LABELS[c]).join(';');
    const rows = SAMPLE_ROWS.map(r => r.join(';'));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_ativos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Exportar ativos existentes ──────────────────────────────────
  const exportAssets = async () => {
    const assets = await AssetEntity.list('-created_date', 1000);
    const header = ALL_COLS.map(c => COL_LABELS[c]).join(';');
    const rows = assets.map(a =>
      ALL_COLS.map(col => {
        const v = a[col];
        if (v === null || v === undefined) return '';
        if (typeof v === 'string' && v.includes(';')) return `"${v}"`;
        return v;
      }).join(';')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ativos_${moment().format('YYYYMMDD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Ler arquivo ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const { headers, rows } = parseCSV(text);

      // Verifica colunas obrigatórias (por rótulo)
      const labelToKey = {};
      Object.entries(COL_LABELS).forEach(([k, v]) => { labelToKey[v.replace(' *', '')] = k; });
      
      // Mapeia headers recebidos para chaves internas
      const headerMap = {};
      headers.forEach(h => {
        const clean = h.replace(' *', '');
        const key = Object.entries(COL_LABELS).find(([, label]) => label.replace(' *', '') === clean)?.[0];
        if (key) headerMap[h] = key;
      });

      // Verifica se as colunas obrigatórias estão presentes
      const mappedKeys = Object.values(headerMap);
      const missingRequired = REQUIRED_COLS.filter(k => !mappedKeys.includes(k));
      
      if (missingRequired.length > 0) {
        setPreview({ globalError: `Colunas obrigatórias ausentes: ${missingRequired.map(k => COL_LABELS[k]).join(', ')}` });
        return;
      }

      // Converte linhas para usar chaves internas
      const normalizedRows = rows.map(row => {
        const normalized = {};
        Object.entries(row).forEach(([h, v]) => {
          const key = headerMap[h];
          if (key) normalized[key] = v;
        });
        return normalized;
      }).filter(r => Object.values(r).some(v => v?.trim()));

      // Valida cada linha
      const validated = normalizedRows.map((row, i) => ({
        row,
        errors: validateRow(row, i),
        index: i + 2,
      }));

      setPreview({ validated, totalRows: normalizedRows.length });
    };
    reader.readAsText(f, 'UTF-8');
  };

  // ── Importar ───────────────────────────────────────────────────
  const handleImport = async () => {
    if (!preview?.validated) return;
    setImporting(true);
    
    const validRows = preview.validated.filter(v => v.errors.length === 0);
    let success = 0, failed = 0;

    for (const { row } of validRows) {
      try {
        await AssetEntity.create(rowToAsset(row));
        success++;
      } catch {
        failed++;
      }
    }

    setResult({ success, failed, skipped: preview.validated.filter(v => v.errors.length > 0).length });
    setImporting(false);
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const errorCount = preview?.validated?.filter(v => v.errors.length > 0).length || 0;
  const validCount = preview?.validated?.filter(v => v.errors.length === 0).length || 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Importar / Exportar</h1>
        <p className="text-muted-foreground mt-1">Importe ou exporte ativos via planilha CSV</p>
      </div>

      {/* Export section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Exportar Ativos</h3>
              <p className="text-xs text-muted-foreground">Baixe todos os seus ativos em CSV</p>
            </div>
          </div>
          <Button onClick={exportAssets} variant="outline" className="w-full gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Planilha
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold">Baixar Template</h3>
              <p className="text-xs text-muted-foreground">Planilha com as colunas corretas + exemplos</p>
            </div>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Baixar Template CSV
          </Button>
        </div>
      </div>

      {/* Import section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Importar Planilha</h3>
            <p className="text-xs text-muted-foreground">Aceita apenas CSV no formato do template acima</p>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Colunas obrigatórias:</p>
            <p>{REQUIRED_COLS.map(k => COL_LABELS[k].replace(' *', '')).join(' • ')}</p>
            <p className="mt-1">Categorias válidas: {VALID_CATEGORIES.join(', ')}</p>
            <p>Datas no formato: <strong>AAAA-MM-DD</strong> (ex: 2024-03-15)</p>
          </div>
        </div>

        {/* File picker */}
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">{file ? file.name : 'Clique para selecionar um arquivo CSV'}</p>
          <p className="text-xs text-muted-foreground mt-1">Somente arquivos .csv</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Global error */}
        {preview?.globalError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{preview.globalError}</p>
          </div>
        )}

        {/* Preview */}
        {preview?.validated && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle className="h-4 w-4" /> {validCount} linha(s) válidas
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <AlertCircle className="h-4 w-4" /> {errorCount} linha(s) com erro (serão ignoradas)
                </span>
              )}
            </div>

            {/* Error list */}
            {errorCount > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                {preview.validated.filter(v => v.errors.length > 0).map(({ index, row, errors }) => (
                  <div key={index} className="text-xs text-red-700">
                    <span className="font-semibold">Linha {index} ({row.name || 'sem nome'}):</span> {errors.join('; ')}
                  </div>
                ))}
              </div>
            )}

            {validCount > 0 && (
              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full gap-2"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {importing ? 'Importando...' : `Importar ${validCount} ativo(s)`}
              </Button>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 text-center space-y-2">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-emerald-700 text-lg">Importação concluída!</p>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-emerald-600"><strong>{result.success}</strong> importados</span>
              {result.failed > 0 && <span className="text-red-600"><strong>{result.failed}</strong> com falha</span>}
              {result.skipped > 0 && <span className="text-amber-600"><strong>{result.skipped}</strong> ignorados (erros)</span>}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setResult(null)}>
              Importar outro arquivo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}