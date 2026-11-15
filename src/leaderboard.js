// Online leaderboard: all-time (accounts) and last 24 hours (everyone), with a
// top-3 podium, colours per mode and the player's own rank pinned at the bottom.
const Leaderboard = (() => {
  const LABELS = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD', berserk: 'BERSERK' };
  const COLORS = { easy: '#3dff8a', normal: '#29f0ff', hard: '#ff3d6e', berserk: '#ff8a3d' };
  const panel = document.getElementById('panel');
  const card = panel.querySelector('.board-card');
  const podium = document.getElementById('lb-podium');
  const list = document.getElementById('lb-list');
  const status = document.getElementById('lb-status');
  const me = document.getElementById('lb-me');
  const diffTabs = [...panel.querySelectorAll('[data-diff]')];
  const boardTabs = [...panel.querySelectorAll('[data-board]')];
  let diff = 'normal';
  let board = 'alltime';
  let req = 0;

  async function rpc(fn, args) {
    const { data, error } = await Account.client.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  }

  function submit(score, level, difficulty) {
    return rpc('submit_score', {
      p_name: Account.state.name || '', p_score: score, p_level: level, p_difficulty: difficulty,
      p_guest_id: Account.state.kind === 'guest' ? Account.state.guestId : null,
    });
  }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const fmt = (n) => Number(n).toLocaleString();
  const isMine = (r) => !!Account.state.name && r.name.toLowerCase() === Account.state.name.toLowerCase() &&
    r.is_guest === (Account.state.kind === 'guest');

  function podiumSpot(r, place) {
    const spot = el('div', `pod p${place}` + (isMine(r) ? ' me' : ''));
    spot.style.animationDelay = `${[0, 0.15, 0, 0.3][place]}s`;
    if (place === 1) spot.append(el('div', 'crown', '👑'));
    spot.append(el('div', 'medal', String(place)));
    spot.append(el('div', 'pname', r.name));
    spot.append(el('div', 'pscore', fmt(r.score)));
    spot.append(el('div', 'psub', `STAGE ${r.level}${r.is_guest ? ' · GUEST' : ''}`));
    spot.append(el('div', 'step'));
    return spot;
  }

  function row(r, i) {
    const li = el('li', isMine(r) ? 'me' : '');
    li.style.animationDelay = `${Math.min(i, 20) * 0.03}s`;
    li.append(el('span', 'rank', String(r.rank)));
    const who = el('span', 'who');
    who.append(el('span', 'nm', r.name), el('span', 'sub', `STAGE ${r.level}${r.is_guest ? ' · GUEST' : ''}`));
    li.append(who, el('span', 'sc', fmt(r.score)));
    return li;
  }

  function skeleton() {
    podium.replaceChildren();
    list.replaceChildren(...[0, 1, 2, 3].map(() => { const li = el('li', 'skel'); li.append(el('span', 'bar')); return li; }));
  }

  async function show() {
    const my = ++req;
    card.style.setProperty('--acc', COLORS[diff]);
    diffTabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.diff === diff)));
    boardTabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.board === board)));
    status.textContent = '';
    me.hidden = true;
    skeleton();
    try {
      const rows = await rpc('get_leaderboard', { p_difficulty: diff, p_board: board, p_limit: 50 });
      if (my !== req) return;
      podium.replaceChildren();
      list.replaceChildren();
      if (!rows.length) {
        status.replaceChildren(el('span', 'empty-text', `No ${LABELS[diff]} scores ${board === 'today' ? 'today' : 'yet'}. Be the first legend!`));
      } else {
        const top = rows.slice(0, 3);
        const order = [top[1], top[0], top[2]];
        order.forEach((r, i) => { if (r) podium.append(podiumSpot(r, [2, 1, 3][i])); });
        rows.slice(3).forEach((r, i) => list.append(row(r, i)));
        status.replaceChildren(el('span', 'note', board === 'alltime' ? 'Registered players · best score each' : 'Everyone · last 24 hours · best score each'));
      }
      showMine(my);
    } catch (e) {
      if (my === req) { podium.replaceChildren(); list.replaceChildren(); status.textContent = 'Could not load the leaderboard. Check your connection.'; }
    }
  }

  // Pinned bar with the player's own best and rank on this board.
  async function showMine(my) {
    const st = Account.state;
    if (!st.kind) return;
    if (board === 'alltime' && st.kind === 'guest') {
      me.replaceChildren(el('span', 'me-cta full', 'GUESTS RANK ON TODAY · SIGN UP TO RANK ALL-TIME'));
      me.hidden = false;
      return;
    }
    try {
      const res = await rpc('my_best', { p_difficulty: diff, p_board: board, p_guest_id: st.guestId || null, p_name: st.name });
      if (my !== req) return;
      const r = res && res[0];
      if (!r) {
        me.replaceChildren(el('span', 'me-label', 'YOU'), el('span', 'me-cta', `NO ${LABELS[diff]} SCORE ${board === 'today' ? 'TODAY' : 'YET'}`));
      } else {
        me.replaceChildren(el('span', 'me-rank', `#${r.rank}`), el('span', 'me-label', `YOU · ${st.name}`), el('span', 'me-score', fmt(r.score)));
      }
      me.hidden = false;
    } catch (e) { /* the board itself still shows */ }
  }

  function open(o = {}) {
    diff = o.diff || diff;
    board = o.board || (Account.state.kind === 'account' ? 'alltime' : 'today');
    panel.hidden = false;
    show();
  }
  const close = () => { panel.hidden = true; };

  diffTabs.forEach((t) => t.addEventListener('click', () => { diff = t.dataset.diff; show(); }));
  boardTabs.forEach((t) => t.addEventListener('click', () => { board = t.dataset.board; show(); }));
  panel.querySelector('.lb-close').addEventListener('click', close);
  let downOnBackdrop = false;
  panel.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === panel; });
  panel.addEventListener('click', (e) => { if (e.target === panel && downOnBackdrop) close(); });

  return { open, close, submit, isOpen: () => !panel.hidden };
})();
