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

// Internal/system fields that shouldn't appear in the audit diff.
const IGNORE_FIELDS = ['id', 'created_date', 'updated_date', 'created_by_id', 'workspace_id'];

function computeChangedFields(oldObj: any, newObj: any): string[] {
  if (!oldObj || !newObj) return [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (IGNORE_FIELDS.includes(key)) continue;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed.push(key);
    }
  }
  return changed;
}

function sanitizeForLog(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (IGNORE_FIELDS.includes(k)) continue;
    clean[k] = v;
  }
  return JSON.stringify(clean, null, 2);
}

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

    // Diff data — client may send old_data/new_data as objects; we sanitize + stringify here.
    let oldData = '';
    let newData = '';
    let changedFields: string[] = [];

    if (body.old_data && typeof body.old_data === 'object') {
      oldData = sanitizeForLog(body.old_data).substring(0, 8000);
    } else if (typeof body.old_data === 'string') {
      oldData = body.old_data.substring(0, 8000);
    }

    if (body.new_data && typeof body.new_data === 'object') {
      newData = sanitizeForLog(body.new_data).substring(0, 8000);
    } else if (typeof body.new_data === 'string') {
      newData = body.new_data.substring(0, 8000);
    }

    if (action === 'updated' && body.old_data && body.new_data) {
      const oldObj = typeof body.old_data === 'object' ? body.old_data : JSON.parse(body.old_data);
      const newObj = typeof body.new_data === 'object' ? body.new_data : JSON.parse(body.new_data);
      changedFields = computeChangedFields(oldObj, newObj);
    } else if (Array.isArray(body.changed_fields)) {
      changedFields = body.changed_fields.filter((f: unknown) => typeof f === 'string').slice(0, 50);
    }

    await svc.entities.AuditLog.create({
      workspace_id: me.workspace_id,
      actor_email: me.email || '',
      actor_name: me.full_name || me.email || '',
      action,
      entity_type: entityType,
      entity_id: String(body.entity_id || '').substring(0, 100),
      entity_label: String(body.entity_label || '').substring(0, 200),
      summary: String(body.summary || '').substring(0, 500),
      changed_fields: changedFields,
      old_data: oldData,
      new_data: newData,
    });

    return json({ ok: true });
  } catch (_) {
    // Auditoria é best-effort; nunca interrompe o fluxo do usuário.
    return json({ error: 'Não foi possível registrar a auditoria.' }, 500);
  }
});