import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Recipient accepts/refuses an asset transfer. Two modes:
//  - public token: { token, decision: 'aceito'|'recusado', notes? } (no login)
//  - session:      { transfer_id, decision, notes? } (recipient logged in)
// Only this function (service-role) flips `status`/`decided_at` (field-level RLS
// blocks everyone else). On accept, applies the location/cost-center change to
// the Asset and records LocationHistory + AuditLog.

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
    const body = await req.json().catch(() => ({}));
    const decision = body.decision === 'recusado' ? 'recusado' : (body.decision === 'aceito' ? 'aceito' : null);
    if (!decision) return json({ error: 'Decisao invalida.' }, 400);

    // Resolve the transfer by token (public) or by id + session (member).
    let transfer = null;
    let callerEmail = '';
    const token = String(body.token || '');
    if (token) {
      transfer = (await svc.entities.AssetTransfer.filter({ acceptance_token: token }))[0];
      if (!transfer) return json({ error: 'Link invalido ou ja utilizado.' }, 404);
      const exp = transfer.acceptance_token_expires_at ? new Date(transfer.acceptance_token_expires_at).getTime() : 0;
      if (!exp || exp < Date.now()) return json({ error: 'Link expirado.' }, 410);
      callerEmail = transfer.recipient_email;
    } else {
      const user = await base44.auth.me();
      if (!user) return json({ error: 'Unauthorized' }, 401);
      const transferId = String(body.transfer_id || '');
      if (!transferId) return json({ error: 'Transferencia obrigatoria.' }, 400);
      transfer = (await svc.entities.AssetTransfer.filter({ id: transferId }))[0];
      if (!transfer) return json({ error: 'Transferencia nao encontrada.' }, 404);
      if ((user.email || '').toLowerCase() !== (transfer.recipient_email || '').toLowerCase()) {
        return json({ error: 'Somente o destinatario pode responder a esta transferencia.' }, 403);
      }
      callerEmail = user.email;
    }

    if (transfer.status !== 'pendente') {
      return json({ error: 'Esta transferencia ja foi respondida.' }, 409);
    }

    const patch: Record<string, unknown> = {
      status: decision,
      decided_at: new Date().toISOString(),
      decision_notes: String(body.notes || '').substring(0, 1000),
      acceptance_token: '',
      acceptance_token_expires_at: '',
    };
    await svc.entities.AssetTransfer.update(transfer.id, patch);

    // On accept, actually move the asset and record the trail.
    if (decision === 'aceito') {
      const asset = (await svc.entities.Asset.filter({ id: transfer.asset_id }))[0];
      if (asset) {
        const assetPatch: Record<string, unknown> = {};
        if (transfer.to_location) assetPatch.location = transfer.to_location;
        if (transfer.to_cost_center) assetPatch.cost_center = transfer.to_cost_center;
        if (Object.keys(assetPatch).length > 0) {
          await svc.entities.Asset.update(asset.id, assetPatch);
        }
        try {
          await svc.entities.LocationHistory.create({
            workspace_id: transfer.workspace_id,
            asset_id: asset.id,
            asset_name: asset.name || '',
            address: transfer.to_location || '',
            source: 'Sistema',
            scanned_by: callerEmail || 'Destinatario',
            scanned_at: new Date().toISOString(),
            notes: `Transferencia aceita (de "${transfer.from_location || '-'}" para "${transfer.to_location || '-'}").`,
          });
        } catch (_) { /* nao critico */ }
        try {
          await svc.entities.AuditLog.create({
            workspace_id: transfer.workspace_id,
            actor_email: callerEmail,
            actor_name: transfer.recipient_name || callerEmail,
            action: 'updated',
            entity_type: 'Asset',
            entity_id: asset.id,
            entity_label: asset.name || '',
            summary: `Transferencia de "${asset.name}" aceita por ${callerEmail}`,
            new_data: assetPatch,
          });
        } catch (_) { /* nao critico */ }
      }
    }

    // Notify the requester of the outcome.
    try {
      await svc.entities.Notification.create({
        workspace_id: transfer.workspace_id,
        user_email: transfer.requested_by_email || '',
        title: decision === 'aceito' ? 'Transferencia aceita' : 'Transferencia recusada',
        body: `${transfer.recipient_email} ${decision === 'aceito' ? 'aceitou' : 'recusou'} a transferencia do ativo "${transfer.asset_name}".`,
        type: decision === 'aceito' ? 'success' : 'warning',
        link: '/Transfers',
        read: false,
      });
    } catch (_) { /* nao critico */ }

    return json({ ok: true, status: decision, asset_name: transfer.asset_name });
  } catch (_) {
    return json({ error: 'Nao foi possivel responder a transferencia.' }, 500);
  }
});
