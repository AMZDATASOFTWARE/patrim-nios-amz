export type TrustedSourceType =
  | 'accounting'
  | 'fiscal'
  | 'fiscal_legal'
  | 'fiscal_secondary'
  | 'market'
  | 'classification'
  | 'technical'
  | 'technical_regulatory'
  | 'technical_cost'
  | 'public_asset_management'
  | 'financing';

export type SuggestionParameterName =
  | 'depreciation_rate'
  | 'useful_life_years'
  | 'residual_value'
  | 'fiscal_depreciation_rate'
  | 'fiscal_useful_life_years'
  | 'fiscal_residual_value';

export type SuggestionRequestGroup =
  | 'accounting_depreciation'
  | 'accounting_residual'
  | 'fiscal_depreciation'
  | 'fiscal_residual';

export type TrustedAssetClassification = {
  type?: string;
  subtype?: string | null;
  confidence?: string;
  score?: number;
  based_on?: string[];
  normalized_keywords?: string[];
  ambiguities?: string[];
  suggested_search_terms?: string[];
  probable_fiscal_classification?: unknown;
};

type Priority = 'alta' | 'media_alta' | 'media' | 'baixa';

export type TrustedAssetSource = {
  id: string;
  name: string;
  displayName?: string;
  type: TrustedSourceType;
  role?: TrustedSourceType;
  official: boolean;
  secondary: boolean;
  hosts: string[];
  allowedHosts?: string[];
  pathPrefixes?: string[];
  hostPathPrefixes?: Record<string, string[]>;
  categories: string[];
  description: string;
  priority: Priority;
  entryUrls: string[];
  active: true;
  enabled?: true;
  supportedParameters: SuggestionParameterName[];
  supportedRequestGroups: SuggestionRequestGroup[];
  supportedAssetTypes: string[];
  supportedSubtypes?: string[];
  forbiddenParameters?: SuggestionParameterName[];
  searchStrategy?: 'entry_urls' | 'specific_documents' | 'catalog';
  recommendedTerms?: string[];
  contentTypes?: Array<'html' | 'json' | 'text' | 'pdf'>;
  fallbackSourceIds?: string[];
  specificCitationLabel?: string;
  limitations: string[];
};

export type SourceEvidence = {
  evidence_id: string;
  id: string;
  source_id: string;
  source_name: string;
  source_role: TrustedSourceType;
  source_type: TrustedSourceType;
  source_official: boolean;
  source_secondary: boolean;
  url: string;
  title: string;
  document_identifier?: string;
  excerpt: string;
  fetched_at: string;
  retrieved_at: string;
  relevance_score: number;
  matched_terms: string[];
  depth: number;
  content_type: 'html' | 'json' | 'text';
  used?: false;
  summary: string;
  adapter_id?: string;
  authority?: string;
  document_kind?: string;
  document_title?: string;
  document_date?: string;
  section_label?: string;
  citation_label?: string;
  is_official_document?: boolean;
  is_secondary_reproduction?: boolean;
  tables?: AdapterTable[];
  structured_references?: StructuredSourceReference[];
};

export type SourceConsultation = {
  source_id: string;
  source_name: string;
  source_role: TrustedSourceType;
  url: string;
  fetched_at: string;
  depth: number;
  content_type: 'html' | 'json' | 'text';
  relevant: boolean;
  evidence_id?: string;
  reason_code?: string;
  adapter_id?: string;
  document_identifier?: string;
  citation_label?: string;
};

export type SourceFailure = {
  id: string;
  url?: string;
  reason_code: string;
};

export type SourceFallback = {
  from_source_id: string;
  to_source_id: string;
  reason_code: string;
  status: 'used' | 'blocked' | 'failed';
};

export type SourceCollectionResult = {
  selected: string[];
  searched_source_ids: string[];
  searched: string[];
  consulted: SourceConsultation[];
  consulted_pages: SourceConsultation[];
  evidence_sources: string[];
  evidence: SourceEvidence[];
  failed: SourceFailure[];
  fallbacks: SourceFallback[];
  budget_exhausted: boolean;
};

export type SourceRuntime = {
  fetch?: typeof fetch;
  now?: () => Date;
  resolveDns?: (hostname: string) => Promise<string[]>;
  runWithDeadline?: (
    operation: () => Promise<unknown>,
    timeoutMs: number,
    reasonCode: string,
    onTimeout?: () => void,
  ) => Promise<unknown>;
};

type PageLink = {
  url: string;
  text: string;
  score: number;
  depth?: number;
  purpose?: string;
  documentHint?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
};

type TrustedFetchResult = {
  response: Response;
  controller: AbortController;
};

type AdapterRequest = {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  purpose: string;
  documentHint?: string;
};

type AdapterDocumentMetadata = {
  adapter_id: string;
  authority?: string;
  document_kind?: string;
  document_identifier?: string;
  document_title?: string;
  document_date?: string;
  section_label?: string;
  citation_label?: string;
  is_official_document?: boolean;
  is_secondary_reproduction?: boolean;
};

type AdapterTable = {
  headers: string[];
  rows: string[][];
  truncated: boolean;
  truncation_reasons?: string[];
};

type AdapterEvidenceCandidate = {
  text: string;
  section_label?: string;
  tables?: AdapterTable[];
  structured_references?: StructuredSourceReference[];
};

type StructuredSourceReference = {
  kind: 'market_reference' | 'technical_identity' | 'classification_reference' | 'cost_reference';
  asset_type?: 'vehicle' | 'agricultural_machine';
  value?: number;
  currency?: 'BRL';
  reference_period?: string;
  brand?: string;
  model?: string;
  model_year?: string;
  fuel_type?: string;
  raw_label?: string;
  standardized_name?: string;
  manufacturer?: string;
  registration_number?: string;
  certification_number?: string;
  catalog_code?: string;
  holder_name?: string;
  catalog_system?: string;
  code?: string;
  standardized_description?: string;
  group?: string;
  class?: string;
  system?: 'SINAPI';
  item_code?: string;
  description?: string;
  unit?: string;
  region?: string;
  matched_fields?: string[];
  compared_fields?: string[];
  divergent_fields?: string[];
  match_status?: 'exact' | 'partial' | 'unmatched';
};

type TrustedSourceAdapter = {
  id: string;
  sourceIds: string[];
  controlledTerms: string[];
  requiresDocumentIdentification?: boolean;
  usesHtmlTables?: boolean;
  buildStartRequests?: (source: TrustedAssetSource, assetContext: Record<string, unknown>, selection: Required<SourceSelectionRequest>) => PageLink[];
  scoreCandidateLink?: (input: { url: string; label: string; title: string; source: TrustedAssetSource; assetContext: Record<string, unknown> }) => number;
  identifyDocument?: (input: { url: string; title: string; text: string; source: TrustedAssetSource }) => AdapterDocumentMetadata | null;
  extractEvidenceCandidates?: (input: { text: string; title: string; html?: string; metadata: AdapterDocumentMetadata; source: TrustedAssetSource; assetContext: Record<string, unknown> }) => AdapterEvidenceCandidate[];
  shouldUseFallback?: (input: {
    source: TrustedAssetSource;
    reason: string;
    selection: Required<SourceSelectionRequest>;
    evidenceCount: number;
    budgetExhausted: boolean;
  }) => boolean;
};

const MAX_SOURCES = 3;
const MAX_QUERY_SETS_PER_SOURCE = 2;
const MAX_PAGES_PER_SOURCE = 3;
const MAX_DEPTH = 2;
const MAX_REDIRECTS = 3;
const MAX_LINK_CANDIDATES_PER_PAGE = 12;
const MAX_EVIDENCE_PER_SOURCE = 5;
const MAX_TOTAL_EVIDENCE_CHARS = 12000;
const PAGE_TIMEOUT_MS = 8000;
const TOTAL_TIMEOUT_MS = 18000;
const MAX_PAGE_BYTES = 240000;
const MAX_EXCERPT_CHARS = 2500;
const MAX_EVIDENCE_EXCERPT_CHARS = 1200;
const MIN_LINK_RELEVANCE_SCORE = 4;
const MIN_PAGE_RELEVANCE_SCORE = 4;
const ALLOWED_PORTS = new Set(['', '443']);
const GLOBAL_ALLOWED_CONTENT_TYPES = new Set(['html', 'json', 'text']);
const USER_AGENT = 'AMZ-Patrimonios-TrustedSourceReader/1.0';
const FALLBACK_ALLOWED_REASON_CODES = new Set([
  'ADAPTER_ACTION_UNAVAILABLE',
  'DOCUMENT_NOT_IDENTIFIED',
  'OFFICIAL_SOURCE_NO_EVIDENCE',
  'NO_RELEVANT_CONTENT',
  'PDF_UNSUPPORTED',
  'HTTP_ERROR',
  'TIMEOUT',
  'DNS_RESOLUTION_FAILED',
  'CONTENT_TYPE_UNSUPPORTED',
  'BINARY_FORMAT_UNSUPPORTED',
  'RESPONSE_TOO_LARGE',
  'PARSE_ERROR',
  'REDIRECT_BLOCKED',
  'REDIRECT_LIMIT_EXCEEDED',
  'REDIRECT_LOOP',
  'FETCH_FAILED',
]);
const FALLBACK_BLOCKED_REASON_CODES = new Set([
  'TOTAL_BUDGET_EXCEEDED',
  'PRIVATE_IP_BLOCKED',
  'HOST_NOT_ALLOWED',
  'PATH_NOT_ALLOWED',
  'PORT_NOT_ALLOWED',
  'URL_CREDENTIALS_BLOCKED',
  'HTTPS_REQUIRED',
  'FORM_POST_BLOCKED',
  'EXTERNAL_LINK_BLOCKED',
]);

function canUseSecondaryFallbackReason(reason: string): boolean {
  if (FALLBACK_BLOCKED_REASON_CODES.has(reason)) return false;
  return FALLBACK_ALLOWED_REASON_CODES.has(reason);
}

