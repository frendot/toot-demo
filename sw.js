// Service worker: precache the whole app shell so Toot works fully offline after first load.
// Same-origin only; never fetches anything from other hosts.
const VERSION = 'v2-ddde090a94';
const CACHE = 'toot-demo-' + VERSION;
const ASSETS = [
  "./",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./js/analysis.js",
  "./js/app.js",
  "./js/audio.js",
  "./js/cards.js",
  "./js/creatures.js",
  "./js/gate.js",
  "./js/judges.js",
  "./js/metrics.js",
  "./js/prompts.js",
  "./js/recorder-worklet.js",
  "./js/recorder.js",
  "./js/samples-data.js",
  "./js/samples.js",
  "./js/screens/art.js",
  "./js/screens/battles.js",
  "./js/screens/credits.js",
  "./js/screens/dex.js",
  "./js/screens/home.js",
  "./js/screens/lab.js",
  "./js/screens/onboarding.js",
  "./js/screens/parent.js",
  "./js/screens/timer.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/util.js",
  "./manifest.json",
  "./sounds/cartoon-01.m4a",
  "./sounds/classic-01.m4a",
  "./sounds/classic-02.m4a",
  "./sounds/classic-03.m4a",
  "./sounds/classic-04.m4a",
  "./sounds/classic-05.m4a",
  "./sounds/double-01.m4a",
  "./sounds/double-02.m4a",
  "./sounds/ripper-01.m4a",
  "./sounds/ripper-02.m4a",
  "./sounds/sequence-01.m4a",
  "./sounds/sequence-02.m4a",
  "./sounds/squeak-01.m4a",
  "./sounds/squeak-02.m4a",
  "./sounds/squeak-03.m4a",
  "./sounds/squeak-04.m4a",
  "./sounds/squeak-05.m4a",
  "./sounds/tiny-01.m4a",
  "./sounds/tiny-03.m4a",
  "./sounds/tiny-04.m4a",
  "./sounds/tuba-01.m4a",
  "./sounds/tuba-02.m4a",
  "./sounds/tuba-03.m4a",
  "./sounds/wet-01.m4a",
  "./sounds/whoopee-01.m4a",
  "./styles.css"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('toot-demo-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
