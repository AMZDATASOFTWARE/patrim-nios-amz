import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Public, unauthenticated endpoint used by the /scan QR-code page.
// Only returns the safe subset of fields PublicScan.jsx actually displays —
// never the full Asset record and never data from other workspaces beyond this one asset.
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);

    const { assetId } = await req.json();
    if (!assetId) {
      return Response.json({ error: 'assetId é obrigatório.' }, { status: 400, headers: corsHeaders });
    }

    const assets = await base44.asServiceRole.entities.Asset.filter({ id: assetId });
    const asset = assets[0];
    if (!asset) {
      return Response.json({ error: 'Ativo não encontrado.' }, { status: 404, headers: corsHeaders });
    }

    const publicAsset = {
      id: asset.id,
      workspace_id: asset.workspace_id,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      photo_url: asset.photo_url,
      location: asset.location,
      serial_number: asset.serial_number,
      acquisition_value: asset.acquisition_value,
      residual_value: asset.residual_value,
      purchase_date: asset.purchase_date,
      depreciation_rate: asset.depreciation_rate,
      useful_life_years: asset.useful_life_years,
    };

    return Response.json({ ok: true, asset: publicAsset }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
