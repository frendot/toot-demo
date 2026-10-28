// Toot Timer (spec 5): setup -> arm (wake lock) -> decoy -> toot(s) -> reaction picker -> Toot Report.
import { el, randBetween, isIOS } from '../util.js';
import { kv, creaturesDB } from '../store.js';
import { register, go, header, toast, cardButton, back } from '../ui.js';
import { play, stopAll, getCtx, unlockAudio, LIBRARY, libraryById } from '../audio.js';
import { mintFromSound } from '../creatures.js';
import { renderCard } from '../cards.js';
import { metrics } from '../metrics.js';

export const WINDOWS = {
  quick: { label: 'Quick', sub: '5–20 s', min: 5, max: 20 },
  classic: { label: 'Classic', sub: '10–60 s', min: 10, max: 60 },
  mystery: { label: 'Mystery', sub: 'up to 3 min', min: 5, max: 180 },
};

// ---- Screen Wake Lock manager: re-acquires on visibilitychange while wanted ----
const wake = {
  sentinel: null,
  wanted: false,
  supported: () => 'wakeLock' in navigator,
  async acquire() {
    this.wanted = true;
    if (!this.supported()) return false;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => { this.sentinel = null; });
      return true;
    } catch (e) { this.sentinel = null; return false; }
  },
  async release() {
    this.wanted = false;
    try { if (this.sentinel) await this.sentinel.release(); } catch (e) { /* ignore */ }
    this.sentinel = null;
  },
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wake.wanted && !wake.sentinel) wake.acquire();
});

const timerState = { config: { sound: 'surprise', window: 'quick', fakeout: false, aftershocks: false }, cancelledNotice: false };

register('timer', async (root, params) => {
  metrics.feature('timer');
  const cfg = timerState.config;
  if (params.sound) cfg.sound = params.sound;
  const wakeOK = wake.supported();
  if (!wakeOK) cfg.window = 'quick';
  const creatures = await creaturesDB.all();
  const tipsShown = (await kv.get('tipsShown')) || {};
  const blocks = [];
  if (timerState.cancelledNotice) {
    timerState.cancelledNotice = false;
    blocks.push(el('div', { class: 'tip warn', id: 'timer-cancelled' }, 'Timer cancelled — the toot stayed quiet. (Timers stop if you switch apps or the screen locks.)'));
  }
  if (!tipsShown.zones) {
    tipsShown.zones = true;
    await kv.set('tipsShown', tipsShown);
    blocks.push(el('div', { class: 'tip', id: 'zones-tip' }, el('b', {}, 'Toot-free zones: '), 'not in class, and not at the dinner table unless the whole family is in on it. Pranks are for laughing together!'));
  }
  if (!wakeOK) blocks.push(el('div', { class: 'tip' }, 'Keep the screen on and the phone face-up. (This browser cannot keep the screen awake, so only Quick timers are offered.)'));
  if (isIOS() && !navigator.audioSession) blocks.push(el('div', { class: 'tip' }, 'Check your ring switch and volume before you hide the phone.'));

  const soundOptions = [{ id: 'surprise', name: 'Surprise Me' }, ...LIBRARY.map((s) => ({ id: s.id, name: s.name })), ...creatures.map((c) => ({ id: 'cr:' + c.id, name: '★ ' + c.name }))];
  const select = el('select', { id: 'timer-sound', 'aria-label': 'Sound' }, soundOptions.map((o) => el('option', { value: o.id, selected: o.id === cfg.sound }, o.name)));
  select.addEventListener('change', () => { cfg.sound = select.value; });

  const winBtns = el('div', { class: 'seg' }, Object.entries(WINDOWS).map(([k, w]) => {
    const disabled = !wakeOK && k !== 'quick';
    const b = el('button', { class: 'seg-btn' + (cfg.window === k ? ' on' : ''), disabled, 'data-win': k, onclick: () => {
      cfg.window = k; winBtns.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b));
    } }, el('b', {}, w.label), el('span', {}, w.sub));
    return b;
  }));
  const toggle = (key, label, sub) => {
    const input = el('input', { type: 'checkbox', checked: cfg[key], id: 'tg-' + key });
    input.addEventListener('change', () => { cfg[key] = input.checked; });
    return el('label', { class: 'toggle' }, input, el('span', {}, el('b', {}, label), el('small', {}, sub)));
  };
  root.append(
    header('Toot Timer'),
    el('main', { class: 'pad' },
      ...blocks,
      el('h3', {}, '1. Pick a sound'), select,
      el('button', { class: 'btn small ghost', onclick: () => previewSound(cfg.sound, creatures) }, '▶ Preview'),
      el('h3', {}, '2. Pick a timer'), winBtns,
      el('p', { class: 'muted small' }, 'The toot happens at a secret random moment inside the window.'),
      el('h3', {}, '3. Surprises (optional)'),
      toggle('fakeout', 'Fake-out', 'Tiny squeak, a pause, then the big trumpet'),
      toggle('aftershocks', 'Aftershocks', '2–3 toots in a row, each sillier'),
      el('button', { class: 'btn primary huge', id: 'arm', onclick: () => arm(creatures) }, 'Arm & hide'),
      el('p', { class: 'muted small center' }, 'One arm = one prank (max 3 toots). Tap the tiny ✕ on the decoy to cancel.')));
});

