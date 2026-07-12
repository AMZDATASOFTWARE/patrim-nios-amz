import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Atualiza apenas os campos de PERFIL da empresa (nunca plano/cobrança).
// O RLS do Workspace bloqueia update pelo SDK do cliente justamente para impedir
// que o dono grave plan/plan_status e burle o paywall — então o perfil é editado
// por aqui, com service-role e whitelist explícita de campos.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROFILE_FIELDS = [
  'name', 'cnpj', 'phone', 'address', 'logo_url',
  'report_letterhead_text', 'report_footer_text', 'report_responsible_name', 'report_signature_url',
] as const;

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
      return json({ error: 'Apenas administradores podem editar o perfil da empresa.' }, 403);
    }

    const ws = (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0];
    if (!ws) return json({ error: 'Workspace não encontrado.' }, 404);

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    for (const field of PROFILE_FIELDS) {
      if (body[field] !== undefined) patch[field] = String(body[field]).substring(0, 500);
    }
    if (Object.keys(patch).length === 0) {
      return json({ error: 'Nenhum campo de perfil para atualizar.' }, 400);
    }

    const workspace = await svc.entities.Workspace.update(ws.id, patch);
    return json({ ok: true, workspace });
  } catch (_) {
    return json({ error: 'Não foi possível atualizar o perfil da empresa.' }, 500);
  }
});
