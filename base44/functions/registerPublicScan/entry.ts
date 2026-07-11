import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Public, unauthenticated endpoint used by the /scan QR-code page.
// Anyone who scans the physical label can trigger this — no login required —
// so every scan of an asset gets recorded with as much metadata as we can capture,
// not just scans performed by the asset's own workspace members.
//
// Looked up by `public_scan_token` (opaque, random per asset) — NOT by the asset's
// own id, which would let anyone script through every asset of every tenant and
// pollute their LocationHistory (security audit A3).
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
    const { token, latitude, longitude, address, deviceInfo } = body;
    if (!token) {
      return Response.json({ error: 'token é obrigatório.' }, { status: 400, headers: corsHeaders });
    }

    const assets = await base44.asServiceRole.entities.Asset.filter({ public_scan_token: token });
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

    // Rate-limit: a public endpoint can be flooded by anyone holding the label.
    // Collapse repeated scans of the same asset from the same IP within a short
    // window into a single record, so the tenant's trail can't be spammed.
    const THROTTLE_MS = 30_000;
    if (ipAddress) {
      const recent = await base44.asServiceRole.entities.LocationHistory.filter(
        { asset_id: asset.id, ip_address: ipAddress }, '-scanned_at', 1
      );
      const last = recent[0];
      if (last?.scanned_at && Date.now() - new Date(last.scanned_at).getTime() < THROTTLE_MS) {
        return Response.json({ ok: true, throttled: true }, { headers: corsHeaders });
      }
    }

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
      asset_id: asset.id,
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