function resolveSound(id, creatures) {
  if (id === 'surprise') {
    const pool = [...LIBRARY.map((s) => 'lib:' + s.id), ...creatures.map((c) => 'cr:' + c.id)];
    id = pool[Math.floor(Math.random() * pool.length)];
    if (id.startsWith('lib:')) id = id.slice(4);
  }
  if (id.startsWith('cr:')) {
    const c = creatures.find((x) => 'cr:' + x.id === id);
    return { ref: c.soundRef, key: null, name: c.name };
  }
  const s = libraryById(id);
  return { ref: { type: 'lib', id }, key: id, name: s.name };
}

async function previewSound(id, creatures) {
  await unlockAudio();
  play(resolveSound(id, creatures).ref);
}

let armed = null;

async function arm(creatures) {
  await unlockAudio();
  const cfg = timerState.config;
  const gotLock = await wake.acquire();
  let winKey = cfg.window;
  let lockTip = false;
  if (!gotLock && winKey !== 'quick') { winKey = 'quick'; lockTip = true; }
  if (!gotLock) lockTip = true;
  const w = WINDOWS[winKey];
  const delay = randBetween(w.min, w.max); // uniform, never shown
  const snd = resolveSound(cfg.sound, creatures);
  const ctx = getCtx();
  const t0 = ctx.currentTime + delay;
  const plan = [];
  let t = t0;
  if (cfg.fakeout) {
    plan.push({ ref: { type: 'lib', id: 'snd-tiny' }, at: t, rate: 1.1 });
    t += 0.5 + randBetween(4, 8);
  }
  plan.push({ ref: snd.ref, at: t, rate: 1 });
  if (cfg.aftershocks) {
    const extra = Math.min(3 - plan.length, 1 + Math.floor(Math.random() * 2));
    for (let i = 0; i < extra; i++) plan.push({ ref: snd.ref, after: randBetween(0.6, 2.5), rate: 1.15 + 0.2 * i });
  }
  const a = (armed = { plan, startedAt: performance.now(), secondsUntilMain: Math.round(t - ctx.currentTime), snd, done: false, timers: [], cancelled: false, winKey });
  metrics.count('timersArmed');
  metrics.count('timerWindow:' + winKey);
  if (cfg.fakeout) metrics.count('timerFakeout');
  if (cfg.aftershocks) metrics.count('timerAftershocks');
  go('decoy', { lockTip });
  // schedule with Web Audio start(when); aftershocks chain off the previous sound's end
  let endTime = 0;
  for (const step of plan) {
    if (a.cancelled) return;
    const at = step.at !== undefined ? step.at : endTime + step.after;
    const r = await play(step.ref, at, { rate: step.rate });
    if (a.cancelled) { stopAll(); return; }
    if (r) endTime = r.endTime;
  }
  const msToEnd = Math.max(0, (endTime - ctx.currentTime) * 1000) + 300;
  a.timers.push(setTimeout(() => finish(), msToEnd));
  if (snd.key) mintFromSound(snd.key, snd.ref, 'Toot Timer');
}

function finish() {
  if (!armed || armed.cancelled) return;
  armed.done = true;
  metrics.count('timersCompleted');
  document.body.classList.add('decoy-done');
  const hint = document.getElementById('decoy-hint');
  if (hint) hint.hidden = false;
}

function cancel(reason) {
  if (!armed) return;
  armed.cancelled = true;
  armed.timers.forEach(clearTimeout);
  stopAll();
  wake.release();
  metrics.count('timersCancelled:' + reason);
  armed = null;
}

const DECOYS = [
  () => {
    const q = el('div', { class: 'decoy-q' }, '7 × 8 = ?');
    const qs = ['7 × 8 = ?', 'Spell “necessary”', '12 ÷ 4 = ?', 'Name a vegetable that is green', 'What is half of 50?'];
    let i = 0;
    const iv = setInterval(() => { i = (i + 1) % qs.length; q.textContent = qs[i]; }, 6000);
    return { node: el('div', { class: 'decoy decoy-hw' }, el('h2', {}, 'Homework Helper 3000'), el('p', {}, 'Thinking very hard…'), q, el('div', { class: 'spinner' })), stop: () => clearInterval(iv) };
  },
  () => {
    const bar = el('b');
    const pct = el('span', {}, '0%');
    let p = 0;
    const iv = setInterval(() => { p = Math.min(99, p + Math.random() * 3); bar.style.width = p + '%'; pct.textContent = Math.floor(p) + '%'; }, 900);
    return { node: el('div', { class: 'decoy decoy-broc' }, el('h2', {}, 'Updating Broccoli…'), el('div', { class: 'loadbar' }, bar), pct, el('p', { class: 'small' }, 'Adding extra green. Please be patient.')), stop: () => clearInterval(iv) };
  },
  () => ({ node: el('div', { class: 'decoy decoy-sock' }, el('h2', {}, 'Sock Sorter Pro'), el('p', {}, 'Pairing socks: 3 found, 1 missing (as usual).'), el('div', { class: 'spinner' })), stop: () => {} }),
];

