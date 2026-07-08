import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Relatório financeiro de consumo de IA para o platform-admin:
// agrega CreditUsage por workspace e por tipo de crédito (mensagens x integrações),
// calcula os custos unitários derivados do rateio do plano e permite
// atualizar a configuração (PricingConfig).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.is_platform_admin) return Response.json({ error: 'Acesso negado.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'report';

    if (action === 'updatePricing') {
      const planPrice = Number(body.plan_price);
      const msgPool = Number(body.plan_message_credits);
      const intPool = Number(body.plan_integration_credits);
      const share = Number(body.message_share_percent);
      const priceMsg = Number(body.price_per_message_credit);
      const priceInt = Number(body.price_per_integration_credit);
      if (!(planPrice >= 0) || !(msgPool > 0) || !(intPool > 0) || !(share >= 0 && share <= 100) || !(priceMsg >= 0) || !(priceInt >= 0)) {
        return Response.json({ error: 'Valores inválidos.' }, { status: 400 });
      }
      const data = {
        plan_price: planPrice,
        plan_message_credits: msgPool,
        plan_integration_credits: intPool,
        message_share_percent: share,
        price_per_message_credit: priceMsg,
        price_per_integration_credit: priceInt,
        currency: 'BRL',
      };
      const existing = (await svc.entities.PricingConfig.list('-created_date', 1))[0];
      const pricing = existing
        ? await svc.entities.PricingConfig.update(existing.id, data)
        : await svc.entities.PricingConfig.create(data);
      return Response.json({ ok: true, pricing });
    }

    // action === 'report'
    const [usage, workspaces, pricingList] = await Promise.all([
      svc.entities.CreditUsage.list('-created_date', 5000),
      svc.entities.Workspace.list('-created_date', 1000),
      svc.entities.PricingConfig.list('-created_date', 1),
    ]);

    const pricing = pricingList[0] || {};
    const planPrice = Number(pricing.plan_price) || 517.37;
    const msgPool = Number(pricing.plan_message_credits) || 500;
    const intPool = Number(pricing.plan_integration_credits) || 20000;
    const share = Math.min(100, Math.max(0, Number(pricing.message_share_percent ?? 50)));
    const derived = {
      cost_per_message_credit: (planPrice * (share / 100)) / msgPool,
      cost_per_integration_credit: (planPrice * ((100 - share) / 100)) / intPool,
    };

    const wsById: Record<string, { name?: string; owner_email?: string; plan?: string }> = {};
    for (const w of workspaces) wsById[w.id] = w;

    const byWorkspace: Record<string, {
      workspace_id: string; workspace_name: string; owner_email: string; plan: string;
      message_credits: number; integration_credits: number; credits: number;
      cost_to_me: number; price_to_client: number; events: number; last_event: string;
    }> = {};

    for (const u of usage) {
      const key = u.workspace_id;
      if (!byWorkspace[key]) {
        const w = wsById[key] || {};
        byWorkspace[key] = {
          workspace_id: key,
          workspace_name: w.name || '(workspace removido)',
          owner_email: w.owner_email || '',
          plan: w.plan || '',
          message_credits: 0, integration_credits: 0, credits: 0,
          cost_to_me: 0, price_to_client: 0, events: 0,
          last_event: u.created_date,
        };
      }
      const row = byWorkspace[key];
      const amount = u.credits_used || 0;
      // Registros antigos sem credit_type contam como mensagem.
      if (u.credit_type === 'integration') row.integration_credits += amount;
      else row.message_credits += amount;
      row.credits += amount;
      row.cost_to_me += u.cost_to_me || 0;
      row.price_to_client += u.price_to_client || 0;
      row.events += 1;
      if (u.created_date > row.last_event) row.last_event = u.created_date;
    }

    const rows = Object.values(byWorkspace)
      .map((r) => ({ ...r, margin: r.price_to_client - r.cost_to_me }))
      .sort((a, b) => b.credits - a.credits);

    const totals = rows.reduce(
      (acc, r) => ({
        message_credits: acc.message_credits + r.message_credits,
        integration_credits: acc.integration_credits + r.integration_credits,
        credits: acc.credits + r.credits,
        cost_to_me: acc.cost_to_me + r.cost_to_me,
        price_to_client: acc.price_to_client + r.price_to_client,
      }),
      { message_credits: 0, integration_credits: 0, credits: 0, cost_to_me: 0, price_to_client: 0 }
    );

    return Response.json({ ok: true, rows, totals, pricing: pricingList[0] || null, derived });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});