// Cosmetic skins for the paddle and ball. Free skins are earned by playing;
// premium skins are previewed only (purchases are not switched on yet).
const Skins = (() => {
  const LIST = [
    { id: 'neon',    name: 'Neon',      paddle: '#29f0ff', ball: '#ffffff', trail: '#29f0ff', how: 'Starter skin' },
    { id: 'inferno', name: 'Inferno',   paddle: '#ff6a1f', ball: '#ffd36b', trail: '#ff3d00', how: 'Reach level 5' },
    { id: 'toxic',   name: 'Toxic',     paddle: '#7dff3d', ball: '#eaffd0', trail: '#3dff8a', how: 'Reach endless mode (level 11)' },
    { id: 'frost',   name: 'Frost',     paddle: '#9fe8ff', ball: '#ffffff', trail: '#6fb8ff', how: 'Hit a 15-brick combo' },
    { id: 'galaxy',  name: 'Galaxy',    paddle: '#9b5cff', ball: '#f0e0ff', trail: '#ff3df2', how: 'Reach level 20' },
    { id: 'gold',    name: 'Gold Rush', paddle: '#ffd700', ball: '#fff6c0', trail: '#ffb319', how: 'Score 50,000 in one run' },
    { id: 'rainbow', name: 'Rainbow',   paddle: '#ff3df2', ball: '#ffffff', trail: '#29f0ff', premium: true, price: '$0.99',
      swatch: 'linear-gradient(90deg,#ff3d3d,#ffb319,#ffe066,#3dff8a,#29f0ff,#9b5cff,#ff3df2)' },
    { id: 'plasma',  name: 'Plasma',    paddle: '#ff4fd8', ball: '#ffffff', trail: '#8a5cff', premium: true, price: '$0.99',
      swatch: 'radial-gradient(circle,#ffffff,#ff4fd8 45%,#8a5cff)' },
    { id: 'shadow',  name: 'Shadow',    paddle: '#22223a', ball: '#000000', trail: '#ffffff', premium: true, price: '$1.99',
      swatch: 'linear-gradient(90deg,#0b0b14,#2a2a44,#0b0b14)' },
  ];
  const FREE = LIST.filter((s) => !s.premium).map((s) => s.id);
  const GUEST_KEY = 'bs-guest-skins';

  let unlocked = new Set(['neon']);
  let equipped = 'neon';

  const ssGet = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  function persist() {
    if (Account.state.kind === 'account') {
      Account.client.rpc('save_skins', { p_skin: equipped, p_unlocked: [...unlocked] }).then(() => {}, () => {});
    } else if (Account.state.kind === 'guest') {
      ssSet(GUEST_KEY, { unlocked: [...unlocked], equipped });
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
    } else if (st.kind === 'guest') {
      unlocked = new Set(['neon', ...((guestSaved && guestSaved.unlocked) || []).filter((s) => FREE.includes(s))]);
      equipped = guestSaved && unlocked.has(guestSaved.equipped) ? guestSaved.equipped : 'neon';
    } else {
      unlocked = new Set(['neon']);
      equipped = 'neon';
    }
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
    if (!unlocked.has(id)) return;
    equipped = id;
    persist();
    render();
  }

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
      if (s.premium) {
        btn.textContent = `${s.price} · SOON`;
        btn.disabled = true;
      } else if (s.id === equipped) {
        btn.textContent = 'EQUIPPED';
        btn.disabled = true;
      } else if (unlocked.has(s.id)) {
        btn.textContent = 'EQUIP';
        btn.addEventListener('click', () => equip(s.id));
      } else {
        btn.textContent = '🔒 ' + s.how;
        btn.className = 'locked';
        btn.disabled = true;
      }
      card.append(sw, name, btn);
      grid.append(card);
    }
    note.textContent = Account.state.kind === 'account'
      ? 'Your skins are saved to your account.'
      : 'Guest skins disappear when you close the game. Create an account to keep them forever.';
  }

  panel.querySelector('.lb-close').addEventListener('click', () => { panel.hidden = true; });
  panel.addEventListener('click', (e) => { if (e.target === panel) panel.hidden = true; });

  return {
    list: LIST,
    current: () => LIST.find((s) => s.id === equipped) || LIST[0],
    unlock,
    open: () => { render(); panel.hidden = false; },
    isOpen: () => !panel.hidden,
  };
})();
