import { findClassificationCandidates } from './normative/assetClassificationCandidates.ts';
import {
  FISCAL_DEPRECIATION_RATES,
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
  distinguishing_attributes?: string[];
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
  reason_code?: string;
  fiscal_classification?: FiscalClassificationMetadata;
  fiscal_evaluation?: FiscalEvaluationMetadata;
};

type AdapterInput = {
  context: SanitizedContext;
  requestedParams: FiscalParameterName[];
  suggestions?: Partial<Record<string, FiscalSuggestion>>;
  aiChoice?: DirectFiscalAiChoice | null;
  catalogOptions?: DirectFiscalCatalogOption[];
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

const BROAD_FISCAL_CATALOG_LIMIT = 100;
const WEAK_PRIORITIZED_CATALOG_SIZE = 3;

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

function fiscalChoiceConfidence(choice: DirectFiscalAiChoice | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (choice?.confidence === 'high') return 'HIGH';
  if (choice?.confidence === 'medium') return 'MEDIUM';
  return 'LOW';
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

function optionFromAiChoice(selectedNcm: string, choice: DirectFiscalAiChoice | null): DirectFiscalCatalogOption {
  return {
    display_name: 'Classificacao fiscal provavel',
    plain_description: fiscalString(choice?.reason, 240) || 'NCM sugerido pela IA para revisao fiscal.',
    ncm_code: selectedNcm,
    ncm_display: ncmDisplay(selectedNcm),
    candidate_type: 'AI_FISCAL_HYPOTHESIS',
    confidence: fiscalChoiceConfidence(choice),
    matched_terms: [],
    missing_attributes: [],
    source_id: null,
    source_reference: null,
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

function tokenizeFiscalText(value: unknown): string[] {
  return fiscalString(value, 1200)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function fiscalContextTokens(context: SanitizedContext): Set<string> {
  return new Set([
    ...tokenizeFiscalText(context.name),
    ...tokenizeFiscalText(context.description),
    ...tokenizeFiscalText(context.category),
    ...tokenizeFiscalText(context.account),
    ...tokenizeFiscalText(context.brand),
    ...tokenizeFiscalText(context.model),
  ]);
}

function broadOptionScore(contextTokens: Set<string>, option: DirectFiscalCatalogOption): number {
  const optionTokens = new Set([
    ...tokenizeFiscalText(option.display_name),
    ...tokenizeFiscalText(option.plain_description),
    ...tokenizeFiscalText(option.official_description),
    ...option.matched_terms.flatMap((term) => tokenizeFiscalText(term)),
    ...(option.distinguishing_attributes?.flatMap((term) => tokenizeFiscalText(term)) || []),
  ]);
  let score = 0;
  contextTokens.forEach((token) => {
    if (optionTokens.has(token)) score += 4;
    optionTokens.forEach((candidate) => {
      if (candidate !== token && candidate.length >= 5 && token.length >= 5 && (candidate.includes(token) || token.includes(candidate))) {
        score += 1;
      }
    });
  });
  return score;
}

function broadOptionFromRate(rate: (typeof FISCAL_DEPRECIATION_RATES)[number]): DirectFiscalCatalogOption | null {
  const ncmCode = fiscalCompleteNcm(rate.ncm_code);
  if (!ncmCode) return null;
  const source = findNormativeSource(rate.source_id);
  const description = fiscalString(rate.description_summary, 240);
  return {
    display_name: description || `NCM ${ncmDisplay(ncmCode)}`,
    plain_description: description || 'Opcao da tabela fiscal local.',
    ncm_code: ncmCode,
    ncm_display: ncmDisplay(ncmCode),
    candidate_type: String(rate.match_kind || 'FISCAL_RATE'),
    confidence: 'LOW',
    matched_terms: tokenizeFiscalText(description).slice(0, 12),
    missing_attributes: [],
    source_id: rate.source_id || 'receita_in_rfb_1700_2017_anexo_iii',
    source_reference: rate.source_reference || 'IN RFB 1.700/2017, Anexo III',
    official_description: description || null,
    distinguishing_attributes: [
      rate.match_kind,
      source?.title,
      rate.source_reference,
      rate.ncm_reference_version,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    requires_human_confirmation: true,
  };
}

function buildBroadFiscalCatalogOptions(context: SanitizedContext, maxItems = BROAD_FISCAL_CATALOG_LIMIT): DirectFiscalCatalogOption[] {
  const tokens = fiscalContextTokens(context);
  const byNcm = new Map<string, { option: DirectFiscalCatalogOption; score: number }>();
  FISCAL_DEPRECIATION_RATES.forEach((rate) => {
    const option = broadOptionFromRate(rate);
    if (!option) return;
    const score = broadOptionScore(tokens, option);
    const current = byNcm.get(option.ncm_code);
    if (!current || score > current.score) byNcm.set(option.ncm_code, { option, score });
  });

  return Array.from(byNcm.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.option.ncm_code.localeCompare(b.option.ncm_code);
    })
    .slice(0, maxItems)
    .map(({ option }) => option);
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

  const prioritized = Array.from(byNcm.values())
    .sort((a, b) => directOptionScore(context, b) - directOptionScore(context, a))
    .slice(0, maxItems);

  if (prioritized.length >= WEAK_PRIORITIZED_CATALOG_SIZE) return prioritized;

  const merged = new Map<string, DirectFiscalCatalogOption>();
  prioritized.forEach((option) => merged.set(option.ncm_code, option));
  buildBroadFiscalCatalogOptions(context, BROAD_FISCAL_CATALOG_LIMIT).forEach((option) => {
    if (!merged.has(option.ncm_code)) merged.set(option.ncm_code, option);
  });

  return Array.from(merged.values()).slice(0, Math.max(maxItems, BROAD_FISCAL_CATALOG_LIMIT));
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
  selectedNcm: string | null = chosenCatalogItem?.ncm_code || null,
): FiscalClassificationMetadata {
  const sourceIds = lookup.references.length > 0
    ? fiscalReferencesSourceIds(lookup.references)
    : chosenCatalogItem?.source_id ? [chosenCatalogItem.source_id] : [];
  const source = sourceIds[0] ? findNormativeSource(sourceIds[0]) : null;
  const reason = fiscalString(choice?.reason) || null;
  const candidateNcmCodes = [...new Set([
    ...options.map((option) => option.ncm_code),
    ...(selectedNcm ? [selectedNcm] : []),
  ])];
  return {
    status: chosenCatalogItem && lookup.status === 'MATCHED'
      ? 'CLASSIFIED_APPLICABLE'
      : selectedNcm
        ? 'CLASSIFIED_REVIEW_ONLY'
        : 'NO_HYPOTHESIS',
    action: 'CLASSIFY_DIRECT',
    confirmed_display_name: chosenCatalogItem?.display_name || null,
    confirmed_ncm_code: selectedNcm,
    candidate_ncm_codes: candidateNcmCodes,
    candidate_type: chosenCatalogItem?.candidate_type || options[0]?.candidate_type || null,
    confidence: chosenCatalogItem?.confidence || (selectedNcm ? fiscalChoiceConfidence(choice) : null),
    matched_terms: chosenCatalogItem?.matched_terms || [],
    missing_attributes: [],
    options,
    ambiguous: options.length > 1,
    requires_human_confirmation: true,
    reason: reason || (chosenCatalogItem
      ? lookup.status === 'MATCHED'
        ? 'Classificacao fiscal sugerida por IA dentro do catalogo local.'
        : 'Classificacao fiscal provavel; nao ha regra fiscal local aplicavel para liberar valores.'
      : selectedNcm
        ? 'Classificacao fiscal provavel; revise com responsavel fiscal antes de aplicar parametros.'
        : 'A IA nao retornou uma hipotese fiscal util.'),
    display_name: chosenCatalogItem?.display_name || null,
    ncm_code: selectedNcm,
    ncm_display: selectedNcm ? ncmDisplay(selectedNcm) : null,
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
  reasonCode?: string,
): FiscalSuggestion {
  const warnings = [...evaluation.warnings, 'Revise a classificacao fiscal antes de aplicar qualquer parametro.'];
  if (classification.status === 'CLASSIFIED_REVIEW_ONLY') {
    warnings.push('Classificacao provavel. Revise com responsavel fiscal antes de aplicar qualquer parametro.');
  }
  if (classification.confidence === 'LOW') {
    warnings.push('Confianca baixa na classificacao fiscal sugerida.');
  }
  if ((classification.source_ids || []).length === 0) {
    warnings.push('Fonte fiscal aplicavel nao identificada para liberar taxa ou vida util.');
  }
  return {
    found: false,
    value: null,
    unit: parameter === 'fiscal_useful_life_years' ? 'years' : parameter === 'fiscal_residual_value' ? 'BRL' : 'percent_per_year',
    confidence: 'low',
    reason,
    based_on: ['catalogo fiscal local', 'classificacao sugerida pela IA'],
    missing_data: [],
    warnings: [...new Set(warnings)].slice(0, 6),
    source_ids: classification.source_ids || [],
    ...(reasonCode ? { reason_code: reasonCode } : {}),
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
  reasonCode?: string,
): Partial<Record<string, FiscalSuggestion>> {
  const lookup = blockedLookup(status, reason);
  const classification = directFiscalClassificationMetadata(context, options, null, lookup, { reason });
  const result: Partial<Record<string, FiscalSuggestion>> = {};
  for (const parameter of requestedParams) {
    const evaluation = fiscalEvaluation(lookup, context, classification.status, null, parameter === 'fiscal_residual_value');
    result[parameter] = fiscalNotFound(parameter, reason, classification, evaluation, reasonCode);
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

  const options = input.catalogOptions ?? buildDirectFiscalCatalogOptions(input.context);
  if (options.length === 0) {
    return {
      ...result,
      ...noMatchSuggestions(
        requestedParams,
        input.context,
        [],
        'NO_LOCAL_NCM_CATALOG: o catalogo fiscal local nao retornou opcoes para analise deste bem.',
        'REQUIRES_NCM_CONFIRMATION',
        'NO_LOCAL_NCM_CATALOG',
      ),
    };
  }

  const selectedNcm = fiscalCompleteNcm(input.aiChoice?.selected_ncm_code);
  if (!input.aiChoice || !selectedNcm) {
    return {
      ...result,
      ...noMatchSuggestions(
        requestedParams,
        input.context,
        options,
        'A IA nao retornou uma hipotese fiscal util para este bem.',
        'REQUIRES_NCM_CONFIRMATION',
        'NO_HYPOTHESIS',
      ),
    };
  }

  const chosenCatalogItem = options.find((option) => option.ncm_code === selectedNcm) || null;
  if (!chosenCatalogItem) {
    const hypothesis = optionFromAiChoice(selectedNcm, input.aiChoice);
    const lookup = blockedLookup('NOT_FOUND', 'O NCM sugerido pela IA nao possui regra fiscal local aplicavel.');
    const classification = directFiscalClassificationMetadata(input.context, options, hypothesis, lookup, input.aiChoice || null, selectedNcm);
    const reviewOnly: Partial<Record<string, FiscalSuggestion>> = {};
    for (const parameter of requestedParams) {
      const evaluation = fiscalEvaluation(lookup, input.context, classification.status, selectedNcm, parameter === 'fiscal_residual_value');
      reviewOnly[parameter] = fiscalNotFound(
        parameter,
        'Classificacao fiscal provavel identificada, mas sem regra fiscal local aplicavel para liberar taxa ou vida util.',
        classification,
        evaluation,
        'CLASSIFIED_REVIEW_ONLY',
      );
    }
    return {
      ...result,
      ...reviewOnly,
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
