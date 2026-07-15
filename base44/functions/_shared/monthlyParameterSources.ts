import {
  normalizeSnapshotValue,
  normalizeText,
  type SnapshotValueType,
  toIsoDate,
} from './monthlyParameters.ts';

export const MONTHLY_PARAMETER_DOMAINS = [
  'depreciation',
  'fiscal',
  'ciap',
  'vehicle',
  'fipe',
  'revaluation',
  'market_reference',
] as const;

export const MONTHLY_PARAMETER_SOURCE_TYPES = [
  'api',
  'official_page',
  'manual_table',
  'internal_rule',
  'ai_research',
] as const;

export type MonthlyParameterDomain = typeof MONTHLY_PARAMETER_DOMAINS[number];
export type MonthlyParameterSourceType = typeof MONTHLY_PARAMETER_SOURCE_TYPES[number];

const SNAPSHOT_VALUE_TYPES = ['percent', 'currency', 'integer', 'decimal', 'text', 'json'] as const;
const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
const PROVIDER_STATUSES = ['active', 'pending_review'] as const;
const API_METHODS = ['GET', 'POST'] as const;
const DEFAULT_API_TIMEOUT_MS = 10000;
const MAX_API_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export interface MonthlyParameterSourceRecord {
  id?: string;
  workspace_id: string;
  parameter_key: string;
  domain: MonthlyParameterDomain;
  source_type: MonthlyParameterSourceType;
  source_name: string;
  source_url?: string;
  is_active: boolean;
  priority: number;
  parser_config_json: Record<string, unknown>;
  notes?: string;
  created_by?: string;
  updated_by?: string;
}

export type ProviderSnapshot = Record<string, unknown> & {
  parameter_key: string;
  domain: string;
  field_name: string;
  value: unknown;
  value_type: SnapshotValueType;
};

export type ProviderItemError = {
  index: number;
  parameter_key?: string;
  field_name?: string;
  message: string;
};

export type ProviderResolveResult =
  | { ok: true; snapshots: ProviderSnapshot[]; errors: ProviderItemError[] }
  | { ok: false; message: string; provider_implemented: boolean; errors?: ProviderItemError[] };

function currentIso() {
  return new Date().toISOString();
}

function currentDate() {
  return currentIso().slice(0, 10);
}

function parseObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('parser_config_json invalido: JSON malformado.');
    }
  }
  throw new Error('parser_config_json invalido: esperado objeto JSON.');
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidDomain(value: string): value is MonthlyParameterDomain {
  return MONTHLY_PARAMETER_DOMAINS.includes(value as MonthlyParameterDomain);
}

function isValidValueType(value: string): value is SnapshotValueType {
  return SNAPSHOT_VALUE_TYPES.includes(value as SnapshotValueType);
}

function isValidConfidenceLevel(value: string): value is typeof CONFIDENCE_LEVELS[number] {
  return CONFIDENCE_LEVELS.includes(value as typeof CONFIDENCE_LEVELS[number]);
}

function isValidProviderStatus(value: string): value is typeof PROVIDER_STATUSES[number] {
  return PROVIDER_STATUSES.includes(value as typeof PROVIDER_STATUSES[number]);
}

function isValidApiMethod(value: string): value is typeof API_METHODS[number] {
  return API_METHODS.includes(value as typeof API_METHODS[number]);
}

function parsePriority(value: unknown): number {
  if (typeof value === 'number') {
    if (isPositiveInteger(value)) return value;
    throw new Error('priority deve ser um numero inteiro positivo.');
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (parsed > 0) return parsed;
  }
  throw new Error('priority deve ser um numero inteiro positivo.');
}

function isSuspiciousSecretKey(key: string): boolean {
  const normalized = normalizeText(key).toLowerCase();
  if (!normalized) return false;
  if (normalized === 'secret_name') return false;
  if (normalized.endsWith('_secret_name') || normalized.endsWith('_token_name') || normalized.endsWith('_api_key_name')) return false;
  return /(secret|token|password|api[_-]?key|access[_-]?key)/.test(normalized);
}

function ensureNoInlineSecrets(value: unknown, path = 'parser_config_json'): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => ensureNoInlineSecrets(item, `${path}[${index}]`));
    return;
  }

  for (const [key, current] of Object.entries(value)) {
    if (isSuspiciousSecretKey(key) && normalizeText(current)) {
      throw new Error(`Nao salve segredo em claro em ${path}.${key}. Informe apenas o nome do secret.`);
    }
    if (current && typeof current === 'object') {
      ensureNoInlineSecrets(current, `${path}.${key}`);
    }
  }
}

