// On-device storage only: IndexedDB (kv settings/counters, creatures, recordings).
// Nothing in this module talks to the network.
const DB_NAME = 'toot-demo';
const DB_VERSION = 1;
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('creatures')) db.createObjectStore('creatures', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const s = t.objectStore(storeName);
        let result;
        Promise.resolve(fn(s)).then((r) => (result = r));
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

const reqP = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export const kv = {
  async get(key, fallback = undefined) {
    const db = await open();
    const v = await reqP(db.transaction('kv').objectStore('kv').get(key));
    return v === undefined ? fallback : v;
  },
  set(key, value) { return tx('kv', 'readwrite', (s) => { s.put(value, key); }); },
  del(key) { return tx('kv', 'readwrite', (s) => { s.delete(key); }); },
  async all() {
    const db = await open();
    const store = db.transaction('kv').objectStore('kv');
    const [keys, vals] = await Promise.all([reqP(store.getAllKeys()), reqP(db.transaction('kv').objectStore('kv').getAll())]);
    const out = {};
    keys.forEach((k, i) => (out[k] = vals[i]));
    return out;
  },
};

function table(name) {
  return {
    async get(id) { const db = await open(); return reqP(db.transaction(name).objectStore(name).get(id)); },
    async all() { const db = await open(); return reqP(db.transaction(name).objectStore(name).getAll()); },
    put(obj) { return tx(name, 'readwrite', (s) => { s.put(obj); }); },
    del(id) { return tx(name, 'readwrite', (s) => { s.delete(id); }); },
    clear() { return tx(name, 'readwrite', (s) => { s.clear(); }); },
  };
}

export const creaturesDB = table('creatures');
export const recordingsDB = table('recordings');

export async function clearAll() {
  await tx('kv', 'readwrite', (s) => { s.clear(); });
  await creaturesDB.clear();
  await recordingsDB.clear();
}

// navigator.storage.persist() on first save; result recorded (spec 7.7).
export async function ensurePersist() {
  if (await kv.get('persistAsked')) return;
  let result = 'unsupported';
  try {
    if (navigator.storage && navigator.storage.persist) result = (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch (e) { result = 'error'; }
  await kv.set('persistAsked', true);
  await kv.set('persistResult', result);
}
