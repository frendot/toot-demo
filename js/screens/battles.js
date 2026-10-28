// Toot Battles, pass-and-play only (spec 8 / Flow E). 2–6 players on one phone, no network.
// Nicknames live in memory for this battle only and are never stored.
import { el, sleep } from '../util.js';
import { creaturesDB } from '../store.js';
import { register, go, header, toast, confetti, cardButton } from '../ui.js';
import { play, LIBRARY, unlockAudio, drumroll, resolveRef, groupOfRef } from '../audio.js';
import { analyse } from '../analysis.js';
import { chooseLine, chooseGroupLine } from '../judges.js';
import { PROMPTS } from '../prompts.js';
import { renderCard } from '../cards.js';
import { metrics } from '../metrics.js';
import { micAvailable, attachHoldToRecord, samplesFor } from './lab.js';
import { judgeSVG, trophySVG } from './art.js';

export { PROMPTS };
const VOTES = [{ e: '😂', label: 'Funniest' }, { e: '👏', label: 'Bravo' }, { e: '🎺', label: 'Most musical' }];

let battle = null;

function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

register('battleSetup', (root) => {
  metrics.feature('battles');
  let count = battle ? battle.players.length : 2;
  let rounds = 3;
  const names = battle ? battle.players.map((p) => p.name) : [];
  const list = el('div', { class: 'players', id: 'players' });
  const drawPlayers = () => {
    const vals = [...list.querySelectorAll('input')].map((i) => i.value);
    vals.forEach((v, i) => (names[i] = v));
    list.replaceChildren(...Array.from({ length: count }, (_, i) => el('input', { type: 'text', maxlength: '14', placeholder: `Player ${i + 1}`, value: names[i] || '', 'aria-label': `Player ${i + 1} nickname`, class: 'player-name' })));
  };
  drawPlayers();
  const countLbl = el('b', { id: 'player-count' }, String(count));
  const roundSeg = el('div', { class: 'seg' }, [3, 5].map((r) => {
    const b = el('button', { class: 'seg-btn' + (r === rounds ? ' on' : ''), 'data-rounds': r, onclick: () => { rounds = r; roundSeg.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b)); } }, el('b', {}, `${r} rounds`));
    return b;
  }));
  root.append(
    header('Toot Battles'),
    el('main', { class: 'pad' },
      el('p', {}, 'Family game night on one phone! Each round has a silly challenge. Everyone takes a turn, Professor Toot scores it, then the family votes.'),
      el('h3', {}, 'Players (nicknames, not saved)'),
      el('div', { class: 'row stepper' },
        el('button', { class: 'btn small', id: 'player-minus', onclick: () => { if (count > 2) { count--; countLbl.textContent = count; drawPlayers(); } } }, '−'),
        countLbl,
        el('button', { class: 'btn small', id: 'player-plus', onclick: () => { if (count < 6) { count++; countLbl.textContent = count; drawPlayers(); } } }, '+')),
      list,
      el('h3', {}, 'Rounds'), roundSeg,
      el('button', { class: 'btn primary huge', id: 'battle-start', onclick: () => {
        const players = [...list.querySelectorAll('input')].map((inp, i) => ({ name: inp.value.trim() || `Player ${i + 1}`, total: 0 }));
        battle = { players, rounds, round: 0, prompts: shuffle(PROMPTS).slice(0, rounds), entries: [], turn: 0, recent: [], history: [] };
        metrics.count('battlesStarted');
        metrics.count('battlePlayers:' + players.length);
        go('battlePass', {}, { replace: true });
      } }, 'Start the battle!')));
});

register('battlePass', (root) => {
  const p = battle.players[battle.turn];
  root.append(el('main', { class: 'pad center pass' },
    el('p', { class: 'muted' }, `Round ${battle.round + 1} of ${battle.rounds}`),
    el('h2', { class: 'prompt' }, `“${battle.prompts[battle.round]}”`),
    el('div', { class: 'pass-phone' }, 'Pass the phone to'),
    el('h1', { class: 'player-big', id: 'pass-name' }, p.name),
    el('button', { class: 'btn primary huge', id: 'pass-ready', onclick: () => go('battleTurn', {}, { replace: true }) }, `I’m ${p.name}, let’s go!`),
    el('button', { class: 'btn ghost small', onclick: () => { if (confirm('End this battle?')) { battle = null; go('home', {}, { reset: true }); } } }, 'End battle')));
});

