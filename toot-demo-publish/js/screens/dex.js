// Toot-o-dex (spec 7): collection, completion %, rarity filter/sort, odds, creature detail, daily Puff Pack.
import { el, sleep } from '../util.js';
import { register, go, header, statBars, cardButton, confetti } from '../ui.js';
import { play, drumroll, blip, unlockAudio } from '../audio.js';
import { RARITIES, FAMILIES, CATALOG, creatureSVG, collectionStats, packsWaiting, openPack } from '../creatures.js';
import { creaturesDB } from '../store.js';
import { renderCard } from '../cards.js';
import { metrics } from '../metrics.js';

const dexState = { sort: 'rarity', filter: 'All' };
const rIndex = (r) => RARITIES.findIndex((x) => x.id === r);

export function oddsTable() {
  return el('details', { class: 'odds', id: 'odds' },
    el('summary', {}, 'Pack odds (free packs only, never sold)'),
    el('table', {}, el('tbody', {}, RARITIES.map((r) => el('tr', {}, el('td', {}, el('span', { class: `rarity r-${r.id}` }, r.id)), el('td', {}, r.odds + '%'))))));
}

register('dex', async (root) => {
  metrics.feature('dex');
  const { all, per, have, total } = await collectionStats();
  const waiting = await packsWaiting();
  const grid = el('div', { class: 'grid', id: 'dex-grid' });
  const draw = () => {
    let list = all.filter((c) => dexState.filter === 'All' || c.rarity === dexState.filter);
    list.sort(dexState.sort === 'rarity' ? (a, b) => rIndex(b.rarity) - rIndex(a.rarity) || a.name.localeCompare(b.name) : (a, b) => b.foundAt.localeCompare(a.foundAt));
    grid.replaceChildren(...list.map((c) => {
      const sp = CATALOG.find((s) => s.speciesId === c.id);
      return el('button', { class: 'cell', onclick: () => go('creature', { id: c.id }) },
        el('span', { html: creatureSVG(sp, 84) }), el('b', {}, c.name), el('span', { class: `rarity r-${c.rarity}` }, c.rarity), c.count > 1 ? el('i', { class: 'count' }, '×' + c.count) : null);
    }));
    if (!list.length) grid.append(el('p', { class: 'muted' }, 'No creatures here yet.'));
  };
  const sortSel = el('select', { 'aria-label': 'Sort' }, el('option', { value: 'rarity', selected: dexState.sort === 'rarity' }, 'Sort: rarity'), el('option', { value: 'date', selected: dexState.sort === 'date' }, 'Sort: date found'));
  sortSel.addEventListener('change', () => { dexState.sort = sortSel.value; draw(); });
  const filterSel = el('select', { 'aria-label': 'Filter' }, ['All', ...RARITIES.map((r) => r.id)].map((r) => el('option', { value: r, selected: dexState.filter === r }, r === 'All' ? 'All rarities' : r)));
  filterSel.addEventListener('change', () => { dexState.filter = filterSel.value; draw(); });
  draw();
  const pct = (a, b) => Math.round((a / b) * 100);
  root.append(
    header('Toot-o-dex'),
    el('main', { class: 'pad' },
      el('div', { class: 'progress-card' },
        el('h2', { id: 'dex-total' }, `${have} / ${total} found (${pct(have, total)}%)`),
        FAMILIES.map((f) => el('div', { class: 'fam' }, el('span', {}, f), el('span', { class: 'stat-bar' }, el('b', { style: { width: pct(per[f].have, per[f].total) + '%' } })), el('small', {}, `${per[f].have}/${per[f].total}`)))),
      waiting > 0 ? el('button', { class: 'pack-waiting wobble', onclick: () => go('pack') }, el('b', {}, 'Open your free Puff Pack'), el('span', {}, `${waiting} waiting`)) : null,
      el('div', { class: 'row' }, sortSel, filterSel),
      grid,
      oddsTable(),
      el('p', { class: 'muted small' }, 'Duplicates are kept and counted. A grown-up can back up your collection in the Parent area.')));
});

