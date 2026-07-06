import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Billing reminder e-mails for regular workspace users. Recipient (the caller's
// own address), template AND the day count are all resolved server-side from the
// workspace state — the client only triggers the action, it cannot inject an
// arbitrary "days" value or recipient (audit A1 + N15). The old manual payment
// flow was replaced by Stripe Checkout (stripeCheckout/stripeWebhook) 2026-07-06.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Whole days between a YYYY-MM-DD date and today (positive = future).
const daysUntil = (dateStr: string): number => {
  if (!dateStr) return 0;
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  if (Number.isNaN(target)) return 0;
  const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z').getTime();
  return Math.round((target - today) / DAY_MS);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    const ws = fresh?.workspace_id
      ? (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0]
      : null;
    if (!ws) return json({ error: 'Workspace não encontrado.' }, 400);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'trialReminder') {
      // Only send if the workspace really is in trial and it hasn't expired yet.
      const days = daysUntil(ws.trial_ends_at || '');
      if (ws.plan_status !== 'trial' || days < 0) return json({ ok: true, skipped: true });
      const subject = `Seu período de avaliação encerra em ${days} dia(s)`;
      const bodyText =
        `Olá!\n\nSeu período de avaliação encerra em ${days} dia(s). Para continuar sem ` +
        `interrupção, escolha um plano na área de Plano & Cobrança.\n\nAtenciosamente,\nEquipe Patrimônios AMZ`;
      try {
        await svc.integrations.Core.SendEmail({ to: user.email, subject, body: bodyText });
      } catch (_) { /* falha de e-mail não é crítica */ }
      return json({ ok: true });
    }

    if (action === 'paymentOverdue') {
      // Days since the plan expired; only send when actually overdue.
      const days = -daysUntil(ws.plan_expires_at || '');
      if (ws.plan_status !== 'active' || days <= 0) return json({ ok: true, skipped: true });
      const subject = `Pagamento atrasado há ${days} dia(s)`;
      const bodyText =
        `Olá!\n\nO pagamento da sua assinatura está atrasado há ${days} dia(s). Regularize na ` +
        `área de Plano & Cobrança para evitar a suspensão do acesso.\n\nAtenciosamente,\nEquipe Patrimônios AMZ`;
      try {
        await svc.integrations.Core.SendEmail({ to: user.email, subject, body: bodyText });
      } catch (_) { /* falha de e-mail não é crítica */ }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (_) {
    return json({ error: 'Não foi possível processar a notificação.' }, 500);
  }
});
