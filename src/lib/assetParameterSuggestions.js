export const SUGGESTION_PARAMETERS = {
  depreciation_rate: { label: 'Taxa de Deprecia\u00e7\u00e3o Anual', unit: '% ao ano' },
  useful_life_years: { label: 'Vida \u00datil', unit: 'anos' },
  residual_value: { label: 'Valor Residual', unit: 'R$' },
};

export const DEPRECIATION_SUGGESTION_FIELDS = ['depreciation_rate', 'useful_life_years'];

const CATEGORIES = ['Im\u00f3veis', 'Ve\u00edculos', 'Equipamentos', 'Investimentos', 'Intang\u00edveis'];

export function createEmptySuggestionState() {
  return Object.keys(SUGGESTION_PARAMETERS).reduce((acc, field) => {
    acc[field] = {
      loading: false,
      suggestion: null,
      error: '',
      contextKey: '',
      stale: false,
      applied: false,
    };
    return acc;
  }, {});
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function cleanText(value, limit = 300) {
  const text = String(value || '').trim();
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
  if (field === 'depreciation_rate') return `${value}% ao ano`;
  if (field === 'useful_life_years') return `${value} anos`;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function confidenceLabel(confidence) {
  if (confidence === 'high') return 'alta';
  if (confidence === 'medium') return 'm\u00e9dia';
  return 'baixa';
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

export function friendlySuggestionError(error) {
  const message = String(error?.response?.data?.error || error?.message || '').trim();
  if (!message) return 'N\u00e3o foi poss\u00edvel gerar a sugest\u00e3o agora.';
  if (/permission|permiss|unauthorized|forbidden|403|401/i.test(message)) {
    return 'Voc\u00ea n\u00e3o tem permiss\u00e3o para gerar sugest\u00f5es neste cadastro.';
  }
  if (/payload|context|category|categoria|parameter|parametro/i.test(message)) {
    return message;
  }
  return 'N\u00e3o foi poss\u00edvel gerar a sugest\u00e3o agora. Continue preenchendo manualmente ou tente novamente.';
}
