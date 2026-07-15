import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Monthly appropriation of ICMS/CIAP credits (item 5). For each CiapCredit still
// `em_apropriacao` with remaining installments, appropriates ONE installment
// (icms_value / installments_total), logs it in CiapAppropriationLog, and marks
// the credit `concluido` when the last installment is appropriated.
//
// Trigger: a scheduled (cron) automation created in the Base44 dashboard
// (monthly) — NOTE: this project's MCP sync does NOT auto-create automations from
// function.jsonc, so the schedule must be wired in the dashboard. The function
// also runs when invoked manually by a platform admin, with { dry_run: true }.
//
// IMPORTANT (fiscal): the appropriation here is the simple straight 1/48 rule.
// The real CIAP rule proportions the monthly credit by the ratio of taxed
// outbound sales — the default numbers MUST be reviewed with an accountant before
// relying on them for actual tax filing.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function currentCompetence(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function findCiapCoefficientReferences(svc: any, competence: string, workspaceIds: string[]) {
  const uniqueWorkspaceIds = Array.from(new Set(workspaceIds.filter(Boolean)));
  const references = [];

  for (const workspaceId of uniqueWorkspaceIds) {
    const rows = await svc.entities.MonthlyParameterSnapshot.filter(
      {
        workspace_id: workspaceId,
        competence_month: competence,
      },
      '-created_date',
      100,
    );
    const coefficient = rows.find((row: any) => (
      String(row.status || '') === 'active' &&
      String(row.domain || '') === 'ciap' &&
      String(row.field_name || '') === 'ciap_credit_coefficient'
    ));

    if (coefficient) {
      references.push({
        workspace_id: workspaceId,
        snapshot_id: coefficient.id || '',
        value: coefficient.value,
        unit: coefficient.unit || '',
        source_name: coefficient.source_name || '',
        competence_month: coefficient.competence_month || competence,
      });
    }
  }

  return references;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Cron has no user; a logged-in caller must be platform admin.
    // Optional shared-secret layer (security audit M5): if CRON_SHARED_SECRET is set, an
    // unauthenticated caller must present it via x-cron-secret. No-op while unset, so this
    // never breaks the already-configured monthly automation.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
      if (!fresh?.is_platform_admin) {
        return json({ error: 'Somente o administrador da plataforma pode disparar a apropriacao manualmente.' }, 403);
      }
    } else {
      const cronSecret = Deno.env.get('CRON_SHARED_SECRET');
      if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
        return json({ error: 'Não autorizado.' }, 401);
      }
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const competence = String(body?.competence || currentCompetence());

    const credits = await svc.entities.CiapCredit.filter({ status: 'em_apropriacao' }, '-created_date', 5000);

    let appropriated = 0;
    let skipped = 0;
    let concluded = 0;
    const coefficientReferences = await findCiapCoefficientReferences(
      svc,
      competence,
      credits.map((c: any) => c.workspace_id),
    );
    const warnings = [
      'Apropriacao CIAP ainda usa calculo simplificado 1/48. Coeficiente mensal e retornado apenas como referencia nesta fase.',
    ];
    if (coefficientReferences.length === 0) {
      warnings.push('Nenhum snapshot active de ciap_credit_coefficient encontrado para a competencia.');
    }

    for (const c of credits) {
      const total = Number(c.installments_total) || 48;
      const done = Number(c.installments_appropriated) || 0;
      if (done >= total) { skipped++; continue; }

      // Idempotencia: nao apropriar duas vezes a mesma competencia para o mesmo credito.
      const already = await svc.entities.CiapAppropriationLog.filter(
        { ciap_credit_id: c.id, competence_month: competence }, '-created_date', 1, 0, ['id']
      );
      if (already.length > 0) { skipped++; continue; }

      const monthly = Number(c.monthly_credit_value) || (Number(c.icms_value) || 0) / total;
      if (dryRun) { appropriated++; continue; }

      const nextInstallment = done + 1;
      try {
        await svc.entities.CiapAppropriationLog.create({
          workspace_id: c.workspace_id,
          ciap_credit_id: c.id,
          asset_id: c.asset_id || '',
          asset_name: c.asset_name || '',
          competence_month: competence,
          credit_value: monthly,
          installment_number: nextInstallment,
          created_at: new Date().toISOString(),
        });
        const patch: Record<string, unknown> = {
          installments_appropriated: nextInstallment,
          monthly_credit_value: monthly,
        };
        if (nextInstallment >= total) { patch.status = 'concluido'; concluded++; }
        await svc.entities.CiapCredit.update(c.id, patch);
        appropriated++;
      } catch (_) { skipped++; }
    }

    return json({
      ok: true,
      dry_run: dryRun,
      competence,
      candidates: credits.length,
      appropriated,
      concluded,
      skipped,
      coefficient_references: coefficientReferences,
      warnings,
    });
  } catch (_) {
    return json({ error: 'Nao foi possivel apropriar os creditos CIAP.' }, 500);
  }
});
