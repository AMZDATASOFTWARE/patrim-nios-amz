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
    if (freshUser?.workspace_id) {
      return Response.json({ ok: true, already_member: true }, { headers: corsHeaders });
    }

    // Service role bypasses RLS so we can search membership across all workspaces.
    const workspaces = await base44.asServiceRole.entities.Workspace.list('-created_date', 5000);
    const found = workspaces.find(
      (ws) => Array.isArray(ws.member_emails) && ws.member_emails.includes(user.email)
    );

    if (!found) {
      return Response.json(
        { ok: false, error: 'Nenhum convite encontrado para este e-mail.' },
        { headers: corsHeaders }
      );
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      workspace_id: found.id,
      role: freshUser?.role || 'user',
    });

    // Projeção mínima (security audit M3) — o objeto completo do Workspace inclui
    // stripe_customer_id/subscription_id e member_emails (e-mails de outros membros),
    // que a pessoa aceitando o convite ainda não precisa ver. O frontend rebusca o
    // workspace completo via SDK autenticado assim que workspace_id estiver gravado
    // (RLS de leitura já cobre esse caso legitimamente).
    return Response.json({ ok: true, workspace: { id: found.id, name: found.name } }, { headers: corsHeaders });
  } catch (_) {
    return Response.json(
      { error: 'Não foi possível processar o convite.' },
      { status: 500, headers: corsHeaders }
    );
  }
});
