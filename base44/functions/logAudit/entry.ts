import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Server-side audit trail writer. The actor and workspace are stamped from the
// authenticated session — never from the request body — so a client cannot forge
// an entry attributed to another user (audit finding N5). Entity RLS blocks
// AuditLog.create from the SDK; this function (service role) is the only writer.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTIONS = ['created', 'updated', 'deleted'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const me = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!me?.workspace_id) return json({ error: 'Você não pertence a um workspace.' }, 400);

    const body = await req.json().catch(() => ({}));
    const action = ACTIONS.includes(body.action) ? body.action : null;
    const entityType = String(body.entity_type || '').substring(0, 60);
    if (!action || !entityType) return json({ error: 'Ação ou entidade inválida.' }, 400);

    await svc.entities.AuditLog.create({
      workspace_id: me.workspace_id,
      actor_email: me.email || '',
      actor_name: me.full_name || me.email || '',
      action,
      entity_type: entityType,
      entity_id: String(body.entity_id || '').substring(0, 100),
      entity_label: String(body.entity_label || '').substring(0, 200),
      summary: String(body.summary || '').substring(0, 500),
    });

    return json({ ok: true });
  } catch (_) {
    // Auditoria é best-effort; nunca interrompe o fluxo do usuário.
    return json({ error: 'Não foi possível registrar a auditoria.' }, 500);
  }
});
