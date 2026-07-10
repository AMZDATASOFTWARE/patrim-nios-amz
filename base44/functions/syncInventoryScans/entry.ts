import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Batch-applies queued inventory scans when the device reconnects (item 1).
// Avoids hammering the SDK item-by-item over a flaky connection on reconnect.
// Input: { inventory_id, scans: [{ item_id, status, found_location?, notes?, counted_at? }] } (<= 500)
// Auth: admin/manager of the workspace; all writes are workspace-scoped via service-role.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_STATUS = ['pendente', 'encontrado', 'divergente', 'nao_encontrado', 'novo_sobra'];

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
      return json({ error: 'Voce nao tem permissao para conferir inventario.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const inventoryId = String(body.inventory_id || '');
    const scans = Array.isArray(body.scans) ? body.scans.slice(0, 500) : [];
    if (!inventoryId || scans.length === 0) return json({ error: 'Nada para sincronizar.' }, 400);

    // Confirm the inventory belongs to the caller's workspace.
    const count = (await svc.entities.InventoryCount.filter({ id: inventoryId, workspace_id: fresh.workspace_id }))[0];
    if (!count) return json({ error: 'Inventario nao encontrado.' }, 404);

    let applied = 0;
    let skipped = 0;
    const counterEmail = user.email || '';

    for (const scan of scans) {
      const itemId = String(scan?.item_id || '');
      const status = VALID_STATUS.includes(scan?.status) ? scan.status : null;
      if (!itemId || !status) { skipped++; continue; }
      // Item must belong to this inventory + workspace.
      const item = (await svc.entities.InventoryItem.filter({ id: itemId, inventory_id: inventoryId, workspace_id: fresh.workspace_id }))[0];
      if (!item) { skipped++; continue; }
      try {
        await svc.entities.InventoryItem.update(itemId, {
          status,
          found_location: scan.found_location !== undefined ? String(scan.found_location).substring(0, 300) : item.found_location,
          notes: scan.notes !== undefined ? String(scan.notes).substring(0, 1000) : item.notes,
          counted_by: counterEmail,
          counted_at: scan.counted_at || new Date().toISOString(),
        });
        applied++;
      } catch (_) { skipped++; }
    }

    return json({ ok: true, applied, skipped });
  } catch (_) {
    return json({ error: 'Nao foi possivel sincronizar as conferencias.' }, 500);
  }
});
