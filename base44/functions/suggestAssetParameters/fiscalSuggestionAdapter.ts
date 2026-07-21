import { findClassificationCandidates } from './normative/assetClassificationCandidates.ts';
import {
  findFiscalRateByConfirmedNcm,
  normalizeNcm,
} from './normative/fiscalDepreciationByNcm.ts';
import { findNormativeSource } from './normative/normativeSources.ts';
import type {
  ClassificationStatus,
  FiscalLookupResult,
  FiscalLookupStatus,
  NormativeReference,
  TaxRegime,
} from './normative/normativeEngine.types.ts';

type FiscalParameterName = 'fiscal_depreciation_rate' | 'fiscal_useful_life_years' | 'fiscal_residual_value';
type Confidence = 'low' | 'medium' | 'high';
type SanitizedContext = Record<string, string | number | boolean | Record<string, string> | string[]>;

export type DirectFiscalCatalogOption = {
  display_name: string;
  plain_description: string;
  ncm_code: string;
  ncm_display: string;
  candidate_type: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  matched_terms: string[];
  missing_attributes: string[];
  source_id: string | null;
  source_reference: string | null;
  official_description: string | null;
  requires_human_confirmation: true;
};

type FiscalClassificationMetadata = {
  status: ClassificationStatus;
  action: 'CLASSIFY_DIRECT';
  confirmed_display_name: string | null;
  confirmed_ncm_code: string | null;
  candidate_ncm_codes: string[];
  candidate_type: string | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  matched_terms: string[];
  missing_attributes: string[];
  options: DirectFiscalCatalogOption[];
  ambiguous: boolean;
  requires_human_confirmation: boolean;
  reason: string | null;
  display_name?: string | null;
  ncm_code?: string | null;
  ncm_display?: string | null;
  source_ids?: string[];
  source_name?: string | null;
  legal_reference?: string | null;
  used_fields?: string[];
};

type FiscalEvaluationMetadata = {
  status: FiscalLookupStatus;
  ncm_code: string | null;
  classification_status: ClassificationStatus;
  tax_regime: TaxRegime;
  fiscal_depreciation_rate: number | null;
  fiscal_useful_life_years: number | null;
  fiscal_residual_value: null;
  residual_policy: 'NOT_DEFINED_BY_GENERAL_ANNEX_III_RATE_RULE' | null;
  description_summary: string | null;
  ncm_reference_version: string | null;
  verification_status: string | null;
  requires_human_confirmation: boolean;
  warnings: string[];
  blocking_reasons: string[];
  references: NormativeReference[];
};

type FiscalSuggestion = {
  found: boolean;
  value: number | null;
  unit: string;
  confidence: Confidence;
  reason: string;
  based_on: string[];
  missing_data: string[];
  warnings: string[];
  source_ids: string[];
  fiscal_classification?: FiscalClassificationMetadata;
  fiscal_evaluation?: FiscalEvaluationMetadata;
};

type AdapterInput = {
  context: SanitizedContext;
  requestedParams: FiscalParameterName[];
  suggestions?: Partial<Record<string, FiscalSuggestion>>;
  aiChoice?: DirectFiscalAiChoice | null;
};

export type DirectFiscalAiChoice = {
  selected_ncm_code?: string | null;
  reason?: string | null;
  confidence?: Confidence | null;
  used_fields?: string[] | null;
  alternative_ncm_codes?: string[] | null;
};

const FISCAL_STATUS_MESSAGES: Record<FiscalLookupStatus, string> = {
  MATCHED: 'Regra fiscal encontrada na base normativa local por classificacao confirmada.',
  NOT_FOUND: 'Nao existe regra fiscal encontrada na base normativa local para a classificacao escolhida.',
  REQUIRES_NCM_CONFIRMATION: 'A IA nao selecionou uma classificacao fiscal suficiente no catalogo local.',
  REQUIRES_TAX_REGIME_CONFIRMATION: 'Confirme o regime tributario antes de consultar a depreciacao fiscal.',
  OUT_OF_DEFAULT_SCOPE: 'O regime tributario informado esta fora do escopo padrao desta regra fiscal.',
  REQUIRES_TECHNICAL_EVIDENCE: 'A regra fiscal exige evidencia tecnica antes de aplicar taxa excepcional.',
  NOT_DEPRECIABLE: 'A base normativa local indica que este bem nao deve receber depreciacao fiscal automatica.',
  REQUIRES_HUMAN_REVIEW: 'A classificacao fiscal exige revisao humana antes de aplicar taxa.',
};

