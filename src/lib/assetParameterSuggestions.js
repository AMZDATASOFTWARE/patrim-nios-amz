export const SUGGESTION_PARAMETERS = {
  depreciation_rate: { label: 'Taxa de Deprecia\u00e7\u00e3o Anual', unit: '% ao ano' },
  useful_life_years: { label: 'Vida \u00datil', unit: 'anos' },
  residual_value: { label: 'Valor Residual', unit: 'R$' },
  fiscal_depreciation_rate: { label: 'Taxa Fiscal Anual', unit: '% ao ano' },
  fiscal_useful_life_years: { label: 'Vida \u00datil Fiscal', unit: 'anos' },
  fiscal_residual_value: { label: 'Valor Residual Fiscal', unit: 'R$' },
};

export const DEPRECIATION_SUGGESTION_FIELDS = ['depreciation_rate', 'useful_life_years'];
export const FISCAL_DEPRECIATION_SUGGESTION_FIELDS = ['fiscal_depreciation_rate', 'fiscal_useful_life_years'];

export const MANAGEMENT_WARNING = 'Estimativa gerencial baseada nos dados informados. Valide com o responsável contábil antes de utilizar.';
export const INSUFFICIENT_EVIDENCE_MESSAGE = 'As fontes foram consultadas, mas não foram encontradas informações suficientes para gerar uma sugestão segura.';
export const SUGGESTION_NOTICE_WARNINGS = [
  'Esta é uma estimativa gerencial e precisa de validação contábil.',
  'O resultado não é orientação fiscal ou contábil definitiva.',
  'Nenhuma sugestão pode ser aplicada automaticamente.',
];

export const TRUSTED_AI_SOURCES_INFO = [
  { name: 'CPC', purpose: 'Normas e critérios contábeis.', application: 'Todas as categorias.' },
  { name: 'CFC', purpose: 'Normas brasileiras de contabilidade.', application: 'Todas as categorias.' },
  { name: 'CVM', purpose: 'Normas contábeis consolidadas.', application: 'Investimentos e intangíveis.' },
  { name: 'Receita Federal', purpose: 'Referências fiscais.', application: 'Contexto fiscal, separadamente da estimativa gerencial.' },
  { name: 'FIPE', purpose: 'Referência de mercado para veículos.', application: 'Veículos.' },
  { name: 'FIPE Máquinas', purpose: 'Referência de mercado para máquinas agrícolas.', application: 'Equipamentos agrícolas.' },
  { name: 'CAIXA / SINAPI', purpose: 'Custos de imóveis, instalações e obras.', application: 'Imóveis e construção.' },
  { name: 'IBGE / SINAPI', purpose: 'Índices e custos da construção.', application: 'Imóveis e construção.' },
  { name: 'Patrimônio da União', purpose: 'Referências complementares para imóveis.', application: 'Imóveis.' },
  { name: 'Anvisa', purpose: 'Identificação de equipamentos médicos e hospitalares.', application: 'Equipamentos de saúde.' },
  { name: 'Inmetro', purpose: 'Certificação e identificação técnica.', application: 'Equipamentos e veículos.' },
  { name: 'BNDES', purpose: 'Catálogo de máquinas e equipamentos.', application: 'Equipamentos.' },
];

const CATEGORIES = ['Im\u00f3veis', 'Ve\u00edculos', 'Equipamentos', 'Investimentos', 'Intang\u00edveis'];

export function createEmptySuggestionState() {
  return ['depreciation_rate', 'useful_life_years', 'residual_value'].reduce((acc, field) => {
    acc[field] = {
      loading: false,
      suggestion: null,
      error: '',
      contextKey: '',
      stale: false,
      applied: false,
      response: null,
    };
    return acc;
  }, {});
}

export function createEmptyFiscalRefinementState() {
  return {
    loading: false,
    error: '',
    status: 'IDLE',
    currentQuestion: null,
    refinementStateToken: null,
    answers: {},
    selectedOption: '',
    readyOption: null,
    suggestions: {},
    response: null,
    applied: {},
    contextKey: '',
  };
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function cleanText(value, limit = 300) {
  const text = String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, limit) : '';
}

function addText(context, key, value, limit = 300) {
  const text = cleanText(value, limit);
  if (text) context[key] = text;
}

