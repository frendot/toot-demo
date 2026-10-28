// Router + shared UI pieces (toast, confetti, parent gate screen, share flow, settings).
import { el, downloadBlob } from './util.js';
import { kv } from './store.js';
import { makeChallenge } from './gate.js';
import { metrics } from './metrics.js';
import { unlockAudio, setVolumeCap } from './audio.js';

const screens = {};
const stack = [];
let cleanup = null;
let root = null;

export const settings = { volumeCap: 1, micEnabled: true, sharingEnabled: true };

export async function loadSettings() {
  Object.assign(settings, (await kv.get('settings')) || {});
  setVolumeCap(settings.volumeCap);
}
export async function saveSettings() {
  await kv.set('settings', { ...settings });
  setVolumeCap(settings.volumeCap);
}

export function register(name, fn) { screens[name] = fn; }

export function initRouter(rootEl) {
  root = rootEl;
  window.addEventListener('popstate', () => {
    if (stack.length > 1) { stack.pop(); render(); } else history.pushState({}, '');
  });
}

export function go(name, params = {}, opts = {}) {
  if (opts.replace && stack.length) stack[stack.length - 1] = { name, params };
  else if (opts.reset) { stack.length = 0; stack.push({ name, params }); }
  else { stack.push({ name, params }); history.pushState({ n: stack.length }, ''); }
  render();
}

export function back() {
  if (stack.length > 1) { history.back(); } else go('home', {}, { reset: true });
}

export function current() { return stack[stack.length - 1]; }

function render() {
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  const top = stack[stack.length - 1];
  root.replaceChildren();
  document.querySelectorAll('.confetti').forEach((n) => n.remove()); // never carry party bits onto a decoy screen
  root.scrollTop = 0;
  window.scrollTo(0, 0);
  document.body.dataset.screen = top.name;
  const fn = screens[top.name];
  const res = fn(root, top.params || {});
  if (typeof res === 'function') cleanup = res;
  else if (res && typeof res.then === 'function') res.then((r) => { if (typeof r === 'function') cleanup = r; });
}

// ---- small widgets ----
export function header(title, { onBack = back, right = null } = {}) {
  return el('header', { class: 'bar' },
    el('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: onBack }, '‹'),
    el('h1', {}, title),
    right || el('span', { class: 'spacer' }));
}

export function toast(msg, ms = 2400) {
  const t = el('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function confetti(n = 40) {
  const layer = el('div', { class: 'confetti', 'aria-hidden': 'true' });
  const colors = ['#ff7043', '#7e57c2', '#29b6f6', '#8bc34a', '#ffb300', '#ec407a'];
  for (let i = 0; i < n; i++) {
    const p = el('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.3 + 's';
    p.style.animationDuration = 1 + Math.random() * 1.2 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 2600);
}

export function statBars(stats) {
  return el('div', { class: 'stats' }, Object.entries(stats).map(([k, v]) =>
    el('div', { class: 'stat' }, el('span', { class: 'stat-k' }, k), el('span', { class: 'stat-bar' }, el('b', { style: { width: v + '%' } })), el('span', { class: 'stat-v' }, String(v)))));
}

// ---- Parent gate: asked every time, wrong answer returns calmly ----
register('gate', (root, { next, nextParams, reason }) => {
  const ch = makeChallenge();
  const input = el('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'gate-input', 'aria-label': 'Answer', id: 'gate-answer' });
  const submit = () => {
    const ok = input.value.trim() === ch.answer;
    input.value = '';
    if (ok) { metrics.count('parentGatePassed'); go(next, nextParams || {}, { replace: true }); }
    else { metrics.count('parentGateFailed'); toast('That one is a grown-up puzzle. Back we go!'); back(); }
  };
  root.append(
    header('For grown-ups'),
    el('main', { class: 'pad center' },
      el('div', { class: 'gate-card' },
        el('p', { class: 'muted' }, reason || 'This part is for grown-ups.'),
        el('h2', { id: 'gate-prompt' }, ch.prompt),
        input,
        el('button', { class: 'btn primary big', id: 'gate-submit', onclick: submit }, 'Continue'),
        el('button', { class: 'btn ghost', onclick: back }, 'Go back'))));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  setTimeout(() => input.focus(), 50);
});

export function withGate(next, nextParams, reason) {
  go('gate', { next, nextParams, reason });
}

// ---- Share flow: parent gate -> Web Share (files) or Save image ----
register('share', async (root, { blob, text, filename, label }) => {
  const url = URL.createObjectURL(blob);
  const file = new File([blob], filename, { type: 'image/png' });
  const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  const shareBtn = canShareFiles && settings.sharingEnabled
    ? el('button', { class: 'btn primary big', onclick: async () => {
        try { await navigator.share({ files: [file], text }); metrics.count('cardsShared'); toast('Shared!'); }
        catch (e) { /* cancelled */ }
      } }, 'Share to family chat')
    : null;
  root.append(
    header(label || 'Share card'),
    el('main', { class: 'pad center' },
      el('img', { class: 'card-preview', src: url, alt: 'Card preview' }),
      settings.sharingEnabled ? null : el('p', { class: 'tip' }, 'Sharing is switched off in the Parent area. You can still save the image.'),
      shareBtn,
      el('button', { class: 'btn big', onclick: () => { downloadBlob(blob, filename); metrics.count('cardsSaved'); toast('Image saved'); } }, 'Save image'),
      el('p', { class: 'muted small' }, 'Cards never include faces, voices, names or locations.')));
  return () => URL.revokeObjectURL(url);
});

// Card button for kids: opens a preview, sharing/saving is behind the gate.
export function cardButton(label, makeBlob, text, filename) {
  return el('button', { class: 'btn', onclick: async () => {
    const blob = await makeBlob();
    metrics.count('cardsMade');
    go('cardPreview', { blob, text, filename, label });
  } }, label);
}

register('cardPreview', (root, p) => {
  const url = URL.createObjectURL(p.blob);
  root.append(
    header(p.label),
    el('main', { class: 'pad center' },
      el('img', { class: 'card-preview', src: url, alt: p.label }),
      el('button', { class: 'btn primary big', onclick: () => withGate('share', p, 'Sharing and saving cards is for grown-ups.') }, 'Share or save (grown-ups)'),
      el('button', { class: 'btn ghost', onclick: back }, 'Back')));
  return () => URL.revokeObjectURL(url);
});

// Unlock audio on the very first gesture anywhere (iOS/Chrome autoplay rules).
export function installAudioUnlock() {
  const h = () => { unlockAudio(); };
  window.addEventListener('pointerdown', h, { capture: true });
  window.addEventListener('keydown', h, { capture: true });
}
