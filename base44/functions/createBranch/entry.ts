import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Server-side branch creation with plan gating (item 11). Multi-branch is an
// Enterprise-plan feature (promised in src/lib/plans.js). Entity RLS blocks
// Branch.create from the SDK, so this function is the only way to create a
// branch: it validates the caller is an admin of an Enterprise workspace and
// stamps workspace_id from the session.
// Input: { name, code?, cnpj?, address?, city?, state?, is_headquarters? }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.workspace_id || fresh.role !== 'admin') {
      return json({ error: 'Somente administradores podem criar filiais.' }, 403);
    }
    const ws = (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0];
    if (!ws) return json({ error: 'Workspace nao encontrado.' }, 404);
    if (ws.plan !== 'enterprise') {
      return json({ error: 'Multiplas filiais estao disponiveis no plano Enterprise. Fale com um consultor para fazer upgrade.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim().substring(0, 200);
    if (!name) return json({ error: 'Nome da filial obrigatorio.' }, 400);

    const row = await svc.entities.Branch.create({
      workspace_id: ws.id,
      name,
      code: String(body.code || '').substring(0, 50),
      cnpj: String(body.cnpj || '').substring(0, 20),
      address: String(body.address || '').substring(0, 300),
      city: String(body.city || '').substring(0, 100),
      state: String(body.state || '').substring(0, 5),
      is_headquarters: body.is_headquarters === true,
      status: 'ativa',
    });

    return json({ ok: true, id: row.id });
  } catch (_) {
    return json({ error: 'Nao foi possivel criar a filial.' }, 500);
  }
});