function getEnvSecret(secretName: string): string {
  const cleanName = normalizeText(secretName);
  if (!cleanName) return '';
  const denoEnv = (globalThis as unknown as { Deno?: { env?: { get?: (name: string) => string | undefined } } }).Deno?.env;
  if (denoEnv?.get) return normalizeText(denoEnv.get(cleanName));
  const nodeEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return normalizeText(nodeEnv?.[cleanName]);
}

function sanitizeConfigForClient(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeConfigForClient(item));
  if (!value || typeof value !== 'object') return value;

  const clean: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    if (isSuspiciousSecretKey(key)) {
      clean[key] = normalizeText(current) ? '[redacted]' : current;
      continue;
    }
    clean[key] = sanitizeConfigForClient(current);
  }
  return clean;
}

export function sanitizeSourceForClient(source: Record<string, unknown>): Record<string, unknown> {
  return {
    ...source,
    parser_config_json: sanitizeConfigForClient(source.parser_config_json || {}),
  };
}

export function normalizeMonthlyParameterSourceInput(
  input: Record<string, unknown>,
  options: {
    workspaceId: string;
    actorId?: string;
    existing?: Record<string, unknown> | null;
  },
): MonthlyParameterSourceRecord {
  const existing = options.existing || {};
  const parameterKey = normalizeText(input.parameter_key ?? existing.parameter_key);
  const domain = normalizeText(input.domain ?? existing.domain) as MonthlyParameterDomain;
  const sourceType = normalizeText(input.source_type ?? existing.source_type) as MonthlyParameterSourceType;
  const sourceName = normalizeText(input.source_name ?? existing.source_name);
  const sourceUrl = normalizeText(input.source_url ?? existing.source_url);
  const notes = normalizeText(input.notes ?? existing.notes);
  const isActive = typeof input.is_active === 'boolean'
    ? input.is_active
    : typeof existing.is_active === 'boolean'
      ? Boolean(existing.is_active)
      : true;
  const priority = parsePriority(input.priority ?? existing.priority ?? 100);
  const parserConfig = parseObject(input.parser_config_json ?? existing.parser_config_json ?? {});

  if (!parameterKey) throw new Error('parameter_key e obrigatorio.');
  if (!MONTHLY_PARAMETER_DOMAINS.includes(domain)) throw new Error('domain invalido para fonte mensal.');
  if (!MONTHLY_PARAMETER_SOURCE_TYPES.includes(sourceType)) throw new Error('source_type invalido para fonte mensal.');
  if (!sourceName) throw new Error('source_name e obrigatorio.');
  if (sourceUrl && !isValidUrl(sourceUrl)) throw new Error('source_url deve ser uma URI valida.');

  ensureNoInlineSecrets(parserConfig);

  if (sourceType === 'api') {
    const secretName = normalizeText(parserConfig.secret_name);
    if (!secretName) {
      parserConfig.secret_name = '';
    }
  }

  if (sourceType === 'ai_research') {
    if (!normalizeText(parserConfig.default_confidence_level)) {
      parserConfig.default_confidence_level = 'low';
    }
    if (parserConfig.requires_manual_review !== false) {
      parserConfig.requires_manual_review = true;
    }
    if (!normalizeText(parserConfig.default_snapshot_status)) {
      parserConfig.default_snapshot_status = 'pending_review';
    }
  }

  return {
    workspace_id: options.workspaceId,
    parameter_key: parameterKey,
    domain,
    source_type: sourceType,
    source_name: sourceName,
    source_url: sourceUrl,
    is_active: isActive,
    priority,
    parser_config_json: parserConfig,
    notes,
    created_by: normalizeText(existing.created_by || options.actorId),
    updated_by: normalizeText(options.actorId),
  };
}

function validateIsoDate(value: unknown, fieldName: string): string {
  const raw = normalizeText(value);
  if (!raw) return '';
  const date = toIsoDate(raw);
  if (!date) throw new Error(`${fieldName} deve ser uma data valida.`);
  return date;
}

function clampInteger(value: unknown, fallback: number, max: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return Math.min(value, max);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Math.min(Number.parseInt(value.trim(), 10), max);
  }
  return fallback;
}

function getPathValue(input: unknown, path: unknown): unknown {
  const rawPath = normalizeText(path);
  if (!rawPath) return undefined;
  return rawPath.split('.').reduce((current: unknown, part) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number.parseInt(part, 10)];
    if (typeof current === 'object') return (current as Record<string, unknown>)[part];
    return undefined;
  }, input);
}

function applyTemplate(value: unknown, context: Record<string, string>): string {
  return normalizeText(value).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => context[key] || '');
}

