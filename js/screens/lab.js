// Professor Toot's Sound Lab (spec 6): hold-to-record or pick -> analysis theatre -> judge review -> Lab Report.
import { el, mulberry32 } from '../util.js';
import { kv, creaturesDB, recordingsDB, ensurePersist } from '../store.js';
import { register, go, header, toast, confetti, statBars, cardButton, settings } from '../ui.js';
import { play, LIBRARY, samplesForRef, audioBufferForRef, pcmForRef, resolveRef, groupOfRef, unlockAudio, blip } from '../audio.js';
import { HoldRecorder, MAX_RECORD_MS, micSupported, pcmToWav } from '../recorder.js';
import { analyse } from '../analysis.js';
import { JUDGES, chooseLine, chooseGroupLine, RARE_REACTIONS } from '../judges.js';
import { sampleById } from '../samples.js';
import { mintFromSound, CATALOG, creatureSVG } from '../creatures.js';
import { renderCard } from '../cards.js';
import { metrics } from '../metrics.js';
import { judgeSVG, beakersSVG, tootometerSVG } from './art.js';

const labState = { judge: 'prof' };

export async function micAvailable() {
  return settings.micEnabled && micSupported() && !(await kv.get('micDenied'));
}

export async function samplesFor(ref) {
  if (ref.type === 'rec') {
    const buf = await audioBufferForRef(ref);
    return buf ? { samples: buf.getChannelData(0), sampleRate: buf.sampleRate } : null;
  }
  return (await pcmForRef(ref)) || samplesForRef(ref);
}

