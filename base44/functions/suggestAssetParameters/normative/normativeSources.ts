import { SOURCE_REGISTRY } from './data/sourceRegistry.ts';
import type { NormativeValidationResult } from './normativeEngine.types.ts';

type SourceRecord = (typeof SOURCE_REGISTRY)[number];

function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function statusIsRevoked(status: unknown): boolean {
  return typeof status === 'string' && status.toUpperCase().includes('REVOK');
}

export function statusIsActive(status: unknown): boolean {
  return typeof status === 'string' && status.toUpperCase().includes('ACTIVE');
}

export const NORMATIVE_SOURCE_REGISTRY = SOURCE_REGISTRY;

export function getNormativeSources(): SourceRecord[] {
  return [...SOURCE_REGISTRY];
}

export function findNormativeSource(sourceId: string): SourceRecord | null {
  return SOURCE_REGISTRY.find((source) => source.id === sourceId) || null;
}

export function validateNormativeSources(sources: readonly SourceRecord[] = SOURCE_REGISTRY): NormativeValidationResult {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (!source.id) {
      errors.push('source without id');
      continue;
    }
    if (seen.has(source.id)) errors.push(`duplicated source id: ${source.id}`);
    seen.add(source.id);

    if (!source.title) errors.push(`source ${source.id} without title`);
    if (!source.regime) errors.push(`source ${source.id} without regime`);
    if (!source.status) errors.push(`source ${source.id} without status`);
    if (!source.version_label) errors.push(`source ${source.id} without version_label`);
    if (!source.last_verified_at) errors.push(`source ${source.id} without last_verified_at`);
    if (statusIsRevoked(source.status) && statusIsActive(source.status)) {
      errors.push(`source ${source.id} cannot be both active and revoked`);
    }
    if (!isHttpsUrl(source.official_url)) errors.push(`source ${source.id} without valid HTTPS official_url`);
    if ('official_page_url' in source && source.official_page_url && !isHttpsUrl(source.official_page_url)) {
      errors.push(`source ${source.id} without valid HTTPS official_page_url`);
    }
  }

  return { ok: errors.length === 0, errors };
}
