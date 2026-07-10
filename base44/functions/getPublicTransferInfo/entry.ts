import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Public projection of a pending transfer, looked up by acceptance token, so the
// recipient can see what they're accepting before deciding. Minimal fields only.
// Input: { token }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const { token } = await req.json().catch(() => ({}));
    if (!token) return json({ error: 'Token obrigatorio.' }, 400);

    const transfer = (await svc.entities.AssetTransfer.filter({ acceptance_token: String(token) }))[0];
    if (!transfer) return json({ error: 'Link invalido ou ja utilizado.' }, 404);

    const exp = transfer.acceptance_token_expires_at ? new Date(transfer.acceptance_token_expires_at).getTime() : 0;
    const expired = !exp || exp < Date.now();

    return json({
      ok: true,
      transfer: {
        asset_name: transfer.asset_name,
        requested_by_name: transfer.requested_by_name || transfer.requested_by_email,
        recipient_name: transfer.recipient_name || transfer.recipient_email,
        from_location: transfer.from_location || '',
        to_location: transfer.to_location || '',
        reason: transfer.reason || '',
        status: transfer.status,
        expired,
      },
    });
  } catch (_) {
    return json({ error: 'Nao foi possivel carregar a transferencia.' }, 500);
  }
});
