import {
  CLASSIFICATION_ALIASES_DATA,
  DEPRECIATION_RULES_DATA,
  NORMATIVE_CHUNKS_DATA,
  NORMATIVE_DOCUMENTS_DATA,
  NORMATIVE_SOURCES_DATA,
  NORMATIVE_VERSIONS_DATA,
} from './normative-data/index.ts';

export type NormativeDomain = 'accounting' | 'fiscal' | 'classification';
export type NormativeStatus = 'vigente' | 'revogado' | 'substituido';

export type NormativeDocument = {
  document_id: string;
  source_id?: string;
  title: string;
  authority: string;
  document_type: string;
  number?: string;
  year?: number;
  domain: NormativeDomain;
  status: NormativeStatus;
  effective_start?: string;
  effective_end?: string;
  official_url: string;
  version: string;
  content_hash: string;
  last_checked_at: string;
  replaces_document_id?: string;
  amended_by_document_ids?: string[];
  normalized_text?: string;
};

export type NormativeVersion = {
  version_id: string;
  document_id: string;
  version: string;
  status: NormativeStatus;
  effective_start?: string;
  effective_end?: string;
  official_url: string;
  content_hash: string;
  checked_at: string;
  notes?: string;
  amendments?: string[];
};

export type NormativeChunk = {
  chunk_id: string;
  document_id: string;
  version: string;
  section: string;
  domain: NormativeDomain;
  status: NormativeStatus;
  text: string;
  keywords: string[];
  content_type?: string;
  themes?: string[];
  scope?: string;
  source_url?: string;
};

export type DepreciationRule = {
  rule_id: string;
  document_id: string;
  version: string;
  domain: 'fiscal' | 'accounting';
  status: NormativeStatus;
  category?: string;
  asset_type?: string;
  classification_type?: string;
  ncm?: string;
  aliases: string[];
  match_terms?: string[];
  depreciation_rate?: number;
  useful_life_years?: number;
  residual_guidance?: string;
  unit_rate?: 'percent_per_year';
  unit_life?: 'years';
  source_section: string;
  official_description?: string;
  source_url?: string;
  raw_reference?: string;
  notes: string;
};

export type ClassificationAlias = {
  alias_id: string;
  normalized: string;
  category?: string;
  asset_type?: string;
  ncm?: string;
  cnae?: string;
  rule_ids: string[];
  document_ids: string[];
  match_type?: 'exact' | 'partial' | 'keyword';
  priority?: number;
  context_terms?: string[];
  excluded_terms?: string[];
  origin?: string;
  status?: NormativeStatus;
};

export type NormativeSource = {
  source_id: string;
  name: string;
  authority: string;
  official_base_url: string;
  domain: NormativeDomain;
  update_strategy: 'official_document' | 'catalog' | 'classification_table' | 'manual_curated';
  active: boolean;
  last_checked_at?: string;
};

export type NormativeReference = {
  document_id: string;
  title: string;
  version: string;
  section?: string;
  rule_id?: string;
};

export type NormativeRetrievalResult = {
  documents: NormativeDocument[];
  versions: NormativeVersion[];
  chunks: NormativeChunk[];
  rules: DepreciationRule[];
  aliases: ClassificationAlias[];
  sources: NormativeSource[];
  normative_references: NormativeReference[];
};

export type NormativeKnowledgeData = {
  sources: NormativeSource[];
  documents: NormativeDocument[];
  versions: NormativeVersion[];
  chunks: NormativeChunk[];
  depreciation_rules: DepreciationRule[];
  classification_aliases: ClassificationAlias[];
};

export const NORMATIVE_SOURCES = NORMATIVE_SOURCES_DATA as unknown as NormativeSource[];
export const NORMATIVE_DOCUMENTS = NORMATIVE_DOCUMENTS_DATA as unknown as NormativeDocument[];
export const NORMATIVE_VERSIONS = NORMATIVE_VERSIONS_DATA as unknown as NormativeVersion[];
export const NORMATIVE_CHUNKS = NORMATIVE_CHUNKS_DATA as unknown as NormativeChunk[];
export const DEPRECIATION_RULES = DEPRECIATION_RULES_DATA as unknown as DepreciationRule[];
export const CLASSIFICATION_ALIASES = CLASSIFICATION_ALIASES_DATA as unknown as ClassificationAlias[];

export const NORMATIVE_KNOWLEDGE_SEED: NormativeKnowledgeData = {
  sources: NORMATIVE_SOURCES,
  documents: NORMATIVE_DOCUMENTS,
  versions: NORMATIVE_VERSIONS,
  chunks: NORMATIVE_CHUNKS,
  depreciation_rules: DEPRECIATION_RULES,
  classification_aliases: CLASSIFICATION_ALIASES,
};

