// Boot: storage, settings, counters, router, service worker.
import { initRouter, go, loadSettings, installAudioUnlock } from './ui.js';
import { kv } from './store.js';
import { metrics } from './metrics.js';
import './screens/onboarding.js';
import './screens/home.js';
import './screens/timer.js';
import './screens/lab.js';
import './screens/dex.js';
import './screens/battles.js';
import './screens/parent.js';
import './screens/credits.js';

async function boot() {
  installAudioUnlock();
  await metrics.init();
  await loadSettings();
  initRouter(document.getElementById('app'));
  const onboarded = await kv.get('onboarded');
  const ageBand = await kv.get('ageBand');
  if (!ageBand) go('splash', {}, { reset: true });
  else if (!onboarded) go('firstCreature', {}, { reset: true });
  else go('home', {}, { reset: true });
  history.replaceState({ n: 1 }, '');
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* offline support unavailable */ });
  }
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('app').textContent = 'Oops, Toot could not start in this browser. Try updating your browser or leaving private mode.';
});
