import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useWorkspaceEntity } from '@/lib/useWorkspaceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Save, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDefaultDepreciationRate, getUsefulLifeFromRate } from '@/lib/depreciation';
import SupplierSelect from '@/components/assets/SupplierSelect';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/WorkspaceContext';
import { getPlan } from '@/lib/plans';
import { logAudit } from '@/lib/audit';
import {
  DEPRECIATION_SUGGESTION_FIELDS,
  SUGGESTION_PARAMETERS,
  applyDepreciationRateInput,
  applySuggestionValue,
  applyUsefulLifeInput,
  buildSuggestAssetParametersPayload,
  buildSuggestionContext,
  confidenceValueLabel,
  createEmptySuggestionState,
  formatSuggestionValue,
  friendlySuggestionError,
  getSuggestionEligibility,
  hasFoundSuggestionForFields,
  INSUFFICIENT_EVIDENCE_MESSAGE,
  isStandardSuggestionNotice,
  normalizeSuggestionFunctionResponse,
  stableStringify,
  SUGGESTION_NOTICE_WARNINGS,
  summarizeSuggestionSources,
  uniqueSuggestionWarnings,
} from '@/lib/assetParameterSuggestions';

const categories = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const statuses = ['Ativo', 'Em Manutenção', 'Inativo', 'Alienado'];

// Campos de identificação única: não fazem sentido replicados em cópias do
// mesmo lote/duplicação — ficam em branco (exceto plaqueta, que pode ganhar
// numeração sequencial via prefixo, resolvida no backend).
const UNIQUE_FIELDS = [
  'plaqueta', 'serial_number', 'rfid_tag_id', 'vehicle_plate', 'vehicle_renavam',
  'vehicle_chassis', 'property_registration_number', 'property_iptu_number',
  'fiscal_document', 'photo_url', 'invoice_url',
];

function buildBatch(baseData, qty) {
  if (qty <= 1) return [baseData];
  return Array.from({ length: qty }, (_, idx) => {
    const item = { ...baseData, name: `${baseData.name} (${idx + 1}/${qty})` };
    if (idx > 0) UNIQUE_FIELDS.forEach((f) => { item[f] = ''; });
    return item;
  });
}