export function isNormativeKnowledgeEmpty(data: Partial<NormativeKnowledgeData> | null | undefined): boolean {
  return !data
    || (
      (data.documents?.length ?? 0) === 0
      && (data.versions?.length ?? 0) === 0
      && (data.chunks?.length ?? 0) === 0
      && (data.depreciation_rules?.length ?? 0) === 0
      && (data.classification_aliases?.length ?? 0) === 0
    );
}

export function normalizeNormativeKnowledgeData(data: Partial<NormativeKnowledgeData> | null | undefined): NormativeKnowledgeData {
  if (isNormativeKnowledgeEmpty(data)) return NORMATIVE_KNOWLEDGE_SEED;
  return {
    sources: data?.sources ?? [],
    documents: data?.documents ?? [],
    versions: data?.versions ?? [],
    chunks: data?.chunks ?? [],
    depreciation_rules: data?.depreciation_rules ?? [],
    classification_aliases: data?.classification_aliases ?? [],
  };
}

function normalizeTokenText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: unknown): string[] {
  return normalizeTokenText(value).split(/\s+/).filter((token) => token.length >= 3);
}

function contextText(context: Record<string, unknown>): string {
  return [
    context.name,
    context.category,
    context.description,
    context.account,
    context.notes,
    context.supplier_name,
    context.location,
    context.sector_name,
    context.vehicle_model_year,
    context.vehicle_fuel_type,
    context.property_registration_type,
    context.ownership_type,
    context.normative_search_terms,
  ].map(normalizeTokenText).filter(Boolean).join(' ');
}

function sameText(left: unknown, right: unknown): boolean {
  return normalizeTokenText(left) === normalizeTokenText(right);
}

function parameterDomain(params: string[]): NormativeDomain {
  return params.some((param) => param.startsWith('fiscal_')) ? 'fiscal' : 'accounting';
}

function currentVersionByDocument(documents: NormativeDocument[]): Map<string, string> {
  return new Map(documents
    .filter((doc) => doc.status === 'vigente' && doc.document_id && doc.version)
    .map((doc) => [doc.document_id, doc.version]));
}

function textIncludesTerm(text: string, term: unknown): boolean {
  const normalized = normalizeTokenText(term);
  if (!normalized) return false;
  if (text.includes(normalized)) return true;
  const termTokens = tokens(normalized);
  return termTokens.length > 0 && termTokens.every((token) => text.includes(token));
}

function aliasMatches(alias: ClassificationAlias, text: string, context: Record<string, unknown>): boolean {
  if (alias.status && alias.status !== 'vigente') return false;
  if (alias.category && !sameText(alias.category, context.category)) return false;
  if ((alias.excluded_terms || []).some((term) => textIncludesTerm(text, term))) return false;
  if (!textIncludesTerm(text, alias.normalized)) return false;
  const contextTerms = alias.context_terms || [];
  if (alias.match_type === 'partial' && contextTerms.length > 0) {
    return contextTerms.some((term) => textIncludesTerm(text, term));
  }
  return true;
}

function scoreAlias(alias: ClassificationAlias, text: string): number {
  let score = Math.max(1, Math.floor((alias.priority ?? 50) / 10));
  for (const term of alias.context_terms || []) {
    if (textIncludesTerm(text, term)) score += 2;
  }
  return score;
}

function scoreRule(
  rule: DepreciationRule,
  text: string,
  context: Record<string, unknown>,
  matchedAliases: ClassificationAlias[],
  classification?: { type?: string | null },
): number {
  if (rule.status !== 'vigente') return -1000;
  let score = 0;
  if (rule.domain === 'accounting' && rule.category && sameText(rule.category, context.category)) score += 5;
  if (rule.asset_type && classification?.type && rule.asset_type === classification.type) score += 8;
  if (rule.ncm && textIncludesTerm(text, rule.ncm)) score += 10;
  for (const alias of matchedAliases) {
    if (alias.rule_ids.includes(rule.rule_id)) score += scoreAlias(alias, text) + 10;
    if (alias.asset_type && rule.asset_type && alias.asset_type === rule.asset_type) score += 3;
    if (alias.ncm && rule.ncm && alias.ncm === rule.ncm) score += 4;
  }
  for (const alias of rule.aliases || []) {
    if (textIncludesTerm(text, alias)) score += 4;
  }
  for (const term of rule.match_terms || []) {
    if (textIncludesTerm(text, term)) score += 3;
  }
  return score;
}

