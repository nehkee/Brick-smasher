// Share your score: a score-card image, the phone's own share sheet where
// available, links for X / Facebook / WhatsApp / Telegram / Reddit, copy link
// and save image. Shared links carry a challenge ("NeonFox42 scored 12,340 on
// Hard. Beat it!") that the friend sees when they open the game.
const Share = (() => {
  const SITE = 'https://brick-smasher-liart.vercel.app/';
  const DIFF_LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD', berserk: 'BERSERK' };
  const DIFF_COLOR = { easy: '#3dff8a', normal: '#29f0ff', hard: '#ff3d6e', berserk: '#ff8a3d' };

  // ---------- Incoming challenge (?c=score&d=diff&n=name&l=level) ----------
  const challenge = (() => {
    try {
      const q = new URLSearchParams(location.search);
      if (!q.has('c')) return null;
      const score = parseInt(q.get('c'), 10);
      const level = parseInt(q.get('l'), 10) || 1;
      const diff = q.get('d');
      const name = (q.get('n') || '').replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 12);
      // Remove the challenge from the address bar so it isn't re-shared by accident.
      history.replaceState(null, '', location.pathname);
      if (!(score > 0) || score > level * 50000 || level > 1000 || !DIFF_LABEL[diff] || !name) return null;
      return { score, level, diff, name };
    } catch (e) { return null; }
  })();

  // ---------- Building a share ----------
  function linkFor(r) {
    const q = new URLSearchParams({ c: r.score, d: r.diff, n: r.name, l: r.level });
    return `${SITE}?${q}`;
  }

  function messageFor(r) {
    const lvl = r.level > 10 ? `level ${r.level} of endless mode` : `level ${r.level}`;
    if (r.beat) return `I just beat ${r.beat}'s score in Brick Smasher! ${r.score.toLocaleString()} points, ${lvl} on ${DIFF_LABEL[r.diff]}. 🧱💥 Your turn:`;
    return `I scored ${r.score.toLocaleString()} in Brick Smasher, reaching ${lvl} on ${DIFF_LABEL[r.diff]}. 🧱💥 Can you beat me?`;
  }

  // Square score card (1080x1080) that reads well in feeds, chats and stories.
  async function makeCard(r) {
    try { await document.fonts.load('700 100px Orbitron'); } catch (e) {}
    const S = 1080;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const x = c.getContext('2d');
    const font = (size, w = 700) => `${w} ${size}px Orbitron, "Segoe UI", Arial, sans-serif`;
    const glow = (t, px, py, size, color, blur) => {
      x.font = font(size); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = color; x.shadowBlur = blur; x.fillStyle = color; x.fillText(t, px, py); x.shadowBlur = 0;
    };
    const plain = (t, px, py, size, color, w = 700) => {
      x.font = font(size, w); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.fillText(t, px, py);
    };

    const g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#070818'); g.addColorStop(1, '#1d0b38');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(140,90,255,0.10)'; x.lineWidth = 2;
    x.beginPath();
    for (let i = 0; i <= S; i += 60) { x.moveTo(i, 0); x.lineTo(i, S); x.moveTo(0, i); x.lineTo(S, i); }
    x.stroke();

    // Brick rows along the top
    const colors = ['#ff3df2', '#29f0ff', '#ffb319', '#29f0ff', '#ff3df2'];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 9; i++) {
        if ((row + i) % 4 === 3) continue;
        const bx = 60 + i * 108, by = 50 + row * 46, col = colors[(i + row) % colors.length];
        x.globalAlpha = 0.25; x.fillStyle = col; x.fillRect(bx, by, 96, 34);
        x.globalAlpha = 1; x.strokeStyle = col; x.lineWidth = 3; x.strokeRect(bx, by, 96, 34);
      }
    }

    glow('BRICK SMASHER', S / 2, 220, 64, '#ffffff', 26);
    plain(r.beat ? `I BEAT ${r.beat.toUpperCase()}!` : 'MY SCORE', S / 2, 330, 34, r.beat ? '#3dff8a' : 'rgba(230,230,255,0.75)');
    glow(r.score.toLocaleString(), S / 2, 470, r.score >= 1e6 ? 140 : 180, '#29f0ff', 40);
    const lvl = r.level > 10 ? `LEVEL ${r.level} · ENDLESS` : `LEVEL ${r.level}`;
    plain(lvl, S / 2, 610, 40, '#ffffff');
    glow(DIFF_LABEL[r.diff], S / 2, 672, 40, DIFF_COLOR[r.diff], 16);
    plain(r.name.toUpperCase(), S / 2, 750, 30, 'rgba(230,230,255,0.7)', 500);
    if (r.newBest) glow('NEW PERSONAL BEST', S / 2, 808, 30, '#ffe066', 14);

    // Paddle + ball
    x.shadowColor = '#29f0ff'; x.shadowBlur = 30; x.fillStyle = '#29f0ff';
    x.beginPath(); x.roundRect ? x.roundRect(S / 2 - 120, 880, 240, 22, 11) : x.rect(S / 2 - 120, 880, 240, 22); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(S / 2 + 40, 850, 14, 0, Math.PI * 2); x.fill(); x.shadowBlur = 0;

    glow('CAN YOU BEAT ME?', S / 2, 968, 44, '#ffe066', 18);
    plain(SITE.replace(/^https:\/\//, '').replace(/\/$/, ''), S / 2, 1030, 26, 'rgba(230,230,255,0.6)', 500);

    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    return { blob, url: URL.createObjectURL(blob) };
  }

  // ---------- Panel ----------
  const panel = document.getElementById('share-panel');
  const preview = document.getElementById('share-preview');
  const nativeBtn = document.getElementById('share-native');
  const status = document.getElementById('share-status');
  let current = null; // { r, text, link, card }

  async function open(r) {
    panel.hidden = false;
    status.textContent = '';
    preview.removeAttribute('src');
    const text = messageFor(r);
    const link = linkFor(r);
    current = { r, text, link, card: null };
    nativeBtn.hidden = !navigator.share;
    const card = await makeCard(r);
    if (current && current.r === r) { current.card = card; preview.src = card.url; }
  }

  function close() { panel.hidden = true; }

  // A real link click is more reliable than window.open in in-app browsers.
  function popup(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.append(a); a.click(); a.remove();
  }

  async function copy(textToCopy) {
    try { await navigator.clipboard.writeText(textToCopy); return true; } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = textToCopy; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok;
  }

  const actions = {
    async native() {
      const { text, link, card } = current;
      let file = null;
      try { file = card && new File([card.blob], 'brick-smasher-score.png', { type: 'image/png' }); } catch (e) {}
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: `${text} ${link}`, title: 'Brick Smasher' });
        } else {
          await navigator.share({ text, url: link, title: 'Brick Smasher' });
        }
      } catch (e) { /* cancelled */ }
    },
    x() { popup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(current.text)}&url=${encodeURIComponent(current.link)}`); },
    facebook() { popup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(current.link)}`); },
    whatsapp() { popup(`https://wa.me/?text=${encodeURIComponent(`${current.text} ${current.link}`)}`); },
    telegram() { popup(`https://t.me/share/url?url=${encodeURIComponent(current.link)}&text=${encodeURIComponent(current.text)}`); },
    reddit() { popup(`https://www.reddit.com/submit?url=${encodeURIComponent(current.link)}&title=${encodeURIComponent(current.text)}`); },
    async copy() {
      status.textContent = (await copy(`${current.text} ${current.link}`)) ? 'Copied! Paste it anywhere.' : 'Could not copy. Long-press the image to save it instead.';
    },
    save() {
      if (!current.card) return;
      const a = document.createElement('a');
      a.href = current.card.url; a.download = 'brick-smasher-score.png';
      document.body.append(a); a.click(); a.remove();
      status.textContent = 'Image saved. Post it to Instagram, TikTok or your story!';
    },
  };

  panel.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => { if (current) actions[btn.dataset.share](); });
  });
  panel.querySelector('.lb-close').addEventListener('click', close);
  let downOnBackdrop = false;
  panel.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === panel; });
  panel.addEventListener('click', (e) => { if (e.target === panel && downOnBackdrop) close(); });

  return { challenge, open, close, isOpen: () => !panel.hidden, linkFor, messageFor };
})();