function validateEndpointUrl(value: unknown): URL {
  const endpoint = normalizeText(value);
  if (!endpoint) throw new Error('endpoint_url e obrigatorio para fonte api.');

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('endpoint_url deve ser uma URL valida.');
  }

  if (url.protocol !== 'https:') throw new Error('endpoint_url deve usar HTTPS.');
  if (url.username || url.password) {
    throw new Error('endpoint_url nao pode conter credenciais embutidas.');
  }
  for (const key of url.searchParams.keys()) {
    if (isSuspiciousSecretKey(key)) {
      throw new Error('endpoint_url nao pode conter parametro sensivel; use headers com secret_name.');
    }
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('endpoint_url nao pode apontar para localhost.');
  }
  if (isBlockedPrivateHost(hostname)) {
    throw new Error('endpoint_url nao pode apontar para host local ou privado.');
  }
  return url;
}

function isBlockedPrivateHost(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === '0.0.0.0' || normalized === '127.0.0.1' || normalized === '::1') return true;
  if (normalized.startsWith('127.')) return true;
  if (normalized.startsWith('10.')) return true;
  if (normalized.startsWith('192.168.')) return true;
  if (normalized.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) return true;
  return false;
}

function buildApiUrl(config: Record<string, unknown>, source: Record<string, unknown>, competenceMonth: string): URL {
  const url = validateEndpointUrl(config.endpoint_url || source.source_url);
  const query = isPlainObject(config.query) ? config.query : {};
  const context = {
    competence_month: competenceMonth,
    domain: normalizeText(source.domain),
    parameter_key: normalizeText(source.parameter_key),
    source_name: normalizeText(source.source_name),
  };

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, applyTemplate(value, context));
  }

  return url;
}

function isSensitiveHeaderName(name: string): boolean {
  return /authorization|api[-_]?key|token|secret|password/i.test(name);
}

function buildApiHeaders(config: Record<string, unknown>): Headers {
  const headers = new Headers();
  headers.set('Accept', 'application/json');

  const configuredHeaders = asArray<Record<string, unknown>>(config.headers);
  for (const header of configuredHeaders) {
    const name = normalizeText(header.name);
    if (!name) throw new Error('headers[].name e obrigatorio.');
    if (/[\r\n:]/.test(name)) throw new Error('headers[].name invalido.');

    const secretName = normalizeText(header.secret_name);
    const staticValue = normalizeText(header.value);
    const prefix = header.prefix === undefined || header.prefix === null ? '' : String(header.prefix);
    const suffix = header.suffix === undefined || header.suffix === null ? '' : String(header.suffix);
    if (/[\r\n]/.test(prefix) || /[\r\n]/.test(suffix)) {
      throw new Error(`Header ${name} possui prefixo ou sufixo invalido.`);
    }
    let value = '';

    if (secretName) {
      const secretValue = getEnvSecret(secretName);
      if (!secretValue) throw new Error(`Secret ${secretName} nao configurado no ambiente.`);
      value = `${prefix}${secretValue}${suffix}`;
    } else if (staticValue) {
      if (isSensitiveHeaderName(name)) {
        throw new Error(`Header sensivel ${name} deve usar secret_name, nunca valor em claro.`);
      }
      value = staticValue;
    } else if (isSensitiveHeaderName(name) || prefix || suffix) {
      throw new Error(`Header ${name} deve informar secret_name.`);
    }

    if (value) headers.set(name, value);
  }

  return headers;
}

async function readLimitedJsonResponse(response: Response, maxBytes: number): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (!/application\/json|\+json/i.test(contentType)) {
    throw new Error('API deve retornar JSON.');
  }

  if (!response.body) {
    const text = await response.text();
    return JSON.parse(text);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch (_) {
        // response body cancellation is best-effort
      }
      throw new Error('Resposta da API excedeu o tamanho maximo permitido.');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error('Resposta da API nao e um JSON valido.');
  }
}

function defaultSnapshotStatus(row: Record<string, unknown>, config: Record<string, unknown>): 'active' | 'pending_review' {
  const status = normalizeText(row.status || config.default_snapshot_status);
  if (status) {
    if (!isValidProviderStatus(status)) {
      throw new Error('status deve ser active ou pending_review para fontes controladas.');
    }
    return status;
  }
  return config.requires_manual_review === true ? 'pending_review' : 'active';
}

function normalizeWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeProviderItem(
  row: Record<string, unknown>,
  source: Record<string, unknown>,
  config: Record<string, unknown>,
  competenceMonth: string,
): ProviderSnapshot {
  const fieldName = normalizeText(row.field_name);
  if (!fieldName) throw new Error('field_name e obrigatorio.');
  if (row.value === undefined || row.value === null) throw new Error('value e obrigatorio.');

  const parameterKey = normalizeText(row.parameter_key || source.parameter_key || fieldName);
  if (!parameterKey) throw new Error('parameter_key e obrigatorio.');

  const domain = normalizeText(row.domain || source.domain);
  if (!isValidDomain(domain)) throw new Error('domain invalido para item da fonte.');

  const valueType = normalizeText(row.value_type);
  if (!isValidValueType(valueType)) {
    throw new Error('value_type invalido; use percent, currency, integer, decimal, text ou json.');
  }

  const confidenceLevel = normalizeText(row.confidence_level || config.default_confidence_level || 'medium');
  if (!isValidConfidenceLevel(confidenceLevel)) {
    throw new Error('confidence_level invalido; use low, medium ou high.');
  }

  const normalizedValue = normalizeSnapshotValue(row.value, valueType);
  const effectiveStart = validateIsoDate(row.effective_start_date || `${competenceMonth}-01`, 'effective_start_date');
  const effectiveEnd = validateIsoDate(row.effective_end_date, 'effective_end_date');
  const sourceDate = validateIsoDate(row.source_date || source.source_date || currentDate(), 'source_date');

  return {
    parameter_key: parameterKey,
    domain,
    entity_type: normalizeText(row.entity_type || 'Asset'),
    field_name: fieldName,
    category: normalizeText(row.category),
    asset_type: normalizeText(row.asset_type),
    uf: normalizeText(row.uf),
    regime_fiscal: normalizeText(row.regime_fiscal),
    scope_key: normalizeText(row.scope_key),
    value: normalizedValue.value,
    value_type: valueType,
    unit: normalizeText(row.unit),
    source_name: normalizeText(row.source_name || source.source_name),
    source_url: normalizeText(row.source_url || source.source_url),
    source_date: sourceDate,
    effective_start_date: effectiveStart,
    effective_end_date: effectiveEnd,
    confidence_level: confidenceLevel,
    status: defaultSnapshotStatus(row, config),
    warnings: normalizeWarnings(row.warnings),
    raw_payload: {
      source_type: source.source_type,
      item: row,
    },
    created_by_ai: false,
    notes: normalizeText(row.notes || source.notes),
  };
}

function mapApiItem(
  item: Record<string, unknown>,
  fieldMap: Record<string, unknown>,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [targetField, sourcePath] of Object.entries(fieldMap)) {
    const value = getPathValue(item, sourcePath);
    if (value !== undefined) mapped[targetField] = value;
  }
  return mapped;
}

function deriveSnapshotsFromRows(
  source: Record<string, unknown>,
  competenceMonth: string,
  rows: Record<string, unknown>[],
): { snapshots: ProviderSnapshot[]; errors: ProviderItemError[] } {
  const config = parseObject(source.parser_config_json);
  const snapshots: ProviderSnapshot[] = [];
  const errors: ProviderItemError[] = [];

  rows.forEach((row, index) => {
    if (!isPlainObject(row)) {
      errors.push({ index, message: 'Item deve ser um objeto JSON.' });
      return;
    }

    try {
      snapshots.push(normalizeProviderItem(row, source, config, competenceMonth));
    } catch (error) {
      errors.push({
        index,
        parameter_key: normalizeText(row.parameter_key || source.parameter_key),
        field_name: normalizeText(row.field_name),
        message: String(error?.message || error),
      });
    }
  });

  return { snapshots, errors };
}

function deriveSnapshotsFromManualTable(
  source: Record<string, unknown>,
  competenceMonth: string,
): { snapshots: ProviderSnapshot[]; errors: ProviderItemError[]; configured: boolean } {
  const config = parseObject(source.parser_config_json);
  if (!Array.isArray(config.items)) {
    return { snapshots: [], errors: [], configured: false };
  }
  return { ...deriveSnapshotsFromRows(source, competenceMonth, asArray(config.items)), configured: true };
}

function deriveSnapshotsFromInternalRule(
  source: Record<string, unknown>,
  competenceMonth: string,
): { snapshots: ProviderSnapshot[]; errors: ProviderItemError[]; configured: boolean } {
  const config = parseObject(source.parser_config_json);
  if (!Array.isArray(config.rules)) {
    return { snapshots: [], errors: [], configured: false };
  }
  return { ...deriveSnapshotsFromRows(source, competenceMonth, asArray(config.rules)), configured: true };
}

