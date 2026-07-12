import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Function-tool do Assistente Patrimonial (chat + WhatsApp): checa se o
// workspace do usuário da sessão está com acesso liberado, ANTES do agente
// responder ou agir. Espelha exatamente a lógica de PaymentGate.jsx (mesmos 3
// casos, mesma folga de 7 dias) — mas o WhatsApp nunca passa por PaymentGate
// (canal nativo da Base44, fora do nosso router React), daí a necessidade
// deste gate específico para a conversa do agente.
//
// Gate por instrução, não por RLS: bloqueia leitura/escrita só se o agente
// obedecer à instrução de recusar quando access==='blocked'. Reforço de
// conveniência/negócio, não uma barreira técnica dura — decisão consciente
// (ver PROJECT_CONTEXT.md, achado relacionado a N1 do AUDIT_REPORT.md).

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

const TRIAL_EXPIRED_MESSAGE =
  'Seu período de teste gratuito encerrou. Para continuar usando o Assistente, acesse ' +
  'Plano & Cobrança no sistema e escolha um plano. Seus dados estão preservados.';
const PAYMENT_ISSUE_MESSAGE =
  'Identificamos uma pendência no pagamento da sua assinatura. Para continuar usando o ' +
  'Assistente, regularize em Plano & Cobrança no sistema. Seus dados estão preservados e ' +
  'o acesso volta assim que o pagamento for confirmado.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ access: 'ok' });

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    const workspaceId = fresh?.workspace_id || user.workspace_id;
    if (!workspaceId) return json({ access: 'ok' }); // onboarding — ainda sem workspace

    const ws = (await svc.entities.Workspace.filter({ id: workspaceId }))[0];
    if (!ws) return json({ access: 'ok' });

    const status = ws.plan_status;
    const isSuspended = status === 'suspended' || status === 'cancelled';
    const trialExpired = status === 'trial' && ws.trial_ends_at && daysUntil(ws.trial_ends_at) < 0;
    const paymentOverdue = status === 'active' && ws.plan_expires_at && -daysUntil(ws.plan_expires_at) > 7;

    if (isSuspended || trialExpired || paymentOverdue) {
      const reason = trialExpired ? 'trial_expired' : paymentOverdue ? 'payment_overdue' : 'suspended';
      const reply_verbatim = trialExpired ? TRIAL_EXPIRED_MESSAGE : PAYMENT_ISSUE_MESSAGE;
      return json({ access: 'blocked', reason, reply_verbatim });
    }

    return json({ access: 'ok' });
  } catch (_) {
    // Fail-open: barreira de conveniência/negócio, não de segurança de dados —
    // um bug transitório aqui não deve travar o assistente de clientes ativos.
    return json({ access: 'ok' });
  }
});
