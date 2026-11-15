// Sound effects, music and phone vibration, all generated in the browser
// (no audio files). Music, sound and vibration can each be switched off.
const Settings = (() => {
  const KEY = 'bs-settings';
  let s = { music: true, sfx: true, vibrate: true };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) s = Object.assign(s, saved);
    else if (localStorage.getItem('bs-muted') === '1') s.sfx = false; // older versions
  } catch (e) {}
  const listeners = [];
  return {
    get: (k) => s[k],
    set(k, v) {
      s[k] = !!v;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      listeners.forEach((fn) => fn(k, s[k]));
    },
    toggle(k) { this.set(k, !s[k]); return s[k]; },
    onChange: (fn) => listeners.push(fn),
  };
})();

const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null;

  function unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
        sfxBus = ac.createGain(); sfxBus.connect(master);
        musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
      } catch (e) { return; }
    }
    if (ac.state === 'suspended') ac.resume();
    // iOS Safari only fully unlocks audio once a sound starts inside a gesture.
    if (!unlock.done) {
      try {
        const src = ac.createBufferSource();
        src.buffer = ac.createBuffer(1, 1, 22050);
        src.connect(ac.destination);
        src.start(0);
        unlock.done = true;
      } catch (e) {}
    }
    applyMusic();
  }

  // ---------- Effects ----------
  function tone(freq, dur, type = 'square', vol = 0.06, slideTo = 0, delay = 0) {
    if (!Settings.get('sfx') || !ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(dur, vol = 0.15, freq = 900, type = 'lowpass') {
    if (!Settings.get('sfx') || !ac) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    src.buffer = noiseBuf;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---------- Music ----------
  // Two original loops built from a minor chord progression: a calm one for
  // menus and a driving one for gameplay. Scheduled a little ahead in time.
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let track = null, step = 0, nextTime = 0, timer = null;

  function mNote(freq, t, dur, type, vol) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function mHat(t, vol) {
    if (!noiseBuf) return;
    const src = ac.createBufferSource();
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.buffer = noiseBuf; src.connect(f).connect(g).connect(musicBus);
    src.start(t, Math.random() * 0.5); src.stop(t + 0.06);
  }
  function mKick(t) {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.2);
  }

  function scheduleStep(t) {
    const game = track === 'game';
    const bar = Math.floor(step / 16) % 4;
    const s16 = step % 16;
    const chord = CHORDS[bar];
    const sixteenth = (60 / (game ? 128 : 96)) / 4;
    if (game) {
      if (s16 % 4 === 0) mKick(t);
      if (s16 % 2 === 1) mHat(t, 0.05);
      if (s16 % 2 === 0) mNote(midi(chord[0] - 24), t, sixteenth * 1.8, 'sawtooth', 0.07);
      const arp = [0, 1, 2, 1, 0, 2, 1, 2];
      if (s16 % 2 === 0) mNote(midi(chord[arp[(s16 / 2) % 8]] + 12), t, sixteenth * 1.5, 'square', 0.025);
    } else {
      if (s16 === 0) chord.forEach((n) => mNote(midi(n), t, sixteenth * 15, 'triangle', 0.035));
      if (s16 % 4 === 0) mNote(midi(chord[(s16 / 4) % 3] + 12), t, sixteenth * 3, 'sine', 0.03);
      if (s16 === 0 || s16 === 8) mNote(midi(chord[0] - 12), t, sixteenth * 7, 'sine', 0.06);
    }
    step++;
    return sixteenth;
  }

  function pump() {
    if (!ac || !track) return;
    while (nextTime < ac.currentTime + 0.25) nextTime += scheduleStep(nextTime);
  }

  function applyMusic() {
    if (!ac) return;
    const on = Settings.get('music') && track;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setTargetAtTime(on ? (track === 'game' ? 0.55 : 0.45) : 0, ac.currentTime, 0.3);
    if (on && !timer) {
      if (!noiseBuf) noise(0.001, 0.0001);
      nextTime = ac.currentTime + 0.05;
      timer = setInterval(pump, 60);
    } else if (!on && timer) {
      clearInterval(timer); timer = null;
    }
  }

  function music(name) {
    if (track === name) return;
    track = name;
    step = 0;
    applyMusic();
  }

  Settings.onChange((k) => { if (k === 'music') applyMusic(); });
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else if (unlock.done) ac.resume();
  });

  return {
    unlock,
    music,
    isMuted: () => !Settings.get('sfx'),
    toggleMute: () => !Settings.toggle('sfx'),
    paddle: () => { tone(200, 0.09, 'square', 0.05, 150); noise(0.04, 0.05, 2500, 'bandpass'); },
    wall: () => tone(170, 0.04, 'triangle', 0.035),
    hit: () => { tone(330, 0.06, 'square', 0.04); noise(0.04, 0.04, 3000, 'bandpass'); },
    brick: (combo) => {
      const f = 440 * Math.pow(2, Math.min(combo, 24) / 12);
      tone(f, 0.08, 'square', 0.045);
      tone(f * 1.5, 0.06, 'triangle', 0.02, 0, 0.02);
      noise(0.06, 0.06, 4000, 'bandpass');
    },
    metal: () => { tone(1400, 0.06, 'triangle', 0.035); tone(2100, 0.05, 'sine', 0.02); },
    tick: () => tone(1050, 0.04, 'square', 0.035),
    explode: () => { noise(0.45, 0.28, 700); tone(110, 0.35, 'sawtooth', 0.06, 35); tone(60, 0.4, 'sine', 0.12, 30); },
    laser: () => tone(900, 0.06, 'sawtooth', 0.022, 300),
    launch: () => tone(300, 0.1, 'square', 0.04, 620),
    good: () => [523, 659, 784].forEach((f, i) => tone(f, 0.1, 'square', 0.045, 0, i * 0.06)),
    bad: () => { tone(300, 0.28, 'sawtooth', 0.05, 90); noise(0.2, 0.06, 500); },
    lose: () => { tone(400, 0.5, 'sawtooth', 0.06, 60); noise(0.3, 0.08, 400); },
    clear: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.045, 0, i * 0.08)),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.06, 0, i * 0.16)),
    reward: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.05, 0, i * 0.07)),
  };
})();

// Phone vibration (Android browsers; iPhones don't allow it for web pages).
const Haptics = (() => {
  const can = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  let last = 0;
  function buzz(pattern, minGap = 40) {
    if (!can || !Settings.get('vibrate')) return;
    const now = performance.now();
    if (now - last < minGap) return;
    last = now;
    try { navigator.vibrate(pattern); } catch (e) {}
  }
  return {
    supported: can,
    paddle: () => buzz(12),
    brick: () => buzz(18, 60),
    metal: () => buzz(6, 60),
    explode: () => buzz([45, 25, 70], 0),
    good: () => buzz([20, 40, 20], 0),
    bad: () => buzz([60, 40, 60], 0),
    lose: () => buzz(260, 0),
    clear: () => buzz([30, 50, 30, 50, 120], 0),
    reward: () => buzz([20, 30, 20, 30, 20, 30, 80], 0),
    combo: () => buzz([15, 20, 15], 0),
  };
})();
