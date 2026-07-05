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
    const { assetId, latitude, longitude, address, deviceInfo, scannerEmail } = body;
    if (!assetId || latitude === undefined || longitude === undefined) {
      return Response.json(
        { error: 'assetId, latitude e longitude são obrigatórios.' },
        { status: 400, headers: corsHeaders }
      );
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

    const record = await base44.asServiceRole.entities.LocationHistory.create({
      workspace_id: asset.workspace_id,
      asset_id: assetId,
      asset_name: asset.name || '',
      latitude,
      longitude,
      address: address || '',
      source: 'QR Scan',
      scanned_by: attemptedUser || scannerEmail || 'Anônimo',
      scanned_at: new Date().toISOString(),
      device_info: (deviceInfo || '').substring(0, 200),
      scanner_email: scannerEmail || attemptedUser || '',
      ip_address: ipAddress,
    });

    return Response.json({ ok: true, record_id: record.id }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
