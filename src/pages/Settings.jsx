import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import AutoParameterSuggestion from '@/components/auto-parameters/AutoParameterSuggestion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  ExternalLink,
  FlaskConical,
  Plus,
  Save,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  canManageMonthlyParameters,
  createMonthlyParameterSource,
  currentCompetenceMonth,
  listMonthlyParameterSources,
  normalizeParameterValue,
  testMonthlyParameterSource,
} from '@/lib/autoParameters';
import { logAudit } from '@/lib/audit';

const DEFAULT_RATES = {
  'Imóveis': { depreciation_rate: 4, useful_life_years: 25 },
  'Veículos': { depreciation_rate: 20, useful_life_years: 5 },
  Equipamentos: { depreciation_rate: 10, useful_life_years: 10 },
  Investimentos: { depreciation_rate: 0, useful_life_years: 0 },
  Intangíveis: { depreciation_rate: 20, useful_life_years: 5 },
};

const CATEGORIES = Object.keys(DEFAULT_RATES);

const SUGGESTION_FIELDS = [
  { value: 'depreciation_rate', label: 'Taxa anual' },
  { value: 'useful_life_years', label: 'Vida útil' },
  { value: 'both', label: 'Ambos' },
];

const SUGGESTION_CATEGORIES = [
  ...CATEGORIES.map((category) => ({ value: category, label: category })),
  { value: 'all', label: 'Todas' },
];

const TRUSTED_DEPRECIATION_SOURCES = [
  {
    id: 'cpc27',
    source_name: 'CPC 27 - Ativo Imobilizado',
    source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58',
    allowed_domain: 'www.cpc.org.br',
    parameter_key: 'depreciation.cpc27.policy_reference',
    reference_type: 'Norma contábil',
    suggested_fields: 'Política contábil, vida útil, valor residual e revisão anual',
    observation: 'Não é tabela numérica automática; serve como referência normativa.',
    prompt: 'Identifique apenas orientações normativas sobre depreciação, vida útil, valor residual e revisão anual. Não invente taxas ou anos.',
  },
  {
    id: 'cpc23',
    source_name: 'CPC 23 - Mudança de estimativa',
    source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=54',
    allowed_domain: 'www.cpc.org.br',
    parameter_key: 'depreciation.cpc23.estimate_change_reference',
    reference_type: 'Norma contábil',
    suggested_fields: 'Justificativa e revisão de estimativa',
    observation: 'Apoio para alteração de vida útil ou taxa.',
    prompt: 'Identifique orientações sobre mudança de estimativa contábil, revisão prospectiva, vida útil e taxa. Não invente valores.',
  },
  {
    id: 'rfb-in-1700-anexo-iii',
    source_name: 'Receita Federal / IN RFB 1.700 Anexo III',
    source_url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=81268',
    allowed_domain: 'normas.receita.fazenda.gov.br',
    parameter_key: 'depreciation.rfb_in_1700_anexo_iii.reference',
    reference_type: 'Referência fiscal',
    suggested_fields: 'Taxa fiscal e vida útil fiscal por tipo de bem',
    observation: 'Pode apoiar sugestão; propostas da IA exigem revisão humana.',
    prompt: 'Identifique apenas referências de depreciação fiscal relacionadas a taxa e vida útil por tipo de bem. Não extrapole categorias sem base na página.',
  },
  {
    id: 'rir-2018',
    source_name: 'RIR/2018 / Planalto',
    source_url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm',
    allowed_domain: 'www.planalto.gov.br',
    parameter_key: 'depreciation.rir_2018.reference',
    reference_type: 'Base legal complementar',
    suggested_fields: 'Regra fiscal de depreciação',
    observation: 'Referência legal; exige revisão humana antes de uso.',
    prompt: 'Identifique regras gerais de depreciação fiscal aplicáveis ao imobilizado. Não invente taxa, categoria ou vida útil.',
  },
];

