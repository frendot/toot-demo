// Home: instant laugh button + launcher; Puff Pack when waiting; optional install banner and feedback prompt.
import { el, isStandalone } from '../util.js';
import { kv } from '../store.js';
import { register, go, confetti, withGate, toast } from '../ui.js';
import { play, LIBRARY } from '../audio.js';
import { packsWaiting } from '../creatures.js';
import { metrics } from '../metrics.js';
import { cloudSVG } from './art.js';

const WEEK = 7 * 86400000;
let feedbackShownThisSession = false;

register('home', async (root) => {
  metrics.feature('home');
  const waiting = await packsWaiting();
  const big = el('button', { class: 'toot-btn', id: 'big-toot', 'aria-label': 'Toot!', onclick: () => {
    const s = LIBRARY[Math.floor(Math.random() * LIBRARY.length)];
    play({ type: 'lib', id: s.id });
    metrics.count('bigButtonToots');
    big.classList.remove('boing'); void big.offsetWidth; big.classList.add('boing');
    confetti(18);
  } }, el('span', { html: cloudSVG(120) }), el('b', {}, 'TOOT!'));

  const tile = (id, title, sub, color, onclick) =>
    el('button', { class: 'tile', id, style: { '--c': color }, onclick }, el('b', {}, title), el('span', {}, sub));

  const banners = [];
  if (!isStandalone()) {
    const last = (await kv.get('installBannerAt')) || 0;
    if (Date.now() - last > WEEK && (await kv.get('onboarded'))) {
      await kv.set('installBannerAt', Date.now());
      const b = el('div', { class: 'banner' },
        el('span', {}, 'Tip: install Toot on your Home Screen to keep your collection safer.'),
        el('button', { class: 'btn small', onclick: () => go('install') }, 'How?'),
        el('button', { class: 'icon-btn', 'aria-label': 'Dismiss', onclick: () => b.remove() }, '×'));
      banners.push(b);
    }
  }
  const fb = await maybeFeedbackCard();
  if (fb) banners.push(fb);

  root.append(el('main', { class: 'home' },
    el('div', { class: 'home-top' }, el('h1', { class: 'logo small' }, 'Toot!'),
      el('button', { class: 'btn ghost small', id: 'grownups', onclick: () => withGate('parent', {}, 'The Parent area has settings, backups and usage info.') }, 'Grown-ups')),
    ...banners,
    big,
    waiting > 0 ? el('button', { class: 'pack-waiting wobble', id: 'pack-waiting', onclick: () => go('pack') },
      el('b', {}, waiting === 1 ? 'A free Puff Pack is waiting!' : `${waiting} free Puff Packs are waiting!`), el('span', {}, 'Tap to open')) : null,
    el('div', { class: 'tiles' },
      tile('go-timer', 'Toot Timer', 'Prank someone', '#ff7043', () => go('timer')),
      tile('go-lab', 'Sound Lab', 'Get judged', '#7e57c2', () => go('lab')),
      tile('go-battle', 'Toot Battles', 'Family game night', '#29b6f6', () => go('battleSetup')),
      tile('go-dex', 'Toot-o-dex', 'Your creatures', '#8bc34a', () => go('dex'))),
    el('p', { class: 'muted small center' }, 'Free demo. No ads, no accounts, nothing uploaded.'),
    el('p', { class: 'center' }, el('button', { class: 'linkish', id: 'go-credits', onclick: () => go('credits') }, 'Credits & licences'))));
});

// ---- Optional feedback prompt (after a few sessions, skippable, stored on device) ----
async function maybeFeedbackCard() {
  if (feedbackShownThisSession) return null;
  const st = (await kv.get('feedbackPrompt')) || { never: false, nextAtSession: 3 };
  const sessions = metrics.sessionCount();
  if (st.never || sessions < st.nextAtSession) return null;
  feedbackShownThisSession = true;
  metrics.count('feedbackPromptShown');
  const card = el('div', { class: 'banner feedback', id: 'feedback-banner' },
    el('span', {}, 'Got 20 seconds? Tell us how Toot is going (optional, stays on this phone).'),
    el('button', { class: 'btn small primary', onclick: () => go('feedback') }, 'Sure'),
    el('button', { class: 'btn small ghost', onclick: async () => { st.nextAtSession = sessions + 3; await kv.set('feedbackPrompt', st); card.remove(); metrics.count('feedbackNotNow'); } }, 'Not now'),
    el('button', { class: 'btn small ghost', onclick: async () => { st.never = true; await kv.set('feedbackPrompt', st); card.remove(); metrics.count('feedbackNever'); } }, 'No thanks'));
  return card;
}

register('feedback', (root) => {
  const answers = { rating: null, favourite: null, who: null };
  const chips = (key, options) => el('div', { class: 'chips' }, options.map((o) => {
    const b = el('button', { class: 'chip', onclick: () => {
      answers[key] = o;
      b.parentElement.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
    } }, String(o));
    return b;
  }));
  const note = el('textarea', { rows: '3', maxlength: '300', placeholder: 'Grown-ups: anything to tell the makers? (optional)', id: 'fb-note' });
  root.append(
    el('header', { class: 'bar' }, el('span', { class: 'spacer' }), el('h1', {}, 'Quick feedback'), el('span', { class: 'spacer' })),
    el('main', { class: 'pad' },
      el('p', { class: 'muted' }, 'Totally optional. Answers stay on this phone; a grown-up can export them from the Parent area.'),
      el('h3', {}, 'How much did you laugh? (1 = a little, 5 = fell off the chair)'), chips('rating', [1, 2, 3, 4, 5]),
      el('h3', {}, 'Favourite part?'), chips('favourite', ['Toot Timer', 'Sound Lab', 'Toot-o-dex', 'Puff Packs', 'Toot Battles']),
      el('h3', {}, 'Who played?'), chips('who', ['Just me', 'Kids together', 'Kids and grown-ups']),
      note,
      el('button', { class: 'btn primary big', id: 'fb-save', onclick: async () => {
        const list = (await kv.get('feedback')) || [];
        list.push({ day: new Date().toISOString().slice(0, 10), ...answers, note: note.value.trim() || null });
        await kv.set('feedback', list);
        const st = (await kv.get('feedbackPrompt')) || {};
        st.never = true; // asked once is enough; parents can add more from the Parent area
        await kv.set('feedbackPrompt', st);
        metrics.count('feedbackGiven');
        toast('Thank you! Professor Toot is delighted.');
        go('home', {}, { reset: true });
      } }, 'Save'),
      el('button', { class: 'btn ghost', onclick: () => { metrics.count('feedbackSkipped'); go('home', {}, { reset: true }); } }, 'Skip')));
});
