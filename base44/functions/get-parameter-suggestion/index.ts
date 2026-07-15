import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import {
  buildSuggestionLabel,
  isEffectiveForDate,
  normalizeCompetenceMonth,
  normalizeSnapshotValue,
  normalizeText,
  parseSnapshotValue,
  snapshotScore,
  type MonthlyParameterSnapshotRecord,
  type SnapshotValueType,
} from './monthlyParameters.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SETTINGS_DEPRECIATION_FIELDS = new Set(['depreciation_rate', 'useful_life_years']);
const SETTINGS_DEPRECIATION_CATEGORIES = new Set([
  'Imóveis',
  'Veículos',
  'Equipamentos',
  'Investimentos',
  'Intangíveis',
]);
const ASSET_DEPRECIATION_FIELDS = new Set(['depreciation_rate', 'useful_life_years', 'residual_value']);
const ASSET_FISCAL_FIELDS = new Set(['fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value']);

interface MonthlyParameterSourceRecord {
  id?: string;
  workspace_id: string;
  parameter_key?: string;
  domain?: string;
  source_type?: string;
  source_name?: string;
  source_url?: string;
  is_active?: boolean;
  priority?: number;
  parser_config_json?: Record<string, unknown> | string;
  notes?: string;
}

const DEFAULT_OFFICIAL_SOURCES: MonthlyParameterSourceRecord[] = [
  {
    id: 'default:receita-federal-depreciacao',
    workspace_id: 'system',
    parameter_key: 'official.fiscal.depreciation',
    domain: 'fiscal',
    source_type: 'official_page',
    source_name: 'Receita Federal / legislacao fiscal de depreciacao',
    source_url: 'https://normas.receita.fazenda.gov.br/sijut2consulta/consulta.action?termoBusca=depreciacao',
    is_active: true,
    priority: 120,
    parser_config_json: {
      system_default: true,
      expected_fields: ['fiscal_depreciation_rate', 'fiscal_useful_life_years'],
      confidence_level: 'medium',
      official_reference_summary: 'Referencia fiscal federal para consulta de normas de depreciacao. Use apenas como apoio; classificacao fiscal/tabela aplicavel deve ser validada.',
      prompt: 'Apoia sugestoes fiscais de taxa e vida util. Nao use para depreciacao societaria/gerencial e nao invente tabela numerica se a classificacao fiscal nao estiver clara.',
    },
    notes: 'Fonte oficial padrao para apoio fiscal. Exige revisao fiscal/contabil antes de aplicar.',
  },
  {
    id: 'default:cpc-27-ativo-imobilizado',
    workspace_id: 'system',
    parameter_key: 'official.accounting.cpc27',
    domain: 'depreciation',
    source_type: 'official_page',
    source_name: 'CPC 27 - Ativo Imobilizado',
    source_url: 'https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=58',
    is_active: true,
    priority: 125,
    parser_config_json: {
      system_default: true,
      expected_fields: ['depreciation_rate', 'useful_life_years', 'residual_value'],
      confidence_level: 'medium',
      official_reference_summary: 'Referencia normativa contabil para vida util economica, valor residual e revisao de estimativas. Nao e tabela numerica universal.',
      prompt: 'Use para sugestoes societarias/gerenciais considerando uso esperado, estado do bem, vida economica e politica contabil. Nao trate como regra fiscal obrigatoria.',
    },
    notes: 'Fonte oficial padrao para apoio societario/gerencial. Nao substitui politica contabil aprovada.',
  },
  {
    id: 'default:cvm-cpc-27-pdf',
    workspace_id: 'system',
    parameter_key: 'official.accounting.cvm.cpc27',
    domain: 'depreciation',
    source_type: 'official_page',
    source_name: 'CVM / CPC 27 PDF',
    source_url: 'https://conteudo.cvm.gov.br/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_27_rev_12.pdf',
    is_active: true,
    priority: 130,
    parser_config_json: {
      system_default: true,
      expected_fields: ['depreciation_rate', 'useful_life_years', 'residual_value'],
      confidence_level: 'medium',
      official_reference_summary: 'Referencia CVM/CPC 27 para ativo imobilizado, vida util, valor residual e revisao periodica.',
      prompt: 'Use como fonte societaria/gerencial complementar. Nao use para regra fiscal e nao invente valor quando faltar classificacao do ativo.',
    },
    notes: 'Fonte oficial padrao complementar para apoio contabil.',
  },
  {
    id: 'default:cfc-normas-contabeis',
    workspace_id: 'system',
    parameter_key: 'official.accounting.cfc',
    domain: 'depreciation',
    source_type: 'official_page',
    source_name: 'CFC / normas contabeis brasileiras',
    source_url: '',
    is_active: true,
    priority: 135,
    parser_config_json: {
      system_default: true,
      expected_fields: ['depreciation_rate', 'useful_life_years', 'residual_value'],
      confidence_level: 'medium',
      official_reference_summary: 'Referencia contabil geral para apoio a politicas e estimativas. URL deve ser cadastrada pelo admin quando houver fonte especifica.',
      prompt: 'Use apenas como apoio societario/gerencial geral. Nao invente URL, tabela numerica ou regra fiscal.',
    },
    notes: 'Fonte contabil padrao sem URL especifica cadastrada. Priorize fonte cadastrada quando existir.',
  },
  {
    id: 'default:fipe-veiculos',
    workspace_id: 'system',
    parameter_key: 'official.market.fipe',
    domain: 'fipe',
    source_type: 'official_page',
    source_name: 'Tabela FIPE',
    source_url: 'https://veiculos.fipe.org.br/',
    is_active: true,
    priority: 140,
    parser_config_json: {
      system_default: true,
      expected_fields: ['market_reference_value', 'residual_value'],
      allowed_categories: ['Veículos'],
      confidence_level: 'medium',
      official_reference_summary: 'Referencia de mercado para veiculos. Exige identificacao especifica do veiculo, como codigo FIPE, modelo, ano e combustivel.',
      prompt: 'Use apenas para veiculos e somente para referencia de mercado/valor residual. Nunca use para taxa ou vida util fiscal.',
    },
    notes: 'Fonte oficial padrao para referencia de mercado de veiculos. Nao altera valor contabil.',
  },
];

