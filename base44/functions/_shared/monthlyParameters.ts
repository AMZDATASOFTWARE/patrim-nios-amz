export type SnapshotValueType = 'percent' | 'currency' | 'integer' | 'decimal' | 'text' | 'json';

export interface MonthlyParameterSnapshotRecord {
  id?: string;
  workspace_id: string;
  competence_month: string;
  parameter_key: string;
  domain: string;
  entity_type?: string;
  field_name: string;
  scope_key: string;
  category?: string;
  asset_type?: string;
  uf?: string;
  regime_fiscal?: string;
  value: string;
  value_type: SnapshotValueType;
  unit?: string;
  source_name?: string;
  source_url?: string;
  source_date?: string;
  retrieved_at: string;
  effective_start_date?: string;
  effective_end_date?: string;
  version?: number;
  confidence_level?: 'low' | 'medium' | 'high';
  status: 'draft' | 'pending_review' | 'active' | 'rejected' | 'expired' | 'error';
  update_run_id?: string;
  raw_payload?: Record<string, unknown>;
  warnings?: string[];
  created_by_ai?: boolean;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface SuggestionQuery {
  domain?: string;
  entity_type?: string;
  field_name?: string;
  category?: string;
  asset_type?: string;
  uf?: string;
  regime_fiscal?: string;
  parameter_key?: string;
}

export function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

export function normalizeCompetenceMonth(input?: unknown): string {
  const value = normalizeText(input);
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function toIsoDate(value?: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function toIsoDateTime(value?: unknown): string {
  const raw = normalizeText(value);
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export function serializeValue(value: unknown, valueType: SnapshotValueType): string {
  return normalizeSnapshotValue(value, valueType).serialized;
}

export function parseSnapshotValue(value: string, valueType: SnapshotValueType): unknown {
  return normalizeSnapshotValue(value, valueType).value;
}

function numericValueError(value: string, valueType: SnapshotValueType): Error {
  return new Error(`Valor invalido para ${valueType}: informe valor bruto sem simbolos, unidade ou separador de milhar.`);
}

function parseStrictNumericString(raw: string, valueType: SnapshotValueType, integerOnly = false): number {
  const value = normalizeText(raw);
  if (!value) {
    throw new Error(`Valor vazio para ${valueType}.`);
  }
  if (/[^\d.,+-]/.test(value) || value.includes('%')) {
    throw numericValueError(value, valueType);
  }

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  if (hasComma && hasDot) {
    throw numericValueError(value, valueType);
  }

  const normalized = hasComma ? value.replace(',', '.') : value;
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
    throw numericValueError(value, valueType);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw numericValueError(value, valueType);
  }
  if (integerOnly && !Number.isInteger(parsed)) {
    throw new Error(`Valor invalido para ${valueType}: esperado numero inteiro bruto.`);
  }
  return parsed;
}

function parseNumericValue(value: unknown, valueType: SnapshotValueType, integerOnly = false): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Valor invalido para ${valueType}: numero nao finito.`);
    }
    if (integerOnly && !Number.isInteger(value)) {
      throw new Error(`Valor invalido para ${valueType}: esperado numero inteiro bruto.`);
    }
    return value;
  }

  if (typeof value === 'string') {
    return parseStrictNumericString(value, valueType, integerOnly);
  }

  throw new Error(`Valor invalido para ${valueType}: tipo nao suportado.`);
}

export function normalizeSnapshotValue(
  value: unknown,
  valueType: SnapshotValueType,
): { value: unknown; serialized: string } {
  if (valueType === 'json') {
    let parsed = value;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value || 'null') : value ?? null;
    } catch {
      throw new Error('Valor invalido para json: JSON malformado.');
    }
    return {
      value: parsed ?? null,
      serialized: JSON.stringify(parsed ?? null),
    };
  }

  if (valueType === 'integer') {
    const parsed = parseNumericValue(value, valueType, true);
    return {
      value: parsed,
      serialized: String(parsed),
    };
  }

  if (valueType === 'decimal' || valueType === 'percent' || valueType === 'currency') {
    const parsed = parseNumericValue(value, valueType);
    return {
      value: parsed,
      serialized: String(parsed),
    };
  }

  const normalized = value === null || value === undefined ? '' : String(value);
  return {
    value: normalized,
    serialized: normalized,
  };
}

export function buildScopeKey(input: Partial<MonthlyParameterSnapshotRecord>): string {
  const parts = [
    normalizeText(input.parameter_key),
    normalizeText(input.entity_type),
    normalizeText(input.field_name),
    normalizeText(input.category),
    normalizeText(input.asset_type),
    normalizeText(input.uf),
    normalizeText(input.regime_fiscal),
  ].filter(Boolean);
  return parts.join('|');
}

export function snapshotIdentity(input: Partial<MonthlyParameterSnapshotRecord>): string {
  return [
    normalizeText(input.workspace_id),
    normalizeText(input.competence_month),
    normalizeText(input.parameter_key),
    normalizeText(input.entity_type),
    normalizeText(input.field_name),
    normalizeText(input.scope_key || buildScopeKey(input)),
  ].join('::');
}

export function snapshotScore(
  row: Partial<MonthlyParameterSnapshotRecord>,
  query: SuggestionQuery,
): number {
  let score = 0;
  if (normalizeText(row.domain) && normalizeText(row.domain) === normalizeText(query.domain)) score += 8;
  if (normalizeText(row.entity_type) && normalizeText(row.entity_type) === normalizeText(query.entity_type)) score += 8;
  if (normalizeText(row.field_name) && normalizeText(row.field_name) === normalizeText(query.field_name)) score += 12;
  if (normalizeText(row.parameter_key) && normalizeText(row.parameter_key) === normalizeText(query.parameter_key || query.field_name)) score += 12;
  if (normalizeText(row.category) && normalizeText(row.category) === normalizeText(query.category)) score += 6;
  if (normalizeText(row.asset_type) && normalizeText(row.asset_type) === normalizeText(query.asset_type)) score += 4;
  if (normalizeText(row.uf) && normalizeText(row.uf) === normalizeText(query.uf)) score += 4;
  if (normalizeText(row.regime_fiscal) && normalizeText(row.regime_fiscal) === normalizeText(query.regime_fiscal)) score += 4;

  if (!normalizeText(row.category)) score += 1;
  if (!normalizeText(row.asset_type)) score += 1;
  if (!normalizeText(row.uf)) score += 1;
  if (!normalizeText(row.regime_fiscal)) score += 1;

  const confidence = normalizeText(row.confidence_level);
  if (confidence === 'high') score += 3;
  if (confidence === 'medium') score += 2;
  if (confidence === 'low') score += 1;

  score += Number(row.version) || 0;
  return score;
}

export function isEffectiveForDate(row: Partial<MonthlyParameterSnapshotRecord>, dateStr: string): boolean {
  const target = toIsoDate(dateStr);
  if (!target) return true;
  const start = toIsoDate(row.effective_start_date);
  const end = toIsoDate(row.effective_end_date);
  if (start && target < start) return false;
  if (end && target > end) return false;
  return true;
}

export function buildSuggestionLabel(value: unknown, unit: string, valueType: SnapshotValueType): string {
  if (valueType === 'currency' && typeof value === 'number') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  if (valueType === 'percent' && typeof value === 'number') {
    return `${value}%`;
  }
  if (valueType === 'json') {
    return unit ? `${unit} (JSON)` : 'JSON';
  }
  return unit ? `${value} ${unit}`.trim() : String(value);
}
