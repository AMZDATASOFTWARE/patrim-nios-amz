import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Billing reminder e-mails for regular workspace users. Recipients and templates
// are fixed server-side so the client can never send arbitrary e-mail (audit A1).
// The old manual payment-request flow (PIX + human confirmation) was replaced by
// Stripe Checkout (stripeCheckout/stripeWebhook) on 2026-07-06.

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

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'trialReminder' || action === 'paymentOverdue') {
      const days = Number(body.days) || 0;
      const subject =
        action === 'trialReminder'
          ? `Seu período de avaliação encerra em ${days} dia(s)`
          : `Pagamento atrasado há ${days} dia(s)`;
      const bodyText =
        action === 'trialReminder'
          ? `Olá!\n\nSeu período de avaliação encerra em ${days} dia(s). Para continuar sem interrupção, escolha um plano na área de Plano & Cobrança.\n\nAtenciosamente,\nEquipe Patrimônios AMZ`
          : `Olá!\n\nO pagamento da sua assinatura está atrasado há ${days} dia(s). Regularize na área de Plano & Cobrança para evitar a suspensão do acesso.\n\nAtenciosamente,\nEquipe Patrimônios AMZ`;
      try {
        // Recipient is always the caller's own address, resolved server-side.
        await svc.integrations.Core.SendEmail({ to: user.email, subject, body: bodyText });
      } catch (_) {
        // Silencia falha de e-mail — não é crítico para o fluxo.
      }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (_) {
    return json({ error: 'Não foi possível processar a notificação.' }, 500);
  }
});
