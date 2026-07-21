import { FISCAL_RULES_DATA } from './data/fiscalRulesData.ts';
import { KNOWN_GAPS_DATA } from './data/knownGaps.ts';
import { findNormativeSource, statusIsRevoked } from './normativeSources.ts';
import type { NormativeValidationResult } from './normativeEngine.types.ts';

type FiscalRuleRecord = (typeof FISCAL_RULES_DATA)[number];

export const FISCAL_RULES = FISCAL_RULES_DATA;
export const KNOWN_GAPS = KNOWN_GAPS_DATA;

type SourceRecord = NonNullable<ReturnType<typeof findNormativeSource>>;

function sourceRefs(rule: FiscalRuleRecord): string[] {
  const raw = 'source_refs' in rule ? rule.source_refs : [];
  return Array.isArray(raw)
    ? raw.map((ref) => (typeof ref === 'string' ? ref : String(ref?.source_id || ''))).filter(Boolean)
    : [];
}

function sourceFromList(sourceId: string, sources?: readonly SourceRecord[]): SourceRecord | null {
  return sources?.find((source) => source.id === sourceId) || findNormativeSource(sourceId);
}

function isRuleHistorical(rule: FiscalRuleRecord): boolean {
  const decision = 'decision' in rule ? String(rule.decision || '').toUpperCase() : '';
  return decision.includes('REVOKED') || decision.includes('HISTOR');
}

export function validateFiscalRules(
  rules: readonly FiscalRuleRecord[] = FISCAL_RULES_DATA,
  sources?: readonly SourceRecord[],
): NormativeValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (!rule.id) {
      errors.push('fiscal rule without id');
      continue;
    }
    if (seen.has(rule.id)) errors.push(`duplicated fiscal rule id: ${rule.id}`);
    seen.add(rule.id);
    if ('regime' in rule && rule.regime !== 'FISCAL') errors.push(`fiscal rule ${rule.id} without FISCAL regime`);
    if (!rule.title) errors.push(`fiscal rule ${rule.id} without title`);
    for (const sourceId of sourceRefs(rule)) {
      const source = sourceFromList(sourceId, sources);
      if (!source) {
        errors.push(`fiscal rule ${rule.id} references unknown source ${sourceId}`);
      } else if (statusIsRevoked(source.status) && !isRuleHistorical(rule)) {
        errors.push(`active fiscal rule ${rule.id} references revoked source ${sourceId}`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
