import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import {
  resolveMonthlyParameterSourceSnapshots,
  type ProviderItemError,
  type ProviderSnapshot,
} from './monthlyParameterSources.ts';
import {
  buildScopeKey,
  normalizeCompetenceMonth,
  normalizeSnapshotValue,
  normalizeText,
  snapshotIdentity,
  toIsoDate,
} from './monthlyParameters.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RunStats = {
  created: number;
  updated: number;
  unchanged: number;
  checked: number;
  errors: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
};

function canManageMonthlyParameters(user: Record<string, unknown> | null | undefined): boolean {
  return user?.is_platform_admin === true || normalizeText(user?.role) === 'admin';
}

function currentIso() {
  return new Date().toISOString();
}

function currentDate() {
  return currentIso().slice(0, 10);
}

function buildRunSummary(stats: RunStats): string {
  return `${stats.checked} fonte(s) verificadas, ${stats.created} snapshot(s) criados, ${stats.updated} atualizados, ${stats.unchanged} inalterados, ${stats.errors.length} erro(s).`;
}

function normalizeTriggerType(value: unknown, dryRun: boolean): 'monthly_automation' | 'manual' | 'dry_run' {
  if (dryRun) return 'dry_run';
  const raw = normalizeText(value);
  if (raw === 'monthly_automation') return 'monthly_automation';
  return 'manual';
}

function makeProviderError(source: Record<string, unknown>, message: string) {
  return {
    ok: false,
    source_id: source.id || '',
    source_name: source.source_name || '',
    message,
  };
}

function makeProviderItemError(source: Record<string, unknown>, itemError: ProviderItemError) {
  const label = Number.isInteger(itemError.index) ? `Item ${itemError.index + 1}` : 'Item';
  return makeProviderError(source, `${label}: ${itemError.message}`);
}