export const TRUSTED_ASSET_SOURCES: TrustedAssetSource[] = [
  {
    id: 'cpc',
    name: 'Comite de Pronunciamentos Contabeis',
    displayName: 'CPC - Pronunciamento Tecnico CPC 27',
    type: 'accounting',
    role: 'accounting',
    official: true,
    secondary: false,
    hosts: ['cpc.org.br'],
    allowedHosts: ['cpc.org.br'],
    categories: ['*'],
    description: 'Normas e pronunciamentos contabeis sobre ativo imobilizado, depreciacao, vida util e valor residual.',
    priority: 'alta',
    entryUrls: ['https://cpc.org.br/', 'https://cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    supportedRequestGroups: ['accounting_depreciation', 'accounting_residual'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator', 'furniture', 'property', 'construction', 'installation', 'generic_equipment', 'generic_asset'],
    forbiddenParameters: [],
    searchStrategy: 'specific_documents',
    recommendedTerms: ['CPC 27 ativo imobilizado', 'depreciacao vida util valor residual'],
    contentTypes: ['html', 'json', 'text'],
    specificCitationLabel: 'CPC - Pronunciamento Tecnico CPC 27',
    limitations: ['Referencia contabil geral; nao e tabela numerica automatica.'],
  },
  {
    id: 'cfc',
    name: 'Conselho Federal de Contabilidade',
    displayName: 'CFC - NBC TG 27',
    type: 'accounting',
    role: 'accounting',
    official: true,
    secondary: false,
    hosts: ['cfc.org.br'],
    allowedHosts: ['cfc.org.br'],
    categories: ['*'],
    description: 'Normas brasileiras de contabilidade sobre imobilizado, estimativas, depreciacao, vida util e valor residual.',
    priority: 'alta',
    entryUrls: ['https://cfc.org.br/', 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/normas-completas/'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    supportedRequestGroups: ['accounting_depreciation', 'accounting_residual'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator', 'furniture', 'property', 'construction', 'installation', 'generic_equipment', 'generic_asset'],
    forbiddenParameters: [],
    searchStrategy: 'specific_documents',
    recommendedTerms: ['NBC TG 27 ativo imobilizado', 'revisao de estimativas depreciacao'],
    contentTypes: ['html', 'json', 'text'],
    specificCitationLabel: 'CFC - NBC TG 27',
    limitations: ['Referencia contabil geral; exige julgamento profissional.'],
  },
  {
    id: 'cvm',
    name: 'Comissao de Valores Mobiliarios',
    displayName: 'CVM - Normas contabeis reguladas',
    type: 'accounting',
    role: 'accounting',
    official: true,
    secondary: true,
    hosts: ['conteudo.cvm.gov.br'],
    allowedHosts: ['conteudo.cvm.gov.br'],
    categories: ['Investimentos', 'Intangiveis'],
    description: 'Normas contabeis consolidadas e orientacoes reguladoras complementares.',
    priority: 'media',
    entryUrls: ['https://conteudo.cvm.gov.br/'],
    active: true,
    enabled: true,
    supportedParameters: [],
    supportedRequestGroups: [],
    supportedAssetTypes: ['investment_asset', 'intangible_asset'],
    forbiddenParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['normas contabeis CVM'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Aplicavel principalmente a contexto regulado; nao e fonte padrao de depreciacao.'],
  },
  {
    id: 'gov_cvm',
    name: 'Portal Gov.br - CVM',
    displayName: 'Gov.br - CVM',
    type: 'accounting',
    role: 'accounting',
    official: true,
    secondary: true,
    hosts: ['www.gov.br'],
    allowedHosts: ['www.gov.br'],
    pathPrefixes: ['/cvm'],
    categories: ['Investimentos', 'Intangiveis'],
    description: 'Regulamentacao contabil publicada pela CVM no Gov.br.',
    priority: 'media',
    entryUrls: ['https://www.gov.br/cvm/'],
    active: true,
    enabled: true,
    supportedParameters: [],
    supportedRequestGroups: [],
    supportedAssetTypes: ['investment_asset', 'intangible_asset'],
    forbiddenParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['CVM regulacao contabil'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Somente caminhos dentro de /cvm sao permitidos; nao e fonte padrao de depreciacao.'],
  },
  {
    id: 'receita_normas',
    name: 'Receita Federal - Normas',
    displayName: 'Receita Federal - Sistema de Normas Sijut2',
    type: 'fiscal',
    role: 'fiscal',
    official: true,
    secondary: false,
    hosts: ['normas.receita.fazenda.gov.br'],
    allowedHosts: ['normas.receita.fazenda.gov.br'],
    categories: ['*'],
    description: 'Referencias fiscais oficiais sobre IRPJ, CSLL, dedutibilidade, depreciacao fiscal e atos normativos.',
    priority: 'alta',
    entryUrls: ['https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action'],
    active: true,
    enabled: true,
    supportedParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    supportedRequestGroups: ['fiscal_depreciation', 'fiscal_residual'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator', 'furniture', 'property', 'construction', 'installation', 'generic_equipment', 'generic_asset'],
    forbiddenParameters: [],
    searchStrategy: 'specific_documents',
    recommendedTerms: ['IN RFB 1700 Anexo III depreciacao', 'IRPJ depreciacao fiscal'],
    contentTypes: ['html', 'json', 'text'],
    fallbackSourceIds: ['normas_legais_in_rfb_1700_anexo_iii'],
    specificCitationLabel: 'Receita Federal - Sistema de Normas Sijut2',
    limitations: ['Referencia fiscal; nao substitui estimativa gerencial.'],
  },
  {
    id: 'gov_receita',
    name: 'Portal Gov.br - Receita Federal',
    displayName: 'Gov.br - Receita Federal',
    type: 'fiscal',
    role: 'fiscal',
    official: true,
    secondary: true,
    hosts: ['www.gov.br'],
    allowedHosts: ['www.gov.br'],
    pathPrefixes: ['/receitafederal'],
    categories: ['*'],
    description: 'Conteudos fiscais da Receita Federal no Gov.br.',
    priority: 'media',
    entryUrls: ['https://www.gov.br/receitafederal/'],
    active: true,
    enabled: true,
    supportedParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    supportedRequestGroups: ['fiscal_depreciation', 'fiscal_residual'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator', 'furniture', 'property', 'construction', 'installation', 'generic_equipment', 'generic_asset'],
    forbiddenParameters: [],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['Receita Federal depreciacao fiscal'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Prioridade inferior ao Sijut2 para atos normativos especificos.'],
  },
  {
    id: 'normas_legais_in_rfb_1700_anexo_iii',
    name: 'Normas Legais - Anexo III IN RFB 1700/2017',
    displayName: 'Normas Legais - reproducao secundaria do Anexo III da IN RFB 1700/2017',
    type: 'fiscal_secondary',
    role: 'fiscal_secondary',
    official: false,
    secondary: true,
    hosts: ['www.normaslegais.com.br'],
    allowedHosts: ['www.normaslegais.com.br'],
    categories: ['*'],
    description: 'Reproducao secundaria do Anexo III da IN RFB 1700/2017.',
    priority: 'baixa',
    entryUrls: ['https://www.normaslegais.com.br/legislacao/anexoIII-in-rfb-1700-2017.htm'],
    active: true,
    enabled: true,
    supportedParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    supportedRequestGroups: ['fiscal_depreciation'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator', 'furniture', 'property', 'construction', 'installation', 'generic_equipment'],
    forbiddenParameters: ['fiscal_residual_value'],
    searchStrategy: 'specific_documents',
    recommendedTerms: ['Anexo III IN RFB 1700 2017'],
    contentTypes: ['html', 'text'],
    fallbackSourceIds: ['receita_normas'],
    limitations: ['Fonte secundaria; nunca prevalece sobre a Receita Federal.'],
  },
  {
    id: 'camara_decreto_9580_2018',
    name: 'Camara - Decreto 9580/2018',
    displayName: 'Decreto 9580/2018 - Regulamento do Imposto de Renda',
    type: 'fiscal_legal',
    role: 'fiscal_legal',
    official: true,
    secondary: false,
    hosts: ['www2.camara.leg.br'],
    allowedHosts: ['www2.camara.leg.br'],
    categories: ['*'],
    description: 'Regulamento do Imposto de Renda para regras gerais e dedutibilidade.',
    priority: 'media_alta',
    entryUrls: ['https://www2.camara.leg.br/legin/fed/decret/2018/decreto-9580-22-novembro-2018-787360-norma-pe.html'],
    active: true,
    enabled: true,
    supportedParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    supportedRequestGroups: ['fiscal_depreciation', 'fiscal_residual'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator', 'furniture', 'property', 'construction', 'installation', 'generic_equipment', 'generic_asset'],
    forbiddenParameters: [],
    searchStrategy: 'specific_documents',
    recommendedTerms: ['RIR 2018 depreciacao dedutibilidade'],
    contentTypes: ['html', 'text'],
    specificCitationLabel: 'Decreto 9580/2018 - Regulamento do Imposto de Renda',
    limitations: ['Fonte juridica complementar; nao identifica sozinha a taxa fiscal especifica.'],
  },
  {
    id: 'planalto_lei_14871_2024',
    name: 'Planalto - Lei 14871/2024',
    displayName: 'Lei 14871/2024 - Depreciacao acelerada',
    type: 'fiscal_legal',
    role: 'fiscal_legal',
    official: true,
    secondary: false,
    hosts: ['www.planalto.gov.br'],
    allowedHosts: ['www.planalto.gov.br'],
    categories: ['Equipamentos'],
    description: 'Lei sobre depreciacao acelerada para maquinas, equipamentos, aparelhos e instrumentos novos.',
    priority: 'media_alta',
    entryUrls: ['https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14871.htm'],
    active: true,
    enabled: true,
    supportedParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    supportedRequestGroups: ['fiscal_depreciation'],
    supportedAssetTypes: ['industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator'],
    forbiddenParameters: ['fiscal_residual_value'],
    searchStrategy: 'specific_documents',
    recommendedTerms: ['Lei 14871 2024 depreciacao acelerada'],
    contentTypes: ['html', 'text'],
    specificCitationLabel: 'Lei 14871/2024 - Depreciacao acelerada',
    limitations: ['A selecao nao confirma elegibilidade; exige validacao fiscal oficial.'],
  },
  {
    id: 'fipe',
    name: 'FIPE Veiculos',
    displayName: 'FIPE - referencia de mercado para veiculos',
    type: 'market',
    role: 'market',
    official: true,
    secondary: false,
    hosts: ['fipe.org.br', 'veiculos.fipe.org.br'],
    allowedHosts: ['fipe.org.br', 'veiculos.fipe.org.br'],
    categories: ['Veiculos'],
    description: 'Referencia de mercado de veiculos.',
    priority: 'alta',
    entryUrls: ['https://veiculos.fipe.org.br/'],
    active: true,
    enabled: true,
    supportedParameters: ['residual_value'],
    supportedRequestGroups: ['accounting_residual'],
    supportedAssetTypes: ['vehicle'],
    forbiddenParameters: ['depreciation_rate', 'useful_life_years', 'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['referencia mercado veiculo'],
    contentTypes: ['html', 'json', 'text'],
    specificCitationLabel: 'FIPE - referencia de mercado para veiculos',
    limitations: ['Referencia de mercado; nao altera valor contabil automaticamente.'],
  },
  {
    id: 'fipe_maquinas',
    name: 'FIPE Maquinas',
    displayName: 'FIPE - referencia de mercado para maquinas agricolas',
    type: 'market',
    role: 'market',
    official: true,
    secondary: false,
    hosts: ['tpt.fipe.org.br'],
    allowedHosts: ['tpt.fipe.org.br'],
    categories: ['Equipamentos'],
    description: 'Referencia de mercado de maquinas agricolas.',
    priority: 'alta',
    entryUrls: ['https://tpt.fipe.org.br/TabelaMA.aspx'],
    active: true,
    enabled: true,
    supportedParameters: ['residual_value'],
    supportedRequestGroups: ['accounting_residual'],
    supportedAssetTypes: ['agricultural_machine'],
    forbiddenParameters: ['depreciation_rate', 'useful_life_years', 'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['referencia mercado maquina agricola'],
    contentTypes: ['html', 'json', 'text'],
    specificCitationLabel: 'FIPE - referencia de mercado para maquinas agricolas',
    limitations: ['Usar somente quando o ativo for identificado como maquina agricola.'],
  },
  {
    id: 'caixa_sinapi',
    name: 'CAIXA / SINAPI',
    displayName: 'CAIXA / SINAPI',
    type: 'technical_cost',
    role: 'technical_cost',
    official: true,
    secondary: false,
    hosts: ['caixa.gov.br', 'www.caixa.gov.br'],
    allowedHosts: ['caixa.gov.br', 'www.caixa.gov.br'],
    categories: ['Imoveis'],
    description: 'Custos de construcao, imoveis, instalacoes e obras.',
    priority: 'media_alta',
    entryUrls: ['https://www.caixa.gov.br/'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    supportedRequestGroups: ['accounting_depreciation', 'accounting_residual'],
    supportedAssetTypes: ['property', 'construction', 'installation'],
    supportedSubtypes: ['building', 'commercial_unit', 'construction_in_progress', 'improvement', 'electrical_installation', 'hydraulic_installation', 'hvac', 'structured_network'],
    forbiddenParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['SINAPI custo construcao'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Referencia de custo de construcao, nao valor contabil automatico.'],
  },
  {
    id: 'ibge_sinapi',
    name: 'IBGE / SINAPI',
    displayName: 'IBGE / SINAPI',
    type: 'technical_cost',
    role: 'technical_cost',
    official: true,
    secondary: true,
    hosts: ['ibge.gov.br', 'www.ibge.gov.br'],
    allowedHosts: ['ibge.gov.br', 'www.ibge.gov.br'],
    categories: ['Imoveis'],
    description: 'Indices e custos da construcao.',
    priority: 'media',
    entryUrls: ['https://www.ibge.gov.br/'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    supportedRequestGroups: ['accounting_depreciation', 'accounting_residual'],
    supportedAssetTypes: ['property', 'construction', 'installation'],
    supportedSubtypes: ['building', 'commercial_unit', 'construction_in_progress', 'improvement', 'electrical_installation', 'hydraulic_installation', 'hvac', 'structured_network'],
    forbiddenParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['SINAPI IBGE custos construcao'],
    contentTypes: ['html', 'json', 'text'],
    fallbackSourceIds: ['caixa_sinapi'],
    limitations: ['Referencia complementar para construcao.'],
  },
  {
    id: 'gov_patrimonio_uniao',
    name: 'Portal Gov.br - Patrimonio da Uniao',
    displayName: 'Gov.br - Patrimonio da Uniao',
    type: 'public_asset_management',
    role: 'public_asset_management',
    official: true,
    secondary: true,
    hosts: ['www.gov.br'],
    allowedHosts: ['www.gov.br'],
    pathPrefixes: ['/gestao'],
    categories: ['Imoveis'],
    description: 'Referencias complementares de imoveis e gestao patrimonial.',
    priority: 'baixa',
    entryUrls: ['https://www.gov.br/gestao/'],
    active: true,
    enabled: true,
    supportedParameters: [],
    supportedRequestGroups: [],
    supportedAssetTypes: ['property'],
    forbiddenParameters: ['depreciation_rate', 'useful_life_years', 'residual_value', 'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['gestao patrimonio uniao imovel'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Referencia complementar; nao e fonte padrao de sugestao automatica.'],
  },
  {
    id: 'anvisa',
    name: 'Anvisa',
    displayName: 'ANVISA - consultas e registros',
    type: 'technical_regulatory',
    role: 'technical_regulatory',
    official: true,
    secondary: false,
    hosts: ['consultas.anvisa.gov.br', 'www.gov.br'],
    allowedHosts: ['consultas.anvisa.gov.br', 'www.gov.br'],
    hostPathPrefixes: {
      'www.gov.br': ['/anvisa'],
    },
    categories: ['Equipamentos'],
    description: 'Identificacao de equipamentos medicos e hospitalares, fabricante, modelo e registro.',
    priority: 'media_alta',
    entryUrls: ['https://consultas.anvisa.gov.br/', 'https://www.gov.br/anvisa/'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'residual_value', 'fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    supportedRequestGroups: ['accounting_depreciation', 'accounting_residual', 'fiscal_depreciation'],
    supportedAssetTypes: ['medical_equipment'],
    forbiddenParameters: ['fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['equipamento medico registro anvisa'],
    contentTypes: ['html', 'json', 'text'],
    specificCitationLabel: 'ANVISA - identificacao tecnica de equipamento medico',
    limitations: ['Apoia classificacao e identificacao; nao fornece diretamente taxa fiscal ou vida util fiscal.'],
  },
  {
    id: 'inmetro',
    name: 'Inmetro',
    displayName: 'INMETRO',
    type: 'technical',
    role: 'technical',
    official: true,
    secondary: false,
    hosts: ['inmetro.gov.br', 'www.inmetro.gov.br', 'registro.inmetro.gov.br', 'www.gov.br'],
    allowedHosts: ['inmetro.gov.br', 'www.inmetro.gov.br', 'registro.inmetro.gov.br', 'www.gov.br'],
    hostPathPrefixes: {
      'www.gov.br': ['/inmetro'],
    },
    categories: ['Equipamentos', 'Veiculos'],
    description: 'Identificacao tecnica e certificacao de equipamentos.',
    priority: 'media_alta',
    entryUrls: ['https://www.inmetro.gov.br/', 'https://registro.inmetro.gov.br/', 'https://www.gov.br/inmetro/'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'residual_value'],
    supportedRequestGroups: ['accounting_depreciation', 'accounting_residual'],
    supportedAssetTypes: ['vehicle', 'industrial_machine', 'computer_equipment', 'heavy_equipment', 'generator', 'generic_equipment'],
    forbiddenParameters: ['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'entry_urls',
    recommendedTerms: ['certificacao equipamento inmetro'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Referencia tecnica, nao tabela contabil ou fiscal.'],
  },
  {
    id: 'compras_catalogo',
    name: 'Catalogo Compras.gov.br CATMAT/CATSER',
    displayName: 'CATMAT/CATSER - Catalogo Compras.gov.br',
    type: 'classification',
    role: 'classification',
    official: true,
    secondary: false,
    hosts: ['catalogo.compras.gov.br'],
    allowedHosts: ['catalogo.compras.gov.br'],
    categories: ['*'],
    description: 'Catalogo oficial de materiais e servicos para nomenclatura e classificacao tecnica.',
    priority: 'media',
    entryUrls: ['https://catalogo.compras.gov.br/'],
    active: true,
    enabled: true,
    supportedParameters: ['depreciation_rate', 'useful_life_years', 'fiscal_depreciation_rate', 'fiscal_useful_life_years'],
    supportedRequestGroups: ['accounting_depreciation', 'fiscal_depreciation'],
    supportedAssetTypes: ['computer_equipment', 'industrial_machine', 'agricultural_machine', 'heavy_equipment', 'generator', 'generic_equipment'],
    forbiddenParameters: ['residual_value', 'fiscal_residual_value'],
    searchStrategy: 'catalog',
    recommendedTerms: ['CATMAT CATSER classificacao bem'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Fonte complementar de classificacao; nao e fonte numerica principal.'],
  },
  {
    id: 'bndes',
    name: 'BNDES',
    displayName: 'BNDES - catalogo de maquinas e equipamentos',
    type: 'financing',
    role: 'financing',
    official: true,
    secondary: true,
    hosts: ['bndes.gov.br', 'www.bndes.gov.br', 'ws.bndes.gov.br'],
    allowedHosts: ['bndes.gov.br', 'www.bndes.gov.br', 'ws.bndes.gov.br'],
    categories: ['Equipamentos'],
    description: 'Catalogo de maquinas e equipamentos para financiamento e cadastro.',
    priority: 'baixa',
    entryUrls: ['https://www.bndes.gov.br/', 'https://ws.bndes.gov.br/'],
    active: true,
    enabled: true,
    supportedParameters: [],
    supportedRequestGroups: [],
    supportedAssetTypes: ['industrial_machine', 'agricultural_machine', 'heavy_equipment', 'generator', 'generic_equipment'],
    forbiddenParameters: ['depreciation_rate', 'useful_life_years', 'residual_value', 'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value'],
    searchStrategy: 'catalog',
    recommendedTerms: ['catalogo maquinas equipamentos BNDES'],
    contentTypes: ['html', 'json', 'text'],
    limitations: ['Referencia cadastral e de financiamento; nao e fonte de taxa de depreciacao.'],
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

export type SourceSelectionRequest = {
  context: Record<string, unknown>;
  requestedParameters?: SuggestionParameterName[];
  requestGroup?: SuggestionRequestGroup;
  classification?: TrustedAssetClassification;
  maxSources?: number;
};

export type SourceApplicabilityDecision = {
  applicable: boolean;
  reason?: string;
};

const CANONICAL_SOURCE_ROLES: TrustedSourceType[] = [
  'accounting',
  'fiscal',
  'fiscal_legal',
  'fiscal_secondary',
  'market',
  'classification',
  'technical',
  'technical_regulatory',
  'technical_cost',
  'public_asset_management',
  'financing',
];

const SOURCE_ROLE_ALIASES: Record<string, TrustedSourceType> = {
  contabil: 'accounting',
  legal: 'fiscal_legal',
  mercado: 'market',
  tecnica: 'technical',
  construcao: 'technical_cost',
};

const REQUEST_GROUP_PARAMETERS: Record<SuggestionRequestGroup, SuggestionParameterName[]> = {
  accounting_depreciation: ['depreciation_rate', 'useful_life_years'],
  accounting_residual: ['residual_value'],
  fiscal_depreciation: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
  fiscal_residual: ['fiscal_residual_value'],
};

const REQUEST_GROUP_ALLOWED_ROLES: Record<SuggestionRequestGroup, TrustedSourceType[]> = {
  accounting_depreciation: ['accounting', 'technical', 'technical_regulatory', 'technical_cost', 'classification'],
  accounting_residual: ['accounting', 'market', 'technical', 'technical_regulatory', 'technical_cost'],
  fiscal_depreciation: ['fiscal', 'fiscal_legal', 'fiscal_secondary', 'classification', 'technical_regulatory'],
  fiscal_residual: ['fiscal', 'fiscal_legal'],
};

const REQUEST_GROUP_FORBIDDEN_ROLES: Record<SuggestionRequestGroup, TrustedSourceType[]> = {
  accounting_depreciation: ['market', 'fiscal', 'fiscal_legal', 'fiscal_secondary'],
  accounting_residual: ['fiscal', 'fiscal_legal', 'fiscal_secondary'],
  fiscal_depreciation: ['market', 'accounting', 'technical_cost', 'financing'],
  fiscal_residual: ['market', 'accounting', 'technical', 'technical_regulatory', 'technical_cost', 'classification', 'financing'],
};

const PRIORITY_SCORE: Record<Priority, number> = {
  alta: 40,
  media_alta: 30,
  media: 20,
  baixa: 5,
};

function normalizeSourceRole(value: unknown): TrustedSourceType | null {
  const role = normalizeText(value).replace(/[^a-z_]/g, '');
  if ((CANONICAL_SOURCE_ROLES as string[]).includes(role)) return role as TrustedSourceType;
  return SOURCE_ROLE_ALIASES[role] || null;
}

function clampSourceLimit(value?: number): number {
  const parsed = Number.isFinite(value) ? Math.trunc(Number(value)) : MAX_SOURCES;
  return Math.max(1, Math.min(MAX_SOURCES, parsed || MAX_SOURCES));
}

function categoryMatches(category: string, expected: 'veiculos' | 'equipamentos' | 'imoveis' | 'investimentos' | 'intangiveis'): boolean {
  if (category === expected) return true;
  if (expected === 'veiculos') return category.includes('ve') && category.includes('culos');
  if (expected === 'imoveis') return category.includes('im') && category.includes('veis');
  if (expected === 'intangiveis') return category.includes('intang') && category.includes('veis');
  return false;
}

function requestGroupForParameters(params: SuggestionParameterName[]): SuggestionRequestGroup {
  if (params.some((param) => param.startsWith('fiscal_'))) {
    return params.includes('fiscal_residual_value') ? 'fiscal_residual' : 'fiscal_depreciation';
  }
  return params.includes('residual_value') ? 'accounting_residual' : 'accounting_depreciation';
}

function inferLegacyParameters(): SuggestionParameterName[] {
  // Deprecated compatibility path: new callers must pass context, requestedParameters,
  // requestGroup and classification explicitly instead of inferring domain from text.
  return ['depreciation_rate', 'useful_life_years'];
}

function classificationFromLegacyContext(context: Record<string, unknown>): TrustedAssetClassification {
  const category = normalizeCategory(context.category);
  const text = normalizeText([
    context.name,
    context.category,
    context.account,
    context.vehicle_fuel_type,
    context.property_registration_type,
  ].filter(Boolean).join(' '));
  if (categoryMatches(category, 'veiculos')) return { type: 'vehicle', subtype: null };
  if (categoryMatches(category, 'imoveis')) {
    if (text.includes('terreno')) return { type: 'property', subtype: 'land' };
    if (text.includes('sala comercial')) return { type: 'property', subtype: 'commercial_unit' };
    return { type: 'property', subtype: text.includes('obra') ? 'construction_in_progress' : 'building' };
  }
  if (categoryMatches(category, 'intangiveis')) return { type: 'intangible_asset', subtype: null };
  if (categoryMatches(category, 'investimentos')) return { type: 'investment_asset', subtype: null };
  if (text.includes('trator') || text.includes('agricol')) return { type: 'agricultural_machine', subtype: 'tractor' };
  if (text.includes('hospitalar') || text.includes('ultrassom') || text.includes('medic')) return { type: 'medical_equipment', subtype: null };
  if (text.includes('notebook') || text.includes('servidor') || text.includes('impressora') || text.includes('informatica')) return { type: 'computer_equipment', subtype: null };
  if (text.includes('gerador')) return { type: 'generator', subtype: null };
  if (categoryMatches(category, 'equipamentos')) return { type: 'generic_equipment', subtype: null };
  return { type: 'generic_asset', subtype: null };
}

function normalizeSelectionInput(input: SourceSelectionRequest | Record<string, unknown>, legacyMaxSources?: number): Required<SourceSelectionRequest> {
  if ('context' in input && typeof input.context === 'object') {
    const context = input.context || {};
    const requestedParameters = input.requestedParameters?.length
      ? input.requestedParameters
      : inferLegacyParameters();
    return {
      context: context as Record<string, unknown>,
      requestedParameters,
      requestGroup: input.requestGroup || requestGroupForParameters(requestedParameters),
      classification: input.classification || classificationFromLegacyContext(context as Record<string, unknown>),
      maxSources: clampSourceLimit(input.maxSources || legacyMaxSources || MAX_SOURCES),
    };
  }

  const context = input;
  const requestedParameters = inferLegacyParameters();
  return {
    context,
    requestedParameters,
    requestGroup: requestGroupForParameters(requestedParameters),
    classification: classificationFromLegacyContext(context),
    maxSources: clampSourceLimit(legacyMaxSources || MAX_SOURCES),
  };
}

function sourceSupportsClassification(source: TrustedAssetSource, classification: TrustedAssetClassification): boolean {
  const type = classification.type || 'generic_asset';
  const subtype = classification.subtype || '';
  if (source.supportedAssetTypes.length > 0 && !source.supportedAssetTypes.includes('*') && !source.supportedAssetTypes.includes(type)) {
    return false;
  }
  if (source.supportedSubtypes?.length && subtype && !source.supportedSubtypes.includes(subtype)) return false;
  return true;
}

function sourceIsApplicableToRequest(
  source: TrustedAssetSource,
  requestedParameters: SuggestionParameterName[],
  requestGroup: SuggestionRequestGroup,
  classification: TrustedAssetClassification,
  context: Record<string, unknown> = {},
): SourceApplicabilityDecision {
  if (!source.active || source.enabled === false) return { applicable: false, reason: 'source_disabled' };

  const type = classification.type || 'generic_asset';
  const subtype = classification.subtype || null;
  if ((type === 'intangible_asset' || type === 'investment_asset')
    && ['accounting_depreciation', 'accounting_residual'].includes(requestGroup)) {
    return { applicable: false, reason: `${type}_not_depreciable_by_default` };
  }
  if (type === 'property' && subtype === 'land' && requestGroup === 'accounting_depreciation') {
    return { applicable: false, reason: 'land_is_not_automatically_depreciable' };
  }

  const role = normalizeSourceRole(source.role || source.type);
  if (!role) return { applicable: false, reason: 'invalid_role' };
  if (REQUEST_GROUP_FORBIDDEN_ROLES[requestGroup].includes(role)) return { applicable: false, reason: 'role_forbidden_for_group' };
  if (!REQUEST_GROUP_ALLOWED_ROLES[requestGroup].includes(role)) return { applicable: false, reason: 'role_not_allowed_for_group' };
  if (!source.supportedRequestGroups.includes(requestGroup)) return { applicable: false, reason: 'group_not_supported' };
  if (requestedParameters.some((param) => source.forbiddenParameters?.includes(param))) {
    return { applicable: false, reason: 'parameter_forbidden' };
  }
  if (requestedParameters.some((param) => !source.supportedParameters.includes(param))) {
    return { applicable: false, reason: 'parameter_not_supported' };
  }
  if (!sourceSupportsClassification(source, classification)) {
    return { applicable: false, reason: 'classification_not_supported' };
  }
  if (source.id === 'planalto_lei_14871_2024') {
    const isNew = sourceContextSuggestsNewAsset(classification, requestedParameters, context);
    if (!isNew) return { applicable: false, reason: 'accelerated_depreciation_requires_new_asset_signal' };
  }
  return { applicable: true };
}

export function isSourceCompatibleWithRequest(
  source: TrustedAssetSource,
  requestedParameters: SuggestionParameterName[],
  requestGroup: SuggestionRequestGroup,
  classification: TrustedAssetClassification,
  context: Record<string, unknown> = {},
): boolean {
  return sourceIsApplicableToRequest(source, requestedParameters, requestGroup, classification, context).applicable;
}

export function sourceApplicabilityForRequest(
  source: TrustedAssetSource,
  requestedParameters: SuggestionParameterName[],
  requestGroup: SuggestionRequestGroup,
  classification: TrustedAssetClassification,
  context: Record<string, unknown> = {},
): SourceApplicabilityDecision {
  return sourceIsApplicableToRequest(source, requestedParameters, requestGroup, classification, context);
}

function sourceContextSuggestsNewAsset(
  classification: TrustedAssetClassification,
  requestedParameters: SuggestionParameterName[],
  context: Record<string, unknown>,
): boolean {
  if (!requestedParameters.some((param) => param === 'fiscal_depreciation_rate' || param === 'fiscal_useful_life_years')) return false;
  const type = classification.type || '';
  if (!['industrial_machine', 'agricultural_machine', 'medical_equipment', 'computer_equipment', 'heavy_equipment', 'generator'].includes(type)) return false;
  return normalizeText(String(context.conservation_state || '')) === 'novo';
}

function scoreSourceForRequest(
  source: TrustedAssetSource,
  requestedParameters: SuggestionParameterName[],
  requestGroup: SuggestionRequestGroup,
  classification: TrustedAssetClassification,
): number {
  const role = normalizeSourceRole(source.role || source.type);
  let score = PRIORITY_SCORE[source.priority] || 0;
  if (source.official) score += 8;
  if (source.secondary) score -= 8;
  if (source.supportedParameters.every((param) => requestedParameters.includes(param))) score += 2;
  if (source.supportedAssetTypes.includes(classification.type || '')) score += 10;
  if (classification.subtype && source.supportedSubtypes?.includes(classification.subtype)) score += 8;
  if (role === 'accounting' && requestGroup === 'accounting_depreciation') score += 10;
  if (role === 'market' && requestGroup === 'accounting_residual') score += 16;
  if (role === 'fiscal' && requestGroup.startsWith('fiscal')) score += 12;
  if (role === 'technical_regulatory' && classification.type === 'medical_equipment') score += 12;
  if (role === 'classification' && classification.type === 'computer_equipment') score += 10;
  if (role === 'technical_cost' && ['property', 'construction', 'installation'].includes(classification.type || '')) score += 10;
  if (source.id === 'cpc') score += 4;
  if (source.id === 'cfc') score += 2;
  if (source.id === 'planalto_lei_14871_2024') score += 6;
  return score;
}

function shouldSkipSecondaryFallback(source: TrustedAssetSource, selected: TrustedAssetSource[], candidates: TrustedAssetSource[]): boolean {
  if (!source.secondary || !source.fallbackSourceIds?.length) return false;
  const primaryIds = new Set(source.fallbackSourceIds);
  if (selected.some((item) => primaryIds.has(item.id))) return true;
  return candidates.some((item) => primaryIds.has(item.id) && !item.secondary);
}

export function selectTrustedSources(input: SourceSelectionRequest | Record<string, unknown>, maxSources = MAX_SOURCES): TrustedAssetSource[] {
  const selection = normalizeSelectionInput(input, maxSources);
  const candidates = TRUSTED_ASSET_SOURCES
    .filter((source) => sourceIsApplicableToRequest(source, selection.requestedParameters, selection.requestGroup, selection.classification, selection.context).applicable)
    .map((source) => ({
      source,
      score: scoreSourceForRequest(source, selection.requestedParameters, selection.requestGroup, selection.classification),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.source.secondary !== b.source.secondary) return a.source.secondary ? 1 : -1;
      if (a.source.official !== b.source.official) return a.source.official ? -1 : 1;
      return a.source.id.localeCompare(b.source.id);
    })
    .map((item) => item.source);

  const selected: TrustedAssetSource[] = [];
  const selectedRoles = new Set<TrustedSourceType>();
  for (const source of candidates) {
    const role = normalizeSourceRole(source.role || source.type)!;
    if (shouldSkipSecondaryFallback(source, selected, candidates)) continue;
    if (role === 'technical_cost' && selectedRoles.has('technical_cost')) continue;
    if (role === 'fiscal' && selectedRoles.has('fiscal')) continue;
    if (role === 'accounting' && selectedRoles.has('accounting') && selected.length > 0) continue;
    selected.push(source);
    selectedRoles.add(role);
    if (selected.length >= selection.maxSources) break;
  }

  return selected;
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

function ipv4FromMappedIpv6(value: string): string | null {
  const host = normalizeHostnameForSafety(value);
  const match = host.match(/^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/);
  return match ? match[1] : null;
}

function firstIpv6Hextet(value: string): number | null {
  const host = normalizeHostnameForSafety(value);
  if (!host.includes(':')) return null;
  const first = host.split(':').find((part) => part.length > 0);
  if (!first || !/^[0-9a-f]{1,4}$/i.test(first)) return null;
  return Number.parseInt(first, 16);
}

function isUnsafeIpv6(hostname: string): boolean {
  const host = normalizeHostnameForSafety(hostname);
  if (!host.includes(':')) return false;
  const mapped = ipv4FromMappedIpv6(host);
  if (mapped) return isPrivateIpv4(mapped);
  const first = firstIpv6Hextet(host);
  return host === '::'
    || host === '::1'
    || (first !== null && first >= 0xfc00 && first <= 0xfdff)
    || (first !== null && first >= 0xfe80 && first <= 0xfebf)
    || (first !== null && first >= 0xff00 && first <= 0xffff);
}

function isUnsafeHostname(hostname: string): boolean {
  const host = normalizeHostnameForSafety(hostname);
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === 'metadata.google.internal') return true;
  if (host === '169.254.169.254') return true;
  const mapped = ipv4FromMappedIpv6(host);
  if (mapped && isPrivateIpv4(mapped)) return true;
  if (isPrivateIpv4(host)) return true;
  if (isUnsafeIpv6(host)) return true;
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
  if (url.username || url.password) return { ok: false, reason: 'URL_CREDENTIALS_BLOCKED' };
  if (!ALLOWED_PORTS.has(url.port)) return { ok: false, reason: 'PORT_NOT_ALLOWED' };

  const hostname = url.hostname.toLowerCase();
  if (isUnsafeHostname(hostname)) return { ok: false, reason: 'PRIVATE_IP_BLOCKED' };
  if (isIpAddress(hostname)) return { ok: false, reason: 'PRIVATE_IP_BLOCKED' };
  if (!source.hosts.map((host) => host.toLowerCase()).includes(hostname)) return { ok: false, reason: 'HOST_NOT_ALLOWED' };

  const hostPrefixes = source.hostPathPrefixes?.[hostname];
  if (hostPrefixes?.length) {
    const ok = hostPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
    if (!ok) return { ok: false, reason: 'PATH_NOT_ALLOWED' };
  } else if (hostname === 'www.gov.br' && source.pathPrefixes?.length) {
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

async function assertDnsSafe(url: URL, runtime: SourceRuntime, deadline: number): Promise<void> {
  const resolver = runtime.resolveDns || resolveDnsWithRuntime;
  let addresses: string[] | null;
  try {
    addresses = await runWithinDeadline(
      () => resolver(url.hostname),
      runtime,
      deadline,
      'TOTAL_BUDGET_EXCEEDED',
    );
  } catch (_) {
    if ((_ as Error).message === 'TOTAL_BUDGET_EXCEEDED') throw _;
    throw new Error('DNS_RESOLUTION_FAILED');
  }
  if (!addresses) return;
  if (addresses.length === 0) throw new Error('DNS_RESOLUTION_FAILED');
  if (addresses.some((address) => isUnsafeHostname(address) || isPrivateIpv4(address) || isUnsafeIpv6(address))) {
    throw new Error('DNS_PRIVATE_ADDRESS');
  }
}

function resolveUrl(baseUrl: string, href: string): string {
  try {
    const url = new URL(href, baseUrl);
    url.hash = '';
    return url.toString();
  } catch (_) {
    return '';
  }
}

function nowMs(runtime: SourceRuntime): number {
  return (runtime.now || (() => new Date()))().getTime();
}

function remainingBudgetMs(runtime: SourceRuntime, deadline: number): number {
  return deadline - nowMs(runtime);
}

async function runWithinDeadline<T>(
  operation: () => Promise<T>,
  runtime: SourceRuntime,
  deadline: number,
  reasonCode = 'TOTAL_BUDGET_EXCEEDED',
  onTimeout?: () => void,
  timeoutOverrideMs?: number,
): Promise<T> {
  const remaining = timeoutOverrideMs ?? remainingBudgetMs(runtime, deadline);
  if (remaining <= 0) {
    onTimeout?.();
    throw new Error(reasonCode);
  }

  if (runtime.runWithDeadline) {
    return runtime.runWithDeadline(operation as () => Promise<unknown>, remaining, reasonCode, onTimeout) as Promise<T>;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        onTimeout?.();
      } finally {
        reject(new Error(reasonCode));
      }
    }, remaining);

    operation().then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function includesAnyNormalized(text: string, terms: string[]): boolean {
  const haystack = normalizeText(text);
  const compactHaystack = haystack.replace(/[^a-z0-9]/g, '');
  return terms.some((term) => {
    const normalizedTerm = normalizeText(term);
    return haystack.includes(normalizedTerm) || compactHaystack.includes(normalizedTerm.replace(/[^a-z0-9]/g, ''));
  });
}

function documentText(input: { title: string; text: string }): string {
  return `${input.title} ${input.text}`;
}

function isReceitaSearchPageWithoutSafeAction(input: { title: string; text: string }): boolean {
  const text = documentText(input);
  return includesAnyNormalized(text, ['sijut2', 'consulta', 'pesquisa', 'solucoes de consulta', 'instrucoes normativas'])
    && includesAnyNormalized(text, ['formulario', 'buscar', 'pesquisar', 'consulta']);
}

function adapterPageRequiresUnsupportedAction(source: TrustedAssetSource, input: { title: string; text: string }): boolean {
  const text = documentText(input);
  if (source.id === 'receita_normas') return isReceitaSearchPageWithoutSafeAction(input);
  if (['fipe', 'fipe_maquinas'].includes(source.id)) {
    return includesAnyNormalized(text, ['consulta', 'selecione', 'marca', 'modelo', 'ano', 'formulario'])
      && !extractLabeledMoney(text);
  }
  if (['anvisa', 'inmetro', 'compras_catalogo'].includes(source.id)) {
    return includesAnyNormalized(text, ['consulta', 'pesquisa', 'buscar', 'filtro', 'formulario'])
      && !includesAnyNormalized(text, ['registro', 'certificacao', 'catmat', 'catser']);
  }
  if (['caixa_sinapi', 'ibge_sinapi'].includes(source.id)) {
    return includesAnyNormalized(text, ['download', 'arquivo', 'planilha', 'xls', 'xlsx', 'zip']);
  }
  return false;
}

function metadata(
  adapter_id: string,
  data: Omit<AdapterDocumentMetadata, 'adapter_id'>,
): AdapterDocumentMetadata {
  return { adapter_id, ...data };
}

function cpcMetadata(input: { url: string; title: string; text: string }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['cpc 27', 'pronunciamento tecnico cpc 27'])) return null;
  if (!includesAnyNormalized(text, ['ativo imobilizado', 'imobilizado'])) return null;
  return metadata('cpc_document_adapter', {
    authority: 'Comite de Pronunciamentos Contabeis',
    document_kind: 'pronunciamento_contabil',
    document_identifier: 'CPC 27',
    document_title: 'Pronunciamento Tecnico CPC 27 - Ativo Imobilizado',
    citation_label: 'CPC 27 - Ativo Imobilizado',
    is_official_document: true,
    is_secondary_reproduction: false,
  });
}

function cfcMetadata(input: { url: string; title: string; text: string }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['nbc tg 27', 'norma brasileira de contabilidade tg 27'])) return null;
  if (!includesAnyNormalized(text, ['ativo imobilizado', 'depreciacao', 'valor residual', 'vida util'])) return null;
  return metadata('cfc_norm_adapter', {
    authority: 'Conselho Federal de Contabilidade',
    document_kind: 'norma_contabil',
    document_identifier: 'NBC TG 27',
    document_title: 'NBC TG 27 - Ativo Imobilizado',
    citation_label: 'NBC TG 27 - Ativo Imobilizado',
    is_official_document: true,
    is_secondary_reproduction: false,
  });
}

function receitaMetadata(input: { url: string; title: string; text: string }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  const hasInRfb1700 = includesAnyNormalized(text, ['in rfb 1700/2017', 'in rfb 1700 2017', 'instrucao normativa rfb n 1700'])
    || (
      includesAnyNormalized(text, ['1700'])
      && includesAnyNormalized(text, ['rfb', 'instrucao normativa'])
      && includesAnyNormalized(text, ['2017'])
    );
  if (hasInRfb1700) {
    return metadata('receita_sijut2_adapter', {
      authority: 'Receita Federal do Brasil',
      document_kind: 'instrucao_normativa',
      document_identifier: 'IN RFB 1700/2017',
      document_title: 'Instrucao Normativa RFB 1700/2017',
      section_label: includesAnyNormalized(text, ['anexo iii']) ? 'Anexo III' : undefined,
      citation_label: 'Receita Federal - IN RFB 1700/2017',
      is_official_document: true,
      is_secondary_reproduction: false,
    });
  }

  const solution = text.match(/\bsolu(?:cao|c[aÃ£]o|cÃƒÂ§ao|cÃƒÂ§[aÃ£]o)\s+de\s+consulta(?:\s+(?:cosit|disit|srrf\d+)?)?\s*(?:n[Âºo.]*)?\s*\d{1,6}(?:\/\d{4}|[^.\n]{0,80}\b(?:de\s+\d{4}|\d{4}))[^.\n]*/i)?.[0];
  if (solution) {
    return metadata('receita_sijut2_adapter', {
      authority: 'Receita Federal do Brasil',
      document_kind: 'solucao_de_consulta',
      document_identifier: normalizeSpaces(solution).slice(0, 120),
      citation_label: 'Receita Federal - Solucao de Consulta',
      is_official_document: true,
      is_secondary_reproduction: false,
    });
  }

  const parecer = text.match(/\bparecer\s+normativo\s*(?:n[Âºo.]*)?\s*\d{1,6}(?:\/\d{4}|[^.\n]{0,80}\b(?:de\s+\d{4}|\d{4}))[^.\n]*/i)?.[0];
  if (parecer) {
    return metadata('receita_sijut2_adapter', {
      authority: 'Receita Federal do Brasil',
      document_kind: 'parecer_normativo',
      document_identifier: normalizeSpaces(parecer).slice(0, 120),
      citation_label: 'Receita Federal - Parecer Normativo',
      is_official_document: true,
      is_secondary_reproduction: false,
    });
  }

  return null;
}
function camaraDecretoMetadata(input: { url: string; title: string; text: string }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['decreto 9580', 'decreto n 9580', 'decreto nÃ‚Âº 9580', 'rir 2018'])) return null;
  if (!includesAnyNormalized(text, ['2018', '22 de novembro de 2018'])) return null;
  if (!includesAnyNormalized(text, ['regulamento do imposto sobre a renda', 'imposto sobre a renda'])) return null;
  return metadata('camara_rir_2018_adapter', {
    authority: 'Camara dos Deputados',
    document_kind: 'decreto',
    document_identifier: 'Decreto 9580/2018',
    document_title: 'Decreto 9580/2018 - Regulamento do Imposto sobre a Renda',
    document_date: '2018-11-22',
    citation_label: 'Decreto 9580/2018 - RIR/2018',
    is_official_document: true,
    is_secondary_reproduction: false,
  });
}

function planaltoLeiMetadata(input: { url: string; title: string; text: string }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['lei 14871', 'lei n 14871', 'lei nÃ‚Âº 14871'])) return null;
  if (!includesAnyNormalized(text, ['2024', '28 de maio de 2024'])) return null;
  if (!includesAnyNormalized(text, ['depreciacao acelerada'])) return null;
  return metadata('planalto_lei_14871_adapter', {
    authority: 'Presidencia da Republica',
    document_kind: 'lei',
    document_identifier: 'Lei 14871/2024',
    document_title: 'Lei 14871/2024 - Depreciacao acelerada',
    document_date: '2024-05-28',
    citation_label: 'Lei 14871/2024 - Depreciacao acelerada',
    is_official_document: true,
    is_secondary_reproduction: false,
  });
}

function normasLegaisMetadata(input: { url: string; title: string; text: string }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['anexo iii'])) return null;
  const hasInRfb1700 = includesAnyNormalized(text, ['in rfb 1700', 'instrucao normativa rfb 1700'])
    || (
      includesAnyNormalized(text, ['1700'])
      && includesAnyNormalized(text, ['rfb', 'instrucao normativa'])
      && includesAnyNormalized(text, ['2017'])
    );
  if (!hasInRfb1700) return null;
  return metadata('normas_legais_anexo_iii_adapter', {
    authority: 'Normas Legais',
    document_kind: 'reproducao_secundaria',
    document_identifier: 'Anexo III da IN RFB 1700/2017',
    document_title: 'Normas Legais - reproducao secundaria do Anexo III da IN RFB 1700/2017',
    section_label: 'Anexo III',
    citation_label: 'Normas Legais - fonte secundaria do Anexo III da IN RFB 1700/2017',
    is_official_document: false,
    is_secondary_reproduction: true,
  });
}

function cleanTableCell(value: string): { value: string; truncated: boolean } {
  const cleaned = normalizeSpaces(stripHtml(value)).replace(/[\u0000-\u001f\u007f]/g, '');
  return {
    value: cleaned.slice(0, 120),
    truncated: cleaned.length > 120,
  };
}

function extractHtmlTables(html: string): AdapterTable[] {
  const tables: AdapterTable[] = [];
  const tableMatches = [...html.matchAll(/<table\b[\s\S]*?<\/table>/gi)];
  for (const tableMatch of tableMatches.slice(0, 3)) {
    const tableHtml = tableMatch[0];
    const originalRows = [...tableHtml.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)];
    let truncatedColumns = false;
    let truncatedCells = false;
    const parsedRows = originalRows
      .map((row) => {
        const originalCells = [...row[0].matchAll(/<t[dh]\b[\s\S]*?>([\s\S]*?)<\/t[dh]>/gi)];
        if (originalCells.length > 8) truncatedColumns = true;
        return originalCells
          .slice(0, 8)
          .map((cell) => {
            const cleaned = cleanTableCell(cell[1]);
            if (cleaned.truncated) truncatedCells = true;
            return cleaned.value;
          })
          .filter(Boolean);
      })
      .filter((row) => row.length > 0);
    if (!parsedRows.length) continue;
    const firstRowIsHeader = /<th\b/i.test(originalRows[0]?.[0] || '');
    const headers = firstRowIsHeader ? parsedRows[0] : parsedRows[0].map((_, index) => `Coluna ${index + 1}`);
    const originalBodyRowCount = firstRowIsHeader ? Math.max(0, originalRows.length - 1) : originalRows.length;
    const bodyRows = (firstRowIsHeader ? parsedRows.slice(1) : parsedRows)
      .slice(0, 20)
      .map((row) => row.slice(0, headers.length));
    const truncationReasons = [
      ...(tableMatches.length > 3 ? ['table_count'] : []),
      ...(originalBodyRowCount > 20 ? ['row_count'] : []),
      ...(truncatedColumns ? ['column_count'] : []),
      ...(truncatedCells ? ['cell_length'] : []),
    ];
    tables.push({
      headers,
      rows: bodyRows,
      truncated: truncationReasons.length > 0,
      ...(truncationReasons.length ? { truncation_reasons: truncationReasons } : {}),
    });
  }
  return tables;
}

function extractSectionLabel(text: string, metadata: AdapterDocumentMetadata): string | undefined {
  if (metadata.section_label) return metadata.section_label;
  const normalized = normalizeText(text);
  if (normalized.includes('anexo iii')) return 'Anexo III';
  const article = text.match(/\bArt\.?\s*\d+[A-Za-zÃ‚ÂºÃ‚Â°-]*/i)?.[0];
  if (article) return normalizeSpaces(article).slice(0, 80);
  const heading = text.match(/\b(CPC\s*27|NBC\s*TG\s*27|RIR\/2018|Deprecia[cÃƒÂ§][aÃƒÂ£]o acelerada)\b/i)?.[0];
  return heading ? normalizeSpaces(heading).slice(0, 80) : undefined;
}

function extractSectionCandidate(text: string, metadata: AdapterDocumentMetadata): AdapterEvidenceCandidate[] {
  const terms = [
    metadata.document_identifier,
    metadata.section_label,
    metadata.citation_label,
    'depreciacao',
    'vida util',
    'valor residual',
    'ativo imobilizado',
    'dedutibilidade',
    'depreciacao acelerada',
  ].filter(Boolean).map((item) => normalizeText(item));
  const normalized = normalizeText(text);
  const indexes = terms
    .map((term) => normalized.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  if (!indexes.length) return [{ text, section_label: extractSectionLabel(text, metadata) }];
  const start = Math.max(0, indexes[0] - 500);
  const sectionText = text.slice(start, start + MAX_EVIDENCE_EXCERPT_CHARS + 500);
  return [{ text: normalizeSpaces(sectionText), section_label: extractSectionLabel(sectionText, metadata) }];
}

function parseBrazilianMoneyValue(value: string): number | null {
  const clean = normalizeSpaces(value).replace(/^R\$\s*/i, '');
  if (!clean || /^-/.test(clean)) return null;
  if (/[^\d.,]/.test(clean)) return null;
  if ((clean.match(/,/g) || []).length > 1) return null;
  if (clean.includes(',')) {
    const [integerPart, decimalPart] = clean.split(',');
    if (!/^\d{1,3}(?:\.\d{3})*$/.test(integerPart) && !/^\d+$/.test(integerPart)) return null;
    if (!/^\d{1,2}$/.test(decimalPart)) return null;
    const number = Number(`${integerPart.replace(/\./g, '')}.${decimalPart}`);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }
  if (clean.includes('.')) {
    if (!/^\d{1,3}(?:\.\d{3})+$/.test(clean)) return null;
    const number = Number(clean.replace(/\./g, ''));
    return Number.isFinite(number) && number >= 0 ? number : null;
  }
  if (!/^\d+$/.test(clean)) return null;
  const number = Number(clean);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function extractLabeledMoney(text: string): { value: number; raw_label: string } | null {
  const moneyLabel = '(?:(?:valor|pre[cç]o|preco)(?:\\s+(?:m[eé]dio|de\\s+refer[eê]ncia|de\\s+mercado))?|custo(?:\\s+m[eé]dio)?)';
  const moneyValue = 'R\\$\\s*((?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d{1,2})?)';
  const match = text.match(new RegExp(`\\b${moneyLabel}\\b[^.\\n\\r;|]{0,80}?\\b${moneyValue}`, 'i'))
    || text.match(new RegExp(`\\b${moneyValue}\\b[^.\\n\\r;|]{0,80}?\\b${moneyLabel}\\b`, 'i'));
  if (!match) return null;
  const rawValue = match[0].match(/R\$\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)/i)?.[1] || '';
  const parsed = parseBrazilianMoneyValue(rawValue);
  if (parsed === null) return null;
  return { value: parsed, raw_label: normalizeSpaces(match[0]).slice(0, 160) };
}

function extractReferencePeriod(text: string): string | undefined {
  const match = text.match(/\b(?:m[eê]s\s+de\s+refer[eê]ncia|refer[eê]ncia|compet[eê]ncia|data\s+base)\b[:\s-]*([A-Za-zÃ-ÿ]{3,12}\/\d{4}|\d{2}\/\d{4}|\d{4}-\d{2})/i);
  return match ? normalizeSpaces(match[1]).slice(0, 40) : undefined;
}

function extractYear(text: string): string | undefined {
  return text.match(/\b(?:ano[-\s]+modelo|ano\/modelo|ano)\b\s*[:\s-]*(\d{4})/i)?.[1];
}

function extractFuelType(text: string): string | undefined {
  return text.match(/\bcombust[ií]vel\b\s*[:\s-]*([A-Za-zÃ-ÿ]{3,20})/i)?.[1];
}

const CONTROLLED_FIELD_LABELS = [
  'numero de registro',
  'mes de referencia',
  'nome comercial',
  'nome tecnico',
  'ano-modelo',
  'ano modelo',
  'combustivel',
  'certificacao',
  'competencia',
  'referencia',
  'fabricante',
  'descricao',
  'certificado',
  'detentor',
  'titular',
  'registro',
  'empresa',
  'modelo',
  'classe',
  'codigo',
  'unidade',
  'servico',
  'regiao',
  'marca',
  'grupo',
  'preco',
  'valor',
  'custo',
  'ano',
].sort((a, b) => b.length - a.length);

function labelRegexSource(label: string): string {
  const normalized = normalizeText(label);
  let source = '';
  for (const char of normalized) {
    if (char === ' ') source += '\\s+';
    else if (char === '-') source += '[-\\s]+';
    else if (char === 'a') source += '[aáàâã]';
    else if (char === 'e') source += '[eéê]';
    else if (char === 'i') source += '[ií]';
    else if (char === 'o') source += '[oóôõ]';
    else if (char === 'u') source += '[uúü]';
    else if (char === 'c') source += '[cç]';
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return source;
}

const NEXT_FIELD_LABEL_PATTERN = CONTROLLED_FIELD_LABELS
  .map((label) => labelRegexSource(label))
  .join('|');

function trimAtControlledFieldLabel(value: string): string {
  const normalizedValue = normalizeText(value);
  let cutIndex = value.length;
  for (const label of CONTROLLED_FIELD_LABELS) {
    const normalizedLabel = normalizeText(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+');
    const match = normalizedValue.match(new RegExp(`\\s+${normalizedLabel}\\b`, 'i'));
    if (match && typeof match.index === 'number') cutIndex = Math.min(cutIndex, match.index);
  }
  return normalizeSpaces(value.slice(0, cutIndex))
    .replace(/\s+n[uú]mero(?:\s+de(?:\s+registro)?)?[\s\S]*$/i, '')
    .replace(/\s+(?:ano|modelo|marca|produto|fabricante|registro|certificado|certificacao|certificação|detentor|grupo|classe|valor|preco|preço|custo)$/i, '');
}

function extractFieldValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escaped = labelRegexSource(label);
    const matches = text.matchAll(new RegExp(`\\b${escaped}\\b\\s*[:\\-]?\\s*`, 'ig'));
    for (const match of matches) {
      if (typeof match.index !== 'number') continue;
      const rest = text.slice(match.index + match[0].length);
      const nextLabel = rest.search(new RegExp(`\\s+\\b(?:${NEXT_FIELD_LABEL_PATTERN})\\b\\s*[:\\-]|[\\n\\r.;|]`, 'i'));
      const value = trimAtControlledFieldLabel(normalizeSpaces(rest.slice(0, nextLabel >= 0 ? nextLabel : 80))).slice(0, 80);
      if (value && !CONTROLLED_FIELD_LABELS.some((knownLabel) => normalizeText(value) === normalizeText(knownLabel))) return value;
    }
  }
  return undefined;
}

function extractIdentifierValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escaped = labelRegexSource(label);
    const matches = text.matchAll(new RegExp(`\\b${escaped}\\b\\s*[:\\-]?\\s*`, 'ig'));
    for (const match of matches) {
      if (typeof match.index !== 'number') continue;
      const rest = text.slice(match.index + match[0].length);
      const nextLabel = rest.search(new RegExp(`\\s+\\b(?:${NEXT_FIELD_LABEL_PATTERN})\\b\\s*[:\\-]|[\\n\\r.;|]`, 'i'));
      const rawValue = normalizeSpaces(rest.slice(0, nextLabel >= 0 ? nextLabel : 80)).slice(0, 80);
      const value = rawValue.match(/^[A-Z]{0,12}[\s.-]*\d[A-Z0-9./-]{1,32}/i)?.[0] || '';
      if (/^[A-Z0-9][A-Z0-9\s./-]{2,40}$/i.test(value) && /\d/.test(value)) return value;
    }
  }
  return undefined;
}

function contextField(context: Record<string, unknown>, field: string): string {
  return normalizeSpaces(String(context[field] || ''));
}

function buildMatchInfo(
  assetContext: Record<string, unknown>,
  fields: Record<string, string | undefined>,
  options: { criticalFields?: string[]; exactRequiredFields?: string[] } = {},
): Pick<StructuredSourceReference, 'matched_fields' | 'compared_fields' | 'divergent_fields' | 'match_status'> {
  const compared_fields: string[] = [];
  const matched_fields: string[] = [];
  const divergent_fields: string[] = [];
  const criticalFields = new Set(options.criticalFields || []);
  const exactRequiredFields = new Set(options.exactRequiredFields || []);
  for (const [field, value] of Object.entries(fields)) {
    if (!value) continue;
    const contextValue = contextField(assetContext, field);
    if (!contextValue) continue;
    compared_fields.push(field);
    const left = normalizeText(contextValue);
    const right = normalizeText(value);
    if (left && right && (left.includes(right) || right.includes(left))) matched_fields.push(field);
    else divergent_fields.push(field);
  }
  const hasCriticalDivergence = divergent_fields.some((field) => criticalFields.has(field));
  const hasRequiredFields = [...exactRequiredFields].every((field) => matched_fields.includes(field));
  const match_status = hasCriticalDivergence || !matched_fields.length || divergent_fields.length === compared_fields.length
    ? 'unmatched'
    : divergent_fields.length === 0 && compared_fields.length >= 2 && (!exactRequiredFields.size || hasRequiredFields)
      ? 'exact'
      : 'partial';
  return { matched_fields, compared_fields, divergent_fields, match_status };
}

function buildTechnicalIdentityMatch(
  assetContext: Record<string, unknown>,
  fields: { standardized_name?: string; model?: string },
): Pick<StructuredSourceReference, 'matched_fields' | 'compared_fields' | 'divergent_fields' | 'match_status'> {
  const contextName = normalizeText(contextField(assetContext, 'name'));
  const compared_fields: string[] = [];
  const matched_fields: string[] = [];
  const divergent_fields: string[] = [];
  const codeTokens = (value: string): string[] => {
    const tokens: string[] = [];
    const normalized = normalizeText(value);
    for (const match of normalized.matchAll(/(?:^|[^a-z0-9])([a-z]{0,5}\d{2,}[a-z0-9./-]*)(?=$|[^a-z0-9])/g)) {
      if (match[1]) tokens.push(match[1]);
    }
    return tokens;
  };

  if (fields.standardized_name && contextName) {
    const normalizedName = normalizeText(fields.standardized_name);
    if (normalizedName) {
      compared_fields.push('standardized_name');
      if (contextName.includes(normalizedName) || normalizedName.includes(contextName)) matched_fields.push('standardized_name');
      else divergent_fields.push('standardized_name');
    }
  }

  if (fields.model && contextName) {
    const normalizedModel = normalizeText(fields.model);
    if (normalizedModel) {
      compared_fields.push('model');
      if (contextName.includes(normalizedModel)) {
        matched_fields.push('model');
      } else {
        const sourceModelTokens = codeTokens(normalizedModel);
        const contextModelTokens = codeTokens(contextName);
        const hasExplicitDifferentModel = contextModelTokens.length > 0
          && (
            sourceModelTokens.length > 0
              ? sourceModelTokens.every((token) => !contextModelTokens.includes(token))
              : !contextName.includes(normalizedModel)
          );
        if (hasExplicitDifferentModel) divergent_fields.push('model');
      }
    }
  }

  const hasModelDivergence = divergent_fields.includes('model');
  const match_status = hasModelDivergence || !matched_fields.length || divergent_fields.length === compared_fields.length
    ? 'unmatched'
    : divergent_fields.length === 0 && matched_fields.includes('standardized_name') && matched_fields.includes('model')
      ? 'exact'
      : 'partial';
  return { matched_fields, compared_fields, divergent_fields, match_status };
}

function genericMetadata(adapter_id: string, source: TrustedAssetSource, document_kind: string, title: string): AdapterDocumentMetadata {
  return metadata(adapter_id, {
    authority: source.displayName || source.name,
    document_kind,
    document_title: normalizeSpaces(title || source.name).slice(0, 160),
    citation_label: source.specificCitationLabel || source.displayName || source.name,
    is_official_document: source.official === true,
    is_secondary_reproduction: source.secondary === true,
  });
}

function fipeVehicleMetadata(input: { title: string; text: string; source: TrustedAssetSource }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['fipe'])) return null;
  if (!includesAnyNormalized(text, ['veiculo', 'veiculos', 'carro', 'automovel', 'tabela fipe', 'valor'])) return null;
  if (includesAnyNormalized(text, ['selecione', 'formulario', 'marca', 'modelo']) && !extractLabeledMoney(text)) return null;
  return genericMetadata('fipe_vehicle_adapter', input.source, 'referencia_mercado_veiculo', input.title);
}

function fipeMachineMetadata(input: { title: string; text: string; source: TrustedAssetSource }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['fipe'])) return null;
  if (!includesAnyNormalized(text, ['maquina agricola', 'maquinas agricolas', 'trator', 'colheitadeira', 'valor'])) return null;
  if (includesAnyNormalized(text, ['selecione', 'formulario', 'marca', 'modelo']) && !extractLabeledMoney(text)) return null;
  return genericMetadata('fipe_agricultural_machine_adapter', input.source, 'referencia_mercado_maquina_agricola', input.title);
}

function anvisaMetadata(input: { title: string; text: string; source: TrustedAssetSource }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['anvisa'])) return null;
  if (!includesAnyNormalized(text, ['registro', 'produto', 'equipamento', 'fabricante', 'detentor'])) return null;
  return genericMetadata('anvisa_technical_adapter', input.source, 'registro_sanitario', input.title);
}

function inmetroMetadata(input: { title: string; text: string; source: TrustedAssetSource }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['inmetro'])) return null;
  if (!includesAnyNormalized(text, ['registro', 'certificacao', 'certificado', 'conformidade', 'produto', 'modelo'])) return null;
  return genericMetadata('inmetro_technical_adapter', input.source, 'registro_certificacao', input.title);
}