register('battleTurn', async (root) => {
  const p = battle.players[battle.turn];
  const canMic = await micAvailable();
  const creatures = await creaturesDB.all();
  let detach = null;
  const submit = async (src) => {
    await unlockAudio();
    if (src.ref && !src.samples) src = { ...src, ref: resolveRef(src.ref), group: groupOfRef(src.ref) }; // the sample heard = the sample judged
    const data = src.samples ? src : await samplesFor(src.ref);
    const a = analyse(data.samples, data.sampleRate);
    go('battleJudged', { src: { ...src, samples: data.samples, sampleRate: data.sampleRate }, analysis: a }, { replace: true });
  };
  let recArea = null;
  if (canMic) {
    const btn = el('button', { class: 'record-btn', id: 'battle-record' }, el('b', {}, 'HOLD'), el('span', {}, 'to record'));
    detach = attachHoldToRecord(btn, {
      onNeedExplainer: () => go('micExplainer'),
      onResult: (res) => submit({ kind: 'rec', name: 'their own toot', samples: res.samples, sampleRate: res.sampleRate }),
    });
    recArea = el('div', { class: 'record-area' }, btn);
  }
  const libs = shuffle(LIBRARY).slice(0, 5);
  root.append(el('main', { class: 'pad center' },
    el('p', { class: 'muted' }, `${p.name}, your challenge:`),
    el('h2', { class: 'prompt' }, `“${battle.prompts[battle.round]}”`),
    recArea,
    el('h3', {}, canMic ? 'or pick a sound' : 'Pick a sound'),
    el('div', { class: 'sound-list' },
      libs.map((s) => el('button', { class: 'sound-row battle-pick', onclick: () => submit({ kind: 'lib', name: s.name, ref: { type: 'lib', id: s.id } }) }, el('span', {}, s.name), el('b', {}, 'Pick ›'))),
      creatures.slice(0, 4).map((c) => el('button', { class: 'sound-row battle-pick', onclick: () => submit({ kind: 'creature', name: c.name, ref: c.soundRef }) }, el('span', {}, '★ ' + c.name), el('b', {}, 'Pick ›'))))));
  return () => detach && detach();
});

register('battleJudged', async (root, { src, analysis: a }) => {
  const p = battle.players[battle.turn];
  root.append(el('main', { class: 'pad center' }, el('div', { html: judgeSVG('prof', 110) }), el('h2', {}, 'Professor Toot is listening…')));
  play(src.ref || { type: 'pcm', samples: src.samples, sampleRate: src.sampleRate });
  drumroll(900);
  await sleep(1500);
  const pick = chooseLine('prof', a.score, a.seed, battle.recent);
  battle.recent.push(pick.lineId);
  battle.entries.push({ player: battle.turn, src, score: a.score, line: pick.line, votes: 0 });
  root.replaceChildren(el('main', { class: 'pad center' },
    el('div', { html: judgeSVG('prof', 90) }),
    el('h3', {}, `${p.name} played ${src.name}`),
    el('blockquote', {}, `“${pick.line}”`),
    src.group && chooseGroupLine('prof', src.group, a.seed) ? el('p', { class: 'group-line' }, `“${chooseGroupLine('prof', src.group, a.seed)}”`) : null,
    el('div', { class: 'score', id: 'battle-score' }, String(a.score), el('small', {}, '/100')),
    el('button', { class: 'btn primary huge', id: 'battle-next', onclick: () => {
      battle.turn++;
      if (battle.turn < battle.players.length) go('battlePass', {}, { replace: true });
      else go('battleVote', {}, { replace: true });
    } }, battle.turn + 1 < battle.players.length ? `Pass to ${battle.players[battle.turn + 1].name}` : 'Family vote!')));
  if (a.score >= 75) confetti(25);
});

