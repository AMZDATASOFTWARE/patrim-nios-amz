export type TrustedSourceType = 'contabil' | 'fiscal' | 'tecnica' | 'mercado' | 'construcao';

export type TrustedAssetSource = {
  id: string;
  name: string;
  type: TrustedSourceType;
  hosts: string[];
  pathPrefixes?: string[];
  categories: string[];
  description: string;
  priority: 'alta' | 'media_alta' | 'media';
  entryUrls: string[];
  active: true;
  limitations: string[];
};

export type SourceEvidence = {
  id: string;
  source_id: string;
  source_name: string;
  source_type: TrustedSourceType;
  url: string;
  title: string;
  excerpt: string;
  retrieved_at: string;
  used: true;
  summary: string;
};

export type SourceFailure = {
  id: string;
  reason_code: string;
};

export type SourceCollectionResult = {
  evidence: SourceEvidence[];
  consulted: SourceEvidence[];
  failed: SourceFailure[];
};

export type SourceRuntime = {
  fetch?: typeof fetch;
  now?: () => Date;
  resolveDns?: (hostname: string) => Promise<string[]>;
};

type PageLink = {
  url: string;
  text: string;
  score: number;
};

const MAX_SOURCES = 3;
const MAX_PAGES_PER_SOURCE = 3;
const MAX_DEPTH = 2;
const MAX_REDIRECTS = 3;
const PAGE_TIMEOUT_MS = 8000;
const TOTAL_TIMEOUT_MS = 18000;
const MAX_PAGE_BYTES = 240000;
const MAX_EXCERPT_CHARS = 2500;
const USER_AGENT = 'AMZ-Patrimonios-TrustedSourceReader/1.0';

