import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Server-side branch EDIT (descriptive fields only). Same admin + Enterprise gate
// as createBranch/moveBranch — todas as mutações de Filial passam por function
// service-role. Deliberadamente NÃO altera parent_branch_id (isso é moveBranch,
// e o campo é RLS-travado) nem is_headquarters (propriedade estrutural, evita
// invalidar a regra "matriz não tem pai" por edição de formulário).
// Input:  { branch_id, name, code?, cnpj?, address?, city?, state? }
// Output: { ok: true }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const branchId = String(body.branch_id || '').trim();
    if (!branchId) return json({ error: 'branch_id obrigatorio.' }, 400);

    // A filial precisa existir e pertencer ao workspace do chamador.
    const branch = (await svc.entities.Branch.filter({ id: branchId }))[0];
    if (!branch || branch.workspace_id !== ws.id) return json({ error: 'Filial nao encontrada.' }, 404);

    const name = String(body.name || '').trim().substring(0, 200);
    if (!name) return json({ error: 'Nome da filial obrigatorio.' }, 400);

    // Whitelist de campos descritivos — parent_branch_id / is_headquarters / status
    // ficam de fora de propósito (estrutura muda só por createBranch/moveBranch).
    await svc.entities.Branch.update(branchId, {
      name,
      code: String(body.code || '').substring(0, 50),
      cnpj: String(body.cnpj || '').substring(0, 20),
      address: String(body.address || '').substring(0, 300),
      city: String(body.city || '').substring(0, 100),
      state: String(body.state || '').substring(0, 5),
    });

    return json({ ok: true });
  } catch (_) {
    return json({ error: 'Nao foi possivel atualizar a filial.' }, 500);
  }
});
