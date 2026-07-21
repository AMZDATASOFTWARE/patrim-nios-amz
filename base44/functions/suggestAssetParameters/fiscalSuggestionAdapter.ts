import {
  ASSET_ALIASES,
  findClassificationCandidates,
} from './normative/assetClassificationCandidates.ts';
import {
  FISCAL_DEPRECIATION_RATES,
  findFiscalRateByConfirmedNcm,
  normalizeNcm,
} from './normative/fiscalDepreciationByNcm.ts';
import { findNormativeSource } from './normative/normativeSources.ts';
import { CLASSIFICATION_UNITS_DATA } from './normative/data/classificationUnits.ts';
import type {
  AssetClassificationCandidate,
  ClassificationStatus,
  FiscalClassificationAction,
  FiscalClassificationOption,
  FiscalClassificationQuestion,
  FiscalClassificationRefinementState,
  FiscalLookupResult,
  FiscalLookupStatus,
  NcmConfirmationSource,
  NormativeReference,
  TaxRegime,
} from './normative/normativeEngine.types.ts';

type FiscalParameterName = 'fiscal_depreciation_rate' | 'fiscal_useful_life_years' | 'fiscal_residual_value';
type Confidence = 'low' | 'medium' | 'high';
type SanitizedContext = Record<string, string | number | boolean | Record<string, string> | string[]>;

