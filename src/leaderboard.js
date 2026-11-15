// Online leaderboard (Supabase). The publishable key is safe to ship in the
// browser: the database only allows the two validated functions below.
const Leaderboard = (() => {
  const URL = 'https://odgnmpicwhyewxhclpxf.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_h9y66CNjIxsakkBqSdl1Mg_5ivEitHT';
  const LABELS = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

  async function rpc(fn, body) {
    const res = await fetch(URL + fn, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.message) || `HTTP ${res.status}`);
    return data;
  }

  const submit = (name, score, level, diff) =>
    rpc('submit_score', { p_name: name, p_score: score, p_level: level, p_difficulty: diff });
  const fetchBoard = (diff) => rpc('get_leaderboard', { p_difficulty: diff, p_limit: 50 });

  // ---------- Panel UI ----------
  const panel = document.getElementById('panel');
  const form = document.getElementById('lb-form');
  const formMsg = document.getElementById('lb-form-msg');
  const nameInput = document.getElementById('lb-name');
  const formErr = document.getElementById('lb-form-err');
  const list = document.getElementById('lb-list');
  const status = document.getElementById('lb-status');
  const tabs = [...panel.querySelectorAll('[data-diff]')];
  let current = 'normal';
  let opts = {};
  let highlight = null; // { diff, rank }

  function close() {
    panel.hidden = true;
    nameInput.blur();
  }

  async function show(diff) {
    current = diff;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.diff === diff)));
    list.replaceChildren();
    status.textContent = 'Loading…';
    try {
      const rows = await fetchBoard(diff);
      if (current !== diff) return;
      status.textContent = rows.length ? '' : `No scores on ${LABELS[diff]} yet. Be the first!`;
      for (const r of rows) {
        const li = document.createElement('li');
        if (highlight && highlight.diff === diff && highlight.rank === Number(r.rank)) li.className = 'me';
        const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = `#${r.rank}`;
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
        const lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = `LV ${r.level}`;
        const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = Number(r.score).toLocaleString();
        li.append(rank, nm, lv, sc);
        list.append(li);
      }
    } catch (e) {
      if (current === diff) status.textContent = 'Could not load the leaderboard. Check your connection.';
    }
  }

  function open(o = {}) {
    opts = o;
    panel.hidden = false;
    formErr.textContent = '';
    if (o.submission) {
      form.hidden = false;
      formMsg.textContent = `Your score: ${o.submission.score.toLocaleString()} (level ${o.submission.level}, ${LABELS[o.submission.diff]})`;
      nameInput.value = o.defaultName || '';
      setTimeout(() => nameInput.focus(), 50);
    } else {
      form.hidden = true;
    }
    show(o.diff || 'normal');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 12);
    if (!name) { formErr.textContent = 'Pick a nickname (letters, numbers, spaces, _ . -).'; return; }
    const sub = opts.submission;
    const btn = form.querySelector('button');
    btn.disabled = true;
    formErr.textContent = '';
    try {
      const rank = await submit(name, sub.score, sub.level, sub.diff);
      highlight = { diff: sub.diff, rank: Number(rank) };
      form.hidden = true;
      opts.submission = null;
      if (opts.onSubmitted) opts.onSubmitted(Number(rank), name);
      show(sub.diff);
    } catch (err) {
      formErr.textContent = 'Could not submit: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  });

  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.diff)));
  panel.querySelector('.lb-close').addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });

  return {
    open,
    close,
    isOpen: () => !panel.hidden,
    submit: (name, score, level, diff) =>
      submit(name, score, level, diff).then((rank) => { highlight = { diff, rank: Number(rank) }; return Number(rank); }),
  };
})();