function comprasCatalogMetadata(input: { title: string; text: string; source: TrustedAssetSource }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['catmat', 'catser', 'catalogo de materiais', 'catalogo de servicos', 'compras.gov'])) return null;
  if (!text.match(/\b(?:CATMAT|CATSER)\s*\d{3,12}\b/i)) return null;
  return genericMetadata('compras_catalog_adapter', input.source, 'catalogo_classificacao', input.title);
}

function sinapiMetadata(input: { title: string; text: string; source: TrustedAssetSource }): AdapterDocumentMetadata | null {
  const text = documentText(input);
  if (!includesAnyNormalized(text, ['sinapi'])) return null;
  if (!includesAnyNormalized(text, ['custo', 'preco', 'preco', 'composicao', 'insumo', 'unidade', 'referencia'])) return null;
  return genericMetadata(input.source.id === 'caixa_sinapi' ? 'caixa_sinapi_cost_adapter' : 'ibge_sinapi_cost_adapter', input.source, 'referencia_custo_sinapi', input.title);
}

function extractMarketReference(
  text: string,
  metadata: AdapterDocumentMetadata,
  assetContext: Record<string, unknown>,
  asset_type: 'vehicle' | 'agricultural_machine',
): AdapterEvidenceCandidate[] {
  const money = extractLabeledMoney(text);
  if (!money) return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label }];
  const brand = extractFieldValue(text, ['marca']);
  const model = extractFieldValue(text, ['modelo']);
  const model_year = extractYear(text);
  const fuel_type = asset_type === 'vehicle' ? extractFuelType(text) : undefined;
  const match = buildMatchInfo(assetContext, {
    name: [brand, model].filter(Boolean).join(' '),
    vehicle_model_year: model_year,
    vehicle_fuel_type: fuel_type,
  }, {
    criticalFields: asset_type === 'vehicle' ? ['vehicle_model_year', 'vehicle_fuel_type'] : ['vehicle_model_year'],
    exactRequiredFields: asset_type === 'vehicle' ? ['vehicle_model_year', 'vehicle_fuel_type'] : [],
  });
  const reference: StructuredSourceReference = {
    kind: 'market_reference',
    asset_type,
    value: money.value,
    currency: 'BRL',
    reference_period: extractReferencePeriod(text),
    brand,
    model,
    model_year,
    fuel_type,
    raw_label: money.raw_label,
    ...match,
  };
  return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label, structured_references: [reference] }];
}

