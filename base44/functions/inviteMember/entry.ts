import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Mirrors src/lib/plans.js — null means unlimited (enterprise).
const PLAN_USER_LIMITS: Record<string, number | null> = {
  starter: 3,
  professional: 15,
  enterprise: null,
};

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

    // Real plan-limit enforcement: owner (1) + invited members must fit the plan.
    const limit = PLAN_USER_LIMITS[workspace.plan] ?? PLAN_USER_LIMITS.starter;
    const currentUsers = 1 + (workspace.member_emails || []).length;
    if (limit !== null && currentUsers >= limit) {
      return Response.json(
        { error: `Seu plano permite até ${limit} usuários. Faça upgrade em Plano & Cobrança para convidar mais membros.` },
        { status: 403, headers: corsHeaders }
      );
    }
    if (['suspended', 'cancelled'].includes(workspace.plan_status)) {
      return Response.json(
        { error: 'Conta suspensa. Regularize o pagamento para convidar membros.' },
        { status: 403, headers: corsHeaders }
      );
    }

    await base44.auth.inviteUser(email, targetRole);

    const currentMembers = workspace.member_emails || [];
    if (!currentMembers.includes(email)) {
      await base44.asServiceRole.entities.Workspace.update(workspace.id, {
        member_emails: [...currentMembers, email],
      });
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (_) {
    return Response.json(
      { error: 'Não foi possível enviar o convite.' },
      { status: 500, headers: corsHeaders }
    );
  }
});
