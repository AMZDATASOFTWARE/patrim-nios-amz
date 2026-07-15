import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import { normalizeCompetenceMonth, normalizeText } from './monthlyParameters.ts';
import {
  normalizeMonthlyParameterSourceInput,
  resolveMonthlyParameterSourceSnapshots,
  sanitizeSourceForClient,
} from './monthlyParameterSources.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AuditAction = 'created' | 'updated';

function canManageMonthlyParameters(user: Record<string, unknown> | null | undefined): boolean {
  return user?.is_platform_admin === true || normalizeText(user?.role) === 'admin';
}

function pickComparableSource(source: Record<string, unknown>) {
  return sanitizeSourceForClient({
    id: source.id || '',
    workspace_id: normalizeText(source.workspace_id),
    parameter_key: normalizeText(source.parameter_key),
    domain: normalizeText(source.domain),
    source_type: normalizeText(source.source_type),
    source_name: normalizeText(source.source_name),
    source_url: normalizeText(source.source_url),
    is_active: source.is_active === true,
    priority: Number(source.priority) || 0,
    parser_config_json: source.parser_config_json || {},
    notes: normalizeText(source.notes),
    created_by: normalizeText(source.created_by),
    updated_by: normalizeText(source.updated_by),
  });
}

function computeChangedFields(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changed.push(key);
    }
  }
  return changed;
}

async function writeAudit(
  svc: any,
  me: Record<string, unknown>,
  action: AuditAction,
  entityId: string,
  entityLabel: string,
  summary: string,
  oldData: Record<string, unknown> | null = null,
  newData: Record<string, unknown> | null = null,
) {
  try {
    await svc.entities.AuditLog.create({
      workspace_id: normalizeText(me.workspace_id),
      actor_email: normalizeText(me.email),
      actor_name: normalizeText(me.full_name || me.email),
      action,
      entity_type: 'MonthlyParameterSource',
      entity_id: entityId,
      entity_label: entityLabel,
      summary,
      changed_fields: oldData && newData ? computeChangedFields(oldData, newData) : [],
      old_data: oldData ? JSON.stringify(oldData, null, 2).slice(0, 8000) : '',
      new_data: newData ? JSON.stringify(newData, null, 2).slice(0, 8000) : '',
    });
  } catch (_) {
    // Auditoria backend segue best-effort para nao bloquear a operacao principal.
  }
}

async function requirePlatformAdmin(base44: any) {
  const user = await base44.auth.me();
  if (!user) {
    return { error: { status: 401, body: { error: 'Unauthorized' } } };
  }

  const svc = base44.asServiceRole;
  const me = (await svc.entities.User.filter({ id: user.id }))[0];
  if (!canManageMonthlyParameters(me)) {
    return {
      error: {
        status: 403,
        body: { error: 'Voce nao tem permissao para gerenciar fontes de parametros mensais.' },
      },
    };
  }

  const workspaceId = normalizeText(me.workspace_id || user.workspace_id);
  if (!workspaceId) {
    return {
      error: {
        status: 400,
        body: { error: 'Workspace nao encontrado para o usuario autenticado.' },
      },
    };
  }

  return { user, svc, me, workspaceId };
}

async function getSourceForWorkspace(svc: any, workspaceId: string, sourceId: string) {
  const rows = await svc.entities.MonthlyParameterSource.filter(
    { id: sourceId, workspace_id: workspaceId },
    '-created_date',
    1,
  );
  return rows[0] || null;
}