function fiscalString(value: unknown, limit = 500): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function fiscalTaxRegime(context: SanitizedContext): TaxRegime {
  const raw = fiscalString(context.tax_regime).toUpperCase();
  if (raw === 'LUCRO REAL') return 'LUCRO_REAL';
  if (raw === 'LUCRO PRESUMIDO') return 'LUCRO_PRESUMIDO';
  if (raw === 'SIMPLES NACIONAL') return 'SIMPLES_NACIONAL';
  if (['LUCRO_REAL', 'LUCRO_PRESUMIDO', 'SIMPLES_NACIONAL', 'OTHER'].includes(raw)) return raw as TaxRegime;
  return 'UNKNOWN';
}

function fiscalCompleteNcm(value: unknown): string | null {
  const normalized = normalizeNcm(typeof value === 'string' ? value : '');
  return normalized.length >= 4 ? normalized : null;
}

function ncmDisplay(value: string): string {
  const normalized = normalizeNcm(value);
  if (normalized.length !== 8) return normalized;
  return `${normalized.slice(0, 4)}.${normalized.slice(4, 6)}.${normalized.slice(6)}`;
}

function fiscalReferencesSourceIds(references: NormativeReference[]): string[] {
  const ids: string[] = [];
  references.forEach((reference) => {
    const sourceId = fiscalString(reference.source_id, 80);
    if (sourceId && !ids.includes(sourceId)) ids.push(sourceId);
  });
  return ids.slice(0, 4);
}

function optionFromCandidate(candidate: ReturnType<typeof findClassificationCandidates>[number], ncmCode: string): DirectFiscalCatalogOption {
  const sourceId = 'receita_in_rfb_1700_2017_anexo_iii';
  return {
    display_name: fiscalString(candidate.candidate_type.replace(/_/g, ' ').toLowerCase(), 120) || 'Classificacao fiscal local',
    plain_description: fiscalString(candidate.reason, 240) || 'Opcao do catalogo fiscal local.',
    ncm_code: ncmCode,
    ncm_display: ncmDisplay(ncmCode),
    candidate_type: candidate.candidate_type,
    confidence: candidate.confidence,
    matched_terms: [...candidate.matched_terms],
    missing_attributes: [...candidate.missing_attributes],
    source_id: sourceId,
    source_reference: 'IN RFB 1.700/2017, Anexo III',
    official_description: null,
    requires_human_confirmation: true,
  };
}

function directOptionScore(context: SanitizedContext, option: DirectFiscalCatalogOption): number {
  const text = [
    context.name,
    context.description,
    context.category,
    context.account,
    context.brand,
    context.model,
  ].map((item) => fiscalString(item).toLowerCase()).join(' ');
  let score = option.confidence === 'HIGH' ? 6 : option.confidence === 'MEDIUM' ? 4 : 2;
  option.matched_terms.forEach((term) => {
    if (text.includes(term.toLowerCase())) score += 2;
  });
  if (option.missing_attributes.length === 0) score += 2;
  return score;
}

export function buildDirectFiscalCatalogOptions(context: SanitizedContext, maxItems = 50): DirectFiscalCatalogOption[] {
  const byNcm = new Map<string, DirectFiscalCatalogOption>();
  findClassificationCandidates(context).forEach((candidate) => {
    candidate.candidate_ncm_codes.forEach((rawNcm) => {
      const ncmCode = fiscalCompleteNcm(rawNcm);
      if (!ncmCode) return;
      const current = byNcm.get(ncmCode);
      const next = optionFromCandidate(candidate, ncmCode);
      if (!current || directOptionScore(context, next) > directOptionScore(context, current)) {
        byNcm.set(ncmCode, next);
      }
    });
  });

  return Array.from(byNcm.values())
    .sort((a, b) => directOptionScore(context, b) - directOptionScore(context, a))
    .slice(0, maxItems);
}

function fiscalEvaluation(
  lookup: FiscalLookupResult,
  context: SanitizedContext,
  classificationStatus: ClassificationStatus,
  ncmCode: string | null,
  isResidual: boolean,
): FiscalEvaluationMetadata {
  const warnings = [...(lookup.references.length ? [] : [lookup.reason])];
  if (isResidual) warnings.push('A regra fiscal geral utilizada define taxa e vida util, mas nao estabelece valor residual fiscal.');
  return {
    status: lookup.status,
    ncm_code: ncmCode,
    classification_status: classificationStatus,
    tax_regime: fiscalTaxRegime(context),
    fiscal_depreciation_rate: lookup.annual_rate_percent,
    fiscal_useful_life_years: lookup.useful_life_years,
    fiscal_residual_value: null,
    residual_policy: isResidual ? 'NOT_DEFINED_BY_GENERAL_ANNEX_III_RATE_RULE' : null,
    description_summary: lookup.description_summary,
    ncm_reference_version: lookup.ncm_reference_version,
    verification_status: lookup.verification_status,
    requires_human_confirmation: true,
    warnings,
    blocking_reasons: lookup.status === 'MATCHED' && !isResidual ? [] : [lookup.reason],
    references: lookup.references,
  };
}