async function deriveSnapshotsFromApi(
  source: Record<string, unknown>,
  competenceMonth: string,
): Promise<{ snapshots: ProviderSnapshot[]; errors: ProviderItemError[]; configured: boolean }> {
  const config = parseObject(source.parser_config_json);
  const endpointUrl = buildApiUrl(config, source, competenceMonth);
  const method = normalizeText(config.method || 'GET').toUpperCase();
  if (!isValidApiMethod(method)) throw new Error('method invalido para fonte api; use GET ou POST.');

  const timeoutMs = clampInteger(config.timeout_ms, DEFAULT_API_TIMEOUT_MS, MAX_API_TIMEOUT_MS);
  const maxResponseBytes = clampInteger(config.max_response_bytes, DEFAULT_MAX_RESPONSE_BYTES, MAX_RESPONSE_BYTES);
  const itemsPath = normalizeText(config.items_path);
  if (!itemsPath) throw new Error('items_path e obrigatorio para fonte api.');

  const fieldMap = parseObject(config.field_map);
  if (Object.keys(fieldMap).length === 0) throw new Error('field_map e obrigatorio para fonte api.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let payload: unknown;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: buildApiHeaders(config),
      signal: controller.signal,
      redirect: 'error',
    };

    if (method === 'POST') {
      const body = isPlainObject(config.body) ? config.body : {};
      fetchOptions.body = JSON.stringify(body);
      (fetchOptions.headers as Headers).set('Content-Type', 'application/json');
    }

    const response = await fetch(endpointUrl, fetchOptions);
    if (!response.ok) {
      throw new Error(`API retornou HTTP ${response.status}.`);
    }
    payload = await readLimitedJsonResponse(response, maxResponseBytes);
  } catch (error) {
    if (String(error?.name || '') === 'AbortError') {
      throw new Error('Tempo limite excedido ao consultar API.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const rows = getPathValue(payload, itemsPath);
  if (!Array.isArray(rows)) {
    throw new Error('items_path nao encontrado ou nao e uma lista.');
  }

  const mappedRows = rows.map((row) => {
    if (!isPlainObject(row)) return row;
    return {
      ...mapApiItem(row, fieldMap),
      source_name: normalizeText(source.source_name),
      source_url: endpointUrl.origin + endpointUrl.pathname,
    };
  });

  return { ...deriveSnapshotsFromRows(source, competenceMonth, mappedRows as Record<string, unknown>[]), configured: true };
}

export async function resolveMonthlyParameterSourceSnapshots(
  source: Record<string, unknown>,
  competenceMonth: string,
): Promise<ProviderResolveResult> {
  const sourceType = normalizeText(source.source_type);

  if (sourceType === 'manual_table') {
    const result = deriveSnapshotsFromManualTable(source, competenceMonth);
    if (!result.configured) {
      return {
        ok: false,
        message: 'Fonte manual sem itens configurados em parser_config_json.items.',
        provider_implemented: true,
      };
    }
    if (result.snapshots.length === 0) {
      return {
        ok: false,
        message: 'Fonte manual nao possui itens validos para gerar snapshots.',
        provider_implemented: true,
        errors: result.errors,
      };
    }
    return { ok: true, snapshots: result.snapshots, errors: result.errors };
  }

  if (sourceType === 'internal_rule') {
    const result = deriveSnapshotsFromInternalRule(source, competenceMonth);
    if (!result.configured) {
      return {
        ok: false,
        message: 'Fonte internal_rule sem regras configuradas em parser_config_json.rules.',
        provider_implemented: true,
      };
    }
    if (result.snapshots.length === 0) {
      return {
        ok: false,
        message: 'Fonte internal_rule nao possui regras validas para gerar snapshots.',
        provider_implemented: true,
        errors: result.errors,
      };
    }
    return { ok: true, snapshots: result.snapshots, errors: result.errors };
  }

  if (sourceType === 'api') {
    try {
      const result = await deriveSnapshotsFromApi(source, competenceMonth);
      if (!result.configured || result.snapshots.length === 0) {
        return {
          ok: false,
          message: 'Fonte api nao possui itens validos para gerar snapshots.',
          provider_implemented: true,
          errors: result.errors,
        };
      }
      return { ok: true, snapshots: result.snapshots, errors: result.errors };
    } catch (error) {
      return {
        ok: false,
        message: String(error?.message || error),
        provider_implemented: true,
      };
    }
  }

  if (sourceType === 'official_page' || sourceType === 'ai_research') {
    return {
      ok: false,
      message: 'Provider ainda nao implementado para esta fonte.',
      provider_implemented: false,
    };
  }

  return {
    ok: false,
    message: 'Tipo de fonte nao suportado.',
    provider_implemented: false,
  };
}
