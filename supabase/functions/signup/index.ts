// Creates a Brick Smasher account (username + password) without a confirmation email.
// Public endpoint: it validates its own input, rate-limits sign-ups per network,
// and only ever creates confirmed accounts on the synthetic players domain.
// Deployed with verify_jwt = false.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ACCOUNT_DOMAIN = 'players.brick-smasher-liart.vercel.app';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!/^[A-Za-z0-9_]{3,12}$/.test(username)) return json({ error: 'Username: 3 to 12 letters, numbers or _' }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: 'Password must be 6 to 72 characters.' }, 400);

  const { data: taken, error: takenErr } = await admin.rpc('name_taken', { p_name: username });
  if (takenErr) return json({ error: 'Could not check username. Try again.' }, 500);
  if (taken) return json({ error: 'That username is taken.' }, 409);

  // Rate limit: at most 5 sign-ups per network address per hour (and 300/hour
  // overall). Only a one-way hash of the address is stored, never the address.
  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`brick-smasher:${ip}`));
  const ipHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const { data: allowed, error: limitErr } = await admin.rpc('allow_signup', { p_ip_hash: ipHash });
  if (limitErr) return json({ error: 'Could not create account. Try again.' }, 500);
  if (!allowed) return json({ error: 'Too many sign-ups from your network. Please try again later.' }, 429);

  const { error } = await admin.auth.admin.createUser({
    email: `${username.toLowerCase()}@${ACCOUNT_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    const dup = /already|registered|exists/i.test(error.message);
    return json({ error: dup ? 'That username is taken.' : 'Could not create account. Try again.' }, dup ? 409 : 500);
  }
  return json({ ok: true });
});
