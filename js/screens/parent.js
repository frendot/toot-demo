// Parent area (behind the parent gate every time): controls, usage counters, feedback, backup, privacy, delete.
import { el, downloadBlob } from '../util.js';
import { kv, creaturesDB, recordingsDB, clearAll } from '../store.js';
import { register, go, header, toast, settings, saveSettings } from '../ui.js';
import { play, unlockAudio } from '../audio.js';
import { metrics, toCSV } from '../metrics.js';

const fmtMs = (ms) => (ms === null || ms === undefined ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
const fmtSec = (s) => (s === null || s === undefined ? '—' : s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`);

register('parent', async (root) => {
  metrics.feature('parentArea');
  const snap = await metrics.snapshot();
  const sum = metrics.summary(snap);
  const feedback = (await kv.get('feedback')) || [];
  const ageBand = await kv.get('ageBand');
  const persist = await kv.get('persistResult');
  const recCount = (await recordingsDB.all()).length;

  const section = (title, ...kids) => el('section', { class: 'card' }, el('h3', {}, title), ...kids);
  const counterRows = Object.entries(snap.counters).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => el('tr', {}, el('td', {}, k), el('td', {}, String(v))));
  const recent = snap.sessions.slice(-8).reverse().map((s) => el('tr', {}, el('td', {}, s.start.replace('T', ' ')), el('td', {}, fmtSec(s.lengthSec)), el('td', {}, fmtMs(s.timeToFirstLaughMs)), el('td', {}, (s.features || []).join(', '))));

  const vol = el('input', { type: 'range', min: '10', max: '100', step: '5', value: String(Math.round(settings.volumeCap * 100)), id: 'vol-cap', 'aria-label': 'Volume cap' });
  const volLbl = el('b', {}, `${vol.value}%`);
  vol.addEventListener('input', () => { volLbl.textContent = `${vol.value}%`; });
  vol.addEventListener('change', async () => { settings.volumeCap = vol.value / 100; await saveSettings(); await unlockAudio(); play({ type: 'lib', id: 'snd-whoopee' }); });

  const sw = (key, label, after) => {
    const input = el('input', { type: 'checkbox', checked: settings[key], id: 'set-' + key });
    input.addEventListener('change', async () => { settings[key] = input.checked; await saveSettings(); if (after) await after(input.checked); toast('Saved'); });
    return el('label', { class: 'toggle' }, input, el('span', {}, el('b', {}, label)));
  };

  const inclRec = el('input', { type: 'checkbox', id: 'backup-rec' });
  const importIn = el('input', { type: 'file', accept: '.toot,application/json', id: 'backup-file', hidden: true });
  importIn.addEventListener('change', async () => {
    const f = importIn.files[0];
    if (!f) return;
    try { await importBackup(JSON.parse(await f.text())); toast('Backup restored'); go('parent', {}, { replace: true }); }
    catch (e) { toast('That file is not a Toot backup.'); }
  });

  root.append(
    header('Parent area', { onBack: () => go('home', {}, { reset: true }) }),
    el('main', { class: 'pad parent' },
      el('p', { class: 'muted small' }, 'Everything here is stored only on this device. This demo has no accounts, no server, no ads and no third-party analytics.'),
      section('Usage (anonymous, on this device)',
        el('div', { class: 'kpis' },
          kpi('Sessions', sum.sessions), kpi('Median session', fmtSec(sum.medianSessionSec)), kpi('Median time to first laugh', fmtMs(sum.medianTimeToFirstLaughMs)),
          kpi('Battles played', snap.counters.battlesCompleted || 0), kpi('Recordings made', snap.counters.recordingsMade || 0), kpi('Lab reviews', snap.counters.labReviews || 0)),
        el('p', { class: 'muted small' }, '“Time to first laugh” = time from opening the app to the first toot sound in that session.'),
        el('details', {}, el('summary', {}, 'All counters'), el('table', { class: 'tbl', id: 'counters' }, el('tbody', {}, counterRows))),
        el('details', {}, el('summary', {}, 'Recent sessions'), el('table', { class: 'tbl' }, el('thead', {}, el('tr', {}, el('th', {}, 'Start'), el('th', {}, 'Length'), el('th', {}, 'First laugh'), el('th', {}, 'Used'))), el('tbody', {}, recent))),
        el('div', { class: 'row wrap' },
          el('button', { class: 'btn small', id: 'export-json', onclick: async () => {
            const d = await metrics.snapshot();
            const out = { app: 'toot-demo', kind: 'usage', exportedAt: new Date().toISOString(), summary: metrics.summary(d), ...d, feedback: (await kv.get('feedback')) || [] };
            downloadBlob(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }), `toot-usage-${out.exportedAt.slice(0, 10)}.json`);
          } }, 'Export JSON'),
          el('button', { class: 'btn small', id: 'export-csv', onclick: async () => {
            const d = await metrics.snapshot();
            downloadBlob(new Blob([toCSV(d, (await kv.get('feedback')) || [])], { type: 'text/csv' }), `toot-usage-${new Date().toISOString().slice(0, 10)}.csv`);
          } }, 'Export CSV'),
          el('button', { class: 'btn small danger', id: 'clear-usage', onclick: async () => {
            if (!confirm('Clear all usage counters and feedback on this device?')) return;
            await metrics.clear(); await kv.del('feedback'); toast('Usage data cleared'); go('parent', {}, { replace: true });
          } }, 'Clear usage data'))),
      section('Feedback',
        feedback.length ? el('ul', { class: 'fb-list' }, feedback.map((f) => el('li', {}, `${f.day}: laugh ${f.rating ?? '—'}/5 · favourite ${f.favourite ?? '—'} · ${f.who ?? '—'}${f.note ? ' · “' + f.note + '”' : ''}`))) : el('p', { class: 'muted' }, 'No feedback yet.'),
        el('button', { class: 'btn small', id: 'give-feedback', onclick: () => go('feedback') }, 'Give feedback now')),
      section('Sound',
        el('label', { class: 'field' }, el('span', {}, 'Volume cap: ', volLbl), vol)),
      section('Controls',
        sw('micEnabled', 'Microphone (press-to-record)', async (on) => { if (on) await kv.del('micDenied'); }),
        sw('sharingEnabled', 'Sharing cards to other apps'),
        el('p', { class: 'muted small' }, `Age answer: ${ageBand === 'under13' ? 'under 13' : ageBand === '13plus' ? '13 or over' : 'not set'} (only this band is kept, on this device).`),
        el('button', { class: 'btn small', onclick: () => go('age', { changing: true }) }, 'Change age answer')),
      section('Backup (.toot file)',
        el('p', { class: 'muted small' }, `Browser storage can be cleared, so keep a backup. Storage persistence: ${persist || 'not requested yet'}. Saved recordings: ${recCount}.`),
        el('label', { class: 'toggle' }, inclRec, el('span', {}, el('b', {}, 'Include saved recordings'), el('small', {}, 'Off by default'))),
        el('div', { class: 'row wrap' },
          el('button', { class: 'btn small', id: 'export-backup', onclick: async () => {
            const b = await exportBackup(inclRec.checked);
            downloadBlob(new Blob([JSON.stringify(b)], { type: 'application/json' }), `toot-backup-${b.exportedAt.slice(0, 10)}.toot`);
            metrics.count('backupExported');
          } }, 'Export backup'),
          el('button', { class: 'btn small', onclick: () => importIn.click() }, 'Import backup'), importIn)),
      section('Privacy',
        el('button', { class: 'btn small', id: 'privacy', onclick: () => go('privacy') }, 'Read the privacy notice'),
        el('button', { class: 'btn small', id: 'credits', onclick: () => go('credits') }, 'Credits & licences')),
      section('Delete everything',
        el('p', { class: 'muted small' }, 'Removes the collection, recordings, settings, usage counters and feedback from this device.'),
        el('button', { class: 'btn danger', id: 'delete-all', onclick: async () => {
          if (!confirm('Delete ALL Toot data on this device? This cannot be undone.')) return;
          metrics.stop();
          await clearAll(); // keeps the offline app shell; only user data is removed
          toast('All data deleted');
          setTimeout(() => location.reload(), 600);
        } }, 'Delete all data'))));
});

function kpi(label, value) { return el('div', { class: 'kpi' }, el('b', {}, String(value)), el('span', {}, label)); }

async function blobToB64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64ToBlob(b64, type) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type });
}

const BACKUP_KEYS = ['settings', 'mintedSounds', 'packs', 'ageBand', 'onboarded', 'micExplained', 'tipsShown'];

async function exportBackup(includeRecordings) {
  const kvAll = await kv.all();
  const out = { app: 'toot-demo', kind: 'backup', version: 1, exportedAt: new Date().toISOString(), creatures: await creaturesDB.all(), kv: {} };
  for (const k of BACKUP_KEYS) if (k in kvAll) out.kv[k] = kvAll[k];
  if (includeRecordings) {
    out.recordings = [];
    for (const r of await recordingsDB.all()) out.recordings.push({ id: r.id, mime: r.mime, createdAt: r.createdAt, data: await blobToB64(r.blob) });
  } else {
    // creatures that pointed at a recording fall back to their own synthesised voice
    out.creatures = out.creatures.map((c) => (c.soundRef && c.soundRef.type === 'rec' ? { ...c, soundRef: { type: 'seed', seed: c.seed } } : c));
  }
  return out;
}

async function importBackup(b) {
  if (!b || b.app !== 'toot-demo' || b.kind !== 'backup' || !Array.isArray(b.creatures)) throw new Error('bad file');
  await creaturesDB.clear();
  for (const c of b.creatures) await creaturesDB.put(c);
  for (const [k, v] of Object.entries(b.kv || {})) if (BACKUP_KEYS.includes(k)) await kv.set(k, v);
  if (Array.isArray(b.recordings)) {
    await recordingsDB.clear();
    for (const r of b.recordings) await recordingsDB.put({ id: r.id, mime: r.mime, createdAt: r.createdAt, blob: b64ToBlob(r.data, r.mime) });
  }
  Object.assign(settings, b.kv && b.kv.settings ? b.kv.settings : {});
  await saveSettings();
  metrics.count('backupImported');
}

register('privacy', (root) => {
  root.append(header('Privacy notice'), el('main', { class: 'pad prose' },
    el('h2', {}, 'For kids'),
    el('p', {}, 'Toot keeps everything on this phone. Your creatures, your cards and any sounds you save stay here. The microphone only listens while you hold the big red button. Nobody else can see your Toot stuff unless a grown-up helps you share a card.'),
    el('h2', {}, 'For grown-ups'),
    el('ul', {},
      el('li', {}, 'No accounts, no ads, no third-party analytics, trackers, fonts or scripts. The app makes no network requests except loading its own files from the address you opened.'),
      el('li', {}, 'Microphone: used only while Record is held (max 6 seconds). Audio is analysed in memory on this device and discarded unless you tap Save, which stores it in this browser’s storage only. Nothing is uploaded.'),
      el('li', {}, 'Age: only an age band (under 13 / 13 and over) is stored on this device; it is never sent anywhere.'),
      el('li', {}, 'Usage counters: anonymous counts (sessions, features used, time to first laugh, battles, recordings) are kept on this device so you can export them for the demo test. No identifiers.'),
      el('li', {}, 'What the host sees: the server delivering the app files necessarily sees your IP address and a request log. This demo is served from a temporary link for testing.'),
      el('li', {}, 'Sharing, saving cards and backups always go through the parent gate.'),
      el('li', {}, 'Delete everything at any time in the Parent area, or by clearing this site’s data in your browser.'))));
});
