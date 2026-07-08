import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Registra consumo de créditos de IA do workspace do usuário logado.
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
    const agentName = String(body.agent_name || 'assistente_patrimonial').slice(0, 100);
    const eventType = String(body.event_type || 'mensagem').slice(0, 100);

    // Precificação dinâmica: primeiro registro da PricingConfig; defaults se ainda não configurada.
    const pricing = (await svc.entities.PricingConfig.list('-created_date', 1))[0];
    const costPerCredit = pricing?.cost_per_credit ?? 0.05;
    const pricePerCredit = pricing?.price_per_credit ?? 0.15;

    const record = await svc.entities.CreditUsage.create({
      workspace_id: workspaceId,
      user_email: user.email,
      agent_name: agentName,
      event_type: eventType,
      credits_used: credits,
      cost_to_me: Number((credits * costPerCredit).toFixed(4)),
      price_to_client: Number((credits * pricePerCredit).toFixed(4)),
    });

    return Response.json({ ok: true, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});