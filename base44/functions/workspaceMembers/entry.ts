import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Gestão de membros do workspace, sempre com service-role e re-checagem server-side.
// Substitui o antigo User.list() global do UsersManagement (que vazava usuários de
// todos os tenants) e habilita editar papel / remover membro sem expor o entity User.
//
// Ações:
//  list    -> lista os usuários do próprio workspace (qualquer membro autenticado)
//  setRole -> altera o papel de um membro (apenas admin)
//  remove  -> desvincula um membro do workspace (apenas admin)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSIGNABLE_ROLES = ['admin', 'manager', 'viewer', 'user'];

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
    const action = body.action;

    // Projeção segura — nunca devolve is_platform_admin nem dados de outros tenants.
    const project = (u: Record<string, unknown>) => ({
      id: u.id,
      full_name: u.full_name || '',
      email: u.email || '',
      role: u.role || 'user',
    });

    if (action === 'list') {
      const members = await svc.entities.User.filter({ workspace_id: me.workspace_id });
      return json({ ok: true, members: members.map(project) });
    }

    const isAdmin = me.role === 'admin';
    if (!isAdmin) return json({ error: 'Apenas administradores podem gerenciar membros.' }, 403);

    const targetId = body.userId;
    if (!targetId) return json({ error: 'userId é obrigatório.' }, 400);
    const target = (await svc.entities.User.filter({ id: targetId }))[0];
    if (!target || target.workspace_id !== me.workspace_id) {
      return json({ error: 'Membro não encontrado neste workspace.' }, 404);
    }
    if (target.id === me.id) {
      return json({ error: 'Você não pode alterar o seu próprio acesso.' }, 400);
    }

    const ws = (await svc.entities.Workspace.filter({ id: me.workspace_id }))[0];
    if (ws?.owner_email && target.email === ws.owner_email) {
      return json({ error: 'O proprietário da conta não pode ser alterado ou removido.' }, 400);
    }

    if (action === 'setRole') {
      const role = ASSIGNABLE_ROLES.includes(body.role) ? body.role : null;
      if (!role) return json({ error: 'Papel inválido.' }, 400);
      await svc.entities.User.update(target.id, { role });
      return json({ ok: true });
    }

    if (action === 'remove') {
      await svc.entities.User.update(target.id, { workspace_id: '', role: 'user' });
      if (ws && Array.isArray(ws.member_emails) && target.email) {
        await svc.entities.Workspace.update(ws.id, {
          member_emails: ws.member_emails.filter((e: string) => e !== target.email),
        });
      }
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (_) {
    return json({ error: 'Não foi possível processar a solicitação.' }, 500);
  }
});
