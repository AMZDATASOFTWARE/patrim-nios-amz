import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Scheduled sweep that turns "expiring in X days" conditions into durable,
// persisted alerts (in-app Notification + e-mail), instead of the client-only
// derived alerts computed on every screen load (src/lib/notifications.js).
//
// Trigger: a scheduled (cron) automation declared in function.jsonc (runs daily).
// It can ALSO be called manually by a platform admin for testing / catch-up,
// with { dry_run: true } to preview without sending.
//
// Idempotency: each (source, milestone) pair is recorded in AlertDispatchLog and
// never re-sent — so re-runs on the same day are harmless (this bounds any spam).
//
// Auth model: a cron trigger arrives with no user (auth.me() is null) and runs
// the full sweep via service-role. A logged-in caller must be platform_admin,
// otherwise 403. (Residual: an unauthenticated external POST could trigger it,
// but the dedup log bounds the effect to one legitimate alert per real event.)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Milestones (days before expiry) that fire an alert.
const MILESTONES = [30, 15, 7, 1];

const DAY_MS = 24 * 60 * 60 * 1000;
const todayUTC = () => new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z').getTime();

// Whole days from today to a YYYY-MM-DD date (positive = future).
function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.round((target - todayUTC()) / DAY_MS);
}

// Returns the milestone this date currently sits on (exact match), or null.
function matchedMilestone(dateStr: string): number | null {
  const d = daysUntil(dateStr);
  if (d === null) return null;
  return MILESTONES.includes(d) ? d : null;
}

interface AlertSpec {
  workspace_id: string;
  source_type: 'warranty' | 'review' | 'contract' | 'ipva' | 'loan';
  source_id: string;
  milestone: number;
  title: string;
  body: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Guard: block regular authenticated users; allow cron (no user) or platform admin.
    // Optional shared-secret layer (security audit M5): if CRON_SHARED_SECRET is set, an
    // unauthenticated caller must present it via x-cron-secret. No-op while unset, so this
    // never breaks the already-configured daily automation.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
      if (!fresh?.is_platform_admin) {
        return json({ error: 'Somente o administrador da plataforma pode disparar os alertas manualmente.' }, 403);
      }
    } else {
      const cronSecret = Deno.env.get('CRON_SHARED_SECRET');
      if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
        return json({ error: 'Não autorizado.' }, 401);
      }
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const workspaces = await svc.entities.Workspace.filter({}, '-created_date', 5000);
    // Only active/trial tenants get alerts (suspended/cancelled are dormant).
    const activeWorkspaces = workspaces.filter(
      (w: Record<string, unknown>) => w.plan_status === 'active' || w.plan_status === 'trial'
    );

    const specs: AlertSpec[] = [];

    for (const ws of activeWorkspaces) {
      const wsId = ws.id as string;
      const assets = await svc.entities.Asset.filter({ workspace_id: wsId }, '-created_date', 5000);
      for (const a of assets) {
        const name = (a.name as string) || 'Ativo';
        const wM = matchedMilestone(a.warranty_expiry_date as string);
        if (wM !== null) specs.push({
          workspace_id: wsId, source_type: 'warranty', source_id: a.id, milestone: wM,
          title: 'Garantia vencendo', body: `A garantia do ativo "${name}" vence em ${wM} dia(s).`,
        });
        const rM = matchedMilestone(a.next_review_date as string);
        if (rM !== null) specs.push({
          workspace_id: wsId, source_type: 'review', source_id: a.id, milestone: rM,
          title: 'Revisao programada', body: `A revisao do ativo "${name}" esta agendada para daqui a ${rM} dia(s).`,
        });
        const iM = matchedMilestone(a.vehicle_ipva_due_date as string);
        if (iM !== null) specs.push({
          workspace_id: wsId, source_type: 'ipva', source_id: a.id, milestone: iM,
          title: 'IPVA vencendo', body: `O IPVA do veiculo "${name}" vence em ${iM} dia(s).`,
        });
      }

      const contracts = await svc.entities.Contract.filter({ workspace_id: wsId }, '-created_date', 5000);
      for (const c of contracts) {
        const cM = matchedMilestone(c.end_date as string);
        if (cM !== null) {
          const label = (c.title as string) || (c.type as string) || 'Contrato';
          specs.push({
            workspace_id: wsId, source_type: 'contract', source_id: c.id, milestone: cM,
            title: 'Contrato/apolice vencendo', body: `"${label}" vence em ${cM} dia(s).`,
          });
        }
      }

      // Emprestimos de ativos com devolucao prevista se aproximando (so os ainda em aberto).
      const loans = await svc.entities.AssetLoan.filter({ workspace_id: wsId, status: 'emprestado' }, '-created_date', 5000);
      for (const l of loans) {
        const lM = matchedMilestone(l.expected_return_date as string);
        if (lM !== null) {
          const assetLabel = (l.asset_name as string) || 'Ativo';
          const borrower = (l.borrower_name as string) || 'destinatario nao informado';
          specs.push({
            workspace_id: wsId, source_type: 'loan', source_id: l.id, milestone: lM,
            title: 'Devolucao de emprestimo se aproximando',
            body: `A devolucao do ativo "${assetLabel}" emprestado a ${borrower} esta prevista para daqui a ${lM} dia(s).`,
          });
        }
      }
    }

    let sent = 0;
    let skipped = 0;
    const ownerByWs: Record<string, string> = {};
    activeWorkspaces.forEach((w: Record<string, unknown>) => { ownerByWs[w.id as string] = (w.owner_email as string) || ''; });

    for (const spec of specs) {
      const alertKey = `${spec.source_type}:${spec.source_id}:${spec.milestone}`;
      // Dedup: already dispatched this exact milestone for this source?
      const existing = await svc.entities.AlertDispatchLog.filter(
        { workspace_id: spec.workspace_id, alert_key: alertKey }, '-created_date', 1, 0, ['id']
      );
      if (existing.length > 0) { skipped++; continue; }
      if (dryRun) { sent++; continue; }

      // In-app broadcast notification (visible to the whole workspace).
      try {
        await svc.entities.Notification.create({
          workspace_id: spec.workspace_id,
          user_email: '',
          title: spec.title,
          body: spec.body,
          type: 'warning',
          link: '/Notifications',
          read: false,
        });
      } catch (_) { /* non-critical */ }

      // E-mail to the workspace owner.
      const owner = ownerByWs[spec.workspace_id];
      if (owner) {
        try {
          await svc.integrations.Core.SendEmail({
            to: owner,
            subject: spec.title,
            body: `${spec.body}\n\nAcesse o sistema para mais detalhes.\n\nAtenciosamente,\nEquipe Patrimonios AMZ`,
          });
        } catch (_) { /* non-critical */ }
      }

      // Record the dispatch so it is never re-sent for this milestone.
      try {
        await svc.entities.AlertDispatchLog.create({
          workspace_id: spec.workspace_id,
          source_type: spec.source_type,
          source_id: spec.source_id,
          alert_key: alertKey,
          sent_at: new Date().toISOString(),
          channel: owner ? 'both' : 'in_app',
        });
      } catch (_) { /* non-critical */ }

      sent++;
    }

    return json({ ok: true, dry_run: dryRun, candidates: specs.length, sent, skipped });
  } catch (_) {
    return json({ error: 'Nao foi possivel processar os alertas.' }, 500);
  }
});
