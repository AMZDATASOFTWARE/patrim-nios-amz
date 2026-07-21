import { ASSET_ALIASES_DATA } from './data/assetAliases.ts';
import { ATTRIBUTE_REQUIREMENTS_DATA } from './data/attributeRequirements.ts';
import type { AssetClassificationCandidate } from './normativeEngine.types.ts';

type AliasRecord = (typeof ASSET_ALIASES_DATA)[number];
type ClassificationContext = Record<string, unknown> | string[];

const REFINED_ATTRIBUTE_TERMS: Record<string, string[]> = {
  COOLING_OR_REFRIGERATION: ['freezer', 'refrigerador', 'geladeira', 'camara fria', 'refrigeracao'],
  COMMERCIAL_FREEZER: ['freezer', 'congelador', 'refrigeracao'],
  SPLIT: ['ar-condicionado', 'split', 'climatizacao'],
  PROCESSING_OR_COMPUTING: ['computador', 'notebook', 'processamento de dados'],
  COMPUTER_MONITOR: ['monitor de computador', 'monitor aoc'],
  MOVING_OR_PUMPING: ['bomba hidraulica', 'bomba centrífuga', 'bomba d agua'],
  CIRCULATION: ['bomba hidraulica', 'bomba centrifuga'],
  TEXTILE_TREATMENT: ['maquina de lavanderia industrial', 'tratamento de texteis'],
  DRYING: ['secadora industrial', 'tunel de secagem', 'maquina de lavanderia industrial'],
  WASHING: ['lavadora industrial', 'maquina de lavar roupa'],
};

export const ASSET_ALIASES = ASSET_ALIASES_DATA;

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: unknown): string {
  return stripAccents(String(value || '').toLowerCase())
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textPartsFromContext(input: ClassificationContext): string[] {
  if (Array.isArray(input)) return input.map(String);
  const refined = input.fiscal_refined_attributes && typeof input.fiscal_refined_attributes === 'object' && !Array.isArray(input.fiscal_refined_attributes)
    ? Object.values(input.fiscal_refined_attributes as Record<string, unknown>)
      .filter((value) => typeof value === 'string')
      .flatMap((value) => REFINED_ATTRIBUTE_TERMS[String(value).toUpperCase()] || [])
    : [];
  const refinedSearchTerms = Array.isArray(input.fiscal_refined_search_terms)
    ? input.fiscal_refined_search_terms.filter((value) => typeof value === 'string')
    : [];
  return [
    input.name,
    input.category,
    input.account,
    ...refinedSearchTerms,
    input.description,
    input.brand,
    input.model,
    input.vehicle_model,
    input.notes,
    ...refined,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0) as string[];
}

function contextRecord(input: ClassificationContext): Record<string, unknown> {
  return Array.isArray(input) ? {} : input;
}

function familyForAlias(alias: AliasRecord): string | null {
  const type = String(alias.candidate_type || '').toUpperCase();
  if (type.includes('FURNITURE') || type.includes('CHAIR') || type.includes('TABLE') || type.includes('CABINET')) return 'MOBILIARIO';
  if (type.includes('REFRIGERATION')) return 'REFRIGERACAO';
  if (type.includes('AIR_CONDITION')) return 'CLIMATIZACAO';
  if (type.includes('CASH') || type.includes('COMMERCIAL')) return 'AUTOMACAO_COMERCIAL';
  if (type.includes('KITCHEN') || type.includes('COOKING')) return 'EQUIPAMENTO_DE_COZINHA';
  if (type.includes('COMPUTER') || type.includes('MONITOR') || type.includes('INFORMATION')) return 'TECNOLOGIA_DA_INFORMACAO';
  if (type.includes('DISPLAY')) return 'EXPOSITOR_DE_ALIMENTOS';
  return null;
}

function hasContextValue(context: Record<string, unknown>, key: string): boolean {
  const direct = context[key];
  if (typeof direct === 'string') return direct.trim().length > 0;
  if (typeof direct === 'number') return Number.isFinite(direct);
  if (typeof direct === 'boolean') return true;
  return direct != null;
}

function missingAttributesForAlias(alias: AliasRecord, context: Record<string, unknown>): string[] {
  const family = familyForAlias(alias);
  if (!family) return [];
  const familyRequirements = ATTRIBUTE_REQUIREMENTS_DATA.families[family as keyof typeof ATTRIBUTE_REQUIREMENTS_DATA.families];
  if (!familyRequirements) return [];
  return familyRequirements.required.filter((key) => !hasContextValue(context, key));
}

function matchesAlias(haystack: string, alias: AliasRecord): string[] {
  return alias.asset_terms.filter((term) => {
    const normalized = normalizeText(term);
    return normalized.length > 0 && haystack.includes(normalized);
  });
}

export function findClassificationCandidates(input: ClassificationContext): AssetClassificationCandidate[] {
  const haystack = normalizeText(textPartsFromContext(input).join(' '));
  if (!haystack) return [];

  const context = contextRecord(input);
  return ASSET_ALIASES
    .map((alias) => ({ alias, matchedTerms: matchesAlias(haystack, alias) }))
    .filter(({ matchedTerms }) => matchedTerms.length > 0)
    .map(({ alias, matchedTerms }) => ({
      candidate_ncm_codes: [...alias.candidate_ncm_codes],
      candidate_type: alias.candidate_type,
      confidence: alias.confidence,
      requires_human_confirmation: true as const,
      reason: alias.reason,
      matched_terms: matchedTerms,
      missing_attributes: missingAttributesForAlias(alias, context),
    }));
}