export const TRUSTED_ASSET_SOURCES: TrustedAssetSource[] = [
  {
    id: 'cpc',
    name: 'Comite de Pronunciamentos Contabeis',
    type: 'contabil',
    hosts: ['cpc.org.br'],
    categories: ['*'],
    description: 'Normas e pronunciamentos contabeis.',
    priority: 'alta',
    entryUrls: ['https://cpc.org.br/', 'https://cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos'],
    active: true,
    limitations: ['Referencia contabil geral; nao e tabela numerica automatica.'],
  },
  {
    id: 'cfc',
    name: 'Conselho Federal de Contabilidade',
    type: 'contabil',
    hosts: ['cfc.org.br'],
    categories: ['*'],
    description: 'Normas brasileiras de contabilidade.',
    priority: 'alta',
    entryUrls: ['https://cfc.org.br/', 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/'],
    active: true,
    limitations: ['Referencia contabil geral; exige julgamento profissional.'],
  },
  {
    id: 'cvm',
    name: 'Comissao de Valores Mobiliarios',
    type: 'contabil',
    hosts: ['conteudo.cvm.gov.br'],
    categories: ['Investimentos', 'Intangiveis'],
    description: 'Normas contabeis consolidadas e orientacoes reguladoras.',
    priority: 'media_alta',
    entryUrls: ['https://conteudo.cvm.gov.br/'],
    active: true,
    limitations: ['Aplicavel principalmente a contexto regulado.'],
  },
  {
    id: 'gov_cvm',
    name: 'Portal Gov.br - CVM',
    type: 'contabil',
    hosts: ['www.gov.br'],
    pathPrefixes: ['/cvm'],
    categories: ['Investimentos', 'Intangiveis'],
    description: 'Regulamentacao contabil publicada pela CVM no Gov.br.',
    priority: 'media_alta',
    entryUrls: ['https://www.gov.br/cvm/'],
    active: true,
    limitations: ['Somente caminhos dentro de /cvm sao permitidos.'],
  },
  {
    id: 'receita_normas',
    name: 'Receita Federal - Normas',
    type: 'fiscal',
    hosts: ['normas.receita.fazenda.gov.br'],
    categories: ['*'],
    description: 'Referencias fiscais oficiais.',
    priority: 'media_alta',
    entryUrls: ['https://normas.receita.fazenda.gov.br/', 'https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action'],
    active: true,
    limitations: ['Referencia fiscal; nao substitui estimativa gerencial.'],
  },
  {
    id: 'gov_receita',
    name: 'Portal Gov.br - Receita Federal',
    type: 'fiscal',
    hosts: ['www.gov.br'],
    pathPrefixes: ['/receitafederal'],
    categories: ['*'],
    description: 'Conteudos fiscais da Receita Federal no Gov.br.',
    priority: 'media',
    entryUrls: ['https://www.gov.br/receitafederal/'],
    active: true,
    limitations: ['Somente caminhos dentro de /receitafederal sao permitidos.'],
  },
  {
    id: 'fipe',
    name: 'FIPE Veiculos',
    type: 'mercado',
    hosts: ['fipe.org.br', 'veiculos.fipe.org.br'],
    categories: ['Veiculos'],
    description: 'Referencia de mercado de veiculos.',
    priority: 'media_alta',
    entryUrls: ['https://veiculos.fipe.org.br/'],
    active: true,
    limitations: ['Referencia de mercado; nao altera valor contabil automaticamente.'],
  },
  {
    id: 'fipe_maquinas',
    name: 'FIPE Maquinas',
    type: 'mercado',
    hosts: ['tpt.fipe.org.br'],
    categories: ['Equipamentos'],
    description: 'Referencia de mercado de maquinas agricolas.',
    priority: 'media_alta',
    entryUrls: ['https://tpt.fipe.org.br/'],
    active: true,
    limitations: ['Usar somente quando o ativo for identificado como maquina agricola.'],
  },
  {
    id: 'caixa_sinapi',
    name: 'CAIXA / SINAPI',
    type: 'construcao',
    hosts: ['caixa.gov.br', 'www.caixa.gov.br'],
    categories: ['Imoveis'],
    description: 'Custos de construcao, imoveis, instalacoes e obras.',
    priority: 'media_alta',
    entryUrls: ['https://www.caixa.gov.br/'],
    active: true,
    limitations: ['Referencia de custo de construcao, nao valor contabil automatico.'],
  },
  {
    id: 'ibge_sinapi',
    name: 'IBGE / SINAPI',
    type: 'construcao',
    hosts: ['ibge.gov.br', 'www.ibge.gov.br'],
    categories: ['Imoveis'],
    description: 'Indices e custos da construcao.',
    priority: 'media_alta',
    entryUrls: ['https://www.ibge.gov.br/'],
    active: true,
    limitations: ['Referencia complementar para construcao.'],
  },
  {
    id: 'gov_patrimonio_uniao',
    name: 'Portal Gov.br - Patrimonio da Uniao',
    type: 'construcao',
    hosts: ['www.gov.br'],
    pathPrefixes: ['/gestao'],
    categories: ['Imoveis'],
    description: 'Referencias complementares de imoveis e gestao patrimonial.',
    priority: 'media',
    entryUrls: ['https://www.gov.br/gestao/'],
    active: true,
    limitations: ['Referencia complementar; exige validacao humana.'],
  },
  {
    id: 'anvisa',
    name: 'Anvisa',
    type: 'tecnica',
    hosts: ['consultas.anvisa.gov.br', 'www.gov.br'],
    pathPrefixes: ['/anvisa'],
    categories: ['Equipamentos'],
    description: 'Identificacao de equipamentos medicos e hospitalares.',
    priority: 'media_alta',
    entryUrls: ['https://consultas.anvisa.gov.br/', 'https://www.gov.br/anvisa/'],
    active: true,
    limitations: ['Aplicavel a equipamentos medicos ou hospitalares.'],
  },
  {
    id: 'inmetro',
    name: 'Inmetro',
    type: 'tecnica',
    hosts: ['inmetro.gov.br', 'www.inmetro.gov.br', 'registro.inmetro.gov.br', 'www.gov.br'],
    pathPrefixes: ['/inmetro'],
    categories: ['Equipamentos', 'Veiculos'],
    description: 'Identificacao tecnica e certificacao de equipamentos.',
    priority: 'media_alta',
    entryUrls: ['https://www.inmetro.gov.br/', 'https://registro.inmetro.gov.br/', 'https://www.gov.br/inmetro/'],
    active: true,
    limitations: ['Referencia tecnica, nao tabela contabile.'],
  },
  {
    id: 'bndes',
    name: 'BNDES',
    type: 'tecnica',
    hosts: ['bndes.gov.br', 'www.bndes.gov.br', 'ws.bndes.gov.br'],
    categories: ['Equipamentos'],
    description: 'Catalogo de maquinas e equipamentos.',
    priority: 'media',
    entryUrls: ['https://www.bndes.gov.br/', 'https://ws.bndes.gov.br/'],
    active: true,
    limitations: ['Referencia tecnica e cadastral, nao vida util normativa.'],
  },
];

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeCategory(value: unknown): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function isMedicalEquipment(text: string): boolean {
  return /\b(hospital|hospitalar|medic|clinica|laboratorio|anvisa|saude|raio|ultrassom|tomogra|ressonancia)\b/.test(text);
}

function isAgriculturalMachine(text: string): boolean {
  return /\b(agricol|trator|colheitadeira|plantadeira|pulverizador|semeadora|implemento rural)\b/.test(text);
}

function isFiscalContext(text: string): boolean {
  return ['fiscal', 'tribut', 'receita', 'rir', 'irpj', 'depreciacao fiscal'].some((term) => text.includes(term));
}

function categoryMatches(category: string, expected: 'veiculos' | 'equipamentos' | 'imoveis' | 'investimentos' | 'intangiveis'): boolean {
  if (category === expected) return true;
  if (expected === 'veiculos') return category.includes('ve') && category.includes('culos');
  if (expected === 'imoveis') return category.includes('im') && category.includes('veis');
  if (expected === 'intangiveis') return category.includes('intang') && category.includes('veis');
  return false;
}

function addSource(ids: string[], id: string): void {
  if (!ids.includes(id)) ids.push(id);
}

function categorySpecificSourceIds(category: string, text: string): string[] {
  if (categoryMatches(category, 'veiculos')) {
    const ids = ['fipe'];
    if (/\b(certifica|inmetro|equipamento)\b/.test(text)) ids.push('inmetro');
    return ids;
  }

  if (categoryMatches(category, 'equipamentos')) {
    if (isAgriculturalMachine(text) || text.includes('trator') || text.includes('agricol')) return ['fipe_maquinas', 'bndes'];
    if (isMedicalEquipment(text) || text.includes('hospitalar') || text.includes('ultrassom') || text.includes('medic')) return ['anvisa', 'inmetro'];
    return ['inmetro', 'bndes'];
  }

  if (categoryMatches(category, 'imoveis')) return ['caixa_sinapi', 'ibge_sinapi', 'gov_patrimonio_uniao'];
  if (categoryMatches(category, 'investimentos') || categoryMatches(category, 'intangiveis')) return ['cvm', 'gov_cvm'];
  return [];
}

function activeSourcesFromIds(ids: string[], maxSources: number): TrustedAssetSource[] {
  return ids
    .map((id) => TRUSTED_ASSET_SOURCES.find((source) => source.id === id))
    .filter((source): source is TrustedAssetSource => !!source?.active)
    .slice(0, maxSources);
}

export function selectTrustedSources(assetContext: Record<string, unknown>, maxSources = MAX_SOURCES): TrustedAssetSource[] {
  const category = normalizeCategory(assetContext.category);
  const text = normalizeText([
    assetContext.name,
    assetContext.category,
    assetContext.description,
    assetContext.account,
    assetContext.notes,
    assetContext.vehicle_fuel_type,
    assetContext.property_registration_type,
  ].filter(Boolean).join(' '));

  const ids: string[] = [];
  addSource(ids, 'cpc');

  const categoryIds = categorySpecificSourceIds(category, text);
  if (isFiscalContext(text)) {
    addSource(ids, categoryIds[0] || 'cfc');
    addSource(ids, 'receita_normas');
    return activeSourcesFromIds(ids, maxSources);
  }

  addSource(ids, 'cfc');
  for (const id of categoryIds) addSource(ids, id);

  return activeSourcesFromIds(ids, maxSources);
}

function normalizeHostnameForSafety(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
}

function isIpAddress(hostname: string): boolean {
  const host = normalizeHostnameForSafety(hostname);
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':');
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = normalizeHostnameForSafety(hostname).split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
}

