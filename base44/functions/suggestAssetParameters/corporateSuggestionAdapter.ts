import {
  calculateRateOnDepreciableAmount,
  evaluateCorporateDepreciation,
} from './normative/corporateRules.ts';
import type {
  CorporateAssetNature,
  CorporateDepreciationEvaluationResult,
  NormativeReference,
} from './normative/normativeEngine.types.ts';

type ParameterName = 'depreciation_rate' | 'useful_life_years' | 'residual_value';
type Confidence = 'low' | 'medium' | 'high';
type SanitizedContext = Record<string, string | number | boolean>;

type Suggestion = {
  found: boolean;
  value: number | null;
  unit: string;
  confidence: Confidence;
  reason: string;
  based_on: string[];
  missing_data: string[];
  warnings: string[];
  source_ids: string[];
  corporate_evaluation?: CorporateSuggestionMetadata;
};

type CorporateSuggestionMetadata = {
  status: CorporateDepreciationEvaluationResult['status'];
  asset_nature: CorporateAssetNature;
  asset_nature_confirmation_required: boolean;
  useful_life_years: number | null;
  residual_value: number | null;
  depreciation_rate: number | null;
  depreciable_amount: number | null;
  annual_expense: number | null;
  monthly_expense: number | null;
  warnings: string[];
  blocking_reasons: string[];
  applied_rule_ids: string[];
  references: NormativeReference[];
};

type AdapterInput = {
  context: SanitizedContext;
  requestedParams: ParameterName[];
  suggestions: Partial<Record<ParameterName, Suggestion>>;
  rawAiSuggestions?: Record<string, unknown>;
};

