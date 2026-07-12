import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Reparenteia uma filial ja existente (hierarquia de filiais). Branch.parent_branch_id
// tem RLS de campo travada em is_platform_admin -- esta funcao (service-role) e o
// UNICO caminho legitimo pra mudar o pai de uma filial, pra poder validar ciclo e
// profundidade antes de gravar (um update() direto do admin do tenant nao teria
// como ser validado server-side).
// Input: { branch_id, parent_branch_id? } -- parent_branch_id null/ausente = mover
// para a raiz (Sede/Workspace).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_DEPTH = 12;
const MAX_BRANCHES_SCAN = 500;

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

// Profundidade maxima da subarvore de descendentes de rootId (0 = folha, sem filhos).
// deno-lint-ignore no-explicit-any
function maxSubtreeDepth(childrenMap: Map<string, string[]>, rootId: string, guard = MAX_DEPTH): number {
  const kids = childrenMap.get(rootId) || [];
  if (kids.length === 0) return 0;
  if (guard <= 0) return 0;
  return 1 + Math.max(...kids.map((k) => maxSubtreeDepth(childrenMap, k, guard - 1)));
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
    const branchId = String(body.branch_id || '');
    const newParentId: string | null = body.parent_branch_id ? String(body.parent_branch_id) : null;
    if (!branchId) return json({ error: 'branch_id obrigatorio.' }, 400);

    const branch = (await svc.entities.Branch.filter({ id: branchId }))[0];
    if (!branch || branch.workspace_id !== ws.id) {
      return json({ error: 'Filial nao encontrada.' }, 404);
    }
    if (branch.is_headquarters && newParentId) {
      return json({ error: 'A matriz nao pode ter uma filial pai.' }, 400);
    }
    if (newParentId === branchId) {
      return json({ error: 'Uma filial nao pode ser pai de si mesma.' }, 400);
    }

    let parentDepthFromRoot = 0;
    if (newParentId) {
      const walk = await walkAncestors(svc, ws.id, newParentId);
      if (walk.invalid) return json({ error: 'Filial pai invalida ou de outra empresa.' }, 400);
      if (walk.exceeded) return json({ error: 'Profundidade maxima da hierarquia de filiais atingida.' }, 400);
      // Ciclo: o novo pai nao pode descender da propria filial sendo movida.
      if (walk.chain.some((b) => b.id === branchId)) {
        return json({ error: 'Movimento invalido: criaria um ciclo na hierarquia de filiais.' }, 400);
      }
      parentDepthFromRoot = walk.hops;
    }

    // Guarda de profundidade total: pai (parentDepthFromRoot) + a propria filial (1)
    // + a subarvore de descendentes dela, apos o move, nao pode ultrapassar MAX_DEPTH.
    const allBranches = await svc.entities.Branch.filter({ workspace_id: ws.id });
    const scanned = allBranches.slice(0, MAX_BRANCHES_SCAN);
    const childrenMap = new Map<string, string[]>();
    for (const b of scanned) {
      if (b.parent_branch_id) {
        const arr = childrenMap.get(b.parent_branch_id) || [];
        arr.push(b.id);
        childrenMap.set(b.parent_branch_id, arr);
      }
    }
    const subtreeDepth = maxSubtreeDepth(childrenMap, branchId);
    const totalDepth = parentDepthFromRoot + 1 + subtreeDepth;
    if (totalDepth > MAX_DEPTH) {
      return json({ error: 'Esse movimento ultrapassaria a profundidade maxima da hierarquia de filiais.' }, 400);
    }

    // null explicito (nao undefined) para realmente limpar o campo quando movendo para a raiz --
    // undefined seria omitido do payload JSON e deixaria o parent_branch_id antigo intacto.
    await svc.entities.Branch.update(branchId, { parent_branch_id: newParentId });

    return json({ ok: true });
  } catch (_) {
    return json({ error: 'Nao foi possivel mover a filial.' }, 500);
  }
});