function isUnsafeHostname(hostname: string): boolean {
  const host = normalizeHostnameForSafety(hostname);
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === 'metadata.google.internal') return true;
  if (isPrivateIpv4(host)) return true;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  return false;
}

export function isTrustedUrlForSource(rawUrl: string, source: TrustedAssetSource): { ok: boolean; url?: URL; reason?: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return { ok: false, reason: 'INVALID_URL' };
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'HTTPS_REQUIRED' };
  if (url.username || url.password) return { ok: false, reason: 'EMBEDDED_CREDENTIALS' };

  const hostname = url.hostname.toLowerCase();
  if (isUnsafeHostname(hostname)) return { ok: false, reason: 'UNSAFE_HOST' };
  if (isIpAddress(hostname)) return { ok: false, reason: 'IP_HOST_BLOCKED' };
  if (!source.hosts.map((host) => host.toLowerCase()).includes(hostname)) return { ok: false, reason: 'HOST_NOT_ALLOWED' };

  if (hostname === 'www.gov.br' && source.pathPrefixes?.length) {
    const ok = source.pathPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
    if (!ok) return { ok: false, reason: 'PATH_NOT_ALLOWED' };
  }

  return { ok: true, url };
}

async function resolveDnsWithRuntime(hostname: string): Promise<string[] | null> {
  const deno = (globalThis as unknown as {
    Deno?: { resolveDns?: (query: string, recordType: 'A' | 'AAAA') => Promise<string[]> };
  }).Deno;
  if (typeof deno?.resolveDns !== 'function') return null;

  const results = await Promise.allSettled([
    deno.resolveDns(hostname, 'A'),
    deno.resolveDns(hostname, 'AAAA'),
  ]);
  const addresses = results
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .filter(Boolean);
  return addresses;
}