register('creature', async (root, { id }) => {
  const c = await creaturesDB.get(id);
  const sp = CATALOG.find((s) => s.speciesId === id);
  const makeBlob = () => renderCard({ kind: 'Creature card', title: c.name, subtitle: `${c.rarity} · ${c.family}`, lines: [c.bio, `Wobble ${c.stats.Wobble} · Squeak ${c.stats.Squeak} · Boom ${c.stats.Boom} · Sneakiness ${c.stats.Sneakiness}`], species: sp, accent: RARITIES.find((r) => r.id === c.rarity).color });
  root.append(
    header(c.name),
    el('main', { class: 'pad center' },
      el('div', { class: 'creature-big', html: creatureSVG(sp, 200) }),
      el('h2', {}, c.name),
      el('span', { class: `rarity r-${c.rarity}` }, c.rarity), el('span', { class: 'muted' }, `  ${c.family} family · found ×${c.count}`),
      el('p', { class: 'bio' }, c.bio),
      statBars(c.stats),
      el('button', { class: 'btn primary big', id: 'creature-play', onclick: async () => { await unlockAudio(); play(c.soundRef); metrics.count('creaturePlayed'); } }, '▶ Play'),
      el('div', { class: 'row' },
        el('button', { class: 'btn', onclick: () => go('timer', { sound: 'cr:' + c.id }) }, 'Use in Timer'),
        el('button', { class: 'btn', onclick: () => go('lab', { creatureId: c.id }) }, 'Send to Lab')),
      cardButton('Creature card', makeBlob, `Look who I found: ${c.name}!`, 'creature-card.png')));
});

register('pack', async (root) => {
  metrics.feature('pack');
  const waiting = await packsWaiting();
  const stage = el('div', { class: 'pack-stage' });
  const main = el('main', { class: 'pad center' }, stage, oddsTable());
  root.append(header('Puff Pack'), main);
  if (waiting <= 0) {
    stage.append(el('p', {}, 'No pack to open right now.'), el('p', { class: 'muted' }, 'A free Puff Pack arrives each day, and up to 3 wait for you, so there is never a rush.'), el('button', { class: 'btn primary big', onclick: () => go('dex', {}, { replace: true }) }, 'See my Toot-o-dex'));
    return;
  }
  const packBtn = el('button', { class: 'pack wobble', id: 'open-pack', 'aria-label': 'Open pack' }, el('b', {}, 'PUFF'), el('b', {}, 'PACK'), el('small', {}, 'Tap to open'));
  stage.append(el('p', { class: 'muted' }, waiting > 1 ? `${waiting} free packs waiting` : '1 free pack waiting'), packBtn);
  packBtn.addEventListener('click', async () => {
    packBtn.disabled = true;
    await unlockAudio();
    const res = await openPack();
    metrics.count('packsOpened');
    stage.replaceChildren(el('h2', {}, 'Drumroll…'));
    const reveals = el('div', { class: 'reveals', id: 'reveals' });
    stage.append(reveals);
    for (const { creature: c, isNew } of res) {
      const slow = 600 + rIndex(c.rarity) * 450; // slowest for the rarest
      drumroll(slow);
      await sleep(slow);
      const sp = CATALOG.find((s) => s.speciesId === c.id);
      blip(500 + rIndex(c.rarity) * 120, 0.15);
      play({ type: 'seed', seed: c.seed });
      if (rIndex(c.rarity) >= 3) confetti(60);
      reveals.append(el('div', { class: 'reveal-card pop' },
        el('span', { html: creatureSVG(sp, 90) }),
        el('div', {}, el('b', {}, c.name), el('br'), el('span', { class: `rarity r-${c.rarity}` }, c.rarity), isNew ? el('span', { class: 'new' }, ' NEW!') : el('span', { class: 'muted small' }, ` ×${c.count}`),
          el('div', { class: 'row' },
            el('button', { class: 'btn small', onclick: () => go('timer', { sound: 'cr:' + c.id }) }, 'Use in Timer'),
            el('button', { class: 'btn small', onclick: () => go('lab', { creatureId: c.id }) }, 'Send to Lab')))));
    }
    stage.querySelector('h2').textContent = 'Ta-da!';
    stage.append(el('button', { class: 'btn primary big', id: 'pack-done', onclick: () => go('dex', {}, { replace: true }) }, 'See my Toot-o-dex'));
  });
});
