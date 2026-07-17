import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import { NORMATIVE_KNOWLEDGE_SEED, type NormativeKnowledgeData } from './normativeKnowledgeBase.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EntityStore = {
  filter: (query: Record<string, unknown>, sort?: string, limit?: number, skip?: number) => Promise<Array<Record<string, unknown>>>;
  create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

type ImportStats = {
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  errors: string[];
};

const ENTITY_CONFIG = [
  { entity: 'NormativeSource', key: 'source_id', rows: NORMATIVE_KNOWLEDGE_SEED.sources },
  { entity: 'NormativeDocument', key: 'document_id', rows: NORMATIVE_KNOWLEDGE_SEED.documents },
  { entity: 'NormativeVersion', key: 'version_id', rows: NORMATIVE_KNOWLEDGE_SEED.versions },
  { entity: 'NormativeChunk', key: 'chunk_id', rows: NORMATIVE_KNOWLEDGE_SEED.chunks },
  { entity: 'DepreciationRule', key: 'rule_id', rows: NORMATIVE_KNOWLEDGE_SEED.depreciation_rules },
  { entity: 'ClassificationAlias', key: 'alias_id', rows: NORMATIVE_KNOWLEDGE_SEED.classification_aliases },
] as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function arraysToJsonFields(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  for (const [key, value] of Object.entries(row)) {
    if (!Array.isArray(value)) continue;
    const jsonKey = key === 'rule_ids' ? 'target_rule_ids_json' : `${key}_json`;
    next[jsonKey] = JSON.stringify(value);
    delete next[key];
  }
  return next;
}

function validateSeed(data: NormativeKnowledgeData): string[] {
  const errors: string[] = [];
  const documentIds = new Set(data.documents.map((item) => item.document_id));
  const currentVersions = new Map(data.documents.map((item) => [item.document_id, item.version]));
  const ruleIds = new Set(data.depreciation_rules.map((item) => item.rule_id));

  for (const document of data.documents) {
    if (!document.document_id || !document.version || !document.content_hash) errors.push(`Documento invalido: ${document.document_id || '(sem id)'}`);
  }
  for (const chunk of data.chunks) {
    if (!documentIds.has(chunk.document_id)) errors.push(`Chunk ${chunk.chunk_id} aponta documento inexistente.`);
    if (currentVersions.get(chunk.document_id) !== chunk.version) errors.push(`Chunk ${chunk.chunk_id} nao aponta versao vigente.`);
  }
  for (const rule of data.depreciation_rules) {
    if (!documentIds.has(rule.document_id)) errors.push(`Regra ${rule.rule_id} aponta documento inexistente.`);
    if (rule.status === 'vigente' && currentVersions.get(rule.document_id) !== rule.version) errors.push(`Regra ${rule.rule_id} nao aponta versao vigente.`);
    if (rule.domain === 'fiscal' && rule.status === 'vigente') {
      if (!rule.official_description || !rule.source_url || !rule.raw_reference) errors.push(`Regra fiscal ${rule.rule_id} sem rastreabilidade completa.`);
    }
  }
  for (const alias of data.classification_aliases) {
    for (const ruleId of alias.rule_ids || []) {
      if (!ruleIds.has(ruleId)) errors.push(`Alias ${alias.alias_id} aponta regra inexistente ${ruleId}.`);
    }
    for (const documentId of alias.document_ids || []) {
      if (!documentIds.has(documentId)) errors.push(`Alias ${alias.alias_id} aponta documento inexistente ${documentId}.`);
    }
  }
  return errors;
}

async function upsertRows(entity: EntityStore | undefined, key: string, rows: readonly Record<string, unknown>[], dryRun: boolean, stats: ImportStats) {
  if (!entity) {
    stats.rejected += rows.length;
    stats.errors.push(`Entidade ausente para chave ${key}.`);
    return;
  }

  for (const row of rows) {
    const idValue = row[key];
    if (!idValue) {
      stats.rejected += 1;
      stats.errors.push(`Registro sem chave ${key}.`);
      continue;
    }

    const payload = arraysToJsonFields(row);
    const existing = (await entity.filter({ [key]: idValue }, '-created_date', 1))[0];
    if (!existing) {
      stats.created += 1;
      if (!dryRun) await entity.create(payload);
      continue;
    }

    const comparableExisting = { ...existing };
    delete comparableExisting.id;
    delete comparableExisting.created_date;
    delete comparableExisting.updated_date;
    delete comparableExisting.created_by;
    const same = stableJson(comparableExisting) === stableJson({ ...comparableExisting, ...payload });
    if (same) {
      stats.unchanged += 1;
      continue;
    }
    stats.updated += 1;
    if (!dryRun) await entity.update(String(existing.id), payload);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }, '-created_date', 1))[0];
    if (!fresh?.is_platform_admin) return json({ error: 'Acesso negado.' }, 403);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const validationErrors = validateSeed(NORMATIVE_KNOWLEDGE_SEED);
    if (validationErrors.length > 0) {
      return json({ ok: false, dry_run: dryRun, rejected: validationErrors.length, errors: validationErrors }, 400);
    }

    const stats: ImportStats = { created: 0, updated: 0, unchanged: 0, rejected: 0, errors: [] };
    for (const config of ENTITY_CONFIG) {
      await upsertRows(svc.entities[config.entity] as EntityStore | undefined, config.key, config.rows, dryRun, stats);
    }

    return json({ ok: stats.errors.length === 0, dry_run: dryRun, ...stats });
  } catch (_) {
    return json({ error: 'Nao foi possivel inicializar a base normativa.' }, 500);
  }
});
