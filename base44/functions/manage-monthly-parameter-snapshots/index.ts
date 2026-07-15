import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import { normalizeText, snapshotIdentity } from './monthlyParameters.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AuditAction = 'updated';

function canManageMonthlyParameters(user: Record<string, unknown> | null | undefined): boolean {
  return user?.is_platform_admin === true || normalizeText(user?.role) === 'admin';
}

function currentIso() {
  return new Date().toISOString();
}

function pickSnapshotForClient(snapshot: Record<string, unknown>) {
  return {
    id: snapshot.id || '',
    workspace_id: normalizeText(snapshot.workspace_id),
    competence_month: normalizeText(snapshot.competence_month),
    parameter_key: normalizeText(snapshot.parameter_key),
    domain: normalizeText(snapshot.domain),
    entity_type: normalizeText(snapshot.entity_type),
    field_name: normalizeText(snapshot.field_name),
    scope_key: normalizeText(snapshot.scope_key),
    category: normalizeText(snapshot.category),
    asset_type: normalizeText(snapshot.asset_type),
    uf: normalizeText(snapshot.uf),
    regime_fiscal: normalizeText(snapshot.regime_fiscal),
    value: snapshot.value,
    value_type: normalizeText(snapshot.value_type),
    unit: normalizeText(snapshot.unit),
    source_name: normalizeText(snapshot.source_name),
    source_url: normalizeText(snapshot.source_url),
    source_date: normalizeText(snapshot.source_date),
    retrieved_at: normalizeText(snapshot.retrieved_at),
    effective_start_date: normalizeText(snapshot.effective_start_date),
    effective_end_date: normalizeText(snapshot.effective_end_date),
    version: Number(snapshot.version) || 1,
    confidence_level: normalizeText(snapshot.confidence_level),
    status: normalizeText(snapshot.status),
    update_run_id: normalizeText(snapshot.update_run_id),
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings : [],
    created_by_ai: snapshot.created_by_ai === true,
    approved_by: normalizeText(snapshot.approved_by),
    approved_at: normalizeText(snapshot.approved_at),
    notes: normalizeText(snapshot.notes),
  };
}

function computeChangedFields(oldObj: Record<string, unknown>, newObj: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) changed.push(key);
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
      entity_type: 'MonthlyParameterSnapshot',
      entity_id: entityId,
      entity_label: entityLabel,
      summary,
      changed_fields: oldData && newData ? computeChangedFields(oldData, newData) : [],
      old_data: oldData ? JSON.stringify(oldData, null, 2).slice(0, 8000) : '',
      new_data: newData ? JSON.stringify(newData, null, 2).slice(0, 8000) : '',
    });
  } catch (_) {
    // Auditoria backend e best-effort para nao bloquear a operacao principal.
  }
}

