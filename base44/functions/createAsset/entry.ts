import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Server-side asset creation with REAL plan-limit enforcement.
// Entity RLS blocks Asset.create from the client SDK, so this function is the
// only way to register assets: it validates input, checks the workspace's plan
// status and asset limit, and stamps workspace_id from the session (never from
// the request body).
// Input:  { assets: [ { name, category, acquisition_value, purchase_date,
//                       depreciation_rate, ...optional fields } ], plaqueta_prefix?: string }  (1..200)
// plaqueta_prefix: when set, any item WITHOUT its own `plaqueta` gets one auto-assigned
// as `${prefix}-${seq}`, continuing after the highest existing sequence for that prefix
// in the workspace (batch-create / duplicate-asset flows in AssetForm.jsx / AssetDetail.jsx).
// Output: { ok: true, created, failed, ids, limit_reached }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mirrors src/lib/plans.js — null means unlimited (enterprise).
const PLAN_ASSET_LIMITS: Record<string, number | null> = {
  starter: 100,
  professional: 1000,
  enterprise: null,
};

const CATEGORIES = ['Imóveis', 'Veículos', 'Equipamentos', 'Investimentos', 'Intangíveis'];
const STATUSES = ['Ativo', 'Em Manutenção', 'Inativo', 'Alienado'];
const CONSERVATION = ['Novo', 'Ótimo', 'Bom', 'Regular', 'Ruim'];
const OWNERSHIP_TYPES = ['proprio', 'terceiros', 'locado', 'comodato'];

const STRING_FIELDS = [
  // cost_center removido (legado, RLS de campo travada em Asset.jsonc -- so sector_id e valido pra escrita agora).
  'plaqueta', 'description', 'account', 'branch_id', 'sector_id', 'location', 'serial_number', 'rfid_tag_id',
  'fiscal_document', 'warranty_expiry_date', 'next_review_date', 'depreciation_start_date',
  'supplier_id', 'supplier_name', 'photo_url', 'invoice_url', 'external_link',
  'registry_link', 'notes', 'purchase_date',
  // Campos especificos por categoria (Imoveis / Veiculos) — opcionais, aditivos.
  'property_registration_number', 'property_registry_office', 'property_iptu_number',
  'property_registration_type', 'vehicle_plate', 'vehicle_renavam', 'vehicle_chassis',
  'vehicle_ipva_due_date', 'vehicle_fuel_type', 'vehicle_model_year',
  // Titularidade / obras em andamento (item 9).
  'real_owner_name', 'real_owner_document', 'construction_completion_date',
  // Depreciacao fiscal (item 4) — data.
  'fiscal_depreciation_start_date',
];
const NUMBER_FIELDS = [
  'acquisition_value', 'depreciation_rate', 'useful_life_years', 'residual_value', 'property_area_m2',
  // Depreciacao fiscal (item 4) — numericos.
  'fiscal_depreciation_rate', 'fiscal_useful_life_years', 'fiscal_residual_value',
];

