// On-device audio analysis -> silly stats + stable score. Pure functions, no network.
import { clamp, hashStr, mulberry32 } from './util.js';

export function analyse(samples, sampleRate) {
  const n = samples.length;
  const dur = n / sampleRate;
  let sumSq = 0, peak = 0, zc = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    sumSq += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (i > 0 && (samples[i - 1] < 0) !== (v < 0)) zc++;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, n));
  const zcr = zc / Math.max(dur, 0.001); // crossings per second

  // Envelope in 20 ms frames
  const frame = Math.max(1, Math.floor(sampleRate * 0.02));
  const env = [];
  for (let i = 0; i + frame <= n; i += frame) {
    let s = 0;
    for (let j = i; j < i + frame; j++) s += samples[j] * samples[j];
    env.push(Math.sqrt(s / frame));
  }
  const envMax = Math.max(1e-6, ...env);
  const active = env.filter((e) => e > envMax * 0.15);
  const mean = active.reduce((a, b) => a + b, 0) / Math.max(1, active.length);
  const variance = active.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, active.length);
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // amplitude wobble
  let attackFrames = env.findIndex((e) => e >= envMax * 0.8);
  if (attackFrames < 0) attackFrames = env.length;
  const attackMs = attackFrames * 20;

  const pitch = estimatePitch(samples, sampleRate);
  const activeSec = active.length * 0.02;

  const silent = peak < 0.01;
  const stats = silent
    ? { Wobble: 3, Squeakiness: 2, 'Trumpet Power': 1, 'Surprise Factor': 4 }
    : {
        Wobble: clamp(Math.round(cv * 140 + 10), 1, 100),
        Squeakiness: clamp(Math.round((Math.log2(Math.max(pitch || zcr / 2, 40) / 40) / 4.5) * 100), 1, 100),
        'Trumpet Power': clamp(Math.round(Math.min(1, rms / 0.25) * 60 + Math.min(1, activeSec / 2) * 40), 1, 100),
        'Surprise Factor': clamp(Math.round(100 - Math.min(attackMs, 400) / 4.5), 1, 100),
      };
  const featureKey = [dur.toFixed(2), rms.toFixed(3), peak.toFixed(2), Math.round(pitch), cv.toFixed(2), attackFrames].join('|');
  const seed = hashStr(featureKey);
  const jitter = (mulberry32(seed)() - 0.5) * 16;
  const base = 0.3 * stats['Trumpet Power'] + 0.25 * stats.Wobble + 0.2 * stats.Squeakiness + 0.25 * stats['Surprise Factor'];
  const score = silent ? 8 : clamp(Math.round(base * 1.15 + jitter + 5), 5, 100);
  return { dur, rms, peak, pitch, zcr, wobbleCV: cv, attackMs, stats, score, seed, silent };
}

// Autocorrelation pitch estimate on the loudest 2048-sample window (50–1000 Hz)
function estimatePitch(samples, sr) {
  const size = 2048;
  if (samples.length < size) return 0;
  let bestStart = 0, bestE = 0;
  for (let i = 0; i + size <= samples.length; i += 1024) {
    let e = 0;
    for (let j = i; j < i + size; j += 4) e += samples[j] * samples[j];
    if (e > bestE) { bestE = e; bestStart = i; }
  }
  const minLag = Math.floor(sr / 1000), maxLag = Math.floor(sr / 50);
  let best = -1, bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let j = 0; j < size - lag; j += 2) s += samples[bestStart + j] * samples[bestStart + j + lag];
    if (s > best) { best = s; bestLag = lag; }
  }
  return bestLag ? sr / bestLag : 0;
}

export function creatureStatsFromAnalysis(a) {
  return {
    Wobble: a.stats.Wobble,
    Squeak: a.stats.Squeakiness,
    Boom: a.stats['Trumpet Power'],
    Sneakiness: clamp(100 - a.stats['Surprise Factor'] + 20, 1, 100),
  };
}
