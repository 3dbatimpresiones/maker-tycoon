// Motor de audio del juego (todo sintetizado con Web Audio, sin archivos).
// Buses separados: música, ambiente, máquinas y efectos. Arranca con el primer toque del jugador.
let ctx = null;
let buses = null;
let enabled = true;
let master = 0.6;
let vols = { music: 0.35, ambient: 0.5, machines: 0.6, fx: 0.7 };
const last = {};

function makeImpulse(c, secs = 2.2, decay = 3) {
  const len = Math.floor(c.sampleRate * secs);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
let noiseBuf = null, brownBuf = null;
function noiseBuffer(c) {
  if (noiseBuf) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function brownBuffer(c) {
  if (brownBuf) return brownBuf;
  brownBuf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const d = brownBuf.getChannelData(0);
  let lastV = 0;
  for (let i = 0; i < d.length; i++) { lastV = (lastV + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = lastV * 3.5; }
  return brownBuf;
}

function ensure() {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const out = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 3;
      out.connect(comp); comp.connect(ctx.destination);
      const reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(ctx);
      const revGain = ctx.createGain(); revGain.gain.value = 0.22;
      reverb.connect(revGain); revGain.connect(out);
      const mk = () => { const g = ctx.createGain(); g.connect(out); return g; };
      buses = { out, reverb, music: mk(), ambient: mk(), machines: mk(), fx: mk() };
      applyVolumes();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
// Con Spotify sonando, se apaga SOLO la música del juego (ambiente, máquinas y efectos siguen).
let ducked = false;
function applyVolumes() {
  if (!buses) return;
  const m = enabled ? master : 0;
  buses.out.gain.value = m;
  for (const k of ['music', 'ambient', 'machines', 'fx']) {
    const v = (ducked && k === 'music') ? 0 : (vols[k] ?? 0.5);
    const gp = buses[k].gain;
    try { gp.cancelScheduledValues(ctx.currentTime); gp.setTargetAtTime(v, ctx.currentTime, 0.25); } catch { gp.value = v; }
  }
}
function throttle(key, ms) {
  const now = performance.now();
  if (last[key] && now - last[key] < ms) return true;
  last[key] = now;
  return false;
}
const vary = (f, cents = 40) => f * Math.pow(2, ((Math.random() * 2 - 1) * cents) / 1200);

// ---------- Efectos de interfaz (bus fx + reverb) ----------
function tone(freq, dur, { type = 'sine', at = 0, gain = 0.2, to = null, bus = 'fx', wet = 0.4, attack = 0.008 } = {}) {
  const c = ensure(); if (!c || !enabled) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(buses[bus]);
  if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(buses.reverb); }
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur, { at = 0, gain = 0.15, f1 = 800, f2 = 2400, q = 3, type = 'bandpass', bus = 'fx', wet = 0.2 } = {}) {
  const c = ensure(); if (!c || !enabled) return;
  const t0 = c.currentTime + at;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f1, t0); f.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(buses[bus]);
  if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(buses.reverb); }
  src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.05);
}
const chord = (notes, opts = {}) => notes.forEach((f, i) => tone(f, opts.dur || 0.5, { ...opts, at: (opts.at || 0) + i * (opts.step || 0) }));

