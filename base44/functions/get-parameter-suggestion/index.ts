import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import {
  buildSuggestionLabel,
  isEffectiveForDate,
  normalizeCompetenceMonth,
  normalizeText,
  parseSnapshotValue,
  snapshotScore,
  type MonthlyParameterSnapshotRecord,
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
      .filter((row: MonthlyParameterSnapshotRecord) => !domain || normalizeText(row.domain) === domain)
      .filter((row: MonthlyParameterSnapshotRecord) => !entityType || !normalizeText(row.entity_type) || normalizeText(row.entity_type) === entityType)
      .filter((row: MonthlyParameterSnapshotRecord) => !fieldName || normalizeText(row.field_name) === fieldName)
      .filter((row: MonthlyParameterSnapshotRecord) => !category || !normalizeText(row.category) || normalizeText(row.category) === category)
      .filter((row: MonthlyParameterSnapshotRecord) => !assetType || !normalizeText(row.asset_type) || normalizeText(row.asset_type) === assetType)
      .filter((row: MonthlyParameterSnapshotRecord) => !uf || !normalizeText(row.uf) || normalizeText(row.uf) === uf)
      .filter((row: MonthlyParameterSnapshotRecord) => !regimeFiscal || !normalizeText(row.regime_fiscal) || normalizeText(row.regime_fiscal) === regimeFiscal)
      .filter((row: MonthlyParameterSnapshotRecord) => !scopeKey || normalizeText(row.scope_key) === scopeKey)
      .filter((row: MonthlyParameterSnapshotRecord) => isEffectiveForDate(row, targetDate));

    let safeCandidates = candidates;
    if (entityType === 'Asset' && !isFipeRequest && assetProfile) {
      safeCandidates = candidates.filter((row: MonthlyParameterSnapshotRecord) => matchesAssetClassification(row, assetProfile));
    }

    if (safeCandidates.length === 0) {
      return json(
        {
          found: false,
          error: entityType === 'Asset' && !isFipeRequest
            ? 'Não encontrei fonte aprovada específica o suficiente para sugerir este campo com segurança.'
            : 'Ainda não há sugestão aprovada para este campo. Cadastre ou aprove uma fonte para habilitar sugestões.',
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
        }) + (assetProfile && matchesAssetClassification(row, assetProfile) ? 20 : 0),
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
            ...(entityType === 'Asset' && !isFipeRequest ? ['A categoria do bem foi usada apenas como pista inicial; a sugestão exige fonte compatível com a classificação identificada.'] : []),
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

    return json(
      {
        found: false,
        error: 'Os snapshots vigentes encontrados estao com valor formatado ou invalido para uso automatico.',
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
