export type Regime = 'CORPORATE' | 'FISCAL';

export type ClassificationStatus =
  | 'CLASSIFIED_APPLICABLE'
  | 'CLASSIFIED_REVIEW_ONLY'
  | 'NO_HYPOTHESIS'
  | 'CLASSIFIED_BY_AI'
  | 'CLASSIFIED'
  | 'CONFIRMED_BY_USER'
  | 'CONFIRMED_BY_IMPORT'
  | 'SUGGESTED_BY_RULE'
  | 'SUGGESTED_BY_AI'
  | 'AMBIGUOUS'
  | 'UNKNOWN';

export type TaxRegime =
  | 'LUCRO_REAL'
  | 'LUCRO_PRESUMIDO'
  | 'SIMPLES_NACIONAL'
  | 'OTHER'
  | 'UNKNOWN';

export type FiscalClassificationAction = 'CLASSIFY_DIRECT';

export type FiscalClassificationOption = {
  display_name: string;
  plain_description: string;
  distinguishing_attributes: string[];
  ncm_code: string | null;
  ncm_display: string | null;
  candidate_type: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  matched_terms: string[];
  missing_attributes: string[];
  source_id: string | null;
  source_reference: string | null;
  official_description: string | null;
  requires_human_confirmation: true;
};

export type FiscalLookupStatus =
  | 'MATCHED'
  | 'NOT_FOUND'
  | 'REQUIRES_NCM_CONFIRMATION'
  | 'REQUIRES_TAX_REGIME_CONFIRMATION'
  | 'OUT_OF_DEFAULT_SCOPE'
  | 'REQUIRES_TECHNICAL_EVIDENCE'
  | 'NOT_DEPRECIABLE'
  | 'REQUIRES_HUMAN_REVIEW';

export type NormativeValidationResult = {
  ok: boolean;
  errors: string[];
};

export type NormativeReference = {
  source_id: string;
  source_reference?: string;
  section?: string;
  url?: string;
  version_label?: string;
  last_verified_at?: string;
  ncm_reference_version?: string;
  verification_status?: string;
  description_summary?: string;
};

export type FiscalDepreciationRate = {
  id: string;
  ncm_code: string;
  description_summary: string;
  useful_life_years: number;
  annual_rate_percent: number;
  match_kind: string;
  source_id: string;
  source_reference: string;
  ncm_reference_version: string;
  verification_status: string;
  last_verified_at: string;
  requires_ncm_confirmation: boolean;
  notes?: string[];
};

export type FiscalLookupInput = {
  ncm_code?: string | null;
  classification_status?: ClassificationStatus | null;
  tax_regime?: TaxRegime | string | null;
};

export type FiscalLookupResult = {
  status: FiscalLookupStatus;
  rule: FiscalDepreciationRate | null;
  annual_rate_percent: number | null;
  useful_life_years: number | null;
  residual_value: null;
  ncm_reference_version: string | null;
  verification_status: string | null;
  description_summary: string | null;
  requires_human_confirmation: boolean;
  reason: string;
  references: NormativeReference[];
};

export type AssetClassificationCandidate = {
  candidate_ncm_codes: string[];
  candidate_type: string;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  requires_human_confirmation: true;
  reason: string;
  matched_terms: string[];
  missing_attributes: string[];
};

export type CorporateDepreciationInput = {
  recognized_cost: number;
  residual_value: number;
  useful_life_years: number;
};

export type CorporateAssetNature =
  | 'PPE'
  | 'LAND'
  | 'BUILDING'
  | 'FINITE_INTANGIBLE'
  | 'INDEFINITE_INTANGIBLE'
  | 'INVESTMENT_PROPERTY'
  | 'RIGHT_OF_USE'
  | 'INVENTORY'
  | 'OTHER'
  | 'UNKNOWN';

export type CorporateDepreciationMethod =
  | 'STRAIGHT_LINE'
  | 'DECLINING_BALANCE'
  | 'UNITS_OF_PRODUCTION';

export type CorporateRuleStatus =
  | 'CALCULABLE'
  | 'REQUIRES_CLASSIFICATION'
  | 'NOT_DEPRECIABLE'
  | 'DO_NOT_AMORTIZE'
  | 'REQUIRES_COMPONENT_REVIEW'
  | 'REQUIRES_IMPAIRMENT_REVIEW'
  | 'REQUIRES_HELD_FOR_SALE_REVIEW'
  | 'ROUTE_TO_LEASE_POLICY'
  | 'ROUTE_TO_INVESTMENT_PROPERTY_POLICY'
  | 'REQUIRES_HUMAN_REVIEW';

export type CorporateDepreciationEvaluationInput = {
  asset_nature: CorporateAssetNature;
  recognized_cost?: number | null;
  residual_value?: number | null;
  useful_life_years?: number | null;
  depreciation_method?: CorporateDepreciationMethod | null;
  acquisition_date?: string | null;
  available_for_use_date?: string | null;
  disposal_date?: string | null;
  held_for_sale_date?: string | null;
  is_idle?: boolean;
  disposed?: boolean;
  held_for_sale?: boolean;
  has_significant_components?: boolean;
  has_impairment_indicators?: boolean;
  intangible_life_type?: 'FINITE' | 'INDEFINITE' | null;
};

export type CorporateDepreciationEvaluationResult = {
  status: CorporateRuleStatus;
  depreciable_amount: number | null;
  annual_expense: number | null;
  monthly_expense: number | null;
  annual_rate_percent: number | null;
  depreciation_start_date: string | null;
  depreciation_stop_date: string | null;
  requires_human_confirmation: true;
  blocking_reasons: string[];
  warnings: string[];
  applied_rule_ids: string[];
  references: NormativeReference[];
};
