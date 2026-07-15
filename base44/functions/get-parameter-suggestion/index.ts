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

function normalizeConfidence(value: string): 'low' | 'medium' | 'high' {
  if (value === 'high' || value === 'medium') return value;
  return 'low';
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
    const context = typeof body?.context === 'object' && body?.context ? body.context : {};
    const targetDate = normalizeText(body?.effective_date || `${competenceMonth}-01`);
    const isFipeRequest = domain === 'fipe';

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

    if (candidates.length === 0) {
      return json(
        {
          found: false,
          error: 'Nenhuma indicacao automatica vigente encontrada para este campo.',
          requires_user_confirmation: true,
        },
        404,
      );
    }

    const ranked = candidates
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
        }),
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
          unit,
          label,
          explanation: normalizeText(best.notes) || `Indicacao automatica baseada na competencia ${competenceMonth}.`,
          source_name: normalizeText(best.source_name),
          source_url: normalizeText(best.source_url),
          source_date: normalizeText(best.source_date),
          competence_month: normalizeText(best.competence_month),
          effective_start_date: normalizeText(best.effective_start_date),
          effective_end_date: normalizeText(best.effective_end_date),
          confidence_level: normalizeConfidence(normalizeText(best.confidence_level)),
          warnings: [
            ...(Array.isArray(best.warnings) ? best.warnings : []),
            ...invalidWarnings,
          ],
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
