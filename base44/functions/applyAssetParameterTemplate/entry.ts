import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Applies an AssetParameterTemplate (category+brand+model defaults) in bulk to every
// existing Asset in the workspace that matches the same category+brand+model.
// AssetParameterTemplate.jsonc RLS already restricts create/update/delete to admin; this
// function additionally gates on admin because it fans out a single action into writes on
// potentially many Asset rows (Asset RLS itself allows admin/manager, but the "sempre
// sobrescrever" bulk-apply semantics -- overwriting fields a user may have manually
// corrected on a specific asset -- warrants the stricter, template-owner-only gate).
// Input:  { template_id: string }
// Output: { ok: true, matched_count, updated_count }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safety cap so a pathological workspace can't turn one click into an unbounded write burst;
// mirrors the batch caps already used elsewhere in this app (createAsset, nextPlaquetaSeq).
const MAX_ASSETS_PER_APPLY = 2000;

const TEMPLATE_NUMBER_FIELDS = [
  'depreciation_rate', 'useful_life_years', 'residual_value',
  'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value',
] as const;
const TEMPLATE_STRING_FIELDS = ['regulatory_registration_type', 'regulatory_registration_number', 'notes'] as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: cors });
}

// deno-lint-ignore no-explicit-any
function buildAssetUpdate(template: any): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  for (const field of TEMPLATE_NUMBER_FIELDS) {
    const value = template[field];
    if (typeof value === 'number' && Number.isFinite(value)) update[field] = value;
  }
  for (const field of TEMPLATE_STRING_FIELDS) {
    const value = template[field];
    if (typeof value === 'string' && value.trim()) update[field] = value.trim();
  }
  return update;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.workspace_id || fresh.role !== 'admin') {
      return json({ error: 'Somente administradores podem aplicar parametros em massa.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const templateId = typeof body?.template_id === 'string' ? body.template_id.trim() : '';
    if (!templateId) return json({ error: 'template_id obrigatorio.' }, 400);

    const template = (await svc.entities.AssetParameterTemplate.filter({ id: templateId }))[0];
    if (!template || template.workspace_id !== fresh.workspace_id) {
      return json({ error: 'Template nao encontrado.' }, 404);
    }

    const updateData = buildAssetUpdate(template);
    if (Object.keys(updateData).length === 0) {
      return json({ error: 'Template nao possui nenhum parametro preenchido para aplicar.' }, 400);
    }

    const matches = await svc.entities.Asset.filter(
      { workspace_id: fresh.workspace_id, category: template.category, brand: template.brand, model: template.model },
      '-created_date',
      MAX_ASSETS_PER_APPLY,
    );

    let updatedCount = 0;
    for (const asset of matches) {
      await svc.entities.Asset.update(asset.id, updateData);
      updatedCount++;
    }

    await svc.entities.AuditLog.create({
      workspace_id: fresh.workspace_id,
      actor_email: fresh.email || '',
      actor_name: fresh.full_name || fresh.email || '',
      action: 'updated',
      entity_type: 'AssetParameterTemplate',
      entity_id: templateId,
      entity_label: `${template.category} / ${template.brand} / ${template.model}`,
      summary: `Aplicou parametros de ${template.brand} ${template.model} (${template.category}) a ${updatedCount} ativo(s).`,
      changed_fields: Object.keys(updateData),
      old_data: '',
      new_data: JSON.stringify(updateData, null, 2),
    });

    return json({ ok: true, matched_count: matches.length, updated_count: updatedCount });
  } catch (_) {
    return json({ error: 'Nao foi possivel aplicar os parametros aos ativos existentes.' }, 500);
  }
});