function buildTestPreview(snapshots: Array<Record<string, unknown>>) {
  return snapshots.slice(0, 5).map((snapshot) => ({
    parameter_key: normalizeText(snapshot.parameter_key),
    domain: normalizeText(snapshot.domain),
    field_name: normalizeText(snapshot.field_name),
    value: snapshot.value,
    value_type: normalizeText(snapshot.value_type),
    unit: normalizeText(snapshot.unit),
    confidence_level: normalizeText(snapshot.confidence_level),
    status: normalizeText(snapshot.status),
    source_name: normalizeText(snapshot.source_name),
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings : [],
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const guard = await requirePlatformAdmin(base44);
    if ('error' in guard) {
      return json(guard.error.body, guard.error.status);
    }

    const { svc, me, workspaceId } = guard;
    const body = await req.json().catch(() => ({}));
    const operation = normalizeText(body.operation).toLowerCase();
    const requestedWorkspaceId = normalizeText(body.workspace_id);

    if (requestedWorkspaceId && requestedWorkspaceId !== workspaceId) {
      return json({ error: 'Voce nao pode operar fontes de outro workspace.' }, 403);
    }

    if (operation === 'list') {
      const rows = await svc.entities.MonthlyParameterSource.filter(
        { workspace_id: workspaceId },
        'priority',
        5000,
      );

      const sources = rows
        .map((row: Record<string, unknown>) => sanitizeSourceForClient(row))
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          return (Number(a.priority) || 0) - (Number(b.priority) || 0);
        });

      return json({ ok: true, sources });
    }

    if (operation === 'create') {
      const normalized = normalizeMonthlyParameterSourceInput(body.source || {}, {
        workspaceId,
        actorId: normalizeText(me.id),
      });

      const created = await svc.entities.MonthlyParameterSource.create(normalized);
      const safeCreated = pickComparableSource(created);
      await writeAudit(
        svc,
        me,
        'created',
        normalizeText(created.id),
        normalized.source_name,
        `Criou a fonte mensal "${normalized.source_name}".`,
        null,
        safeCreated,
      );

      return json({ ok: true, source: safeCreated });
    }

    if (operation === 'update') {
      const sourceId = normalizeText(body.id);
      if (!sourceId) return json({ error: 'id e obrigatorio para update.' }, 400);

      const existing = await getSourceForWorkspace(svc, workspaceId, sourceId);
      if (!existing) return json({ error: 'Fonte mensal nao encontrada neste workspace.' }, 404);

      const normalized = normalizeMonthlyParameterSourceInput(body.source || {}, {
        workspaceId,
        actorId: normalizeText(me.id),
        existing,
      });

      const updated = await svc.entities.MonthlyParameterSource.update(sourceId, normalized);
      const safeOld = pickComparableSource(existing);
      const safeUpdated = pickComparableSource(updated);
      await writeAudit(
        svc,
        me,
        'updated',
        sourceId,
        normalized.source_name,
        `Atualizou a fonte mensal "${normalized.source_name}".`,
        safeOld,
        safeUpdated,
      );

      return json({ ok: true, source: safeUpdated });
    }

    if (operation === 'deactivate' || operation === 'reactivate') {
      const sourceId = normalizeText(body.id);
      if (!sourceId) return json({ error: 'id e obrigatorio para alterar status da fonte.' }, 400);

      const existing = await getSourceForWorkspace(svc, workspaceId, sourceId);
      if (!existing) return json({ error: 'Fonte mensal nao encontrada neste workspace.' }, 404);

      const nextActive = operation === 'reactivate';
      const updated = await svc.entities.MonthlyParameterSource.update(sourceId, {
        is_active: nextActive,
        updated_by: normalizeText(me.id),
      });

      const safeOld = pickComparableSource(existing);
      const safeUpdated = pickComparableSource(updated);
      await writeAudit(
        svc,
        me,
        'updated',
        sourceId,
        normalizeText(updated.source_name || existing.source_name),
        `${nextActive ? 'Reativou' : 'Inativou'} a fonte mensal "${normalizeText(updated.source_name || existing.source_name)}".`,
        safeOld,
        safeUpdated,
      );

      return json({ ok: true, source: safeUpdated });
    }

    if (operation === 'test') {
      const sourceId = normalizeText(body.id);
      const draft = typeof body.source === 'object' && body.source ? body.source : {};
      let existing = null;

      if (sourceId) {
        existing = await getSourceForWorkspace(svc, workspaceId, sourceId);
        if (!existing) return json({ error: 'Fonte mensal nao encontrada neste workspace.' }, 404);
      }

      const normalized = normalizeMonthlyParameterSourceInput(draft, {
        workspaceId,
        actorId: normalizeText(me.id),
        existing,
      });

      const competenceMonth = normalizeCompetenceMonth(body.competence_month);
      const result = await resolveMonthlyParameterSourceSnapshots(normalized, competenceMonth, {
        invokeLLM: (input: Record<string, unknown>) => svc.integrations.Core.InvokeLLM(input),
      });
      const safeSource = sanitizeSourceForClient(normalized as unknown as Record<string, unknown>);

      await writeAudit(
        svc,
        me,
        'updated',
        sourceId,
        normalizeText(normalized.source_name),
        `Testou a fonte mensal "${normalizeText(normalized.source_name)}".`,
        null,
        safeSource,
      );

      if (!result.ok) {
        return json({
          ok: false,
          source: safeSource,
          competence_month: competenceMonth,
          provider_implemented: result.provider_implemented,
          error: result.message,
          errors: Array.isArray(result.errors) ? result.errors : [],
        });
      }

      return json({
        ok: true,
        source: safeSource,
        competence_month: competenceMonth,
        simulated_snapshots: result.snapshots.length,
        preview: buildTestPreview(result.snapshots),
        errors: result.errors,
        summary: result.errors.length > 0
          ? `${result.snapshots.length} snapshot(s) simulados sem persistencia; ${result.errors.length} item(ns) rejeitado(s).`
          : `${result.snapshots.length} snapshot(s) simulados sem persistencia.`,
      });
    }

    return json({ error: 'Operacao invalida para manage-monthly-parameter-sources.' }, 400);
  } catch (error) {
    return json(
      {
        error: 'Nao foi possivel gerenciar fontes de parametros mensais.',
        details: String(error?.message || error),
      },
      500,
    );
  }
});