function extractTechnicalIdentity(
  text: string,
  metadata: AdapterDocumentMetadata,
  source: TrustedAssetSource,
  assetContext: Record<string, unknown>,
): AdapterEvidenceCandidate[] {
  const standardized_name = extractFieldValue(text, ['produto', 'nome tecnico', 'nome técnico', 'nome comercial']);
  const manufacturer = extractFieldValue(text, ['fabricante', 'empresa']);
  const model = extractFieldValue(text, ['modelo']);
  const registration_number = extractIdentifierValue(text, ['registro', 'numero de registro', 'número de registro']);
  const certification_number = extractIdentifierValue(text, ['certificado', 'certificacao', 'certificação']);
  const holder_name = extractFieldValue(text, ['detentor', 'titular']);
  const match = buildTechnicalIdentityMatch(assetContext, { standardized_name, model });
  const reference: StructuredSourceReference = {
    kind: 'technical_identity',
    standardized_name,
    manufacturer,
    model,
    registration_number,
    certification_number,
    holder_name,
    ...match,
  };
  if (!reference.standardized_name && !reference.manufacturer && !reference.model && !reference.registration_number && !reference.certification_number) {
    return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label }];
  }
  return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label || source.name, structured_references: [reference] }];
}

function extractClassificationReference(text: string, metadata: AdapterDocumentMetadata): AdapterEvidenceCandidate[] {
  const codeMatch = text.match(/\b(CATMAT|CATSER)\s*(\d{3,12})\b/i);
  if (!codeMatch) return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label }];
  const reference: StructuredSourceReference = {
    kind: 'classification_reference',
    catalog_system: codeMatch[1].toUpperCase(),
    code: codeMatch[2],
    catalog_code: `${codeMatch[1].toUpperCase()} ${codeMatch[2]}`,
    standardized_description: extractFieldValue(text, ['descricao', 'descrição', 'item', 'material', 'servico', 'serviço']),
    group: extractFieldValue(text, ['grupo']),
    class: extractFieldValue(text, ['classe']),
  };
  return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label, structured_references: [reference] }];
}