async function requirePlatformAdmin(base44: any) {
  const user = await base44.auth.me();
  if (!user) return { error: { status: 401, body: { error: 'Unauthorized' } } };

  const svc = base44.asServiceRole;
  const me = (await svc.entities.User.filter({ id: user.id }))[0];
  if (!canManageMonthlyParameters(me)) {
    return {
      error: {
        status: 403,
        body: { error: 'Voce nao tem permissao para aprovar snapshots mensais.' },
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

async function getSnapshotForWorkspace(svc: any, workspaceId: string, snapshotId: string) {
  const rows = await svc.entities.MonthlyParameterSnapshot.filter(
    { id: snapshotId, workspace_id: workspaceId },
    '-created_date',
    1,
  );
  return rows[0] || null;
}

async function expireActiveConflicts(
  svc: any,
  workspaceId: string,
  snapshot: Record<string, unknown>,
  actorId: string,
) {
  const rows = await svc.entities.MonthlyParameterSnapshot.filter(
    {
      workspace_id: workspaceId,
      competence_month: normalizeText(snapshot.competence_month),
      parameter_key: normalizeText(snapshot.parameter_key),
      field_name: normalizeText(snapshot.field_name),
      scope_key: normalizeText(snapshot.scope_key),
      status: 'active',
    },
    '-created_date',
    100,
  );

  const targetIdentity = snapshotIdentity(snapshot);
  const expired: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    if (normalizeText(row.id) === normalizeText(snapshot.id)) continue;
    if (snapshotIdentity(row) !== targetIdentity) continue;

    const updated = await svc.entities.MonthlyParameterSnapshot.update(row.id, {
      status: 'expired',
      effective_end_date: normalizeText(snapshot.effective_start_date || row.effective_end_date),
      approved_by: actorId,
      approved_at: currentIso(),
      notes: normalizeText(row.notes),
    });
    expired.push(updated);
  }
  return expired;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const guard = await requirePlatformAdmin(base44);
    if ('error' in guard) return json(guard.error.body, guard.error.status);

    const { svc, me, workspaceId } = guard;
    const body = await req.json().catch(() => ({}));
    const operation = normalizeText(body.operation).toLowerCase();
    const requestedWorkspaceId = normalizeText(body.workspace_id);

    if (requestedWorkspaceId && requestedWorkspaceId !== workspaceId) {
      return json({ error: 'Voce nao pode operar snapshots de outro workspace.' }, 403);
    }

    if (operation === 'list') {
      const status = normalizeText(body.status);
      const query: Record<string, unknown> = { workspace_id: workspaceId };
      if (status) query.status = status;
      const rows = await svc.entities.MonthlyParameterSnapshot.filter(query, '-retrieved_at', 500);
      return json({ ok: true, snapshots: rows.map((row: Record<string, unknown>) => pickSnapshotForClient(row)) });
    }

    if (operation === 'approve' || operation === 'reject' || operation === 'expire') {
      const snapshotId = normalizeText(body.id);
      if (!snapshotId) return json({ error: 'id e obrigatorio para alterar snapshot.' }, 400);

      const existing = await getSnapshotForWorkspace(svc, workspaceId, snapshotId);
      if (!existing) return json({ error: 'Snapshot mensal nao encontrado neste workspace.' }, 404);

      const oldStatus = normalizeText(existing.status);
      const safeOld = pickSnapshotForClient(existing);
      const actorId = normalizeText(me.id);

      if (operation === 'approve') {
        if (oldStatus === 'active') {
          return json({ ok: true, snapshot: safeOld, expired_conflicts: 0, message: 'Snapshot ja estava ativo.' });
        }
        if (oldStatus !== 'pending_review' && oldStatus !== 'draft') {
          return json({ error: 'Somente snapshots pendentes ou rascunhos podem ser aprovados.' }, 400);
        }

        const expired = await expireActiveConflicts(svc, workspaceId, existing, actorId);
        const updated = await svc.entities.MonthlyParameterSnapshot.update(snapshotId, {
          status: 'active',
          approved_by: actorId,
          approved_at: currentIso(),
          notes: normalizeText(existing.notes),
        });
        const safeUpdated = pickSnapshotForClient(updated);

        await writeAudit(
          svc,
          me,
          'updated',
          snapshotId,
          normalizeText(updated.parameter_key || updated.field_name),
          `Aprovou snapshot mensal ${normalizeText(updated.parameter_key || updated.field_name)}.`,
          {
            ...safeOld,
            old_status: oldStatus,
          },
          {
            ...safeUpdated,
            new_status: 'active',
            approved_by: actorId,
            expired_conflict_ids: expired.map((row) => normalizeText(row.id)),
          },
        );

        return json({
          ok: true,
          snapshot: safeUpdated,
          expired_conflicts: expired.length,
          message: expired.length > 0
            ? `Snapshot aprovado e ${expired.length} ativo(s) anterior(es) expirado(s).`
            : 'Snapshot aprovado.',
        });
      }

      if (operation === 'reject') {
        const reason = normalizeText(body.rejection_reason || body.notes);
        if (!reason) return json({ error: 'Informe o motivo da rejeicao.' }, 400);
        if (oldStatus === 'rejected') {
          return json({ ok: true, snapshot: safeOld, message: 'Snapshot ja estava rejeitado.' });
        }
        if (oldStatus === 'active') {
          return json({ error: 'Snapshot ativo deve ser expirado, nao rejeitado.' }, 400);
        }

        const updated = await svc.entities.MonthlyParameterSnapshot.update(snapshotId, {
          status: 'rejected',
          approved_by: actorId,
          approved_at: currentIso(),
          notes: reason,
        });
        const safeUpdated = pickSnapshotForClient(updated);

        await writeAudit(
          svc,
          me,
          'updated',
          snapshotId,
          normalizeText(updated.parameter_key || updated.field_name),
          `Rejeitou snapshot mensal ${normalizeText(updated.parameter_key || updated.field_name)}.`,
          {
            ...safeOld,
            old_status: oldStatus,
          },
          {
            ...safeUpdated,
            new_status: 'rejected',
            rejected_by: actorId,
            reason,
          },
        );

        return json({ ok: true, snapshot: safeUpdated, message: 'Snapshot rejeitado.' });
      }

      if (operation === 'expire') {
        if (oldStatus === 'expired') {
          return json({ ok: true, snapshot: safeOld, message: 'Snapshot ja estava expirado.' });
        }
        if (oldStatus !== 'active') {
          return json({ error: 'Somente snapshots ativos podem ser expirados.' }, 400);
        }

        const updated = await svc.entities.MonthlyParameterSnapshot.update(snapshotId, {
          status: 'expired',
          effective_end_date: normalizeText(body.effective_end_date || existing.effective_end_date || currentIso().slice(0, 10)),
          approved_by: actorId,
          approved_at: currentIso(),
          notes: normalizeText(body.notes || existing.notes),
        });
        const safeUpdated = pickSnapshotForClient(updated);

        await writeAudit(
          svc,
          me,
          'updated',
          snapshotId,
          normalizeText(updated.parameter_key || updated.field_name),
          `Expirou snapshot mensal ${normalizeText(updated.parameter_key || updated.field_name)}.`,
          {
            ...safeOld,
            old_status: oldStatus,
          },
          {
            ...safeUpdated,
            new_status: 'expired',
            expired_by: actorId,
          },
        );

        return json({ ok: true, snapshot: safeUpdated, message: 'Snapshot expirado.' });
      }
    }

    return json({ error: 'Operacao invalida para manage-monthly-parameter-snapshots.' }, 400);
  } catch (error) {
    return json(
      {
        error: 'Nao foi possivel gerenciar snapshots mensais.',
        details: String(error?.message || error),
      },
      500,
    );
  }
});
