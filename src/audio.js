// Tiny synthesized sound effects (Web Audio, no files needed).
const Sound = (() => {
  let ac = null;
  let muted = false;
  try { muted = localStorage.getItem('bs-muted') === '1'; } catch (e) {}

  function unlock() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
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
  }

  function tone(freq, dur, type = 'square', vol = 0.06, slideTo = 0) {
    if (muted || !ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.15) {
    if (muted || !ac) return;
    const t = ac.currentTime;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(ac.destination);
    src.start(t);
  }

  return {
    unlock,
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem('bs-muted', muted ? '1' : '0'); } catch (e) {}
      return muted;
    },
    paddle: () => tone(220, 0.08, 'square', 0.05),
    wall: () => tone(160, 0.04, 'triangle', 0.04),
    hit: () => tone(330, 0.06, 'square', 0.04),
    brick: (combo) => tone(440 + Math.min(combo, 15) * 45, 0.08, 'square', 0.05),
    metal: () => tone(1400, 0.05, 'triangle', 0.035),
    explode: () => { noise(0.35, 0.2); tone(120, 0.3, 'sawtooth', 0.05, 40); },
    laser: () => tone(900, 0.06, 'sawtooth', 0.025, 300),
    launch: () => tone(300, 0.1, 'square', 0.04, 600),
    good: () => { tone(520, 0.08, 'square', 0.05); setTimeout(() => tone(780, 0.12, 'square', 0.05), 70); },
    bad: () => tone(300, 0.25, 'sawtooth', 0.05, 90),
    lose: () => tone(400, 0.5, 'sawtooth', 0.06, 60),
    clear: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'square', 0.05), i * 90)),
    over: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.06), i * 160)),
  };
})();
