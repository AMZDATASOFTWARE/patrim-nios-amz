import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import AutoParameterSuggestion from '@/components/auto-parameters/AutoParameterSuggestion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FlaskConical,
  Pencil,
  PlayCircle,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  approveMonthlyParameterSnapshot,
  createMonthlyParameterSource,
  currentCompetenceMonth,
  deactivateMonthlyParameterSource,
  expireMonthlyParameterSnapshot,
  formatParameterLabel,
  listMonthlyParameterSources,
  normalizeParameterValue,
  reactivateMonthlyParameterSource,
  rejectMonthlyParameterSnapshot,
  refreshMonthlyParameters,
  testMonthlyParameterSource,
  updateMonthlyParameterSource,
} from '@/lib/autoParameters';
import { logAudit } from '@/lib/audit';

const DEFAULT_RATES = {
  'Imóveis': { depreciation_rate: 4, useful_life_years: 25 },
  'Veículos': { depreciation_rate: 20, useful_life_years: 5 },
  'Equipamentos': { depreciation_rate: 10, useful_life_years: 10 },
  'Investimentos': { depreciation_rate: 0, useful_life_years: 0 },
  'Intangíveis': { depreciation_rate: 20, useful_life_years: 5 },
};

const CATEGORIES = Object.keys(DEFAULT_RATES);

const SNAPSHOT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'pending_review', label: 'Pendentes' },
];

function createEmptySnapshotFilters() {
  return {
    competence_month: '',
    domain: 'all',
    status: 'all',
    field_name: '',
    scope_or_category: '',
    source_name: '',
  };
}

const SOURCE_DOMAIN_OPTIONS = [
  { value: 'depreciation', label: 'Depreciação' },
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'ciap', label: 'CIAP' },
  { value: 'vehicle', label: 'Veicular' },
  { value: 'fipe', label: 'FIPE' },
  { value: 'revaluation', label: 'Reavaliação' },
  { value: 'market_reference', label: 'Referência de mercado' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'manual_table', label: 'Tabela manual' },
  { value: 'internal_rule', label: 'Regra interna' },
  { value: 'api', label: 'API cadastrada' },
  { value: 'official_page', label: 'Página oficial' },
  { value: 'ai_research', label: 'Pesquisa assistida por IA' },
];

function createEmptySourceForm() {
  return {
    parameter_key: '',
    domain: 'depreciation',
    source_type: 'manual_table',
    source_name: '',
    source_url: '',
    priority: '100',
    is_active: true,
    parser_config_json: '{}',
    notes: '',
  };
}

function sourceToForm(source) {
  return {
    parameter_key: source?.parameter_key || '',
    domain: source?.domain || 'depreciation',
    source_type: source?.source_type || 'manual_table',
    source_name: source?.source_name || '',
    source_url: source?.source_url || '',
    priority: String(source?.priority ?? 100),
    is_active: source?.is_active !== false,
    parser_config_json: JSON.stringify(source?.parser_config_json || {}, null, 2),
    notes: source?.notes || '',
  };
}

