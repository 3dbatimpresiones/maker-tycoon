// Sonidos sintetizados con Web Audio (sin archivos). Arrancan con el primer toque del jugador.
let ctx = null, master = null;
let enabled = true, volume = 0.6;
const last = {};

function ensure() {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = enabled ? volume * 0.45 : 0;
    return ctx;
  } catch { return null; }
}
function throttle(key, ms) {
  const now = performance.now();
  if (last[key] && now - last[key] < ms) return true;
  last[key] = now;
  return false;
}
function tone(freq, dur, { type = 'sine', at = 0, gain = 0.2, to = null } = {}) {
  const c = ensure(); if (!c || !enabled) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, { at = 0, gain = 0.15, f1 = 800, f2 = 2400, q = 3 } = {}) {
  const c = ensure(); if (!c || !enabled) return;
  const t0 = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
  bp.frequency.setValueAtTime(f1, t0); bp.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const g = c.createGain(); g.gain.value = gain;
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(t0);
}

export const sfx = {
  configure(on, vol) { enabled = !!on; volume = vol ?? volume; if (master) master.gain.value = enabled ? volume * 0.45 : 0; },
  unlock() { ensure(); },
  click() { if (throttle('click', 40)) return; tone(1400, 0.04, { type: 'triangle', gain: 0.05 }); },
  sale() {
    if (throttle('sale', 140)) return;
    tone(1318, 0.07, { type: 'triangle', gain: 0.08 });
    tone(1976, 0.12, { type: 'triangle', at: 0.05, gain: 0.07 });
  },
  done() { // la melodía de "impresión completa"
    if (throttle('done', 900)) return;
    tone(784, 0.1, { type: 'square', gain: 0.035 });
    tone(988, 0.1, { type: 'square', at: 0.11, gain: 0.035 });
    tone(1175, 0.18, { type: 'square', at: 0.22, gain: 0.035 });
  },
  buy() {
    tone(523, 0.18, { gain: 0.1 }); tone(659, 0.18, { at: 0.06, gain: 0.09 }); tone(784, 0.3, { at: 0.12, gain: 0.09 });
    tone(1046, 0.35, { type: 'triangle', at: 0.18, gain: 0.05 });
  },
  mate() { // sorbo de bombilla
    noise(0.35, { gain: 0.25, f1: 500, f2: 1800, q: 6 });
    noise(0.25, { at: 0.38, gain: 0.18, f1: 700, f2: 2600, q: 8 });
  },
  alert() { if (throttle('alert', 600)) return; tone(660, 0.12, { type: 'square', gain: 0.04 }); tone(440, 0.18, { type: 'square', at: 0.14, gain: 0.04 }); },
  boing() { tone(320, 0.45, { type: 'sine', gain: 0.16, to: 90 }); },
  order() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, { type: 'triangle', at: i * 0.08, gain: 0.08 }));
  },
  fail() { tone(392, 0.2, { type: 'sawtooth', gain: 0.04 }); tone(311, 0.3, { type: 'sawtooth', at: 0.18, gain: 0.04 }); },
  achievement() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, { type: 'triangle', at: i * 0.07, gain: 0.07 }));
  },
  power() { tone(110, 0.6, { type: 'sawtooth', gain: 0.06, to: 40 }); },
};
