// Flow A: Press me -> first toot -> neutral age screen -> first creature -> install nudge -> home.
import { el, isIOS, isStandalone } from '../util.js';
import { kv } from '../store.js';
import { register, go, header, confetti, toast } from '../ui.js';
import { unlockAudio, play } from '../audio.js';
import { mintFromSound, CATALOG, creatureSVG } from '../creatures.js';
import { metrics } from '../metrics.js';
import { cloudSVG } from './art.js';

register('splash', (root) => {
  const btn = el('button', { class: 'press-me', id: 'press-me', onclick: async () => {
    await unlockAudio();
    play({ type: 'lib', id: 'lib-whoopee' });
    confetti(50);
    btn.classList.add('boing');
    metrics.feature('firstToot');
    setTimeout(() => go('age', {}, { replace: true }), 1300);
  } }, 'Press me');
  root.append(el('main', { class: 'splash' },
    el('div', { class: 'wink', html: cloudSVG(180, true) }),
    el('h1', { class: 'logo' }, 'Toot!'),
    el('p', { class: 'muted' }, 'The family prank & collect game'),
    btn,
    el('p', { class: 'muted small' }, 'Free demo · no sign-up · everything stays on this phone')));
});

// Neutral age screen: no default, no hints, same layout for every answer.
register('age', (root, { changing }) => {
  const year = new Date().getFullYear();
  const ageIn = el('input', { type: 'number', inputmode: 'numeric', min: '1', max: '120', placeholder: 'Age', id: 'age-input', 'aria-label': 'Your age' });
  const yearIn = el('input', { type: 'number', inputmode: 'numeric', min: '1900', max: String(year), placeholder: 'Birth year', id: 'year-input', 'aria-label': 'Your birth year' });
  const done = el('button', { class: 'btn primary big', id: 'age-done', disabled: true }, 'Done');
  const valid = () => {
    const a = parseInt(ageIn.value, 10), y = parseInt(yearIn.value, 10);
    if (ageIn.value && a >= 1 && a <= 120) return a;
    if (yearIn.value && y >= 1900 && y <= year) return year - y;
    return null;
  };
  const upd = () => { done.disabled = valid() === null; };
  ageIn.addEventListener('input', () => { if (ageIn.value) yearIn.value = ''; upd(); });
  yearIn.addEventListener('input', () => { if (yearIn.value) ageIn.value = ''; upd(); });
  done.addEventListener('click', async () => {
    const age = valid();
    if (age === null) return;
    // Only an age band is kept, on this device.
    await kv.set('ageBand', age < 13 ? 'under13' : '13plus');
    ageIn.value = ''; yearIn.value = '';
    if (changing) { toast('Saved'); go('parent', {}, { replace: true }); return; }
    go('firstCreature', {}, { replace: true });
  });
  root.append(
    changing ? header('Age') : el('div', { class: 'top-gap' }),
    el('main', { class: 'pad center' },
      el('div', { class: 'age-card' },
        el('h2', {}, 'How old are you?'),
        el('label', { class: 'field' }, 'Type your age', ageIn),
        el('div', { class: 'or' }, 'or'),
        el('label', { class: 'field' }, 'Type the year you were born', yearIn),
        done)));
});

register('firstCreature', async (root) => {
  const res = await mintFromSound('lib-whoopee', { type: 'lib', id: 'lib-whoopee' }, 'First toot');
  const c = res.creature || CATALOG[0];
  const sp = CATALOG.find((s) => s.speciesId === c.id);
  play({ type: 'lib', id: 'lib-whoopee' }, 0, { rate: 1.15 });
  confetti(30);
  root.append(el('main', { class: 'pad center reveal' },
    el('p', { class: 'muted' }, 'Your toot became a creature!'),
    el('div', { class: 'creature-big pop', html: creatureSVG(sp, 220) }),
    el('h2', {}, `You found ${c.name}!`),
    el('span', { class: `rarity r-${c.rarity}` }, c.rarity),
    el('p', {}, 'It lives in your Toot-o-dex now. 1 found, lots more to discover.'),
    el('button', { class: 'btn primary big', id: 'first-next', onclick: async () => {
      await kv.set('onboarded', true);
      if (isStandalone()) go('home', {}, { reset: true });
      else go('install', { fromOnboarding: true }, { replace: true });
    } }, 'Next')));
});

export let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

register('install', (root, { fromOnboarding }) => {
  const finish = () => (fromOnboarding ? go('home', {}, { reset: true }) : history.back());
  let body;
  if (deferredInstall) {
    body = el('div', {},
      el('p', {}, 'Install Toot so it opens like an app and your collection is kept safer.'),
      el('button', { class: 'btn primary big', onclick: async () => {
        deferredInstall.prompt();
        const r = await deferredInstall.userChoice.catch(() => null);
        metrics.count('installPrompt:' + (r ? r.outcome : 'unknown'));
        deferredInstall = null;
        finish();
      } }, 'Install Toot'));
  } else if (isIOS()) {
    body = el('div', {},
      el('p', {}, 'Put Toot on your Home Screen so it opens like an app and keeps your collection safer:'),
      el('ol', { class: 'steps' },
        el('li', {}, 'Tap the Share button (the square with an arrow) in Safari.'),
        el('li', {}, 'Scroll down and tap “Add to Home Screen”.'),
        el('li', {}, 'Tap “Add”. Then open Toot from your Home Screen.')),
      el('p', { class: 'muted small' }, 'Tip: a Home Screen app has its own storage, so install before you collect lots of creatures.'));
  } else {
    body = el('div', {},
      el('p', {}, 'Put Toot on your Home Screen so it opens like an app:'),
      el('ol', { class: 'steps' },
        el('li', {}, 'Open your browser menu (⋮).'),
        el('li', {}, 'Tap “Install app” or “Add to Home screen”.')));
  }
  root.append(
    fromOnboarding ? el('div', { class: 'top-gap' }) : header('Install Toot'),
    el('main', { class: 'pad' },
      el('div', { class: 'center', html: cloudSVG(110) }),
      el('h2', { class: 'center' }, 'Keep Toot on your phone'),
      body,
      el('button', { class: 'btn ghost big', id: 'install-skip', onclick: () => { metrics.count('installSkipped'); finish(); } }, fromOnboarding ? 'Skip for now' : 'Close')));
});