const BLOCKING_STATUSES = new Set([
  'REQUIRES_CLASSIFICATION',
  'NOT_DEPRECIABLE',
  'DO_NOT_AMORTIZE',
  'REQUIRES_COMPONENT_REVIEW',
  'REQUIRES_HELD_FOR_SALE_REVIEW',
  'ROUTE_TO_LEASE_POLICY',
  'ROUTE_TO_INVESTMENT_PROPERTY_POLICY',
]);

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: unknown): string {
  return stripAccents(String(value || '').toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchableText(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fieldText(context: SanitizedContext, fields: string[]): string {
  return normalizeText(fields.map((field) => context[field]).filter(Boolean).join(' '));
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const normalized = normalizeText(phrase);
  if (!normalized) return false;
  return ` ${matchableText(haystack)} `.includes(` ${matchableText(normalized)} `);
}

function hasAnyPhrase(haystack: string, terms: string[]): boolean {
  return terms.some((term) => hasPhrase(haystack, term));
}

function hasCategory(context: SanitizedContext, category: string): boolean {
  const normalized = normalizeText(context.category);
  const expected = normalizeText(category);
  if (normalized === expected) return true;
  if (expected === 'imoveis') return normalized === 'im veis';
  if (expected === 'intangiveis') return normalized === 'intang veis';
  return false;
}

function hasLandSignal(context: SanitizedContext, structuredText: string, fullText: string): boolean {
  if (hasAnyPhrase(structuredText, ['terreno', 'gleba'])) return true;
  if (hasAnyPhrase(structuredText, ['lote urbano', 'lote imobiliario', 'lote de terreno'])) return true;
  if (hasCategory(context, 'Imóveis') && hasAnyPhrase(fullText, ['lote urbano', 'lote imobiliario', 'terreno', 'gleba'])) {
    return true;
  }
  return false;
}

function hasBuildingSignal(context: SanitizedContext, structuredText: string, fullText: string): boolean {
  if (hasAnyPhrase(structuredText, ['edificacao', 'edificio', 'predio', 'construcao'])) return true;
  if (!hasAnyPhrase(fullText, ['benfeitoria'])) return false;
  return hasCategory(context, 'Imóveis')
    || hasAnyPhrase(fullText, [
      'imovel proprio',
      'imovel de terceiros',
      'instalacao incorporada',
      'reforma',
      'construcao',
      'edificacao',
      'direito de uso',
    ]);
}

function hasIntangibleSignal(context: SanitizedContext, structuredText: string, fullText: string): boolean {
  if (hasCategory(context, 'Intangíveis')) return true;
  if (hasAnyPhrase(structuredText, ['software', 'licenca', 'licenca de uso', 'patente'])) return true;
  if (hasAnyPhrase(structuredText, ['marcas e patentes', 'marca e patente'])) return true;
  return hasAnyPhrase(fullText, [
    'registro da marca',
    'direito sobre marca',
    'direito de exploracao da marca',
    'marca comercial adquirida',
    'ativo intangivel referente a marca',
  ]);
}

export function inferCorporateAssetNature(context: SanitizedContext): CorporateAssetNature {
  const category = normalizeText(context.category);
  const structuredText = fieldText(context, ['category', 'account', 'name']);
  const fullText = fieldText(context, ['category', 'account', 'name', 'description', 'notes']);

  if (hasAnyPhrase(structuredText, ['direito de uso', 'arrendamento', 'leasing'])) return 'RIGHT_OF_USE';
  if (hasAnyPhrase(structuredText, ['propriedade para investimento', 'imovel para investimento'])) return 'INVESTMENT_PROPERTY';
  if (hasLandSignal(context, structuredText, fullText)) return 'LAND';
  if (hasBuildingSignal(context, structuredText, fullText)) return 'BUILDING';

  const vagueImprovement = hasAnyPhrase(fullText, ['benfeitoria']) && !hasBuildingSignal(context, structuredText, fullText);
  if (vagueImprovement) return 'UNKNOWN';

  if (hasIntangibleSignal(context, structuredText, fullText)) {
    if (hasAnyPhrase(fullText, ['vida indefinida', 'prazo indefinido', 'indefinida'])) return 'INDEFINITE_INTANGIBLE';
    return 'FINITE_INTANGIBLE';
  }

  if (category === 'equipamentos' || category === 'veiculos') return 'PPE';
  if (hasAnyPhrase(structuredText, ['maquina', 'equipamento', 'veiculo', 'computador', 'notebook', 'movel', 'mobiliario', 'ar condicionado', 'freezer', 'monitor'])) return 'PPE';
  return 'UNKNOWN';
}

function unitFor(parameter: ParameterName): string {
  if (parameter === 'depreciation_rate') return 'percent_per_year';
  if (parameter === 'useful_life_years') return 'years';
  return 'BRL';
}

function notFound(parameter: ParameterName, reason: string, base?: Suggestion, warnings: string[] = []): Suggestion {
  return {
    found: false,
    value: null,
    unit: unitFor(parameter),
    confidence: base?.confidence || 'low',
    reason,
    based_on: base?.based_on || [],
    missing_data: base?.missing_data || [],
    warnings: [...new Set([...(base?.warnings || []), ...warnings])],
    source_ids: base?.source_ids || [],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function numericValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function validUsefulLife(value: unknown): number | null {
  const num = numericValue(value);
  return num != null && num > 0 && num <= 100 ? num : null;
}

function validResidual(value: unknown): number | null {
  const num = numericValue(value);
  return num != null && num >= 0 ? num : null;
}

function rawAiUsefulLife(rawAiSuggestions?: Record<string, unknown>): number | null {
  const raw = rawAiSuggestions?.useful_life_years;
  if (!isPlainObject(raw) || raw.found !== true || raw.unit !== 'years') return null;
  return validUsefulLife(raw.value);
}

function contextUsefulLife(context: SanitizedContext): number | null {
  return validUsefulLife(context.useful_life_years);
}

function contextResidual(context: SanitizedContext): number | null {
  return validResidual(context.residual_value);
}

function acquisitionCost(context: SanitizedContext): number | null {
  const value = numericValue(context.acquisition_value);
  return value != null && value > 0 ? value : null;
}

function availableForUseDate(context: SanitizedContext): string | null {
  if (typeof context.available_for_use_date === 'string' && context.available_for_use_date) return context.available_for_use_date;
  if (typeof context.depreciation_start_date === 'string' && context.depreciation_start_date) return context.depreciation_start_date;
  return null;
}

function metadataFromEvaluation(
  evaluation: CorporateDepreciationEvaluationResult,
  assetNature: CorporateAssetNature,
  usefulLifeYears: number | null,
  residualValue: number | null,
  depreciationRate: number | null,
): CorporateSuggestionMetadata {
  return {
    status: evaluation.status,
    asset_nature: assetNature,
    asset_nature_confirmation_required: true,
    useful_life_years: usefulLifeYears,
    residual_value: residualValue,
    depreciation_rate: depreciationRate,
    depreciable_amount: evaluation.depreciable_amount,
    annual_expense: evaluation.annual_expense,
    monthly_expense: evaluation.monthly_expense,
    warnings: evaluation.warnings,
    blocking_reasons: evaluation.blocking_reasons,
    applied_rule_ids: evaluation.applied_rule_ids,
    references: evaluation.references,
  };
}

function evaluateForMetadata(
  context: SanitizedContext,
  assetNature: CorporateAssetNature,
  usefulLifeYears: number | null,
  residualValue: number | null,
): CorporateDepreciationEvaluationResult {
  return evaluateCorporateDepreciation({
    asset_nature: assetNature,
    recognized_cost: acquisitionCost(context),
    residual_value: residualValue,
    useful_life_years: usefulLifeYears,
    depreciation_method: 'STRAIGHT_LINE',
    acquisition_date: typeof context.purchase_date === 'string' ? context.purchase_date : null,
    available_for_use_date: availableForUseDate(context),
    is_idle: context.is_idle === true,
    has_impairment_indicators: context.has_impairment_indicators === true,
    has_significant_components: context.has_significant_components === true,
    held_for_sale: context.held_for_sale === true,
    disposed: context.disposed === true,
  });
}

function blocksSuggestion(evaluation: CorporateDepreciationEvaluationResult): boolean {
  return BLOCKING_STATUSES.has(evaluation.status);
}

export function applyCorporateSuggestionAdapter(input: AdapterInput): Partial<Record<ParameterName, Suggestion>> {
  const { context, requestedParams, suggestions, rawAiSuggestions } = input;
  const assetNature = inferCorporateAssetNature(context);
  const result: Partial<Record<ParameterName, Suggestion>> = { ...suggestions };

  const usefulLife = validUsefulLife(result.useful_life_years?.value)
    ?? contextUsefulLife(context)
    ?? rawAiUsefulLife(rawAiSuggestions);
  const residual = validResidual(result.residual_value?.value) ?? contextResidual(context);
  const rate = usefulLife != null ? calculateRateOnDepreciableAmount(usefulLife) : null;
  const evaluation = evaluateForMetadata(context, assetNature, usefulLife, residual);
  const metadata = metadataFromEvaluation(evaluation, assetNature, usefulLife, residual, rate);
  const commonWarnings = [...evaluation.warnings, ...evaluation.blocking_reasons];

  if (requestedParams.includes('useful_life_years') && result.useful_life_years) {
    const base = result.useful_life_years;
    if (blocksSuggestion(evaluation)) {
      result.useful_life_years = { ...notFound('useful_life_years', evaluation.blocking_reasons[0] || 'Natureza societaria exige revisao antes da sugestao.', base, commonWarnings), corporate_evaluation: metadata };
    } else if (base.found && validUsefulLife(base.value) != null) {
      result.useful_life_years = { ...base, corporate_evaluation: metadata, warnings: [...new Set([...base.warnings, ...evaluation.warnings])] };
    }
  }

  if (requestedParams.includes('depreciation_rate') && result.depreciation_rate) {
    const base = result.depreciation_rate;
    if (!base.found) {
      result.depreciation_rate = {
        ...base,
        warnings: [...new Set([...base.warnings, ...evaluation.warnings])],
        corporate_evaluation: metadata,
      };
    } else if (blocksSuggestion(evaluation)) {
      result.depreciation_rate = { ...notFound('depreciation_rate', evaluation.blocking_reasons[0] || 'Natureza societaria exige revisao antes da taxa.', base, commonWarnings), corporate_evaluation: metadata };
    } else if (rate == null) {
      result.depreciation_rate = { ...notFound('depreciation_rate', 'Vida util societaria insuficiente para calcular a taxa linear.', base, commonWarnings), corporate_evaluation: metadata };
    } else {
      result.depreciation_rate = {
        ...base,
        found: true,
        value: rate,
        unit: 'percent_per_year',
        reason: `Taxa linear calculada a partir da vida util societaria estimada de ${usefulLife} anos.`,
        warnings: [...new Set([...base.warnings, ...evaluation.warnings])],
        corporate_evaluation: metadata,
      };
    }
  }

  if (requestedParams.includes('residual_value') && result.residual_value) {
    const base = result.residual_value;
    const residualValue = validResidual(base.value);
    const cost = acquisitionCost(context);
    if (blocksSuggestion(evaluation) && assetNature !== 'FINITE_INTANGIBLE') {
      result.residual_value = { ...notFound('residual_value', evaluation.blocking_reasons[0] || 'Natureza societaria exige revisao antes do residual.', base, commonWarnings), corporate_evaluation: metadata };
    } else if (assetNature === 'FINITE_INTANGIBLE' && residualValue != null && residualValue > 0) {
      result.residual_value = {
        ...base,
        warnings: [...new Set([...base.warnings, 'Residual positivo em intangivel de vida definida exige revisao humana.', ...evaluation.warnings])],
        corporate_evaluation: metadata,
      };
    } else if (residualValue == null) {
      result.residual_value = { ...notFound('residual_value', 'Valor residual societario invalido.', base, commonWarnings), corporate_evaluation: metadata };
    } else if (cost != null && residualValue > cost) {
      result.residual_value = { ...notFound('residual_value', 'Valor residual nao pode superar o custo reconhecido.', base, commonWarnings), corporate_evaluation: metadata };
    } else {
      const warnings = cost == null ? ['Custo reconhecido ausente; o limite superior do residual nao pode ser validado.'] : [];
      result.residual_value = {
        ...base,
        warnings: [...new Set([...base.warnings, ...warnings, ...evaluation.warnings])],
        corporate_evaluation: metadata,
      };
    }
  }

  return result;
}
