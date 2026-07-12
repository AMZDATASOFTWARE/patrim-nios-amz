import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Creates an asset-transfer request awaiting the recipient's acceptance
// (chain-of-custody). Only the function (service-role) writes the row and the
// acceptance token — the entity RLS blocks direct SDK create and the field-level
// RLS blocks anyone but a function from flipping `status`.
// Input: { asset_id, to_location?, to_cost_center?, to_sector_id?, recipient_email, recipient_name?, reason? }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://patrimoni-asset-flow.base44.app';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.workspace_id || !['admin', 'manager'].includes(fresh.role)) {
      return json({ error: 'Voce nao tem permissao para solicitar transferencias.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const assetId = String(body.asset_id || '');
    const recipientEmail = String(body.recipient_email || '').trim().toLowerCase();
    if (!assetId) return json({ error: 'Ativo obrigatorio.' }, 400);
    if (!recipientEmail) return json({ error: 'E-mail do destinatario obrigatorio.' }, 400);

    // Asset must belong to the caller's workspace.
    const asset = (await svc.entities.Asset.filter({ id: assetId, workspace_id: fresh.workspace_id }))[0];
    if (!asset) return json({ error: 'Ativo nao encontrado.' }, 404);

    const token = crypto.randomUUID();
    const row = await svc.entities.AssetTransfer.create({
      workspace_id: fresh.workspace_id,
      asset_id: assetId,
      asset_name: asset.name || '',
      from_location: asset.location || '',
      to_location: String(body.to_location || '').substring(0, 300),
      from_cost_center: asset.cost_center || '',
      to_cost_center: String(body.to_cost_center || '').substring(0, 300),
      from_sector_id: asset.sector_id || '',
      to_sector_id: String(body.to_sector_id || ''),
      requested_by_email: user.email,
      requested_by_name: fresh.full_name || user.email,
      requested_at: new Date().toISOString(),
      recipient_email: recipientEmail,
      recipient_name: String(body.recipient_name || '').substring(0, 200),
      reason: String(body.reason || '').substring(0, 1000),
      status: 'pendente',
      acceptance_token: token,
      acceptance_token_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    });

    // In-app notification if the recipient is a member of the same workspace.
    try {
      const member = (await svc.entities.User.filter({ workspace_id: fresh.workspace_id, email: recipientEmail }))[0];
      if (member) {
        await svc.entities.Notification.create({
          workspace_id: fresh.workspace_id,
          user_email: recipientEmail,
          title: 'Transferencia de patrimonio aguardando seu aceite',
          body: `${fresh.full_name || user.email} solicitou a transferencia do ativo "${asset.name}" para voce.`,
          type: 'info',
          link: '/Transfers',
          read: false,
        });
      }
    } catch (_) { /* nao critico */ }

    // E-mail with the public acceptance link (works even if not a member).
    try {
      await svc.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Aceite de transferencia: ${asset.name}`,
        body:
          `Ola!\n\n${fresh.full_name || user.email} solicitou a transferencia do ativo "${asset.name}" para voce.\n\n` +
          `Para aceitar ou recusar, acesse:\n${APP_URL}/aceitar-transferencia?token=${token}\n\n` +
          `Este link expira em 7 dias.\n\nAtenciosamente,\nEquipe Patrimonios AMZ`,
      });
    } catch (_) { /* nao critico */ }

    return json({ ok: true, id: row.id });
  } catch (_) {
    return json({ error: 'Nao foi possivel criar a solicitacao de transferencia.' }, 500);
  }
});
