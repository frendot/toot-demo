// Anonymous, on-device usage counters for the demo. No identifiers, no network.
// Parents can view, export (JSON/CSV) or clear them in the Parent area.
import { kv } from './store.js';

const KEY = 'metrics';
const MAX_SESSIONS = 200;
const NEW_SESSION_AFTER_MS = 30 * 60 * 1000;

let data = null;
let session = null;
let saveTimer = null;
let hiddenAt = null;

function blank() {
  return { schema: 1, firstUsedDay: new Date().toISOString().slice(0, 10), counters: {}, sessions: [] };
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; flush(); }, 800);
}

async function flush() {
  if (!data) return;
  if (session) session.lengthSec = Math.round((performance.now() - session._t0) / 1000) + (session._carrySec || 0);
  const clean = { ...data, sessions: data.sessions.map(({ _t0, _carrySec, ...rest }) => rest) };
  try { await kv.set(KEY, clean); } catch (e) { /* storage full or blocked */ }
}

function startSession() {
  session = {
    start: new Date().toISOString().slice(0, 16), // minute precision, no identifiers
    lengthSec: 0,
    timeToFirstLaughMs: null,
    installed: isStandaloneSafe(),
    features: [],
    _t0: performance.now(),
  };
  data.sessions.push(session);
  if (data.sessions.length > MAX_SESSIONS) data.sessions.splice(0, data.sessions.length - MAX_SESSIONS);
  inc('sessions');
}

function isStandaloneSafe() {
  try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; }
}

function inc(name, n = 1) {
  data.counters[name] = (data.counters[name] || 0) + n;
}

export const metrics = {
  async init() {
    data = (await kv.get(KEY)) || blank();
    startSession();
    scheduleSave();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        flush();
      } else if (hiddenAt && Date.now() - hiddenAt > NEW_SESSION_AFTER_MS) {
        hiddenAt = null;
        startSession();
        scheduleSave();
      }
    });
    window.addEventListener('pagehide', flush);
    setInterval(flush, 15000);
  },
  count(name, n = 1) { if (!data) return; inc(name, n); scheduleSave(); },
  feature(name) {
    if (!data) return;
    inc('feature:' + name);
    if (session && !session.features.includes(name)) session.features.push(name);
    scheduleSave();
  },
  soundPlayed() {
    if (!data) return;
    inc('soundsPlayed');
    if (session && session.timeToFirstLaughMs === null) {
      session.timeToFirstLaughMs = Math.round(performance.now() - session._t0);
    }
    scheduleSave();
  },
  stop() { data = null; session = null; },
  sessionCount() { return data ? data.counters.sessions || 0 : 0; },
  async snapshot() { await flush(); return JSON.parse(JSON.stringify(await kv.get(KEY, blank()))); },
  async clear() { data = blank(); startSession(); await flush(); },
  summary(d) {
    const s = d.sessions || [];
    const ttfl = s.map((x) => x.timeToFirstLaughMs).filter((x) => typeof x === 'number').sort((a, b) => a - b);
    const lens = s.map((x) => x.lengthSec || 0).sort((a, b) => a - b);
    const median = (arr) => (arr.length ? arr[Math.floor(arr.length / 2)] : null);
    return {
      sessions: d.counters.sessions || 0,
      medianSessionSec: median(lens),
      totalPlaySec: lens.reduce((a, b) => a + b, 0),
      medianTimeToFirstLaughMs: median(ttfl),
      sessionsWithALaugh: ttfl.length,
    };
  },
};

export function toCSV(d, feedback) {
  const rows = [['section', 'key', 'value']];
  const sum = metrics.summary(d);
  for (const [k, v] of Object.entries(sum)) rows.push(['summary', k, v ?? '']);
  for (const [k, v] of Object.entries(d.counters).sort()) rows.push(['counter', k, v]);
  rows.push([]);
  rows.push(['session_start', 'length_sec', 'time_to_first_laugh_ms', 'installed', 'features']);
  for (const s of d.sessions) rows.push([s.start, s.lengthSec, s.timeToFirstLaughMs ?? '', s.installed ? 'yes' : 'no', (s.features || []).join(' ')]);
  if (feedback && feedback.length) {
    rows.push([]);
    rows.push(['feedback_day', 'rating', 'favourite', 'who_played', 'note']);
    for (const f of feedback) rows.push([f.day, f.rating ?? '', f.favourite ?? '', f.who ?? '', f.note ?? '']);
  }
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';
}
