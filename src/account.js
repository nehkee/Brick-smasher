// Player identity: temporary guests (this browser tab only) or permanent accounts.
const Account = (() => {
  const SUPABASE_URL = 'https://odgnmpicwhyewxhclpxf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_h9y66CNjIxsakkBqSdl1Mg_5ivEitHT';
  // Accounts are username + password. Supabase Auth needs an email address, so one
  // is derived from the username. It is never shown or emailed. Do not change it,
  // or existing players will no longer be able to log in.
  const ACCOUNT_DOMAIN = 'players.brick-smasher-liart.vercel.app';
  const GUEST_KEY = 'bs-guest-name';

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const state = { kind: null, name: null, profile: null }; // kind: 'guest' | 'account' | null
  const listeners = [];
  const emit = () => listeners.forEach((fn) => fn(state));

  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} };

  const emailFor = (u) => `${u.toLowerCase()}@${ACCOUNT_DOMAIN}`;
  const validUsername = (u) => /^[A-Za-z0-9_]{3,12}$/.test(u);
  const cleanGuest = (n) => n.replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 12);

  async function nameTaken(name) {
    const { data, error } = await client.rpc('name_taken', { p_name: name });
    if (error) throw error;
    return !!data;
  }

  async function loadProfile(user) {
    const { data, error } = await client.from('profiles').select('username, skin, unlocked_skins').eq('id', user.id).single();
    if (error) throw error;
    state.kind = 'account';
    state.name = data.username;
    state.profile = data;
    ssSet(GUEST_KEY, null);
  }

  async function init() {
    try {
      const { data } = await client.auth.getSession();
      if (data.session) { await loadProfile(data.session.user); emit(); return; }
    } catch (e) { /* offline or expired session: fall back to guest */ }
    const g = ssGet(GUEST_KEY);
    if (g) { state.kind = 'guest'; state.name = g; }
    emit();
  }

  async function playAsGuest(raw) {
    const name = cleanGuest(raw);
    if (!name) throw new Error('Pick a name (letters, numbers, spaces, _ . -).');
    if (await nameTaken(name).catch(() => false)) throw new Error('That name belongs to a registered player. Try another.');
    ssSet(GUEST_KEY, name);
    state.kind = 'guest'; state.name = name; state.profile = null;
    emit();
  }

  async function signUp(username, password) {
    username = username.trim();
    if (!validUsername(username)) throw new Error('Username: 3 to 12 letters, numbers or _');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (await nameTaken(username)) throw new Error('That username is taken.');
    // Only sign up when the project creates accounts instantly (no confirmation email).
    const cfg = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then((r) => r.json()).catch(() => ({}));
    if (!cfg.mailer_autoconfirm) throw new Error('Accounts open very soon. Play as a guest for now!');
    const { data, error } = await client.auth.signUp({ email: emailFor(username), password, options: { data: { username } } });
    if (error) throw new Error(/already|registered|exists/i.test(error.message) ? 'That username is taken.' : error.message);
    if (!data.session) throw new Error('Sign-ups are temporarily unavailable. Play as a guest for now.');
    await loadProfile(data.user);
    emit();
  }

  async function logIn(username, password) {
    const { data, error } = await client.auth.signInWithPassword({ email: emailFor(username.trim()), password });
    if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong username or password.' : error.message);
    await loadProfile(data.user);
    emit();
  }

  async function logOut() {
    await client.auth.signOut().catch(() => {});
    state.kind = null; state.name = null; state.profile = null;
    emit();
  }

  function suggestName() {
    const a = ['Neon', 'Turbo', 'Pixel', 'Laser', 'Hyper', 'Cosmic', 'Rapid', 'Lucky', 'Wild', 'Mega'];
    const b = ['Fox', 'Bolt', 'Comet', 'Viper', 'Tiger', 'Ninja', 'Rocket', 'Wolf', 'Storm', 'Ace'];
    const p = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return p(a) + p(b) + Math.floor(Math.random() * 90 + 10);
  }

  // ---------- Panel ----------
  const panel = document.getElementById('id-panel');
  const closeBtn = panel.querySelector('.lb-close');
  const tabs = [...panel.querySelectorAll('[data-tab]')];
  const panes = [...panel.querySelectorAll('[data-pane]')];
  const tabBar = panel.querySelector('.lb-tabs');
  const acctPane = document.getElementById('acct-pane');
  let afterDone = null;
  let required = false;

  function showTab(name) {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    panes.forEach((p) => { p.hidden = p.dataset.pane !== name; });
    panes.forEach((p) => { const e = p.querySelector('.lb-err'); if (e) e.textContent = ''; });
    const first = panel.querySelector(`[data-pane="${name}"] input`);
    if (first) setTimeout(() => first.focus(), 50);
  }

  function open(opts = {}) {
    afterDone = opts.then || null;
    required = !!opts.required;
    closeBtn.hidden = required;
    panel.hidden = false;
    const guestInput = panel.querySelector('#f-guest input');
    if (!guestInput.value) guestInput.value = suggestName();
    if (state.kind === 'account' && !opts.tab) {
      document.getElementById('acct-name').textContent = state.name;
      tabBar.hidden = true;
      panes.forEach((p) => { p.hidden = true; });
      acctPane.hidden = false;
    } else {
      tabBar.hidden = false;
      acctPane.hidden = true;
      showTab(opts.tab || (state.kind === 'guest' ? 'signup' : 'guest'));
    }
  }

  function close() { panel.hidden = true; }
  function finish() {
    close();
    const fn = afterDone; afterDone = null;
    if (fn) fn();
  }

  function bindForm(id, handler) {
    const form = document.getElementById(id);
    const err = form.querySelector('.lb-err');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      err.textContent = '';
      try { await handler(new FormData(form)); finish(); }
      catch (ex) { err.textContent = ex.message || 'Something went wrong.'; }
      finally { btn.disabled = false; }
    });
  }
  bindForm('f-guest', (f) => playAsGuest(f.get('name') || ''));
  bindForm('f-login', (f) => logIn(f.get('username') || '', f.get('password') || ''));
  bindForm('f-signup', (f) => signUp(f.get('username') || '', f.get('password') || ''));
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  closeBtn.addEventListener('click', () => { if (!required) close(); });
  document.getElementById('logout').addEventListener('click', async () => {
    await logOut();
    open({ required: true, tab: 'guest' });
  });
  document.getElementById('switch-acct').addEventListener('click', () => { close(); });

  return {
    client,
    state,
    init,
    open,
    close,
    isOpen: () => !panel.hidden,
    onChange: (fn) => listeners.push(fn),
  };
})();