async function upsertSnapshot(
  svc: any,
  workspaceId: string,
  competenceMonth: string,
  runId: string,
  snapshot: ProviderSnapshot,
  actorId: string,
  stats: RunStats,
  dryRun: boolean,
) {
  const normalizedValue = normalizeSnapshotValue(snapshot.value, snapshot.value_type);
  const normalized = {
    workspace_id: workspaceId,
    competence_month: competenceMonth,
    parameter_key: normalizeText(snapshot.parameter_key || snapshot.field_name),
    domain: normalizeText(snapshot.domain),
    entity_type: normalizeText(snapshot.entity_type),
    field_name: normalizeText(snapshot.field_name),
    scope_key: normalizeText(snapshot.scope_key || buildScopeKey(snapshot)),
    category: normalizeText(snapshot.category),
    asset_type: normalizeText(snapshot.asset_type),
    uf: normalizeText(snapshot.uf),
    regime_fiscal: normalizeText(snapshot.regime_fiscal),
    value_type: snapshot.value_type,
    value: normalizedValue.serialized,
    unit: normalizeText(snapshot.unit),
    source_name: normalizeText(snapshot.source_name),
    source_url: normalizeText(snapshot.source_url),
    source_date: toIsoDate(snapshot.source_date || currentDate()),
    retrieved_at: currentIso(),
    effective_start_date: toIsoDate(snapshot.effective_start_date || `${competenceMonth}-01`),
    effective_end_date: toIsoDate(snapshot.effective_end_date),
    confidence_level: normalizeText(snapshot.confidence_level || 'medium'),
    status: normalizeText(snapshot.status || 'active'),
    update_run_id: runId,
    raw_payload: snapshot.raw_payload || {},
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings : [],
    created_by_ai: snapshot.created_by_ai === true,
    approved_by: '',
    approved_at: '',
    notes: normalizeText(snapshot.notes),
  };

  const existing = await svc.entities.MonthlyParameterSnapshot.filter(
    {
      workspace_id: workspaceId,
      competence_month: competenceMonth,
      parameter_key: normalized.parameter_key,
      field_name: normalized.field_name,
      scope_key: normalized.scope_key,
    },
    '-created_date',
    100,
  );

  const sameIdentity = snapshotIdentity(normalized);
  const activeRows = existing.filter((row: Record<string, unknown>) => snapshotIdentity(row) === sameIdentity);
  const latest =
    activeRows.sort((a: Record<string, unknown>, b: Record<string, unknown>) => (Number(b.version) || 0) - (Number(a.version) || 0))[0] ||
    null;

  if (
    latest &&
    normalizeText(latest.value) === normalized.value &&
    normalizeText(latest.source_name) === normalized.source_name &&
    normalizeText(latest.source_url) === normalized.source_url &&
    normalizeText(latest.status) === normalized.status &&
    normalizeText(latest.effective_start_date) === normalized.effective_start_date &&
    normalizeText(latest.effective_end_date) === normalized.effective_end_date
  ) {
    stats.unchanged += 1;
    return;
  }

  if (dryRun) {
    if (latest) stats.updated += 1;
    else stats.created += 1;
    return;
  }

  if (latest && normalizeText(latest.status) === 'active') {
    try {
      await svc.entities.MonthlyParameterSnapshot.update(latest.id, {
        status: 'expired',
        effective_end_date: normalized.effective_start_date || currentDate(),
        notes: normalizeText(latest.notes || normalized.notes),
      });
    } catch (_) {
      // best-effort expiration, keep the new version creation flowing
    }
  }

  await svc.entities.MonthlyParameterSnapshot.create({
    ...normalized,
    version: latest ? (Number(latest.version) || 1) + 1 : 1,
    approved_by: actorId,
    approved_at: currentIso(),
  });

  if (latest) stats.updated += 1;
  else stats.created += 1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const competenceMonth = normalizeCompetenceMonth(body?.competence_month);
    const triggerType = normalizeTriggerType(body?.trigger_type, dryRun);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      user = null;
    }

    let actorId = 'system';
    const requestedWorkspaceId = normalizeText(body?.workspace_id);
    let targetWorkspaceId = requestedWorkspaceId;

    if (user) {
      const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
      if (!canManageMonthlyParameters(fresh)) {
        return json({ error: 'Somente administrador pode executar a atualizacao mensal manualmente.' }, 403);
      }

      actorId = normalizeText(fresh.id || user.id || 'system');
      const userWorkspaceId = normalizeText(fresh.workspace_id || user.workspace_id);
      if (!userWorkspaceId) {
        return json({ error: 'Workspace nao encontrado para o administrador autenticado.' }, 400);
      }
      if (requestedWorkspaceId && requestedWorkspaceId !== userWorkspaceId) {
        return json({ error: 'Voce nao pode executar a atualizacao para outro workspace.' }, 403);
      }
      targetWorkspaceId = userWorkspaceId;
    } else {
      const cronSecret = Deno.env.get('CRON_SHARED_SECRET');
      if (!cronSecret) {
        return json({ error: 'Execucao automatica indisponivel: CRON_SHARED_SECRET nao configurado.' }, 403);
      }
      if (req.headers.get('x-cron-secret') !== cronSecret) {
        return json({ error: 'Nao autorizado.' }, 401);
      }
    }

    if (!targetWorkspaceId) {
      return json({ error: 'workspace_id e obrigatorio para esta execucao.' }, 400);
    }

    const startedAt = currentIso();
    const run = dryRun
      ? null
      : await svc.entities.MonthlyParameterRun.create({
          workspace_id: targetWorkspaceId,
          competence_month: competenceMonth,
          started_at: startedAt,
          finished_at: '',
          status: 'running',
          trigger_type: triggerType,
          sources_checked_json: {},
          parameters_created: 0,
          parameters_updated: 0,
          parameters_unchanged: 0,
          errors_json: {},
          summary: '',
          created_by: actorId,
        });

    const stats: RunStats = {
      created: 0,
      updated: 0,
      unchanged: 0,
      checked: 0,
      errors: [],
      sources: [],
    };

    const sources = await svc.entities.MonthlyParameterSource.filter(
      { workspace_id: targetWorkspaceId, is_active: true },
      'priority',
      5000,
    );

    for (const source of sources) {
      stats.checked += 1;
      const result = await resolveMonthlyParameterSourceSnapshots(source, competenceMonth, {
        invokeLLM: (input: Record<string, unknown>) => svc.integrations.Core.InvokeLLM(input),
      });
      if (!result.ok) {
        const error = makeProviderError(source, result.message);
        stats.errors.push(error);
        if (Array.isArray(result.errors)) {
          result.errors.forEach((itemError) => stats.errors.push(makeProviderItemError(source, itemError)));
        }
        stats.sources.push({
          source_id: source.id || '',
          source_name: source.source_name || '',
          source_type: source.source_type || '',
          status: 'error',
          message: result.message,
          item_errors: Array.isArray(result.errors) ? result.errors : [],
        });
        continue;
      }

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        result.errors.forEach((itemError) => stats.errors.push(makeProviderItemError(source, itemError)));
      }

      stats.sources.push({
        source_id: source.id || '',
        source_name: source.source_name || '',
        source_type: source.source_type || '',
        status: result.errors.length > 0 ? 'partial_success' : 'ok',
        snapshots: result.snapshots.length,
        item_errors: result.errors,
      });

      for (const snapshot of result.snapshots) {
        try {
          await upsertSnapshot(
            svc,
            targetWorkspaceId,
            competenceMonth,
            run?.id || 'dry-run',
            snapshot,
            actorId,
            stats,
            dryRun,
          );
        } catch (error) {
          stats.errors.push(makeProviderError(source, `Falha ao persistir snapshot: ${String(error?.message || error)}`));
        }
      }
    }

    const finishedAt = currentIso();
    const status =
      stats.errors.length === 0
        ? 'success'
        : stats.created + stats.updated + stats.unchanged > 0
          ? 'partial_success'
          : 'failed';
    const summary = buildRunSummary(stats);

    if (!dryRun && run?.id) {
      await svc.entities.MonthlyParameterRun.update(run.id, {
        finished_at: finishedAt,
        status,
        sources_checked_json: {
          total: stats.checked,
          sources: stats.sources,
        },
        parameters_created: stats.created,
        parameters_updated: stats.updated,
        parameters_unchanged: stats.unchanged,
        errors_json: {
          total: stats.errors.length,
          errors: stats.errors,
        },
        summary,
      });
    }

    return json({
      ok: true,
      workspace_id: targetWorkspaceId,
      competence_month: competenceMonth,
      dry_run: dryRun,
      trigger_type: triggerType,
      persisted: dryRun === false,
      run_id: run?.id || '',
      status,
      parameters_created: stats.created,
      parameters_updated: stats.updated,
      parameters_unchanged: stats.unchanged,
      sources_checked: stats.checked,
      errors: stats.errors,
      summary,
    });
  } catch (error) {
    return json(
      {
        error: 'Nao foi possivel atualizar a base mensal de parametros.',
        details: String(error?.message || error),
      },
      500,
    );
  }
});
