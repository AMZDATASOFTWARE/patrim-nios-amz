import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';
import Stripe from 'npm:stripe@18.2.1';

// Public Stripe webhook. EVERY request must carry a valid Stripe signature
// (STRIPE_WEBHOOK_SECRET) — unsigned/invalid payloads are rejected with 400.
// This is the ONLY place that activates/renews/suspends a workspace plan after
// the Stripe migration; handlers are idempotent (plain field upserts) so Stripe
// retries are safe. Tenant is resolved from server-set subscription metadata and
// re-validated against the stored stripe_customer_id before any write.

const PRICE_TO_PLAN: Record<string, string> = {
  price_1Tq3NlL04LdxLhj992EfmEd6: 'starter',
  price_1Tq3NxL04LdxLhj9BaDzwnTN: 'starter',
  price_1Tq3NzL04LdxLhj9doQPyFcB: 'professional',
  price_1Tq3OAL04LdxLhj9KJXiWcuW: 'professional',
};

const APP_URL = 'https://patrimoni-asset-flow.base44.app';

const toDate = (epoch?: number | null) =>
  epoch ? new Date(epoch * 1000).toISOString().split('T')[0] : '';

// Pulls the subscription id off an invoice across API-version shapes.
const invoiceSubId = (invoice: Stripe.Invoice): string | undefined =>
  (invoice as unknown as { subscription?: string }).subscription ||
  (invoice.parent as { subscription_details?: { subscription?: string } })
    ?.subscription_details?.subscription;

// current_period_end lives on the subscription item in newer API versions.
const periodEnd = (sub: Stripe.Subscription) =>
  (sub.items?.data?.[0] as { current_period_end?: number })?.current_period_end ??
  (sub as unknown as { current_period_end?: number }).current_period_end;

Deno.serve(async (req) => {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secretKey || !webhookSecret) return new Response('not configured', { status: 500 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });

  const stripe = new Stripe(secretKey);
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (_) {
    return new Response('invalid signature', { status: 400 });
  }

  try {
    const svc = createClientFromRequest(req).asServiceRole;

    // Resolves the workspace for a subscription and verifies the customer matches
    // what we stored — a mismatched event is acknowledged but never applied.
    const resolveWorkspace = async (workspaceId: string, customerId: string) => {
      if (!workspaceId) return null;
      const ws = (await svc.entities.Workspace.filter({ id: workspaceId }))[0];
      if (!ws) return null;
      if (ws.stripe_customer_id && customerId && ws.stripe_customer_id !== customerId) return null;
      return ws;
    };

    const applySubscription = async (sub: Stripe.Subscription) => {
      const ws = await resolveWorkspace(
        sub.metadata?.workspace_id || '',
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || ''
      );
      if (!ws) return;

      const priceId = sub.items?.data?.[0]?.price?.id || '';
      const plan = PRICE_TO_PLAN[priceId];
      const patch: Record<string, unknown> = {
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : ws.stripe_customer_id,
      };
      if (plan) patch.plan = plan;

      // Map Stripe status → app plan_status. past_due stays active while Stripe
      // retries the charge; definitive failure arrives as unpaid/canceled.
      if (['active', 'trialing', 'past_due'].includes(sub.status)) {
        patch.plan_status = 'active';
        patch.plan_expires_at = toDate(periodEnd(sub));
      } else if (sub.status === 'canceled') {
        patch.plan_status = 'cancelled';
      } else if (['unpaid', 'incomplete_expired'].includes(sub.status)) {
        patch.plan_status = 'suspended';
      }
      await svc.entities.Workspace.update(ws.id, patch);
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          );
          await applySubscription(sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const ws = await resolveWorkspace(
          sub.metadata?.workspace_id || '',
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || ''
        );
        if (ws) {
          await svc.entities.Workspace.update(ws.id, { plan_status: 'cancelled' });
        }
        break;
      }
      case 'invoice.paid': {
        // Renewal: refresh the expiry from the subscription's new period.
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoiceSubId(invoice);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applySubscription(sub);
        }
        break;
      }
      case 'invoice.payment_failed':
      case 'invoice.payment_action_required': {
        // Dunning: Stripe keeps retrying on its own schedule; we notify the
        // account owner so they can update the card before access is suspended.
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoiceSubId(invoice);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const ws = await resolveWorkspace(
            sub.metadata?.workspace_id || '',
            typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || ''
          );
          if (ws?.owner_email) {
            const needsAction = event.type === 'invoice.payment_action_required';
            try {
              await svc.integrations.Core.SendEmail({
                to: ws.owner_email,
                subject: needsAction
                  ? 'Ação necessária para confirmar seu pagamento'
                  : 'Não conseguimos processar seu pagamento',
                body:
                  `Olá!\n\n` +
                  (needsAction
                    ? 'O seu banco pediu uma confirmação adicional (autenticação) para concluir a cobrança da assinatura do Patrimônios AMZ.\n\n'
                    : 'A cobrança da assinatura do Patrimônios AMZ não foi aprovada. Tentaremos novamente automaticamente, mas para evitar a suspensão do acesso, atualize seus dados de pagamento.\n\n') +
                  `Acesse Plano & Cobrança e use "Gerenciar assinatura":\n${APP_URL}/Billing\n\n` +
                  `Atenciosamente,\nEquipe Patrimônios AMZ`,
              });
            } catch (_) {
              // Falha no e-mail não deve fazer o Stripe reenviar o webhook.
            }
          }
        }
        break;
      }
      default:
        break; // Unhandled event types are acknowledged so Stripe stops retrying.
    }

    return new Response('ok', { status: 200 });
  } catch (_) {
    // Transient failure (e.g. data layer): 500 makes Stripe retry later.
    return new Response('handler error', { status: 500 });
  }
});
