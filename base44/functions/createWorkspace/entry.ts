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

    // Never trust the client's cached copy of workspace_id — re-check via service role.
    const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const freshUser = freshUsers[0];
    if (freshUser?.workspace_id) {
      return Response.json({ error: 'Você já pertence a um workspace.' }, { status: 400, headers: corsHeaders });
    }

    const body = await req.json();
    const name = (body.name || '').trim();
    if (!name) {
      return Response.json({ error: 'Nome é obrigatório.' }, { status: 400, headers: corsHeaders });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const accountType = ['personal', 'business'].includes(body.account_type) ? body.account_type : 'business';

    const workspace = await base44.asServiceRole.entities.Workspace.create({
      name,
      owner_email: user.email,
      plan: 'starter',
      plan_status: 'trial',
      account_type: accountType,
      trial_ends_at: trialEnd.toISOString().split('T')[0],
      member_emails: [],
      cnpj: body.cnpj || '',
      phone: body.phone || '',
      address: body.address || '',
    });

    await base44.asServiceRole.entities.User.update(user.id, {
      workspace_id: workspace.id,
      role: 'admin',
    });

    return Response.json({ ok: true, workspace }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