register('decoy', (root, { lockTip }) => {
  const d = DECOYS[Math.floor(Math.random() * DECOYS.length)]();
  const hint = el('div', { class: 'decoy-hint', id: 'decoy-hint', hidden: true }, 'tap to reveal');
  const cancelBtn = el('button', { class: 'decoy-cancel', id: 'decoy-cancel', 'aria-label': 'Cancel timer', onclick: (e) => {
    e.stopPropagation();
    cancel('tap');
    toast('Timer cancelled');
    back();
  } }, '✕');
  const wrap = el('div', { class: 'decoy-wrap', id: 'decoy', onclick: () => {
    if (armed && armed.done) {
      const info = { seconds: armed.secondsUntilMain, soundName: armed.snd.name };
      armed.timers.forEach(clearTimeout);
      wake.release();
      armed = null;
      go('reaction', info, { replace: true });
    }
  } }, d.node, hint, cancelBtn, lockTip ? el('div', { class: 'decoy-tip', id: 'lock-tip' }, 'Keep the screen on and the phone face-up') : null);
  root.append(wrap);
  if (lockTip) setTimeout(() => { const t = document.getElementById('lock-tip'); if (t) t.remove(); }, 3500);
  const onVis = () => {
    if (document.visibilityState === 'hidden' && armed) {
      cancel('hidden');
      timerState.cancelledNotice = true;
    } else if (document.visibilityState === 'visible' && timerState.cancelledNotice) {
      back();
    }
  };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    d.stop();
    document.body.classList.remove('decoy-done');
    document.removeEventListener('visibilitychange', onVis);
    if (armed && !armed.done) cancel('left');
  };
});

const REACTIONS = ['Giggles', 'Belly Laugh', 'Fell Off Chair', 'They Blamed the Dog'];
const ROLES = ['Grandpa', 'Grandma', 'Mum', 'Dad', 'Sister', 'Brother', 'Cousin', 'Auntie', 'Uncle', 'Friend'];

register('reaction', (root, info) => {
  let role = null;
  const roleChips = el('div', { class: 'chips' }, ROLES.map((r) => {
    const b = el('button', { class: 'chip', onclick: () => { role = role === r ? null : r; roleChips.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.textContent === role)); } }, r);
    return b;
  }));
  const choose = (reaction) => {
    metrics.count('reaction:' + reaction);
    metrics.feature('timerReport');
    go('report', { ...info, reaction, role }, { replace: true });
  };
  root.append(
    header('How’d it go?', { onBack: () => go('timer', {}, { replace: true }) }),
    el('main', { class: 'pad' },
      el('h3', {}, 'Who got tooted? (optional)'), roleChips,
      el('div', { class: 'reactions' }, REACTIONS.map((r, i) => el('button', { class: 'reaction r' + i, onclick: () => choose(r) }, r))),
      el('button', { class: 'btn ghost', id: 'reaction-skip', onclick: () => { metrics.count('reaction:skipped'); go('timer', {}, { replace: true }); } }, 'Skip (no card)')));
});

function resultLine(reaction, role) {
  const who = role || 'Everyone';
  switch (reaction) {
    case 'Giggles': return `${who} got the giggles.`;
    case 'Belly Laugh': return `${who} did a big belly laugh.`;
    case 'Fell Off Chair': return `${who} nearly fell off the chair laughing.`;
    default: return `${who} blamed the dog.`;
  }
}

register('report', (root, info) => {
  const line = `Toot Timer: ${info.seconds} seconds. Result: ${resultLine(info.reaction, info.role)}`;
  const makeBlob = () => renderCard({ kind: 'Toot Report', title: `${info.seconds} seconds of suspense`, subtitle: info.reaction, lines: [line, `Sound: ${info.soundName}`], accent: '#ff7043' });
  root.append(
    header('Toot Report', { onBack: () => go('home', {}, { reset: true }) }),
    el('main', { class: 'pad center' },
      el('div', { class: 'report-card' }, el('small', {}, 'TOOT REPORT'), el('h2', {}, `${info.seconds} seconds`), el('p', { id: 'report-line' }, line), el('p', { class: 'muted small' }, `Sound: ${info.soundName}`)),
      cardButton('Make a card', makeBlob, line, 'toot-report.png'),
      el('button', { class: 'btn primary big', onclick: () => go('timer', {}, { replace: true }) }, 'Prank again'),
      el('button', { class: 'btn ghost', onclick: () => go('home', {}, { reset: true }) }, 'Home')));
});
