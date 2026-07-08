import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import Stripe from 'npm:stripe@18.2.1';

// Opens the Stripe customer portal for the caller's workspace so the admin can
// update the card, switch plans, download invoices or cancel — all inside Stripe.
// Input: none. Output: { ok: true, url }.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    if (!fresh?.workspace_id) {
      return json({ error: 'Você não pertence a um workspace.' }, 400);
    }
    const ws = (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0];
    if (!ws) return json({ error: 'Workspace não encontrado.' }, 404);
    // Admin ou proprietário da conta (owner_email) podem gerenciar a assinatura.
    const isOwner = !!ws.owner_email && fresh.email === ws.owner_email;
    if (fresh.role !== 'admin' && !isOwner) {
      return json({ error: 'Apenas administradores podem gerenciar a assinatura.' }, 403);
    }
    if (!ws.stripe_customer_id) {
      return json({ error: 'Este workspace ainda não possui assinatura no Stripe.' }, 400);
    }

    const origin = req.headers.get('origin');
    if (!origin || !origin.startsWith('https://')) {
      return json({ error: 'Origem da requisição inválida.' }, 400);
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: ws.stripe_customer_id,
      return_url: `${origin}/Billing`,
    });

    return json({ ok: true, url: session.url });
  } catch (_) {
    return json({ error: 'Não foi possível abrir o portal de assinatura.' }, 500);
  }
});
