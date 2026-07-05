import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Billing notifications for regular workspace users. Recipients and templates are
// fixed server-side so the client can never send arbitrary e-mail (security audit A1).
// Platform inbox that receives new payment-request notifications.
const PLATFORM_EMAIL = 'mateus.sg100@gmail.com';
const ALLOWED_METHODS = ['PIX', 'Boleto', 'Transferência'];
const ALLOWED_PLANS = ['starter', 'professional', 'enterprise'];

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

    const svc = base44.asServiceRole;
    // Resolve the caller's workspace from the server — never from the request body.
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    const ws = fresh?.workspace_id
      ? (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0]
      : null;

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'requestPayment') {
      if (!ws) return json({ error: 'Workspace não encontrado.' }, 400);
      const plan = ALLOWED_PLANS.includes(body.plan) ? body.plan : null;
      if (!plan) return json({ error: 'Plano inválido.' }, 400);
      const method = ALLOWED_METHODS.includes(body.payment_method) ? body.payment_method : 'PIX';
      const amount = Number(body.amount) || 0;
      const proofNotes = String(body.proof_notes || '').substring(0, 2000);

      await svc.entities.PaymentRequest.create({
        workspace_id: ws.id,
        workspace_name: ws.name,
        owner_email: user.email,
        plan,
        amount,
        payment_method: method,
        proof_notes: proofNotes,
        status: 'pending',
      });

      try {
        await svc.integrations.Core.SendEmail({
          to: PLATFORM_EMAIL,
          subject: `Nova solicitação de pagamento — ${ws.name}`,
          body:
            `Empresa: ${ws.name}\n` +
            `Plano: ${plan}\n` +
            `Valor: R$ ${amount}\n` +
            `Forma: ${method}\n` +
            `Cliente: ${user.email}\n\n` +
            `Observações do cliente:\n${proofNotes || '—'}`,
        });
      } catch (_) {
        // Falha no e-mail não deve impedir o registro da solicitação.
      }
      return json({ ok: true });
    }

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
