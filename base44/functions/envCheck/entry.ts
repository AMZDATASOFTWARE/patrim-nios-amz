// TEMPORARY diagnostic — reports only the PRESENCE of expected secrets,
// never their values. Delete after the Stripe setup is verified.
Deno.serve(() => {
  const names = Deno.env
    .toObject
    ? Object.keys(Deno.env.toObject()).filter((k) => k.toUpperCase().includes('STRIPE'))
    : [];
  return Response.json({
    has_STRIPE_SECRET_KEY: Boolean(Deno.env.get('STRIPE_SECRET_KEY')),
    has_STRIPE_WEBHOOK_SECRET: Boolean(Deno.env.get('STRIPE_WEBHOOK_SECRET')),
    stripe_like_names_present: names, // names only, values are never returned
  });
});
