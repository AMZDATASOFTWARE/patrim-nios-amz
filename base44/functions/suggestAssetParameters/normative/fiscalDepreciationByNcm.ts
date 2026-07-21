import { FISCAL_DEPRECIATION_RATES_DATA } from './data/fiscalDepreciationRates.ts';
import { findNormativeSource, statusIsRevoked } from './normativeSources.ts';
import type {
  ClassificationStatus,
  FiscalDepreciationRate,
  FiscalLookupInput,
  FiscalLookupResult,
  NormativeReference,
  NormativeValidationResult,
} from './normativeEngine.types.ts';

const CONFIRMED_CLASSIFICATION_STATUSES: ClassificationStatus[] = ['CONFIRMED_BY_USER', 'CONFIRMED_BY_IMPORT'];
const UNKNOWN_TAX_REGIMES = new Set(['', 'UNKNOWN', 'NAO_INFORMADO', 'NÃO INFORMADO']);
const OUT_OF_SCOPE_TAX_REGIMES = new Set(['SIMPLES', 'SIMPLES_NACIONAL', 'SIMPLES NACIONAL']);
const REVIEW_TAX_REGIMES = new Set(['OTHER', 'OUTRO']);

export const FISCAL_DEPRECIATION_RATES = FISCAL_DEPRECIATION_RATES_DATA as readonly FiscalDepreciationRate[];

export function normalizeNcm(value: string | null | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

function normalizeTaxRegime(value: string | null | undefined): string {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'LUCRO REAL') return 'LUCRO_REAL';
  if (raw === 'LUCRO PRESUMIDO') return 'LUCRO_PRESUMIDO';
  if (raw === 'SIMPLES NACIONAL') return 'SIMPLES_NACIONAL';
  return raw;
}

function referenceForRate(rate: FiscalDepreciationRate): NormativeReference[] {
  const source = findNormativeSource(rate.source_id);
  return [{
    source_id: rate.source_id,
    source_reference: rate.source_reference,
    url: source?.official_url,
    last_verified_at: rate.last_verified_at,
    ncm_reference_version: rate.ncm_reference_version,
    verification_status: rate.verification_status,
    description_summary: rate.description_summary,
  }];
}

function fiscalLookupNotFound(status: FiscalLookupResult['status'], reason: string): FiscalLookupResult {
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

function isConfirmedClassification(status: ClassificationStatus | null | undefined): boolean {
  return CONFIRMED_CLASSIFICATION_STATUSES.includes(status as ClassificationStatus);
}

function matchingRatesBySpecificity(ncmCode: string): FiscalDepreciationRate[] {
  return FISCAL_DEPRECIATION_RATES
    .filter((rate) => {
      const candidate = normalizeNcm(rate.ncm_code);
      return candidate.length > 0 && ncmCode.startsWith(candidate);
    })
    .sort((a, b) => normalizeNcm(b.ncm_code).length - normalizeNcm(a.ncm_code).length);
}

export function findFiscalRateByConfirmedNcm(input: FiscalLookupInput): FiscalLookupResult {
  const taxRegime = normalizeTaxRegime(input.tax_regime);
  if (OUT_OF_SCOPE_TAX_REGIMES.has(taxRegime)) {
    return fiscalLookupNotFound('OUT_OF_DEFAULT_SCOPE', 'Simples Nacional is outside the default fiscal depreciation scope.');
  }
  if (REVIEW_TAX_REGIMES.has(taxRegime)) {
    return fiscalLookupNotFound('REQUIRES_HUMAN_REVIEW', 'Tax regime requires human review before fiscal depreciation lookup.');
  }
  if (UNKNOWN_TAX_REGIMES.has(taxRegime)) {
    return fiscalLookupNotFound('REQUIRES_TAX_REGIME_CONFIRMATION', 'Tax regime must be confirmed before fiscal depreciation lookup.');
  }

  const ncmCode = normalizeNcm(input.ncm_code);
  if (!ncmCode || !isConfirmedClassification(input.classification_status)) {
    return fiscalLookupNotFound('REQUIRES_NCM_CONFIRMATION', 'Fiscal depreciation requires a user/import confirmed NCM.');
  }

  const [rate] = matchingRatesBySpecificity(ncmCode);
  if (!rate) {
    return fiscalLookupNotFound('NOT_FOUND', 'No fiscal depreciation rule found for the confirmed NCM.');
  }

  return {
    status: 'MATCHED',
    rule: rate,
    annual_rate_percent: rate.annual_rate_percent,
    useful_life_years: rate.useful_life_years,
    residual_value: null,
    ncm_reference_version: rate.ncm_reference_version,
    verification_status: rate.verification_status,
    description_summary: rate.description_summary,
    requires_human_confirmation: false,
    reason: 'Fiscal depreciation rule found by confirmed NCM.',
    references: referenceForRate(rate),
  };
}

function isRateLifeCoherent(rate: FiscalDepreciationRate): boolean {
  if (!Number.isFinite(rate.useful_life_years) || rate.useful_life_years <= 0) return false;
  if (!Number.isFinite(rate.annual_rate_percent) || rate.annual_rate_percent <= 0 || rate.annual_rate_percent > 100) return false;
  const expected = 100 / rate.useful_life_years;
  return Math.abs(expected - rate.annual_rate_percent) <= Math.max(0.2, expected * 0.015);
}

export function validateFiscalDepreciationRates(
  rates: readonly FiscalDepreciationRate[] = FISCAL_DEPRECIATION_RATES,
  sources?: readonly NonNullable<ReturnType<typeof findNormativeSource>>[],
): NormativeValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const rate of rates) {
    if (!rate.id) {
      errors.push('fiscal depreciation rate without id');
      continue;
    }
    if (seen.has(rate.id)) errors.push(`duplicated fiscal depreciation rate id: ${rate.id}`);
    seen.add(rate.id);
    const normalizedNcm = normalizeNcm(rate.ncm_code);
    if (!normalizedNcm && !String(rate.match_kind || '').toUpperCase().includes('GENERIC')) {
      errors.push(`fiscal depreciation rate ${rate.id} without valid ncm_code`);
    }
    const source = sources?.find((item) => item.id === rate.source_id) || findNormativeSource(rate.source_id);
    if (!rate.source_id || !source) {
      errors.push(`fiscal depreciation rate ${rate.id} references unknown source ${rate.source_id}`);
    } else if (statusIsRevoked(source.status)) {
      errors.push(`fiscal depreciation rate ${rate.id} references revoked source ${rate.source_id}`);
    }
    if (!rate.ncm_reference_version) errors.push(`fiscal depreciation rate ${rate.id} without ncm_reference_version`);
    if (!rate.last_verified_at) errors.push(`fiscal depreciation rate ${rate.id} without last_verified_at`);
    if (!isRateLifeCoherent(rate)) {
      errors.push(`fiscal depreciation rate ${rate.id} has invalid rate/life relationship`);
    }
  }

  return { ok: errors.length === 0, errors };
}
