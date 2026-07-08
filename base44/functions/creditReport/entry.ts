import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Relatório financeiro de consumo de IA para o platform-admin:
// agrega CreditUsage por workspace (créditos, custo real, valor faturável, margem)
// e permite atualizar a tabela de precificação (PricingConfig).
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
      const cost = Number(body.cost_per_credit);
      const price = Number(body.price_per_credit);
      if (!(cost >= 0) || !(price >= 0)) {
        return Response.json({ error: 'Valores inválidos.' }, { status: 400 });
      }
      const existing = (await svc.entities.PricingConfig.list('-created_date', 1))[0];
      const pricing = existing
        ? await svc.entities.PricingConfig.update(existing.id, { cost_per_credit: cost, price_per_credit: price })
        : await svc.entities.PricingConfig.create({ cost_per_credit: cost, price_per_credit: price, currency: 'BRL' });
      return Response.json({ ok: true, pricing });
    }

    // action === 'report'
    const [usage, workspaces, pricing] = await Promise.all([
      svc.entities.CreditUsage.list('-created_date', 5000),
      svc.entities.Workspace.list('-created_date', 1000),
      svc.entities.PricingConfig.list('-created_date', 1),
    ]);

    const wsById: Record<string, { name?: string; owner_email?: string; plan?: string }> = {};
    for (const w of workspaces) wsById[w.id] = w;

    const byWorkspace: Record<string, {
      workspace_id: string; workspace_name: string; owner_email: string; plan: string;
      credits: number; cost_to_me: number; price_to_client: number; events: number; last_event: string;
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
          credits: 0, cost_to_me: 0, price_to_client: 0, events: 0,
          last_event: u.created_date,
        };
      }
      const row = byWorkspace[key];
      row.credits += u.credits_used || 0;
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
        credits: acc.credits + r.credits,
        cost_to_me: acc.cost_to_me + r.cost_to_me,
        price_to_client: acc.price_to_client + r.price_to_client,
      }),
      { credits: 0, cost_to_me: 0, price_to_client: 0 }
    );

    return Response.json({ ok: true, rows, totals, pricing: pricing[0] || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});