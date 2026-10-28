// Real CC0 toot samples (see Credits & licences screen). Each file is fetched from this app's own
// origin (precached by the service worker), decoded once with Web Audio and the AudioBuffer cached.
import { SAMPLES } from './samples-data.js';
import { hashStr } from './util.js';

// Sound groups shown as the Toot Library. `synth` = synth instrument used if the samples can't load.
export const GROUPS = [
  { id: 'whoopee', name: 'Whoopee Cushion', synth: 'whoopee' },
  { id: 'squeak', name: 'Squeaky Squeakers', synth: 'squeaker' },
  { id: 'tuba', name: 'Big Brass Tuba', synth: 'tuba' },
  { id: 'classic', name: 'Classic Toot', synth: 'kazoo' },
  { id: 'cartoon', name: 'Cartoon Echo', synth: 'balloon' },
  { id: 'wet', name: 'Bubbly Blurp', synth: 'sputter' },
  { id: 'tiny', name: 'Tiny Toots', synth: 'pfft' },
  { id: 'double', name: 'Double Trouble', synth: 'duck' },
  { id: 'sequence', name: 'Toot Parade', synth: 'sputter' },
  { id: 'ripper', name: 'Rumble Ripper', synth: 'rumble' },
];
// Single-sample groups borrow a close cousin so the same file never plays twice in a row.
const COUSINS = { whoopee: ['classic', 'wet'], wet: ['whoopee', 'classic'], cartoon: ['sequence', 'double'] };

export { SAMPLES };
export const sampleById = (id) => SAMPLES.find((s) => s.id === id);
export const samplesInGroup = (g) => SAMPLES.filter((s) => s.group === g);
export const groupById = (g) => GROUPS.find((x) => x.id === g);

let lastPlayed = null;
export function markPlayed(id) { lastPlayed = id; }
export function lastSampleId() { return lastPlayed; }

// Random sample from a group, never the one played last.
export function nextSampleId(group) {
  let pool = samplesInGroup(group).filter((s) => s.id !== lastPlayed && !failed.has(s.id));
  if (!pool.length) for (const c of COUSINS[group] || []) { pool = samplesInGroup(c).filter((s) => s.id !== lastPlayed && !failed.has(s.id)); if (pool.length) break; }
  if (!pool.length) pool = SAMPLES.filter((s) => s.id !== lastPlayed && !failed.has(s.id));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// A creature's signature voice: fixed sample from its group (deterministic per creature).
export function signatureSampleId(seed, group) {
  const pool = samplesInGroup(group);
  if (!pool.length) return null;
  return pool[(seed >>> 0) % pool.length].id;
}

const buffers = new Map(); // id -> Promise<AudioBuffer|null>
const failed = new Set();
export const sampleStatus = { decoded: 0, failed: 0, total: SAMPLES.length, ids: [] };
if (typeof window !== 'undefined') window.__tootSamples = sampleStatus; // read-only QA hook (on-device only)

export function sampleBuffer(ctx, id) {
  if (buffers.has(id)) return buffers.get(id);
  const s = sampleById(id);
  const p = (async () => {
    if (!s) return null;
    try {
      const res = await fetch(new URL('../' + s.file, import.meta.url));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ab = await res.arrayBuffer();
      const buf = await new Promise((ok, bad) => ctx.decodeAudioData(ab, ok, bad));
      sampleStatus.decoded++; sampleStatus.ids.push(id);
      return buf;
    } catch (e) {
      failed.add(id); sampleStatus.failed++;
      console.warn('Sample unavailable, using synth fallback:', id, e && e.message);
      return null;
    }
  })();
  buffers.set(id, p);
  return p;
}

let preloading = null;
export function preloadSamples(ctx) {
  if (!preloading) preloading = Promise.all(SAMPLES.map((s) => sampleBuffer(ctx, s.id)));
  return preloading;
}

export function isSampleFailed(id) { return failed.has(id); }
export const seedGroup = (seed) => GROUPS[(hashStr('g' + seed) >>> 0) % GROUPS.length].id;
