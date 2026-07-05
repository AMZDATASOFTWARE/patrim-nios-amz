import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// One-time bootstrap, explicitly confirmed by the app owner: grants is_platform_admin
// to ceo@amzdatasoftware.com. Hardcoded to this single email on purpose — this file
// is deleted immediately after use, it is not a permanent endpoint.
const OWNER_EMAIL = 'ceo@amzdatasoftware.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const users = await base44.asServiceRole.entities.User.filter({ email: OWNER_EMAIL });
    if (users.length === 0) {
      return Response.json({ error: 'Owner user not found' }, { status: 404 });
    }
    await base44.asServiceRole.entities.User.update(users[0].id, { is_platform_admin: true });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
