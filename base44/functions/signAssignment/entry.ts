import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Captures an in-person signature for a responsibility term (AssetAssignment).
// The signature image is drawn on a canvas by the collaborator, sent here as a
// base64 PNG, uploaded, hashed (SHA-256 for integrity), and the protected fields
// (signed/signature_*) are stamped by this service-role function — field-level
// RLS blocks anyone else from flipping them.
// NOTE: this is a lightweight signature (captured drawing + hash + trail), NOT a
// qualified ICP-Brasil / DocuSign digital signature.
// Input: { assignment_id, signature_png_base64, signed_by_name }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
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
      return json({ error: 'Voce nao tem permissao para registrar assinaturas.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const assignmentId = String(body.assignment_id || '');
    const b64 = String(body.signature_png_base64 || '');
    if (!assignmentId || !b64) return json({ error: 'Assinatura e termo obrigatorios.' }, 400);

    const assignment = (await svc.entities.AssetAssignment.filter({ id: assignmentId, workspace_id: fresh.workspace_id }))[0];
    if (!assignment) return json({ error: 'Termo nao encontrado.' }, 404);
    if (assignment.signed) return json({ error: 'Este termo ja foi assinado.' }, 409);

    // Convert the data URL / base64 to a PNG File and upload it.
    const rawB64 = b64.includes(',') ? b64.split(',')[1] : b64;
    let fileUrl = '';
    try {
      const bytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
      const file = new File([bytes], `assinatura-${assignmentId}.png`, { type: 'image/png' });
      const up = await svc.integrations.Core.UploadFile({ file });
      fileUrl = up?.file_url || '';
    } catch (_) {
      return json({ error: 'Nao foi possivel processar a imagem da assinatura.' }, 400);
    }

    const signedAt = new Date().toISOString();
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || '';
    const hash = await sha256Hex(`${rawB64}|${assignmentId}|${assignment.collaborator_cpf || ''}|${signedAt}`);

    await svc.entities.AssetAssignment.update(assignmentId, {
      signed: true,
      signature_file_url: fileUrl,
      signature_hash: hash,
      signed_at: signedAt,
      signed_by_ip: ip,
      signed_by_name: String(body.signed_by_name || assignment.collaborator_name || '').substring(0, 200),
      signature_method: 'desenho',
    });

    return json({ ok: true, signature_file_url: fileUrl, signature_hash: hash, signed_at: signedAt });
  } catch (_) {
    return json({ error: 'Nao foi possivel registrar a assinatura.' }, 500);
  }
});