function extractSinapiReferences(text: string, metadata: AdapterDocumentMetadata, html?: string): AdapterEvidenceCandidate[] {
  const tables = html ? extractHtmlTables(html) : undefined;
  const references: StructuredSourceReference[] = [];
  for (const table of tables || []) {
    const headers = table.headers.map((header) => normalizeText(header));
    const codeIndex = headers.findIndex((header) => header.includes('codigo') || header.includes('cod'));
    const descIndex = headers.findIndex((header) => header.includes('descricao') || header.includes('item') || header.includes('insumo') || header.includes('composicao'));
    const unitIndex = headers.findIndex((header) => header.includes('unidade') || header === 'un');
    const valueIndex = headers.findIndex((header) => header.includes('custo') || header.includes('preco') || header.includes('valor'));
    if (descIndex < 0 || valueIndex < 0) continue;
    for (const row of table.rows.slice(0, 5)) {
      const parsed = parseBrazilianMoneyValue(row[valueIndex] || '');
      if (parsed === null) continue;
      references.push({
        kind: 'cost_reference',
        system: 'SINAPI',
        item_code: codeIndex >= 0 ? row[codeIndex] : undefined,
        description: row[descIndex],
        unit: unitIndex >= 0 ? row[unitIndex] : undefined,
        value: parsed,
        currency: 'BRL',
        reference_period: extractReferencePeriod(text),
        region: extractFieldValue(text, ['uf', 'estado', 'regiao', 'localidade']),
      });
    }
  }
  return [{ text: normalizeSpaces(text).slice(0, MAX_EVIDENCE_EXCERPT_CHARS), section_label: metadata.section_label, tables, structured_references: references.length ? references : undefined }];
}