function sanitizeAsset(raw: Record<string, unknown>): { data?: Record<string, unknown>; error?: string } {
  const name = String(raw.name || '').trim().substring(0, 300);
  if (!name) return { error: 'Descrição do bem é obrigatória.' };
  const category = CATEGORIES.includes(raw.category as string) ? (raw.category as string) : null;
  if (!category) return { error: 'Grupo de patrimônio inválido.' };

  const data: Record<string, unknown> = { name, category };
  for (const f of NUMBER_FIELDS) {
    const n = Number(raw[f]);
    data[f] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  for (const f of STRING_FIELDS) {
    if (raw[f] !== undefined && raw[f] !== null) data[f] = String(raw[f]).substring(0, 2000);
  }
  if (!data.purchase_date) return { error: 'Data de aquisição é obrigatória.' };
  data.status = STATUSES.includes(raw.status as string) ? raw.status : 'Ativo';
  if (CONSERVATION.includes(raw.conservation_state as string)) data.conservation_state = raw.conservation_state;
  data.ownership_type = OWNERSHIP_TYPES.includes(raw.ownership_type as string) ? raw.ownership_type : 'proprio';
  data.is_construction_in_progress = raw.is_construction_in_progress === true || raw.is_construction_in_progress === 'true';
  return { data };
}

// Resolves the next free sequence number for a plaqueta prefix, scanning existing
// plaquetas in the workspace so repeated batches/duplications never collide.
async function nextPlaquetaSeq(svc: any, workspaceId: string, prefix: string): Promise<number> {
  const rows = await svc.entities.Asset.filter({ workspace_id: workspaceId }, '-created_date', 5000, 0, ['plaqueta']);
  const marker = `${prefix}-`;
  let max = 0;
  for (const row of rows) {
    const p = String(row?.plaqueta || '');
    if (!p.startsWith(marker)) continue;
    const n = Number(p.slice(marker.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

// Fail-closed plan gate (mirrors PaymentGate.jsx, but on the server).
function planBlocksWrites(ws: Record<string, unknown>): string | null {
  const status = ws.plan_status as string;
  const today = new Date().toISOString().split('T')[0];
  if (status === 'suspended' || status === 'cancelled') {
    return 'Conta suspensa. Regularize o pagamento em Plano & Cobrança para continuar.';
  }
  if (status === 'trial') {
    const ends = (ws.trial_ends_at as string) || '';
    if (!ends || ends < today) return 'Seu período de avaliação encerrou. Escolha um plano para continuar.';
  }
  if (status === 'active') {
    const expires = (ws.plan_expires_at as string) || '';
    if (expires) {
      const grace = new Date(expires);
      grace.setDate(grace.getDate() + 7);
      if (grace.toISOString().split('T')[0] < today) {
        return 'Pagamento em atraso. Regularize em Plano & Cobrança para continuar.';
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const svc = base44.asServiceRole;
    const fresh = (await svc.entities.User.filter({ id: user.id }))[0];
    if (!fresh?.workspace_id || !['admin', 'manager'].includes(fresh.role)) {
      return json({ error: 'Você não tem permissão para cadastrar ativos.' }, 403);
    }
    const ws = (await svc.entities.Workspace.filter({ id: fresh.workspace_id }))[0];
    if (!ws) return json({ error: 'Workspace não encontrado.' }, 404);

    const blocked = planBlocksWrites(ws);
    if (blocked) return json({ error: blocked }, 403);

    const body = await req.json().catch(() => ({}));
    const assets = Array.isArray(body.assets) ? body.assets.slice(0, 200) : [];
    if (assets.length === 0) return json({ error: 'Nenhum ativo para cadastrar.' }, 400);

    const plaquetaPrefix = typeof body.plaqueta_prefix === 'string' ? body.plaqueta_prefix.trim().substring(0, 50) : '';
    let plaquetaSeq = plaquetaPrefix ? await nextPlaquetaSeq(svc, ws.id, plaquetaPrefix) : 0;

    const limit = PLAN_ASSET_LIMITS[ws.plan as string] ?? PLAN_ASSET_LIMITS.starter;
    let remaining = Infinity;
    if (limit !== null) {
      const existing = await svc.entities.Asset.filter(
        { workspace_id: ws.id }, '-created_date', limit + 1, 0, ['id']
      );
      remaining = Math.max(0, limit - existing.length);
      if (remaining === 0) {
        return json(
          { error: `Seu plano permite até ${limit} ativos. Faça upgrade em Plano & Cobrança para cadastrar mais.` },
          403
        );
      }
    }

    let created = 0;
    let failed = 0;
    let limitReached = false;
    const ids: string[] = [];
    for (const raw of assets) {
      if (created >= remaining) { limitReached = true; failed++; continue; }
      const { data, error } = sanitizeAsset(raw || {});
      if (error || !data) { failed++; continue; }
      if (plaquetaPrefix && !data.plaqueta) {
        data.plaqueta = `${plaquetaPrefix}-${String(plaquetaSeq).padStart(Math.max(3, String(plaquetaSeq).length), '0')}`;
        plaquetaSeq++;
      }
      try {
        // public_scan_token: opaque, unguessable identifier for the /scan QR code —
        // never the row's own id (security audit A3: an internal id is enumerable).
        const row = await svc.entities.Asset.create({ ...data, workspace_id: ws.id, public_scan_token: crypto.randomUUID() });
        ids.push(row.id);
        created++;
      } catch (_) {
        failed++;
      }
    }

    return json({ ok: true, created, failed, ids, limit_reached: limitReached });
  } catch (_) {
    return json({ error: 'Não foi possível cadastrar o(s) ativo(s).' }, 500);
  }
});