function directFiscalClassificationMetadata(
  context: SanitizedContext,
  options: DirectFiscalCatalogOption[],
  chosenCatalogItem: DirectFiscalCatalogOption | null,
  lookup: FiscalLookupResult,
  choice: DirectFiscalAiChoice | null,
): FiscalClassificationMetadata {
  const sourceIds = lookup.references.length > 0
    ? fiscalReferencesSourceIds(lookup.references)
    : chosenCatalogItem?.source_id ? [chosenCatalogItem.source_id] : [];
  const source = sourceIds[0] ? findNormativeSource(sourceIds[0]) : null;
  const reason = fiscalString(choice?.reason) || null;
  return {
    status: chosenCatalogItem && lookup.status === 'MATCHED' ? 'CLASSIFIED_BY_AI' : 'UNKNOWN',
    action: 'CLASSIFY_DIRECT',
    confirmed_display_name: chosenCatalogItem?.display_name || null,
    confirmed_ncm_code: chosenCatalogItem?.ncm_code || null,
    candidate_ncm_codes: [...new Set(options.map((option) => option.ncm_code))],
    candidate_type: chosenCatalogItem?.candidate_type || options[0]?.candidate_type || null,
    confidence: chosenCatalogItem?.confidence || null,
    matched_terms: chosenCatalogItem?.matched_terms || [],
    missing_attributes: [],
    options,
    ambiguous: options.length > 1,
    requires_human_confirmation: true,
    reason: reason || (chosenCatalogItem
      ? 'Classificacao fiscal sugerida por IA dentro do catalogo local.'
      : 'A IA nao encontrou uma classificacao fiscal suficientemente forte no catalogo local.'),
    display_name: chosenCatalogItem?.display_name || null,
    ncm_code: chosenCatalogItem?.ncm_code || null,
    ncm_display: chosenCatalogItem?.ncm_display || null,
    source_ids: sourceIds,
    source_name: source?.title || chosenCatalogItem?.source_id || null,
    legal_reference: chosenCatalogItem?.source_reference || lookup.references[0]?.source_reference || null,
    used_fields: Array.isArray(choice?.used_fields) ? choice.used_fields.slice(0, 8) : [],
  };
}

function fiscalNotFound(
  parameter: FiscalParameterName,
  reason: string,
  classification: FiscalClassificationMetadata,
  evaluation: FiscalEvaluationMetadata,
): FiscalSuggestion {
  return {
    found: false,
    value: null,
    unit: parameter === 'fiscal_useful_life_years' ? 'years' : parameter === 'fiscal_residual_value' ? 'BRL' : 'percent_per_year',
    confidence: 'low',
    reason,
    based_on: ['catalogo fiscal local', 'classificacao sugerida pela IA'],
    missing_data: [],
    warnings: [...new Set([...evaluation.warnings, 'Revise a classificacao fiscal antes de aplicar qualquer parametro.'])].slice(0, 6),
    source_ids: classification.source_ids || [],
    fiscal_classification: classification,
    fiscal_evaluation: evaluation,
  };
}

function fiscalMatchedSuggestion(
  parameter: FiscalParameterName,
  value: number,
  classification: FiscalClassificationMetadata,
  evaluation: FiscalEvaluationMetadata,
): FiscalSuggestion {
  return {
    found: true,
    value,
    unit: parameter === 'fiscal_useful_life_years' ? 'years' : 'percent_per_year',
    confidence: 'medium',
    reason: 'Valor fiscal retornado a partir do NCM escolhido pela IA e resolvido no catalogo local.',
    based_on: ['catalogo fiscal local', 'classificacao escolhida pela IA', 'regime tributario'],
    missing_data: [],
    warnings: [
      'Sugestao fiscal para apoio interno; confirme a classificacao fiscal antes de usar.',
      'Nao substitui revisao contábil/fiscal profissional.',
    ],
    source_ids: classification.source_ids || [],
    fiscal_classification: classification,
    fiscal_evaluation: evaluation,
  };
}

