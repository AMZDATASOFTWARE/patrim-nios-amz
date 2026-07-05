import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const freshUser = freshUsers[0];
    if (!freshUser?.workspace_id || !['admin', 'manager'].includes(freshUser.role)) {
      return Response.json(
        { error: 'Apenas administradores ou gerentes podem convidar membros.' },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const email = (body.email || '').trim();
    if (!email) {
      return Response.json({ error: 'E-mail é obrigatório.' }, { status: 400, headers: corsHeaders });
    }
    const allowedRoles = ['viewer', 'manager', 'user'];
    const targetRole = allowedRoles.includes(body.role) ? body.role : 'user';

    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: freshUser.workspace_id });
    const workspace = workspaces[0];
    if (!workspace) {
      return Response.json({ error: 'Workspace não encontrado.' }, { status: 404, headers: corsHeaders });
    }

    await base44.auth.inviteUser(email, targetRole);

    const currentMembers = workspace.member_emails || [];
    if (!currentMembers.includes(email)) {
      await base44.asServiceRole.entities.Workspace.update(workspace.id, {
        member_emails: [...currentMembers, email],
      });
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