function adapterScore(input: { url: string; label: string; title: string }, terms: string[], documentTerms: string[]): number {
  const text = `${input.url} ${input.label} ${input.title}`;
  let score = 0;
  score += scoreTextAgainstTerms(text, terms, 4);
  score += scoreTextAgainstTerms(text, documentTerms, 8);
  return score;
}

function safeAdapterRequests(source: TrustedAssetSource, requests: AdapterRequest[]): PageLink[] {
  return requests
    .filter((request) => request.method === 'GET')
    .filter((request) => !request.body && !request.headers)
    .filter((request) => isTrustedUrlForSource(request.url, source).ok)
    .map((request) => ({
      url: request.url,
      text: request.documentHint || request.purpose,
      score: 20,
      purpose: request.purpose,
      documentHint: request.documentHint,
      method: request.method,
    }));
}

export const TRUSTED_SOURCE_ADAPTERS: TrustedSourceAdapter[] = [
  {
    id: 'cpc_document_adapter',
    sourceIds: ['cpc'],
    controlledTerms: ['CPC 27', 'ativo imobilizado', 'valor residual', 'vida util', 'depreciacao'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, [
      { url: 'https://cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos', method: 'GET', purpose: 'catalogo_cpc_pronunciamentos', documentHint: 'CPC 27 ativo imobilizado' },
      ...source.entryUrls.map((url) => ({ url, method: 'GET' as const, purpose: 'entrada_catalogo_cpc', documentHint: 'CPC 27' })),
    ]),
    scoreCandidateLink: (input) => adapterScore(input, ['ativo imobilizado', 'depreciacao', 'vida util', 'valor residual'], ['CPC 27', 'Pronunciamento Tecnico CPC 27']),
    identifyDocument: cpcMetadata,
    extractEvidenceCandidates: ({ text, metadata }) => extractSectionCandidate(text, metadata),
  },
  {
    id: 'cfc_norm_adapter',
    sourceIds: ['cfc'],
    controlledTerms: ['NBC TG 27', 'ativo imobilizado', 'revisao de estimativas', 'depreciacao'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, [
      { url: 'https://cfc.org.br/tecnica/normas-brasileiras-de-contabilidade/normas-completas/', method: 'GET', purpose: 'normas_completas_cfc', documentHint: 'NBC TG 27 ativo imobilizado' },
      ...source.entryUrls.map((url) => ({ url, method: 'GET' as const, purpose: 'entrada_cfc', documentHint: 'NBC TG 27' })),
    ]),
    scoreCandidateLink: (input) => adapterScore(input, ['ativo imobilizado', 'depreciacao', 'valor residual', 'vida util'], ['NBC TG 27']),
    identifyDocument: cfcMetadata,
    extractEvidenceCandidates: ({ text, metadata }) => extractSectionCandidate(text, metadata),
  },
  {
    id: 'receita_sijut2_adapter',
    sourceIds: ['receita_normas'],
    controlledTerms: ['IN RFB 1700 2017', 'Anexo III', 'depreciacao fiscal', 'IRPJ', 'ativo imobilizado'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_sijut2_controlada',
      documentHint: 'IN RFB 1700 2017 Anexo III',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['depreciacao fiscal', 'irpj', 'ativo imobilizado'], ['IN RFB 1700', 'Anexo III']),
    identifyDocument: receitaMetadata,
    extractEvidenceCandidates: ({ text, metadata, html }) => extractSectionCandidate(text, metadata).map((candidate) => ({
      ...candidate,
      tables: html ? extractHtmlTables(html) : undefined,
    })),
    shouldUseFallback: ({ source, reason, selection, evidenceCount, budgetExhausted }) => {
      if (source.id !== 'receita_normas' || budgetExhausted || evidenceCount > 0) return false;
      if (selection.requestGroup !== 'fiscal_depreciation') return false;
      if (!selection.requestedParameters?.some((param) => param === 'fiscal_depreciation_rate' || param === 'fiscal_useful_life_years')) return false;
      return canUseSecondaryFallbackReason(reason);
    },
  },
  {
    id: 'camara_rir_2018_adapter',
    sourceIds: ['camara_decreto_9580_2018'],
    controlledTerms: ['Decreto 9580 2018', 'RIR 2018', 'depreciacao', 'dedutibilidade'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'texto_integral_rir_2018',
      documentHint: 'Decreto 9580 2018 RIR 2018',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['depreciacao', 'dedutibilidade', 'ativo imobilizado'], ['Decreto 9580', 'RIR 2018']),
    identifyDocument: camaraDecretoMetadata,
    extractEvidenceCandidates: ({ text, metadata }) => extractSectionCandidate(text, metadata),
  },
  {
    id: 'planalto_lei_14871_adapter',
    sourceIds: ['planalto_lei_14871_2024'],
    controlledTerms: ['Lei 14871 2024', 'depreciacao acelerada', 'maquinas e equipamentos novos'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'texto_lei_depreciacao_acelerada',
      documentHint: 'Lei 14871 2024 depreciacao acelerada',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['depreciacao acelerada', 'maquinas e equipamentos novos'], ['Lei 14871']),
    identifyDocument: planaltoLeiMetadata,
    extractEvidenceCandidates: ({ text, metadata }) => extractSectionCandidate(text, metadata),
  },
  {
    id: 'normas_legais_anexo_iii_adapter',
    sourceIds: ['normas_legais_in_rfb_1700_anexo_iii'],
    controlledTerms: ['Anexo III', 'IN RFB 1700 2017', 'depreciacao fiscal'],
    requiresDocumentIdentification: true,
    usesHtmlTables: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'reproducao_secundaria_anexo_iii',
      documentHint: 'Anexo III IN RFB 1700 2017',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['anexo iii', 'depreciacao fiscal', 'vida util fiscal'], ['IN RFB 1700']),
    identifyDocument: normasLegaisMetadata,
    extractEvidenceCandidates: ({ text, metadata, html }) => extractSectionCandidate(text, metadata).map((candidate) => ({
      ...candidate,
      tables: html ? extractHtmlTables(html) : undefined,
    })),
  },
  {
    id: 'fipe_vehicle_adapter',
    sourceIds: ['fipe'],
    controlledTerms: ['FIPE', 'veiculo', 'valor', 'mes de referencia', 'marca', 'modelo'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_fipe_veiculos',
      documentHint: 'FIPE veiculo valor referencia',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['valor', 'referencia', 'marca', 'modelo', 'ano', 'combustivel'], ['FIPE', 'veiculo']),
    identifyDocument: fipeVehicleMetadata,
    extractEvidenceCandidates: ({ text, metadata, assetContext }) => extractMarketReference(text, metadata, assetContext, 'vehicle'),
  },
  {
    id: 'fipe_agricultural_machine_adapter',
    sourceIds: ['fipe_maquinas'],
    controlledTerms: ['FIPE', 'maquinas agricolas', 'valor', 'mes de referencia', 'marca', 'modelo'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_fipe_maquinas_agricolas',
      documentHint: 'FIPE maquina agricola valor referencia',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['valor', 'referencia', 'maquina agricola', 'trator', 'colheitadeira', 'marca', 'modelo'], ['FIPE']),
    identifyDocument: fipeMachineMetadata,
    extractEvidenceCandidates: ({ text, metadata, assetContext }) => extractMarketReference(text, metadata, assetContext, 'agricultural_machine'),
  },
  {
    id: 'anvisa_technical_adapter',
    sourceIds: ['anvisa'],
    controlledTerms: ['ANVISA', 'registro', 'produto', 'fabricante', 'modelo', 'detentor'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_anvisa_registro',
      documentHint: 'ANVISA registro produto fabricante modelo',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['registro', 'produto', 'fabricante', 'modelo', 'detentor'], ['ANVISA']),
    identifyDocument: anvisaMetadata,
    extractEvidenceCandidates: ({ text, metadata, source, assetContext }) => extractTechnicalIdentity(text, metadata, source, assetContext),
  },
  {
    id: 'inmetro_technical_adapter',
    sourceIds: ['inmetro'],
    controlledTerms: ['INMETRO', 'registro', 'certificacao', 'conformidade', 'modelo', 'fabricante'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_inmetro_registro',
      documentHint: 'INMETRO registro certificacao modelo fabricante',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['registro', 'certificacao', 'certificado', 'modelo', 'fabricante', 'conformidade'], ['INMETRO']),
    identifyDocument: inmetroMetadata,
    extractEvidenceCandidates: ({ text, metadata, source, assetContext }) => extractTechnicalIdentity(text, metadata, source, assetContext),
  },
  {
    id: 'compras_catalog_adapter',
    sourceIds: ['compras_catalogo'],
    controlledTerms: ['CATMAT', 'CATSER', 'catalogo', 'codigo', 'descricao', 'grupo', 'classe'],
    requiresDocumentIdentification: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_catalogo_compras',
      documentHint: 'CATMAT CATSER codigo descricao grupo classe',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['catmat', 'catser', 'codigo', 'descricao', 'grupo', 'classe', 'material', 'servico'], ['catalogo compras']),
    identifyDocument: comprasCatalogMetadata,
    extractEvidenceCandidates: ({ text, metadata }) => extractClassificationReference(text, metadata),
  },
  {
    id: 'caixa_sinapi_cost_adapter',
    sourceIds: ['caixa_sinapi'],
    controlledTerms: ['SINAPI', 'custo', 'preco', 'codigo', 'unidade', 'referencia', 'regiao'],
    requiresDocumentIdentification: true,
    usesHtmlTables: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_caixa_sinapi',
      documentHint: 'SINAPI custo codigo unidade referencia regiao',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['sinapi', 'custo', 'preco', 'codigo', 'unidade', 'referencia', 'regiao'], ['CAIXA']),
    identifyDocument: sinapiMetadata,
    extractEvidenceCandidates: ({ text, metadata, html }) => extractSinapiReferences(text, metadata, html),
  },
  {
    id: 'ibge_sinapi_cost_adapter',
    sourceIds: ['ibge_sinapi'],
    controlledTerms: ['SINAPI', 'custo', 'preco', 'codigo', 'unidade', 'referencia', 'regiao'],
    requiresDocumentIdentification: true,
    usesHtmlTables: true,
    buildStartRequests: (source) => safeAdapterRequests(source, source.entryUrls.map((url) => ({
      url,
      method: 'GET' as const,
      purpose: 'consulta_ibge_sinapi',
      documentHint: 'SINAPI custo codigo unidade referencia regiao',
    }))),
    scoreCandidateLink: (input) => adapterScore(input, ['sinapi', 'custo', 'preco', 'codigo', 'unidade', 'referencia', 'regiao'], ['IBGE']),
    identifyDocument: sinapiMetadata,
    extractEvidenceCandidates: ({ text, metadata, html }) => extractSinapiReferences(text, metadata, html),
  },
];

