// Creates a Brick Smasher account (username + password) without a confirmation email.
// Public endpoint: it validates its own input and only ever creates confirmed
// accounts on the synthetic players domain. Deployed with verify_jwt = false.
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

  const { error } = await admin.auth.admin.createUser({
    email: `${username.toLowerCase()}@${ACCOUNT_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return json({ error: taken ? 'That username is taken.' : 'Could not create account. Try again.' }, taken ? 409 : 500);
  }
  return json({ ok: true });
});