function addNumber(context, key, value) {
  if (value === '' || value === null || value === undefined) return;
  const num = Number(value);
  if (Number.isFinite(num) && num >= 0) context[key] = num;
}

export function buildSuggestionContext(form, branches = [], sectors = []) {
  const context = {};
  addText(context, 'name', form.name, 300);
  addText(context, 'category', form.category, 300);
  addText(context, 'description', form.description, 1000);
  addText(context, 'account', form.account, 300);
  addText(context, 'brand', form.brand, 300);
  addText(context, 'model', form.model, 300);
  addNumber(context, 'acquisition_value', form.acquisition_value);
  addText(context, 'purchase_date', form.purchase_date, 300);
  addText(context, 'depreciation_start_date', form.depreciation_start_date, 300);
  addText(context, 'conservation_state', form.conservation_state, 300);
  addText(context, 'location', form.location, 300);

  const branch = branches.find((item) => item.id === form.branch_id);
  const sector = sectors.find((item) => item.id === form.sector_id);
  addText(context, 'branch_name', branch?.name, 300);
  addText(context, 'sector_name', sector?.name, 300);
  addText(context, 'supplier_name', form.supplier_name, 300);
  addText(context, 'vehicle_model_year', form.vehicle_model_year, 300);
  addText(context, 'vehicle_fuel_type', form.vehicle_fuel_type, 300);
  addNumber(context, 'property_area_m2', form.property_area_m2);
  addText(context, 'property_registration_type', form.property_registration_type, 300);
  addText(context, 'ownership_type', form.ownership_type, 300);
  context.is_construction_in_progress = form.is_construction_in_progress === true;
  addText(context, 'construction_completion_date', form.construction_completion_date, 300);
  addText(context, 'notes', form.notes, 1000);
  return context;
}

export function getSuggestionEligibility(context) {
  const hasName = cleanText(context.name).length >= 3;
  const hasCategory = CATEGORIES.includes(context.category);
  const missingBase = [];
  if (!hasName) missingBase.push('preencha a descri\u00e7\u00e3o do bem com pelo menos 3 caracteres');
  if (!hasCategory) missingBase.push('selecione um grupo patrimonial v\u00e1lido');

  const depreciationEnabled = missingBase.length === 0;
  const hasAcquisitionValue = typeof context.acquisition_value === 'number' && context.acquisition_value > 0;
  const residualMissing = [...missingBase];
  if (!hasAcquisitionValue) residualMissing.push('informe um valor de aquisi\u00e7\u00e3o maior que zero');

  return {
    depreciation: {
      enabled: depreciationEnabled,
      reason: depreciationEnabled
        ? ''
        : `Para sugerir taxa e vida \u00fatil, ${missingBase.join(' e ')}.`,
    },
    residual: {
      enabled: residualMissing.length === 0,
      reason: residualMissing.length === 0
        ? ''
        : `Para sugerir valor residual, ${residualMissing.join(' e ')}.`,
    },
  };
}

export function buildSuggestAssetParametersPayload(editId, params, context) {
  return {
    entity_type: 'Asset',
    asset_id: editId || undefined,
    requested_parameters: params,
    asset_context: context,
  };
}

export function fiscalSuggestionsFromResponse(response) {
  const suggestions = response?.suggestions && typeof response.suggestions === 'object' ? response.suggestions : {};
  return FISCAL_DEPRECIATION_SUGGESTION_FIELDS.reduce((acc, field) => {
    if (suggestions[field]) acc[field] = suggestions[field];
    return acc;
  }, {});
}

export function fiscalClassificationFromSuggestions(suggestions = {}) {
  return FISCAL_DEPRECIATION_SUGGESTION_FIELDS
    .map((field) => suggestions[field]?.fiscal_classification)
    .find(Boolean) || null;
}

export function fiscalEvaluationFromSuggestions(suggestions = {}) {
  return FISCAL_DEPRECIATION_SUGGESTION_FIELDS
    .map((field) => suggestions[field]?.fiscal_evaluation)
    .find(Boolean) || null;
}

export function fiscalRefinementStateFromClassification(classification) {
  return classification?.refinement_state || null;
}

export function fiscalCurrentQuestion(classification) {
  const refinement = fiscalRefinementStateFromClassification(classification);
  if (refinement?.current_question) return refinement.current_question;
  return Array.isArray(classification?.questions) ? classification.questions[0] || null : null;
}