function buildCategoryScopeKey(category) {
  return `category:${category}`;
}

function createEmptySiteSuggestionForm() {
  return {
    source_url: '',
    description: '',
    related_field: 'both',
    related_category: 'all',
    parser_config_json: '',
  };
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function normalizeStatusLabel(source) {
  if (!source) return 'Não cadastrada';
  return source.is_active ? 'Cadastrada' : 'Pendente';
}

function sourceLastSeen(source) {
  return source?.updated_date || source?.created_date || source?.retrieved_at || '';
}

function parserConfigForTrustedSource(source) {
  return {
    url: source.source_url,
    allowed_domain: source.allowed_domain || hostFromUrl(source.source_url),
    parameter_key: source.parameter_key,
    domain: 'depreciation',
    entity_type: 'DepreciationConfig',
    field_name: 'depreciation_rate',
    scope_key: `policy:${source.id}`,
    extraction_mode: 'suggestion',
    expected_fields: ['depreciation_rate', 'useful_life_years'],
    allowed_categories: CATEGORIES,
    confidence_level: 'medium',
    requires_manual_review: true,
    default_snapshot_status: 'pending_review',
    output_schema: {
      category: 'string',
      field_name: 'depreciation_rate | useful_life_years',
      suggested_value: 'number',
      value_type: 'percent | decimal',
      unit: '% | anos',
      source_name: 'string',
      source_url: 'string',
      reason: 'string',
      confidence_level: 'low | medium',
      warnings: ['string'],
    },
    prompt: source.prompt,
  };
}

function buildTrustedSourcePayload(source) {
  return {
    parameter_key: source.parameter_key,
    domain: 'depreciation',
    source_type: 'official_page',
    source_name: source.source_name,
    source_url: source.source_url,
    priority: '80',
    is_active: true,
    parser_config_json: JSON.stringify(parserConfigForTrustedSource(source), null, 2),
    notes: `${source.observation} Revisão humana obrigatória antes de aprovar snapshots.`,
  };
}

function buildSuggestedSiteParserConfig(form) {
  const url = form.source_url.trim();
  const relatedField = form.related_field;
  const relatedCategory = form.related_category;
  const requestedFields = relatedField === 'both'
    ? ['depreciation_rate', 'useful_life_years']
    : [relatedField];
  const requestedCategories = relatedCategory === 'all' ? CATEGORIES : [relatedCategory];

  return {
    url,
    allowed_domain: hostFromUrl(url),
    parameter_key: `depreciation.suggested.${hostFromUrl(url) || 'site'}`,
    domain: 'depreciation',
    entity_type: 'DepreciationConfig',
    field_name: requestedFields[0],
    scope_key: relatedCategory === 'all' ? 'category:all' : buildCategoryScopeKey(relatedCategory),
    extraction_mode: 'suggestion',
    expected_fields: requestedFields,
    allowed_categories: requestedCategories,
    confidence_level: 'medium',
    requires_manual_review: true,
    default_snapshot_status: 'pending_review',
    output_schema: {
      category: 'string',
      field_name: 'depreciation_rate | useful_life_years',
      suggested_value: 'number',
      value_type: 'percent | decimal',
      unit: '% | anos',
      source_name: 'string',
      source_url: 'string',
      reason: 'string',
      confidence_level: 'low | medium',
      warnings: ['string'],
    },
    prompt: form.description.trim() || 'Identifique referências para taxa anual e vida útil por categoria. Não invente valores.',
  };
}

function buildSuggestedSitePayload(form) {
  const parserConfig = form.parser_config_json.trim()
    ? JSON.parse(form.parser_config_json)
    : buildSuggestedSiteParserConfig(form);
  const host = hostFromUrl(form.source_url);

  return {
    parameter_key: parserConfig.parameter_key || `depreciation.suggested.${host || 'site'}`,
    domain: 'depreciation',
    source_type: 'official_page',
    source_name: host ? `Site sugerido - ${host}` : 'Site sugerido para depreciação',
    source_url: form.source_url.trim(),
    priority: '120',
    is_active: false,
    parser_config_json: JSON.stringify(parserConfig, null, 2),
    notes: `Site sugerido para IA. Campo relacionado: ${form.related_field}. Categoria relacionada: ${form.related_category}. ${form.description.trim()}`,
  };
}

function parseSourceConfig(source) {
  if (!source?.parser_config_json) return {};
  if (typeof source.parser_config_json === 'object') return source.parser_config_json;
  try {
    return JSON.parse(source.parser_config_json);
  } catch {
    return {};
  }
}

function sourceMatchesTrusted(source, trustedSource) {
  return source.parameter_key === trustedSource.parameter_key || source.source_url === trustedSource.source_url;
}

function isSuggestedDepreciationSource(source) {
  const config = parseSourceConfig(source);
  return (
    source.source_type === 'official_page' &&
    source.domain === 'depreciation' &&
    config.entity_type === 'DepreciationConfig' &&
    !TRUSTED_DEPRECIATION_SOURCES.some((trustedSource) => sourceMatchesTrusted(source, trustedSource))
  );
}

export default function Settings() {
  const [configs, setConfigs] = useState({});
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [monthlySources, setMonthlySources] = useState([]);
  const [sourceActionId, setSourceActionId] = useState('');
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteForm, setSiteForm] = useState(createEmptySiteSuggestionForm());
  const [siteSaving, setSiteSaving] = useState(false);
  const [siteTestResult, setSiteTestResult] = useState(null);
  const [siteTestLoading, setSiteTestLoading] = useState(false);

  const { user } = useAuth();
  const ConfigEntity = useWorkspaceEntity('DepreciationConfig');
  const canManageSources = canManageMonthlyParameters(user);

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
    loadMonthlySources();
  }, [canManageSources]);

  useEffect(() => {
    if (!siteDialogOpen) return;
    if (siteForm.parser_config_json.trim()) return;
    if (!siteForm.source_url.trim()) return;

    setSiteForm((previous) => ({
      ...previous,
      parser_config_json: JSON.stringify(buildSuggestedSiteParserConfig(previous), null, 2),
    }));
  }, [siteDialogOpen, siteForm.source_url, siteForm.description, siteForm.related_field, siteForm.related_category]);

  const loadMonthlySources = async () => {
    if (!canManageSources) {
      setMonthlySources([]);
      setSourceActionId('');
      setSiteTestResult(null);
      return;
    }

    const result = await listMonthlyParameterSources();
    setMonthlySources(result.ok ? result.sources || [] : []);
  };

  const trustedRows = useMemo(
    () => TRUSTED_DEPRECIATION_SOURCES.map((trustedSource) => ({
      trustedSource,
      source: monthlySources.find((source) => sourceMatchesTrusted(source, trustedSource)),
    })),
    [monthlySources],
  );

  const suggestedSources = useMemo(
    () => monthlySources.filter((source) => isSuggestedDepreciationSource(source)),
    [monthlySources],
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

    toast.success('Sugestão aplicada ao padrão da categoria. Revise antes de salvar.');
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

  const handleCreateTrustedSource = async (trustedSource) => {
    setSourceActionId(`create:${trustedSource.id}`);
    try {
      const result = await createMonthlyParameterSource(buildTrustedSourcePayload(trustedSource));
      if (!result.ok) {
        toast.error(result.error || 'Não foi possível cadastrar a fonte.');
        return;
      }
      toast.success('Fonte cadastrada. Execute o teste antes de usar em produção.');
      await loadMonthlySources();
    } finally {
      setSourceActionId('');
    }
  };

  const handleTestSource = async (source) => {
    setSourceActionId(`test:${source.id}`);
    try {
      const result = await testMonthlyParameterSource({
        id: source.id,
        competence_month: currentCompetenceMonth(),
      });
      if (result.ok) {
        toast.success(result.summary || 'Fonte testada sem persistência.');
        return;
      }
      toast.error(result.error || 'Não foi possível testar a fonte.');
    } finally {
      setSourceActionId('');
    }
  };

  const openSiteDialog = () => {
    setSiteForm(createEmptySiteSuggestionForm());
    setSiteTestResult(null);
    setSiteDialogOpen(true);
  };

  const handleSaveSuggestedSite = async () => {
    setSiteSaving(true);
    try {
      const payload = buildSuggestedSitePayload(siteForm);
      const result = await createMonthlyParameterSource(payload);
      if (!result.ok) {
        toast.error(result.error || 'Não foi possível salvar o site sugerido.');
        return;
      }

      toast.success('Site sugerido salvo como fonte pendente. Nenhuma consulta foi executada automaticamente.');
      setSiteDialogOpen(false);
      setSiteForm(createEmptySiteSuggestionForm());
      setSiteTestResult(null);
      await loadMonthlySources();
    } catch (error) {
      toast.error(error?.message || 'Revise a URL e a configuração avançada.');
    } finally {
      setSiteSaving(false);
    }
  };

  const handleTestSuggestedSite = async () => {
    setSiteTestLoading(true);
    try {
      const payload = buildSuggestedSitePayload(siteForm);
      const result = await testMonthlyParameterSource({
        source: payload,
        competence_month: currentCompetenceMonth(),
      });
      setSiteTestResult(result);
      if (result.ok) {
        toast.success(result.summary || 'Fonte testada sem persistência.');
        return;
      }
      toast.error(result.error || 'Não foi possível testar o site sugerido.');
    } catch (error) {
      toast.error(error?.message || 'Revise a URL e a configuração avançada.');
    } finally {
      setSiteTestLoading(false);
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
          A indicação automática consulta a base mensal de parâmetros para sugerir padrões por categoria; ela não aplica nada sem confirmação.
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

      {canManageSources && (
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">Fontes da IA para depreciação</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                A IA consulta fontes confiáveis cadastradas para sugerir taxa anual e vida útil por categoria. Nada é aplicado sem confirmação.
              </p>
            </div>
            <Button type="button" className="gap-2" onClick={openSiteDialog}>
              <Plus className="h-4 w-4" />
              Sugerir outro site para a IA
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonte/site</TableHead>
                <TableHead>Tipo de referência</TableHead>
                <TableHead>Campos sugeridos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última consulta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trustedRows.map(({ trustedSource, source }) => {
                const isCreating = sourceActionId === `create:${trustedSource.id}`;
                const isTesting = sourceActionId === `test:${source?.id}`;
                return (
                  <TableRow key={trustedSource.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-card-foreground">{trustedSource.source_name}</p>
                        <a
                          href={trustedSource.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 break-all text-xs text-primary hover:underline"
                        >
                          {trustedSource.source_url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-muted-foreground">{trustedSource.observation}</p>
                      </div>
                    </TableCell>
                    <TableCell>{trustedSource.reference_type}</TableCell>
                    <TableCell>{trustedSource.suggested_fields}</TableCell>
                    <TableCell>
                      <Badge variant={source?.is_active ? 'secondary' : 'outline'}>{normalizeStatusLabel(source)}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(sourceLastSeen(source))}</TableCell>
                    <TableCell className="text-right">
                      {source ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={isTesting}
                          onClick={() => handleTestSource(source)}
                        >
                          <FlaskConical className={`h-3.5 w-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
                          {isTesting ? 'Testando...' : 'Testar fonte'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isCreating}
                          onClick={() => handleCreateTrustedSource(trustedSource)}
                        >
                          {isCreating ? 'Cadastrando...' : 'Cadastrar'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {suggestedSources.map((source) => {
                const isTesting = sourceActionId === `test:${source.id}`;
                const config = parseSourceConfig(source);
                return (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-card-foreground">{source.source_name}</p>
                        {source.source_url ? (
                          <a
                            href={source.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 break-all text-xs text-primary hover:underline"
                          >
                            {source.source_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                        <p className="text-xs text-muted-foreground">{source.notes || 'Site sugerido pelo administrador autorizado.'}</p>
                      </div>
                    </TableCell>
                    <TableCell>Site sugerido</TableCell>
                    <TableCell>
                      {(Array.isArray(config.expected_fields) ? config.expected_fields : []).join(', ') || 'Taxa anual e vida útil'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={source.is_active ? 'secondary' : 'outline'}>{normalizeStatusLabel(source)}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(sourceLastSeen(source))}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={isTesting}
                        onClick={() => handleTestSource(source)}
                      >
                        <FlaskConical className={`h-3.5 w-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
                        {isTesting ? 'Testando...' : 'Testar fonte'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {canManageSources && (
        <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sugerir outro site para a IA</DialogTitle>
              <DialogDescription>
                O site será cadastrado como fonte inativa para revisão. Nenhuma consulta, atualização ou aprovação roda automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>URL do site</Label>
                <Input
                  value={siteForm.source_url}
                  onChange={(event) => setSiteForm((previous) => ({
                    ...previous,
                    source_url: event.target.value,
                    parser_config_json: '',
                  }))}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Descrição do que a IA deve procurar</Label>
                <Textarea
                  rows={3}
                  value={siteForm.description}
                  onChange={(event) => setSiteForm((previous) => ({
                    ...previous,
                    description: event.target.value,
                    parser_config_json: '',
                  }))}
                  placeholder="Ex.: procurar referências sobre vida útil econômica de veículos ou taxa anual de depreciação por categoria."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Campo relacionado</Label>
                  <Select
                    value={siteForm.related_field}
                    onValueChange={(value) => setSiteForm((previous) => ({
                      ...previous,
                      related_field: value,
                      parser_config_json: '',
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUGGESTION_FIELDS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Categoria relacionada</Label>
                  <Select
                    value={siteForm.related_category}
                    onValueChange={(value) => setSiteForm((previous) => ({
                      ...previous,
                      related_category: value,
                      parser_config_json: '',
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUGGESTION_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <details className="rounded-lg border border-border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-card-foreground">
                  Configuração avançada
                </summary>
                <div className="mt-3">
                  <Label>Parser config JSON</Label>
                  <Textarea
                    rows={10}
                    value={siteForm.parser_config_json}
                    onChange={(event) => setSiteForm((previous) => ({
                      ...previous,
                      parser_config_json: event.target.value,
                    }))}
                    placeholder="Gerado automaticamente a partir dos campos acima."
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use apenas URL cadastrada e domínio permitido. Não informe tokens, senhas ou API keys.
                  </p>
                </div>
              </details>

              {siteTestResult && (
                <div className={`rounded-lg border px-4 py-3 text-sm ${siteTestResult.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <p className="font-medium text-card-foreground">Resultado do teste</p>
                  <p className="mt-1 text-muted-foreground">
                    {siteTestResult.summary || siteTestResult.error || 'Teste concluído.'}
                  </p>
                  {Array.isArray(siteTestResult.errors) && siteTestResult.errors.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-700">
                      {siteTestResult.errors.slice(0, 5).map((error, index) => (
                        <li key={`site-test-error-${index}`}>
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
                disabled={siteSaving || siteTestLoading}
                onClick={handleTestSuggestedSite}
              >
                <FlaskConical className="h-4 w-4" />
                {siteTestLoading ? 'Testando...' : 'Testar sem salvar'}
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={siteSaving || siteTestLoading}
                onClick={handleSaveSuggestedSite}
              >
                <Save className="h-4 w-4" />
                {siteSaving ? 'Salvando...' : 'Salvar site sugerido'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
