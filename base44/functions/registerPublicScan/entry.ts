import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Public, unauthenticated endpoint used by the /scan QR-code page.
// Anyone who scans the physical label can trigger this — no login required —
// so every scan of an asset gets recorded with as much metadata as we can capture,
// not just scans performed by the asset's own workspace members.
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    // latitude/longitude are optional: a scan is recorded even when the visitor
    // denies the browser geolocation prompt (IP is still captured server-side).
    const { assetId, latitude, longitude, address, deviceInfo } = body;
    if (!assetId) {
      return Response.json({ error: 'assetId é obrigatório.' }, { status: 400, headers: corsHeaders });
    }

    const assets = await base44.asServiceRole.entities.Asset.filter({ id: assetId });
    const asset = assets[0];
    if (!asset) {
      return Response.json({ error: 'Ativo não encontrado.' }, { status: 404, headers: corsHeaders });
    }

    // IP must be read server-side — a client can never be trusted to report its own IP.
    const ipAddress =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '';

    let attemptedUser = null;
    try {
      const user = await base44.auth.me();
      attemptedUser = user?.email || null;
    } catch {
      // Anonymous scan — expected, not an error.
    }

    // Coordenadas são opcionais, mas quando vêm precisam ser numéricas e dentro dos
    // limites geográficos válidos — senão o mapa recebe pontos que poluem a trilha.
    const lat = Number(latitude);
    const lng = Number(longitude);
    const hasCoords =
      latitude !== undefined &&
      longitude !== undefined &&
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180;

    const record = await base44.asServiceRole.entities.LocationHistory.create({
      workspace_id: asset.workspace_id,
      asset_id: assetId,
      asset_name: asset.name || '',
      ...(hasCoords ? { latitude: lat, longitude: lng } : {}),
      address: String(address || '').substring(0, 300),
      source: 'QR Scan',
      scanned_by: attemptedUser || 'Anônimo',
      scanned_at: new Date().toISOString(),
      device_info: (deviceInfo || '').substring(0, 200),
      ip_address: ipAddress,
    });

    return Response.json({ ok: true, record_id: record.id }, { headers: corsHeaders });
  } catch (_error) {
    return Response.json({ error: 'Não foi possível registrar o scan.' }, { status: 500, headers: corsHeaders });
  }
});