async function assertDnsSafe(url: URL, runtime: SourceRuntime): Promise<void> {
  const resolver = runtime.resolveDns || resolveDnsWithRuntime;
  const addresses = await resolver(url.hostname);
  if (!addresses) return;
  if (addresses.some((address) => isUnsafeHostname(address) || isPrivateIpv4(address))) {
    throw new Error('DNS_UNSAFE_ADDRESS');
  }
}

function resolveUrl(baseUrl: string, href: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch (_) {
    return '';
  }
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const GENERIC_RELEVANCE_TERMS = [
  'depreciacao',
  'vida util',
  'ativo imobilizado',
  'valor residual',
  'imobilizado',
  'pronunciamento',
  'norma contabil',
  'equipamento',
  'veiculo',
  'imovel',
];

const GENERIC_NAVIGATION_TERMS = [
  'contato',
  'fale conosco',
  'ouvidoria',
  'mapa do site',
  'acessibilidade',
  'privacidade',
  'imprensa',
  'login',
  'trabalhe conosco',
  'institucional',
  'quem somos',
];

function stripHtml(value: string): string {
  return normalizeSpaces(value.replace(/<[^>]+>/g, ' '));
}

function looksSensitiveToken(token: string): boolean {
  return /^pat[-_]?/.test(token)
    || /^rfid/.test(token)
    || /^nf[-_]?\d*/.test(token)
    || /^(cpf|cnpj|renavam|chassi|placa|nota|documento|documentos)$/.test(token)
    || /^\d{5,}$/.test(token)
    || /^[a-z0-9._%+-]+@[a-z0-9.-]+$/.test(token);
}

export function buildTrustedSourceSearchTerms(assetContext: Record<string, unknown>): string[] {
  const raw = [
    assetContext.name,
    assetContext.category,
    assetContext.description,
    assetContext.account,
  ].filter(Boolean).join(' ');
  const normalized = normalizeText(raw)
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\b(cpf|cnpj|renavam|chassi|placa|nota fiscal|nf)\b[:\s-]*[a-z0-9.-]+/g, ' ');
  const terms: string[] = [];
  for (const token of normalized.split(/[^a-z0-9-]+/)) {
    const clean = token.replace(/^-+|-+$/g, '');
    if (clean.length < 4 || clean.length > 30 || looksSensitiveToken(clean)) continue;
    if (!terms.includes(clean)) terms.push(clean);
    if (terms.length >= 12) break;
  }
  return terms;
}

function scoreTextAgainstTerms(text: string, terms: string[], weight: number): number {
  const haystack = normalizeText(text);
  return terms.reduce((score, term) => score + (haystack.includes(normalizeText(term)) ? weight : 0), 0);
}

