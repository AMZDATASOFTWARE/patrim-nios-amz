import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import Stripe from 'npm:stripe@18.2.1';

// Creates a Stripe Checkout Session (subscription) for the caller's workspace.
// Input:  { plan: 'starter' | 'professional', interval: 'month' | 'year' }
// Output: { ok: true, url } — the client redirects to Stripe-hosted checkout.
// Security: caller must be an authenticated workspace admin; plan/interval are
// whitelisted server-side and the price comes from a fixed server-side map, so
// the client can never choose an arbitrary amount (fixes audit finding N2).
// Stripe metadata carries only opaque ids (workspace_id/plan) — never personal data.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Live-mode prices created 2026-07-06 (values mirror src/lib/plans.js).
const PRICES: Record<string, Record<string, string>> = {
  starter: {
    month: 'price_1Tq3NlL04LdxLhj992EfmEd6', // R$ 97/mês
    year: 'price_1Tq3NxL04LdxLhj9BaDzwnTN', // R$ 970/ano
  },
  professional: {
    month: 'price_1Tq3NzL04LdxLhj9doQPyFcB', // R$ 247/mês
    year: 'price_1Tq3OAL04LdxLhj9KJXiWcuW', // R$ 2.470/ano
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) return json({ error: 'Pagamentos indisponíveis no momento.' }, 503);

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.workspace_id || fresh.role !== 'admin') {
      return json({ error: 'Apenas administradores podem gerenciar a assinatura.' }, 403);
    }
    const ws = (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0];
    if (!ws) return json({ error: 'Workspace não encontrado.' }, 404);

    const body = await req.json().catch(() => ({}));
    const plan = ['starter', 'professional'].includes(body.plan) ? body.plan : null;
    const interval = ['month', 'year'].includes(body.interval) ? body.interval : 'month';
    if (!plan) return json({ error: 'Plano inválido.' }, 400);

    // An active Stripe subscription must be changed via the customer portal,
    // never by stacking a second subscription.
    if (ws.stripe_subscription_id && ws.plan_status === 'active') {
      return json(
        { error: 'Você já tem uma assinatura ativa. Use "Gerenciar assinatura" para mudar de plano.' },
        400
      );
    }

    const origin = req.headers.get('origin');
    if (!origin || !origin.startsWith('https://')) {
      return json({ error: 'Origem da requisição inválida.' }, 400);
    }

    const stripe = new Stripe(secretKey);

    // Reuse the workspace's Stripe customer or create it once (stamped server-side).
    let customerId = ws.stripe_customer_id || '';
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ws.owner_email,
        name: ws.name,
        metadata: { workspace_id: ws.id, app: 'patrimonios-amz' },
      });
      customerId = customer.id;
      await svc.entities.Workspace.update(ws.id, { stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICES[plan][interval], quantity: 1 }],
      success_url: `${origin}/Billing?checkout=success`,
      cancel_url: `${origin}/Billing?checkout=cancelled`,
      locale: 'pt-BR',
      allow_promotion_codes: true,
      metadata: { workspace_id: ws.id, plan },
      subscription_data: { metadata: { workspace_id: ws.id, plan } },
    });

    return json({ ok: true, url: session.url });
  } catch (_) {
    return json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, 500);
  }
});