function blockedLookup(status: FiscalLookupStatus, reason: string): FiscalLookupResult {
  return {
    status,
    rule: null,
    annual_rate_percent: null,
    useful_life_years: null,
    residual_value: null,
    ncm_reference_version: null,
    verification_status: null,
    description_summary: null,
    requires_human_confirmation: true,
    reason,
    references: [],
  };
}

function noMatchSuggestions(
  requestedParams: FiscalParameterName[],
  context: SanitizedContext,
  options: DirectFiscalCatalogOption[],
  reason: string,
  status: FiscalLookupStatus = 'REQUIRES_NCM_CONFIRMATION',
): Partial<Record<string, FiscalSuggestion>> {
  const lookup = blockedLookup(status, reason);
  const classification = directFiscalClassificationMetadata(context, options, null, lookup, { reason });
  const result: Partial<Record<string, FiscalSuggestion>> = {};
  for (const parameter of requestedParams) {
    const evaluation = fiscalEvaluation(lookup, context, classification.status, null, parameter === 'fiscal_residual_value');
    result[parameter] = fiscalNotFound(parameter, reason, classification, evaluation);
  }
  return result;
}

export function applyDirectFiscalSuggestionAdapter(input: AdapterInput): Partial<Record<string, FiscalSuggestion>> {
  const requestedParams = input.requestedParams.filter((parameter) => parameter !== 'fiscal_residual_value');
  const result: Partial<Record<string, FiscalSuggestion>> = { ...(input.suggestions || {}) };
  if (requestedParams.length === 0) return result;

  if (!fiscalString(input.context.name)) {
    return {
      ...result,
      ...noMatchSuggestions(requestedParams, input.context, [], 'Informe a descricao do bem para iniciar a analise fiscal.'),
    };
  }

  const regime = fiscalTaxRegime(input.context);
  if (regime === 'SIMPLES_NACIONAL') {
    return {
      ...result,
      ...noMatchSuggestions(
        requestedParams,
        input.context,
        [],
        'O Simples Nacional esta fora do escopo automatico desta sugestao fiscal.',
        'OUT_OF_DEFAULT_SCOPE',
      ),
    };
  }
  if (regime === 'UNKNOWN') {
    return {
      ...result,
      ...noMatchSuggestions(
        requestedParams,
        input.context,
        [],
        'Informe o regime tributario para gerar a sugestao fiscal.',
        'REQUIRES_TAX_REGIME_CONFIRMATION',
      ),
    };
  }

  const options = buildDirectFiscalCatalogOptions(input.context);
  if (options.length === 0) {
    return {
      ...result,
      ...noMatchSuggestions(requestedParams, input.context, [], 'O catalogo fiscal local nao retornou opcoes para analise deste bem.'),
    };
  }

  const selectedNcm = fiscalCompleteNcm(input.aiChoice?.selected_ncm_code);
  if (!input.aiChoice || !selectedNcm) {
    return {
      ...result,
      ...noMatchSuggestions(requestedParams, input.context, options, 'A IA nao selecionou um NCM do catalogo local.'),
    };
  }

  const chosenCatalogItem = options.find((option) => option.ncm_code === selectedNcm) || null;
  if (!chosenCatalogItem) {
    return {
      ...result,
      ...noMatchSuggestions(requestedParams, input.context, options, 'O NCM sugerido pela IA nao existe no catalogo local.'),
    };
  }

  const lookup = findFiscalRateByConfirmedNcm({
    ncm_code: chosenCatalogItem.ncm_code,
    classification_status: 'CONFIRMED_BY_USER',
    tax_regime: regime,
  });
  const classification = directFiscalClassificationMetadata(input.context, options, chosenCatalogItem, lookup, input.aiChoice || null);

  for (const parameter of requestedParams) {
    const evaluation = fiscalEvaluation(lookup, input.context, classification.status, chosenCatalogItem.ncm_code, false);
    if (lookup.status !== 'MATCHED') {
      result[parameter] = fiscalNotFound(parameter, FISCAL_STATUS_MESSAGES[lookup.status], classification, evaluation);
      continue;
    }

    const value = parameter === 'fiscal_depreciation_rate' ? lookup.annual_rate_percent : lookup.useful_life_years;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      result[parameter] = fiscalNotFound(parameter, 'O NCM foi identificado, mas nao possui taxa fiscal e vida util vinculadas no catalogo local.', classification, evaluation);
      continue;
    }

    result[parameter] = {
      ...fiscalMatchedSuggestion(parameter, value, classification, evaluation),
      confidence: input.aiChoice?.confidence || 'medium',
      reason: fiscalString(input.aiChoice?.reason) || 'Classificacao fiscal sugerida dentro do catalogo local e validada pela regra normativa.',
    };
  }

  return result;
}