function normalizeConfidence(value: string): 'low' | 'medium' | 'high' {
  if (value === 'high' || value === 'medium') return value;
  return 'low';
}

function normalizeSearchText(value: unknown): string {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function contextValue(context: Record<string, unknown>, key: string): string {
  return normalizeText(context?.[key]);
}

function identifyAssetClassification(context: Record<string, unknown>, category: string) {
  const rawSpecificText = [
    contextValue(context, 'asset_name'),
    contextValue(context, 'asset_description'),
    contextValue(context, 'description'),
    contextValue(context, 'notes'),
    contextValue(context, 'supplier_name'),
    contextValue(context, 'account'),
    contextValue(context, 'sector_name'),
    contextValue(context, 'location'),
    contextValue(context, 'vehicle_model_year'),
    contextValue(context, 'vehicle_fuel_type'),
    contextValue(context, 'property_registration_type'),
  ].filter(Boolean).join(' ');

  const search = normalizeSearchText([
    rawSpecificText,
    category,
    contextValue(context, 'asset_group'),
    contextValue(context, 'asset_type'),
  ].join(' '));

  const genericOnly = new Set([
    '',
    'equipamento',
    'equipamentos',
    'veiculo',
    'veiculos',
    'imovel',
    'imoveis',
    'intangivel',
    'intangiveis',
    'investimento',
    'investimentos',
  ]);
  const hasSpecificContext = rawSpecificText.trim().length >= 4 && !genericOnly.has(normalizeSearchText(rawSpecificText));

  const rules = [
    {
      terms: ['impressora', 'laserjet', 'printer'],
      label: 'Impressora / periférico de informática',
      tokens: ['impressora', 'periferico', 'informatica', 'computador', 'printer'],
    },
    {
      terms: ['notebook', 'laptop', 'latitude', 'thinkpad', 'macbook'],
      label: 'Notebook / equipamento de informática',
      tokens: ['notebook', 'laptop', 'informatica', 'computador'],
    },
    {
      terms: ['caminhao', 'atego', 'truck', 'veiculo de carga', 'carga'],
      label: 'Caminhão / veículo de carga',
      tokens: ['caminhao', 'truck', 'veiculo de carga', 'carga'],
    },
    {
      terms: ['software', 'licenca', 'licença', 'sistema', 'assinatura'],
      label: 'Software / licença / intangível',
      tokens: ['software', 'licenca', 'sistema', 'intangivel'],
    },
    {
      terms: ['imovel', 'imoveis', 'edificio', 'predio', 'sala comercial', 'galpao', 'terreno'],
      label: 'Imóvel / edificação',
      tokens: ['imovel', 'edificacao', 'predio', 'galpao', 'comercial'],
    },
    {
      terms: ['ar condicionado', 'condicionador', 'split'],
      label: 'Ar-condicionado / equipamento de climatização',
      tokens: ['ar condicionado', 'climatizacao', 'split'],
    },
  ];

  const matched = rules.find((rule) => rule.terms.some((term) => search.includes(normalizeSearchText(term))));
  if (matched) {
    return {
      identified_classification: matched.label,
      tokens: matched.tokens.map(normalizeSearchText),
      hasSpecificContext: true,
    };
  }

  return {
    identified_classification: hasSpecificContext
      ? normalizeText(context?.asset_name || context?.asset_description || category)
      : 'Não identificado com segurança',
    tokens: rawSpecificText
      .split(/\s+/)
      .map(normalizeSearchText)
      .filter((token) => token.length >= 4 && !genericOnly.has(token))
      .slice(0, 8),
    hasSpecificContext,
  };
}

function suggestionBasis(domain: string): 'societaria_gerencial' | 'fiscal' | 'fipe' {
  if (domain === 'fiscal') return 'fiscal';
  if (domain === 'fipe') return 'fipe';
  return 'societaria_gerencial';
}

function genericCategoryScope(row: MonthlyParameterSnapshotRecord): boolean {
  const scope = normalizeSearchText(row.scope_key);
  return scope.startsWith('category:') && !normalizeText(row.asset_type);
}

function snapshotCompatibleWithDomain(row: MonthlyParameterSnapshotRecord, domain: string, fieldName: string): boolean {
  const rowDomain = normalizeText(row.domain);
  if (!domain || rowDomain === domain) return true;
  if (domain === 'fiscal') {
    return rowDomain === 'depreciation' && fieldName.startsWith('fiscal_');
  }
  return false;
}

function snapshotText(row: MonthlyParameterSnapshotRecord): string {
  return normalizeSearchText([
    row.parameter_key,
    row.scope_key,
    row.category,
    row.asset_type,
    row.notes,
    row.source_name,
    Array.isArray(row.warnings) ? row.warnings.join(' ') : '',
    row.raw_payload ? JSON.stringify(row.raw_payload) : '',
  ].join(' '));
}

function matchesAssetClassification(row: MonthlyParameterSnapshotRecord, profile: ReturnType<typeof identifyAssetClassification>): boolean {
  if (genericCategoryScope(row)) return false;
  const text = snapshotText(row);
  return profile.tokens.some((token) => token.length >= 4 && text.includes(token));
}

function expectedValueType(fieldName: string): SnapshotValueType {
  if (fieldName === 'depreciation_rate' || fieldName === 'fiscal_depreciation_rate') return 'percent';
  if (fieldName === 'residual_value' || fieldName === 'fiscal_residual_value') return 'currency';
  return 'decimal';
}

function defaultUnit(fieldName: string): string {
  if (fieldName === 'depreciation_rate' || fieldName === 'fiscal_depreciation_rate') return '%';
  if (fieldName === 'residual_value' || fieldName === 'fiscal_residual_value') return 'R$';
  return 'anos';
}

function parseConfig(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return typeof parsed === 'object' && parsed ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function listFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  const text = normalizeText(value);
  return text ? [text] : [];
}

function sourceSearchText(source: MonthlyParameterSourceRecord): string {
  const config = parseConfig(source.parser_config_json);
  return normalizeSearchText([
    source.parameter_key,
    source.domain,
    source.source_type,
    source.source_name,
    source.source_url,
    source.notes,
    JSON.stringify(config),
  ].join(' '));
}

function sourceSupportsField(source: MonthlyParameterSourceRecord, fieldName: string): boolean {
  const config = parseConfig(source.parser_config_json);
  const expectedFields = listFromUnknown(config.expected_fields);
  const configField = normalizeText(config.field_name);
  if (expectedFields.length === 0 && !configField) return true;
  return expectedFields.includes(fieldName) || configField === fieldName;
}

function sourceCompatibleWithDomain(source: MonthlyParameterSourceRecord, domain: string, fieldName: string): boolean {
  const sourceDomain = normalizeText(source.domain);
  const text = sourceSearchText(source);
  if (sourceDomain === domain) return true;
  if (domain === 'fiscal') {
    return (
      sourceDomain === 'depreciation' &&
      (
        fieldName.startsWith('fiscal_') ||
        text.includes('fiscal') ||
        text.includes('receita') ||
        text.includes('rir') ||
        text.includes('rfb') ||
        text.includes('tribut')
      )
    );
  }
  return false;
}

function sourceMatchesClassification(source: MonthlyParameterSourceRecord, profile: ReturnType<typeof identifyAssetClassification>): boolean {
  const text = sourceSearchText(source);
  return profile.tokens.some((token) => token.length >= 4 && text.includes(token));
}

function sourceAllowsCategory(source: MonthlyParameterSourceRecord, category: string): boolean {
  const config = parseConfig(source.parser_config_json);
  const allowedCategories = listFromUnknown(config.allowed_categories);
  if (allowedCategories.length === 0) return true;
  const normalizedCategory = normalizeSearchText(category);
  return allowedCategories.map(normalizeSearchText).includes(normalizedCategory);
}

function isDefaultOfficialSource(source: MonthlyParameterSourceRecord): boolean {
  const config = parseConfig(source.parser_config_json);
  return source.id?.startsWith('default:') === true || config.system_default === true;
}

function sourceScore(
  source: MonthlyParameterSourceRecord,
  query: {
    domain: string;
    fieldName: string;
    category: string;
    assetProfile: ReturnType<typeof identifyAssetClassification> | null;
  },
): number {
  let score = 0;
  if (normalizeText(source.domain) === query.domain) score += 20;
  if (sourceCompatibleWithDomain(source, query.domain, query.fieldName)) score += 10;
  if (sourceSupportsField(source, query.fieldName)) score += 10;
  if (sourceAllowsCategory(source, query.category)) score += 6;
  if (query.assetProfile && sourceMatchesClassification(source, query.assetProfile)) score += 18;
  const confidence = normalizeText(parseConfig(source.parser_config_json).confidence_level);
  if (confidence === 'high') score += 4;
  if (confidence === 'medium') score += 3;
  if (confidence === 'low') score += 1;
  score += Math.max(0, 100 - (Number(source.priority) || 100)) / 10;
  if (isDefaultOfficialSource(source)) score -= 8;
  return score;
}

function defaultOfficialSourcesFor(query: {
  domain: string;
  fieldName: string;
  category: string;
}): MonthlyParameterSourceRecord[] {
  return DEFAULT_OFFICIAL_SOURCES
    .filter((source) => sourceCompatibleWithDomain(source, query.domain, query.fieldName))
    .filter((source) => sourceSupportsField(source, query.fieldName))
    .filter((source) => sourceAllowsCategory(source, query.category))
    .map((source) => ({
      ...source,
      workspace_id: 'system',
      is_active: true,
    }));
}

function sourceSummary(source: MonthlyParameterSourceRecord) {
  const config = parseConfig(source.parser_config_json);
  return {
    id: source.id || '',
    parameter_key: normalizeText(source.parameter_key),
    domain: normalizeText(source.domain),
    source_type: normalizeText(source.source_type),
    source_name: normalizeText(source.source_name),
    source_url: normalizeText(source.source_url),
    notes: normalizeText(source.notes),
    expected_fields: listFromUnknown(config.expected_fields),
    allowed_categories: listFromUnknown(config.allowed_categories),
    prompt: normalizeText(config.prompt),
    reference_summary: normalizeText(config.official_reference_summary || config.reference_summary || source.notes),
    system_default: isDefaultOfficialSource(source),
    web_search_available: false,
    confidence_level: normalizeText(config.confidence_level || 'medium'),
  };
}

async function generateSuggestionFromSources(
  svc: any,
  input: {
    domain: string;
    fieldName: string;
    category: string;
    competenceMonth: string;
    context: Record<string, unknown>;
    assetProfile: ReturnType<typeof identifyAssetClassification>;
    sources: MonthlyParameterSourceRecord[];
  },
) {
  const valueType = expectedValueType(input.fieldName);
  const unit = defaultUnit(input.fieldName);
  const basis = suggestionBasis(input.domain);
  const sources = input.sources.slice(0, 6).map(sourceSummary);
  const prompt = [
    'A integracao atual desta function nao fornece navegacao web nem busca aberta. Nao simule pesquisa na internet.',
    'Use fontes cadastradas/aprovadas do workspace como prioridade e fontes oficiais padrao do sistema como apoio controlado.',
    'Nao use regra fixa por categoria nem tabela padrao inventada. O grupo de patrimonio e apenas uma pista, nunca a unica base.',
    'Separe obrigatoriamente as bases: fiscal usa Receita/normas fiscais; societaria/gerencial usa CPC/CVM/politica contabil; FIPE usa apenas veiculos e apenas mercado/residual.',
    'Se as fontes ou o contexto nao sustentarem um valor numerico com seguranca, responda found=false e explique em warning.',
    'Você é um assistente técnico-contábil do sistema AMZ Patrimônios.',
    'Gere UMA sugestão para o campo solicitado usando apenas as fontes aprovadas fornecidas e o contexto do ativo.',
    'As fontes podem ser gerais: norma, lei, política interna, tabela fiscal ou orientação contábil. Fonte específica aumenta confiança, mas fonte geral aprovada pode fundamentar sugestão conservadora.',
    'Não faça busca aberta, não invente URL e não cite fonte que não esteja na lista.',
    'Se as fontes não forem suficientes para sugerir com segurança, responda found=false e explique em warning.',
    'Valores numéricos devem ser brutos: 20 para 20%, 5 para 5 anos, 1000.5 para R$ 1.000,50.',
    `Campo: ${input.fieldName}`,
    `Tipo esperado: ${valueType}`,
    `Unidade esperada: ${unit}`,
    `Base: ${basis}`,
    `Classificação provável: ${input.assetProfile.identified_classification}`,
    `Competência: ${input.competenceMonth}`,
    `Contexto do ativo: ${JSON.stringify(input.context)}`,
    `Fontes aprovadas: ${JSON.stringify(sources)}`,
  ].join('\n\n');

  const response = await svc.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        found: { type: 'boolean' },
        suggested_value: {},
        unit: { type: 'string' },
        field: { type: 'string' },
        basis: { type: 'string' },
        identified_classification: { type: 'string' },
        rationale: { type: 'string' },
        source_name: { type: 'string' },
        source_url: { type: 'string' },
        confidence: { type: 'string' },
        warning: { type: 'string' },
      },
      required: ['found', 'suggested_value', 'unit', 'field', 'basis', 'identified_classification', 'rationale', 'source_name', 'confidence'],
    },
  });

  if (!response?.found) {
    return {
      found: false,
      error: normalizeText(response?.warning) || 'Não encontrei uma fonte aprovada suficiente para sugerir este campo com segurança.',
      warning: normalizeText(response?.warning),
    };
  }

  const sourceName = normalizeText(response.source_name);
  const responseSourceUrl = normalizeText(response.source_url);
  const selectedSource = sources.find((source) => source.source_name === sourceName || source.source_url === responseSourceUrl) || sources[0];
  if (!selectedSource) {
    return {
      found: false,
      error: 'Não encontrei uma fonte aprovada suficiente para sugerir este campo com segurança.',
      warning: 'A IA não indicou uma fonte cadastrada para fundamentar a sugestão.',
    };
  }

  const normalized = normalizeSnapshotValue(response.suggested_value, valueType);
  const label = buildSuggestionLabel(normalized.value, unit, valueType);
  const confidence = normalizeConfidence(normalizeText(response.confidence));
  const selectedSourceRecord = input.sources.find((source) => normalizeText(source.id) === selectedSource.id) || input.sources[0];
  const usedSpecificSource = input.assetProfile ? sourceMatchesClassification(selectedSourceRecord, input.assetProfile) : false;
  const warnings = [
    normalizeText(response.warning),
    !usedSpecificSource ? 'Esta sugestão usa uma fonte geral aprovada. Revise antes de aplicar.' : '',
  ].filter(Boolean);

  return {
    found: true,
    value: normalized.value,
    suggested_value: normalized.value,
    unit,
    label,
    field: input.fieldName,
    basis,
    identified_classification: normalizeText(response.identified_classification) || input.assetProfile.identified_classification,
    explanation: normalizeText(response.rationale),
    rationale: normalizeText(response.rationale),
    source_name: selectedSource.source_name,
    source_url: selectedSource.source_url,
    confidence_level: confidence,
    warnings,
    warning: warnings[0] || null,
    requires_user_confirmation: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const me = (await svc.entities.User.filter({ id: user.id }))[0];
    const workspaceId = normalizeText(me?.workspace_id || user.workspace_id);
    if (!workspaceId) {
      return json({ error: 'Workspace nao encontrado para o usuario autenticado.' }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const competenceMonth = normalizeCompetenceMonth(body?.competence_month);
    const domain = normalizeText(body?.domain);
    const entityType = normalizeText(body?.entity_type);
    const fieldName = normalizeText(body?.field_name);
    const category = normalizeText(body?.category);
    const assetType = normalizeText(body?.asset_type);
    const uf = normalizeText(body?.uf);
    const regimeFiscal = normalizeText(body?.regime_fiscal);
    const scopeKey = normalizeText(body?.scope_key);
    const context = (typeof body?.context === 'object' && body?.context ? body.context : {}) as Record<string, unknown>;
    const targetDate = normalizeText(body?.effective_date || `${competenceMonth}-01`);
    const isFipeRequest = domain === 'fipe';
    const assetProfile = entityType === 'Asset' ? identifyAssetClassification(context, category) : null;

    if (entityType === 'DepreciationConfig') {
      if (
        domain !== 'depreciation' ||
        !SETTINGS_DEPRECIATION_FIELDS.has(fieldName) ||
        !SETTINGS_DEPRECIATION_CATEGORIES.has(category)
      ) {
        return json(
          {
            found: false,
            error: 'A indicação automática em Configurações está limitada a taxa anual e vida útil das categorias padrão.',
            requires_user_confirmation: true,
          },
          400,
        );
      }
    }

    if (entityType === 'Asset') {
      const validAssetField =
        (domain === 'depreciation' && ASSET_DEPRECIATION_FIELDS.has(fieldName)) ||
        (domain === 'fiscal' && ASSET_FISCAL_FIELDS.has(fieldName)) ||
        domain === 'fipe';

      if (!validAssetField) {
        return json(
          {
            found: false,
            error: 'Campo não habilitado para sugestão automática do ativo.',
            requires_user_confirmation: true,
          },
          400,
        );
      }

      if (!isFipeRequest && assetProfile && !assetProfile.hasSpecificContext) {
        return json(
          {
            found: false,
            error: 'A sugestão automática precisa de uma descrição mais específica do bem, como marca, modelo ou tipo de uso.',
            identified_classification: assetProfile.identified_classification,
            basis: suggestionBasis(domain),
            requires_user_confirmation: true,
          },
          404,
        );
      }
    }

    if (isFipeRequest && !scopeKey) {
      return json(
        {
          found: false,
          error: 'Referencia FIPE exige identificador especifico do veiculo, como codigo FIPE/ano. Nenhuma referencia generica foi aplicada.',
          requires_user_confirmation: true,
        },
        404,
      );
    }

    if (
      isFipeRequest &&
      !scopeKey.startsWith('fipe_code:') &&
      !scopeKey.startsWith('vehicle:')
    ) {
      return json(
        {
          found: false,
          error: 'Referencia FIPE exige scope_key especifico no formato fipe_code:<codigo>:year:<ano> ou vehicle:<marca>:<modelo>:<ano>:<combustivel>.',
          requires_user_confirmation: true,
        },
        400,
      );
    }

    const rows = await svc.entities.MonthlyParameterSnapshot.filter(
      {
        workspace_id: workspaceId,
        competence_month: competenceMonth,
      },
      '-created_date',
      5000,
    );

    const candidates = rows
      .filter((row: MonthlyParameterSnapshotRecord) => normalizeText(row.status) === 'active')
      .filter((row: MonthlyParameterSnapshotRecord) => snapshotCompatibleWithDomain(row, domain, fieldName))
      .filter((row: MonthlyParameterSnapshotRecord) => !entityType || !normalizeText(row.entity_type) || normalizeText(row.entity_type) === entityType)
      .filter((row: MonthlyParameterSnapshotRecord) => !fieldName || normalizeText(row.field_name) === fieldName)
      .filter((row: MonthlyParameterSnapshotRecord) => !category || !normalizeText(row.category) || normalizeText(row.category) === category)
      .filter((row: MonthlyParameterSnapshotRecord) => !assetType || !normalizeText(row.asset_type) || normalizeText(row.asset_type) === assetType)
      .filter((row: MonthlyParameterSnapshotRecord) => !uf || !normalizeText(row.uf) || normalizeText(row.uf) === uf)
      .filter((row: MonthlyParameterSnapshotRecord) => !regimeFiscal || !normalizeText(row.regime_fiscal) || normalizeText(row.regime_fiscal) === regimeFiscal)
      .filter((row: MonthlyParameterSnapshotRecord) => !scopeKey || normalizeText(row.scope_key) === scopeKey)
      .filter((row: MonthlyParameterSnapshotRecord) => isEffectiveForDate(row, targetDate));

    const getSourceSuggestion = async (fallbackWarnings: string[] = []) => {
      if (entityType !== 'Asset' || isFipeRequest || !assetProfile) return null;

      const sourceRows = await svc.entities.MonthlyParameterSource.filter(
        { workspace_id: workspaceId },
        'priority',
        500,
      );
      const registeredSources = (sourceRows || [])
        .filter((source: MonthlyParameterSourceRecord) => source.is_active === true)
        .filter((source: MonthlyParameterSourceRecord) => sourceCompatibleWithDomain(source, domain, fieldName))
        .filter((source: MonthlyParameterSourceRecord) => sourceSupportsField(source, fieldName))
        .filter((source: MonthlyParameterSourceRecord) => sourceAllowsCategory(source, category))
        .map((source: MonthlyParameterSourceRecord) => ({ ...source, id: source.id || `registered:${source.parameter_key || source.source_name}` }));
      const defaultSources = defaultOfficialSourcesFor({ domain, fieldName, category });
      const sources = [...registeredSources, ...defaultSources]
        .map((source: MonthlyParameterSourceRecord) => ({
          source,
          score: sourceScore(source, { domain, fieldName, category, assetProfile }),
        }))
        .filter((item: { source: MonthlyParameterSourceRecord; score: number }) => item.score > 0)
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
        .map((item: { source: MonthlyParameterSourceRecord }) => item.source);

      if (sources.length === 0) {
        return {
          found: false,
          error: 'Não encontrei uma fonte aprovada suficiente para sugerir este campo com segurança.',
          identified_classification: assetProfile.identified_classification,
          basis: suggestionBasis(domain),
          warnings: fallbackWarnings,
          requires_user_confirmation: true,
        };
      }

      try {
        const generated = await generateSuggestionFromSources(svc, {
          domain,
          fieldName,
          category,
          competenceMonth,
          context,
          assetProfile,
          sources,
        });

        if (generated.found) {
          return {
            ...generated,
            competence_month: competenceMonth,
            warnings: [
              ...fallbackWarnings,
              ...(Array.isArray(generated.warnings) ? generated.warnings : []),
            ],
          };
        }

        return {
          ...generated,
          identified_classification: assetProfile.identified_classification,
          basis: suggestionBasis(domain),
          warnings: fallbackWarnings,
          requires_user_confirmation: true,
        };
      } catch {
        return {
          found: false,
          error: 'Não foi possível gerar a sugestão agora. Tente novamente em instantes.',
          identified_classification: assetProfile.identified_classification,
          basis: suggestionBasis(domain),
          warnings: fallbackWarnings,
          requires_user_confirmation: true,
        };
      }
    };

    const safeCandidates = candidates;

    if (safeCandidates.length === 0) {
      const sourceSuggestion = await getSourceSuggestion();
      if (sourceSuggestion) return json(sourceSuggestion, sourceSuggestion.found ? 200 : 404);

      return json(
        {
          found: false,
          error: entityType === 'Asset' && !isFipeRequest
            ? 'Não encontrei uma fonte aprovada suficiente para sugerir este campo com segurança.'
            : 'Não encontrei referência aprovada suficiente para sugerir este campo com segurança.',
          identified_classification: assetProfile?.identified_classification || '',
          basis: suggestionBasis(domain),
          requires_user_confirmation: true,
        },
        404,
      );
    }

    const ranked = safeCandidates
      .map((row: MonthlyParameterSnapshotRecord) => ({
        row,
        score: snapshotScore(row, {
          domain,
          entity_type: entityType,
          field_name: fieldName,
          category,
          asset_type: assetType,
          uf,
          regime_fiscal: regimeFiscal,
          parameter_key: normalizeText(body?.parameter_key || fieldName),
        }) + (assetProfile && matchesAssetClassification(row, assetProfile) ? 20 : 0) - (genericCategoryScope(row) ? 4 : 0),
      }))
      .sort((a, b) => b.score - a.score || (Number(b.row.version) || 0) - (Number(a.row.version) || 0));

    const invalidWarnings: string[] = [];
    for (const item of ranked) {
      try {
        const best = item.row;
        const parsedValue = parseSnapshotValue(best.value || '', best.value_type);
        const unit = normalizeText(best.unit);
        const label = buildSuggestionLabel(parsedValue, unit, best.value_type);

        return json({
          found: true,
          value: parsedValue,
          suggested_value: parsedValue,
          unit,
          label,
          field: fieldName,
          basis: suggestionBasis(domain),
          identified_classification: assetProfile?.identified_classification || normalizeText(best.category || best.asset_type),
          explanation: normalizeText(best.notes) || `Indicação automática baseada na competência ${competenceMonth}.`,
          rationale: normalizeText(best.notes) || `Indicação automática baseada na competência ${competenceMonth}.`,
          source_name: normalizeText(best.source_name),
          source_url: normalizeText(best.source_url),
          source_date: normalizeText(best.source_date),
          competence_month: normalizeText(best.competence_month),
          effective_start_date: normalizeText(best.effective_start_date),
          effective_end_date: normalizeText(best.effective_end_date),
          confidence_level: normalizeConfidence(normalizeText(best.confidence_level)),
          warnings: [
            ...(Array.isArray(best.warnings) ? best.warnings : []),
            ...(entityType === 'Asset' && !isFipeRequest && genericCategoryScope(best) ? ['Esta sugestão usa uma fonte geral aprovada. Revise antes de aplicar.'] : []),
            ...invalidWarnings,
          ],
          warning: normalizeConfidence(normalizeText(best.confidence_level)) === 'low'
            ? 'Revise a sugestão: a confiança da fonte está baixa ou há pouca informação específica.'
            : null,
          snapshot_id: best.id || '',
          context,
          requires_user_confirmation: true,
        });
      } catch (error) {
        invalidWarnings.push(
          `Snapshot ${item.row.id || item.row.parameter_key || item.row.field_name || 'desconhecido'} ignorado: ${String(error?.message || error)}`,
        );
      }
    }

    const sourceSuggestion = await getSourceSuggestion(invalidWarnings);
    if (sourceSuggestion) return json(sourceSuggestion, sourceSuggestion.found ? 200 : 404);

    return json(
      {
        found: false,
        error: 'Não foi possível gerar a sugestão agora. Tente novamente em instantes.',
        warnings: invalidWarnings,
        requires_user_confirmation: true,
      },
      422,
    );
  } catch (error) {
    return json(
      {
        error: 'Nao foi possivel buscar a indicacao automatica.',
        details: String(error?.message || error),
      },
      500,
    );
  }
});
