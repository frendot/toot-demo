// Web Audio engine. All toot sounds are synthesised in code (no samples, no downloads).
// One shared AudioContext, every playback goes through a master gain (parent volume cap).
import { mulberry32, clamp } from './util.js';
import { metrics } from './metrics.js';

let ctx = null;
let master = null;
let volumeCap = 1;
const bufferCache = new Map();
const live = new Set(); // active/scheduled source nodes

export function setAudioSessionType(type) {
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) { /* not supported */ }
}

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = volumeCap;
    master.connect(ctx.destination);
  }
  return ctx;
}

// Must be called from a user gesture (first "Press me" tap etc.).
export async function unlockAudio() {
  setAudioSessionType('playback');
  const c = getCtx();
  if (c.state !== 'running') { try { await c.resume(); } catch (e) { /* ignore */ } }
  return c;
}

export function setVolumeCap(v) {
  volumeCap = clamp(v, 0.05, 1);
  if (master) master.gain.setValueAtTime(volumeCap, ctx.currentTime);
}

export const INSTRUMENTS = ['whoopee', 'tuba', 'kazoo', 'duck', 'squeaker', 'rumble', 'trumpet', 'balloon', 'pfft', 'sputter'];

// Library: hand-tuned synth recipes.
export const LIBRARY = [
  { id: 'lib-whoopee', name: 'Classic Whoopee', p: { inst: 'whoopee', f0: 120, f1: 80, dur: 1.2, vib: 22, vibDepth: 0.12, flutter: 28, noise: 0.15, bright: 0.5 } },
  { id: 'lib-squeaker', name: 'Tiny Squeaker', p: { inst: 'squeaker', f0: 620, f1: 900, dur: 0.45, vib: 30, vibDepth: 0.05, flutter: 0, noise: 0.03, bright: 0.9 } },
  { id: 'lib-tuba', name: 'Big Brass Tuba', p: { inst: 'tuba', f0: 70, f1: 55, dur: 1.8, vib: 6, vibDepth: 0.04, flutter: 14, noise: 0.08, bright: 0.25 } },
  { id: 'lib-kazoo', name: 'Kazoo Solo', p: { inst: 'kazoo', f0: 260, f1: 230, dur: 1.0, vib: 7, vibDepth: 0.06, flutter: 45, noise: 0.1, bright: 0.85 } },
  { id: 'lib-duck', name: 'Duck Honk', p: { inst: 'duck', f0: 330, f1: 260, dur: 0.5, vib: 0, vibDepth: 0, flutter: 60, noise: 0.2, bright: 0.8, pulses: 2 } },
  { id: 'lib-rumble', name: 'Rumble Rumble', p: { inst: 'rumble', f0: 55, f1: 42, dur: 2.2, vib: 4, vibDepth: 0.08, flutter: 18, noise: 0.25, bright: 0.15 } },
  { id: 'lib-trumpet', name: 'Royal Trumpet', p: { inst: 'trumpet', f0: 180, f1: 240, dur: 1.1, vib: 5, vibDepth: 0.03, flutter: 8, noise: 0.05, bright: 0.75 } },
  { id: 'lib-balloon', name: 'Wobbly Balloon', p: { inst: 'balloon', f0: 400, f1: 180, dur: 1.6, vib: 9, vibDepth: 0.25, flutter: 30, noise: 0.05, bright: 0.7 } },
  { id: 'lib-pfft', name: 'Sneaky Pfft', p: { inst: 'pfft', f0: 90, f1: 80, dur: 0.7, vib: 0, vibDepth: 0, flutter: 35, noise: 0.85, bright: 0.4 } },
  { id: 'lib-sputter', name: 'Stairway Sputter', p: { inst: 'sputter', f0: 140, f1: 70, dur: 1.5, vib: 12, vibDepth: 0.1, flutter: 22, noise: 0.15, bright: 0.5, pulses: 5 } },
];

export function libraryById(id) { return LIBRARY.find((s) => s.id === id); }

// Recipe for a creature/random voice from a numeric seed.
export function recipeFromSeed(seed) {
  const r = mulberry32(seed);
  const inst = INSTRUMENTS[Math.floor(r() * INSTRUMENTS.length)];
  const base = LIBRARY.find((s) => s.p.inst === inst).p;
  return {
    ...base,
    f0: base.f0 * (0.7 + r() * 0.7),
    f1: base.f1 * (0.7 + r() * 0.7),
    dur: clamp(base.dur * (0.6 + r() * 0.8), 0.3, 3.5),
    vibDepth: base.vibDepth * (0.5 + r()),
    flutter: base.flutter * (0.6 + r() * 0.8),
    seed,
  };
}