function scoreChunk(chunk: NormativeChunk, text: string, domain: NormativeDomain): number {
  if (chunk.status !== 'vigente') return -1000;
  let score = chunk.domain === domain ? 4 : 0;
  for (const keyword of chunk.keywords || []) {
    if (textIncludesTerm(text, keyword)) score += 2;
  }
  return score;
}

function byDocument(documents: NormativeDocument[], id: string): NormativeDocument {
  const document = documents.find((doc) => doc.document_id === id);
  const fallback = documents.find((doc) => doc.status === 'vigente') || NORMATIVE_DOCUMENTS[0];
  if (!document && !fallback) throw new Error(`Normative document not found: ${id}`);
  return document || fallback;
}

function referenceForRule(documents: NormativeDocument[], rule: DepreciationRule): NormativeReference {
  const doc = byDocument(documents, rule.document_id);
  return {
    document_id: doc.document_id,
    title: doc.title,
    version: rule.version,
    section: rule.source_section,
    rule_id: rule.rule_id,
  };
}

function referenceForChunk(documents: NormativeDocument[], chunk: NormativeChunk): NormativeReference {
  const doc = byDocument(documents, chunk.document_id);
  return {
    document_id: doc.document_id,
    title: doc.title,
    version: chunk.version,
    section: chunk.section,
  };
}

export function retrieveNormativeKnowledge(
  data: NormativeKnowledgeData,
  context: Record<string, unknown>,
  params: string[],
  classification?: { type?: string | null },
): NormativeRetrievalResult {
  const normalizedData = normalizeNormativeKnowledgeData(data);
  const domain = parameterDomain(params);
  const text = contextText(context);
  const currentVersions = currentVersionByDocument(normalizedData.documents);
  const matchedAliases = normalizedData.classification_aliases
    .filter((alias) => aliasMatches(alias, text, context))
    .sort((a, b) => scoreAlias(b, text) - scoreAlias(a, text))
    .slice(0, 25);

  const ruleLimit = domain === 'fiscal' ? 15 : 20;
  const rules = normalizedData.depreciation_rules
    .map((rule) => ({ rule, score: scoreRule(rule, text, context, matchedAliases, classification) }))
    .filter(({ rule, score }) => (
      score > 0
      && rule.domain === domain
      && rule.status === 'vigente'
      && currentVersions.get(rule.document_id) === rule.version
    ))
    .sort((a, b) => b.score - a.score || a.rule.rule_id.localeCompare(b.rule.rule_id))
    .slice(0, ruleLimit)
    .map(({ rule }) => rule);

  const chunks = normalizedData.chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, text, domain) }))
    .filter(({ chunk, score }) => (
      score > 0
      && chunk.status === 'vigente'
      && currentVersions.get(chunk.document_id) === chunk.version
    ))
    .sort((a, b) => b.score - a.score || a.chunk.chunk_id.localeCompare(b.chunk.chunk_id))
    .slice(0, 20)
    .map(({ chunk }) => chunk);

  const documentIds = new Set<string>();
  rules.forEach((rule) => documentIds.add(rule.document_id));
  chunks.forEach((chunk) => documentIds.add(chunk.document_id));
  matchedAliases.forEach((alias) => alias.document_ids.forEach((id) => documentIds.add(id)));
  if (domain === 'accounting') documentIds.add('cpc_27');
  if (domain === 'fiscal') {
    documentIds.add('in_rfb_1700_2017');
    documentIds.add('in_rfb_1700_2017_anexo_iii');
  }

  const documents = normalizedData.documents.filter((doc) => documentIds.has(doc.document_id) && doc.status === 'vigente');
  const versions = normalizedData.versions.filter((version) => documentIds.has(version.document_id) && currentVersions.get(version.document_id) === version.version);
  const sourceIds = new Set(documents.map((doc) => doc.source_id).filter(Boolean) as string[]);
  const sourceAuthorities = new Set(documents.map((doc) => doc.authority));
  const sources = normalizedData.sources.filter((source) => (
    source.active
    && (sourceIds.has(source.source_id) || sourceAuthorities.has(source.authority) || source.domain === 'classification')
  ));
  const normativeReferences = [
    ...rules.map((rule) => referenceForRule(normalizedData.documents, rule)),
    ...chunks.map((chunk) => referenceForChunk(normalizedData.documents, chunk)),
  ];

  return {
    documents,
    versions,
    chunks,
    rules,
    aliases: matchedAliases,
    sources,
    normative_references: normativeReferences.slice(0, 30),
  };
}
