// Brick Smasher — main game.
(() => {
  'use strict';

  // ---------- Constants ----------
  const W = 600;
  let H = 800; // grows on tall (phone) screens
  const LAYOUT_H = 800; // menus are laid out in this height and centred
  const HUD_H = 60;
  const COLS = 10, GAP = 4, SIDE = 20;
  const BRICK_W = (W - SIDE * 2 - GAP * (COLS - 1)) / COLS;
  const BRICK_H = 22;
  const BRICK_TOP = 100;
  let PADDLE_Y = H - 80;
  const PADDLE_H = 14;
  const BALL_R = 7;
  const BASE_SPEED = 380;
  const MAX_BALLS = 12;
  const MAX_LIVES = 2; // two tries per run, on every difficulty

  const DIFFS = {
    easy:   { label: 'EASY',   speed: 0.85, bad: 0.2,  drop: 0.22, color: '#3dff8a', blurb: 'SLOWER BALL · FEWER TRAPS' },
    normal: { label: 'NORMAL', speed: 1.0,  bad: 0.33, drop: 0.18, color: '#29f0ff', blurb: 'THE CLASSIC CHALLENGE' },
    hard:   { label: 'HARD',   speed: 1.2,  bad: 0.45, drop: 0.15, color: '#ff3d6e', blurb: 'FAST BALL · MORE TRAPS' },
    // Berserk: fast ball and a countdown on every level.
    berserk: { label: 'BERSERK', speed: 1.15, bad: 0.35, drop: 0.2, color: '#ff8a3d', blurb: '2:00 PER LEVEL', timed: true },
  };
  const DIFF_KEYS = ['easy', 'normal', 'hard', 'berserk'];
  const LEVEL_TIME = 120; // seconds per level in Berserk
  // Desktop-style device (mouse + keyboard): show keyboard hints only there.
  const HAS_KEYBOARD = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const POWER = {
    wide:    { label: 'W', name: 'WIDE PADDLE', good: true,  dur: 15 },
    mega:    { label: 'XL', name: 'MEGA PADDLE', good: true, dur: 10 }, // rare
    laser:   { label: 'L', name: 'LASER',       good: true,  dur: 10 },
    magnet:  { label: 'M', name: 'MAGNET',      good: true,  dur: 15 },
    multi:   { label: '3', name: 'MULTI-BALL',  good: true },
    slow:    { label: 'S', name: 'SLOW-MO',     good: true,  dur: 10 },
    fire:    { label: 'F', name: 'FIREBALL',    good: true,  dur: 8 },
    life:    { label: '+', name: 'EXTRA TRY',   good: true },
    shrink:  { label: '-', name: 'SHRINK',      good: false, dur: 12 },
    speed:   { label: '>', name: 'SPEED UP',    good: false, dur: 10 },
    reverse: { label: 'R', name: 'REVERSE',     good: false, dur: 6 },
    fog:     { label: '?', name: 'FOG',         good: false, dur: 8 },
  };
  const GOOD = ['wide', 'laser', 'magnet', 'multi', 'slow', 'fire'];
  const BAD = ['shrink', 'speed', 'reverse', 'fog'];
  const OPPOSITE = { wide: 'shrink', shrink: 'wide', slow: 'speed', speed: 'slow' };

  const BRICK_COLORS = { 1: '#29f0ff', 2: '#ff3df2', 3: '#ffb319', metal: '#9aa3b5', bomb: '#ff4141' };

  const font = (size, weight = 700) => `${weight} ${size}px Orbitron, "Segoe UI", Arial, sans-serif`;

  // ---------- Storage (best effort) ----------
  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  const highScores = Object.assign({ easy: 0, normal: 0, hard: 0, berserk: 0 }, load('bs-high', {}));

  // ---------- Canvas ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  // Glow (shadowBlur) is the most expensive effect on older phones; in low-effects
  // mode every glow is quietly skipped.
  (() => {
    const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur');
    if (!d || !d.set) return;
    Object.defineProperty(ctx, 'shadowBlur', {
      get() { return d.get.call(this); },
      set(v) { d.set.call(this, lowFx ? 0 : v); },
    });
  })();
  // The playing field is always W wide (fair for everyone); its height grows on
  // tall screens. The canvas covers the whole screen: on wide screens (landscape
  // tablets, desktops) the background fills the space beside the field.
  let lowFx = false;   // set when the device is too slow for full effects
  let VW = W, VH = H; // whole screen in game units
  let OX = 0, OY = 0; // where the field starts on screen, in game units
  let onFieldResize = null; // set once game state exists
  function resize() {
    const oldH = H;
    const iw = Math.max(1, window.innerWidth), ih = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, lowFx ? 1.25 : 2);
    H = Math.round(Math.max(800, Math.min(1400, W * (ih / iw))));
    PADDLE_Y = H - 80;
    const scale = Math.min(iw / W, ih / H);
    VW = iw / scale; VH = ih / scale;
    OX = (VW - W) / 2; OY = (VH - H) / 2;
    canvas.style.width = `${iw}px`;
    canvas.style.height = `${ih}px`;
    canvas.width = Math.round(iw * dpr);
    canvas.height = Math.round(ih * dpr);
    if (onFieldResize && oldH !== H) onFieldResize(oldH, H);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  // ---------- State ----------
  const S = {
    mode: 'menu',          // menu | play | paused | clear | over | win
    menuSel: Share.challenge ? ['easy', 'normal', 'hard', 'berserk'].indexOf(Share.challenge.diff) : 1,
    timeLeft: 0,
    clockRunning: false,
    lastTick: 0,
    timeBonus: 0,
    beatChallenge: false,
    diff: 'normal',
    level: 0,
    score: 0,
    lives: 3,
    combo: 0,
    clearBonus: 0,
    paddle: { x: W / 2, w: 100, target: W / 2 },
    balls: [], bricks: [], capsules: [], lasers: [], particles: [], floaters: [],
    effects: {},
    laserCd: 0,
    shake: 0,
    banner: null,
    time: 0,
    modeTime: 0,
    newHigh: false,
    buttons: [],
    hoverAction: null,
    btnOffset: 0,
    clearTimer: 0,
    slowmo: 0,
    perfect: false,
    lostThisLevel: false,
    lastLeftCall: 0,
    passedBest: false,
    prevBest: 0,
    runId: 0,
    rank: null,          // { today_rank, alltime_rank, guest }
    rankState: 'none', // none | sending | done | error
    rankError: '',
    toast: null,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- Levels (handmade, then endless) ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ENDLESS_NAMES = ['Overdrive', 'Neon Rain', 'Static', 'Pulse', 'Voltage', 'Afterglow', 'Meltdown', 'Hyperdrive', 'Blackout', 'Shockwave', 'Supernova', 'Glitch'];

  // Deterministic: everyone gets the same level N, which keeps the leaderboard fair.
  function generateLevel(i) {
    const r = mulberry32(i * 7919 + 13);
    const depth = i - LEVELS.length;
    const rows = Math.min(12, 6 + Math.floor(depth / 3));
    const pHard = Math.min(0.6, 0.15 + depth * 0.02);
    const pMid = Math.min(0.5, 0.3 + depth * 0.01);
    const pMetal = Math.min(0.14, 0.03 + depth * 0.005);
    const pBomb = 0.06;
    const pEmpty = 0.1 + r() * 0.2;
    const out = [];
    for (let row = 0; row < rows; row++) {
      let half = '';
      for (let c = 0; c < 5; c++) {
        const x = r();
        if (x < pEmpty) half += '.';
        else if (x < pEmpty + pMetal) half += 'M';
        else if (x < pEmpty + pMetal + pBomb) half += 'X';
        else { const y = r(); half += y < pHard ? '3' : y < pHard + pMid ? '2' : '1'; }
      }
      if (!/[123X]/.test(half)) half = half.slice(0, 4) + '2';
      if (/^M+$/.test(half.replace(/\./g, '')) && !half.includes('.')) half = half.slice(0, 2) + '.' + half.slice(3);
      out.push(half + [...half].reverse().join(''));
    }
    return { name: ENDLESS_NAMES[Math.floor(r() * ENDLESS_NAMES.length)], rows: openEnclosures(out) };
  }

  // Metal can't be broken, and the ball can't squeeze between bricks. Any
  // breakable brick walled in by metal would make the level impossible, so turn
  // the enclosing metal into normal bricks until every brick can be reached.
  function openEnclosures(rows) {
    const g = rows.map((r) => [...r]);
    const R = g.length, C = 10;
    for (;;) {
      const seen = g.map((r) => r.map(() => false));
      const stack = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if ((r === 0 || r === R - 1 || c === 0 || c === C - 1) && g[r][c] !== 'M') { seen[r][c] = true; stack.push([r, c]); }
      }
      while (stack.length) {
        const [r, c] = stack.pop();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= R || nc < 0 || nc >= C || seen[nr][nc] || g[nr][nc] === 'M') continue;
          seen[nr][nc] = true;
          stack.push([nr, nc]);
        }
      }
      const fix = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        if (g[r][c] === 'M' || seen[r][c] || g[r][c] === '.') continue;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < R && nc >= 0 && nc < C && g[nr][nc] === 'M') fix.push([nr, nc]);
        }
      }
      if (!fix.length) return g.map((r) => r.join(''));
      for (const [r, c] of fix) g[r][c] = '2';
    }
  }
  function getLevel(i) { return i < LEVELS.length ? LEVELS[i] : generateLevel(i); }
  const isEndless = (i) => i >= LEVELS.length;
  function levelSpeed(i) { return Math.min(1.9, 1 + 0.05 * Math.min(i, 10) + 0.015 * Math.max(0, i - 10)); }

  function setMode(m) { S.mode = m; S.modeTime = 0; S.hoverAction = null; }

  // ---------- Game flow ----------
  function startGame(diff) {
    S.diff = diff;
    S.menuSel = DIFF_KEYS.indexOf(diff);
    S.score = 0;
    S.lives = MAX_LIVES;
    S.newHigh = false;
    S.passedBest = false;
    S.prevBest = highScores[diff];
    S.runId++;
    S.beatChallenge = false;
    if (Account.expiringSoon() && !S.warnedExpiry) {
      S.warnedExpiry = true;
      S.toast = { text: `GUEST EXPIRES IN ${guestTimeLeft(Account.state.expires)}`, sub: `SIGN UP FROM THE MENU TO KEEP YOUR ${Skins.unlockedCount() > 1 ? 'SKINS' : 'NAME'}`, t: 4, color: '#ffb319' };
    }
    S.rank = null;
    S.rankState = 'none';
    S.particles = [];
    loadLevel(0);
  }

  function loadLevel(i) {
    S.level = i;
    S.bricks = [];
    const lvl = getLevel(i);
    lvl.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        let type = 'normal', hp = Number(ch);
        if (ch === 'M') { type = 'metal'; hp = Infinity; }
        else if (ch === 'X') { type = 'bomb'; hp = 1; }
        S.bricks.push({
          x: SIDE + c * (BRICK_W + GAP), y: BRICK_TOP + r * (BRICK_H + GAP),
          w: BRICK_W, h: BRICK_H, type, hp, maxHp: hp, alive: true, flash: 0,
        });
      });
    });
    S.capsules = []; S.lasers = []; S.floaters = [];
    S.effects = {};
    S.combo = 0;
    S.clearTimer = 0;
    S.timeLeft = LEVEL_TIME;
    S.lostThisLevel = false;
    S.lastLeftCall = 0;
    S.paddle.x = S.paddle.target = W / 2;
    resetBall();
    checkLevelUnlocks(i + 1);
    S.banner = { text: `LEVEL ${i + 1}`, sub: (isEndless(i) ? 'ENDLESS · ' : '') + lvl.name.toUpperCase(), t: 2.2, max: 2.2 };
    setMode('play');
  }

  function resetBall() {
    S.clockRunning = false; // the clock waits until the ball is launched
    S.balls = [{ x: S.paddle.x, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: -1, stuck: true, offset: 0, boost: 1, trail: [] }];
  }

  function paddleWidth() {
    if (S.effects.mega) return 230;
    if (S.effects.wide) return 160;
    if (S.effects.shrink) return 64;
    return 100;
  }

  function ballSpeed(b) {
    let s = BASE_SPEED * DIFFS[S.diff].speed * levelSpeed(S.level) * b.boost;
    if (S.effects.slow) s *= 0.65;
    if (S.effects.speed) s *= 1.35;
    return s;
  }

  function launch() {
    let any = false;
    for (const b of S.balls) {
      if (!b.stuck) continue;
      const rel = clamp(b.offset / (S.paddle.w / 2), -1, 1);
      const a = rel * 0.9 + (rel === 0 ? rand(-0.25, 0.25) : 0);
      const sp = ballSpeed(b);
      b.vx = Math.sin(a) * sp;
      b.vy = -Math.cos(a) * sp;
      b.stuck = false;
      any = true;
    }
    if (any) S.clockRunning = true;
    if (any) Sound.launch();
  }

  function loseLife() {
    S.lives--;
    S.lostThisLevel = true;
    S.combo = 0;
    S.effects = {};
    S.capsules = [];
    S.lasers = [];
    S.shake = 12;
    Sound.lose();
    if (S.lives <= 0) {
      gameOver(false);
    } else {
      resetBall();
      S.banner = { text: 'BALL LOST', sub: S.lives === 1 ? 'LAST TRY!' : `${S.lives} TRIES LEFT`, t: 1.6, max: 1.6 };
    }
  }

  function recordHigh() {
    if (S.score > highScores[S.diff]) {
      highScores[S.diff] = S.score;
      save('bs-high', highScores);
      S.newHigh = true;
    }
  }

  function submitRun() {
    const run = S.runId;
    S.rankState = 'sending';
    S.postedName = Account.state.name;
    Leaderboard.submit(S.score, S.level + 1, S.diff)
      .then((res) => { if (S.runId === run) { S.rank = res; S.rankState = 'done'; } })
      .catch((e) => { if (S.runId === run) { S.rankState = 'error'; S.rankError = e.message || ''; } });
  }

  // ---------- Skins ----------
  function tryUnlock(id) {
    const skin = Skins.unlock(id);
    if (skin) {
      S.toast = { text: `SKIN UNLOCKED: ${skin.name.toUpperCase()}`, sub: 'EQUIP IT FROM THE MENU', t: 3.5, color: skin.paddle };
      Sound.good();
    }
  }
  function checkLevelUnlocks(levelNumber) {
    if (levelNumber >= 5) tryUnlock('inferno');
    if (levelNumber >= 11) tryUnlock('toxic');
    if (levelNumber >= 20) tryUnlock('galaxy');
  }

  function requireIdentity(fn) {
    if (Account.state.kind) { fn(); return; }
    // A guest name may still be on its way (first visit, or a guest just expired).
    Account.whenReady().then(() => {
      if (Account.state.kind) fn();
      else Account.open({ required: true, then: fn });
    });
  }

  // The field height changed mid-run (phone rotated, window resized): move
  // everything in play so nothing is lost, and pause so the player can settle.
  onFieldResize = (oldH, newH) => {
    if (S.mode === 'menu' || S.mode === 'over' || S.mode === 'win') return;
    const map = (y) => HUD_H + ((y - HUD_H) * (newH - HUD_H)) / (oldH - HUD_H);
    for (const b of S.balls) {
      if (b.stuck) b.y = PADDLE_Y - BALL_R - 1;
      else b.y = Math.min(map(b.y), PADDLE_Y - BALL_R - 1);
      b.trail.length = 0;
    }
    for (const c of S.capsules) c.y = map(c.y);
    for (const l of S.lasers) l.y = map(l.y);
    if (S.mode === 'play') setMode('paused');
  };

  function gameOver(won) {
    recordHigh();
    if (S.score > 0 && Account.state.kind) submitRun();
    if (won) { Sound.clear(); setMode('win'); }
    else { Sound.over(); setMode('over'); }
  }

  function levelClear() {
    S.perfect = !S.lostThisLevel;
    S.timeBonus = DIFFS[S.diff].timed ? Math.ceil(Math.max(0, S.timeLeft)) * 50 : 0;
    const bonus = 250 * (S.level + 1) + S.lives * 100 + (S.perfect ? 1000 : 0) + S.timeBonus;
    S.score += bonus;
    S.clearBonus = bonus;
    S.capsules = []; S.lasers = [];
    for (let i = 0; i < 80; i++) {
      S.particles.push({
        x: rand(0, W), y: rand(HUD_H, H / 2), vx: rand(-60, 60), vy: rand(-120, 40),
        life: rand(0.8, 1.6), max: 1.6, color: pick(['#29f0ff', '#ff3df2', '#ffb319', '#3dff8a']), size: rand(2, 4),
      });
    }
    Sound.clear();
    setMode('clear');
  }

  // ---------- Bricks ----------
  function addFloater(x, y, text, color = '#fff', size = 16) {
    S.floaters.push({ x, y, text, color, size, t: 1, max: 1 });
  }

  function burst(x, y, color, n = 14, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(speed * 0.3, speed);
      S.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, color, size: rand(1.5, 3.5) });
    }
  }

  function brickColor(br) {
    if (br.type === 'metal') return BRICK_COLORS.metal;
    if (br.type === 'bomb') return BRICK_COLORS.bomb;
    return BRICK_COLORS[Math.min(br.maxHp, 3)];
  }

  function hitBrick(br, force) {
    if (!br.alive) return;
    if (br.type === 'metal') {
      br.flash = 0.15;
      Sound.metal();
      burst(br.x + br.w / 2, br.y + br.h / 2, '#dfe6f5', 5, 120);
      return;
    }
    br.hp = force ? 0 : br.hp - 1;
    br.flash = 0.12;
    if (br.hp > 0) {
      Sound.hit();
      burst(br.x + br.w / 2, br.y + br.h / 2, brickColor(br), 5, 120);
      return;
    }
    destroyBrick(br);
  }

  function destroyBrick(br) {
    if (!br.alive || br.type === 'metal') return;
    br.alive = false;
    S.combo++;
    const mult = Math.min(8, 1 + Math.floor((S.combo - 1) / 3));
    const base = br.type === 'bomb' ? 25 : br.maxHp * 10;
    const pts = base * mult;
    S.score += pts;
    const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
    if (mult > 1) addFloater(cx, cy, `+${pts} x${mult}`, '#ffe066', 13);
    burst(cx, cy, brickColor(br));
    Sound.brick(S.combo);
    if (S.combo >= 15) tryUnlock('frost');
    if (S.combo % 10 === 0) {
      addFloater(W / 2, H * 0.45, `${S.combo} COMBO!`, '#ff3df2', 26);
      S.shake = Math.max(S.shake, 6);
    }
    maybeDrop(cx, cy);
    if (br.type === 'bomb') {
      S.shake = Math.max(S.shake, 10);
      Sound.explode();
      burst(cx, cy, '#ff8a3d', 30, 340);
      for (const o of S.bricks) {
        if (!o.alive || o === br) continue;
        if (Math.abs(o.x - br.x) <= BRICK_W + GAP + 1 && Math.abs(o.y - br.y) <= BRICK_H + GAP + 1) {
          destroyBrick(o);
        }
      }
    }
  }

  function maybeDrop(x, y) {
    const d = DIFFS[S.diff];
    if (Math.random() > d.drop) return;
    let type;
    if (Math.random() < d.bad) type = pick(BAD);
    else if (S.lives < MAX_LIVES && Math.random() < 0.07) type = 'life';
    else if (Math.random() < 0.06) type = 'mega'; // rare jackpot
    else type = pick(GOOD);
    S.capsules.push({ x, y, type, vy: 150, t: 0 });
  }

  // ---------- Power-ups ----------
  function applyPower(type) {
    const p = POWER[type];
    addFloater(S.paddle.x, PADDLE_Y - 24, p.name, p.good ? '#3dff8a' : '#ff3d6e', 16);
    if (p.good) Sound.good(); else Sound.bad();
    burst(S.paddle.x, PADDLE_Y, p.good ? '#3dff8a' : '#ff3d6e', 16, 180);
    if (p.good) S.score += 50;

    if (type === 'life') { S.lives = Math.min(MAX_LIVES, S.lives + 1); return; }
    if (type === 'multi') {
      launch();
      const extra = [];
      for (const b of S.balls) {
        for (const da of [-0.45, 0.45]) {
          if (S.balls.length + extra.length >= MAX_BALLS) break;
          const c = Math.cos(da), s = Math.sin(da);
          extra.push({ x: b.x, y: b.y, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c, stuck: false, offset: 0, boost: b.boost, trail: [] });
        }
      }
      for (const e of extra) keepAngleSane(e);
      S.balls.push(...extra);
      return;
    }
    S.effects[type] = p.dur;
    if (OPPOSITE[type]) delete S.effects[OPPOSITE[type]];
    if (type === 'mega') delete S.effects.shrink;
    if (type === 'shrink') delete S.effects.mega;
  }

  // ---------- Physics ----------
  function keepAngleSane(b) {
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const minVy = sp * 0.28;
    if (Math.abs(b.vy) < minVy) {
      b.vy = (b.vy < 0 ? -1 : 1) * minVy;
      b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(sp * sp - minVy * minVy);
    }
  }

  // Returns true when the ball bounced off something this sub-step.
  function stepBall(b) {
    // Walls
    if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); Sound.wall(); }
    else if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); Sound.wall(); }
    if (b.y < HUD_H + BALL_R) { b.y = HUD_H + BALL_R; b.vy = Math.abs(b.vy); Sound.wall(); }

    // Paddle
    const p = S.paddle;
    if (b.vy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
        Math.abs(b.x - p.x) <= p.w / 2 + BALL_R) {
      const rel = clamp((b.x - p.x) / (p.w / 2), -1, 1);
      const a = rel * 1.05;
      const sp = Math.hypot(b.vx, b.vy);
      b.vx = Math.sin(a) * sp;
      b.vy = -Math.cos(a) * sp;
      b.y = PADDLE_Y - BALL_R;
      b.boost = Math.min(1.25, b.boost + 0.01);
      S.combo = 0;
      if (S.effects.magnet) { b.stuck = true; b.offset = b.x - p.x; }
      Sound.paddle();
      return true;
    }

    // Fell out
    if (b.y - BALL_R > H) { b.dead = true; return true; }

    // Bricks
    for (const br of S.bricks) {
      if (!br.alive) continue;
      const nx = clamp(b.x, br.x, br.x + br.w);
      const ny = clamp(b.y, br.y, br.y + br.h);
      const dx0 = b.x - nx, dy0 = b.y - ny;
      if (dx0 * dx0 + dy0 * dy0 > BALL_R * BALL_R) continue;

      const pass = S.effects.fire && br.type !== 'metal';
      if (!pass) {
        const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
        const dx = b.x - cx, dy = b.y - cy;
        const px = br.w / 2 + BALL_R - Math.abs(dx);
        const py = br.h / 2 + BALL_R - Math.abs(dy);
        if (px < py) { const sx = dx >= 0 ? 1 : -1; b.vx = sx * Math.abs(b.vx); b.x += sx * px; }
        else { const sy = dy >= 0 ? 1 : -1; b.vy = sy * Math.abs(b.vy); b.y += sy * py; }
        keepAngleSane(b);
      }
      hitBrick(br, pass);
      return !pass;
    }
    return false;
  }

  // ---------- Update ----------
  const keys = { left: false, right: false };
  let pointerX = null, usePointer = false;

  function update(dt, realDt = dt) {
    S.time += dt;
    S.modeTime += dt;

    for (const pt of S.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 300 * dt; pt.life -= dt; }
    S.particles = S.particles.filter((pt) => pt.life > 0);
    for (const f of S.floaters) { f.y -= 40 * dt; f.t -= dt; }
    S.floaters = S.floaters.filter((f) => f.t > 0);
    S.shake = Math.max(0, S.shake - 40 * dt);
    if (S.toast) { S.toast.t -= realDt; if (S.toast.t <= 0) S.toast = null; }

    if (S.mode !== 'play') {
      // A guest's 12 hours can run out while the game is open; ask for a new name.
      if (Account.checkGuestExpiry()) {
        Account.whenReady().then(() => {
          S.toast = { text: 'GUEST TIME IS UP', sub: `YOU'RE NOW ${String(Account.state.name).toUpperCase()} · SIGN UP NEXT TIME TO KEEP YOUR SKINS`, t: 6, color: '#ffb319' };
        });
      }
      return;
    }

    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }

    // Brief slow-motion freeze after the last brick breaks.
    if (S.clearTimer > 0) {
      S.clearTimer -= realDt;
      if (S.clearTimer <= 0) levelClear();
      return;
    }

    // Berserk countdown
    if (DIFFS[S.diff].timed && S.clockRunning) {
      S.timeLeft -= realDt;
      const secs = Math.ceil(S.timeLeft);
      if (secs <= 10 && secs > 0 && secs !== S.lastTick) { S.lastTick = secs; Sound.tick(); }
      if (S.timeLeft <= 0) {
        S.timeLeft = LEVEL_TIME;
        loseLife();
        if (S.mode === 'play') S.banner = { text: "TIME'S UP!", sub: S.lives === 1 ? 'LAST TRY!' : `${S.lives} TRIES LEFT`, t: 1.8, max: 1.8 };
        return;
      }
    }

    if (S.score >= 50000) tryUnlock('gold');
    const ch = Share.challenge;
    if (ch && !S.beatChallenge && S.diff === ch.diff && S.score > ch.score) {
      S.beatChallenge = true;
      S.toast = { text: `YOU BEAT ${ch.name.toUpperCase()}!`, sub: 'SHARE IT WHEN THE RUN ENDS', t: 4, color: '#3dff8a' };
      Sound.good();
    }
    if (!S.passedBest && S.prevBest > 0 && S.score > S.prevBest) {
      S.passedBest = true;
      S.banner = { text: 'NEW BEST!', sub: 'KEEP GOING', t: 1.4, max: 1.4 };
      Sound.good();
    }

    for (const k of Object.keys(S.effects)) {
      S.effects[k] -= dt;
      if (S.effects[k] <= 0) {
        delete S.effects[k];
        if (k === 'magnet') launch();
      }
    }

    // Paddle
    const p = S.paddle;
    p.w += (paddleWidth() - p.w) * Math.min(1, dt * 12);
    const rev = S.effects.reverse ? -1 : 1;
    if (keys.left || keys.right) {
      usePointer = false;
      p.target += ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * rev * 720 * dt;
    } else if (usePointer && pointerX !== null) {
      p.target = rev === 1 ? pointerX : W - pointerX;
    }
    p.target = clamp(p.target, p.w / 2, W - p.w / 2);
    p.x += (p.target - p.x) * Math.min(1, dt * 30);

    // Lasers
    if (S.effects.laser) {
      S.laserCd -= dt;
      if (S.laserCd <= 0) {
        S.laserCd = 0.3;
        S.lasers.push({ x: p.x - p.w / 2 + 6, y: PADDLE_Y }, { x: p.x + p.w / 2 - 6, y: PADDLE_Y });
        Sound.laser();
      }
    }
    for (const l of S.lasers) {
      const prevY = l.y;
      l.y -= 820 * dt;
      if (l.y < HUD_H) { l.dead = true; continue; }
      // Check the whole distance travelled this frame, so lasers can't skip bricks.
      let hit = null;
      for (const br of S.bricks) {
        if (br.alive && l.x >= br.x && l.x <= br.x + br.w && l.y <= br.y + br.h && prevY >= br.y &&
            (!hit || br.y > hit.y)) hit = br;
      }
      if (hit) {
        hitBrick(hit, false);
        l.dead = true;
      }
    }
    S.lasers = S.lasers.filter((l) => !l.dead);

    // Balls
    for (const b of S.balls) {
      if (b.stuck) {
        b.offset = clamp(b.offset, -p.w / 2, p.w / 2);
        b.x = p.x + b.offset;
        b.y = PADDLE_Y - BALL_R - 1;
        b.trail.length = 0;
        continue;
      }
      const sp = ballSpeed(b);
      const m = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / m) * sp;
      b.vy = (b.vy / m) * sp;
      const steps = Math.max(1, Math.ceil((sp * dt) / (BALL_R * 0.7)));
      const sdt = dt / steps;
      for (let i = 0; i < steps; i++) {
        b.x += b.vx * sdt;
        b.y += b.vy * sdt;
        if (stepBall(b) && (b.dead || b.stuck)) break;
      }
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();
    }
    S.balls = S.balls.filter((b) => !b.dead);
    if (S.balls.length === 0) { loseLife(); return; }

    // Capsules
    for (const c of S.capsules) {
      c.y += c.vy * dt;
      c.t += dt;
      if (c.y + 9 >= PADDLE_Y && c.y - 9 <= PADDLE_Y + PADDLE_H && Math.abs(c.x - p.x) <= p.w / 2 + 18) {
        c.dead = true;
        applyPower(c.type);
      } else if (c.y > H + 20) c.dead = true;
    }
    S.capsules = S.capsules.filter((c) => !c.dead);

    for (const br of S.bricks) if (br.flash > 0) br.flash -= dt;

    const left = S.bricks.reduce((n, br) => n + (br.alive && br.type !== 'metal' ? 1 : 0), 0);
    if (left === 0) {
      S.clearTimer = 0.9;
      S.slowmo = 0.9;
      S.capsules = [];
    } else if (left <= 3 && left !== S.lastLeftCall) {
      S.lastLeftCall = left;
      addFloater(W / 2, H * 0.55, left === 1 ? 'LAST BRICK!' : `${left} BRICKS LEFT`, '#ffe066', 18);
    }
  }

  // ---------- Drawing helpers ----------
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function glowText(t, x, y, size, color, blur = 18, align = 'center') {
    ctx.font = font(size);
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
    ctx.shadowBlur = 0;
  }

  function text(t, x, y, size, color, align = 'center', weight = 700) {
    ctx.font = font(size, weight);
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  }

  function button(label, x, y, w, h, color, action, sub, selected) {
    const hover = selected || S.hoverAction === action;
    rr(x, y, w, h, 10);
    ctx.fillStyle = hover ? color + '33' : 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = hover ? 22 : 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(label, x + w / 2, y + h / 2 - (sub ? 8 : 0), w < 140 ? 12 : w < 200 ? 15 : 22, color);
    if (sub) text(sub, x + w / 2, y + h / 2 + 16, 11, 'rgba(230,230,255,0.6)', 'center', 500);
    S.buttons.push({ x, y: y + S.btnOffset, w, h, action });
  }

  // ---------- Draw ----------
  function drawBackground() {
    // Whole screen, in field coordinates (the area beside the field included).
    const x0 = -OX, y0 = -OY, x1 = W + OX, y1 = H + OY;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#070818');
    g.addColorStop(1, '#170a2e');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(140,90,255,0.08)';
    ctx.lineWidth = 1;
    const off = (S.time * 12) % 40;
    ctx.beginPath();
    for (let x = Math.floor(x0 / 40) * 40; x <= x1; x += 40) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = Math.floor(y0 / 40) * 40 - 40 + off; y <= y1; y += 40) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();

    if (OX > 4) {
      // Dim the side areas a little and draw glowing walls at the field edges.
      ctx.fillStyle = 'rgba(3,2,10,0.45)';
      ctx.fillRect(x0, y0, OX, y1 - y0);
      ctx.fillRect(W, y0, OX, y1 - y0);
      ctx.strokeStyle = 'rgba(41,240,255,0.55)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#29f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-1, y0); ctx.lineTo(-1, y1);
      ctx.moveTo(W + 1, y0); ctx.lineTo(W + 1, y1);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Phones held sideways get a small field: suggest turning upright.
      if (window.innerHeight < 500 && OX > 160) {
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(S.time * 3);
        for (const cx of [-OX / 2, W + OX / 2]) {
          text('↻', cx, H / 2 - 40, 64, '#29f0ff');
          text('ROTATE FOR A', cx, H / 2 + 30, 22, 'rgba(230,230,255,0.85)');
          text('BIGGER VIEW', cx, H / 2 + 60, 22, 'rgba(230,230,255,0.85)');
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawBricks() {
    for (const br of S.bricks) {
      if (!br.alive) continue;
      const color = brickColor(br);
      let alpha = 0.22;
      if (br.type === 'bomb') alpha = 0.25 + 0.2 * Math.sin(S.time * 6);
      rr(br.x, br.y, br.w, br.h, 4);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(br.x + 4, br.y + 3, br.w - 8, 2);

      if (br.type === 'metal') {
        ctx.fillStyle = '#dfe6f5';
        for (const [ox, oy] of [[5, 5], [br.w - 5, 5], [5, br.h - 5], [br.w - 5, br.h - 5]]) {
          ctx.beginPath(); ctx.arc(br.x + ox, br.y + oy, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      } else if (br.type === 'bomb') {
        ctx.fillStyle = '#ffd0d0';
        ctx.beginPath(); ctx.arc(br.x + br.w / 2, br.y + br.h / 2, 4, 0, Math.PI * 2); ctx.fill();
      } else if (br.hp < br.maxHp) {
        ctx.strokeStyle = 'rgba(10,8,30,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
        ctx.moveTo(cx - 10, br.y + 2); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - 8, br.y + br.h - 2);
        if (br.maxHp - br.hp >= 2) { ctx.moveTo(cx + 12, br.y + 2); ctx.lineTo(cx + 4, cy + 2); ctx.lineTo(cx + 14, br.y + br.h - 2); }
        ctx.stroke();
      }
      if (br.flash > 0) {
        rr(br.x, br.y, br.w, br.h, 4);
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, br.flash * 6)})`;
        ctx.fill();
      }
    }
  }

  function drawPaddle() {
    const p = S.paddle;
    let color = Skins.current().paddle;
    if (S.effects.magnet) color = '#3dff8a';
    if (S.effects.laser) color = '#ff5a5a';
    if (S.effects.reverse) color = '#ff3df2';
    const x = p.x - p.w / 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    rr(x, PADDLE_Y, p.w, PADDLE_H, 7);
    const g = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, color);
    g.addColorStop(1, '#14143a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (S.effects.laser) {
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(x + 3, PADDLE_Y - 6, 6, 8);
      ctx.fillRect(x + p.w - 9, PADDLE_Y - 6, 6, 8);
    }
  }

  function drawBalls() {
    const fire = !!S.effects.fire;
    const skin = Skins.current();
    const color = fire ? '#ff8a3d' : skin.ball;
    const trail = fire ? '#ff5a1f' : skin.trail;
    for (const b of S.balls) {
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        const k = i / b.trail.length;
        ctx.globalAlpha = k * (fire ? 0.5 : 0.25);
        ctx.fillStyle = trail;
        ctx.beginPath(); ctx.arc(t.x, t.y, BALL_R * (0.4 + k * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowColor = trail;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawCapsules() {
    for (const c of S.capsules) {
      const p = POWER[c.type];
      const color = (c.type === 'life' || c.type === 'mega') ? '#ffe066' : p.good ? '#3dff8a' : '#ff3d6e';
      const w = 38, h = 18;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.sin(c.t * 5) * 0.12);
      rr(-w / 2, -h / 2, w, h, 9);
      ctx.fillStyle = color + '40';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      text(p.label, 0, 1, 13, '#ffffff');
      ctx.restore();
    }
  }

  function drawLasers() {
    ctx.shadowColor = '#ff3d3d';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff8080';
    for (const l of S.lasers) ctx.fillRect(l.x - 1.5, l.y - 12, 3, 12);
    ctx.shadowBlur = 0;
  }

  function drawParticles() {
    ctx.globalCompositeOperation = 'lighter';
    for (const pt of S.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const f of S.floaters) {
      ctx.globalAlpha = Math.max(0, f.t / f.max);
      glowText(f.text, f.x, f.y, f.size, f.color, 10);
    }
    ctx.globalAlpha = 1;
  }

  function drawFog() {
    if (!S.effects.fog) return;
    const fade = Math.min(1, S.effects.fog);
    const g = ctx.createLinearGradient(0, HUD_H, 0, 470);
    g.addColorStop(0, `rgba(20,10,40,${0.97 * fade})`);
    g.addColorStop(0.8, `rgba(20,10,40,${0.9 * fade})`);
    g.addColorStop(1, 'rgba(20,10,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, HUD_H, W, 410);
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(5,5,20,0.85)';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.strokeStyle = 'rgba(41,240,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(W, HUD_H); ctx.stroke();

    text('SCORE', 20, 18, 10, 'rgba(230,230,255,0.55)', 'left', 500);
    glowText(String(S.score), 20, 40, 20, '#29f0ff', 8, 'left');
    text(isEndless(S.level) ? `ENDLESS · LEVEL ${S.level + 1}` : `LEVEL ${S.level + 1}/${LEVELS.length}`, W / 2, 18, 10, isEndless(S.level) ? '#ff3df2' : 'rgba(230,230,255,0.55)', 'center', 500);
    if (DIFFS[S.diff].timed) {
      const t = Math.max(0, Math.ceil(S.timeLeft));
      const urgent = t <= 10 && S.clockRunning;
      const clock = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      const col = urgent ? (Math.floor(S.time * 4) % 2 ? '#ff3d3d' : '#ffffff') : DIFFS.berserk.color;
      glowText(clock, W / 2, 40, 18, col, urgent ? 14 : 6);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, HUD_H - 3, W, 3);
      ctx.fillStyle = urgent ? '#ff3d3d' : DIFFS.berserk.color;
      ctx.fillRect(0, HUD_H - 3, W * Math.max(0, Math.min(1, S.timeLeft / LEVEL_TIME)), 3);
    } else {
      text(DIFFS[S.diff].label, W / 2, 40, 14, DIFFS[S.diff].color);
    }

    for (let i = 0; i < Math.min(S.lives, 9); i++) {
      const x = W - 70 - i * 18;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#29f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x, 30, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    const bx = W - 46, by = 14;
    rr(bx, by, 32, 32, 8);
    ctx.strokeStyle = 'rgba(230,230,255,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,230,255,0.85)';
    ctx.fillRect(bx + 10, by + 9, 4, 14);
    ctx.fillRect(bx + 18, by + 9, 4, 14);
    if (S.mode === 'play') S.buttons.push({ x: bx - 6, y: by - 6, w: 44, h: 44, action: 'pause' });

    if (S.prevBest > 0) {
      const beat = S.score > S.prevBest;
      text(beat ? 'NEW BEST!' : `BEST ${S.prevBest}`, 20, HUD_H + 16, 10, beat ? '#ffe066' : 'rgba(230,230,255,0.45)', 'left', 600);
    }
    const ch = Share.challenge;
    if (ch && S.diff === ch.diff) {
      text(S.beatChallenge ? `BEAT ${ch.name.toUpperCase()} ✓` : `BEAT ${ch.name.toUpperCase()}: ${ch.score}`,
        W - 20, HUD_H + 16, 10, S.beatChallenge ? '#3dff8a' : '#ff3df2', 'right', 600);
    }
    if (S.combo >= 4) glowText(`COMBO ${S.combo}`, W / 2, HUD_H + 18, 13, '#ffe066', 10);

    let x = 14;
    for (const k of Object.keys(S.effects)) {
      const p = POWER[k];
      const color = p.good ? '#3dff8a' : '#ff3d6e';
      const w = 96, y = H - 40;
      if (x + w > W) break;
      rr(x, y, w, 24, 6);
      ctx.fillStyle = 'rgba(10,10,30,0.8)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color + '55';
      ctx.fillRect(x + 2, y + 2, (w - 4) * clamp(S.effects[k] / p.dur, 0, 1), 20);
      text(p.name, x + w / 2, y + 12, 9, '#fff');
      x += w + 8;
    }
  }

  function drawToast() {
    if (!S.toast) return;
    const t = S.toast;
    ctx.globalAlpha = Math.min(1, t.t * 2);
    const y = HUD_H + 44;
    rr(W / 2 - 250, y - 22, 500, 48, 10);
    ctx.fillStyle = 'rgba(8,8,24,0.92)';
    ctx.fill();
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;
    text(t.text, W / 2, y - 4, 14, t.color);
    text(t.sub, W / 2, y + 14, 9, 'rgba(230,230,255,0.7)', 'center', 500);
    ctx.globalAlpha = 1;
  }

  function drawBanner() {
    if (S.banner) {
      const b = S.banner;
      ctx.globalAlpha = clamp(Math.min(b.t * 2, (b.max - b.t) * 4 + 0.2), 0, 1);
      glowText(b.text, W / 2, H * 0.58, 40, '#ffffff', 24);
      if (b.sub) glowText(b.sub, W / 2, H * 0.58 + 42, 16, '#ff3df2', 12);
      ctx.globalAlpha = 1;
    }
    if (S.balls.some((ball) => ball.stuck)) {
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(S.time * 5);
      text(HAS_KEYBOARD ? 'CLICK OR SPACE TO LAUNCH' : 'TAP TO LAUNCH', W / 2, H * 0.58 + 105, 12, 'rgba(230,230,255,0.9)', 'center', 500);
      ctx.globalAlpha = 1;
    }
  }

  function dim(a = 0.72) {
    ctx.fillStyle = `rgba(4,3,15,${a})`;
    ctx.fillRect(-OX - 10, -OY - H, VW + 20, VH + H * 2);
  }

  function drawSoundButton(y) {
    const label = Sound.isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
    const w = 150, x = W / 2 - w / 2;
    rr(x, y, w, 34, 8);
    ctx.strokeStyle = 'rgba(230,230,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(label, W / 2, y + 17, 12, 'rgba(230,230,255,0.8)', 'center', 500);
    S.buttons.push({ x, y: y + S.btnOffset, w, h: 34, action: 'mute' });
  }

  function guestTimeLeft(expires) {
    const mins = Math.max(0, Math.ceil((expires - Date.now()) / 60000));
    return mins >= 60 ? `${Math.ceil(mins / 60)}H` : `${mins}M`;
  }

  function drawMenu() {
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97) % (W - 60)) + 10;
      const y = ((S.time * (30 + (i % 5) * 12) + i * 140) % (H + 60)) - 40;
      const c = [BRICK_COLORS[1], BRICK_COLORS[2], BRICK_COLORS[3], BRICK_COLORS.bomb][i % 4];
      rr(x, y, BRICK_W, BRICK_H, 4);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = c; ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    dim(0.45);
    const pulse = 18 + 8 * Math.sin(S.time * 2.5);
    glowText('BRICK', W / 2, 118, 68, '#29f0ff', pulse);
    glowText('SMASHER', W / 2, 186, 52, '#ff3df2', pulse);

    // Who's playing (tap to sign up / manage account)
    const st = Account.state;
    const warn = Account.expiringSoon();
    const who = st.kind === 'account' ? st.name.toUpperCase()
      : warn ? `GUEST ENDS IN ${guestTimeLeft(st.expires)} · SIGN UP TO KEEP IT`
      : st.kind === 'guest' ? `${st.name.toUpperCase()} · GUEST` : '…';
    const pillColor = st.kind === 'account' ? '#3dff8a' : warn ? '#ffb319' : 'rgba(230,230,255,0.35)';
    ctx.font = font(11, 600);
    const whoW = Math.min(440, ctx.measureText(who).width + 48);
    rr(W / 2 - whoW / 2, 236, whoW, 32, 16);
    ctx.fillStyle = warn ? `rgba(255,179,25,${0.12 + 0.08 * Math.sin(S.time * 4)})`
      : S.hoverAction === 'account' ? 'rgba(61,255,138,0.15)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = pillColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(who, W / 2, 252, 11, st.kind === 'account' ? '#3dff8a' : warn ? '#ffb319' : 'rgba(230,230,255,0.85)', 'center', 600);
    S.buttons.push({ x: W / 2 - whoW / 2, y: 236 + S.btnOffset, w: whoW, h: 32, action: 'account' });

    const ch = Share.challenge;
    if (ch) {
      glowText(`${ch.name.toUpperCase()} SCORED ${ch.score.toLocaleString()} ON ${DIFFS[ch.diff].label}. BEAT IT!`, W / 2, 298, 12,
        DIFFS[ch.diff].color, 8 + 6 * Math.sin(S.time * 4));
    } else {
      text('2 TRIES. NO SAVES. HOW FAR CAN YOU GO?', W / 2, 298, 12, 'rgba(230,230,255,0.7)', 'center', 500);
    }

    DIFF_KEYS.forEach((k, i) => {
      const d = DIFFS[k];
      const best = highScores[k];
      const sub = best > 0 ? `BEST ${best}` : (d.timed ? d.blurb : null);
      button(d.label, W / 2 - 140, 322 + i * 72, 280, 60, d.color, `start:${k}`, sub, !S.hoverAction && S.menuSel === i);
    });

    button('LEADERBOARD', W / 2 - 140, 626, 136, 46, '#ffe066', 'board');
    button('SKINS', W / 2 + 4, 626, 136, 46, '#ff3df2', 'skins');
  }

  // Small speaker icon (tap to mute / unmute)
  function drawSpeaker(x, y) {
    const muted = Sound.isMuted();
    ctx.strokeStyle = 'rgba(230,230,255,0.75)';
    ctx.fillStyle = 'rgba(230,230,255,0.75)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 14); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x + 20, y + 7);
    ctx.lineTo(x + 20, y + 33); ctx.lineTo(x + 12, y + 26); ctx.lineTo(x + 6, y + 26);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    if (muted) {
      ctx.moveTo(x + 26, y + 14); ctx.lineTo(x + 36, y + 26);
      ctx.moveTo(x + 36, y + 14); ctx.lineTo(x + 26, y + 26);
    } else {
      ctx.arc(x + 20, y + 20, 8, -0.8, 0.8);
      ctx.moveTo(x + 20 + 14 * Math.cos(-0.8), y + 20 + 14 * Math.sin(-0.8));
      ctx.arc(x + 20, y + 20, 14, -0.8, 0.8);
    }
    ctx.stroke();
    S.buttons.push({ x: x - 6, y: y - 6 + S.btnOffset, w: 52, h: 52, action: 'mute' });
  }

  function drawPaused() {
    dim();
    glowText('PAUSED', W / 2, 260, 48, '#29f0ff', 22);
    button('RESUME', W / 2 - 120, 330, 240, 60, '#3dff8a', 'resume');
    button('MAIN MENU', W / 2 - 120, 410, 240, 60, '#ff3d6e', 'menu');
    drawSoundButton(500);
  }

  function drawClear() {
    dim(0.55);
    glowText('LEVEL CLEAR!', W / 2, 270, 44, '#3dff8a', 24);
    if (S.perfect) glowText('PERFECT! +1000', W / 2, 322, 20, '#ff3df2', 14 + 6 * Math.sin(S.time * 6));
    text(S.timeBonus ? `BONUS +${S.clearBonus}  (TIME +${S.timeBonus})` : `BONUS +${S.clearBonus}`, W / 2, 360, 18, '#ffe066');
    text(`SCORE ${S.score}`, W / 2, 395, 16, '#ffffff');
    const unlock = S.level + 1 === LEVELS.length;
    if (unlock) glowText('ENDLESS MODE UNLOCKED', W / 2, 432, 16, '#29f0ff', 12);
    if (S.modeTime > 0.6) button(unlock ? 'ENTER ENDLESS' : 'NEXT LEVEL', W / 2 - 120, 465, 240, 60, '#29f0ff', 'next', null, true);
  }

  function drawEnd() {
    dim(0.8);
    glowText('GAME OVER', W / 2, 190, 52, '#ff3d6e', 26);
    text(`LEVEL ${S.level + 1}${isEndless(S.level) ? ' · ENDLESS' : ''} · ${DIFFS[S.diff].label}`, W / 2, 240, 13, 'rgba(230,230,255,0.75)', 'center', 500);
    glowText(String(S.score), W / 2, 305, 52, '#29f0ff', 18);
    if (Share.challenge && S.diff === Share.challenge.diff) {
      const ch = Share.challenge;
      text(S.beatChallenge ? `YOU BEAT ${ch.name.toUpperCase()}'S ${ch.score}!` : `${ch.score - S.score} SHORT OF ${ch.name.toUpperCase()}`,
        W / 2, 268, 11, S.beatChallenge ? '#3dff8a' : '#ff3df2', 'center', 600);
    }
    if (S.newHigh) {
      glowText('NEW PERSONAL BEST!', W / 2, 355, 18, '#ffe066', 14 + 6 * Math.sin(S.time * 6));
    } else if (S.prevBest > 0 && S.prevBest - S.score <= S.prevBest * 0.2) {
      glowText(`SO CLOSE! ${S.prevBest - S.score} FROM YOUR BEST`, W / 2, 355, 15, '#ffe066', 10);
    } else {
      text(`BEST ${highScores[S.diff]}`, W / 2, 355, 14, 'rgba(230,230,255,0.6)', 'center', 500);
    }

    // Leaderboard status
    const y = 392;
    const dl = DIFFS[S.diff].label;
    if (S.rankState === 'done' && S.rank) {
      if (S.rank.guest) {
        const warnNow = Account.expiringSoon();
        glowText(`#${S.rank.today_rank} TODAY`, W / 2, warnNow ? y - 6 : y, 15, DIFFS[S.diff].color, 10);
        if (warnNow) {
          text(`GUEST ENDS IN ${guestTimeLeft(Account.state.expires)} · SIGN UP TO KEEP YOUR ${Skins.unlockedCount() > 1 ? 'SKINS' : 'NAME'}`, W / 2, y + 16, 10, '#ffb319', 'center', 600);
        }
      } else {
        glowText(`#${S.rank.alltime_rank} ALL-TIME  ·  #${S.rank.today_rank} TODAY`, W / 2, y, 15, DIFFS[S.diff].color, 10);
      }
    } else if (S.rankState === 'sending') text('SUBMITTING SCORE…', W / 2, y, 12, 'rgba(230,230,255,0.6)', 'center', 500);
    else if (S.rankState === 'error') text(`SCORE NOT SAVED: ${S.rankError}`.toUpperCase().slice(0, 60), W / 2, y, 10, '#ff3d6e', 'center', 500);

    if (S.modeTime > 0.5) {
      button('PLAY AGAIN', W / 2 - 130, 425, 260, 64, '#3dff8a', `start:${S.diff}`, null, true);
      if (S.score > 0) button(S.beatChallenge ? 'SHARE: I WON!' : 'SHARE MY SCORE', W / 2 - 130, 501, 260, 52, '#29f0ff', 'share');
      const guest = Account.state.kind !== 'account';
      const y2 = S.score > 0 ? 565 : 505;
      button('LEADERBOARD', W / 2 - 130, y2, guest ? 126 : 260, 48, '#ffe066', 'board');
      if (guest) button('SIGN UP', W / 2 + 4, y2, 126, 48, '#3dff8a', 'signup');
      button('MAIN MENU', W / 2 - 130, y2 + 60, 260, 48, '#ff3df2', 'menu');
      if (HAS_KEYBOARD) text('SPACE TO PLAY AGAIN', W / 2, y2 + 128, 10, 'rgba(230,230,255,0.4)', 'center', 500);
    }
  }

  function draw() {
    S.buttons = [];
    const k = canvas.width / VW;
    ctx.setTransform(k, 0, 0, k, OX * k, OY * k);
    if (S.shake > 0) ctx.translate(rand(-S.shake, S.shake) * 0.5, rand(-S.shake, S.shake) * 0.5);

    drawBackground();
    const off = (H - LAYOUT_H) / 2;
    const centred = (fn) => {
      ctx.save();
      ctx.translate(0, off);
      S.btnOffset = off;
      fn();
      ctx.restore();
      S.btnOffset = 0;
    };
    if (S.mode === 'menu') {
      centred(drawMenu);
      drawSpeaker(W - 54, 18); // pinned to the top corner of the screen
      drawParticles();
      drawToast();
      return;
    }
    drawBricks();
    drawFog();
    drawCapsules();
    drawLasers();
    drawPaddle();
    drawBalls();
    drawParticles();
    drawHUD();
    if (S.mode === 'play') drawBanner();
    drawToast();
    if (S.mode === 'paused') centred(drawPaused);
    if (S.mode === 'clear') centred(drawClear);
    if (S.mode === 'over' || S.mode === 'win') centred(drawEnd);
  }

  // ---------- Input ----------
  function doAction(action) {
    if (!action) return false;
    if (action.startsWith('start:')) { const d = action.slice(6); requireIdentity(() => startGame(d)); return true; }
    switch (action) {
      case 'pause': setMode('paused'); return true;
      case 'resume': setMode('play'); return true;
      case 'menu': setMode('menu'); S.particles = []; return true;
      case 'next': loadLevel(S.level + 1); return true;
      case 'mute': Sound.toggleMute(); return true;
      case 'board': Leaderboard.open({ diff: S.mode === 'menu' ? DIFF_KEYS[S.menuSel] : S.diff }); return true;
      case 'skins': Skins.open(); return true;
      case 'account': Account.open({ required: !Account.state.kind }); return true;
      case 'signup': Account.open({ tab: 'signup' }); return true;
      case 'share':
        Share.open({
          score: S.score, level: S.level + 1, diff: S.diff,
          name: S.postedName || Account.state.name || 'A player',
          newBest: S.newHigh,
          beat: S.beatChallenge ? Share.challenge.name : null,
        });
        return true;
    }
    return false;
  }

  function buttonAt(p) {
    for (let i = S.buttons.length - 1; i >= 0; i--) {
      const b = S.buttons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.action;
    }
    return null;
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VW - OX, y: ((e.clientY - r.top) / r.height) * VH - OY };
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    pointerX = p.x;
    usePointer = true;
    if (e.pointerType === 'mouse') S.hoverAction = buttonAt(p);
  });
  canvas.addEventListener('pointerdown', (e) => {
    Sound.unlock();
    const p = toLogical(e);
    pointerX = p.x;
    usePointer = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  });
  canvas.addEventListener('pointerup', (e) => {
    const p = toLogical(e);
    if (doAction(buttonAt(p))) return;
    if (S.mode === 'play') launch();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  // Stop the browser's follow-up "click" after a tap: panels open on pointerup,
  // and that click would otherwise land on (and close or press) the new panel.
  canvas.addEventListener('touchend', (e) => { Sound.unlock(); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('click', () => Sound.unlock());

  function primaryAction() {
    switch (S.mode) {
      case 'menu': requireIdentity(() => startGame(DIFF_KEYS[S.menuSel])); break;
      case 'play': launch(); break;
      case 'paused': setMode('play'); break;
      case 'clear': if (S.modeTime > 0.6) loadLevel(S.level + 1); break;
      case 'over': case 'win': if (S.modeTime > 0.5) requireIdentity(() => startGame(S.diff)); break;
    }
  }

  window.addEventListener('keydown', (e) => {
    const openPanel = document.querySelector('.lb:not([hidden])');
    if (openPanel) {
      if (e.key === 'Escape') openPanel.querySelector('.lb-close').click();
      return;
    }
    Sound.unlock();
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); if (!e.repeat) primaryAction(); }
    else if (k === 'p' || k === 'P' || k === 'Escape') {
      if (S.mode === 'play') setMode('paused');
      else if (S.mode === 'paused') setMode('play');
    }
    else if (k === 'm' || k === 'M') Sound.toggleMute();
    else if (S.mode === 'menu') {
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { S.menuSel = (S.menuSel + 3) % 4; S.hoverAction = null; e.preventDefault(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { S.menuSel = (S.menuSel + 1) % 4; S.hoverAction = null; e.preventDefault(); }
      else if (k === '1' || k === '2' || k === '3' || k === '4') requireIdentity(() => startGame(DIFF_KEYS[Number(k) - 1]));
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.mode === 'play') setMode('paused');
  });
  window.addEventListener('blur', () => { keys.left = keys.right = false; });

  // ---------- Loop ----------
  let last = performance.now();
  // Watch frame times during play; if the device averages under ~40fps for a
  // couple of seconds, switch to low effects for the rest of the session.
  let perfTime = 0, perfFrames = 0;
  function watchPerformance(ms) {
    if (lowFx || S.mode !== 'play' || document.hidden || ms > 500) return;
    perfTime += ms;
    perfFrames++;
    if (perfTime >= 2000) {
      if (perfTime / perfFrames > 25) { lowFx = true; resize(); }
      perfTime = 0; perfFrames = 0;
    }
  }

  function frame(now) {
    watchPerformance(now - last);
    const raw = Math.min(0.033, Math.max(0, (now - last) / 1000));
    last = now;
    let dt = raw;
    if (S.slowmo > 0) { S.slowmo -= raw; dt = raw * 0.3; }
    update(dt, raw);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  Account.init(); // returning players resume; new visitors get a guest name automatically

  // Hook for automated testing.
  window.__brickSmasher = { state: S, startGame, loadLevel, applyPower, generateLevel, isLowFx: () => lowFx };
})();