export default function AssetForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [quantity, setQuantity] = useState(1);
  const [plaquetaPrefix, setPlaquetaPrefix] = useState('');
  const originalAssetRef = useRef(null);
  const AssetEntity = useWorkspaceEntity('Asset');
  const BranchEntity = useWorkspaceEntity('Branch');
  const [branches, setBranches] = useState([]);
  const SectorEntity = useWorkspaceEntity('Sector');
  const [sectors, setSectors] = useState([]);
  const ConfigEntity = useWorkspaceEntity('DepreciationConfig');
  const TemplateEntity = useWorkspaceEntity('AssetParameterTemplate');
  const AuditEntity = useWorkspaceEntity('AuditLog');
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const [brandOptions, setBrandOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [sinapiReference, setSinapiReference] = useState(null);
  const [sinapiLoading, setSinapiLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    plaqueta: '',
    description: '',
    category: 'Equipamentos',
    account: '',
    cost_center: '',
    branch_id: '',
    sector_id: '',
    acquisition_value: '',
    purchase_date: '',
    depreciation_start_date: '',
    depreciation_rate: 10,
    useful_life_years: 10,
    residual_value: '',
    location: '',
    status: 'Ativo',
    conservation_state: 'Novo',
    serial_number: '',
    rfid_tag_id: '',
    fiscal_document: '',
    supplier_id: '',
    supplier_name: '',
    external_link: '',
    registry_link: '',
    brand: '',
    model: '',
    regulatory_registration_type: 'nenhum',
    regulatory_registration_number: '',
    property_registration_number: '',
    property_registry_office: '',
    property_iptu_number: '',
    property_area_m2: '',
    property_registration_type: '',
    property_rip_number: '',
    property_state: '',
    vehicle_plate: '',
    vehicle_renavam: '',
    vehicle_chassis: '',
    vehicle_ipva_due_date: '',
    vehicle_fuel_type: '',
    vehicle_model_year: '',
    vehicle_fipe_code: '',
    ownership_type: 'proprio',
    real_owner_name: '',
    real_owner_document: '',
    is_construction_in_progress: false,
    construction_completion_date: '',
    fiscal_depreciation_rate: '',
    fiscal_useful_life_years: '',
    fiscal_residual_value: '',
    fiscal_depreciation_start_date: '',
    notes: '',
  });
  const [aiSuggestions, setAiSuggestions] = useState(() => createEmptySuggestionState());
  const aiRequestSeqRef = useRef(0);
  const aiInFlightKeyRef = useRef('');
  const aiCurrentKeyRef = useRef('');
  const aiLatestContextKeyRef = useRef('');
  const aiMountedRef = useRef(true);

  const suggestionContext = useMemo(
    () => buildSuggestionContext(form, branches, sectors),
    [
      form.name,
      form.category,
      form.description,
      form.account,
      form.acquisition_value,
      form.purchase_date,
      form.depreciation_start_date,
      form.conservation_state,
      form.location,
      form.branch_id,
      form.sector_id,
      form.supplier_name,
      form.vehicle_model_year,
      form.vehicle_fuel_type,
      form.property_area_m2,
      form.property_registration_type,
      form.ownership_type,
      form.is_construction_in_progress,
      form.construction_completion_date,
      form.notes,
      branches,
      sectors,
    ]
  );
  const suggestionContextKey = useMemo(() => stableStringify(suggestionContext), [suggestionContext]);
  aiLatestContextKeyRef.current = suggestionContextKey;
  const suggestionEligibility = useMemo(() => getSuggestionEligibility(suggestionContext), [suggestionContext]);
  const hasAiSuggestionLoading = Object.values(aiSuggestions).some((state) => state.loading);

  const runSuggestionRequest = async (params, context) => {
    const requestKey = stableStringify({ params, context });
    if (aiInFlightKeyRef.current) return;

    const requestId = aiRequestSeqRef.current + 1;
    aiRequestSeqRef.current = requestId;
    aiInFlightKeyRef.current = requestKey;
    aiCurrentKeyRef.current = requestKey;
    const requestContextKey = stableStringify(context);

    setAiSuggestions((prev) => {
      const next = { ...prev };
      params.forEach((field) => {
        next[field] = {
          ...next[field],
          loading: true,
          error: '',
          stale: false,
          contextKey: requestContextKey,
        };
      });
      return next;
    });

    try {
      const res = await base44.functions.invoke('suggestAssetParameters', buildSuggestAssetParametersPayload(editId, params, context));
      if (!aiMountedRef.current || aiRequestSeqRef.current !== requestId || aiCurrentKeyRef.current !== requestKey) return;

      const rawPayload = res?.data || res;
      const payload = normalizeSuggestionFunctionResponse(res);
      if (!payload.ok) {
        const error = Object.assign(new Error(rawPayload?.error || 'Falha ao gerar sugestão.'), { data: rawPayload });
        throw error;
      }
      const received = payload.suggestions || {};
      setAiSuggestions((prev) => {
        const next = { ...prev };
        params.forEach((field) => {
          next[field] = {
            ...next[field],
            loading: false,
            suggestion: received[field] || null,
            error: '',
            stale: aiLatestContextKeyRef.current !== requestContextKey,
            contextKey: requestContextKey,
            applied: false,
            response: payload,
          };
        });
        return next;
      });
    } catch (error) {
      if (!aiMountedRef.current || aiRequestSeqRef.current !== requestId || aiCurrentKeyRef.current !== requestKey) return;
      setAiSuggestions((prev) => {
        const next = { ...prev };
        params.forEach((field) => {
          next[field] = {
            ...next[field],
            loading: false,
            error: friendlySuggestionError(error),
            stale: aiLatestContextKeyRef.current !== requestContextKey,
            contextKey: requestContextKey,
          };
        });
        return next;
      });
    } finally {
      if (aiInFlightKeyRef.current === requestKey) aiInFlightKeyRef.current = '';
    }
  };

  const handleSuggestDepreciationGroup = () => {
    if (!suggestionEligibility.depreciation.enabled) return;
    runSuggestionRequest(DEPRECIATION_SUGGESTION_FIELDS, suggestionContext);
  };

  const handleSuggestResidual = () => {
    if (!suggestionEligibility.residual.enabled) return;
    runSuggestionRequest(['residual_value'], suggestionContext);
  };

  const handleRefreshSuggestion = (field) => {
    if (DEPRECIATION_SUGGESTION_FIELDS.includes(field)) {
      handleSuggestDepreciationGroup();
      return;
    }
    handleSuggestResidual();
  };

  const handleApplySuggestion = (field) => {
    const suggestion = aiSuggestions[field]?.suggestion;
    if (!suggestion?.found || typeof suggestion.value !== 'number') return;
    setForm((prev) => applySuggestionValue(prev, field, suggestion));
    setAiSuggestions((prev) => ({
      ...prev,
      [field]: { ...prev[field], applied: true, stale: false },
    }));
    toast.success('Sugestão aplicada. Revise antes de salvar.');
  };

  const clearAppliedSuggestion = (field) => {
    setAiSuggestions((prev) => ({
      ...prev,
      [field]: { ...prev[field], applied: false },
    }));
  };

  const clearAppliedSuggestions = (fields) => {
    setAiSuggestions((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        next[field] = { ...next[field], applied: false };
      });
      return next;
    });
  };

  const handleDepreciationRateChange = (value) => {
    clearAppliedSuggestions(['depreciation_rate', 'useful_life_years']);
    setForm((prev) => applyDepreciationRateInput(prev, value));
  };

  const handleUsefulLifeChange = (value) => {
    clearAppliedSuggestions(['depreciation_rate', 'useful_life_years']);
    setForm((prev) => applyUsefulLifeInput(prev, value));
  };

  const handleResidualValueChange = (value) => {
    clearAppliedSuggestion('residual_value');
    setForm({ ...form, residual_value: value });
  };

  const getSuggestionResponse = (fields) => fields.map((field) => aiSuggestions[field]?.response).find(Boolean) || null;
  const getSuggestionsForFields = (fields) => fields.reduce((acc, field) => {
    if (aiSuggestions[field]?.suggestion) acc[field] = aiSuggestions[field].suggestion;
    return acc;
  }, {});

  const renderSuggestionOutcome = (fields, className = 'text-xs text-muted-foreground') => {
    const response = getSuggestionResponse(fields);
    if (!response) return null;
    const suggestions = getSuggestionsForFields(fields);
    if (hasFoundSuggestionForFields(suggestions, fields)) return null;
    return <p className={className}>{INSUFFICIENT_EVIDENCE_MESSAGE}</p>;
  };

  const renderSuggestionButton = (field, label) => {
    const isDepreciationPair = DEPRECIATION_SUGGESTION_FIELDS.includes(field);
    const eligibility = isDepreciationPair ? suggestionEligibility.depreciation : suggestionEligibility.residual;
    const fieldLoading = isDepreciationPair
      ? DEPRECIATION_SUGGESTION_FIELDS.some((item) => aiSuggestions[item]?.loading)
      : aiSuggestions[field]?.loading;
    const disabled = !eligibility.enabled || hasAiSuggestionLoading;
    const title = eligibility.enabled
      ? (isDepreciationPair ? 'Sugerir taxa e vida útil com IA' : 'Sugerir valor residual com IA')
      : eligibility.reason;

    return (
      <Button
        type="button"
        variant="outline"
        className="h-10 shrink-0 gap-2"
        onClick={isDepreciationPair ? handleSuggestDepreciationGroup : handleSuggestResidual}
        disabled={disabled}
        title={title}
      >
        {fieldLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {fieldLoading ? 'Consultando...' : label}
      </Button>
    );
  };

  const renderDepreciationSuggestionButton = () => {
    const loading = DEPRECIATION_SUGGESTION_FIELDS.some((field) => aiSuggestions[field]?.loading);
    const disabled = !suggestionEligibility.depreciation.enabled || hasAiSuggestionLoading;

    return (
      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handleSuggestDepreciationGroup}
          disabled={disabled}
          title={suggestionEligibility.depreciation.enabled ? 'Sugerir taxa e vida útil com IA' : suggestionEligibility.depreciation.reason}
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Consultando fontes...' : 'Sugerir taxa e vida útil'}
        </Button>
        {!suggestionEligibility.depreciation.enabled && (
          <p className="mt-2 text-xs text-muted-foreground">{suggestionEligibility.depreciation.reason}</p>
        )}
      </div>
    );
  };

  const renderSourcesConsulted = (response) => {
    const fiscalReference = response?.fiscal_reference;
    if (!response?.has_failed_sources && !fiscalReference) return null;

    return (
      <div className="mt-2 space-y-2 rounded-md bg-muted/20 p-2 text-xs">
        {response?.has_failed_sources && (
          <p className="text-muted-foreground">Algumas fontes não puderam ser consultadas.</p>
        )}
        {fiscalReference && (
          <div className="rounded-md bg-background/70 p-2">
            <p className="font-medium text-foreground">Referência fiscal: {fiscalReference.value}% ao ano</p>
            <p className="text-muted-foreground">{fiscalReference.warning}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSuggestionBox = (field) => {
    const state = aiSuggestions[field];
    const suggestion = state?.suggestion;
    const label = SUGGESTION_PARAMETERS[field].label;

    if (state?.loading) {
      return (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Consultando fontes confiáveis e analisando os dados do ativo...
        </p>
      );
    }

    if (state?.stale) {
      return (
        <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          A sugestão foi gerada com dados anteriores.
          <Button type="button" variant="link" size="sm" className="h-auto px-1 py-0 text-xs" onClick={() => handleRefreshSuggestion(field)}>
            Gerar nova sugestão
          </Button>
        </div>
      );
    }

    if (state?.error) {
      return (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {state.error}
          <Button type="button" variant="link" size="sm" className="h-auto px-1 py-0 text-xs text-amber-800" onClick={() => handleRefreshSuggestion(field)}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (!suggestion) return null;

    if (!suggestion.found) {
      const reason = suggestion.reason === INSUFFICIENT_EVIDENCE_MESSAGE ? '' : suggestion.reason;
      return (
        <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          <p>{reason || `Não foi possível sugerir ${label.toLowerCase()} com segurança.`}</p>
          {Array.isArray(suggestion.missing_data) && suggestion.missing_data.length > 0 && (
            <p className="mt-1">Dados que podem melhorar a análise: {suggestion.missing_data.slice(0, 3).join(', ')}.</p>
          )}
          <Button type="button" variant="link" size="sm" className="h-auto px-0 py-1 text-xs" onClick={() => handleRefreshSuggestion(field)}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    const sourceSummary = summarizeSuggestionSources(state.response, suggestion);
    const extraWarnings = uniqueSuggestionWarnings(suggestion.warnings)
      .filter((warning) => !isStandardSuggestionNotice(warning))
      .slice(0, 2);

    return (
      <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[11px] font-medium uppercase text-muted-foreground">Sugestão</p>
              <p className="text-base font-semibold text-foreground">{formatSuggestionValue(field, suggestion.value)}</p>
            </div>
            <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
              <p><span className="font-medium text-foreground">Confiança:</span> {confidenceValueLabel(suggestion.confidence)}</p>
              <p><span className="font-medium text-foreground">Fonte:</span> {sourceSummary || 'não informada'}</p>
            </div>
            {suggestion.reason && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Base:</span> {suggestion.reason}
              </p>
            )}
            {extraWarnings.length > 0 && (
              <div className="rounded-md bg-background/70 p-2">
                <p className="mb-1 font-medium text-foreground">Avisos específicos</p>
                <ul className="space-y-1 text-muted-foreground">
                  {extraWarnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {state.applied && <p className="font-medium text-primary">Sugestão aplicada. O campo continua editável.</p>}
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => handleApplySuggestion(field)}>
            <Sparkles className="h-3 w-3" />
            Usar sugestão
          </Button>
        </div>
      </div>
    );
  };

  const renderSuggestionNotices = (fields) => {
    const suggestions = getSuggestionsForFields(fields);
    if (!hasFoundSuggestionForFields(suggestions, fields)) return null;

    return (
      <div className="mt-2 rounded-md bg-muted/30 p-2 text-xs">
        <p className="mb-1 font-medium text-foreground">Avisos</p>
        <ul className="space-y-1 text-muted-foreground">
          {SUGGESTION_NOTICE_WARNINGS.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      </div>
    );
  };

  useEffect(() => {
    aiMountedRef.current = true;
    return () => {
      aiMountedRef.current = false;
      aiRequestSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    BranchEntity.list('-created_date', 200).then(setBranches).catch(() => {});
    SectorEntity.list('name', 500).then((rows) => setSectors(rows.filter((s) => s.status !== 'inativo'))).catch(() => {});
    // Autocomplete de Marca/Modelo: reaproveita os ativos ja cadastrados (ate 500 mais recentes)
    // em vez de uma entidade dedicada -- simples, sem custo de manutencao extra.
    AssetEntity.list('-created_date', 500).then((rows) => {
      setBrandOptions([...new Set(rows.map((r) => (r.brand || '').trim()).filter(Boolean))].sort());
      setModelOptions([...new Set(rows.map((r) => (r.model || '').trim()).filter(Boolean))].sort());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (editId) {
      const loadAsset = async () => {
        // filter do helper injeta workspace_id — impede editar ativo de outro tenant pelo id.
        const assets = await AssetEntity.filter({ id: editId });
        if (assets.length > 0) {
          const asset = assets[0];
          originalAssetRef.current = asset;
          setForm({
            name: asset.name || '',
            plaqueta: asset.plaqueta || '',
            description: asset.description || '',
            category: asset.category || 'Equipamentos',
            account: asset.account || '',
            cost_center: asset.cost_center || '',
            branch_id: asset.branch_id || '',
            sector_id: asset.sector_id || '',
            acquisition_value: asset.acquisition_value || '',
            purchase_date: asset.purchase_date || '',
            depreciation_start_date: asset.depreciation_start_date || '',
            depreciation_rate: asset.depreciation_rate || 10,
            useful_life_years: asset.useful_life_years || getUsefulLifeFromRate(asset.depreciation_rate),
            residual_value: asset.residual_value || '',
            location: asset.location || '',
            status: asset.status || 'Ativo',
            conservation_state: asset.conservation_state || 'Novo',
            serial_number: asset.serial_number || '',
            rfid_tag_id: asset.rfid_tag_id || '',
            fiscal_document: asset.fiscal_document || '',
            warranty_expiry_date: asset.warranty_expiry_date || '',
            next_review_date: asset.next_review_date || '',
            supplier_id: asset.supplier_id || '',
            supplier_name: asset.supplier_name || '',
            photo_url: asset.photo_url || '',
            invoice_url: asset.invoice_url || '',
            external_link: asset.external_link || '',
            registry_link: asset.registry_link || '',
            brand: asset.brand || '',
            model: asset.model || '',
            regulatory_registration_type: asset.regulatory_registration_type || 'nenhum',
            regulatory_registration_number: asset.regulatory_registration_number || '',
            property_registration_number: asset.property_registration_number || '',
            property_registry_office: asset.property_registry_office || '',
            property_iptu_number: asset.property_iptu_number || '',
            property_area_m2: asset.property_area_m2 || '',
            property_registration_type: asset.property_registration_type || '',
            property_rip_number: asset.property_rip_number || '',
            property_state: asset.property_state || '',
            vehicle_plate: asset.vehicle_plate || '',
            vehicle_renavam: asset.vehicle_renavam || '',
            vehicle_chassis: asset.vehicle_chassis || '',
            vehicle_ipva_due_date: asset.vehicle_ipva_due_date || '',
            vehicle_fuel_type: asset.vehicle_fuel_type || '',
            vehicle_model_year: asset.vehicle_model_year || '',
            vehicle_fipe_code: asset.vehicle_fipe_code || '',
            ownership_type: asset.ownership_type || 'proprio',
            real_owner_name: asset.real_owner_name || '',
            real_owner_document: asset.real_owner_document || '',
            is_construction_in_progress: !!asset.is_construction_in_progress,
            construction_completion_date: asset.construction_completion_date || '',
            fiscal_depreciation_rate: asset.fiscal_depreciation_rate || '',
            fiscal_useful_life_years: asset.fiscal_useful_life_years || '',
            fiscal_residual_value: asset.fiscal_residual_value || '',
            fiscal_depreciation_start_date: asset.fiscal_depreciation_start_date || '',
            notes: asset.notes || '',
          });
        }
        setLoading(false);
      };
      loadAsset();
    }
  }, [editId]);

  useEffect(() => {
    setAiSuggestions((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((field) => {
        const state = next[field];
        if (state.suggestion && state.contextKey && state.contextKey !== suggestionContextKey && !state.stale) {
          next[field] = { ...state, stale: true, applied: false };
          changed = true;
        } else if (state.error && state.contextKey && state.contextKey !== suggestionContextKey) {
          next[field] = { ...state, error: '', applied: false };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [suggestionContextKey]);

  const handleCategoryChange = async (value) => {
    // Try to load from saved config first
    const configs = await ConfigEntity.filter({ category: value });
    let rate, life;
    if (configs.length > 0) {
      rate = configs[0].depreciation_rate;
      life = configs[0].useful_life_years;
    } else {
      rate = getDefaultDepreciationRate(value);
      life = getUsefulLifeFromRate(rate);
    }
    setForm({ ...form, category: value, depreciation_rate: rate, useful_life_years: life });
  };

  // Cadeia de defaults ao preencher Marca+Modelo num ativo NOVO: casa um AssetParameterTemplate
  // (mais especifico) antes de manter o que handleCategoryChange ja preencheu por categoria.
  // So roda na criacao -- nunca sobrescreve silenciosamente um ativo ja salvo so por perder o foco.
  const handleBrandModelBlur = async () => {
    if (editId || !form.category || !form.brand.trim() || !form.model.trim()) return;
    try {
      const templates = await TemplateEntity.filter({ category: form.category, brand: form.brand.trim(), model: form.model.trim() });
      if (templates.length === 0) return;
      const t = templates[0];
      setForm((prev) => ({
        ...prev,
        depreciation_rate: t.depreciation_rate ?? prev.depreciation_rate,
        useful_life_years: t.useful_life_years ?? prev.useful_life_years,
        residual_value: t.residual_value ?? prev.residual_value,
        fiscal_depreciation_rate: t.fiscal_depreciation_rate ?? prev.fiscal_depreciation_rate,
        fiscal_useful_life_years: t.fiscal_useful_life_years ?? prev.fiscal_useful_life_years,
        fiscal_residual_value: t.fiscal_residual_value ?? prev.fiscal_residual_value,
        regulatory_registration_type: t.regulatory_registration_type || prev.regulatory_registration_type,
        regulatory_registration_number: t.regulatory_registration_number || prev.regulatory_registration_number,
      }));
      toast.success(`Parametros de ${t.brand} ${t.model} aplicados a partir do template cadastrado.`);
    } catch (_) {
      // Autocompletar defaults e best-effort -- falha silenciosa, usuario continua preenchendo normalmente.
    }
  };

  // Referencia informativa de custo de construcao (IBGE/SIDRA, SINAPI) para Imoveis -- nao
  // sobrescreve acquisition_value sozinha, so exibe um comparativo ao lado do campo.
  const handleFetchSinapiReference = async () => {
    if (!form.property_area_m2 || !form.property_state) return;
    setSinapiLoading(true);
    setSinapiReference(null);
    try {
      const res = await base44.functions.invoke('sinapiCostReference', { uf: form.property_state, area_m2: parseFloat(form.property_area_m2) });
      const data = res?.data || res;
      setSinapiReference(data?.found ? data : { found: false });
    } catch (_) {
      setSinapiReference({ found: false });
    } finally {
      setSinapiLoading(false);
    }
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm({ ...form, [field]: file_url });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Aplica o limite de ativos do plano na criação (edição não conta).
    const qty = editId ? 1 : Math.min(50, Math.max(1, parseInt(quantity, 10) || 1));
    if (!editId) {
      const limit = getPlan(workspace?.plan).limits.assets;
      if (Number.isFinite(limit)) {
        const existing = await AssetEntity.list('-created_date', limit + 1);
        if (existing.length + qty > limit) {
          toast.error(`Seu plano permite até ${limit} ativos (${Math.max(0, limit - existing.length)} restante(s)). Faça upgrade em Plano & Cobrança ou reduza a quantidade.`);
          return;
        }
      }
    }

    setSaving(true);

    const { cost_center: _legacyCostCenter, ...formWithoutLegacy } = form;
    const data = {
      ...formWithoutLegacy,
      acquisition_value: parseFloat(form.acquisition_value) || 0,
      depreciation_rate: parseFloat(form.depreciation_rate) || 0,
      useful_life_years: parseFloat(form.useful_life_years) || 0,
      residual_value: parseFloat(form.residual_value) || 0,
      property_area_m2: parseFloat(form.property_area_m2) || 0,
      fiscal_depreciation_rate: parseFloat(form.fiscal_depreciation_rate) || 0,
      fiscal_useful_life_years: parseFloat(form.fiscal_useful_life_years) || 0,
      fiscal_residual_value: parseFloat(form.fiscal_residual_value) || 0,
      supplier_id: form.supplier_id || '',
      supplier_name: form.supplier_name || '',
    };

    try {
      if (editId) {
        await AssetEntity.update(editId, data);
        await logAudit({
          action: 'updated', entity_type: 'Asset', entity_id: editId,
          entity_label: data.name, summary: `Editou o ativo "${data.name}"`,
          old_data: originalAssetRef.current, new_data: data,
        });
      } else {
        // Criação passa pela function createAsset — o limite do plano e o status
        // de pagamento são validados no servidor (RLS bloqueia create pelo SDK).
        // qty > 1: cadastro em lote — cada cópia recebe sufixo no nome e tem os
        // campos de identificação única (serial, placa, matrícula, plaqueta sem
        // prefixo, anexos) limpos, mantidos só no primeiro item digitado.
        const assets = buildBatch(data, qty);
        const res = await base44.functions.invoke('createAsset', {
          assets,
          ...(plaquetaPrefix.trim() ? { plaqueta_prefix: plaquetaPrefix.trim() } : {}),
        });
        if (!res?.data?.ok || !res.data.created) {
          throw new Error(res?.data?.error || 'Não foi possível salvar o ativo.');
        }
        await logAudit({
          action: 'created', entity_type: 'Asset', entity_id: res.data.ids?.[0] || '',
          entity_label: data.name,
          summary: qty > 1 ? `Cadastrou ${res.data.created} ativos em lote a partir de "${data.name}"` : `Cadastrou o ativo "${data.name}"`,
          new_data: data,
        });
        if (res.data.limit_reached || res.data.failed > 0) {
          toast.warning(`${res.data.created} de ${qty} ativos criados — limite do plano atingido ou item inválido.`);
        } else if (qty > 1) {
          toast.success(`${res.data.created} ativos cadastrados com sucesso.`);
        }
      }
      navigate('/Assets');
    } catch (err) {
      setSaving(false);
      toast.error(err?.response?.data?.error || err?.message || 'Não foi possível salvar o ativo. Verifique suas permissões.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/Assets" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {editId ? 'Editar Ativo' : 'Novo Ativo'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {editId ? 'Atualize as informações do ativo' : 'Preencha os dados para cadastrar um novo ativo'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Identificação do Bem</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Descrição do Bem *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Caminhão Mercedes-Benz Atego 1719" />
            </div>

            {!editId && (
              <div>
                <Label htmlFor="quantity">Quantidade a cadastrar</Label>
                <Input
                  id="quantity" type="number" min={1} max={50} value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">Cria vários ativos idênticos de uma vez (máx. 50).</p>
              </div>
            )}

            {!editId && Number(quantity) > 1 && (
              <div>
                <Label htmlFor="plaqueta_prefix">Prefixo da Plaqueta (opcional)</Label>
                <Input
                  id="plaqueta_prefix" value={plaquetaPrefix}
                  onChange={(e) => setPlaquetaPrefix(e.target.value)}
                  placeholder="Ex: NB"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cada ativo receberá {plaquetaPrefix ? plaquetaPrefix.trim() || 'PREFIXO' : 'PREFIXO'}-001, -002... Deixe em branco para preencher a Plaqueta manualmente depois.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="plaqueta">Plaqueta / Código Patrimonial</Label>
              <Input id="plaqueta" value={form.plaqueta} onChange={(e) => setForm({ ...form, plaqueta: e.target.value })} placeholder="Ex: PAT-00123" />
            </div>

            <div>
              <Label htmlFor="serial_number">Número de Série</Label>
              <Input id="serial_number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="Ex: SN-ABC123456" />
            </div>

            <div>
              <Label htmlFor="rfid_tag_id">Tag RFID</Label>
              <Input id="rfid_tag_id" value={form.rfid_tag_id} onChange={(e) => setForm({ ...form, rfid_tag_id: e.target.value })} placeholder="Leia com o leitor RFID ou digite o EPC" />
            </div>

            <div>
              <Label htmlFor="brand">Marca/Fabricante</Label>
              <Input
                id="brand" list="brand-options" value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                onBlur={handleBrandModelBlur}
                placeholder="Ex: Dell, Toyota, Samsung"
              />
              <datalist id="brand-options">
                {brandOptions.map((b) => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model" list="model-options" value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                onBlur={handleBrandModelBlur}
                placeholder="Ex: Inspiron 15, Corolla, Galaxy Tab"
              />
              <datalist id="model-options">
                {modelOptions.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>

            <div>
              <Label>Tipo de Registro/Certificação</Label>
              <Select value={form.regulatory_registration_type} onValueChange={(v) => setForm({ ...form, regulatory_registration_type: v, regulatory_registration_number: v === 'nenhum' ? '' : form.regulatory_registration_number })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="anvisa">Anvisa (equipamento de saúde)</SelectItem>
                  <SelectItem value="inmetro">Inmetro (certificação compulsória)</SelectItem>
                  <SelectItem value="bndes_finame">BNDES/FINAME</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.regulatory_registration_type !== 'nenhum' && (
              <div>
                <Label htmlFor="regulatory_registration_number">Número de Registro/Certificação</Label>
                <Input id="regulatory_registration_number" value={form.regulatory_registration_number} onChange={(e) => setForm({ ...form, regulatory_registration_number: e.target.value })} placeholder="Ex: número do registro Anvisa ou do certificado Inmetro" />
              </div>
            )}

            <div>
              <Label>Grupo de Patrimônio *</Label>
              <Select value={form.category} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado de Conservação</Label>
              <Select value={form.conservation_state} onValueChange={(v) => setForm({ ...form, conservation_state: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Novo','Ótimo','Bom','Regular','Ruim'].map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account">Conta Contábil</Label>
              <Input id="account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="Ex: 1.2.3.01 - Máquinas e Equipamentos" />
            </div>

            {form.cost_center && (
              <div>
                <Label>Centro de Custo / Departamento (legado)</Label>
                <p className="text-sm text-muted-foreground py-2">{form.cost_center} — somente leitura, use o Setor abaixo</p>
              </div>
            )}

            {branches.length > 0 && (
              <div>
                <Label>Filial</Label>
                <Select value={form.branch_id || 'none'} onValueChange={(v) => setForm({ ...form, branch_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Sem filial" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem filial</SelectItem>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Setor</Label>
              {sectors.length > 0 ? (
                <Select value={form.sector_id || 'none'} onValueChange={(v) => setForm({ ...form, sector_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum setor cadastrado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem setor</SelectItem>
                    {sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum setor cadastrado — <Link to="/Sectors" className="text-primary hover:underline">cadastre um</Link>
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="location">Localização Física</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Matriz - Galpão 3, Sala 02" />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="description">Detalhes Adicionais</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes sobre o bem..." rows={3} />
            </div>
          </div>
        </div>

        {/* Property-specific fields */}
        {form.category === 'Imóveis' && (
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-card-foreground">Dados do Imóvel</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property_registration_number">Número de Matrícula</Label>
                <Input id="property_registration_number" value={form.property_registration_number} onChange={(e) => setForm({ ...form, property_registration_number: e.target.value })} placeholder="Ex: 12.345" />
              </div>
              <div>
                <Label htmlFor="property_registry_office">Cartório de Registro</Label>
                <Input id="property_registry_office" value={form.property_registry_office} onChange={(e) => setForm({ ...form, property_registry_office: e.target.value })} placeholder="Ex: 3º Cartório de Registro de Imóveis" />
              </div>
              <div>
                <Label htmlFor="property_iptu_number">Inscrição IPTU</Label>
                <Input id="property_iptu_number" value={form.property_iptu_number} onChange={(e) => setForm({ ...form, property_iptu_number: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="property_area_m2">Área (m²)</Label>
                <Input id="property_area_m2" type="number" step="0.01" value={form.property_area_m2} onChange={(e) => setForm({ ...form, property_area_m2: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="property_registration_type">Tipo de Registro</Label>
                <Input id="property_registration_type" value={form.property_registration_type} onChange={(e) => setForm({ ...form, property_registration_type: e.target.value })} placeholder="Ex: Escritura definitiva" />
              </div>
              <div>
                <Label htmlFor="property_rip_number">RIP — Registro Imobiliário Patrimonial</Label>
                <Input id="property_rip_number" value={form.property_rip_number} onChange={(e) => setForm({ ...form, property_rip_number: e.target.value })} placeholder="Preencher quando o imóvel for da União (SPU)" />
              </div>
              <div>
                <Label htmlFor="property_state">UF do Imóvel</Label>
                <Input id="property_state" maxLength={2} value={form.property_state} onChange={(e) => setForm({ ...form, property_state: e.target.value.toUpperCase() })} placeholder="Ex: SP" />
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!form.property_area_m2 || !form.property_state || sinapiLoading} onClick={handleFetchSinapiReference}>
                  {sinapiLoading ? 'Consultando SINAPI...' : 'Consultar referência de custo (SINAPI/IBGE)'}
                </Button>
                {sinapiReference && (
                  sinapiReference.found ? (
                    <p className="text-sm text-muted-foreground">
                      Referência: R$ {sinapiReference.cost_per_m2.toLocaleString('pt-BR')}/m² × {form.property_area_m2}m² ≈ R$ {sinapiReference.reference_value.toLocaleString('pt-BR')} ({sinapiReference.period}, {sinapiReference.source})
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Referência SINAPI indisponível no momento.</p>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Vehicle-specific fields */}
        {form.category === 'Veículos' && (
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-card-foreground">Dados do Veículo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_plate">Placa</Label>
                <Input id="vehicle_plate" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} placeholder="Ex: ABC1D23" />
              </div>
              <div>
                <Label htmlFor="vehicle_renavam">RENAVAM</Label>
                <Input id="vehicle_renavam" value={form.vehicle_renavam} onChange={(e) => setForm({ ...form, vehicle_renavam: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="vehicle_chassis">Chassi</Label>
                <Input id="vehicle_chassis" value={form.vehicle_chassis} onChange={(e) => setForm({ ...form, vehicle_chassis: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="vehicle_model_year">Ano/Modelo</Label>
                <Input id="vehicle_model_year" value={form.vehicle_model_year} onChange={(e) => setForm({ ...form, vehicle_model_year: e.target.value })} placeholder="Ex: 2022/2023" />
              </div>
              <div>
                <Label htmlFor="vehicle_fuel_type">Combustível</Label>
                <Input id="vehicle_fuel_type" value={form.vehicle_fuel_type} onChange={(e) => setForm({ ...form, vehicle_fuel_type: e.target.value })} placeholder="Ex: Flex" />
              </div>
              <div>
                <Label htmlFor="vehicle_ipva_due_date">Vencimento do IPVA</Label>
                <Input id="vehicle_ipva_due_date" type="date" value={form.vehicle_ipva_due_date} onChange={(e) => setForm({ ...form, vehicle_ipva_due_date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="vehicle_fipe_code">Código FIPE</Label>
                <Input id="vehicle_fipe_code" value={form.vehicle_fipe_code} onChange={(e) => setForm({ ...form, vehicle_fipe_code: e.target.value })} placeholder="Ex: 002086-0" />
              </div>
            </div>
          </div>
        )}

        {/* Financial Info */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Informações Financeiras</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="acquisition_value">Valor de Aquisição (R$) *</Label>
              <Input
                id="acquisition_value"
                type="number"
                step="0.01"
                value={form.acquisition_value}
                onChange={(e) => setForm({ ...form, acquisition_value: e.target.value })}
                required
                placeholder="0,00"
              />
            </div>
            
            <div>
              <Label htmlFor="purchase_date">Data de Aquisição *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="depreciation_start_date">Início da Depreciação</Label>
              <Input
                id="depreciation_start_date"
                type="date"
                value={form.depreciation_start_date}
                onChange={(e) => setForm({ ...form, depreciation_start_date: e.target.value })}
              />
            </div>
            
            <div className="sm:col-span-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="depreciation_rate">Taxa de Depreciação Anual (%)</Label>
                  <Input
                    id="depreciation_rate"
                    type="number"
                    step="0.1"
                    value={form.depreciation_rate}
                    onChange={(e) => handleDepreciationRateChange(e.target.value)}
                    placeholder="10"
                    className="mt-1"
                  />
                  {renderSuggestionBox('depreciation_rate')}
                </div>

                <div>
                  <Label htmlFor="useful_life_years">Vida Útil (anos)</Label>
                  <Input
                    id="useful_life_years"
                    type="number"
                    step="0.1"
                    value={form.useful_life_years}
                    onChange={(e) => handleUsefulLifeChange(e.target.value)}
                    placeholder="10"
                    className="mt-1"
                  />
                  {renderSuggestionBox('useful_life_years')}
                </div>
              </div>
              {renderDepreciationSuggestionButton()}
              {renderSuggestionOutcome(DEPRECIATION_SUGGESTION_FIELDS)}
              {renderSuggestionNotices(DEPRECIATION_SUGGESTION_FIELDS)}
              {renderSourcesConsulted(getSuggestionResponse(DEPRECIATION_SUGGESTION_FIELDS))}
            </div>
            
            <div>
              <Label htmlFor="residual_value">Valor Residual (R$)</Label>
              <div className="flex gap-2">
                <Input
                  id="residual_value"
                  type="number"
                  step="0.01"
                  value={form.residual_value}
                  onChange={(e) => handleResidualValueChange(e.target.value)}
                  placeholder="0,00"
                  className="min-w-0"
                />
                {renderSuggestionButton('residual_value', 'Sugerir valor residual')}
              </div>
              {renderSuggestionBox('residual_value')}
              {renderSuggestionOutcome(['residual_value'], 'mt-2 text-xs text-muted-foreground')}
              {renderSuggestionNotices(['residual_value'])}
              {renderSourcesConsulted(getSuggestionResponse(['residual_value']))}
            </div>
          </div>
        </div>

        {/* Supplier & Fiscal */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Fornecedor & Documento Fiscal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Fornecedor</Label>
              <SupplierSelect
                value={form.supplier_id}
                onChange={({ supplier_id, supplier_name }) => setForm({ ...form, supplier_id, supplier_name })}
              />
            </div>
            <div>
              <Label htmlFor="fiscal_document">Número da Nota Fiscal</Label>
              <Input id="fiscal_document" value={form.fiscal_document} onChange={(e) => setForm({ ...form, fiscal_document: e.target.value })} placeholder="Ex: NF-e 000123" />
            </div>
            <div>
              <Label htmlFor="warranty_expiry_date">Vencimento da Garantia</Label>
              <Input id="warranty_expiry_date" type="date" value={form.warranty_expiry_date || ''} onChange={(e) => setForm({ ...form, warranty_expiry_date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="next_review_date">Data da Próxima Revisão</Label>
              <Input id="next_review_date" type="date" value={form.next_review_date || ''} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Depreciação Fiscal (opcional) */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Depreciação Fiscal (opcional)</h2>
            <p className="text-sm text-muted-foreground">Preencha apenas se a taxa fiscal (Receita Federal) diferir da societária/gerencial acima. Em branco, o livro fiscal espelha o societário.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fiscal_depreciation_rate">Taxa Fiscal Anual (%)</Label>
              <Input id="fiscal_depreciation_rate" type="number" step="0.1" value={form.fiscal_depreciation_rate}
                onChange={(e) => setForm({ ...form, fiscal_depreciation_rate: e.target.value, fiscal_useful_life_years: e.target.value > 0 ? (100 / parseFloat(e.target.value)).toFixed(1) : '' })} placeholder="Ex: 25" />
            </div>
            <div>
              <Label htmlFor="fiscal_useful_life_years">Vida Útil Fiscal (anos)</Label>
              <Input id="fiscal_useful_life_years" type="number" step="0.1" value={form.fiscal_useful_life_years}
                onChange={(e) => setForm({ ...form, fiscal_useful_life_years: e.target.value, fiscal_depreciation_rate: e.target.value > 0 ? (100 / parseFloat(e.target.value)).toFixed(1) : '' })} placeholder="Ex: 4" />
            </div>
            <div>
              <Label htmlFor="fiscal_residual_value">Valor Residual Fiscal (R$)</Label>
              <Input id="fiscal_residual_value" type="number" step="0.01" value={form.fiscal_residual_value} onChange={(e) => setForm({ ...form, fiscal_residual_value: e.target.value })} placeholder="0,00" />
            </div>
            <div>
              <Label htmlFor="fiscal_depreciation_start_date">Início da Depreciação Fiscal</Label>
              <Input id="fiscal_depreciation_start_date" type="date" value={form.fiscal_depreciation_start_date} onChange={(e) => setForm({ ...form, fiscal_depreciation_start_date: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Titularidade / obra em andamento */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Titularidade</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de titularidade</Label>
              <Select value={form.ownership_type} onValueChange={(v) => setForm({ ...form, ownership_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprio">Próprio</SelectItem>
                  <SelectItem value="terceiros">Bem de terceiros</SelectItem>
                  <SelectItem value="locado">Locado</SelectItem>
                  <SelectItem value="comodato">Comodato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.ownership_type !== 'proprio' && (
              <>
                <div>
                  <Label htmlFor="real_owner_name">Proprietário real</Label>
                  <Input id="real_owner_name" value={form.real_owner_name} onChange={(e) => setForm({ ...form, real_owner_name: e.target.value })} placeholder="Nome/razão social do dono do bem" />
                </div>
                <div>
                  <Label htmlFor="real_owner_document">CNPJ/CPF do proprietário real</Label>
                  <Input id="real_owner_document" value={form.real_owner_document} onChange={(e) => setForm({ ...form, real_owner_document: e.target.value })} />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <input
              id="is_construction_in_progress"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={form.is_construction_in_progress}
              onChange={(e) => setForm({ ...form, is_construction_in_progress: e.target.checked })}
            />
            <Label htmlFor="is_construction_in_progress" className="cursor-pointer">Obra/imobilização em andamento (não deprecia até a conclusão)</Label>
          </div>
          {form.is_construction_in_progress && (
            <div className="sm:w-1/2">
              <Label htmlFor="construction_completion_date">Previsão de conclusão</Label>
              <Input id="construction_completion_date" type="date" value={form.construction_completion_date} onChange={(e) => setForm({ ...form, construction_completion_date: e.target.value })} />
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-card-foreground">Anexos e Links</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Foto do Ativo</Label>
              <div className="mt-1">
                {form.photo_url ? (
                  <div className="relative">
                    <img src={form.photo_url} alt="Foto" className="h-32 w-full object-cover rounded-lg" />
                    <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setForm({ ...form, photo_url: '' })}>Remover</Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Clique para enviar</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photo_url')} />
                  </label>
                )}
              </div>
            </div>
            
            <div>
              <Label>Nota Fiscal (Arquivo)</Label>
              <div className="mt-1">
                {form.invoice_url ? (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <span className="text-sm text-card-foreground flex-1 truncate">Arquivo enviado</span>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setForm({ ...form, invoice_url: '' })}>Remover</Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Enviar Nota Fiscal</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'invoice_url')} />
                  </label>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="external_link">Link Externo (Consulta de Valor)</Label>
              <Input id="external_link" value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://..." />
            </div>
            
            <div>
              <Label htmlFor="registry_link">Link do Registro (Cartório/Corretora)</Label>
              <Input id="registry_link" value={form.registry_link} onChange={(e) => setForm({ ...form, registry_link: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/Assets">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : (editId ? 'Atualizar' : 'Cadastrar')}
          </Button>
        </div>
      </form>
    </div>
  );
}