export function fiscalRefinementToken(classification) {
  return fiscalRefinementStateFromClassification(classification)?.refinement_state_token || null;
}

export function fiscalReadyOption(classification) {
  if (!classification || !Array.isArray(classification.options)) return null;
  const status = classification?.refinement_state?.status || classification?.status || '';
  if (status !== 'READY_FOR_CONFIRMATION') return null;
  const confirmed = classification.confirmed_option_id
    ? classification.options.find((option) => option.option_id === classification.confirmed_option_id)
    : null;
  if (confirmed?.can_release_fiscal_rule === true) return confirmed;
  return classification.options.find((option) => option.option_id !== 'NONE_OF_THE_OPTIONS' && option.can_release_fiscal_rule === true) || null;
}

export function fiscalUserMessage(status, evaluationStatus = '') {
  if (status === 'REQUIRES_HUMAN_REVIEW') {
    return 'Não foi possível concluir esta classificação automaticamente. Revise os dados do bem ou solicite análise do responsável fiscal/contábil.';
  }
  if (status === 'NO_SAFE_CANDIDATE') {
    return 'Não encontramos uma classificação fiscal segura para este bem com as informações disponíveis. Revise o nome e a descrição do item e tente novamente.';
  }
  if (evaluationStatus === 'OUT_OF_DEFAULT_SCOPE') {
    return 'Esta sugestão fiscal automática não é aplicada ao Simples Nacional neste fluxo padrão. Consulte o responsável contábil/fiscal.';
  }
  if (evaluationStatus === 'REQUIRES_TAX_REGIME_CONFIRMATION') {
    return 'Informe o regime tributário aplicável para continuar a análise fiscal.';
  }
  return '';
}

export function isInvalidFiscalTokenMessage(classification) {
  const warnings = classification?.refinement_state?.warnings || [];
  return warnings.some((warning) => /estado assinado|expir|invalido|inválido/i.test(String(warning || '')));
}

export function buildNextFiscalRefinementState(prev, payload, contextKey, fallbackStatus = '') {
  const suggestions = fiscalSuggestionsFromResponse(payload);
  const classification = fiscalClassificationFromSuggestions(suggestions);
  const refinement = classification?.refinement_state || null;
  const token = fiscalRefinementToken(classification);
  const question = fiscalCurrentQuestion(classification);
  const readyOption = fiscalReadyOption(classification);
  const hasFiscalSuggestion = hasFoundSuggestionForFields(suggestions, FISCAL_DEPRECIATION_SUGGESTION_FIELDS);
  const status = hasFiscalSuggestion
    ? 'SUGGESTION_READY'
    : refinement?.status || fallbackStatus || classification?.status || 'NEEDS_MORE_INFORMATION';

  return {
    ...prev,
    loading: false,
    error: '',
    status,
    currentQuestion: question,
    refinementStateToken: token ?? null,
    selectedOption: '',
    readyOption,
    suggestions,
    classification,
    response: payload,
    applied: {},
    contextKey,
  };
}

export function buildFiscalRefinementContext(baseContext, state, action, options = {}) {
  const context = {
    ...baseContext,
    fiscal_classification_action: action,
  };
  if (options.taxRegime) context.tax_regime = options.taxRegime;
  const token = options.refinementStateToken || state?.refinementStateToken;
  if (token) context.fiscal_refinement_state_token = token;
  const answers = { ...(state?.answers || {}) };
  if (options.questionId && options.answerValue) answers[options.questionId] = options.answerValue;
  if (Object.keys(answers).length > 0) context.fiscal_classification_answers = answers;
  if (action === 'CONFIRM_OPTION' && options.selectedOption) {
    context.ncm_classification_status = 'CONFIRMED_BY_USER';
    context.ncm_source = 'CLASSIFICATION_OPTION';
    context.selected_fiscal_classification_option_id = options.selectedOption.option_id;
    context.selected_fiscal_classification_catalog_version = options.selectedOption.classification_catalog_version;
    context.selected_fiscal_classification_option_fingerprint = options.selectedOption.option_fingerprint;
    context.selected_fiscal_classification_name = options.selectedOption.display_name;
  }
  return context;
}

export function requestFieldsForSuggestion(field) {
  return DEPRECIATION_SUGGESTION_FIELDS.includes(field)
    ? DEPRECIATION_SUGGESTION_FIELDS
    : [field];
}

