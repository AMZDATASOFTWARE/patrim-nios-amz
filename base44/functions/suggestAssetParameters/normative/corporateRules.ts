import { CORPORATE_RULES_DATA } from './data/corporateRulesData.ts';
import { findNormativeSource } from './normativeSources.ts';
import type {
  CorporateAssetNature,
  CorporateDepreciationEvaluationInput,
  CorporateDepreciationEvaluationResult,
  CorporateDepreciationInput,
  CorporateRuleStatus,
  NormativeReference,
  NormativeValidationResult,
} from './normativeEngine.types.ts';

type CorporateRuleRecord = (typeof CORPORATE_RULES_DATA)[number];

export const CORPORATE_RULES = CORPORATE_RULES_DATA;

const STRONG_BLOCK_STATUSES: CorporateRuleStatus[] = [
  'REQUIRES_CLASSIFICATION',
  'NOT_DEPRECIABLE',
  'DO_NOT_AMORTIZE',
  'REQUIRES_COMPONENT_REVIEW',
  'REQUIRES_HELD_FOR_SALE_REVIEW',
  'ROUTE_TO_LEASE_POLICY',
  'ROUTE_TO_INVESTMENT_PROPERTY_POLICY',
];

const ANNUAL_REVIEW_WARNING = 'Vida util, valor residual e metodo devem ser revisados pelo menos ao final de cada exercicio.';

export function calculateDepreciableAmount(recognizedCost: number, residualValue: number): number {
  if (!Number.isFinite(recognizedCost) || recognizedCost <= 0) {
    throw new Error('recognized_cost must be greater than zero');
  }
  if (!Number.isFinite(residualValue) || residualValue < 0) {
    throw new Error('residual_value must be zero or greater');
  }
  if (residualValue > recognizedCost) {
    throw new Error('residual_value cannot exceed recognized_cost');
  }
  return Number((recognizedCost - residualValue).toFixed(2));
}

export function calculateStraightLineAnnualExpense(input: CorporateDepreciationInput): number {
  if (!Number.isFinite(input.useful_life_years) || input.useful_life_years <= 0) {
    throw new Error('useful_life_years must be greater than zero');
  }
  const depreciableAmount = calculateDepreciableAmount(input.recognized_cost, input.residual_value);
  return Number((depreciableAmount / input.useful_life_years).toFixed(2));
}

export function calculateRateOnDepreciableAmount(usefulLifeYears: number): number {
  if (!Number.isFinite(usefulLifeYears) || usefulLifeYears <= 0) {
    throw new Error('useful_life_years must be greater than zero');
  }
  return Number((100 / usefulLifeYears).toFixed(6));
}

function sourceRefs(rule: CorporateRuleRecord): string[] {
  const raw = 'source_refs' in rule ? rule.source_refs : [];
  return Array.isArray(raw)
    ? raw.map((ref) => (typeof ref === 'string' ? ref : String(ref?.source_id || ''))).filter(Boolean)
    : [];
}

