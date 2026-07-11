import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Public, unauthenticated endpoint used by the /scan QR-code page.
// Only returns the safe subset of fields PublicScan.jsx actually displays —
// never the full Asset record and never data from other workspaces beyond this one asset.
//
// Looked up by `public_scan_token` (opaque, random per asset) — NOT by the asset's
// own id. The internal id is a predictable/enumerable identifier; looking assets up
// by it let anyone script through every asset of every tenant (security audit A3).
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);

    const { token } = await req.json();
    if (!token) {
      return Response.json({ error: 'token é obrigatório.' }, { status: 400, headers: corsHeaders });
    }

    const assets = await base44.asServiceRole.entities.Asset.filter({ public_scan_token: token });
    const asset = assets[0];
    if (!asset) {
      return Response.json({ error: 'Ativo não encontrado.' }, { status: 404, headers: corsHeaders });
    }

    // Minimal public projection — identification only. No financial/depreciation
    // fields, no internal workspace id, no location or serial number (security audit A2).
    const publicAsset = {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      photo_url: asset.photo_url,
      plaqueta: asset.plaqueta,
    };

    return Response.json({ ok: true, asset: publicAsset }, { headers: corsHeaders });
  } catch (_error) {
    return Response.json({ error: 'Não foi possível carregar o ativo.' }, { status: 500, headers: corsHeaders });
  }
});