export const sfx = {
  configure(on, vol, v) { enabled = !!on; if (vol != null) master = vol; if (v) vols = { ...vols, ...v }; applyVolumes(); if (enabled) music.maybeStart(); else music.stop(); },
  // Arranca el audio con el primer toque (los navegadores lo exigen): música y ambiente del taller. NO suena nada.
  unlock() { if (ensure()) { music.maybeStart(); ambient.start(); } },
  setDucked(on) { if (ducked === !!on) return; ducked = !!on; applyVolumes(); },
  isDucked: () => ducked,
  // Sin «clic»: molestaba a cada rato (pedido del usuario). Se deja la función para no romper llamadas.
  click() {},
  sale() {
    if (throttle('sale', 260)) return;
    const b = vary(1046, 120);
    tone(b, 0.09, { type: 'triangle', gain: 0.05, wet: 0.3 });
    tone(b * 1.5, 0.16, { type: 'sine', at: 0.05, gain: 0.04, wet: 0.4 });
  },
  // Venta hecha por el sobrino, BATI o la expulsión automática: más suave y espaciada,
  // para que el taller se siga escuchando sin cansar.
  saleAuto() {
    if (throttle('saleAuto', 1500)) return;
    const b = vary(1046, 120);
    tone(b, 0.08, { type: 'triangle', gain: 0.03, wet: 0.35 });
    tone(b * 1.5, 0.14, { type: 'sine', at: 0.05, gain: 0.025, wet: 0.45 });
  },
  chatMsg() { // alguien escribió en el chat
    if (throttle('chatMsg', 2500)) return;
    tone(880, 0.1, { type: 'sine', gain: 0.045, wet: 0.35 });
  },
  mention() { // te mencionaron en el chat
    if (throttle('mention', 1500)) return;
    tone(988, 0.12, { type: 'sine', gain: 0.07, wet: 0.3 });
    tone(1319, 0.22, { type: 'sine', at: 0.1, gain: 0.07, wet: 0.4 });
  },
  done() { // la melodía de "impresión completa"
    if (throttle('done', 1200)) return;
    chord([784, 988, 1175], { type: 'square', gain: 0.022, step: 0.11, dur: 0.16, wet: 0.35 });
  },
  buy() {
    chord([523.25, 659.25, 783.99, 1046.5], { type: 'triangle', gain: 0.06, step: 0.05, dur: 0.6, wet: 0.5 });
    noise(0.25, { gain: 0.04, f1: 3000, f2: 9000, type: 'highpass', q: 0.5, at: 0.02 });
  },
  accept() { if (throttle('accept', 300)) return; chord([659.25, 987.77], { type: 'sine', gain: 0.06, step: 0.07, dur: 0.3 }); },
  mate() { // sorbo de bombilla
    noise(0.35, { gain: 0.22, f1: 500, f2: 1800, q: 6, wet: 0.1 });
    noise(0.25, { at: 0.38, gain: 0.16, f1: 700, f2: 2600, q: 8, wet: 0.1 });
  },
  alert() { if (throttle('alert', 900)) return; tone(880, 0.12, { type: 'square', gain: 0.03 }); tone(659, 0.2, { type: 'square', at: 0.15, gain: 0.03 }); },
  boing() { tone(320, 0.45, { type: 'sine', gain: 0.14, to: 90, wet: 0.2 }); noise(0.2, { gain: 0.05, f1: 400, f2: 200, q: 2 }); },
  nofil() { if (throttle('nofil', 2000)) return; tone(440, 0.15, { type: 'triangle', gain: 0.05 }); tone(330, 0.3, { type: 'triangle', at: 0.16, gain: 0.05 }); },
  urgent() { [0, 0.18, 0.36].forEach((at) => tone(1320, 0.1, { type: 'square', gain: 0.025, at })); },
  order() { chord([523.25, 659.25, 783.99, 1046.5, 1318.5], { type: 'triangle', gain: 0.06, step: 0.07, dur: 0.35, wet: 0.5 }); },
  fail() { tone(392, 0.25, { type: 'sawtooth', gain: 0.03 }); tone(311, 0.4, { type: 'sawtooth', at: 0.2, gain: 0.03 }); },
  achievement() { chord([783.99, 987.77, 1174.66, 1567.98], { type: 'triangle', gain: 0.06, step: 0.08, dur: 0.5, wet: 0.6 }); },
  unlockJingle() { chord([392, 523.25, 659.25, 783.99, 1046.5], { type: 'sine', gain: 0.05, step: 0.06, dur: 0.9, wet: 0.7 }); },
  power() { tone(110, 0.8, { type: 'sawtooth', gain: 0.06, to: 35, wet: 0.3 }); noise(0.5, { gain: 0.08, f1: 2000, f2: 200, type: 'lowpass', q: 0.7 }); },
  setIntensity(n) { music.intensity = n; ambient.level(n); },
  updateMachines(list) { machines.update(list); },
  stopAll() { music.stop(); ambient.stop(); machines.stopAll(); },
};

// ---------- Ambiente de taller ----------
const ambient = {
  nodes: null,
  start() {
    const c = ensure(); if (!c || this.nodes) return;
    const src = c.createBufferSource(); src.buffer = brownBuffer(c); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = c.createGain(); g.gain.value = 0.25;
    src.connect(lp); lp.connect(g); g.connect(buses.ambient);
    const fanSrc = c.createBufferSource(); fanSrc.buffer = noiseBuffer(c); fanSrc.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const fg = c.createGain(); fg.gain.value = 0.012;
    fanSrc.connect(bp); bp.connect(fg); fg.connect(buses.ambient);
    const hum = c.createOscillator(); hum.frequency.value = 50; const hg = c.createGain(); hg.gain.value = 0.006;
    hum.connect(hg); hg.connect(buses.ambient);
    src.start(); fanSrc.start(); hum.start();
    this.nodes = { src, fanSrc, hum, g, fg, hg };
  },
  level(space) {
    if (!this.nodes || !ctx) return;
    const t = ctx.currentTime;
    this.nodes.g.gain.setTargetAtTime(0.18 + space * 0.04, t, 1);
    this.nodes.fg.gain.setTargetAtTime(0.01 + space * 0.008, t, 1);
  },
  stop() { if (!this.nodes) return; try { this.nodes.src.stop(); this.nodes.fanSrc.stop(); this.nodes.hum.stop(); } catch { /* ya frenado */ } this.nodes = null; },
};