function sourceRefObjects(rule: CorporateRuleRecord): Array<{ source_id: string; reference?: string }> {
  const raw = 'source_refs' in rule ? rule.source_refs : [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((ref) => {
      if (typeof ref === 'string') return { source_id: ref };
      return { source_id: String(ref?.source_id || ''), reference: ref?.reference ? String(ref.reference) : undefined };
    })
    .filter((ref) => ref.source_id);
}

function findCorporateRule(ruleId: string): CorporateRuleRecord | null {
  return CORPORATE_RULES_DATA.find((rule) => rule.id === ruleId) || null;
}

function referencesForRule(ruleId: string): NormativeReference[] {
  const rule = findCorporateRule(ruleId);
  if (!rule) return [];
  return sourceRefObjects(rule).map((ref) => {
    const source = findNormativeSource(ref.source_id);
    return {
      source_id: ref.source_id,
      source_reference: ref.reference,
      url: source?.official_url,
      version_label: source?.version_label,
      last_verified_at: source?.last_verified_at,
    };
  });
}

function createResult(status: CorporateRuleStatus = 'CALCULABLE'): CorporateDepreciationEvaluationResult {
  return {
    status,
    depreciable_amount: null,
    annual_expense: null,
    monthly_expense: null,
    annual_rate_percent: null,
    depreciation_start_date: null,
    depreciation_stop_date: null,
    requires_human_confirmation: true,
    blocking_reasons: [],
    warnings: [],
    applied_rule_ids: [],
    references: [],
  };
}

function uniquePush(target: string[], values: string[]): void {
  for (const value of values) {
    if (value && !target.includes(value)) target.push(value);
  }
}

function addRule(result: CorporateDepreciationEvaluationResult, ruleId: string): void {
  uniquePush(result.applied_rule_ids, [ruleId]);
  const existing = new Set(result.references.map((ref) => `${ref.source_id}:${ref.source_reference || ''}`));
  for (const reference of referencesForRule(ruleId)) {
    const key = `${reference.source_id}:${reference.source_reference || ''}`;
    if (!existing.has(key)) {
      result.references.push(reference);
      existing.add(key);
    }
  }
}

function block(
  status: CorporateRuleStatus,
  ruleIds: string[],
  blockingReasons: string[],
  warnings: string[] = [],
): CorporateDepreciationEvaluationResult {
  const result = createResult(status);
  uniquePush(result.blocking_reasons, blockingReasons);
  uniquePush(result.warnings, warnings);
  for (const ruleId of ruleIds) addRule(result, ruleId);
  return result;
}

function isUnknownNature(assetNature: CorporateAssetNature | null | undefined): boolean {
  return !assetNature || assetNature === 'UNKNOWN';
}

function isDepreciableNature(assetNature: CorporateAssetNature): boolean {
  return assetNature === 'PPE' || assetNature === 'BUILDING' || assetNature === 'FINITE_INTANGIBLE';
}

function valueIsPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function valueIsNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function resolveResidualValue(input: CorporateDepreciationEvaluationInput): number | null {
  if (input.residual_value == null && input.asset_nature === 'FINITE_INTANGIBLE') return 0;
  return typeof input.residual_value === 'number' ? input.residual_value : null;
}

function setStatusIfReview(result: CorporateDepreciationEvaluationResult, status: CorporateRuleStatus): void {
  if (result.status === 'CALCULABLE' || !STRONG_BLOCK_STATUSES.includes(result.status)) {
    result.status = status;
  }
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function calculateStraightLine(result: CorporateDepreciationEvaluationResult, input: CorporateDepreciationEvaluationInput): void {
  const residualValue = resolveResidualValue(input);
  if (!valueIsPositive(input.recognized_cost)) {
    result.status = 'REQUIRES_HUMAN_REVIEW';
    uniquePush(result.blocking_reasons, ['recognized_cost must be greater than zero.']);
    return;
  }
  if (!valueIsNonNegative(residualValue)) {
    result.status = 'REQUIRES_HUMAN_REVIEW';
    uniquePush(result.blocking_reasons, ['residual_value must be zero or greater.']);
    return;
  }
  if (residualValue > input.recognized_cost) {
    result.status = 'REQUIRES_HUMAN_REVIEW';
    uniquePush(result.blocking_reasons, ['residual_value cannot exceed recognized_cost.']);
    return;
  }
  if (!valueIsPositive(input.useful_life_years)) {
    result.status = 'REQUIRES_HUMAN_REVIEW';
    uniquePush(result.blocking_reasons, ['useful_life_years must be greater than zero.']);
    return;
  }

  const depreciableAmount = calculateDepreciableAmount(input.recognized_cost, residualValue);
  const annualExpense = calculateStraightLineAnnualExpense({
    recognized_cost: input.recognized_cost,
    residual_value: residualValue,
    useful_life_years: input.useful_life_years,
  });
  result.depreciable_amount = depreciableAmount;
  result.annual_expense = annualExpense;
  result.monthly_expense = roundCurrency(annualExpense / 12);
  result.annual_rate_percent = calculateRateOnDepreciableAmount(input.useful_life_years);
  addRule(result, 'CORP_DEPRECIABLE_AMOUNT');
  addRule(result, 'CORP_METHOD_REFLECTS_CONSUMPTION');
}

export function evaluateCorporateDepreciation(
  input: CorporateDepreciationEvaluationInput,
): CorporateDepreciationEvaluationResult {
  if (isUnknownNature(input.asset_nature)) {
    return block(
      'REQUIRES_CLASSIFICATION',
      ['CORP_CLASSIFY_ASSET_BEFORE_DEPRECIATING'],
      ['asset_nature must be classified before depreciation or amortization.'],
    );
  }

  if (input.asset_nature === 'LAND') {
    return block(
      'NOT_DEPRECIABLE',
      ['CORP_LAND_SEPARATE_FROM_BUILDING'],
      ['land is not depreciable as a standalone asset.'],
      ['Separe terreno, edificacao, melhoramentos e benfeitorias antes do calculo.'],
    );
  }

  if (input.asset_nature === 'INVENTORY' || input.asset_nature === 'OTHER') {
    return block(
      'REQUIRES_HUMAN_REVIEW',
      ['CORP_CLASSIFY_ASSET_BEFORE_DEPRECIATING'],
      ['asset_nature is not a directly depreciable fixed asset in this engine.'],
    );
  }

  if (input.asset_nature === 'INDEFINITE_INTANGIBLE' || input.intangible_life_type === 'INDEFINITE') {
    return block(
      'DO_NOT_AMORTIZE',
      ['CORP_INTANGIBLE_INDEFINITE_LIFE', 'CORP_IMPAIRMENT_INDICATORS'],
      ['indefinite-life intangible assets are not amortized.'],
      ['Realize teste anual de impairment e revise periodicamente a classificacao de vida indefinida.'],
    );
  }

  if (input.asset_nature === 'RIGHT_OF_USE') {
    return block(
      'ROUTE_TO_LEASE_POLICY',
      ['CORP_RIGHT_OF_USE_SEPARATE_POLICY'],
      ['right-of-use assets must follow the lease accounting policy.'],
    );
  }

  if (input.asset_nature === 'INVESTMENT_PROPERTY') {
    return block(
      'ROUTE_TO_INVESTMENT_PROPERTY_POLICY',
      ['CORP_INVESTMENT_PROPERTY_SEPARATE_POLICY'],
      ['investment property must follow a specific measurement policy.'],
    );
  }

  if (input.held_for_sale || input.held_for_sale_date) {
    const result = block(
      'REQUIRES_HELD_FOR_SALE_REVIEW',
      ['CORP_STOP_AT_DERECOGNITION_OR_HELD_FOR_SALE'],
      ['depreciation or amortization must stop when the asset is classified as held for sale.'],
    );
    result.depreciation_stop_date = input.held_for_sale_date || null;
    return result;
  }

  if (input.disposed || input.disposal_date) {
    const result = block(
      'REQUIRES_HUMAN_REVIEW',
      ['CORP_STOP_AT_DERECOGNITION_OR_HELD_FOR_SALE'],
      ['depreciation or amortization must stop at disposal.'],
    );
    result.depreciation_stop_date = input.disposal_date || null;
    return result;
  }

  if (input.has_significant_components) {
    return block(
      'REQUIRES_COMPONENT_REVIEW',
      ['CORP_COMPONENTIZATION'],
      ['significant components must be reviewed before a single depreciation calculation is used.'],
      ['Cadastre separadamente componente, custo, vida util, valor residual e metodo quando forem relevantes.'],
    );
  }

  const result = createResult('CALCULABLE');
  if (input.asset_nature === 'BUILDING') {
    addRule(result, 'CORP_LAND_SEPARATE_FROM_BUILDING');
    uniquePush(result.warnings, ['Edificacoes exigem separar terreno e componentes relevantes; nao use vida util fiscal como vida util societaria automatica.']);
  }
  if (input.asset_nature === 'FINITE_INTANGIBLE') {
    addRule(result, 'CORP_INTANGIBLE_FINITE_LIFE');
    addRule(result, 'CORP_INTANGIBLE_RESIDUAL_ZERO_DEFAULT');
    if (valueIsPositive(input.residual_value)) {
      setStatusIfReview(result, 'REQUIRES_HUMAN_REVIEW');
      uniquePush(result.warnings, ['Residual positivo em intangivel de vida definida exige revisao humana.']);
    }
  }
  if (input.has_impairment_indicators) {
    addRule(result, 'CORP_IMPAIRMENT_INDICATORS');
    setStatusIfReview(result, 'REQUIRES_IMPAIRMENT_REVIEW');
    uniquePush(result.warnings, ['Ha indicios de impairment; avalie recuperabilidade em fluxo separado.']);
  }
  if (input.is_idle) {
    addRule(result, 'CORP_IDLE_ASSET_CONTINUES');
    uniquePush(result.warnings, ['Ociosidade nao interrompe automaticamente a depreciacao; metodo por unidades produzidas pode gerar despesa zero sem producao.']);
  }
  if (!input.available_for_use_date) {
    addRule(result, 'CORP_START_WHEN_AVAILABLE_FOR_USE');
    uniquePush(result.warnings, ['Informe a data em que o ativo ficou disponivel para uso; aquisicao nao substitui essa data automaticamente.']);
  } else {
    result.depreciation_start_date = input.available_for_use_date;
    addRule(result, 'CORP_START_WHEN_AVAILABLE_FOR_USE');
  }

  if (!isDepreciableNature(input.asset_nature)) {
    result.status = 'REQUIRES_HUMAN_REVIEW';
    uniquePush(result.blocking_reasons, ['asset_nature is not supported for calculation in this engine.']);
    return result;
  }

  const method = input.depreciation_method || 'STRAIGHT_LINE';
  if (method === 'DECLINING_BALANCE' || method === 'UNITS_OF_PRODUCTION') {
    result.status = 'REQUIRES_HUMAN_REVIEW';
    uniquePush(result.blocking_reasons, [`${method} requires additional method-specific parameters.`]);
    uniquePush(result.warnings, ['Nao inventar calculo para metodo nao linear sem dados adicionais.']);
    addRule(result, 'CORP_METHOD_REFLECTS_CONSUMPTION');
  } else {
    calculateStraightLine(result, input);
  }

  addRule(result, 'CORP_ANNUAL_REVIEW');
  uniquePush(result.warnings, [ANNUAL_REVIEW_WARNING]);
  return result;
}

export function validateCorporateRules(rules: readonly CorporateRuleRecord[] = CORPORATE_RULES_DATA): NormativeValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (!rule.id) {
      errors.push('corporate rule without id');
      continue;
    }
    if (seen.has(rule.id)) errors.push(`duplicated corporate rule id: ${rule.id}`);
    seen.add(rule.id);
    if ('regime' in rule && rule.regime !== 'CORPORATE') errors.push(`corporate rule ${rule.id} without CORPORATE regime`);
    if (!rule.title) errors.push(`corporate rule ${rule.id} without title`);
    for (const sourceId of sourceRefs(rule)) {
      if (!findNormativeSource(sourceId)) errors.push(`corporate rule ${rule.id} references unknown source ${sourceId}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