type FiscalClassificationMetadata = {
  status: ClassificationStatus;
  action: FiscalClassificationAction;
  confirmed_option_id: string | null;
  confirmed_display_name: string | null;
  confirmed_ncm_code: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  candidate_ncm_codes: string[];
  candidate_type: string | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  matched_terms: string[];
  missing_attributes: string[];
  invalid_answers: string[];
  options: FiscalClassificationOption[];
  questions: FiscalClassificationQuestion[];
  refinement_state?: FiscalClassificationRefinementState;
  ambiguous: boolean;
  requires_human_confirmation: boolean;
  reason: string | null;
  display_name?: string | null;
  ncm_code?: string | null;
  ncm_display?: string | null;
  catalog_option_id?: string | null;
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

type ServerConfirmation = {
  userId: string;
  confirmedAt: string;
  canManualSpecialistConfirm?: boolean;
};

type AdapterInput = {
  context: SanitizedContext;
  requestedParams: FiscalParameterName[];
  suggestions?: Partial<Record<string, FiscalSuggestion>>;
  serverConfirmation?: ServerConfirmation;
  aiRefinement?: FiscalClassificationRefinementState;
};

export type DirectFiscalAiChoice = {
  catalog_option_id?: string | null;
  selected_catalog_option_id?: string | null;
  selected_ncm_code?: string | null;
  reason?: string | null;
  confidence?: Confidence | null;
  source_ids?: string[] | null;
  used_fields?: string[] | null;
  alternative_ncm_codes?: string[] | null;
};

type FiscalOptionTemplate = {
  display_name: string;
  plain_description: string;
  distinguishing_attributes: string[];
  ncm_code?: string | null;
};

type ClassificationUnit = {
  required_attributes: readonly string[];
  question_id: string;
  refinements: Record<string, {
    display_name: string;
    plain_description: string;
    ncm_code: string | null;
    distinguishing_attributes: readonly string[];
    requires_document?: boolean;
    requires_specialist_review?: boolean;
  }>;
};

type AnswerValidation = {
  answers: Record<string, string>;
  invalid: string[];
};

type LookupState = {
  lookup: FiscalLookupResult;
  selectedOption: FiscalClassificationOption | null;
  effectiveNcm: string | null;
  source: NcmConfirmationSource | null;
  auditOk: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
};

const FISCAL_ADAPTER_ACTIONS: FiscalClassificationAction[] = [
  'CLASSIFY_DIRECT',
  'SUGGEST_OPTIONS',
  'REFINE_OPTIONS',
  'CONFIRM_OPTION',
  'MANUAL_SPECIALIST_CONFIRMATION',
];

const FISCAL_CLASSIFICATION_STATUSES: ClassificationStatus[] = [
  'CLASSIFIED',
  'CLASSIFIED_BY_AI',
  'CONFIRMED_BY_USER',
  'CONFIRMED_BY_IMPORT',
  'SUGGESTED_BY_RULE',
  'SUGGESTED_BY_AI',
  'AMBIGUOUS',
  'UNKNOWN',
];

const FISCAL_CONFIRMATION_SOURCES: NcmConfirmationSource[] = [
  'CLASSIFICATION_OPTION',
  'MANUAL_SPECIALIST',
  'DOCUMENT_IMPORT',
  'INVOICE_IMPORT',
];

const FISCAL_TAX_REGIMES: TaxRegime[] = [
  'LUCRO_REAL',
  'LUCRO_PRESUMIDO',
  'SIMPLES_NACIONAL',
  'OTHER',
  'UNKNOWN',
];

const FISCAL_STATUS_MESSAGES: Record<FiscalLookupStatus, string> = {
  MATCHED: 'Regra fiscal encontrada na base normativa local por classificacao confirmada.',
  NOT_FOUND: 'Nao existe regra fiscal encontrada na base normativa local para a classificacao confirmada.',
  REQUIRES_NCM_CONFIRMATION: 'A depreciacao fiscal exige confirmacao do tipo do item e classificacao fiscal completa.',
  REQUIRES_TAX_REGIME_CONFIRMATION: 'Confirme o regime tributario antes de consultar a depreciacao fiscal.',
  OUT_OF_DEFAULT_SCOPE: 'O regime tributario informado esta fora do escopo padrao desta regra fiscal.',
  REQUIRES_TECHNICAL_EVIDENCE: 'A regra fiscal exige evidencia tecnica antes de aplicar taxa excepcional.',
  NOT_DEPRECIABLE: 'A base normativa local indica que este bem nao deve receber depreciacao fiscal automatica.',
  REQUIRES_HUMAN_REVIEW: 'A classificacao fiscal exige revisao humana antes de aplicar taxa.',
};

const FISCAL_OPTION_TEMPLATES: Record<string, FiscalOptionTemplate> = {
  REFRIGERATION_EQUIPMENT: {
    display_name: 'Freezer ou congelador',
    plain_description: 'Equipamento utilizado para conservacao ou congelamento de produtos.',
    distinguishing_attributes: ['Confirmar formato e funcao', 'Confirmar refrigeracao ativa', 'Confirmar documento fiscal'],
    ncm_code: null,
  },
  REFRIGERATION: {
    display_name: 'Equipamento de refrigeracao',
    plain_description: 'Equipamento destinado a refrigerar ou conservar produtos em baixa temperatura.',
    distinguishing_attributes: ['Confirmar modelo e capacidade', 'Confirmar formato', 'Confirmar NCM documental'],
    ncm_code: null,
  },
  COMPUTER_MONITOR: {
    display_name: 'Monitor ou tela',
    plain_description: 'Tela que pode ter uso com computador, televisao ou painel industrial.',
    distinguishing_attributes: ['Confirmar uso principal', 'Confirmar se possui funcao de televisao', 'Confirmar se e painel industrial'],
    ncm_code: null,
  },
  COMPUTER_EQUIPMENT: {
    display_name: 'Computador portatil ou equipamento de processamento de dados',
    plain_description: 'Equipamento destinado ao processamento automatico de dados.',
    distinguishing_attributes: ['Possui unidade de processamento', 'Confirmar se e computador completo', 'Confirmar configuracao e documento fiscal'],
    ncm_code: '84713012',
  },
  AIR_CONDITIONING: {
    display_name: 'Ar-condicionado',
    plain_description: 'Equipamento utilizado para climatizacao de ambiente.',
    distinguishing_attributes: ['Confirmar se e split, janela ou central', 'Confirmar capacidade em BTU', 'Confirmar modelo e NCM documental'],
    ncm_code: null,
  },
  INDUSTRIAL_LAUNDRY_EQUIPMENT: {
    display_name: 'Maquina de lavanderia industrial',
    plain_description: 'Maquina industrial para lavar, secar, passar ou tratar texteis.',
    distinguishing_attributes: ['Confirmar funcao principal', 'Confirmar uso industrial ou comercial', 'Confirmar modelo e NCM documental'],
    ncm_code: null,
  },
  PASSENGER_VEHICLE: {
    display_name: 'Veiculo automovel',
    plain_description: 'Veiculo automovel que exige confirmacao de uso, capacidade e configuracao.',
    distinguishing_attributes: ['Confirmar uso principal', 'Confirmar capacidade e configuracao', 'Confirmar documento fiscal'],
    ncm_code: null,
  },
  CARGO_VEHICLE: {
    display_name: 'Veiculo automovel',
    plain_description: 'Veiculo automovel que exige confirmacao de uso, capacidade e configuracao.',
    distinguishing_attributes: ['Confirmar uso principal', 'Confirmar capacidade de carga', 'Confirmar documento fiscal'],
    ncm_code: null,
  },
  SEAT_OR_CHAIR: {
    display_name: 'Cadeira ou assento',
    plain_description: 'Assento utilizado em escritorio, atendimento, refeitorio ou area operacional.',
    distinguishing_attributes: ['Confirmar material da estrutura', 'Confirmar se possui regulagem ou estofamento', 'Assentos nao devem ser confundidos com outros moveis'],
    ncm_code: null,
  },
  OFFICE_FURNITURE: {
    display_name: 'Movel de escritorio',
    plain_description: 'Mesa, armario, estante ou outro movel utilizado em ambiente administrativo.',
    distinguishing_attributes: ['Confirmar tipo de movel', 'Nao e assento', 'Confirmar material e finalidade'],
    ncm_code: null,
  },
};

const FISCAL_NONE_OPTION: Omit<FiscalClassificationOption, 'classification_catalog_version' | 'option_fingerprint'> = {
  option_id: 'NONE_OF_THE_OPTIONS',
  display_name: 'Nenhuma das opcoes descreve este item',
  plain_description: 'Informe mais caracteristicas ou encaminhe a classificacao para revisao.',
  distinguishing_attributes: ['Nao libera taxa fiscal automaticamente'],
  ncm_code: null,
  ncm_display: null,
  candidate_type: 'NONE',
  confidence: 'LOW',
  matched_terms: [],
  missing_attributes: [],
  source_id: null,
  source_reference: null,
  official_description: null,
  requires_human_confirmation: true,
  selection_status: 'REQUIRES_SPECIALIST_REVIEW',
  required_attributes: [],
  unresolved_attributes: [],
  can_release_fiscal_rule: false,
};

const FISCAL_CONFIDENCE_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
const CLASSIFICATION_CATALOG_VERSION = CLASSIFICATION_UNITS_DATA.version;

function fiscalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function fiscalFormatNcm(ncm: string | null): string | null {
  if (!ncm) return null;
  if (ncm.length === 8) return `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6, 8)}`;
  if (ncm.length === 6) return `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}`;
  return ncm;
}

function fiscalCompleteNcm(value: unknown): string | null {
  const ncm = normalizeNcm(fiscalString(value));
  return ncm.length === 8 ? ncm : null;
}

function fiscalClassificationAction(context: SanitizedContext): FiscalClassificationAction {
  const action = fiscalString(context.fiscal_classification_action).toUpperCase();
  return FISCAL_ADAPTER_ACTIONS.includes(action as FiscalClassificationAction)
    ? action as FiscalClassificationAction
    : 'SUGGEST_OPTIONS';
}

function fiscalClassificationStatus(context: SanitizedContext): ClassificationStatus {
  const status = fiscalString(context.ncm_classification_status).toUpperCase();
  return FISCAL_CLASSIFICATION_STATUSES.includes(status as ClassificationStatus) ? status as ClassificationStatus : 'UNKNOWN';
}

function fiscalTaxRegime(context: SanitizedContext): TaxRegime {
  const raw = fiscalString(context.tax_regime).toUpperCase();
  const regime = raw === 'LUCRO REAL'
    ? 'LUCRO_REAL'
    : raw === 'LUCRO PRESUMIDO'
      ? 'LUCRO_PRESUMIDO'
      : raw === 'SIMPLES NACIONAL'
        ? 'SIMPLES_NACIONAL'
        : raw;
  return FISCAL_TAX_REGIMES.includes(regime as TaxRegime) ? regime as TaxRegime : 'UNKNOWN';
}

function fiscalConfirmationSource(context: SanitizedContext): NcmConfirmationSource | null {
  const source = fiscalString(context.ncm_source).toUpperCase();
  return FISCAL_CONFIRMATION_SOURCES.includes(source as NcmConfirmationSource) ? source as NcmConfirmationSource : null;
}

function fiscalAnswers(context: SanitizedContext): Record<string, string> {
  const answers = context.fiscal_classification_answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};
  return Object.fromEntries(
    Object.entries(answers).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
}

function fiscalAnswerFingerprints(context: SanitizedContext): Record<string, string> {
  const fingerprints = context.fiscal_classification_answer_fingerprints;
  if (!fingerprints || typeof fingerprints !== 'object' || Array.isArray(fingerprints)) return {};
  return Object.fromEntries(
    Object.entries(fingerprints).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
}

function fiscalRateByPrefix(ncm: string | null) {
  if (!ncm) return null;
  return FISCAL_DEPRECIATION_RATES
    .filter((rate) => {
      const rateNcm = normalizeNcm(rate.ncm_code);
      return rateNcm && ncm.startsWith(rateNcm);
    })
    .sort((a, b) => normalizeNcm(b.ncm_code).length - normalizeNcm(a.ncm_code).length)[0] || null;
}

function fiscalOptionTemplate(candidateType: string): FiscalOptionTemplate {
  return FISCAL_OPTION_TEMPLATES[candidateType] || {
    display_name: candidateType.toLowerCase().replace(/_/g, ' '),
    plain_description: 'Opcao candidata gerada pela base local a partir do nome e descricao do ativo.',
    distinguishing_attributes: ['Confirmar caracteristicas tecnicas', 'Confirmar documento fiscal', 'Confirmar classificacao antes de usar taxa fiscal'],
    ncm_code: null,
  };
}

function fiscalUnit(candidateType: string): ClassificationUnit | null {
  const unit = CLASSIFICATION_UNITS_DATA.units[candidateType as keyof typeof CLASSIFICATION_UNITS_DATA.units];
  return unit ? unit as ClassificationUnit : null;
}

function fiscalOptionFingerprint(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => fiscalString(part).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'NONE')
    .join('__')
    .slice(0, 220);
}

function fiscalOptionId(candidateType: string, ncm: string | null, fingerprint: string): string {
  return `${candidateType}_${ncm || 'PENDING'}_${CLASSIFICATION_CATALOG_VERSION}_${fingerprint}`
    .replace(/[^A-Z0-9_]/gi, '_')
    .replace(/_+/g, '_')
    .toUpperCase()
    .slice(0, 240);
}

function fiscalNormalizeId(value: unknown, fallback = ''): string {
  const normalized = fiscalString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

function fiscalCandidateRef(candidate: AssetClassificationCandidate): string {
  return `CANDIDATE_${fiscalNormalizeId(candidate.candidate_type, 'GENERIC')}`;
}

function fiscalQuestionValues(question: FiscalClassificationQuestion): Set<string> {
  return new Set(question.options.map((option) => option.value));
}

function fiscalQuestionsForCandidateTypes(candidateTypes: Set<string>): FiscalClassificationQuestion[] {
  const questions: FiscalClassificationQuestion[] = [];
  if (candidateTypes.has('COMPUTER_MONITOR')) {
    questions.push({
      question_id: 'monitor_usage',
      question: 'Como este equipamento e utilizado?',
      related_attribute: 'monitor_usage',
      options: [
        { value: 'COMPUTER_MONITOR', label: 'Utilizado principalmente com computador' },
        { value: 'TELEVISION_CAPABLE', label: 'Possui funcao de televisao' },
        { value: 'INDUSTRIAL_DISPLAY', label: 'E um painel ou tela industrial' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  if (candidateTypes.has('SEAT_OR_CHAIR')) {
    questions.push({
      question_id: 'chair_structure_material',
      question: 'Qual e o principal material da estrutura?',
      related_attribute: 'chair_structure_material',
      options: [
        { value: 'WOOD', label: 'Madeira' },
        { value: 'METAL', label: 'Metal' },
        { value: 'PLASTIC', label: 'Plastico' },
        { value: 'MIXED', label: 'Materiais combinados' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  if (candidateTypes.has('REFRIGERATION') || candidateTypes.has('REFRIGERATION_EQUIPMENT')) {
    questions.push({
      question_id: 'refrigeration_equipment_type',
      question: 'Qual e o tipo principal do equipamento de refrigeracao?',
      related_attribute: 'refrigeration_equipment_type',
      options: [
        { value: 'COMMERCIAL_FREEZER', label: 'Freezer ou congelador comercial' },
        { value: 'REFRIGERATOR', label: 'Refrigerador ou geladeira' },
        { value: 'COLD_ROOM', label: 'Camara fria' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  if (candidateTypes.has('AIR_CONDITIONING')) {
    questions.push({
      question_id: 'air_conditioning_type',
      question: 'Qual e o tipo do ar-condicionado?',
      related_attribute: 'air_conditioning_type',
      options: [
        { value: 'SPLIT', label: 'Split' },
        { value: 'WINDOW', label: 'Janela' },
        { value: 'CENTRAL', label: 'Central' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  if (candidateTypes.has('INDUSTRIAL_LAUNDRY_EQUIPMENT')) {
    questions.push({
      question_id: 'laundry_machine_function',
      question: 'Qual e a funcao principal da maquina de lavanderia?',
      related_attribute: 'laundry_machine_function',
      options: [
        { value: 'WASHING', label: 'Lavar' },
        { value: 'DRYING', label: 'Secar' },
        { value: 'IRONING', label: 'Passar ou calandrar' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  if (candidateTypes.has('PASSENGER_VEHICLE') || candidateTypes.has('CARGO_VEHICLE')) {
    questions.push({
      question_id: 'vehicle_primary_use',
      question: 'Qual e o uso principal do veiculo?',
      related_attribute: 'vehicle_primary_use',
      options: [
        { value: 'PASSENGER_TRANSPORT', label: 'Transporte de pessoas' },
        { value: 'CARGO_TRANSPORT', label: 'Transporte de mercadorias' },
        { value: 'SPECIAL_PURPOSE', label: 'Uso especial ou adaptado' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  if (candidateTypes.has('OFFICE_FURNITURE')) {
    questions.push({
      question_id: 'furniture_kind',
      question: 'Qual e o tipo de movel?',
      related_attribute: 'furniture_kind',
      options: [
        { value: 'OFFICE_DESK', label: 'Mesa de escritorio' },
        { value: 'CABINET', label: 'Armario ou estante' },
        { value: 'OTHER_FURNITURE', label: 'Outro movel' },
        { value: 'UNKNOWN', label: 'Nao sei informar' },
      ],
    });
  }
  return questions;
}

function fiscalValidatedAnswers(
  answers: Record<string, string>,
  questions: FiscalClassificationQuestion[],
  fingerprints: Record<string, string> = {},
): AnswerValidation {
  const byId = new Map(questions.map((question) => [question.question_id, question]));
  const valid: Record<string, string> = {};
  const invalid: string[] = [];
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = byId.get(questionId);
    if (!question || !fiscalQuestionValues(question).has(answer)) {
      invalid.push(questionId);
      continue;
    }
    if (question.question_fingerprint && fingerprints[questionId] !== question.question_fingerprint) {
      invalid.push(questionId);
      continue;
    }
    valid[questionId] = answer;
  }
  return { answers: valid, invalid };
}

function fiscalQuestionFromHistory(question: FiscalClassificationRefinementState['questions_asked'][number]): FiscalClassificationQuestion {
  return {
    question_id: question.question_id,
    question: question.question,
    attribute_key: question.attribute_key,
    related_attribute: question.attribute_key,
    question_version: question.question_version,
    question_fingerprint: question.question_fingerprint,
    options: question.allowed_values.map((value) => ({
      value,
      label: value.toLowerCase().replace(/_/g, ' '),
      compatible_candidate_refs: question.selected_value === value ? question.compatible_candidate_refs || [] : [],
      refinement_search_terms: question.selected_value === value ? question.refinement_search_terms || [] : [],
    })),
  };
}

function fiscalValidationQuestions(refinement: FiscalClassificationRefinementState | undefined, fallback: FiscalClassificationQuestion[]): FiscalClassificationQuestion[] {
  const byId = new Map<string, FiscalClassificationQuestion>();
  for (const question of refinement?.questions_asked || []) {
    byId.set(question.question_id, fiscalQuestionFromHistory(question));
  }
  if (refinement?.current_question) byId.set(refinement.current_question.question_id, refinement.current_question);
  if (byId.size === 0) {
    for (const question of fallback.slice(0, 1)) byId.set(question.question_id, question);
  }
  return [...byId.values()];
}

function fiscalResolvedOptionData(candidate: AssetClassificationCandidate, answers: Record<string, string>) {
  const template = fiscalOptionTemplate(candidate.candidate_type);
  const unit = fiscalUnit(candidate.candidate_type);
  const questionId = unit?.question_id || null;
  const answer = questionId ? answers[questionId] : '';
  const refinement = answer && answer !== 'UNKNOWN' ? unit?.refinements[answer] : null;
  const requiredAttributes = unit ? [...unit.required_attributes] : [];
  const unresolvedAttributes = requiredAttributes.filter((attribute) => !answer || answer === 'UNKNOWN');
  const ncm = fiscalCompleteNcm(refinement?.ncm_code)
    || (requiredAttributes.length === 0 ? fiscalCompleteNcm(template.ncm_code) : null);
  const selectionStatus: FiscalClassificationOption['selection_status'] = unresolvedAttributes.length > 0
    ? 'REQUIRES_ATTRIBUTES'
    : refinement?.requires_document
      ? 'REQUIRES_DOCUMENT'
      : refinement?.requires_specialist_review
        ? 'REQUIRES_SPECIALIST_REVIEW'
        : ncm
          ? 'READY_FOR_CONFIRMATION'
          : 'REQUIRES_SPECIALIST_REVIEW';
  return {
    displayName: refinement?.display_name || template.display_name,
    plainDescription: refinement?.plain_description || template.plain_description,
    distinguishingAttributes: [...(refinement?.distinguishing_attributes || template.distinguishing_attributes)],
    ncm,
    requiredAttributes,
    unresolvedAttributes,
    selectionStatus,
    canReleaseFiscalRule: !!ncm && unresolvedAttributes.length === 0 && selectionStatus === 'READY_FOR_CONFIRMATION',
  };
}

function fiscalOptionFromCandidate(candidate: AssetClassificationCandidate, answers: Record<string, string>, candidate_ref: string): FiscalClassificationOption {
  const resolved = fiscalResolvedOptionData(candidate, answers);
  const rate = fiscalRateByPrefix(resolved.ncm);
  const fingerprint = fiscalOptionFingerprint([
    CLASSIFICATION_CATALOG_VERSION,
    candidate.candidate_type,
    resolved.ncm,
    resolved.displayName,
    resolved.requiredAttributes.join('|'),
    resolved.unresolvedAttributes.join('|'),
    resolved.selectionStatus,
  ]);
  return {
    candidate_ref,
    option_id: fiscalOptionId(candidate.candidate_type, resolved.ncm, fingerprint),
    display_name: resolved.displayName,
    plain_description: resolved.plainDescription,
    distinguishing_attributes: resolved.distinguishingAttributes,
    ncm_code: resolved.ncm,
    ncm_display: fiscalFormatNcm(resolved.ncm),
    candidate_type: candidate.candidate_type,
    confidence: candidate.confidence,
    matched_terms: [...candidate.matched_terms],
    missing_attributes: [...new Set([...candidate.missing_attributes, ...resolved.unresolvedAttributes])],
    source_id: rate?.source_id || null,
    source_reference: rate?.source_reference || null,
    official_description: rate?.description_summary || null,
    requires_human_confirmation: true,
    selection_status: resolved.selectionStatus,
    required_attributes: resolved.requiredAttributes,
    unresolved_attributes: resolved.unresolvedAttributes,
    can_release_fiscal_rule: resolved.canReleaseFiscalRule,
    classification_catalog_version: CLASSIFICATION_CATALOG_VERSION,
    option_fingerprint: fingerprint,
  };
}

function fiscalContextWithRefinement(context: SanitizedContext, refinement?: FiscalClassificationRefinementState): SanitizedContext {
  if (!refinement || Object.keys(refinement.known_attributes || {}).length === 0) return context;
  return {
    ...context,
    fiscal_refined_attributes: {
      ...(context.fiscal_refined_attributes && typeof context.fiscal_refined_attributes === 'object' && !Array.isArray(context.fiscal_refined_attributes)
        ? context.fiscal_refined_attributes as Record<string, string>
        : {}),
      ...refinement.known_attributes,
    },
    fiscal_refined_search_terms: [
      ...(Array.isArray(context.fiscal_refined_search_terms) ? context.fiscal_refined_search_terms.filter((item) => typeof item === 'string') : []),
      ...refinement.questions_asked.flatMap((question) => question.refinement_search_terms || []),
    ],
  };
}

function fiscalClassificationOptions(context: SanitizedContext, answers: Record<string, string>, refinement?: FiscalClassificationRefinementState): FiscalClassificationOption[] {
  const candidates = findClassificationCandidates(fiscalContextWithRefinement(context, refinement));
  const byId = new Map<string, FiscalClassificationOption>();
  for (const candidate of candidates) {
    const option = fiscalOptionFromCandidate(candidate, answers, fiscalCandidateRef(candidate));
    if (!byId.has(option.option_id)) byId.set(option.option_id, option);
  }
  const activeRank = new Map((refinement?.active_candidate_refs || []).map((ref, index) => [ref, index]));
  const options = [...byId.values()]
    .filter((option) => activeRank.size === 0 || !option.candidate_ref || activeRank.has(option.candidate_ref))
    .sort((a, b) => {
    const aiOrder = (activeRank.get(a.candidate_ref || '') ?? 999) - (activeRank.get(b.candidate_ref || '') ?? 999);
    if (aiOrder !== 0) return aiOrder;
    const releasable = Number(b.can_release_fiscal_rule) - Number(a.can_release_fiscal_rule);
    if (releasable !== 0) return releasable;
    const confidence = FISCAL_CONFIDENCE_RANK[b.confidence] - FISCAL_CONFIDENCE_RANK[a.confidence];
    if (confidence !== 0) return confidence;
    return (b.ncm_code?.length || 0) - (a.ncm_code?.length || 0);
  });
  const noneFingerprint = fiscalOptionFingerprint([CLASSIFICATION_CATALOG_VERSION, 'NONE_OF_THE_OPTIONS']);
  return [...options, {
    ...FISCAL_NONE_OPTION,
    classification_catalog_version: CLASSIFICATION_CATALOG_VERSION,
    option_fingerprint: noneFingerprint,
  }];
}

function fiscalSelectedOption(context: SanitizedContext, options: FiscalClassificationOption[]): FiscalClassificationOption | null {
  const optionId = fiscalString(context.selected_fiscal_classification_option_id);
  if (!optionId || optionId === 'NONE_OF_THE_OPTIONS') return null;
  return options.find((option) => option.option_id === optionId) || null;
}

function fiscalQuestionsForRefinement(refinement: FiscalClassificationRefinementState | undefined, fallback: FiscalClassificationQuestion[]): FiscalClassificationQuestion[] {
  if (refinement?.current_question) return [refinement.current_question];
  return fallback.slice(0, 1);
}

function fiscalClientOptionIntegrityOk(context: SanitizedContext, selectedOption: FiscalClassificationOption | null): boolean {
  if (!selectedOption) return false;
  if (fiscalString(context.selected_fiscal_classification_catalog_version) !== selectedOption.classification_catalog_version) return false;
  if (fiscalString(context.selected_fiscal_classification_option_fingerprint) !== selectedOption.option_fingerprint) return false;

  const clientName = fiscalString(context.selected_fiscal_classification_name);
  if (clientName && clientName !== selectedOption.display_name) return false;

  const clientNcm = fiscalCompleteNcm(context.ncm_code);
  if (clientNcm && clientNcm !== selectedOption.ncm_code) return false;

  return true;
}

function fiscalDocumentIdLooksControlled(value: unknown): boolean {
  const text = fiscalString(value);
  return /^[A-Z0-9][A-Z0-9_-]{5,80}$/i.test(text);
}

function fiscalAuditComplete(
  context: SanitizedContext,
  selectedOption: FiscalClassificationOption | null,
  source: NcmConfirmationSource | null,
  action: FiscalClassificationAction,
  serverConfirmation?: ServerConfirmation,
): boolean {
  if (!source || !serverConfirmation?.userId || !serverConfirmation.confirmedAt) return false;
  if (source === 'CLASSIFICATION_OPTION') {
    return action === 'CONFIRM_OPTION'
      && !!selectedOption?.can_release_fiscal_rule
      && fiscalClientOptionIntegrityOk(context, selectedOption);
  }
  if (source === 'MANUAL_SPECIALIST') {
    return action === 'MANUAL_SPECIALIST_CONFIRMATION'
      && !!serverConfirmation.canManualSpecialistConfirm
      && !!fiscalCompleteNcm(context.ncm_code)
      && !!fiscalString(context.selected_fiscal_classification_name);
  }
  if (source === 'DOCUMENT_IMPORT' || source === 'INVOICE_IMPORT') {
    return false;
  }
  return false;
}

function fiscalResolvedNcm(context: SanitizedContext, selectedOption: FiscalClassificationOption | null, source: NcmConfirmationSource | null): string | null {
  if (source === 'CLASSIFICATION_OPTION') return selectedOption?.can_release_fiscal_rule ? selectedOption.ncm_code : null;
  return fiscalCompleteNcm(context.ncm_code);
}

function fiscalBlockedLookup(context: SanitizedContext, status: FiscalLookupStatus = 'REQUIRES_NCM_CONFIRMATION'): FiscalLookupResult {
  if (status === 'REQUIRES_HUMAN_REVIEW') {
    return findFiscalRateByConfirmedNcm({ ncm_code: null, classification_status: 'CONFIRMED_BY_USER', tax_regime: 'OTHER' });
  }
  if (status === 'REQUIRES_TAX_REGIME_CONFIRMATION') {
    return findFiscalRateByConfirmedNcm({ ncm_code: null, classification_status: 'CONFIRMED_BY_USER', tax_regime: 'UNKNOWN' });
  }
  return findFiscalRateByConfirmedNcm({ ncm_code: null, classification_status: 'UNKNOWN', tax_regime: fiscalTaxRegime(context) });
}

function fiscalLookupForContext(
  context: SanitizedContext,
  status: ClassificationStatus,
  options: FiscalClassificationOption[],
  action: FiscalClassificationAction,
  invalidAnswers: string[],
  serverConfirmation?: ServerConfirmation,
): LookupState {
  const source = fiscalConfirmationSource(context);
  const selectedOption = fiscalSelectedOption(context, options);
  const effectiveNcm = fiscalResolvedNcm(context, selectedOption, source);
  const auditOk = fiscalAuditComplete(context, selectedOption, source, action, serverConfirmation);
  const allowedStatus = status === 'CONFIRMED_BY_USER' || status === 'CONFIRMED_BY_IMPORT';
  const confirmedBy = auditOk ? serverConfirmation?.userId || null : null;
  const confirmedAt = auditOk ? serverConfirmation?.confirmedAt || null : null;

  if (invalidAnswers.length > 0) {
    return { lookup: fiscalBlockedLookup(context, 'REQUIRES_HUMAN_REVIEW'), selectedOption, effectiveNcm, source, auditOk: false, confirmedBy: null, confirmedAt: null };
  }

  if (action === 'SUGGEST_OPTIONS' || action === 'REFINE_OPTIONS') {
    return { lookup: fiscalBlockedLookup(context), selectedOption, effectiveNcm, source, auditOk: false, confirmedBy: null, confirmedAt: null };
  }

  if (source === 'DOCUMENT_IMPORT' || source === 'INVOICE_IMPORT') {
    const statusForDoc = fiscalDocumentIdLooksControlled(context.ncm_import_document_id)
      ? 'REQUIRES_HUMAN_REVIEW'
      : 'REQUIRES_NCM_CONFIRMATION';
    return { lookup: fiscalBlockedLookup(context, statusForDoc), selectedOption, effectiveNcm, source, auditOk: false, confirmedBy: null, confirmedAt: null };
  }

  if (!allowedStatus || !effectiveNcm || !auditOk) {
    return {
      lookup: fiscalBlockedLookup(context),
      selectedOption,
      effectiveNcm,
      source,
      auditOk: false,
      confirmedBy: null,
      confirmedAt: null,
    };
  }
  return {
    lookup: findFiscalRateByConfirmedNcm({
      ncm_code: effectiveNcm,
      classification_status: status,
      tax_regime: fiscalTaxRegime(context),
    }),
    selectedOption,
    effectiveNcm,
    source,
    auditOk,
    confirmedBy,
    confirmedAt,
  };
}

function fiscalClassificationMetadata(
  context: SanitizedContext,
  status: ClassificationStatus,
  action: FiscalClassificationAction,
  options: FiscalClassificationOption[],
  questions: FiscalClassificationQuestion[],
  selectedOption: FiscalClassificationOption | null,
  effectiveNcm: string | null,
  lookupState: LookupState,
  invalidAnswers: string[],
  refinement: FiscalClassificationRefinementState | undefined,
): FiscalClassificationMetadata {
  const candidateNcms = [...new Set(options.flatMap((option) => option.ncm_code ? [option.ncm_code] : []))];
  const first = options.find((option) => option.option_id !== 'NONE_OF_THE_OPTIONS') || null;
  return {
    status,
    action,
    confirmed_option_id: lookupState.auditOk ? selectedOption?.option_id || null : null,
    confirmed_display_name: lookupState.auditOk
      ? (selectedOption?.display_name || fiscalString(context.selected_fiscal_classification_name) || null)
      : null,
    confirmed_ncm_code: lookupState.auditOk ? effectiveNcm : null,
    confirmed_by: lookupState.confirmedBy,
    confirmed_at: lookupState.confirmedAt,
    candidate_ncm_codes: candidateNcms,
    candidate_type: first?.candidate_type || null,
    confidence: first?.confidence || null,
    matched_terms: [...new Set(options.flatMap((option) => option.matched_terms))],
    missing_attributes: [...new Set(options.flatMap((option) => option.unresolved_attributes))],
    invalid_answers: invalidAnswers,
    options,
    questions,
    ...(refinement ? { refinement_state: refinement } : {}),
    ambiguous: options.filter((option) => option.option_id !== 'NONE_OF_THE_OPTIONS').length > 1,
    requires_human_confirmation: true,
    reason: first ? 'Opcoes de classificacao fiscal geradas a partir da base local e exigem confirmacao humana.' : null,
  };
}

function fiscalReferencesSourceIds(references: NormativeReference[]): string[] {
  return [...new Set(references.map((reference) => reference.source_id).filter(Boolean))];
}

function fiscalWarningsFor(result: FiscalLookupResult, residual = false): string[] {
  const warnings: string[] = [];
  if (result.status !== 'MATCHED') warnings.push(FISCAL_STATUS_MESSAGES[result.status]);
  if (residual) warnings.push('A regra fiscal geral utilizada define taxa e vida util, mas nao estabelece valor residual fiscal.');
  warnings.push('Referencia fiscal sujeita a confirmacao profissional antes de uso.');
  return [...new Set(warnings)];
}

function fiscalEvaluation(
  result: FiscalLookupResult,
  context: SanitizedContext,
  status: ClassificationStatus,
  ncm: string | null,
  residual = false,
): FiscalEvaluationMetadata {
  return {
    status: result.status,
    ncm_code: ncm,
    classification_status: status,
    tax_regime: fiscalTaxRegime(context),
    fiscal_depreciation_rate: result.annual_rate_percent,
    fiscal_useful_life_years: result.useful_life_years,
    fiscal_residual_value: null,
    residual_policy: residual ? 'NOT_DEFINED_BY_GENERAL_ANNEX_III_RATE_RULE' : null,
    description_summary: result.description_summary,
    ncm_reference_version: result.ncm_reference_version,
    verification_status: result.verification_status,
    requires_human_confirmation: true,
    warnings: fiscalWarningsFor(result, residual),
    blocking_reasons: result.status === 'MATCHED' && !residual ? [] : [residual ? 'Valor residual fiscal nao definido pela regra geral do Anexo III.' : FISCAL_STATUS_MESSAGES[result.status]],
    references: result.references,
  };
}

function fiscalUnitFor(parameter: FiscalParameterName): string {
  if (parameter === 'fiscal_depreciation_rate') return 'percent_per_year';
  if (parameter === 'fiscal_useful_life_years') return 'years';
  return 'BRL';
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
    unit: fiscalUnitFor(parameter),
    confidence: 'low',
    reason,
    based_on: [],
    missing_data: [],
    warnings: [...new Set([...evaluation.warnings, reason])],
    source_ids: [],
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
    unit: fiscalUnitFor(parameter),
    confidence: 'high',
    reason: FISCAL_STATUS_MESSAGES.MATCHED,
    based_on: ['selected_fiscal_classification_option_id', 'ncm_classification_status', 'tax_regime'],
    missing_data: [],
    warnings: evaluation.warnings,
    source_ids: fiscalReferencesSourceIds(evaluation.references),
    fiscal_classification: classification,
    fiscal_evaluation: evaluation,
  };
}

function fiscalText(value: unknown): string {
  return fiscalString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function directOptionScore(context: SanitizedContext, option: FiscalClassificationOption): number {
  const name = fiscalText(context.name);
  const description = fiscalText(context.description);
  const category = fiscalText(context.category);
  const account = fiscalText(context.account);
  const brand = fiscalText(context.brand);
  const model = fiscalText(context.model);
  const terms = [
    option.display_name,
    option.plain_description,
    option.candidate_type,
    option.official_description,
    ...option.matched_terms,
    ...option.distinguishing_attributes,
  ].map(fiscalText).filter(Boolean);

  let score = 0;
  for (const term of terms) {
    if (name && term && (name.includes(term) || term.includes(name))) score += 5;
    if (description && term && (description.includes(term) || term.includes(description))) score += 3;
    if (account && term && (account.includes(term) || term.includes(account))) score += 3;
    if (category && term && (category.includes(term) || term.includes(category))) score += 1;
    if (brand && term && (brand.includes(term) || term.includes(brand))) score += 1;
    if (model && term && (model.includes(term) || term.includes(model))) score += 1;
  }
  if (option.can_release_fiscal_rule) score += 1;
  return score;
}

function directCatalogOptionsFromAliases(context: SanitizedContext): FiscalClassificationOption[] {
  const matchedByType = new Map(findClassificationCandidates(context).map((candidate) => [candidate.candidate_type, candidate]));
  const byKey = new Map<string, FiscalClassificationOption>();

  for (const alias of ASSET_ALIASES) {
    const candidateNcms = Array.isArray(alias.candidate_ncm_codes) ? alias.candidate_ncm_codes : [];
    if (candidateNcms.length === 0) continue;
    const matched = matchedByType.get(alias.candidate_type);
    const candidate: AssetClassificationCandidate = {
      candidate_ncm_codes: [...candidateNcms],
      candidate_type: alias.candidate_type,
      confidence: matched?.confidence || alias.confidence,
      requires_human_confirmation: true,
      reason: matched?.reason || alias.reason,
      matched_terms: matched?.matched_terms?.length ? [...matched.matched_terms] : [...alias.asset_terms],
      missing_attributes: matched?.missing_attributes || [],
    };
    const option = fiscalOptionFromCandidate(candidate, {}, fiscalCandidateRef(candidate));
    if (!option.option_id || option.option_id === 'NONE_OF_THE_OPTIONS' || !option.ncm_code) continue;
    byKey.set(`${option.option_id}:${option.ncm_code}`, option);
  }

  return [...byKey.values()];
}

function directFiscalOptionByNcm(options: FiscalClassificationOption[], ncm: string): FiscalClassificationOption | null {
  const normalized = normalizeNcm(ncm);
  if (!normalized) return null;
  const exact = options.filter((option) => normalizeNcm(option.ncm_code || '') === normalized);
  if (exact.length === 0) return null;
  return exact.sort((a, b) => {
    const releasable = Number(b.can_release_fiscal_rule) - Number(a.can_release_fiscal_rule);
    if (releasable !== 0) return releasable;
    return FISCAL_CONFIDENCE_RANK[b.confidence] - FISCAL_CONFIDENCE_RANK[a.confidence];
  })[0] || null;
}

export function buildDirectFiscalCatalogOptions(context: SanitizedContext, maxItems = 50): FiscalClassificationOption[] {
  return directCatalogOptionsFromAliases(context)
    .sort((a, b) => {
      const score = directOptionScore(context, b) - directOptionScore(context, a);
      if (score !== 0) return score;
      const confidence = FISCAL_CONFIDENCE_RANK[b.confidence] - FISCAL_CONFIDENCE_RANK[a.confidence];
      if (confidence !== 0) return confidence;
      return a.display_name.localeCompare(b.display_name);
    })
    .slice(0, maxItems);
}

function directFiscalClassificationMetadata(
  context: SanitizedContext,
  options: FiscalClassificationOption[],
  selectedOption: FiscalClassificationOption | null,
  lookup: FiscalLookupResult,
  choice: DirectFiscalAiChoice | null,
): FiscalClassificationMetadata {
  const sourceIds = lookup.references.length > 0 ? fiscalReferencesSourceIds(lookup.references) : selectedOption?.source_id ? [selectedOption.source_id] : [];
  const source = sourceIds[0] ? findNormativeSource(sourceIds[0]) : null;
  const reason = fiscalString(choice?.reason) || null;
  return {
    status: selectedOption && lookup.status === 'MATCHED' ? 'CLASSIFIED_BY_AI' : 'UNKNOWN',
    action: 'CLASSIFY_DIRECT',
    confirmed_option_id: null,
    confirmed_display_name: selectedOption?.display_name || null,
    confirmed_ncm_code: selectedOption?.ncm_code || null,
    confirmed_by: null,
    confirmed_at: null,
    candidate_ncm_codes: [...new Set(options.flatMap((option) => option.ncm_code ? [option.ncm_code] : []))],
    candidate_type: selectedOption?.candidate_type || options[0]?.candidate_type || null,
    confidence: selectedOption?.confidence || null,
    matched_terms: selectedOption?.matched_terms || [],
    missing_attributes: [],
    invalid_answers: [],
    options,
    questions: [],
    ambiguous: options.length > 1,
    requires_human_confirmation: true,
    reason: reason || (selectedOption
      ? 'Classificacao fiscal sugerida por IA dentro das opcoes do catalogo local.'
      : 'Nao foi possivel relacionar o item com seguranca a uma classificacao fiscal do catalogo local.'),
    display_name: selectedOption?.display_name || null,
    ncm_code: selectedOption?.ncm_code || null,
    ncm_display: selectedOption?.ncm_display || null,
    catalog_option_id: selectedOption?.option_id || null,
    source_ids: sourceIds,
    source_name: source?.title || selectedOption?.source_id || null,
    legal_reference: selectedOption?.source_reference || lookup.references[0]?.source_reference || null,
    used_fields: Array.isArray(choice?.used_fields) ? choice.used_fields : [],
  };
}

function directFiscalNoMatchSuggestions(
  requestedParams: FiscalParameterName[],
  context: SanitizedContext,
  options: FiscalClassificationOption[],
  reason: string,
  lookupStatus: FiscalLookupStatus = 'REQUIRES_NCM_CONFIRMATION',
): Partial<Record<string, FiscalSuggestion>> {
  const lookup = fiscalBlockedLookup(context, lookupStatus);
  const classification = directFiscalClassificationMetadata(context, options, null, lookup, { reason });
  const result: Partial<Record<string, FiscalSuggestion>> = {};
  for (const parameter of requestedParams) {
    const evaluation = fiscalEvaluation(lookup, context, classification.status, null, parameter === 'fiscal_residual_value');
    result[parameter] = fiscalNotFound(parameter, reason, classification, evaluation);
  }
  return result;
}

export function applyDirectFiscalSuggestionAdapter(input: AdapterInput & { aiChoice?: DirectFiscalAiChoice | null }): Partial<Record<string, FiscalSuggestion>> {
  const requestedParams = input.requestedParams.filter((parameter) => parameter !== 'fiscal_residual_value');
  const result: Partial<Record<string, FiscalSuggestion>> = { ...(input.suggestions || {}) };
  if (requestedParams.length === 0) return result;

  if (!fiscalString(input.context.name)) {
    return {
      ...result,
      ...directFiscalNoMatchSuggestions(
        requestedParams,
        input.context,
        [],
        'Informe a descricao do bem para iniciar a analise fiscal.',
      ),
    };
  }

  const regime = fiscalTaxRegime(input.context);
  if (regime === 'SIMPLES_NACIONAL') {
    return {
      ...result,
      ...directFiscalNoMatchSuggestions(
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
      ...directFiscalNoMatchSuggestions(
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
      ...directFiscalNoMatchSuggestions(
        requestedParams,
        input.context,
        [],
        'O catalogo fiscal local nao retornou opcoes para analise deste bem.',
      ),
    };
  }
  const selectedNcm = fiscalCompleteNcm(input.aiChoice?.selected_ncm_code);
  if (!input.aiChoice || !selectedNcm) {
    return {
      ...result,
      ...directFiscalNoMatchSuggestions(
        requestedParams,
        input.context,
        options,
        'A IA nao selecionou um NCM do catalogo local.',
      ),
    };
  }
  const selectedOption = directFiscalOptionByNcm(options, selectedNcm);
  if (!selectedOption) {
    return {
      ...result,
      ...directFiscalNoMatchSuggestions(
        requestedParams,
        input.context,
        options,
        'O NCM sugerido pela IA nao existe no catalogo local.',
      ),
    };
  }

  const lookup = findFiscalRateByConfirmedNcm({
    ncm_code: selectedOption.ncm_code,
    classification_status: 'CONFIRMED_BY_USER',
    tax_regime: regime,
  });
  const classification = directFiscalClassificationMetadata(
    input.context,
    options,
    selectedOption,
    lookup,
    input.aiChoice || null,
  );
  for (const parameter of requestedParams) {
    const evaluation = fiscalEvaluation(lookup, input.context, classification.status, selectedOption.ncm_code, false);
    if (lookup.status !== 'MATCHED') {
      result[parameter] = fiscalNotFound(
        parameter,
        'O NCM foi identificado, mas nao possui taxa fiscal e vida util vinculadas no catalogo local.',
        classification,
        evaluation,
      );
      continue;
    }
    const value = parameter === 'fiscal_depreciation_rate' ? lookup.annual_rate_percent : lookup.useful_life_years;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      result[parameter] = fiscalNotFound(parameter, 'O NCM foi identificado, mas nao possui taxa fiscal e vida util vinculadas no catalogo local.', classification, evaluation);
      continue;
    }
    result[parameter] = {
      ...fiscalMatchedSuggestion(parameter, value, classification, evaluation),
      confidence: input.aiChoice?.confidence || 'high',
      reason: fiscalString(input.aiChoice?.reason) || 'Classificacao fiscal sugerida dentro do catalogo local e validada pela regra normativa.',
      based_on: ['catalogo fiscal local', 'classificacao escolhida pela IA', 'regime tributario'],
    };
  }
  return result;
}

export function applyFiscalSuggestionAdapter(input: AdapterInput): Partial<Record<string, FiscalSuggestion>> {
  const { context, requestedParams } = input;
  const result: Partial<Record<string, FiscalSuggestion>> = { ...(input.suggestions || {}) };
  const status = fiscalClassificationStatus(context);
  const action = fiscalClassificationAction(context);
  const candidateTypes = new Set(findClassificationCandidates(fiscalContextWithRefinement(context, input.aiRefinement)).map((candidate) => candidate.candidate_type));
  const fallbackQuestions = fiscalQuestionsForCandidateTypes(candidateTypes);
  const activeQuestions = fiscalQuestionsForRefinement(input.aiRefinement, fallbackQuestions);
  const validationQuestions = fiscalValidationQuestions(input.aiRefinement, fallbackQuestions);
  const validatedAnswers = fiscalValidatedAnswers(fiscalAnswers(context), validationQuestions, fiscalAnswerFingerprints(context));
  const options = fiscalClassificationOptions(context, validatedAnswers.answers, input.aiRefinement);
  const lookupState = fiscalLookupForContext(context, status, options, action, validatedAnswers.invalid, input.serverConfirmation);
  const classification = fiscalClassificationMetadata(
    context,
    status,
    action,
    options,
    activeQuestions,
    lookupState.selectedOption,
    lookupState.effectiveNcm,
    lookupState,
    validatedAnswers.invalid,
    input.aiRefinement,
  );

  for (const parameter of requestedParams) {
    const evaluation = fiscalEvaluation(lookupState.lookup, context, status, lookupState.effectiveNcm, parameter === 'fiscal_residual_value');
    if (parameter === 'fiscal_residual_value') {
      result[parameter] = fiscalNotFound(
        parameter,
        'A regra fiscal geral utilizada define taxa e vida util, mas nao estabelece valor residual fiscal.',
        classification,
        evaluation,
      );
      continue;
    }

    if (lookupState.lookup.status !== 'MATCHED') {
      result[parameter] = fiscalNotFound(parameter, FISCAL_STATUS_MESSAGES[lookupState.lookup.status], classification, evaluation);
      continue;
    }

    const value = parameter === 'fiscal_depreciation_rate' ? lookupState.lookup.annual_rate_percent : lookupState.lookup.useful_life_years;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      result[parameter] = fiscalNotFound(parameter, 'Regra fiscal encontrada sem valor numerico validavel.', classification, evaluation);
      continue;
    }
    result[parameter] = fiscalMatchedSuggestion(parameter, value, classification, evaluation);
  }

  return result;
}