// Sample-by-sample synth -> AudioBuffer (mono). Deterministic for a given recipe.
export function synth(p, sampleRate) {
  const sr = sampleRate || getCtx().sampleRate;
  const n = Math.floor(p.dur * sr);
  const out = new Float32Array(n);
  const rng = mulberry32(p.seed || 1234);
  let phase = 0;
  let lp = 0;
  let noiseLp = 0;
  const pulses = p.pulses || 1;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const x = t / p.dur; // 0..1
    // pitch glide + vibrato + a bit of random drift
    let f = p.f0 + (p.f1 - p.f0) * x;
    f *= 1 + p.vibDepth * Math.sin(2 * Math.PI * p.vib * t);
    phase += f / sr;
    phase -= Math.floor(phase);
    // buzzy wave: blend of pulse and saw, brightness controls the blend
    const saw = 2 * phase - 1;
    const pulse = phase < 0.3 ? 1 : -0.45;
    const sine = Math.sin(2 * Math.PI * phase);
    let w;
    if (p.inst === 'squeaker' || p.inst === 'balloon') w = 0.7 * sine + 0.3 * saw;
    else if (p.inst === 'kazoo' || p.inst === 'duck') w = 0.4 * saw + 0.6 * pulse;
    else w = 0.5 * pulse + 0.3 * saw + 0.2 * sine;
    // one-pole lowpass to shape tone
    const a = 0.05 + 0.6 * p.bright;
    lp += a * (w - lp);
    // flutter: the lip-buzz rasp
    const flutter = p.flutter > 0 ? 0.6 + 0.4 * Math.sin(2 * Math.PI * p.flutter * t + rng() * 0.3) : 1;
    // noise (pfft)
    noiseLp += 0.25 * ((rng() * 2 - 1) - noiseLp);
    let s = lp * (1 - p.noise) * flutter + noiseLp * p.noise * 1.6 * (0.5 + 0.5 * flutter);
    // envelope: quick attack, sustain, release; optional pulse gating (sputter/duck)
    const att = Math.min(1, t / 0.015);
    const rel = Math.min(1, (p.dur - t) / 0.12);
    let env = att * rel * (0.85 + 0.15 * Math.sin(Math.PI * x));
    if (pulses > 1) {
      const seg = (x * pulses) % 1;
      env *= seg < 0.75 ? Math.min(1, seg / 0.05) * Math.min(1, (0.75 - seg) / 0.08) : 0;
    }
    out[i] = s * env;
  }
  // normalise to a friendly peak
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? 0.8 / peak : 1;
  for (let i = 0; i < n; i++) out[i] *= g;
  return out;
}

export function bufferFromSamples(samples, sampleRate) {
  const c = getCtx();
  const buf = c.createBuffer(1, samples.length, sampleRate || c.sampleRate);
  buf.copyToChannel(samples, 0);
  return buf;
}

// Sound refs: {type:'lib', id} | {type:'seed', seed} | {type:'rec', id} | {type:'pcm', samples, sampleRate}
export function samplesForRef(ref) {
  const key = ref.type === 'lib' ? ref.id : ref.type === 'seed' ? 'seed-' + ref.seed : null;
  if (key && bufferCache.has(key)) return bufferCache.get(key);
  let res = null;
  const sr = getCtx().sampleRate;
  if (ref.type === 'lib') {
    const s = libraryById(ref.id);
    res = { samples: synth({ ...s.p, seed: 777 + s.id.length }, sr), sampleRate: sr };
  } else if (ref.type === 'seed') {
    res = { samples: synth(recipeFromSeed(ref.seed), sr), sampleRate: sr };
  } else if (ref.type === 'pcm') {
    res = { samples: ref.samples, sampleRate: ref.sampleRate };
  }
  if (key && res) bufferCache.set(key, res);
  return res;
}

export async function audioBufferForRef(ref) {
  if (ref.type === 'rec') {
    const { recordingsDB } = await import('./store.js');
    const rec = await recordingsDB.get(ref.id);
    if (!rec) return null;
    if (rec.pcm) return bufferFromSamples(new Float32Array(rec.pcm), rec.sampleRate);
    const ab = await rec.blob.arrayBuffer();
    return await new Promise((res, rej) => getCtx().decodeAudioData(ab, res, rej));
  }
  const s = samplesForRef(ref);
  return s ? bufferFromSamples(s.samples, s.sampleRate) : null;
}

// Play now or at an absolute ctx time. Returns {source, endTime}.
export async function play(ref, when = 0, opts = {}) {
  const c = getCtx();
  if (c.state !== 'running') { try { await c.resume(); } catch (e) { /* ignore */ } }
  const buf = await audioBufferForRef(ref);
  if (!buf) return null;
  const src = c.createBufferSource();
  src.buffer = buf;
  if (opts.rate) src.playbackRate.value = opts.rate;
  src.connect(master);
  const startAt = when > 0 ? when : c.currentTime;
  src.start(startAt);
  live.add(src);
  src.onended = () => live.delete(src);
  // "time to first laugh" = first sound actually heard
  const delayMs = Math.max(0, (startAt - c.currentTime) * 1000);
  setTimeout(() => { if (!src._cancelled) metrics.soundPlayed(); }, delayMs);
  return { source: src, endTime: startAt + buf.duration / (opts.rate || 1), duration: buf.duration };
}

export function stopAll() {
  for (const s of live) { s._cancelled = true; try { s.stop(); } catch (e) { /* already stopped */ } }
  live.clear();
}

// Cheerful UI blips (synthesised) for reveals/drumrolls.
export function blip(freq = 660, dur = 0.08, type = 'triangle', gain = 0.25) {
  const c = getCtx();
  if (c.state !== 'running') return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(master);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

export function drumroll(ms = 1200) {
  const c = getCtx();
  if (c.state !== 'running') return;
  const steps = Math.floor(ms / 45);
  for (let i = 0; i < steps; i++) {
    const t = c.currentTime + i * 0.045;
    const len = Math.floor(c.sampleRate * 0.03);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len) * (0.2 + 0.5 * (i / steps));
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(master);
    s.start(t);
  }
}