// ---------- Máquinas: voces ubicadas en el espacio ----------
const KIND = (model) => {
  if (['mars', 'photon', 'saturn', 'form4'].includes(model)) return 'resin';
  if (['falcon', 'xtools1', 'xtoolp2'].includes(model)) return 'laser';
  if (['g3018', 'artisan', 'shapeoko'].includes(model)) return 'cnc';
  return 'fdm';
};
function makeVoice(kind) {
  const c = ctx;
  const out = c.createGain(); out.gain.value = 0;
  const pan = c.createStereoPanner();
  out.connect(pan); pan.connect(buses.machines);
  const v = { kind, out, pan, nodes: [], next: 0 };
  const osc = (type, f, g) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(out); o.start(); v.nodes.push(o); return { o, gg }; };
  const nz = (type, f, q, g) => { const s = c.createBufferSource(); s.buffer = noiseBuffer(c); s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = c.createGain(); gg.gain.value = g; s.connect(fl); fl.connect(gg); gg.connect(out); s.start(0, Math.random()); v.nodes.push(s); return { s, fl, gg }; };
  if (kind === 'fdm') {
    // "Canto" de los motores paso a paso: notas que cambian con los movimientos + ventilador
    const step = c.createBiquadFilter(); step.type = 'bandpass'; step.Q.value = 4; step.frequency.value = 700;
    const so = c.createOscillator(); so.type = 'square'; so.frequency.value = 420;
    const sg = c.createGain(); sg.gain.value = 0.05;
    so.connect(step); step.connect(sg); sg.connect(out); so.start(); v.nodes.push(so);
    v.stepper = so; v.stepFilter = step;
    nz('bandpass', 1500, 0.8, 0.05);
  } else if (kind === 'resin') {
    osc('sine', 120, 0.05); osc('sine', 240, 0.015);
    v.peel = true;
  } else if (kind === 'laser') {
    osc('sine', 3150, 0.012); nz('bandpass', 1100, 0.7, 0.06);
    v.crackle = true;
  } else {
    const s1 = osc('sawtooth', 410, 0.03); s1.o.detune.value = 6;
    osc('sawtooth', 820, 0.015);
    nz('lowpass', 2500, 0.7, 0.07);
    v.spindle = s1.o;
  }
  return v;
}
const machines = {
  voices: new Map(),
  update(list) {
    const c = ensure(); if (!c || !enabled) return;
    const active = list.filter((m) => m.active).sort((a, b) => a.dist - b.dist).slice(0, 6);
    const keep = new Set(active.map((m) => m.id));
    for (const [id, v] of this.voices) {
      if (keep.has(id)) continue;
      v.out.gain.setTargetAtTime(0, c.currentTime, 0.2);
      if (!v.dying) { v.dying = true; setTimeout(() => { v.nodes.forEach((n) => { try { n.stop(); } catch { /* listo */ } }); v.out.disconnect(); this.voices.delete(id); }, 900); }
    }
    const t = c.currentTime;
    for (const m of active) {
      let v = this.voices.get(m.id);
      if (!v || v.dying) { v = makeVoice(KIND(m.model)); this.voices.set(m.id, v); }
      const g = Math.min(1, 1.6 / (1 + m.dist * 0.9));
      v.out.gain.setTargetAtTime(g, t, 0.25);
      v.pan.pan.setTargetAtTime(m.pan * 0.85, t, 0.2);
      if (t >= v.next) {
        if (v.stepper) { // nueva "nota" de movimiento
          const notes = [330, 392, 440, 523, 587, 659, 784, 880];
          const f = notes[Math.floor(Math.random() * notes.length)] * (Math.random() < 0.3 ? 0.5 : 1);
          v.stepper.frequency.setTargetAtTime(f, t, 0.02);
          v.stepFilter.frequency.setTargetAtTime(f * 1.6, t, 0.03);
          v.next = t + 0.12 + Math.random() * 0.35;
        } else if (v.peel) { // despegue de capa en resina
          noise(0.18, { gain: 0.05 * g, f1: 300, f2: 120, type: 'lowpass', q: 1, bus: 'machines', wet: 0.1 });
          v.next = t + 2.6 + Math.random() * 0.6;
        } else if (v.crackle) { // chisporroteo del láser
          noise(0.03, { gain: 0.04 * g, f1: 4000, f2: 6000, q: 2, bus: 'machines', wet: 0 });
          v.next = t + 0.05 + Math.random() * 0.25;
        } else if (v.spindle) {
          v.spindle.frequency.setTargetAtTime(380 + Math.random() * 60, t, 0.3);
          v.next = t + 0.4 + Math.random() * 0.6;
        }
      }
    }
  },
  stopAll() { for (const [, v] of this.voices) { v.nodes.forEach((n) => { try { n.stop(); } catch { /* listo */ } }); v.out.disconnect(); } this.voices.clear(); },
};

