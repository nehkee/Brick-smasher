// Online leaderboard: all-time (accounts) and last 24 hours (everyone).
const Leaderboard = (() => {
  const LABELS = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
  const panel = document.getElementById('panel');
  const list = document.getElementById('lb-list');
  const status = document.getElementById('lb-status');
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

  async function show() {
    const my = ++req;
    diffTabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.diff === diff)));
    boardTabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.board === board)));
    list.replaceChildren();
    status.textContent = 'Loading…';
    try {
      const rows = await rpc('get_leaderboard', { p_difficulty: diff, p_board: board, p_limit: 50 });
      if (my !== req) return;
      status.textContent = rows.length ? (board === 'alltime' ? 'Registered players only. Best score each.' : 'Everyone, last 24 hours. Best score each.')
        : `No scores on ${LABELS[diff]} yet. Be the first!`;
      for (const r of rows) {
        const li = document.createElement('li');
        const isMe = Account.state.name && r.name.toLowerCase() === Account.state.name.toLowerCase() &&
          r.is_guest === (Account.state.kind === 'guest');
        if (isMe) li.className = 'me';
        const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = `#${r.rank}`;
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
        if (r.is_guest) { const tag = document.createElement('em'); tag.textContent = 'GUEST'; nm.append(' ', tag); }
        const lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = `LV ${r.level}`;
        const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = Number(r.score).toLocaleString();
        li.append(rank, nm, lv, sc);
        list.append(li);
      }
    } catch (e) {
      if (my === req) status.textContent = 'Could not load the leaderboard. Check your connection.';
    }
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
  // Close on a backdrop tap only if the press also started on the backdrop.
  let downOnBackdrop = false;
  panel.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === panel; });
  panel.addEventListener('click', (e) => { if (e.target === panel && downOnBackdrop) close(); });

  return { open, close, submit, isOpen: () => !panel.hidden };
})();
