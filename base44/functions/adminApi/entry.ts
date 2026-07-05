import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Platform-admin API. Every action is gated server-side on the caller's
// is_platform_admin flag, re-read via service role — never trusted from the client.
// This replaces the previous client-side admin panels that queried all workspaces /
// payment requests directly (which the new per-tenant RLS now blocks).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // Re-read the caller from the server; the client copy of is_platform_admin is not trusted.
    const fresh = (await base44.asServiceRole.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.is_platform_admin) return json({ error: 'Acesso negado.' }, 403);

    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'listWorkspaces') {
      const workspaces = await svc.entities.Workspace.list('-created_date', 1000);
      return json({ ok: true, workspaces });
    }

    if (action === 'listPaymentRequests') {
      const paymentRequests = await svc.entities.PaymentRequest.list('-created_date', 500);
      return json({ ok: true, paymentRequests });
    }

    if (action === 'updateWorkspacePlan') {
      const { workspaceId, plan_status, plan, extendTrialDays } = body;
      if (!workspaceId) return json({ error: 'workspaceId é obrigatório.' }, 400);
      const patch: Record<string, unknown> = {};
      if (plan_status) patch.plan_status = plan_status;
      if (plan) patch.plan = plan;
      if (plan_status === 'active') {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        patch.plan_expires_at = d.toISOString().split('T')[0];
      }
      if (extendTrialDays) {
        const d = new Date();
        d.setDate(d.getDate() + Number(extendTrialDays));
        patch.trial_ends_at = d.toISOString().split('T')[0];
      }
      const workspace = await svc.entities.Workspace.update(workspaceId, patch);
      return json({ ok: true, workspace });
    }

    if (action === 'confirmPayment' || action === 'rejectPayment') {
      const { paymentRequestId, admin_notes } = body;
      if (!paymentRequestId) return json({ error: 'paymentRequestId é obrigatório.' }, 400);
      const pr = (await svc.entities.PaymentRequest.filter({ id: paymentRequestId }))[0];
      if (!pr) return json({ error: 'Solicitação não encontrada.' }, 404);

      if (action === 'rejectPayment') {
        await svc.entities.PaymentRequest.update(pr.id, { status: 'rejected', admin_notes: admin_notes || '' });
        return json({ ok: true });
      }

      await svc.entities.PaymentRequest.update(pr.id, { status: 'confirmed', admin_notes: admin_notes || '' });
      const ws = (await svc.entities.Workspace.filter({ id: pr.workspace_id }))[0];
      if (ws) {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        await svc.entities.Workspace.update(ws.id, {
          plan: pr.plan,
          plan_status: 'active',
          plan_expires_at: d.toISOString().split('T')[0],
        });
      }
      try {
        await svc.integrations.Core.SendEmail({
          to: pr.owner_email,
          subject: `Pagamento confirmado — plano ${pr.plan} ativado`,
          body: 'Olá!\n\nSeu pagamento foi confirmado e o plano está ativo. Obrigado!',
        });
      } catch (_) {
        // E-mail de confirmação não deve bloquear a ativação do plano.
      }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (_) {
    return json({ error: 'Erro ao processar a solicitação.' }, 500);
  }
});
