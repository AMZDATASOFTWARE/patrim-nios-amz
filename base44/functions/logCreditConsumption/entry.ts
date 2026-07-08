import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Registra consumo de créditos de IA do workspace do usuário logado,
// separado por tipo (message | integration).
// Custo real = rateio proporcional do plano da plataforma:
//   custo_mensagem   = (plan_price * share%) / plan_message_credits
//   custo_integracao = (plan_price * (100-share)%) / plan_integration_credits
// O workspace_id e o e-mail vêm SEMPRE da sessão (re-lidos via service role),
// nunca do payload — impossível lançar consumo em outro tenant.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    const workspaceId = fresh?.workspace_id || user.workspace_id;
    if (!workspaceId) return Response.json({ error: 'Usuário sem workspace.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const credits = Math.max(0, Number(body.credits) || 1);
    const creditType = body.credit_type === 'integration' ? 'integration' : 'message';
    const agentName = String(body.agent_name || 'assistente_patrimonial').slice(0, 100);
    const eventType = String(body.event_type || 'mensagem').slice(0, 100);

    // Precificação: rateio proporcional ao plano da plataforma.
    const pricing = (await svc.entities.PricingConfig.list('-created_date', 1))[0] || {};
    const planPrice = Number(pricing.plan_price) || 517.37;
    const msgPool = Number(pricing.plan_message_credits) || 500;
    const intPool = Number(pricing.plan_integration_credits) || 20000;
    const share = Math.min(100, Math.max(0, Number(pricing.message_share_percent ?? 50)));

    const costPerMessage = (planPrice * (share / 100)) / msgPool;
    const costPerIntegration = (planPrice * ((100 - share) / 100)) / intPool;

    const costPerCredit = creditType === 'message' ? costPerMessage : costPerIntegration;
    const pricePerCredit = creditType === 'message'
      ? (Number(pricing.price_per_message_credit) || costPerMessage * 3)
      : (Number(pricing.price_per_integration_credit) || costPerIntegration * 3);

    const record = await svc.entities.CreditUsage.create({
      workspace_id: workspaceId,
      user_email: user.email,
      agent_name: agentName,
      event_type: eventType,
      credit_type: creditType,
      credits_used: credits,
      cost_to_me: Number((credits * costPerCredit).toFixed(6)),
      price_to_client: Number((credits * pricePerCredit).toFixed(6)),
    });

    return Response.json({ ok: true, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});