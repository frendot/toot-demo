// Credits & licences: every shipped sample, its author, source page and licence (from sounds/LICENSES.md).
// Source pages are shown as plain text (not links) so children can't leave the app from here.
import { el } from '../util.js';
import { register, header } from '../ui.js';
import { SAMPLES, GROUPS } from '../samples.js';
import { play, unlockAudio } from '../audio.js';

register('credits', (root) => {
  root.append(header('Credits & licences'), el('main', { class: 'pad prose credits' },
    el('p', {}, `Toot! plays ${SAMPLES.length} real sound recordings. Every one is dedicated to the public domain under `, el('b', {}, 'CC0 1.0'),
      ' (creativecommons.org/publicdomain/zero/1.0), so no attribution is required, but we say thank you anyway.'),
    el('p', { class: 'muted small' }, 'We trimmed silence, evened out the loudness and converted them to AAC for phones. Each sound was originally shared on Freesound (freesound.org). Most of our copies come from the FSD50K research dataset (Fonseca et al., Zenodo 10.5281/zenodo.4060432), which keeps each clip\'s licence. Two (wet-01, whoopee-01) come from a CC0 mirror that links back to the original Freesound page.'),
    el('p', { class: 'muted small' }, 'Synth sounds (button blips, drumrolls, the trophy fanfare, and the backup voices used if a recording ever fails to load) are generated live inside the app by code. They are not recordings.'),
    GROUPS.map((g) => {
      const list = SAMPLES.filter((s) => s.group === g.id);
      if (!list.length) return null;
      return el('section', { class: 'credit-group' },
        el('h3', {}, g.name),
        list.map((s) => el('div', { class: 'credit-row', 'data-sample': s.id },
          el('button', { class: 'btn small', 'aria-label': 'Play ' + s.id, onclick: async () => { await unlockAudio(); play({ type: 'smp', id: s.id }); } }, '▶'),
          el('div', {},
            el('b', {}, s.id), el('span', { class: 'muted' }, ` · ${s.dur.toFixed(1)} s`), el('br'),
            el('span', {}, `by ${s.author}`), el('br'),
            el('span', { class: 'muted small' }, `${s.url.replace('https://', '')} · ${s.licence}${s.via !== 'FSD50K' ? ' · via CC0 mirror' : ''}`)))));
    }),
    el('p', { class: 'muted small' }, 'App code, judge lines, creatures and art: made for this demo.')));
});