function formatDate(value) {
  if (!value || typeof value !== 'string' || !value.includes('-')) return '-';
  const [year, month, day] = value.split('-');
  return day ? `${day}/${month}/${year}` : `${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

function normalizeStatusLabel(status) {
  const map = {
    running: 'Em andamento',
    success: 'Sucesso',
    partial_success: 'Parcial',
    failed: 'Falhou',
    pending_review: 'Pendente',
    active: 'Ativo',
    rejected: 'Rejeitado',
    expired: 'Expirado',
    draft: 'Rascunho',
    error: 'Erro',
  };
  return map[status] || status || '-';
}

function normalizeDomainLabel(value) {
  return SOURCE_DOMAIN_OPTIONS.find((option) => option.value === value)?.label || value || '-';
}

function normalizeSourceTypeLabel(value) {
  return SOURCE_TYPE_OPTIONS.find((option) => option.value === value)?.label || value || '-';
}

function statusVariant(status) {
  if (status === 'success' || status === 'active') return 'secondary';
  if (status === 'failed' || status === 'rejected' || status === 'error') return 'destructive';
  return 'outline';
}

function confidenceLabel(value) {
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Média';
  return 'Baixa';
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
}

function parseRunErrors(run) {
  const source = parseJsonObject(run?.errors_json);
  return Array.isArray(source?.errors) ? source.errors : [];
}

function formatSnapshotDisplayValue(snapshot) {
  try {
    const normalizedValue = normalizeParameterValue(snapshot.value, snapshot.value_type);
    return formatParameterLabel(normalizedValue, snapshot.value_type, snapshot.unit);
  } catch (_) {
    return 'Valor inválido';
  }
}

function matchesText(value, search) {
  const needle = String(search || '').trim().toLowerCase();
  if (!needle) return true;
  return String(value || '').toLowerCase().includes(needle);
}

function matchesSnapshotFilters(snapshot, filters, expectedStatus) {
  if (filters.status !== 'all' && filters.status !== expectedStatus) return false;
  if (filters.competence_month && snapshot.competence_month !== filters.competence_month) return false;
  if (filters.domain !== 'all' && snapshot.domain !== filters.domain) return false;
  if (!matchesText(snapshot.field_name, filters.field_name)) return false;
  if (!matchesText(`${snapshot.category || ''} ${snapshot.scope_key || ''}`, filters.scope_or_category)) return false;
  if (!matchesText(snapshot.source_name, filters.source_name)) return false;
  return true;
}

function buildSourcePayload(sourceForm) {
  return {
    parameter_key: sourceForm.parameter_key.trim(),
    domain: sourceForm.domain,
    source_type: sourceForm.source_type,
    source_name: sourceForm.source_name.trim(),
    source_url: sourceForm.source_url.trim(),
    priority: sourceForm.priority.trim(),
    is_active: sourceForm.is_active,
    parser_config_json: sourceForm.parser_config_json.trim() || '{}',
    notes: sourceForm.notes.trim(),
  };
}

function formatTestResultSummary(testResult) {
  if (!testResult) return '';
  if (!testResult.ok) {
    return testResult.error || 'Não foi possível testar a fonte.';
  }
  return testResult.summary || `${testResult.simulated_snapshots || 0} snapshot(s) simulados sem persistência.`;
}

function buildCategoryScopeKey(category) {
  return `category:${category}`;
}

function sourceParserPlaceholder(sourceType) {
  if (sourceType === 'api') {
    return `{
  "endpoint_url": "https://api.exemplo.com/parametros",
  "method": "GET",
  "timeout_ms": 10000,
  "headers": [
    {
      "name": "Authorization",
      "secret_name": "PARAMETER_API_KEY",
      "prefix": "Bearer "
    }
  ],
  "query": {
    "competence_month": "{{competence_month}}",
    "domain": "{{domain}}"
  },
  "items_path": "data.items",
  "field_map": {
    "parameter_key": "key",
    "domain": "domain",
    "entity_type": "entity_type",
    "field_name": "field_name",
    "scope_key": "scope_key",
    "category": "category",
    "value": "value",
    "value_type": "value_type",
    "unit": "unit",
    "effective_start_date": "effective_start_date",
    "confidence_level": "confidence_level",
    "notes": "notes"
  }
}`;
  }

  if (sourceType === 'internal_rule') {
    return `{
  "rules": [
    {
      "parameter_key": "depreciation.vehicles.useful_life",
      "domain": "depreciation",
      "entity_type": "Asset",
      "field_name": "useful_life_years",
      "scope_key": "category:veiculos",
      "category": "veiculos",
      "value": 5,
      "value_type": "decimal",
      "unit": "anos",
      "effective_start_date": "2026-01-01",
      "confidence_level": "high"
    }
  ]
}`;
  }

  if (sourceType === 'official_page') {
    return `{
  "url": "https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58",
  "allowed_domain": "cpc.org.br",
  "parameter_key": "depreciation.cpc27.policy_reference",
  "domain": "depreciation",
  "entity_type": "DepreciationConfig",
  "field_name": "depreciation_policy_reference",
  "scope_key": "policy:cpc27",
  "extraction_mode": "summary",
  "expected_value_type": "text",
  "unit": "",
  "confidence_level": "medium",
  "requires_manual_review": true,
  "prompt": "Resuma apenas pontos aplicaveis a vida util, valor residual e depreciacao. Nao transforme norma textual em taxa numerica."
}`;
  }

  return `{
  "items": [
    {
      "parameter_key": "depreciation.vehicles.rate",
      "domain": "depreciation",
      "entity_type": "Asset",
      "field_name": "depreciation_rate",
      "scope_key": "category:veiculos",
      "category": "veiculos",
      "value": 20,
      "value_type": "percent",
      "unit": "%",
      "effective_start_date": "2026-01-01",
      "confidence_level": "high"
    }
  ]
}`;
}

export default function Settings() {
  const [configs, setConfigs] = useState({});
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyAction, setMonthlyAction] = useState('');
  const [latestRun, setLatestRun] = useState(null);
  const [monthlySources, setMonthlySources] = useState([]);
  const [activeSnapshots, setActiveSnapshots] = useState([]);
  const [pendingSnapshots, setPendingSnapshots] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [sourceForm, setSourceForm] = useState(createEmptySourceForm());
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceRowActionId, setSourceRowActionId] = useState('');
  const [snapshotActionId, setSnapshotActionId] = useState('');
  const [sourceDialogTestLoading, setSourceDialogTestLoading] = useState(false);
  const [sourceDialogTestResult, setSourceDialogTestResult] = useState(null);
  const [lastSourceTestResult, setLastSourceTestResult] = useState(null);
  const [snapshotFilters, setSnapshotFilters] = useState(createEmptySnapshotFilters());
  const [snapshotDetail, setSnapshotDetail] = useState(null);
  const [rejectSnapshot, setRejectSnapshot] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const { user } = useAuth();
  const ConfigEntity = useWorkspaceEntity('DepreciationConfig');
  const RunEntity = useWorkspaceEntity('MonthlyParameterRun');
  const SnapshotEntity = useWorkspaceEntity('MonthlyParameterSnapshot');

  const canManageSources = user?.is_platform_admin === true;

  useEffect(() => {
    ConfigEntity.list().then((data) => {
      const map = {};
      const recMap = {};
      data.forEach((record) => {
        map[record.category] = {
          depreciation_rate: record.depreciation_rate,
          useful_life_years: record.useful_life_years,
        };
        recMap[record.category] = record.id;
      });

      const initial = {};
      CATEGORIES.forEach((category) => {
        initial[category] = map[category] || { ...DEFAULT_RATES[category] };
      });

      setConfigs(initial);
      setRecords(recMap);
    });
  }, [ConfigEntity]);

  useEffect(() => {
    loadMonthlyData();
  }, [canManageSources]);

  const loadMonthlyData = async () => {
    setMonthlyLoading(true);
    try {
      const [runs, active, pending, sourcesResult] = await Promise.all([
        RunEntity.list('-started_at', 10).catch(() => []),
        SnapshotEntity.filter({ status: 'active' }, '-retrieved_at', 25).catch(() => []),
        SnapshotEntity.filter({ status: 'pending_review' }, '-retrieved_at', 25).catch(() => []),
        canManageSources
          ? listMonthlyParameterSources().catch(() => ({ ok: false, sources: [] }))
          : Promise.resolve({ ok: true, sources: [] }),
      ]);

      const sortedRuns = [...runs].sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')));
      setLatestRun(sortedRuns[0] || null);
      setActiveSnapshots(active);
      setPendingSnapshots(pending);
      setMonthlySources(sourcesResult.ok ? sourcesResult.sources || [] : []);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const activeSourceCount = useMemo(
    () => monthlySources.filter((source) => source.is_active).length,
    [monthlySources],
  );

  const latestRunErrors = parseRunErrors(latestRun);
  const filteredActiveSnapshots = useMemo(
    () => activeSnapshots.filter((snapshot) => matchesSnapshotFilters(snapshot, snapshotFilters, 'active')),
    [activeSnapshots, snapshotFilters],
  );
  const filteredPendingSnapshots = useMemo(
    () => pendingSnapshots.filter((snapshot) => matchesSnapshotFilters(snapshot, snapshotFilters, 'pending_review')),
    [pendingSnapshots, snapshotFilters],
  );

  const handleChange = (category, field, value) => {
    const numberValue = parseFloat(value) || 0;
    setConfigs((previous) => {
      const updated = { ...previous[category], [field]: numberValue };
      if (field === 'depreciation_rate') {
        updated.useful_life_years = numberValue > 0 ? parseFloat((100 / numberValue).toFixed(1)) : 0;
      }
      if (field === 'useful_life_years') {
        updated.depreciation_rate = numberValue > 0 ? parseFloat((100 / numberValue).toFixed(1)) : 0;
      }
      return { ...previous, [category]: updated };
    });
  };

  const handleApplyConfigAutoSuggestion = async (category, fieldName, suggestion) => {
    const previousValue = configs[category]?.[fieldName] ?? '';
    const nextValue = normalizeParameterValue(
      suggestion?.value,
      fieldName === 'depreciation_rate' ? 'percent' : 'decimal',
    );

    // Aplicacao em Settings e campo a campo: nao recalcula o par taxa/vida util,
    // pois cada campo pode ter snapshot mensal proprio e fonte diferente.
    setConfigs((previous) => ({
      ...previous,
      [category]: {
        ...previous[category],
        [fieldName]: nextValue,
      },
    }));

    await logAudit({
      action: 'updated',
      entity_type: 'DepreciationConfig',
      entity_id: records[category] || '',
      entity_label: category,
      summary: `Aplicou indicacao automatica padrao em "${fieldName}" para a categoria "${category}"`,
      old_data: {
        category,
        field_name: fieldName,
        previous_value: previousValue,
      },
      new_data: {
        category,
        field_name: fieldName,
        suggested_value: nextValue,
        source_name: suggestion?.source_name || '',
        snapshot_id: suggestion?.snapshot_id || '',
        competence_month: suggestion?.competence_month || '',
      },
    });

    toast.success('Sugestao aplicada ao padrao da categoria. Revise antes de salvar.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const category of CATEGORIES) {
        const data = {
          category,
          depreciation_rate: configs[category].depreciation_rate,
          useful_life_years: configs[category].useful_life_years,
        };

        if (records[category]) {
          await ConfigEntity.update(records[category], data);
        } else {
          const created = await ConfigEntity.create(data);
          setRecords((previous) => ({ ...previous, [category]: created.id }));
        }
      }

      toast.success('Configurações salvas.');
    } finally {
      setSaving(false);
    }
  };

  const executeMonthlyRefresh = async (dryRun) => {
    if (!canManageSources) {
      toast.error('Você não tem permissão para atualizar parâmetros automáticos.');
      return;
    }

    setMonthlyAction(dryRun ? 'dry_run' : 'refresh');
    if (!dryRun) setSimulationResult(null);

    const result = await refreshMonthlyParameters({
      competence_month: currentCompetenceMonth(),
      dry_run: dryRun,
    });

    setMonthlyAction('');

    if (!result.ok) {
      toast.error(result.error || 'Não foi possível atualizar a base mensal de parâmetros.');
      return;
    }

    if (dryRun) {
      setSimulationResult(result);
      toast.success(result.summary || 'Simulação concluída.');
      return;
    }

    toast.success(result.summary || 'Parâmetros automáticos atualizados.');
    await loadMonthlyData();
  };

  const openCreateSourceDialog = () => {
    setEditingSource(null);
    setSourceForm(createEmptySourceForm());
    setSourceDialogTestResult(null);
    setSourceDialogOpen(true);
  };

  const openEditSourceDialog = (source) => {
    setEditingSource(source);
    setSourceForm(sourceToForm(source));
    setSourceDialogTestResult(null);
    setSourceDialogOpen(true);
  };

  const handleSourceSubmit = async () => {
    setSourceSaving(true);
    try {
      const payload = buildSourcePayload(sourceForm);
      const result = editingSource
        ? await updateMonthlyParameterSource(editingSource.id, payload)
        : await createMonthlyParameterSource(payload);

      if (!result.ok) {
        toast.error(result.error || 'Não foi possível salvar a fonte mensal.');
        return;
      }

      toast.success(editingSource ? 'Fonte mensal atualizada.' : 'Fonte mensal criada.');
      setSourceDialogOpen(false);
      setEditingSource(null);
      setSourceForm(createEmptySourceForm());
      setSourceDialogTestResult(null);
      await loadMonthlyData();
    } finally {
      setSourceSaving(false);
    }
  };

  const handleDialogSourceTest = async () => {
    setSourceDialogTestLoading(true);
    try {
      const payload = buildSourcePayload(sourceForm);
      const result = await testMonthlyParameterSource({
        id: editingSource?.id || '',
        source: payload,
        competence_month: currentCompetenceMonth(),
      });

      setSourceDialogTestResult(result);
      if (result.ok) {
        toast.success(result.summary || 'Fonte testada sem persistência.');
        return;
      }

      toast.error(result.error || 'Não foi possível testar a fonte.');
    } finally {
      setSourceDialogTestLoading(false);
    }
  };

  const handleRowSourceTest = async (source) => {
    setSourceRowActionId(`test:${source.id}`);
    try {
      const result = await testMonthlyParameterSource({
        id: source.id,
        competence_month: currentCompetenceMonth(),
      });

      setLastSourceTestResult({
        ...result,
        source_name: source.source_name,
        source_id: source.id,
      });

      if (result.ok) {
        toast.success(result.summary || 'Fonte testada sem persistência.');
        return;
      }

      toast.error(result.error || 'Não foi possível testar a fonte.');
    } finally {
      setSourceRowActionId('');
    }
  };

  const handleToggleSource = async (source) => {
    setSourceRowActionId(`toggle:${source.id}`);
    try {
      const result = source.is_active
        ? await deactivateMonthlyParameterSource(source.id)
        : await reactivateMonthlyParameterSource(source.id);

      if (!result.ok) {
        toast.error(result.error || 'Não foi possível alterar o status da fonte.');
        return;
      }

      toast.success(source.is_active ? 'Fonte mensal inativada.' : 'Fonte mensal reativada.');
      await loadMonthlyData();
    } finally {
      setSourceRowActionId('');
    }
  };

  const handleApproveSnapshot = async (snapshot) => {
    setSnapshotActionId(`approve:${snapshot.id}`);
    try {
      const result = await approveMonthlyParameterSnapshot(snapshot.id);
      if (!result.ok) {
        toast.error(result.error || 'Nao foi possivel aprovar o snapshot.');
        return;
      }

      toast.success(result.message || 'Snapshot aprovado.');
      await loadMonthlyData();
    } finally {
      setSnapshotActionId('');
    }
  };

  const handleRejectSnapshot = async (snapshot) => {
    setRejectSnapshot(snapshot);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmRejectSnapshot = async () => {
    if (!rejectSnapshot) return;
    if (!rejectReason.trim()) {
      setRejectError('Informe um motivo para rejeitar o snapshot.');
      return;
    }

    setRejectLoading(true);
    setSnapshotActionId(`reject:${rejectSnapshot.id}`);
    try {
      const result = await rejectMonthlyParameterSnapshot(rejectSnapshot.id, rejectReason.trim());
      if (!result.ok) {
        setRejectError(result.error || 'Nao foi possivel rejeitar o snapshot.');
        return;
      }

      toast.success(result.message || 'Snapshot rejeitado.');
      setRejectSnapshot(null);
      setRejectReason('');
      setRejectError('');
      await loadMonthlyData();
    } finally {
      setRejectLoading(false);
      setSnapshotActionId('');
    }
  };

  const handleExpireSnapshot = async (snapshot) => {
    const confirmed = window.confirm('Expirar este snapshot ativo? Ele deixara de ser usado pela Indicacao automatica.');
    if (!confirmed) return;

    setSnapshotActionId(`expire:${snapshot.id}`);
    try {
      const result = await expireMonthlyParameterSnapshot(snapshot.id);
      if (!result.ok) {
        toast.error(result.error || 'Nao foi possivel expirar o snapshot.');
        return;
      }

      toast.success(result.message || 'Snapshot expirado.');
      await loadMonthlyData();
    } finally {
      setSnapshotActionId('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Defina as taxas de depreciação padrão por categoria
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-card-foreground">Depreciação por Categoria</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Estes valores são usados como padrão ao cadastrar novos ativos. Alterar aqui não afeta ativos já cadastrados.
        </p>

        <p className="text-xs text-muted-foreground">
          A IndicaÃ§Ã£o automÃ¡tica consulta a base mensal de parÃ¢metros para sugerir padrÃµes por categoria; ela nÃ£o aplica nada sem confirmaÃ§Ã£o.
        </p>

        <div className="divide-y divide-border">
          {CATEGORIES.map((category) => (
            <div key={category} className="py-4 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
              <div>
                <p className="font-medium text-card-foreground">{category}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Taxa Anual (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={configs[category]?.depreciation_rate ?? ''}
                  onChange={(event) => handleChange(category, 'depreciation_rate', event.target.value)}
                  className="mt-1"
                />
                <AutoParameterSuggestion
                  entityType="DepreciationConfig"
                  fieldName="depreciation_rate"
                  domain="depreciation"
                  context={{
                    category,
                    scope_key: buildCategoryScopeKey(category),
                    parameter_key: 'depreciation_rate',
                  }}
                  onApply={(suggestion) => handleApplyConfigAutoSuggestion(category, 'depreciation_rate', suggestion)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vida Útil (anos)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={configs[category]?.useful_life_years ?? ''}
                  onChange={(event) => handleChange(category, 'useful_life_years', event.target.value)}
                  className="mt-1"
                />
                <AutoParameterSuggestion
                  entityType="DepreciationConfig"
                  fieldName="useful_life_years"
                  domain="depreciation"
                  context={{
                    category,
                    scope_key: buildCategoryScopeKey(category),
                    parameter_key: 'useful_life_years',
                  }}
                  onApply={(suggestion) => handleApplyConfigAutoSuggestion(category, 'useful_life_years', suggestion)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-card-foreground">Base mensal de parâmetros</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Governança das fontes, execuções mensais e snapshots usados pela IA e pela Indicação automática.
            </p>
            {!canManageSources && (
              <p className="text-xs text-muted-foreground mt-2">
                A atualização manual e a gestão detalhada das fontes estão disponíveis apenas para administrador da plataforma.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              A permissão real é validada na function do backend. O bloqueio da interface é apenas apoio de UX.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageSources && (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={openCreateSourceDialog}
              >
                <Plus className="h-4 w-4" />
                Nova fonte
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={monthlyAction !== '' || !canManageSources}
              onClick={() => executeMonthlyRefresh(true)}
            >
              <PlayCircle className="h-4 w-4" />
              {monthlyAction === 'dry_run' ? 'Simulando...' : 'Simular atualização'}
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={monthlyAction !== '' || !canManageSources}
              onClick={() => executeMonthlyRefresh(false)}
            >
              <RefreshCw className={`h-4 w-4 ${monthlyAction === 'refresh' ? 'animate-spin' : ''}`} />
              {monthlyAction === 'refresh' ? 'Atualizando...' : 'Atualizar parâmetros agora'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-y border-border py-4 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Competência atual</p>
            <p className="font-medium text-card-foreground">{formatDate(`${currentCompetenceMonth()}-01`)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Última execução</p>
            <p className="font-medium text-card-foreground">{latestRun ? formatDateTime(latestRun.started_at) : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            {latestRun ? (
              <Badge variant={statusVariant(latestRun.status)}>{normalizeStatusLabel(latestRun.status)}</Badge>
            ) : (
              <p className="font-medium text-card-foreground">-</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fontes ativas</p>
            <p className="font-medium text-card-foreground">{canManageSources ? activeSourceCount : '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Snapshots pendentes</p>
            <p className="font-medium text-card-foreground">{pendingSnapshots.length}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-card-foreground">Última execução mensal</h3>
            <p className="text-sm text-muted-foreground">
              Resumo da última atualização persistida para este workspace.
            </p>
          </div>

          {monthlyLoading ? (
            <p className="text-sm text-muted-foreground">Carregando base mensal de parâmetros...</p>
          ) : latestRun ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Competência</p>
                  <p className="font-medium text-card-foreground">{latestRun.competence_month || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Criados</p>
                  <p className="font-medium text-card-foreground">{latestRun.parameters_created ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                  <p className="font-medium text-card-foreground">{latestRun.parameters_updated ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inalterados</p>
                  <p className="font-medium text-card-foreground">{latestRun.parameters_unchanged ?? 0}</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>{latestRun.summary || 'Sem resumo disponível.'}</p>
                <p className="mt-1">Finalizada em {formatDateTime(latestRun.finished_at)}</p>
              </div>

              {latestRunErrors.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="font-medium text-amber-900">Erros resumidos</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-900">
                    {latestRunErrors.slice(0, 5).map((error, index) => (
                      <li key={`run-error-${index}`}>
                        {error?.source_name ? `${error.source_name}: ` : ''}
                        {error?.message || 'Falha não detalhada.'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma execução mensal encontrada para este workspace.</p>
          )}

          {simulationResult && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <p className="font-medium text-card-foreground">Última simulação</p>
              <p className="text-muted-foreground mt-1">{simulationResult.summary || 'Simulação executada.'}</p>
              <p className="text-muted-foreground mt-1">
                Status: {normalizeStatusLabel(simulationResult.status)} | Persistiu dados: {simulationResult.persisted ? 'Sim' : 'Não'}
              </p>
              <p className="text-muted-foreground mt-1">
                Criados: {simulationResult.parameters_created ?? 0} | Atualizados: {simulationResult.parameters_updated ?? 0} | Inalterados: {simulationResult.parameters_unchanged ?? 0}
              </p>
              {Array.isArray(simulationResult.errors) && simulationResult.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {simulationResult.errors.slice(0, 5).map((error, index) => (
                    <li key={`dry-run-error-${index}`}>
                      {error?.source_name ? `${error.source_name}: ` : ''}
                      {error?.message || 'Falha não detalhada.'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {lastSourceTestResult && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${lastSourceTestResult.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className="font-medium text-card-foreground">
                Último teste de fonte{lastSourceTestResult.source_name ? `: ${lastSourceTestResult.source_name}` : ''}
              </p>
              <p className="text-muted-foreground mt-1">{formatTestResultSummary(lastSourceTestResult)}</p>
              {Array.isArray(lastSourceTestResult.preview) && lastSourceTestResult.preview.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {lastSourceTestResult.preview.map((item, index) => (
                    <li key={`source-test-preview-${index}`}>
                      {item.field_name}: {String(item.value)} {item.unit || ''}
                    </li>
                  ))}
                </ul>
              )}
              {Array.isArray(lastSourceTestResult.errors) && lastSourceTestResult.errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-700">
                  {lastSourceTestResult.errors.slice(0, 5).map((error, index) => (
                    <li key={`source-test-error-${index}`}>
                      Item {(error?.index ?? index) + 1}: {error?.message || 'Item rejeitado.'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-6">
          <div>
            <h3 className="font-semibold text-card-foreground">Gestão de fontes</h3>
            <p className="text-sm text-muted-foreground">
              Cadastro controlado das fontes usadas pela atualização mensal. Nunca informe chave secreta em claro; use apenas o nome do secret quando necessário.
            </p>
          </div>

          {canManageSources ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chave</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlySources.length > 0 ? monthlySources.map((source) => {
                  const isTesting = sourceRowActionId === `test:${source.id}`;
                  const isToggling = sourceRowActionId === `toggle:${source.id}`;
                  return (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.parameter_key}</TableCell>
                      <TableCell>{normalizeDomainLabel(source.domain)}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>{source.source_name}</p>
                          <p className="text-xs text-muted-foreground break-all">{source.source_url || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{normalizeSourceTypeLabel(source.source_type)}</TableCell>
                      <TableCell>{source.priority ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={source.is_active ? 'secondary' : 'outline'}>
                          {source.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => openEditSourceDialog(source)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={isTesting}
                            onClick={() => handleRowSourceTest(source)}
                          >
                            <FlaskConical className={`h-3.5 w-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
                            {isTesting ? 'Testando...' : 'Testar fonte'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={isToggling}
                            onClick={() => handleToggleSource(source)}
                          >
                            {source.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            {source.is_active ? 'Inativar' : 'Reativar'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Nenhuma fonte mensal cadastrada neste workspace.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              As fontes mensais são tratadas como dado sensível. Somente administrador da plataforma pode visualizar, cadastrar ou testar esse catálogo.
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="font-semibold text-card-foreground">Filtros de snapshots</h3>
            <p className="text-sm text-muted-foreground">
              Refine a analise por competencia, dominio, status, campo, escopo/categoria e fonte.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Competencia</Label>
              <Input
                type="month"
                value={snapshotFilters.competence_month}
                onChange={(event) => setSnapshotFilters((previous) => ({ ...previous, competence_month: event.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Dominio</Label>
              <Select
                value={snapshotFilters.domain}
                onValueChange={(value) => setSnapshotFilters((previous) => ({ ...previous, domain: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {SOURCE_DOMAIN_OPTIONS.map((option) => (
                    <SelectItem key={`snapshot-domain-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={snapshotFilters.status}
                onValueChange={(value) => setSnapshotFilters((previous) => ({ ...previous, status: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SNAPSHOT_STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={`snapshot-status-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Campo</Label>
              <Input
                value={snapshotFilters.field_name}
                onChange={(event) => setSnapshotFilters((previous) => ({ ...previous, field_name: event.target.value }))}
                placeholder="depreciation_rate"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Categoria / escopo</Label>
              <Input
                value={snapshotFilters.scope_or_category}
                onChange={(event) => setSnapshotFilters((previous) => ({ ...previous, scope_or_category: event.target.value }))}
                placeholder="category:veiculos"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Fonte</Label>
              <Input
                value={snapshotFilters.source_name}
                onChange={(event) => setSnapshotFilters((previous) => ({ ...previous, source_name: event.target.value }))}
                placeholder="Nome da fonte"
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSnapshotFilters(createEmptySnapshotFilters())}
            >
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-6">
          <div>
            <h3 className="font-semibold text-card-foreground">Snapshots ativos recentes</h3>
            <p className="text-sm text-muted-foreground">
              Base vigente usada nas sugestões automáticas e no contexto da IA.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActiveSnapshots.length > 0 ? filteredActiveSnapshots.map((snapshot) => {
                const label = formatSnapshotDisplayValue(snapshot);
                return (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">{snapshot.parameter_key}</TableCell>
                    <TableCell>{snapshot.field_name}</TableCell>
                    <TableCell>{label}</TableCell>
                    <TableCell>{snapshot.source_name || '-'}</TableCell>
                    <TableCell>{snapshot.competence_month || '-'}</TableCell>
                    <TableCell>{snapshot.effective_start_date ? formatDate(snapshot.effective_start_date) : '-'}</TableCell>
                    <TableCell>{confidenceLabel(snapshot.confidence_level)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(snapshot.status)}>{normalizeStatusLabel(snapshot.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSnapshotDetail(snapshot)}
                        >
                          Ver detalhes
                        </Button>
                        {canManageSources ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={snapshotActionId === `expire:${snapshot.id}`}
                          onClick={() => handleExpireSnapshot(snapshot)}
                        >
                          {snapshotActionId === `expire:${snapshot.id}` ? 'Expirando...' : 'Expirar'}
                        </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    Nenhum snapshot ativo recente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 border-t border-border pt-6">
          <div>
            <h3 className="font-semibold text-card-foreground">Snapshots pendentes</h3>
            <p className="text-sm text-muted-foreground">
              Pendentes de revisao manual. Administradores podem aprovar ou rejeitar com motivo.
            </p>
            <p className="hidden">
              Pendentes de revisão manual. Aprovação ou rejeição não foi habilitada nesta fase.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPendingSnapshots.length > 0 ? filteredPendingSnapshots.map((snapshot) => {
                const label = formatSnapshotDisplayValue(snapshot);
                return (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">{snapshot.parameter_key}</TableCell>
                    <TableCell>{snapshot.field_name}</TableCell>
                    <TableCell>{label}</TableCell>
                    <TableCell>{snapshot.source_name || '-'}</TableCell>
                    <TableCell>{snapshot.competence_month || '-'}</TableCell>
                    <TableCell>{snapshot.effective_start_date ? formatDate(snapshot.effective_start_date) : '-'}</TableCell>
                    <TableCell>{confidenceLabel(snapshot.confidence_level)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(snapshot.status)}>{normalizeStatusLabel(snapshot.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSnapshotDetail(snapshot)}
                        >
                          Ver detalhes
                        </Button>
                        {canManageSources ? (
                          <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={snapshotActionId === `approve:${snapshot.id}` || snapshotActionId === `reject:${snapshot.id}`}
                            onClick={() => handleApproveSnapshot(snapshot)}
                          >
                            {snapshotActionId === `approve:${snapshot.id}` ? 'Aprovando...' : 'Aprovar'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={snapshotActionId === `approve:${snapshot.id}` || snapshotActionId === `reject:${snapshot.id}`}
                            onClick={() => handleRejectSnapshot(snapshot)}
                          >
                            {snapshotActionId === `reject:${snapshot.id}` ? 'Rejeitando...' : 'Rejeitar'}
                          </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    Nenhum snapshot pendente de revisão.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!snapshotDetail} onOpenChange={(open) => !open && setSnapshotDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do snapshot</DialogTitle>
            <DialogDescription>
              Visualizacao segura do parametro mensal. A carga bruta nao e exibida nesta tela.
            </DialogDescription>
          </DialogHeader>

          {snapshotDetail && (
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Chave</p>
                <p className="font-medium break-all">{snapshotDetail.parameter_key || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Campo</p>
                <p className="font-medium">{snapshotDetail.field_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor formatado</p>
                <p className="font-medium">{formatSnapshotDisplayValue(snapshotDetail)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor bruto</p>
                <p className="font-mono text-xs break-all">{String(snapshotDetail.value ?? '-')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fonte</p>
                <p className="font-medium">{snapshotDetail.source_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">URL da fonte</p>
                {snapshotDetail.source_url ? (
                  <a href={snapshotDetail.source_url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                    {snapshotDetail.source_url}
                  </a>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Competencia</p>
                <p>{snapshotDetail.competence_month || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vigencia</p>
                <p>
                  {snapshotDetail.effective_start_date ? formatDate(snapshotDetail.effective_start_date) : '-'}
                  {snapshotDetail.effective_end_date ? ` a ${formatDate(snapshotDetail.effective_end_date)}` : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confianca</p>
                <p>{confidenceLabel(snapshotDetail.confidence_level)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusVariant(snapshotDetail.status)}>{normalizeStatusLabel(snapshotDetail.status)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aprovado por</p>
                <p>{snapshotDetail.approved_by || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aprovado em</p>
                <p>{snapshotDetail.approved_at ? formatDateTime(snapshotDetail.approved_at) : '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Avisos</p>
                {Array.isArray(snapshotDetail.warnings) && snapshotDetail.warnings.length > 0 ? (
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {snapshotDetail.warnings.map((warning, index) => (
                      <li key={`snapshot-detail-warning-${index}`}>{warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p>-</p>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Observacoes</p>
                <p className="whitespace-pre-wrap">{snapshotDetail.notes || '-'}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSnapshotDetail(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectSnapshot}
        onOpenChange={(open) => {
          if (!open && !rejectLoading) {
            setRejectSnapshot(null);
            setRejectReason('');
            setRejectError('');
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Rejeitar snapshot</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeicao. O snapshot nao sera usado pela Indicacao automatica.
            </DialogDescription>
          </DialogHeader>

          {rejectSnapshot && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="font-medium">{rejectSnapshot.parameter_key}</p>
                <p className="text-muted-foreground">
                  {rejectSnapshot.field_name} · {formatSnapshotDisplayValue(rejectSnapshot)} · {rejectSnapshot.competence_month}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fonte: {rejectSnapshot.source_name || '-'}
                </p>
              </div>

              <div>
                <Label>Motivo da rejeicao</Label>
                <Textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value);
                    setRejectError('');
                  }}
                  placeholder="Explique por que este snapshot nao deve ser aprovado."
                />
                {rejectError && <p className="mt-2 text-sm text-destructive">{rejectError}</p>}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={rejectLoading}
              onClick={() => {
                setRejectSnapshot(null);
                setRejectReason('');
                setRejectError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={rejectLoading}
              onClick={handleConfirmRejectSnapshot}
            >
              {rejectLoading ? 'Rejeitando...' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSource ? 'Editar fonte mensal' : 'Nova fonte mensal'}</DialogTitle>
            <DialogDescription>
              Cadastre apenas referências controladas. Para fontes do tipo API, informe somente o nome do secret.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Chave do parâmetro</Label>
                <Input
                  value={sourceForm.parameter_key}
                  onChange={(event) => setSourceForm((previous) => ({ ...previous, parameter_key: event.target.value }))}
                  placeholder="depreciation_rate"
                />
              </div>

              <div>
                <Label>Nome da fonte</Label>
                <Input
                  value={sourceForm.source_name}
                  onChange={(event) => setSourceForm((previous) => ({ ...previous, source_name: event.target.value }))}
                  placeholder="Tabela societária padrão"
                />
              </div>

              <div>
                <Label>Domínio</Label>
                <Select
                  value={sourceForm.domain}
                  onValueChange={(value) => setSourceForm((previous) => ({ ...previous, domain: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_DOMAIN_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de fonte</Label>
                <Select
                  value={sourceForm.source_type}
                  onValueChange={(value) => setSourceForm((previous) => ({ ...previous, source_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>URL da fonte</Label>
                <Input
                  value={sourceForm.source_url}
                  onChange={(event) => setSourceForm((previous) => ({ ...previous, source_url: event.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={sourceForm.priority}
                  onChange={(event) => setSourceForm((previous) => ({ ...previous, priority: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-card-foreground">Fonte ativa</p>
                <p className="text-xs text-muted-foreground">
                  A rotina mensal e a IA usam apenas fontes cadastradas e ativas.
                </p>
              </div>
              <Switch
                checked={sourceForm.is_active}
                onCheckedChange={(checked) => setSourceForm((previous) => ({ ...previous, is_active: checked }))}
              />
            </div>

            <div>
              <Label>Configuração do parser (JSON)</Label>
              <Textarea
                rows={10}
                value={sourceForm.parser_config_json}
                onChange={(event) => setSourceForm((previous) => ({ ...previous, parser_config_json: event.target.value }))}
                placeholder={sourceParserPlaceholder(sourceForm.source_type)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Não informe token, senha ou API key em claro. Use apenas nomes de secret, como <span className="font-mono">FIPE_API_KEY</span>.
              </p>
              {sourceForm.source_type === 'official_page' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Paginas oficiais usam apenas a URL cadastrada e o allowed_domain informado. A IA nao pesquisa fora da pagina e os snapshots ficam pendentes de revisao.
                </p>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={sourceForm.notes}
                onChange={(event) => setSourceForm((previous) => ({ ...previous, notes: event.target.value }))}
                placeholder="Escopo, vigência, origem interna ou cuidados operacionais."
              />
            </div>

            {sourceDialogTestResult && (
              <div className={`rounded-lg border px-4 py-3 text-sm ${sourceDialogTestResult.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="font-medium text-card-foreground">Resultado do teste</p>
                <p className="text-muted-foreground mt-1">{formatTestResultSummary(sourceDialogTestResult)}</p>
                {Array.isArray(sourceDialogTestResult.preview) && sourceDialogTestResult.preview.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                    {sourceDialogTestResult.preview.map((item, index) => (
                      <li key={`dialog-source-preview-${index}`}>
                        {item.field_name}: {String(item.value)} {item.unit || ''}
                      </li>
                    ))}
                  </ul>
                )}
                {Array.isArray(sourceDialogTestResult.errors) && sourceDialogTestResult.errors.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-700">
                    {sourceDialogTestResult.errors.slice(0, 5).map((error, index) => (
                      <li key={`dialog-source-error-${index}`}>
                        Item {(error?.index ?? index) + 1}: {error?.message || 'Item rejeitado.'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={sourceSaving || sourceDialogTestLoading}
              onClick={handleDialogSourceTest}
            >
              <FlaskConical className="h-4 w-4" />
              {sourceDialogTestLoading ? 'Testando...' : 'Testar fonte'}
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={sourceSaving || sourceDialogTestLoading}
              onClick={handleSourceSubmit}
            >
              <Save className="h-4 w-4" />
              {sourceSaving ? 'Salvando...' : editingSource ? 'Salvar alterações' : 'Criar fonte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