export function applySuggestionValue(form, field, suggestion) {
  if (!suggestion?.found || typeof suggestion.value !== 'number') return form;
  return { ...form, [field]: String(suggestion.value) };
}

export function applyDepreciationRateInput(form, value) {
  const numericValue = parseFloat(value);
  return {
    ...form,
    depreciation_rate: value,
    useful_life_years: Number.isFinite(numericValue) && numericValue > 0
      ? Number((100 / numericValue).toFixed(1))
      : form.useful_life_years,
  };
}

export function applyUsefulLifeInput(form, value) {
  const numericValue = parseFloat(value);
  return {
    ...form,
    useful_life_years: value,
    depreciation_rate: Number.isFinite(numericValue) && numericValue > 0
      ? Number((100 / numericValue).toFixed(1))
      : form.depreciation_rate,
  };
}

export function formatSuggestionValue(field, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  if (field === 'depreciation_rate' || field === 'fiscal_depreciation_rate') return `${value}% ao ano`;
  if (field === 'useful_life_years' || field === 'fiscal_useful_life_years') return `${value} anos`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function confidenceLabel(confidence) {
  if (confidence === 'high') return 'Confiança alta';
  if (confidence === 'medium') return 'Confiança média';
  return 'Confiança baixa';
}

export function confidenceValueLabel(confidence) {
  if (confidence === 'high') return 'Alta';
  if (confidence === 'medium') return 'Média';
  return 'Baixa';
}

export function uniqueSuggestionWarnings(warnings) {
  if (!Array.isArray(warnings)) return [];
  const out = [];
  warnings.forEach((warning) => {
    const text = cleanText(warning, 240);
    if (text && !out.includes(text)) out.push(text);
  });
  return out.slice(0, 3);
}

export function isManagementWarning(warning) {
  return /estimativa gerencial baseada nos dados informados|estimativa gerencial e precisa de valid/i.test(String(warning || ''));
}

export function isStandardSuggestionNotice(warning) {
  const text = cleanText(warning, 240).toLowerCase();
  return SUGGESTION_NOTICE_WARNINGS.some((notice) => notice.toLowerCase() === text) || isManagementWarning(text);
}

export function uniqueWarningsForSuggestions(suggestions = []) {
  const nonManagementWarnings = [];
  let hasManagementWarning = false;

  suggestions.forEach((suggestion) => {
    const warnings = Array.isArray(suggestion?.warnings) ? suggestion.warnings : [];
    warnings.forEach((warning) => {
      const text = cleanText(warning, 240);
      if (!text) return;
      if (isManagementWarning(text)) {
        hasManagementWarning = true;
        return;
      }
      if (!nonManagementWarnings.includes(text)) nonManagementWarnings.push(text);
    });
  });

  return [
    ...nonManagementWarnings.slice(0, 4),
    ...(hasManagementWarning ? [MANAGEMENT_WARNING] : []),
  ];
}

export function hasFoundSuggestion(suggestion) {
  return suggestion?.found === true;
}

export function hasFoundSuggestionForFields(suggestionsByField, fields = []) {
  if (!suggestionsByField || typeof suggestionsByField !== 'object') return false;
  return fields.some((field) => hasFoundSuggestion(suggestionsByField[field]));
}

export function sourceTypeLabel(type) {
  const labels = {
    contabil: 'Contábil',
    fiscal: 'Fiscal',
    tecnica: 'Técnica',
    mercado: 'Mercado',
    construcao: 'Construção',
  };
  return labels[type] || 'Fonte confiável';
}

export function isValidHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function formatConsultedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function normalizeSourceSummary(value, limit = 220) {
  return cleanText(value, limit);
}

export function normalizeConsultedSources(sources) {
  if (!Array.isArray(sources)) return [];
  const byKey = new Map();
  sources.forEach((source) => {
    if (!source || source.used !== true || !isValidHttpsUrl(source.url)) return;
    const key = `${source.id || source.name || ''}:${source.url}`;
    if (byKey.has(key)) return;
    byKey.set(key, {
      id: cleanText(source.id, 80),
      name: cleanText(source.name, 120) || 'Fonte consultada',
      type: sourceTypeLabel(source.type),
      url: source.url,
      title: cleanText(source.title, 160),
      summary: normalizeSourceSummary(source.summary),
      consulted_at: formatConsultedAt(source.retrieved_at),
    });
  });
  return Array.from(byKey.values()).slice(0, 6);
}

export function summarizeSuggestionSources(response, suggestion, maxItems = 2) {
  const sources = Array.isArray(response?.sources_consulted) ? response.sources_consulted : [];
  const sourceIds = Array.isArray(suggestion?.source_ids) ? suggestion.source_ids.filter(Boolean) : [];
  const selected = sourceIds.length > 0
    ? sources.filter((source) => sourceIds.includes(source.id))
    : sources;

  const names = [];
  selected.forEach((source) => {
    const name = cleanText(source?.name, 80);
    if (name && !names.includes(name)) names.push(name);
  });

  if (names.length === 0) return '';
  const visible = names.slice(0, maxItems).join(', ');
  const remaining = names.length - maxItems;
  return remaining > 0 ? `${visible} +${remaining}` : visible;
}

export function normalizeFiscalReference(reference) {
  if (!reference || reference.found !== true || typeof reference.value !== 'number' || !Number.isFinite(reference.value)) return null;
  return {
    value: reference.value,
    unit: reference.unit === 'percent_per_year' ? '% ao ano' : cleanText(reference.unit, 40),
    warning: cleanText(reference.warning, 180) || 'Referência fiscal; não substitui a estimativa gerencial ou a análise contábil.',
  };
}

export function normalizeSuggestionFunctionResponse(payload) {
  const data = payload?.data || payload || {};
  const suggestions = data.suggestions && typeof data.suggestions === 'object' && !Array.isArray(data.suggestions) ? data.suggestions : {};
  const hasSuggestionPayload = Object.values(suggestions).some((suggestion) => (
    suggestion && typeof suggestion === 'object' && 'found' in suggestion
  ));
  const hasValidShape = Boolean(
    hasSuggestionPayload
    || Array.isArray(data.sources_consulted)
    || Array.isArray(data.sources_failed)
    || data.fiscal_reference,
  );
  const ok = data.ok === true || (data.ok !== false && hasValidShape);
  if (!ok) {
    return {
      ok: false,
      basis: cleanText(data.basis, 80),
      suggestions: {},
      sources_consulted: [],
      has_failed_sources: Array.isArray(data.sources_failed) && data.sources_failed.length > 0,
      fiscal_reference: null,
      requires_user_confirmation: data.requires_user_confirmation !== false,
      generated_at: data.generated_at || '',
    };
  }
  return {
    ok,
    basis: cleanText(data.basis, 80),
    suggestions,
    sources_consulted: normalizeConsultedSources(data.sources_consulted),
    has_failed_sources: Array.isArray(data.sources_failed) && data.sources_failed.length > 0,
    fiscal_reference: normalizeFiscalReference(data.fiscal_reference),
    requires_user_confirmation: data.requires_user_confirmation !== false,
    generated_at: data.generated_at || '',
  };
}

export function friendlySuggestionError(error) {
  const data = error?.response?.data || error?.data || {};
  const message = String(data.error || error?.message || '').trim();
  const code = String(data.code || '').trim();
  const failures = Array.isArray(data.sources_failed) ? data.sources_failed : [];

  if (code === 'NO_TRUSTED_SOURCE_AVAILABLE') {
    return 'Não foi possível consultar uma fonte confiável neste momento. Tente novamente ou informe os valores manualmente.';
  }
  if (/timeout|tempo|demorou/i.test(message) || failures.some((item) => /timeout/i.test(String(item?.reason_code || '')))) {
    return 'A consulta às fontes demorou mais que o esperado. Tente novamente.';
  }
  if (!message) return 'Não foi possível gerar a sugestão agora. Você pode tentar novamente ou preencher os valores manualmente.';
  if (/permission|permiss|unauthorized|forbidden|403|401/i.test(message)) {
    return 'Você não tem permissão para gerar sugestões neste cadastro.';
  }
  if (/payload|context|category|categoria|parameter|parametro/i.test(message)) {
    return 'Preencha os dados indicados para gerar uma sugestão mais segura.';
  }
  if (/fonte confiavel|fonte confiável|evidencia|evidência/i.test(message)) {
    return 'As fontes foram consultadas, mas não foram encontradas informações suficientes para gerar uma sugestão segura.';
  }
  return 'Não foi possível gerar a sugestão agora. Você pode tentar novamente ou preencher os valores manualmente.';
}