function isGenericNavigationLink(text: string): boolean {
  const haystack = normalizeText(text);
  return GENERIC_NAVIGATION_TERMS.some((term) => haystack.includes(term));
}

function scoreCandidateLink(url: string, label: string, title: string, assetContext: Record<string, unknown>, source: TrustedAssetSource): number {
  const assetTerms = buildTrustedSourceSearchTerms(assetContext);
  const haystack = `${url} ${label} ${title}`;
  let score = 0;
  score += scoreTextAgainstTerms(haystack, assetTerms, 4);
  score += scoreTextAgainstTerms(haystack, GENERIC_RELEVANCE_TERMS, 3);
  score += scoreTextAgainstTerms(haystack, [source.description], 1);
  if (isGenericNavigationLink(haystack)) score -= 6;
  if (/\/$/.test(new URL(url).pathname) || new URL(url).pathname === '/') score -= 1;
  return score;
}

function buildSourceQueue(source: TrustedAssetSource, assetContext: Record<string, unknown>): PageLink[] {
  return source.entryUrls
    .filter((url) => isTrustedUrlForSource(url, source).ok)
    .map((url) => ({
      url,
      text: source.name,
      score: scoreCandidateLink(url, source.name, source.description, assetContext, source),
    }))
    .sort((a, b) => b.score - a.score);
}

function extractTitle(html: string): string {
  return normalizeSpaces(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, ' ') || '');
}

function sanitizeHtml(html: string): { title: string; text: string; links: Array<{ href: string; text: string }> } {
  const links = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: match[1], text: stripHtml(match[2] || '') }))
    .filter((link) => link.href);
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' ');
  const title = extractTitle(cleaned);
  cleaned = cleaned
    .replace(/<\/(h1|h2|h3|p|li|tr|table|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  return { title, text: normalizeSpaces(cleaned).slice(0, MAX_EXCERPT_CHARS), links };
}

function sanitizeJson(value: unknown, depth = 0): string {
  if (depth > 3) return '';
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeJson(item, depth + 1)).filter(Boolean).join('; ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 30)
      .map(([key, item]) => `${key}: ${sanitizeJson(item, depth + 1)}`)
      .filter((item) => item.length > 2)
      .join('; ');
  }
  return '';
}

async function readResponseText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength && contentLength > MAX_PAGE_BYTES) throw new Error('RESPONSE_TOO_LARGE');
  const text = await response.text();
  if (new TextEncoder().encode(text).length > MAX_PAGE_BYTES) throw new Error('RESPONSE_TOO_LARGE');
  return text;
}

async function fetchTrustedUrl(rawUrl: string, source: TrustedAssetSource, runtime: SourceRuntime, deadline: number): Promise<Response> {
  let current = rawUrl;
  const fetchImpl = runtime.fetch || fetch;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const validation = isTrustedUrlForSource(current, source);
    if (!validation.ok || !validation.url) throw new Error(validation.reason || 'URL_BLOCKED');
    await assertDnsSafe(validation.url, runtime);

    const remaining = Math.max(1000, Math.min(PAGE_TIMEOUT_MS, deadline - Date.now()));
    if (Date.now() >= deadline) throw new Error('TIMEOUT');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetchImpl(validation.url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9',
          'user-agent': USER_AGENT,
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
        current = resolveUrl(validation.url.toString(), location);
        continue;
      }

      const finalUrl = response.url || validation.url.toString();
      const finalValidation = isTrustedUrlForSource(finalUrl, source);
      if (!finalValidation.ok) throw new Error('REDIRECT_NOT_ALLOWED');
      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error('TIMEOUT');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('TOO_MANY_REDIRECTS');
}

function contentTypeKind(response: Response): 'html' | 'json' | 'text' | 'pdf' | 'unsupported' {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/pdf')) return 'pdf';
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) return 'html';
  if (contentType.includes('application/json')) return 'json';
  if (contentType.includes('text/plain')) return 'text';
  return 'unsupported';
}

function isRelevantEvidence(text: string, assetContext: Record<string, unknown>, source: TrustedAssetSource): boolean {
  if (text.length < 80) return false;
  const haystack = normalizeText(text);
  const nameTokens = normalizeText(assetContext.name).split(/[^a-z0-9]+/).filter((token) => token.length >= 4);
  if (nameTokens.some((token) => haystack.includes(token))) return true;
  return [...GENERIC_RELEVANCE_TERMS, source.description]
    .some((term) => haystack.includes(normalizeText(term)));
}

