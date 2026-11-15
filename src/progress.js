// Player progress that never runs out: XP and levels (no cap) with titles,
// rotating missions, the daily challenge with streaks and badges, and 24-hour
// premium skin trials. Guests keep progress on this device for their 12 hours;
// accounts save it to the server.
const Progress = (() => {
  const GUEST_KEY = 'bs-guest-progress';
  const DAILY_ATTEMPTS = 3;
  const TRIAL_MS = 24 * 60 * 60 * 1000;
  const TITLES = [[1, 'ROOKIE'], [3, 'BRICK BREAKER'], [6, 'SMASHER'], [10, 'WRECKER'], [15, 'DEMOLISHER'],
    [20, 'NEON KNIGHT'], [30, 'NEON LEGEND'], [40, 'BRICK MASTER'], [50, 'BRICK GOD']];
  const STREAK_BADGES = [3, 7, 14, 30, 50, 100];
  const MODS = [
    { id: 'speed', name: 'SPEED DEMON', desc: 'The ball is extra fast' },
    { id: 'surge', name: 'POWER SURGE', desc: 'Twice the power-ups' },
    { id: 'tiny', name: 'TINY PADDLE', desc: 'Your paddle is smaller' },
    { id: 'mystery', name: 'MYSTERY BOX', desc: 'Every capsule is a mystery' },
    { id: 'bombs', name: 'CHAIN REACTION', desc: 'Explosive bricks everywhere' },
  ];

  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const step = (a, b, s) => a + s * randInt(0, Math.floor((b - a) / s));
  // kind: which game event moves it; add = count up, max = best value; run = resets each run
  const TEMPLATES = {
    bricks_run:   { kind: 'brick', add: true, run: true, roll: () => step(40, 160, 10), xp: (n) => Math.round(n * 1.5), text: (n) => `Break ${n} bricks in one run` },
    reach_level:  { kind: 'level', roll: () => randInt(3, 14), xp: (n) => n * 25, text: (n) => `Reach level ${n}` },
    combo:        { kind: 'combo', roll: () => randInt(8, 22), xp: (n) => n * 12, text: (n) => `Hit a ${n}-brick combo` },
    powerups_run: { kind: 'powerup', add: true, run: true, roll: () => randInt(3, 10), xp: (n) => n * 25, text: (n) => `Catch ${n} power-ups in one run` },
    laser_bricks: { kind: 'laser_brick', add: true, roll: () => step(10, 40, 5), xp: (n) => n * 6, text: (n) => `Destroy ${n} bricks with lasers` },
    fire_bricks:  { kind: 'fire_brick', add: true, roll: () => step(10, 40, 5), xp: (n) => n * 6, text: (n) => `Smash ${n} bricks with Fireball` },
    bombs:        { kind: 'bomb', add: true, roll: () => randInt(3, 12), xp: (n) => n * 20, text: (n) => `Set off ${n} explosive bricks` },
    perfect:      { kind: 'perfect', add: true, roll: () => randInt(1, 3), xp: (n) => n * 90, text: (n) => n === 1 ? 'Clear a level without losing a try' : `Clear ${n} levels without losing a try` },
    score_run:    { kind: 'score', roll: () => step(3000, 30000, 1000), xp: (n) => Math.round(n / 60), text: (n) => `Score ${n.toLocaleString()} in one run` },
    mystery:      { kind: 'mystery', add: true, roll: () => randInt(2, 5), xp: (n) => n * 40, text: (n) => `Catch ${n} mystery capsules` },
    berserk_fast: { kind: 'berserk_left', roll: () => step(30, 80, 10), xp: (n) => n * 4, text: (n) => `Clear a Berserk level with ${n}+ seconds left` },
  };

  let p = blank();
  let rewardHandler = () => {};
  let saveTimer = null;

  function blank() {
    return { v: 1, xp: 0, missions: [], missionsDone: 0, streak: 0, bestStreak: 0, lastDaily: null,
      dailyDay: null, dailyAttempts: 0, dailyDone: false, badges: [], trials: {} };
  }

  // ---------- Saving / loading ----------
  let dirty = false;
  function saveNow() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    dirty = false;
    if (Account.state.kind === 'account') {
      Account.client.rpc('save_progress', { p_progress: p }).then(() => {}, () => { dirty = true; });
    } else if (Account.state.kind === 'guest') {
      try { localStorage.setItem(GUEST_KEY, JSON.stringify(p)); } catch (e) {}
    }
  }
  function persist() {
    dirty = true;
    // Guests save instantly on this device; accounts batch server saves briefly.
    if (Account.state.kind === 'guest') { saveNow(); return; }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 600);
  }
  // Never lose progress when the game is closed or put in the background.
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  function readGuest() {
    try { return JSON.parse(localStorage.getItem(GUEST_KEY) || 'null'); } catch (e) { return null; }
  }

  Account.onChange((st) => {
    let loaded = null;
    if (st.kind === 'account' && st.profile) {
      loaded = st.profile.progress && st.profile.progress.v ? st.profile.progress : null;
      const guest = readGuest();
      // A guest who just signed up keeps what they earned (if it's more).
      if (guest && guest.v && (!loaded || (guest.xp || 0) > (loaded.xp || 0))) {
        loaded = guest;
        setTimeout(persist, 0);
      }
      try { localStorage.removeItem(GUEST_KEY); } catch (e) {}
    } else if (st.kind === 'guest') {
      loaded = readGuest();
    }
    p = Object.assign(blank(), loaded || {});
    fillMissions();
  });

  // ---------- XP and levels ----------
  // XP to go from lvl to lvl + 1. Level 10 takes about 4,600 XP: a few days of regular play.
  const need = (lvl) => 150 + (lvl - 1) * 90;
  function levelInfo(xp = p.xp) {
    let lvl = 1, rest = xp;
    while (rest >= need(lvl)) { rest -= need(lvl); lvl++; }
    return { level: lvl, into: rest, need: need(lvl), title: titleFor(lvl) };
  }
  function titleFor(lvl) {
    let t = TITLES[0][1];
    for (const [l, name] of TITLES) if (lvl >= l) t = name;
    return t;
  }
  function addXp(n) {
    const before = levelInfo().level;
    p.xp += Math.max(0, Math.round(n));
    persist();
    const after = levelInfo().level;
    if (after > before) rewardHandler({ kind: 'levelup', level: after, title: titleFor(after) });
    return after > before;
  }

  // ---------- Missions ----------
  function newMission(exclude) {
    const types = Object.keys(TEMPLATES).filter((t) => !exclude.includes(t));
    const type = types[Math.floor(Math.random() * types.length)];
    const n = TEMPLATES[type].roll();
    return { type, n, progress: 0, xp: TEMPLATES[type].xp(n) };
  }
  function fillMissions() {
    p.missions = (p.missions || []).filter((m) => TEMPLATES[m.type]);
    while (p.missions.length < 3) p.missions.push(newMission(p.missions.map((m) => m.type)));
  }
  function missionText(m) { return TEMPLATES[m.type].text(m.n); }

  // Game events: brick, laser_brick, fire_brick, bomb, powerup, mystery,
  // perfect (+1 each) and level, combo, score, berserk_left (best value).
  function track(kind, value = 1) {
    let changed = false;
    p.missions.forEach((m, i) => {
      const t = TEMPLATES[m.type];
      if (t.kind !== kind) return;
      const next = t.add ? m.progress + value : Math.max(m.progress, value);
      if (next === m.progress) return;
      m.progress = Math.min(next, m.n);
      changed = true;
      if (m.progress >= m.n) {
        p.missionsDone++;
        rewardHandler({ kind: 'mission', text: missionText(m), xp: m.xp });
        addXp(m.xp);
        p.missions[i] = newMission(p.missions.map((x) => x.type));
      }
    });
    if (changed) persist();
  }

  function runStart() {
    p.missions.forEach((m) => { if (TEMPLATES[m.type].run) m.progress = 0; });
  }

  // XP for the run itself: points and how far you got.
  function runEnd(score, levelReached) {
    const before = levelInfo();
    const gained = Math.floor(score / 25) + (levelReached - 1) * 20;
    addXp(gained);
    persist();
    return { gained, before, after: levelInfo() };
  }

  // ---------- Daily challenge ----------
  const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // UTC day
  function yesterdayKey() { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); return dayKey(d); }
  function rollDay() {
    const today = dayKey();
    if (p.dailyDay !== today) { p.dailyDay = today; p.dailyAttempts = 0; p.dailyDone = false; }
    if (p.lastDaily !== today && p.lastDaily !== yesterdayKey()) p.streak = 0; // a day was missed
  }
  function daily() {
    rollDay();
    const key = dayKey();
    const seed = Number(key.replace(/-/g, ''));
    const mod = MODS[seed % MODS.length];
    const now = new Date();
    const msLeft = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime();
    return { key, seed, mod, done: p.dailyDone, attemptsLeft: Math.max(0, DAILY_ATTEMPTS - p.dailyAttempts),
      attempts: DAILY_ATTEMPTS, streak: p.streak, bestStreak: p.bestStreak, msLeft };
  }
  function startDailyAttempt() {
    rollDay();
    if (p.dailyDone || p.dailyAttempts >= DAILY_ATTEMPTS) return false;
    p.dailyAttempts++;
    persist();
    return true;
  }
  function completeDaily() {
    rollDay();
    if (p.dailyDone) return null;
    p.dailyDone = true;
    p.streak = p.lastDaily === yesterdayKey() ? p.streak + 1 : 1;
    p.lastDaily = dayKey();
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    let badge = null;
    if (STREAK_BADGES.includes(p.streak) && !p.badges.includes(`streak${p.streak}`)) {
      p.badges.push(`streak${p.streak}`);
      badge = `${p.streak}-DAY STREAK`;
    }
    // Reward: from player level 10, a premium skin to try for 24 hours (one you're
    // not already trying). Before level 10 there are no skins at all, so bonus XP instead.
    let skin = null, noTrialBonus = 0;
    if (levelInfo().level >= 10) {
      const premium = Skins.list.filter((s) => s.premium).map((s) => s.id);
      const fresh = premium.filter((id) => !(trialLeft(id) > 0));
      const pool = fresh.length ? fresh : premium;
      skin = pool[Math.floor(Math.random() * pool.length)];
      p.trials[skin] = Date.now() + TRIAL_MS;
    } else {
      noTrialBonus = 150;
    }
    const xp = 300 + 50 * Math.min(p.streak, 10) + noTrialBonus;
    addXp(xp);
    persist();
    return { streak: p.streak, xp, skin, badge, noTrialBonus };
  }

  // ---------- Skin trials ----------
  function trialLeft(id) {
    const exp = p.trials && p.trials[id];
    return exp ? Math.max(0, exp - Date.now()) : 0;
  }

  return {
    levelInfo, track, runStart, runEnd, addXp,
    missions: () => p.missions.map((m) => ({ ...m, text: missionText(m) })),
    daily, startDailyAttempt, completeDaily, trialLeft,
    streak: () => { rollDay(); return p.streak; },
    bestStreak: () => p.bestStreak,
    badges: () => p.badges.slice(),
    missionsDone: () => p.missionsDone,
    onReward: (fn) => { rewardHandler = fn; },
    GUEST_KEY,
  };
})();