register('battleVote', (root) => {
  const rows = battle.entries.map((en, idx) => {
    const cnt = el('b', { class: 'vote-count' }, '0');
    return el('div', { class: 'vote-row' },
      el('div', {}, el('b', {}, battle.players[en.player].name), el('span', { class: 'muted small' }, ` · Prof: ${en.score}`)),
      el('button', { class: 'btn small', onclick: () => play(en.src.ref || { type: 'pcm', samples: en.src.samples, sampleRate: en.src.sampleRate }) }, '▶'),
      el('div', { class: 'votes' }, VOTES.map((v) => el('button', { class: 'vote', 'aria-label': `${v.label} for ${battle.players[en.player].name}`, 'data-entry': idx, onclick: () => { en.votes++; cnt.textContent = en.votes; metrics.count('battleVotes'); } }, v.e))),
      cnt);
  });
  root.append(
    el('header', { class: 'bar' }, el('span', { class: 'spacer' }), el('h1', {}, 'Family vote'), el('span', { class: 'spacer' })),
    el('main', { class: 'pad' },
      el('p', {}, `“${battle.prompts[battle.round]}” — everyone taps emoji for their favourites. Each tap is worth 5 points.`),
      rows,
      el('button', { class: 'btn primary huge', id: 'votes-done', onclick: () => {
        for (const en of battle.entries) battle.players[en.player].total += en.score + en.votes * 5;
        battle.history.push(battle.entries);
        metrics.count('battleRounds');
        go('battleRound', {}, { replace: true });
      } }, 'Votes are in!')));
});

register('battleRound', (root) => {
  const entries = battle.entries.map((e) => ({ ...e, points: e.score + e.votes * 5 })).sort((a, b) => b.points - a.points);
  const best = battle.players[entries[0].player].name;
  const last = battle.round + 1 >= battle.rounds;
  root.append(el('main', { class: 'pad center' },
    el('p', { class: 'muted' }, `Round ${battle.round + 1} winner`),
    el('h1', { class: 'player-big' }, best),
    el('ol', { class: 'standings' }, [...battle.players].map((p, i) => ({ ...p, i })).sort((a, b) => b.total - a.total).map((p) => el('li', {}, el('b', {}, p.name), el('span', {}, ` ${p.total} pts`)))),
    el('button', { class: 'btn primary huge', id: 'round-next', onclick: () => {
      battle.round++;
      battle.turn = 0;
      battle.entries = [];
      if (last) go('battleFinale', {}, { replace: true });
      else go('battlePass', {}, { replace: true });
    } }, last ? 'And the champion is…' : 'Next round')));
});

register('battleFinale', async (root) => {
  const sorted = [...battle.players].sort((a, b) => b.total - a.total);
  const top = sorted[0].total;
  const champs = sorted.filter((p) => p.total === top).map((p) => p.name);
  metrics.count('battlesCompleted');
  metrics.feature('battleFinale');
  const title = champs.length > 1 ? `Co-champions: ${champs.join(' & ')}` : champs[0];
  const makeBlob = () => renderCard({ kind: 'Family Toot Champion', title, subtitle: `${battle.rounds} rounds · ${battle.players.length} players`, lines: sorted.map((p, i) => `${i + 1}. ${p.name} — ${p.total} pts`), accent: '#ffb300' });
  drumroll(1400);
  await sleep(1400);
  play({ type: 'synth', id: 'lib-trumpet' }); // fanfare stays synthesised
  confetti(90);
  root.append(el('main', { class: 'pad center finale' },
    el('div', { class: 'trophy pop', html: trophySVG(170) }),
    el('p', { class: 'muted' }, 'Family Toot Champion'),
    el('h1', { class: 'player-big', id: 'champion' }, title),
    el('ol', { class: 'standings' }, sorted.map((p) => el('li', {}, el('b', {}, p.name), el('span', {}, ` ${p.total} pts`)))),
    el('p', { class: 'muted small' }, 'Replay card shows nicknames only. Sharing it needs a grown-up.'),
    cardButton('Replay card', makeBlob, 'We had a Toot Battle!', 'toot-battle.png'),
    el('button', { class: 'btn primary big', id: 'battle-again', onclick: () => { battle.players.forEach((p) => (p.total = 0)); go('battleSetup', {}, { replace: true }); } }, 'Play again'),
    el('button', { class: 'btn ghost', id: 'battle-home', onclick: () => { battle = null; go('home', {}, { reset: true }); } }, 'Home')));
});