async function extractEvidenceFromPage(
  url: string,
  source: TrustedAssetSource,
  assetContext: Record<string, unknown>,
  runtime: SourceRuntime,
  deadline: number,
): Promise<{ evidence?: SourceEvidence; links: PageLink[]; reason?: string }> {
  const response = await fetchTrustedUrl(url, source, runtime, deadline);
  if (!response.ok) return { links: [], reason: `HTTP_${response.status}` };

  const kind = contentTypeKind(response);
  if (kind === 'pdf') return { links: [], reason: 'PDF_UNSUPPORTED' };
  if (kind === 'unsupported') return { links: [], reason: 'CONTENT_TYPE_UNSUPPORTED' };

  const body = await readResponseText(response);
  const finalUrl = response.url || url;
  let title = '';
  let text = '';
  let links: PageLink[] = [];

  if (kind === 'json') {
    text = normalizeSpaces(sanitizeJson(JSON.parse(body))).slice(0, MAX_EXCERPT_CHARS);
    title = source.name;
  } else if (kind === 'html') {
    const extracted = sanitizeHtml(body);
    title = extracted.title || source.name;
    text = extracted.text;
    links = extracted.links
      .map((link) => {
        const resolved = resolveUrl(finalUrl, link.href);
        if (!resolved || !isTrustedUrlForSource(resolved, source).ok) return null;
        return {
          url: resolved,
          text: link.text,
          score: scoreCandidateLink(resolved, link.text, title, assetContext, source),
        };
      })
      .filter((link): link is PageLink => !!link && link.score > 0)
      .sort((a, b) => b.score - a.score);
  } else {
    text = normalizeSpaces(body).slice(0, MAX_EXCERPT_CHARS);
    title = source.name;
  }

  if (!isRelevantEvidence(text, assetContext, source)) return { links, reason: 'NO_RELEVANT_CONTENT' };

  const retrievedAt = (runtime.now || (() => new Date()))().toISOString();
  const excerpt = text.slice(0, MAX_EXCERPT_CHARS);
  return {
    links,
    evidence: {
      id: `${source.id}:${finalUrl}`,
      source_id: source.id,
      source_name: source.name,
      source_type: source.type,
      url: finalUrl,
      title: title.slice(0, 180),
      excerpt,
      retrieved_at: retrievedAt,
      used: true,
      summary: excerpt.slice(0, 500),
    },
  };
}

export async function collectTrustedSourceEvidence(
  assetContext: Record<string, unknown>,
  runtime: SourceRuntime = {},
): Promise<SourceCollectionResult> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  const sources = selectTrustedSources(assetContext, MAX_SOURCES);
  const evidence: SourceEvidence[] = [];
  const failed: SourceFailure[] = [];
  const visited = new Set<string>();

  for (const source of sources) {
    const queue = buildSourceQueue(source, assetContext).map((link) => ({ ...link, depth: 0 }));
    let pages = 0;
    let sourceEvidence = 0;
    let lastReason = 'NO_RELEVANT_CONTENT';

    while (queue.length > 0 && pages < MAX_PAGES_PER_SOURCE && Date.now() < deadline) {
      const next = queue.shift();
      if (!next || next.depth > MAX_DEPTH || visited.has(`${source.id}:${next.url}`)) continue;
      visited.add(`${source.id}:${next.url}`);
      pages += 1;

      try {
        const result = await extractEvidenceFromPage(next.url, source, assetContext, runtime, deadline);
        if (result.evidence) {
          evidence.push(result.evidence);
          sourceEvidence += 1;
        }
        for (const link of result.links.slice(0, 8)) {
          if (pages + queue.length >= MAX_PAGES_PER_SOURCE) break;
          queue.push({ ...link, depth: next.depth + 1 });
        }
        queue.sort((a, b) => b.score - a.score);
        if (result.reason) lastReason = result.reason;
      } catch (error) {
        lastReason = (error as Error).message || 'FETCH_FAILED';
      }
    }

    if (sourceEvidence === 0) failed.push({ id: source.id, reason_code: lastReason });
  }

  return { evidence, consulted: evidence, failed };
}