export function getTrustedSourceAdapter(source: TrustedAssetSource | string): TrustedSourceAdapter | null {
  const sourceId = typeof source === 'string' ? source : source.id;
  const adapters = TRUSTED_SOURCE_ADAPTERS.filter((adapter) => adapter.sourceIds.includes(sourceId));
  return adapters.length === 1 ? adapters[0] : null;
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
  'taxa',
  'prazo',
  'classificacao',
  'mercado',
  'anexo',
  'norma',
  'obsolescencia',
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
  'entrar',
  'senha',
  'cadastro',
  'autenticacao',
  'captcha',
  'logout',
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
  const adapter = getTrustedSourceAdapter(source);
  if (adapter?.scoreCandidateLink) {
    score += adapter.scoreCandidateLink({ url, label, title, source, assetContext });
  }
  if (isGenericNavigationLink(haystack)) score -= 6;
  if (/\/$/.test(new URL(url).pathname) || new URL(url).pathname === '/') score -= 1;
  return score;
}

function evidenceTerms(assetContext: Record<string, unknown>, source: TrustedAssetSource): string[] {
  return [
    ...buildTrustedSourceSearchTerms(assetContext),
    ...GENERIC_RELEVANCE_TERMS,
    ...(source.recommendedTerms || []),
  ]
    .map((term) => normalizeText(term))
    .filter((term, index, list) => term.length >= 4 && list.indexOf(term) === index)
    .slice(0, 30);
}

function scoreEvidenceText(text: string, assetContext: Record<string, unknown>, source: TrustedAssetSource): { score: number; matchedTerms: string[] } {
  const haystack = normalizeText(text);
  const terms = evidenceTerms(assetContext, source);
  const matchedTerms = terms.filter((term) => haystack.includes(term)).slice(0, 12);
  let score = matchedTerms.length;
  score += scoreTextAgainstTerms(text, buildTrustedSourceSearchTerms(assetContext), 3);
  score += scoreTextAgainstTerms(text, source.recommendedTerms || [], 2);
  score += scoreTextAgainstTerms(text, GENERIC_RELEVANCE_TERMS, 1);
  if (isGenericNavigationLink(text)) score -= 8;
  return { score, matchedTerms };
}

function stableEvidenceId(sourceId: string, url: string, excerpt: string): string {
  let hash = 0;
  const value = `${sourceId}|${url}|${normalizeText(excerpt).slice(0, 300)}`;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `${sourceId}:${Math.abs(hash).toString(36)}`;
}

function extractDocumentIdentifier(title: string, processedText: string): string {
  const haystack = normalizeSpaces(`${title} ${processedText}`);
  return haystack.match(/\b(CPC\s*\d+|Lei\s*n?[Ã‚Âºo]?\s*[\d.]+\/\d{4}|Decreto\s*n?[Ã‚Âºo]?\s*[\d.]+\/\d{4}|IN\s*RFB\s*\d+\/\d{4})\b/i)?.[0]?.slice(0, 120) || '';
}

function extractRelevantExcerpt(text: string, matchedTerms: string[]): string {
  const clean = normalizeSpaces(text);
  if (!matchedTerms.length) return clean.slice(0, MAX_EVIDENCE_EXCERPT_CHARS);
  const normalized = normalizeText(clean);
  let firstIndex = -1;
  for (const term of matchedTerms) {
    const index = normalized.indexOf(term);
    if (index >= 0 && (firstIndex === -1 || index < firstIndex)) firstIndex = index;
  }
  if (firstIndex < 0) return clean.slice(0, MAX_EVIDENCE_EXCERPT_CHARS);
  const start = Math.max(0, firstIndex - 300);
  return clean.slice(start, start + MAX_EVIDENCE_EXCERPT_CHARS);
}

function buildSourceQueue(source: TrustedAssetSource, assetContext: Record<string, unknown>, selection: Required<SourceSelectionRequest>): PageLink[] {
  const adapter = getTrustedSourceAdapter(source);
  const adapterRequests = adapter?.buildStartRequests?.(source, assetContext, selection) || [];
  const genericRequests = source.entryUrls
    .filter((url) => isTrustedUrlForSource(url, source).ok)
    .map((url) => ({
      url,
      text: source.name,
      score: scoreCandidateLink(url, source.name, source.description, assetContext, source),
      method: 'GET' as const,
      purpose: 'generic_entry_url',
    }))
    .sort((a, b) => b.score - a.score);
  return [...adapterRequests, ...genericRequests]
    .filter((item, index, list) => list.findIndex((other) => other.url === item.url) === index)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_QUERY_SETS_PER_SOURCE);
}

function extractTitle(html: string): string {
  return normalizeSpaces(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, ' ') || '');
}

function sanitizeHtml(html: string): { title: string; text: string; links: Array<{ href: string; text: string }> } {
  const links = [...html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: match[1], text: stripHtml(match[2] || '') }))
    .filter((link) => link.href);
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<form[\s\S]*?<\/form>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(input|button|select|textarea)[\s\S]*?>/gi, ' ')
    .replace(/<[^>]+\s(?:hidden|aria-hidden=["']?true["']?)[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ')
    .replace(/\son\w+=["'][^"']*["']/gi, ' ')
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

async function readResponseText(
  response: Response,
  runtime: SourceRuntime,
  deadline: number,
  abort?: () => void,
): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength && contentLength > MAX_PAGE_BYTES) throw new Error('RESPONSE_TOO_LARGE');
  if (response.body && typeof response.body.getReader === 'function' && typeof TextDecoder !== 'undefined') {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await runWithinDeadline(
          () => reader.read(),
          runtime,
          deadline,
          'TOTAL_BUDGET_EXCEEDED',
          () => {
            abort?.();
            reader.cancel().catch(() => undefined);
          },
        );
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_PAGE_BYTES) {
          abort?.();
          await reader.cancel().catch(() => undefined);
          throw new Error('RESPONSE_TOO_LARGE');
        }
        chunks.push(value);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (_) {
        // The stream may already be canceled after a deadline or byte-limit error.
      }
    }
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(buffer);
  }
  const text = await runWithinDeadline(
    () => response.text(),
    runtime,
    deadline,
    'TOTAL_BUDGET_EXCEEDED',
    abort,
  );
  if (new TextEncoder().encode(text).length > MAX_PAGE_BYTES) throw new Error('RESPONSE_TOO_LARGE');
  return text;
}

async function fetchTrustedUrl(rawUrl: string, source: TrustedAssetSource, runtime: SourceRuntime, deadline: number): Promise<TrustedFetchResult> {
  let current = rawUrl;
  const fetchImpl = runtime.fetch || fetch;
  const redirectHistory = new Set<string>();

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (remainingBudgetMs(runtime, deadline) <= 0) throw new Error('TOTAL_BUDGET_EXCEEDED');
    if (redirectHistory.has(current)) throw new Error('REDIRECT_LOOP');
    redirectHistory.add(current);
    const validation = isTrustedUrlForSource(current, source);
    if (!validation.ok || !validation.url) throw new Error(validation.reason || 'URL_NOT_ALLOWED');
    await assertDnsSafe(validation.url, runtime, deadline);

    const remainingAfterDns = remainingBudgetMs(runtime, deadline);
    if (remainingAfterDns <= 0) throw new Error('TOTAL_BUDGET_EXCEEDED');
    const requestTimeout = Math.min(PAGE_TIMEOUT_MS, remainingAfterDns);
    const timeoutReason = requestTimeout < PAGE_TIMEOUT_MS ? 'TOTAL_BUDGET_EXCEEDED' : 'TIMEOUT';
    const controller = new AbortController();
    try {
      const response = await runWithinDeadline(
        () => fetchImpl(validation.url.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9',
            'user-agent': USER_AGENT,
          },
        }),
        runtime,
        deadline,
        timeoutReason,
        () => controller.abort(),
        requestTimeout,
      );

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        controller.abort();
        if (remainingBudgetMs(runtime, deadline) <= 0) throw new Error('TOTAL_BUDGET_EXCEEDED');
        const location = response.headers.get('location');
        if (!location) throw new Error('REDIRECT_BLOCKED');
        current = resolveUrl(validation.url.toString(), location);
        if (!current) throw new Error('REDIRECT_BLOCKED');
        const redirectValidation = isTrustedUrlForSource(current, source);
        if (!redirectValidation.ok || !redirectValidation.url) throw new Error(redirectValidation.reason || 'REDIRECT_BLOCKED');
        await assertDnsSafe(redirectValidation.url, runtime, deadline);
        continue;
      }

      const finalUrl = response.url || validation.url.toString();
      const finalValidation = isTrustedUrlForSource(finalUrl, source);
      if (!finalValidation.ok || !finalValidation.url) {
        controller.abort();
        throw new Error(finalValidation.reason || 'REDIRECT_BLOCKED');
      }
      await assertDnsSafe(finalValidation.url, runtime, deadline);
      return { response, controller };
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error(timeoutReason);
      throw error;
    }
  }

  throw new Error('REDIRECT_LIMIT_EXCEEDED');
}

function contentTypeKind(response: Response): 'html' | 'json' | 'text' | 'pdf' | 'binary' | 'unsupported' {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/pdf')) return 'pdf';
  if (contentType.includes('spreadsheet')
    || contentType.includes('excel')
    || contentType.includes('officedocument')
    || contentType.includes('application/zip')
    || contentType.includes('octet-stream')) return 'binary';
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) return 'html';
  if (contentType.includes('application/json')) return 'json';
  if (contentType.includes('text/plain')) return 'text';
  return 'unsupported';
}

function isRelevantEvidence(text: string, assetContext: Record<string, unknown>, source: TrustedAssetSource): boolean {
  if (text.length < 80) return false;
  return scoreEvidenceText(text, assetContext, source).score >= MIN_PAGE_RELEVANCE_SCORE;
}