// Reusable hold-to-record behaviour (Lab + Battles). Mic only while held.
export function attachHoldToRecord(button, { onResult, onNeedExplainer }) {
  let rec = null;
  let overlay = null;
  let countdownIv = null;
  let stopping = false;
  const showOverlay = () => {
    const count = el('b', { class: 'rec-count' }, String(MAX_RECORD_MS / 1000));
    const meter = el('i', { class: 'rec-meter' });
    overlay = el('div', { class: 'rec-overlay', id: 'rec-overlay', role: 'status' },
      el('div', { class: 'rec-dot' }), el('h2', {}, 'Mic ON — recording'), el('p', {}, 'Keep holding… let go to stop'), count, el('div', { class: 'rec-meter-wrap' }, meter));
    document.body.append(overlay);
    const t0 = performance.now();
    countdownIv = setInterval(() => { count.textContent = String(Math.max(0, Math.ceil((MAX_RECORD_MS - (performance.now() - t0)) / 1000))); }, 100);
    return meter;
  };
  const hideOverlay = () => { clearInterval(countdownIv); if (overlay) overlay.remove(); overlay = null; };
  const stop = async () => {
    if (!rec || stopping) return;
    stopping = true;
    const r = rec;
    rec = null;
    hideOverlay();
    const res = await r.stop();
    stopping = false;
    if (!res || res.samples.length < res.sampleRate * 0.3) { toast('Hold the red button a bit longer!'); return; }
    metrics.count('recordingsMade');
    onResult(res);
  };
  button.addEventListener('contextmenu', (e) => e.preventDefault());
  button.addEventListener('pointerdown', async (e) => {
    e.preventDefault();
    if (rec) return;
    if (!(await kv.get('micExplained'))) { onNeedExplainer(); return; }
    try { button.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    await unlockAudio();
    const meter = showOverlay(); // indicator appears instantly
    rec = new HoldRecorder({ onLevel: (m) => { meter.style.width = Math.min(100, m * 140) + '%'; }, onAutoStop: () => stop() });
    const mine = rec;
    mine.start().catch(async (err) => {
      hideOverlay();
      rec = null;
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError' || err.name === 'NotFoundError')) {
        await kv.set('micDenied', true);
        metrics.count('micDenied');
        toast('No problem! Pick a sound from the Toot Library instead.', 3500);
        if (button.isConnected) go('lab', {}, { replace: true });
      } else toast('The mic is busy. Try again or pick a sound.');
    });
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(ev, () => stop());
  return () => { if (rec) stop(); hideOverlay(); };
}

register('lab', async (root, params) => {
  metrics.feature('lab');
  const creatures = await creaturesDB.all();
  const canMic = await micAvailable();
  const judgePicker = el('div', { class: 'judges' }, JUDGES.map((j) => {
    const b = el('button', { class: 'judge' + (labState.judge === j.id ? ' on' : ''), 'data-judge': j.id, onclick: () => {
      labState.judge = j.id; judgePicker.querySelectorAll('.judge').forEach((x) => x.classList.toggle('on', x === b));
    } }, el('span', { html: judgeSVG(j.id, 64) }), el('b', {}, j.name), el('small', {}, j.style));
    return b;
  }));
  let recordArea;
  let detach = null;
  if (canMic) {
    const btn = el('button', { class: 'record-btn', id: 'record-btn', 'aria-label': 'Hold to record' }, el('b', {}, 'HOLD'), el('span', {}, 'to record a toot'));
    detach = attachHoldToRecord(btn, {
      onNeedExplainer: () => go('micExplainer'),
      onResult: (res) => go('analysis', { src: { kind: 'rec', name: 'Your toot', samples: res.samples, sampleRate: res.sampleRate, blob: res.blob, mime: res.mime } }),
    });
    recordArea = el('div', { class: 'record-area' }, btn, el('p', { class: 'muted small' }, 'Make a toot with your mouth, hand or a squeaky chair. The mic is on only while you hold, up to 6 seconds.'));
  } else {
    const help = el('p', { class: 'tip small', hidden: true }, 'For grown-ups: the microphone is switched off (Parent area), not available in this browser, or permission was declined. To allow it later, turn it on in the Parent area and in your browser site settings. The Lab works fully with library sounds.');
    recordArea = el('div', { class: 'record-area' },
      el('button', { class: 'btn big', onclick: () => document.getElementById('lib-list').scrollIntoView({ behavior: 'smooth' }) }, 'Pick a sound instead'),
      el('button', { class: 'linkish small', onclick: () => { help.hidden = !help.hidden; } }, 'Help for grown-ups'), help);
  }
  const soundBtn = (name, src) => el('button', { class: 'sound-row', onclick: () => go('analysis', { src }) }, el('span', {}, name), el('b', {}, 'Judge me ›'));
  const pre = params.creatureId ? creatures.find((c) => c.id === params.creatureId) : null;
  root.append(
    header('Sound Lab'),
    el('main', { class: 'pad' },
      el('h3', {}, 'Pick your judge'), judgePicker,
      pre ? el('div', { class: 'tip' }, `Sent to the Lab: ${pre.name}. `, el('button', { class: 'btn small primary', onclick: () => go('analysis', { src: { kind: 'creature', name: pre.name, ref: pre.soundRef, creatureId: pre.id } }) }, 'Judge it')) : null,
      recordArea,
      el('h3', { id: 'lib-list' }, 'Toot Library'),
      el('div', { class: 'sound-list' }, LIBRARY.map((s) => soundBtn(s.name, { kind: 'lib', name: s.name, ref: { type: 'lib', id: s.id }, key: s.id }))),
      creatures.length ? el('h3', {}, 'From your Toot-o-dex') : null,
      creatures.length ? el('div', { class: 'sound-list' }, creatures.map((c) => soundBtn(c.name, { kind: 'creature', name: c.name, ref: c.soundRef, creatureId: c.id }))) : null));
  return () => detach && detach();
});

register('micExplainer', (root) => {
  root.append(
    header('Microphone'),
    el('main', { class: 'pad center' },
      el('div', { html: judgeSVG('prof', 120) }),
      el('p', { class: 'kid-line' }, 'Professor Toot wants to hear your toot! The microphone only listens while you hold the big red button. Your sounds stay on this phone.'),
      el('div', { class: 'grownups' }, el('b', {}, 'For grown-ups: '), 'Toot uses the microphone only while Record is held, for up to 6 seconds. Sounds are analysed on this device and are never uploaded or shared. You can switch the mic off in the Parent area or your browser settings.'),
      el('button', { class: 'btn primary big', id: 'mic-allow', onclick: async () => { await kv.set('micExplained', true); metrics.count('micExplainerAllow'); toast('Now press and HOLD the red button'); history.back(); } }, 'Allow'),
      el('button', { class: 'btn ghost big', id: 'mic-library', onclick: async () => { await kv.set('micExplained', true); await kv.set('micDenied', true); metrics.count('micExplainerLibrary'); history.back(); } }, 'Use library sounds')));
});

let lastReview = null;

register('analysis', async (root, { src, judge }) => {
  await unlockAudio();
  // Pick the concrete sample once, so the toot you hear is exactly the one being judged.
  if (src.ref && !src.samples) src = { ...src, ref: resolveRef(src.ref), group: groupOfRef(src.ref) };
  const data = src.samples ? { samples: src.samples, sampleRate: src.sampleRate } : await samplesFor(src.ref);
  const a = analyse(data.samples, data.sampleRate);
  if (src.kind !== 'rec' || !src.blob) play(src.ref || { type: 'pcm', samples: data.samples, sampleRate: data.sampleRate });
  else play({ type: 'pcm', samples: data.samples, sampleRate: data.sampleRate });
  const statsBox = el('div', {}, statBars({ Wobble: 0, Squeakiness: 0, 'Trumpet Power': 0, 'Surprise Factor': 0 }));
  root.append(el('main', { class: 'pad center analysis' },
    el('h2', {}, 'Analysing…'),
    el('div', { class: 'beakers', html: beakersSVG() }),
    el('div', { class: 'meter', html: tootometerSVG() }),
    statsBox));
  const needle = root.querySelector('.needle');
  let step = 0;
  const iv = setInterval(() => {
    step++;
    const f = Math.min(1, step / 12);
    const wiggle = f < 1 ? (Math.random() - 0.5) * 60 : 0;
    const deg = -90 + (a.score / 100) * 180 * f + wiggle;
    needle.style.transform = `rotate(${deg}deg)`;
    const partial = {}; for (const [k, v] of Object.entries(a.stats)) partial[k] = Math.round(v * f);
    statsBox.replaceChildren(statBars(partial));
    if (step % 3 === 0) blip(300 + Math.random() * 500, 0.05, 'sine', 0.08);
  }, 260);
  const t = setTimeout(() => { go('review', { src, analysis: a, judge: judge || labState.judge }, { replace: true }); }, 3300);
  return () => { clearInterval(iv); clearTimeout(t); };
});

register('review', async (root, { src, analysis: a, judge }) => {
  metrics.count('labReviews');
  metrics.count('labReviews:' + judge);
  metrics.feature('labReview');
  const recent = (await kv.get('recentLines')) || [];
  const pick = chooseLine(judge, a.score, a.seed, recent);
  const groupLine = src.group ? chooseGroupLine(judge, src.group, a.seed) : null;
  const smp = src.ref && src.ref.type === 'smp' ? sampleById(src.ref.id) : null;
  recent.push(pick.lineId);
  while (recent.length > 15) recent.shift();
  await kv.set('recentLines', recent);
  const j = JUDGES.find((x) => x.id === judge);
  const rare = Math.random() < 1 / 30 ? RARE_REACTIONS[Math.floor(Math.random() * RARE_REACTIONS.length)] : null;
  if (rare) { metrics.count('rareReaction:' + rare.id); confetti(80); }
  else if (a.score >= 75) confetti(30);

  // Mint: every judged sound becomes a creature (once per sound).
  let minted = null;
  if (src.kind === 'lib') minted = await mintFromSound(src.key, src.ref, 'Sound Lab');
  else if (src.kind === 'rec') minted = await mintFromSound('rec-' + a.seed, null, 'Sound Lab');
  else if (src.kind === 'creature') minted = { creature: await creaturesDB.get(src.creatureId), isNew: false, already: true };
  const creature = minted && minted.creature;
  const species = creature ? CATALOG.find((s) => s.speciesId === creature.id) : null;
  lastReview = { src, a, judge, pick };

  const nextJudge = JUDGES[(JUDGES.findIndex((x) => x.id === judge) + 1) % JUDGES.length];
  const makeBlob = () => renderCard({ kind: 'Lab Report', title: `${j.name} says…`, big: `${a.score}/100`, subtitle: `Badge: ${pick.badge}`, lines: [`“${pick.line}”`, groupLine ? `“${groupLine}”` : pick.pairing], species, accent: j.color });

  let saveBtn = null;
  if (src.kind === 'rec') {
    saveBtn = el('button', { class: 'btn', id: 'save-rec', onclick: async () => {
      await ensurePersist();
      const id = 'rec-' + Date.now().toString(36);
      const rec = src.blob
        ? { id, blob: src.blob, mime: src.mime, createdAt: new Date().toISOString() }
        : { id, blob: pcmToWav(src.samples, src.sampleRate), mime: 'audio/wav', createdAt: new Date().toISOString() };
      await recordingsDB.put(rec);
      if (creature) { creature.soundRef = { type: 'rec', id }; await creaturesDB.put(creature); }
      metrics.count('recordingsSaved');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saved on this phone';
    } }, 'Save my sound (on this phone)');
  }

  root.append(
    header('Review', { onBack: () => go('lab', {}, { replace: true }) }),
    el('main', { class: 'pad center review' },
      rare ? el('div', { class: 'rare', id: 'rare' }, el('b', {}, rare.title), el('p', {}, rare.line)) : null,
      el('div', { class: 'judge-portrait' + (rare && rare.id === 'glasses' ? ' shake' : ''), html: judgeSVG(judge, 120) }),
      el('h3', {}, j.name),
      el('blockquote', { id: 'judge-line' }, `“${pick.line}”`),
      groupLine ? el('p', { class: 'group-line', id: 'group-line' }, `“${groupLine}”`) : null,
      el('div', { class: 'score', id: 'score' }, String(a.score), el('small', {}, '/100')),
      el('span', { class: 'badge' }, pick.badge),
      el('p', { class: 'muted pairing' }, pick.pairing),
      statBars(a.stats),
      smp ? el('p', { class: 'muted small', id: 'sample-credit' }, `Sound: ${smp.id} · CC0 · ${smp.author.replace(/ \(.*\)/, '')}`) : null,
      creature ? el('div', { class: 'minted' }, el('span', { html: creatureSVG(species, 56) }), el('span', {}, minted.already ? `${creature.name} is in your Toot-o-dex` : `New creature: ${creature.name} (${creature.rarity}) added to your Toot-o-dex!`)) : null,
      el('button', { class: 'btn', id: 'next-judge', onclick: () => go('review', { src, analysis: a, judge: nextJudge.id }, { replace: true }) }, `Ask ${nextJudge.name}`),
      saveBtn,
      cardButton('Lab Report card', makeBlob, `${j.name} gave my toot ${a.score}/100!`, 'lab-report.png'),
      el('button', { class: 'btn primary big', onclick: () => go('lab', {}, { replace: true }) }, 'Judge another'),
      el('p', { class: 'muted small' }, src.kind === 'rec' && !saveBtn?.disabled ? 'Your recording is only kept if you tap Save. Otherwise it is forgotten when you leave.' : '')));
});