// ---------- Música electrónica ambiental generativa ----------
const CHORDS = [
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [130.81, 196.0, 246.94, 329.63], // Cmaj7
  [196.0, 246.94, 293.66, 369.99], // G (con 7M)
];
const music = {
  timer: null, nextBar: 0, bar: 0, intensity: 0, playing: false,
  maybeStart() { if (!enabled || (vols.music ?? 0) <= 0.001) return; if (!this.playing && ensure()) this.start(); },
  start() {
    this.playing = true;
    this.nextBar = ctx.currentTime + 0.2;
    this.timer = setInterval(() => this.schedule(), 200);
  },
  stop() { clearInterval(this.timer); this.timer = null; this.playing = false; },
  schedule() {
    if (!ctx || !enabled) return;
    const barLen = (60 / 88) * 4;
    while (this.nextBar < ctx.currentTime + 0.6) { this.playBar(this.nextBar, barLen, this.bar); this.nextBar += barLen; this.bar++; }
  },
  pad(f, t0, dur, g) {
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + this.intensity * 250; lp.Q.value = 0.4;
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0.0001, t0); gg.gain.linearRampToValueAtTime(g, t0 + 1.2); gg.gain.setValueAtTime(g, t0 + dur - 0.8); gg.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.6);
      o.connect(lp); lp.connect(gg); gg.connect(buses.music);
      const w = ctx.createGain(); w.gain.value = 0.5; gg.connect(w); w.connect(buses.reverb);
      o.start(t0); o.stop(t0 + dur + 0.7);
    }
  },
  note(f, t0, dur, { type = 'triangle', g = 0.05, wet = 0.4 } = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
    const gg = ctx.createGain();
    gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(g, t0 + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gg); gg.connect(buses.music);
    if (wet) { const w = ctx.createGain(); w.gain.value = wet; gg.connect(w); w.connect(buses.reverb); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  kick(t0) {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.25);
    const gg = ctx.createGain(); gg.gain.setValueAtTime(0.12, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    o.connect(gg); gg.connect(buses.music); o.start(t0); o.stop(t0 + 0.35);
  },
  hat(t0, g = 0.02) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
    const gg = ctx.createGain(); gg.gain.setValueAtTime(g, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
    s.connect(hp); hp.connect(gg); gg.connect(buses.music); s.start(t0, Math.random()); s.stop(t0 + 0.08);
  },
  playBar(t0, len, bar) {
    const ch = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    const lvl = this.intensity >= 4 ? 2 : this.intensity >= 2 ? 1 : 0;
    if (bar % 2 === 0) ch.forEach((f) => this.pad(f, t0, len * 2, 0.012));
    const beat = len / 4;
    if (lvl >= 1) {
      this.note(ch[0] / 2, t0, beat * 1.8, { type: 'sine', g: 0.07, wet: 0.1 });
      this.note(ch[0] / 2, t0 + beat * 2, beat * 1.8, { type: 'sine', g: 0.06, wet: 0.1 });
      const arp = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[3] * 2];
      for (let i = 0; i < 8; i++) if (Math.random() < 0.75) this.note(arp[(i + bar) % 4], t0 + i * beat / 2, beat * 0.45, { g: 0.018 + Math.random() * 0.01, wet: 0.55 });
    } else {
      for (let i = 0; i < 3; i++) if (Math.random() < 0.6) this.note(ch[Math.floor(Math.random() * 4)] * 2, t0 + Math.random() * len, 1.2, { type: 'sine', g: 0.02, wet: 0.7 });
    }
    if (lvl >= 2) {
      for (let i = 0; i < 4; i++) this.kick(t0 + i * beat);
      for (let i = 0; i < 8; i++) this.hat(t0 + i * beat / 2 + beat / 4, i % 2 ? 0.012 : 0.02);
    }
  },
};