async function extractEvidenceFromPage(
  url: string,
  source: TrustedAssetSource,
  assetContext: Record<string, unknown>,
  runtime: SourceRuntime,
  deadline: number,
  depth: number,
): Promise<{ evidence?: SourceEvidence; consultation?: SourceConsultation; links: PageLink[]; reason?: string }> {
  const { response, controller } = await fetchTrustedUrl(url, source, runtime, deadline);
  try {
    if (!response.ok) return { links: [], reason: 'HTTP_ERROR' };

    const kind = contentTypeKind(response);
    if (kind === 'pdf') return { links: [], reason: 'PDF_UNSUPPORTED' };
    if (kind === 'binary') return { links: [], reason: 'BINARY_FORMAT_UNSUPPORTED' };
    if (kind === 'unsupported') return { links: [], reason: 'CONTENT_TYPE_UNSUPPORTED' };
    if (!GLOBAL_ALLOWED_CONTENT_TYPES.has(kind) || (source.contentTypes?.length && !source.contentTypes.includes(kind))) {
      return { links: [], reason: 'CONTENT_TYPE_UNSUPPORTED' };
    }

    const body = await readResponseText(response, runtime, deadline, () => controller.abort());
    const finalUrl = response.url || url;
    let title = '';
    let text = '';
    let links: PageLink[] = [];
    let htmlBody = '';

    if (kind === 'json') {
      try {
        text = normalizeSpaces(sanitizeJson(JSON.parse(body))).slice(0, MAX_EXCERPT_CHARS);
        title = source.name;
      } catch (_) {
        return { links: [], reason: 'PARSE_ERROR' };
      }
    } else if (kind === 'html') {
      htmlBody = body;
      const extracted = sanitizeHtml(body);
      title = extracted.title || source.name;
      text = extracted.text;
      links = extracted.links
        .map((link) => {
          const resolved = resolveUrl(finalUrl, link.href);
          if (!resolved || !isTrustedUrlForSource(resolved, source).ok) return null;
          if (isGenericNavigationLink(`${resolved} ${link.text}`)) return null;
          return {
            url: resolved,
            text: link.text,
            score: scoreCandidateLink(resolved, link.text, title, assetContext, source),
          };
        })
        .filter((link): link is PageLink => !!link && link.score >= MIN_LINK_RELEVANCE_SCORE)
        .sort((a, b) => b.score - a.score);
    } else {
      text = normalizeSpaces(body).slice(0, MAX_EXCERPT_CHARS);
      title = source.name;
    }

    const retrievedAt = (runtime.now || (() => new Date()))().toISOString();
    const adapter = getTrustedSourceAdapter(source);
    const metadata = adapter?.identifyDocument?.({ url: finalUrl, title, text, source }) || null;
    const candidates = metadata && adapter?.extractEvidenceCandidates
      ? adapter.extractEvidenceCandidates({ text, title, html: htmlBody || undefined, metadata, source, assetContext })
      : [{ text, section_label: metadata?.section_label }];
    const candidate = candidates[0] || { text, section_label: metadata?.section_label };
    const evidenceText = candidate.text || text;
    const { score, matchedTerms } = scoreEvidenceText(evidenceText, assetContext, source);
    const relevant = isRelevantEvidence(evidenceText, assetContext, source);
    const consultationBase: SourceConsultation = {
      source_id: source.id,
      source_name: source.name,
      source_role: normalizeSourceRole(source.role || source.type) || source.type,
      url: finalUrl,
      fetched_at: retrievedAt,
      depth,
      content_type: kind,
      relevant,
      adapter_id: adapter?.id,
      document_identifier: metadata?.document_identifier,
      citation_label: metadata?.citation_label,
    };

    if (adapter?.requiresDocumentIdentification && !metadata && adapterPageRequiresUnsupportedAction(source, { title, text })) {
      return { links, consultation: { ...consultationBase, relevant: false, reason_code: 'ADAPTER_ACTION_UNAVAILABLE' }, reason: 'ADAPTER_ACTION_UNAVAILABLE' };
    }

    if (adapter?.requiresDocumentIdentification && !metadata && (text.length < 80 || isGenericNavigationLink(text))) {
      return { links, consultation: { ...consultationBase, relevant: false, reason_code: 'NO_RELEVANT_CONTENT' }, reason: 'NO_RELEVANT_CONTENT' };
    }

    if (adapter?.requiresDocumentIdentification && !metadata) {
      const reason = 'DOCUMENT_NOT_IDENTIFIED';
      return { links, consultation: { ...consultationBase, relevant: false, reason_code: reason }, reason };
    }
    if (!relevant) return { links, consultation: consultationBase, reason: 'NO_RELEVANT_CONTENT' };

    const excerpt = extractRelevantExcerpt(evidenceText, matchedTerms);
    const evidenceId = stableEvidenceId(source.id, finalUrl, excerpt);
    return {
      links,
      consultation: {
        ...consultationBase,
        evidence_id: evidenceId,
      },
      evidence: {
        evidence_id: evidenceId,
        id: evidenceId,
        source_id: source.id,
        source_name: source.name,
        source_role: normalizeSourceRole(source.role || source.type) || source.type,
        source_type: source.type,
        source_official: source.official === true,
        source_secondary: source.secondary === true,
        url: finalUrl,
        title: title.slice(0, 180),
        ...(metadata?.document_identifier || extractDocumentIdentifier(title, evidenceText)
          ? { document_identifier: metadata?.document_identifier || extractDocumentIdentifier(title, evidenceText) }
          : {}),
        excerpt,
        fetched_at: retrievedAt,
        retrieved_at: retrievedAt,
        relevance_score: score,
        matched_terms: matchedTerms,
        depth,
        content_type: kind,
        summary: excerpt.slice(0, 500),
        ...(metadata ? {
          adapter_id: metadata.adapter_id,
          authority: metadata.authority,
          document_kind: metadata.document_kind,
          document_title: metadata.document_title,
          document_date: metadata.document_date,
          section_label: candidate.section_label || metadata.section_label,
          citation_label: metadata.citation_label,
          is_official_document: metadata.is_official_document,
          is_secondary_reproduction: metadata.is_secondary_reproduction,
        } : {}),
        ...(candidate.tables?.length ? { tables: candidate.tables } : {}),
        ...(candidate.structured_references?.length ? { structured_references: candidate.structured_references } : {}),
      },
    };
  } finally {
    controller.abort();
  }
}

export async function collectTrustedSourceEvidence(
  assetContext: Record<string, unknown>,
  runtime: SourceRuntime = {},
  selection: Omit<SourceSelectionRequest, 'context'> = {},
): Promise<SourceCollectionResult> {
  const deadline = nowMs(runtime) + TOTAL_TIMEOUT_MS;
  const normalizedSelection = normalizeSelectionInput({
    context: assetContext,
    requestedParameters: selection.requestedParameters,
    requestGroup: selection.requestGroup,
    classification: selection.classification,
    maxSources: selection.maxSources || MAX_SOURCES,
  });
  const sources = selectTrustedSources(normalizedSelection);
  const evidence: SourceEvidence[] = [];
  const searched: string[] = [];
  const consulted: SourceConsultation[] = [];
  const failed: SourceFailure[] = [];
  const fallbacks: SourceFallback[] = [];
  const visited = new Set<string>();
  const searchedSourceIds = new Set<string>();
  const searchedUrls = new Set<string>();
  let totalEvidenceChars = 0;
  let budget_exhausted = false;
  const effectiveSourceLimit = Math.min(MAX_SOURCES, sources.length === 1 ? 2 : normalizedSelection.maxSources);

  async function collectForSource(source: TrustedAssetSource): Promise<{ sourceEvidence: number; lastReason: string }> {
    if (searchedSourceIds.has(source.id)) return { sourceEvidence: 0, lastReason: 'SOURCE_ALREADY_SEARCHED' };
    if (searchedSourceIds.size >= effectiveSourceLimit) return { sourceEvidence: 0, lastReason: 'SOURCE_LIMIT_REACHED' };
    if (remainingBudgetMs(runtime, deadline) <= 0 || totalEvidenceChars >= MAX_TOTAL_EVIDENCE_CHARS) {
      budget_exhausted = true;
      return { sourceEvidence: 0, lastReason: 'TOTAL_BUDGET_EXCEEDED' };
    }
    const queue = buildSourceQueue(source, assetContext, normalizedSelection).map((link) => ({ ...link, depth: 0 }));
    if (!queue.length) return { sourceEvidence: 0, lastReason: 'NO_VALID_URL' };
    let pages = 0;
    let sourceEvidence = 0;
    let lastReason = 'NO_RELEVANT_CONTENT';

    while (queue.length > 0 && pages < MAX_PAGES_PER_SOURCE && sourceEvidence < MAX_EVIDENCE_PER_SOURCE && remainingBudgetMs(runtime, deadline) > 0) {
      if (totalEvidenceChars >= MAX_TOTAL_EVIDENCE_CHARS) {
        budget_exhausted = true;
        break;
      }
      const next = queue.shift();
      if (!next || next.depth > MAX_DEPTH || visited.has(`${source.id}:${next.url}`)) continue;
      visited.add(`${source.id}:${next.url}`);
      if (!searchedSourceIds.has(source.id)) searchedSourceIds.add(source.id);
      if (!searchedUrls.has(next.url)) {
        searchedUrls.add(next.url);
        searched.push(next.url);
      }
      pages += 1;

      try {
        const result = await extractEvidenceFromPage(next.url, source, assetContext, runtime, deadline, next.depth);
        if (result.consultation) consulted.push(result.consultation);
        if (result.evidence) {
          const duplicateEvidence = evidence.some((item) => item.evidence_id === result.evidence!.evidence_id || item.excerpt === result.evidence!.excerpt);
          if (!duplicateEvidence) {
            if (totalEvidenceChars + result.evidence.excerpt.length > MAX_TOTAL_EVIDENCE_CHARS) {
              budget_exhausted = true;
              break;
            }
            evidence.push(result.evidence);
            totalEvidenceChars += result.evidence.excerpt.length;
            sourceEvidence += 1;
          }
        }
        for (const link of result.links.slice(0, MAX_LINK_CANDIDATES_PER_PAGE)) {
          if (pages + queue.length >= MAX_PAGES_PER_SOURCE) break;
          if (remainingBudgetMs(runtime, deadline) <= 0) {
            budget_exhausted = true;
            break;
          }
          if (next.depth + 1 > MAX_DEPTH) continue;
          queue.push({ ...link, depth: next.depth + 1 });
        }
        queue.sort((a, b) => b.score - a.score);
        if (result.reason) lastReason = result.reason;
      } catch (error) {
        lastReason = (error as Error).message || 'FETCH_FAILED';
        if (lastReason === 'TOTAL_BUDGET_EXCEEDED') budget_exhausted = true;
      }
    }

    if (remainingBudgetMs(runtime, deadline) <= 0) {
      budget_exhausted = true;
      lastReason = 'TOTAL_BUDGET_EXCEEDED';
    }
    return { sourceEvidence, lastReason };
  }

  for (const source of sources) {
    if (searchedSourceIds.has(source.id)) continue;
    if (searchedSourceIds.size >= effectiveSourceLimit) break;
    const result = await collectForSource(source);
    const adapter = getTrustedSourceAdapter(source);
    const fallbackAllowed = adapter?.shouldUseFallback?.({
      source,
      reason: result.lastReason,
      selection: normalizedSelection,
      evidenceCount: result.sourceEvidence,
      budgetExhausted: budget_exhausted,
    }) === true;

    if (result.sourceEvidence === 0) failed.push({ id: source.id, reason_code: result.lastReason });

    if (fallbackAllowed) {
      const fallbackId = source.fallbackSourceIds?.find((id) => id === 'normas_legais_in_rfb_1700_anexo_iii');
      const fallbackSource = TRUSTED_ASSET_SOURCES.find((item) => item.id === fallbackId);
      if (fallbackSource && sourceIsApplicableToRequest(
        fallbackSource,
        normalizedSelection.requestedParameters,
        normalizedSelection.requestGroup,
        normalizedSelection.classification,
        normalizedSelection.context,
      ).applicable) {
        if (searchedSourceIds.has(fallbackSource.id)) {
          fallbacks.push({ from_source_id: source.id, to_source_id: fallbackSource.id, reason_code: result.lastReason, status: 'blocked' });
          failed.push({ id: source.id, reason_code: 'SECONDARY_FALLBACK_NOT_ALLOWED' });
          continue;
        }
        if (searchedSourceIds.size >= effectiveSourceLimit) {
          fallbacks.push({ from_source_id: source.id, to_source_id: fallbackSource.id, reason_code: result.lastReason, status: 'blocked' });
          failed.push({ id: source.id, reason_code: 'SECONDARY_FALLBACK_NOT_ALLOWED' });
          continue;
        }
        const fallbackAudit: SourceFallback = { from_source_id: source.id, to_source_id: fallbackSource.id, reason_code: result.lastReason, status: 'blocked' };
        fallbacks.push(fallbackAudit);
        const fallbackWasAlreadySearched = searchedSourceIds.has(fallbackSource.id);
        const fallback = await collectForSource(fallbackSource);
        const fallbackStarted = searchedSourceIds.has(fallbackSource.id) && !fallbackWasAlreadySearched;
        if (fallbackStarted && fallback.sourceEvidence > 0) {
          fallbackAudit.status = 'used';
          failed.push({ id: source.id, reason_code: 'SECONDARY_FALLBACK_USED' });
        } else if (fallbackStarted) {
          fallbackAudit.status = 'failed';
          failed.push({ id: source.id, reason_code: 'SECONDARY_FALLBACK_USED' });
          failed.push({ id: fallbackSource.id, reason_code: fallback.lastReason });
        } else {
          failed.push({ id: source.id, reason_code: 'SECONDARY_FALLBACK_NOT_ALLOWED' });
          failed.push({ id: fallbackSource.id, reason_code: fallback.lastReason });
        }
      } else {
        const to_source_id = fallbackId || 'unknown';
        fallbacks.push({ from_source_id: source.id, to_source_id, reason_code: result.lastReason, status: 'blocked' });
        failed.push({ id: source.id, reason_code: 'SECONDARY_FALLBACK_NOT_ALLOWED' });
      }
    }
  }

  return {
    selected: sources.map((source) => source.id),
    searched_source_ids: [...searchedSourceIds],
    searched,
    consulted,
    consulted_pages: consulted,
    evidence_sources: [...new Set(evidence.map((item) => item.source_id))],
    evidence,
    failed: budget_exhausted ? [...failed, { id: 'collection', reason_code: 'TOTAL_BUDGET_EXCEEDED' }] : failed,
    fallbacks,
    budget_exhausted,
  };
}
