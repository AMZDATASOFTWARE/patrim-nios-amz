import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Server-side branch creation with plan gating (item 11). Multi-branch is an
// Enterprise-plan feature (promised in src/lib/plans.js). Entity RLS blocks
// Branch.create from the SDK, so this function is the only way to create a
// branch: it validates the caller is an admin of an Enterprise workspace and
// stamps workspace_id from the session.
// Input: { name, code?, cnpj?, address?, city?, state?, is_headquarters?, parent_branch_id? }
//
// parent_branch_id (hierarquia de filiais): opcional, permite criar uma
// sub-filial. Mesmo gate de plano/role da criacao de nivel raiz (nenhum gate
// adicional por profundidade). Como e um no NOVO (sem id proprio ainda), nao
// ha risco de ciclo aqui -- so validamos que o pai existe, pertence ao mesmo
// workspace, e que a cadeia de ancestrais do pai nao ultrapassa MAX_DEPTH
// niveis (guarda contra profundidade patologica). Deteccao de ciclo real
// (reparentear um no existente) vive em moveBranch/entry.ts.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DEPTH = 12;

// deno-lint-ignore no-explicit-any
async function walkAncestors(svc: any, workspaceId: string, startId: string, maxHops = MAX_DEPTH) {
  const chain: any[] = [];
  let currentId: string | null = startId;
  let hops = 0;
  while (currentId) {
    if (hops >= maxHops) return { chain, hops, exceeded: true, invalid: false };
    const b = (await svc.entities.Branch.filter({ id: currentId }))[0];
    if (!b || b.workspace_id !== workspaceId) return { chain, hops, exceeded: false, invalid: true };
    chain.push(b);
    currentId = b.parent_branch_id || null;
    hops++;
  }
  return { chain, hops, exceeded: false, invalid: false };
}

// deno-lint-ignore no-explicit-any
async function validateAdminGate(svc: any, userId: string) {
  const fresh = (await svc.entities.User.filter({ id: userId }))[0];
  if (!fresh?.workspace_id || fresh.role !== 'admin') {
    return { error: 'Somente administradores podem gerenciar filiais.', status: 403 };
  }
  const ws = (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0];
  if (!ws) return { error: 'Workspace nao encontrado.', status: 404 };
  if (ws.plan !== 'enterprise') {
    return { error: 'Multiplas filiais estao disponiveis no plano Enterprise. Fale com um consultor para fazer upgrade.', status: 403 };
  }
  return { ws };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const gate = await validateAdminGate(svc, user.id);
    if (gate.error) return json({ error: gate.error }, gate.status);
    const ws = gate.ws;

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim().substring(0, 200);
    if (!name) return json({ error: 'Nome da filial obrigatorio.' }, 400);
    const isHeadquarters = body.is_headquarters === true;
    let parentBranchId: string | null = body.parent_branch_id ? String(body.parent_branch_id) : null;

    if (isHeadquarters && parentBranchId) {
      return json({ error: 'A matriz nao pode ter uma filial pai.' }, 400);
    }
    if (parentBranchId) {
      const walk = await walkAncestors(svc, ws.id, parentBranchId);
      if (walk.invalid) return json({ error: 'Filial pai invalida ou de outra empresa.' }, 400);
      if (walk.exceeded) return json({ error: 'Profundidade maxima da hierarquia de filiais atingida.' }, 400);
    }

    const row = await svc.entities.Branch.create({
      workspace_id: ws.id,
      name,
      code: String(body.code || '').substring(0, 50),
      cnpj: String(body.cnpj || '').substring(0, 20),
      address: String(body.address || '').substring(0, 300),
      city: String(body.city || '').substring(0, 100),
      state: String(body.state || '').substring(0, 5),
      is_headquarters: isHeadquarters,
      status: 'ativa',
      parent_branch_id: parentBranchId || undefined,
    });

    return json({ ok: true, id: row.id });
  } catch (_) {
    return json({ error: 'Nao foi possivel criar a filial.' }, 500);
  }
});
