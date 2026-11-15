// Settings panel (music / sound / vibration) and the Missions panel
// (level, XP, missions, daily streak, badges).
const Panels = (() => {
  function wire(panel) {
    panel.querySelector('.lb-close').addEventListener('click', () => { panel.hidden = true; });
    let down = false;
    panel.addEventListener('pointerdown', (e) => { down = e.target === panel; });
    panel.addEventListener('click', (e) => { if (e.target === panel && down) panel.hidden = true; });
  }

  // ---------- Settings ----------
  const sp = document.getElementById('settings-panel');
  function renderSettings() {
    sp.querySelectorAll('[data-setting]').forEach((b) => {
      const on = Settings.get(b.dataset.setting);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('b').textContent = on ? 'ON' : 'OFF';
    });
    const vib = sp.querySelector('[data-setting="vibrate"]');
    vib.disabled = !Haptics.supported;
    document.getElementById('vibrate-note').textContent = Haptics.supported ? ''
      : "Vibration isn't available in this browser (iPhones don't allow it for web games).";
  }
  sp.querySelectorAll('[data-setting]').forEach((b) => b.addEventListener('click', () => {
    Sound.unlock();
    const on = Settings.toggle(b.dataset.setting);
    if (b.dataset.setting === 'vibrate' && on) Haptics.good();
    if (b.dataset.setting === 'sfx' && on) Sound.good();
    renderSettings();
  }));
  wire(sp);

  // ---------- Missions / progress ----------
  const pp = document.getElementById('progress-panel');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const BADGE_NAMES = { streak3: '3-DAY STREAK', streak7: '7-DAY STREAK', streak14: '14-DAY STREAK', streak30: '30-DAY STREAK', streak50: '50-DAY STREAK', streak100: '100-DAY STREAK' };

  function renderProgress() {
    const lv = Progress.levelInfo();
    const lvBox = document.getElementById('pp-level');
    lvBox.replaceChildren(
      el('div', 'pp-title', `LEVEL ${lv.level} · ${lv.title}`),
      (() => { const bar = el('div', 'xpbar'); const fill = el('span'); fill.style.width = `${(100 * lv.into / lv.need).toFixed(1)}%`; bar.append(fill); return bar; })(),
      el('div', 'pp-sub', `${lv.into} / ${lv.need} XP to level ${lv.level + 1}`),
    );
    const list = document.getElementById('pp-missions');
    list.replaceChildren();
    for (const m of Progress.missions()) {
      const li = el('li');
      li.append(el('div', 'm-text', m.text), el('div', 'm-xp', `+${m.xp} XP`));
      const bar = el('div', 'mbar'); const fill = el('span'); fill.style.width = `${(100 * m.progress / m.n).toFixed(1)}%`; bar.append(fill);
      li.append(bar, el('div', 'm-count', `${Math.min(m.progress, m.n)} / ${m.n}`));
      list.append(li);
    }
    const d = Progress.daily();
    document.getElementById('pp-streak').replaceChildren(
      el('div', 'streak-big', `🔥 ${d.streak}-DAY STREAK`),
      el('div', 'pp-sub', d.done ? 'Daily challenge done today ✓' : `Today's daily challenge: ${d.mod.name} (${d.attemptsLeft} of ${d.attempts} attempts left)`),
      el('div', 'pp-sub', `Best streak: ${d.bestStreak} days · Missions completed: ${Progress.missionsDone()}`),
    );
    const badges = Progress.badges();
    const bBox = document.getElementById('pp-badges');
    bBox.replaceChildren(el('div', 'pp-label', 'BADGES'));
    const row = el('div', 'badge-row');
    [3, 7, 14, 30, 50, 100].forEach((n) => {
      const has = badges.includes(`streak${n}`);
      row.append(el('span', 'badge' + (has ? ' got' : ''), has ? `🏅 ${n}` : `🔒 ${n}`));
    });
    bBox.append(row, el('div', 'pp-sub', 'Earn badges by keeping your daily streak going.'));
    document.getElementById('pp-note').textContent = Account.state.kind === 'account'
      ? 'Your level, missions, streak and badges are saved to your account.'
      : 'Guest progress lasts 12 hours. Sign up to keep your level, streak and badges forever.';
  }
  wire(pp);

  return {
    openSettings: () => { renderSettings(); sp.hidden = false; },
    openProgress: () => { renderProgress(); pp.hidden = false; },
  };
})();
