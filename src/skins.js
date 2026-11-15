// Cosmetic skins for the paddle and ball. Free skins are earned by playing.
// Premium skins have special effects (flair) but never a gameplay advantage;
// they can be tried free for 24 hours by completing the daily challenge
// (purchases are not switched on yet).
const Skins = (() => {
  const LIST = [
    { id: 'neon',    name: 'Neon',      paddle: '#29f0ff', ball: '#ffffff', trail: '#29f0ff', how: 'Starter skin' },
    { id: 'inferno', name: 'Inferno',   paddle: '#ff6a1f', ball: '#ffd36b', trail: '#ff3d00', how: 'Reach player level 10' },
    { id: 'toxic',   name: 'Toxic',     paddle: '#7dff3d', ball: '#eaffd0', trail: '#3dff8a', how: 'Reach player level 15' },
    { id: 'frost',   name: 'Frost',     paddle: '#9fe8ff', ball: '#ffffff', trail: '#6fb8ff', how: 'Reach player level 20' },
    { id: 'galaxy',  name: 'Galaxy',    paddle: '#9b5cff', ball: '#f0e0ff', trail: '#ff3df2', how: 'Reach player level 30' },
    { id: 'gold',    name: 'Gold Rush', paddle: '#ffd700', ball: '#fff6c0', trail: '#ffb319', how: 'Score 50,000 in one run (player level 10+)' },
    { id: 'rainbow', name: 'Rainbow',   paddle: '#ff3df2', ball: '#ffffff', trail: '#29f0ff', premium: true, price: '$0.99',
      flair: 'rainbow', perk: 'Rainbow paddle, trail and brick bursts',
      swatch: 'linear-gradient(90deg,#ff3d3d,#ffb319,#ffe066,#3dff8a,#29f0ff,#9b5cff,#ff3df2)' },
    { id: 'plasma',  name: 'Plasma',    paddle: '#ff4fd8', ball: '#ffffff', trail: '#8a5cff', premium: true, price: '$0.99',
      flair: 'plasma', perk: 'Pulsing paddle and electric sparks',
      swatch: 'radial-gradient(circle,#ffffff,#ff4fd8 45%,#8a5cff)' },
    { id: 'shadow',  name: 'Shadow',    paddle: '#22223a', ball: '#000000', trail: '#ffffff', premium: true, price: '$1.99',
      flair: 'shadow', perk: 'Dark paddle, smoke trail and white shockwaves',
      swatch: 'linear-gradient(90deg,#0b0b14,#2a2a44,#0b0b14)' },
  ];
  const FREE = LIST.filter((s) => !s.premium).map((s) => s.id);
  const GUEST_KEY = 'bs-guest-skins';
  const TRIAL_EQUIP_KEY = 'bs-trial-skin'; // premium skin equipped during a trial (this device)
  const byId = (id) => LIST.find((s) => s.id === id);
  const trialLeft = (id) => (typeof Progress !== 'undefined' ? Progress.trialLeft(id) : 0);
  const usable = (id) => unlocked.has(id) || (byId(id) && byId(id).premium && trialLeft(id) > 0);

  let unlocked = new Set(['neon']);
  let equipped = 'neon';

  // Guest skins live as long as the guest identity (12 hours); account.js clears them.
  const ssGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let lastFree = 'neon'; // what to fall back to when a trial ends

  function persist() {
    const premium = byId(equipped) && byId(equipped).premium;
    try { premium ? localStorage.setItem(TRIAL_EQUIP_KEY, equipped) : localStorage.removeItem(TRIAL_EQUIP_KEY); } catch (e) {}
    if (Account.state.kind === 'account') {
      Account.client.rpc('save_skins', { p_skin: premium ? lastFree : equipped, p_unlocked: [...unlocked] }).then(() => {}, () => {});
    } else if (Account.state.kind === 'guest') {
      ssSet(GUEST_KEY, { unlocked: [...unlocked], equipped: premium ? lastFree : equipped });
    }
  }

  // Load skins whenever the player identity changes.
  Account.onChange((st) => {
    const guestSaved = ssGet(GUEST_KEY);
    if (st.kind === 'account' && st.profile) {
      const before = new Set(unlocked);
      unlocked = new Set(['neon', ...st.profile.unlocked_skins.filter((s) => FREE.includes(s))]);
      // A guest who just created an account keeps what they earned this session.
      if (guestSaved) guestSaved.unlocked.forEach((s) => FREE.includes(s) && unlocked.add(s));
      before.forEach((s) => FREE.includes(s) && unlocked.add(s));
      equipped = unlocked.has(st.profile.skin) ? st.profile.skin : 'neon';
      if (unlocked.size > st.profile.unlocked_skins.length) persist();
      try { localStorage.removeItem(GUEST_KEY); } catch (e) {}
    } else if (st.kind === 'guest') {
      unlocked = new Set(['neon', ...((guestSaved && guestSaved.unlocked) || []).filter((s) => FREE.includes(s))]);
      equipped = guestSaved && unlocked.has(guestSaved.equipped) ? guestSaved.equipped : 'neon';
    } else {
      unlocked = new Set(['neon']);
      equipped = 'neon';
    }
    lastFree = equipped;
    // Resume a premium skin trial on this device (progress loads first, see below).
    setTimeout(() => {
      let t = null;
      try { t = localStorage.getItem(TRIAL_EQUIP_KEY); } catch (e) {}
      if (t && usable(t)) equipped = t;
      render();
    }, 0);
    render();
  });

  function unlock(id) {
    if (unlocked.has(id) || !FREE.includes(id)) return null;
    unlocked.add(id);
    persist();
    render();
    return LIST.find((s) => s.id === id);
  }

  function equip(id) {
    if (!usable(id)) return;
    equipped = id;
    if (!byId(id).premium) lastFree = id;
    persist();
    render();
  }

  const hoursLeft = (ms) => (ms >= 3600000 ? `${Math.ceil(ms / 3600000)}H` : `${Math.max(1, Math.ceil(ms / 60000))}M`);

  // ---------- Panel ----------
  const panel = document.getElementById('skins-panel');
  const grid = document.getElementById('skins-grid');
  const note = document.getElementById('skins-note');

  function render() {
    if (!grid) return;
    grid.replaceChildren();
    for (const s of LIST) {
      const card = document.createElement('div');
      card.className = 'skin' + (s.id === equipped ? ' equipped' : '') + (s.premium ? ' premium' : '');
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.background = s.swatch || `linear-gradient(90deg, ${s.paddle}, ${s.trail})`;
      sw.style.boxShadow = `0 0 14px ${s.paddle}`;
      const ball = document.createElement('span');
      ball.className = 'ball';
      ball.style.background = s.ball;
      ball.style.boxShadow = `0 0 10px ${s.trail}`;
      sw.append(ball);
      const name = document.createElement('div');
      name.className = 'sname';
      name.textContent = s.name;
      const btn = document.createElement('button');
      const left = s.premium ? trialLeft(s.id) : 0;
      let tag = null;
      if (s.premium && left > 0) {
        tag = document.createElement('div');
        tag.className = 'trial';
        tag.textContent = `FREE TRIAL · ${hoursLeft(left)} LEFT`;
        card.classList.add('trialing');
      }
      if (s.premium && !(left > 0)) {
        btn.textContent = `${s.price} · SOON`;
        btn.disabled = true;
      } else if (s.id === equipped) {
        btn.textContent = 'EQUIPPED';
        btn.disabled = true;
      } else if (usable(s.id)) {
        btn.textContent = 'EQUIP';
        btn.addEventListener('click', () => equip(s.id));
      } else {
        btn.textContent = '🔒 ' + s.how;
        btn.className = 'locked';
        btn.disabled = true;
      }
      card.append(sw, name);
      if (tag) card.append(tag);
      if (s.perk) {
        const perk = document.createElement('div');
        perk.className = 'perk';
        perk.textContent = s.perk;
        card.append(perk);
      }
      card.append(btn);
      grid.append(card);
    }
    // Only guests need a note: their skins disappear with the guest name.
    note.textContent = Account.state.kind === 'account' ? '' : 'Guest skins reset after 12 hours. Sign up to keep them.';
  }

  panel.querySelector('.lb-close').addEventListener('click', () => { panel.hidden = true; });
  let downOnBackdrop = false;
  panel.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === panel; });
  panel.addEventListener('click', (e) => { if (e.target === panel && downOnBackdrop) panel.hidden = true; });

  return {
    list: LIST,
    unlockedCount: () => unlocked.size,
    current: () => {
      const s = byId(equipped) || LIST[0];
      if (s.premium && !(trialLeft(s.id) > 0)) { equipped = lastFree; persist(); return byId(lastFree) || LIST[0]; }
      return s;
    },
    byId,
    equip,
    unlock,
    open: () => { render(); panel.hidden = false; },
    isOpen: () => !panel.hidden,
  };
})();
