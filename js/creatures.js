// Toot-o-dex: curated creature catalog, rarity odds, minting, procedural art, Puff Packs.
import { hashStr, mulberry32, pick, localDayKey, daysBetween, clamp } from './util.js';
import { creaturesDB, kv, ensurePersist } from './store.js';

export const RARITIES = [
  { id: 'Common', odds: 55, color: '#8bc34a' },
  { id: 'Uncommon', odds: 25, color: '#29b6f6' },
  { id: 'Rare', odds: 12, color: '#7e57c2' },
  { id: 'Epic', odds: 6, color: '#ff7043' },
  { id: 'Legendary', odds: 1.8, color: '#ffb300' },
  { id: 'Mythic', odds: 0.2, color: '#ec407a' },
];

export const FAMILIES = ['Band', 'Royals', 'Weather', 'Legends'];

// Names come only from these curated lists (checked by tools/check-content.mjs).
export const ADJECTIVES = ['Reluctant', 'Nervous', 'Polite', 'Sleepy', 'Wobbly', 'Grumpy', 'Cheerful', 'Sneaky', 'Fancy', 'Bashful', 'Jolly', 'Dramatic'];
export const INSTRUMENT_NAMES = ['Tuba', 'Trombone', 'Kazoo', 'Bagpipe', 'Bassoon', 'Ukulele', 'Tin Whistle', 'Accordion', 'Sousaphone', 'Harmonica'];

// Fixed species list: [name, family, rarity]
const BAND = [
  ['The Nervous Tuba', 'Common'], ['The Reluctant Trombone', 'Common'], ['The Polite Kazoo', 'Common'], ['The Sleepy Bassoon', 'Common'],
  ['The Wobbly Ukulele', 'Common'], ['The Bashful Harmonica', 'Common'], ['The Cheerful Tin Whistle', 'Uncommon'], ['The Grumpy Bagpipe', 'Uncommon'],
  ['The Jolly Accordion', 'Uncommon'], ['The Sneaky Sousaphone', 'Rare'], ['The Fancy Trombone', 'Rare'], ['The Dramatic Tuba', 'Epic'],
];
const ROYALS = [
  ['Sir Squeaksalot', 'Common'], ['Lady Puffington', 'Common'], ['Lord Rumblewick of Teacup Hill', 'Uncommon'], ['Baron von Pfft', 'Uncommon'],
  ['Prince Pippity Parp', 'Common'], ['Countess Tootington', 'Uncommon'], ['Duke Wobbleworth', 'Rare'], ['Duchess Rumbleton of Bean Valley', 'Rare'],
  ['Queen Whoopee the First', 'Epic'], ['King Trumpetus Rex', 'Legendary'],
];
const WEATHER = [
  ['Thunderpuff', 'Common'], ['Squeakquake', 'Common'], ['Drizzle Toot', 'Common'], ['Breezy McBreeze', 'Common'],
  ['Hurricane Hiccup', 'Uncommon'], ['Misty Mistington', 'Uncommon'], ['Rainbow Rumble', 'Rare'], ['Tornado Tootsie', 'Rare'],
  ['Aurora Tootealis', 'Epic'], ['Volcano Vroom', 'Epic'],
];
const LEGENDS = [
  ['Puffasaurus', 'Uncommon'], ['Toot Hood', 'Uncommon'], ['Tootzilla', 'Rare'], ['Beethooten', 'Rare'],
  ['Krakatoot', 'Epic'], ['Tootankhamun', 'Legendary'], ['Leonardo da Pfftci', 'Legendary'], ['The Great Whoopee Comet', 'Mythic'],
];

export const BIO_PARTS = {
  lives: ['Lives in couch cushions.', 'Lives inside a tuba case.', 'Lives under the piano.', 'Lives in a sock drawer.', 'Lives on a cloud shaped like a sandwich.', 'Lives behind the sofa.', 'Lives in a teapot.', 'Lives in the school band room.'],
  afraid: ['Afraid of beans.', 'Afraid of very quiet libraries.', 'Afraid of bubble wrap.', 'Afraid of serious meetings.', 'Afraid of mimes.', 'Afraid of whoopee-cushion thieves.', 'Afraid of the letter Q.'],
  loves: ['Loves jazz.', 'Loves marching bands.', 'Loves bubble baths.', 'Loves penguins in bow ties.', 'Loves opera.', 'Loves knock-knock jokes.', 'Loves trampolines.', 'Loves polka dots.'],
};

// Each species' voice comes from one real-sample group (see samples.js / Credits).
export const SPECIES_GROUP = {
  // Band: brassy, tuneful toots
  'The Nervous Tuba': 'tuba', 'The Reluctant Trombone': 'tuba', 'The Polite Kazoo': 'classic', 'The Sleepy Bassoon': 'tuba',
  'The Wobbly Ukulele': 'classic', 'The Bashful Harmonica': 'squeak', 'The Cheerful Tin Whistle': 'squeak', 'The Grumpy Bagpipe': 'ripper',
  'The Jolly Accordion': 'sequence', 'The Sneaky Sousaphone': 'tiny', 'The Fancy Trombone': 'double', 'The Dramatic Tuba': 'tuba',
  // Royals: proper, polite little toots (and one royal cushion)
  'Sir Squeaksalot': 'squeak', 'Lady Puffington': 'tiny', 'Lord Rumblewick of Teacup Hill': 'ripper', 'Baron von Pfft': 'tiny',
  'Prince Pippity Parp': 'classic', 'Countess Tootington': 'classic', 'Duke Wobbleworth': 'double', 'Duchess Rumbleton of Bean Valley': 'ripper',
  'Queen Whoopee the First': 'whoopee', 'King Trumpetus Rex': 'tuba',
  // Weather: rumbles, drizzles and storms
  'Thunderpuff': 'ripper', 'Squeakquake': 'squeak', 'Drizzle Toot': 'wet', 'Breezy McBreeze': 'tiny',
  'Hurricane Hiccup': 'sequence', 'Misty Mistington': 'wet', 'Rainbow Rumble': 'double', 'Tornado Tootsie': 'sequence',
  'Aurora Tootealis': 'cartoon', 'Volcano Vroom': 'ripper',
  // Legends: the big and the strange
  'Puffasaurus': 'tuba', 'Toot Hood': 'classic', 'Tootzilla': 'ripper', 'Beethooten': 'sequence',
  'Krakatoot': 'double', 'Tootankhamun': 'cartoon', 'Leonardo da Pfftci': 'squeak', 'The Great Whoopee Comet': 'whoopee',
};

export const CATALOG = [];
for (const [fam, list] of [['Band', BAND], ['Royals', ROYALS], ['Weather', WEATHER], ['Legends', LEGENDS]]) {
  for (const [name, rarity] of list) {
    const seed = hashStr(name);
    CATALOG.push({ speciesId: 's' + seed.toString(36), name, family: fam, rarity, seed, group: SPECIES_GROUP[name] || 'classic' });
  }
}

// Which sound groups each family is made of (shown in the Toot-o-dex).
export const FAMILY_GROUPS = {};
for (const c of CATALOG) { (FAMILY_GROUPS[c.family] = FAMILY_GROUPS[c.family] || new Set()).add(c.group); }

export function speciesInfo(sp) {
  const r = mulberry32(sp.seed);
  const rIdx = RARITIES.findIndex((x) => x.id === sp.rarity);
  const bump = rIdx * 6;
  const stats = {
    Wobble: clamp(Math.round(20 + r() * 70 + bump), 1, 100),
    Squeak: clamp(Math.round(10 + r() * 80 + bump), 1, 100),
    Boom: clamp(Math.round(15 + r() * 75 + bump), 1, 100),
    Sneakiness: clamp(Math.round(10 + r() * 85), 1, 100),
  };
  const bio = `${pick(r, BIO_PARTS.lives)} ${pick(r, BIO_PARTS.afraid)} ${pick(r, BIO_PARTS.loves)}`;
  return { stats, bio };
}

export function rollRarity(rng) {
  const x = rng() * 100;
  let acc = 0;
  for (const r of RARITIES) { acc += r.odds; if (x < acc) return r.id; }
  return 'Common';
}

export function speciesForSeed(seed) {
  const rng = mulberry32(seed);
  const rarity = rollRarity(rng);
  const pool = CATALOG.filter((c) => c.rarity === rarity);
  return pool[Math.floor(rng() * pool.length)];
}

// Procedural cloud creature (SVG). Same species -> same art; stats shape it.
export function creatureSVG(sp, size = 120) {
  const { stats } = speciesInfo(sp);
  const r = mulberry32(sp.seed ^ 0x9e3779b9);
  const hues = { Band: [40, 60], Royals: [270, 300], Weather: [190, 220], Legends: [340, 20] };
  const [h0, h1] = hues[sp.family];
  const span = (h1 - h0 + 360) % 360;
  const hue = (h0 + r() * span) % 360;
  const body = `hsl(${hue.toFixed(0)},70%,${(72 + r() * 10).toFixed(0)}%)`;
  const edge = `hsl(${hue.toFixed(0)},55%,45%)`;
  const puffs = 4 + Math.floor(stats.Wobble / 25);
  let circles = '';
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * Math.PI * 2;
    const rad = 18 + r() * 8 + stats.Boom / 12;
    circles += `<circle cx="${(60 + Math.cos(a) * 26).toFixed(1)}" cy="${(62 + Math.sin(a) * 18).toFixed(1)}" r="${rad.toFixed(1)}"/>`;
  }
  const eyeGap = 10 + stats.Sneakiness / 12;
  const eyeR = 4 + stats.Squeak / 30;
  const mouthW = 8 + stats.Boom / 8;
  const expression = Math.floor(r() * 4);
  const mouth = [
    `<path d="M${60 - mouthW} 74 Q60 ${84 + stats.Boom / 15} ${60 + mouthW} 74" fill="none" stroke="#3a2a3a" stroke-width="3" stroke-linecap="round"/>`,
    `<ellipse cx="60" cy="77" rx="${(mouthW / 2).toFixed(1)}" ry="${(4 + stats.Boom / 20).toFixed(1)}" fill="#3a2a3a"/>`,
    `<path d="M${60 - mouthW} 76 Q${60 - mouthW / 2} 82 60 76 Q${60 + mouthW / 2} 82 ${60 + mouthW} 76" fill="none" stroke="#3a2a3a" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M${60 - mouthW} 78 L${60 + mouthW} 76" stroke="#3a2a3a" stroke-width="3" stroke-linecap="round"/>`,
  ][expression];
  const crown = sp.family === 'Royals' ? `<path d="M44 34 L50 22 L56 32 L62 18 L68 32 L74 22 L78 34 Z" fill="#ffd54f" stroke="#c79a00" stroke-width="2"/>` : '';
  const bolt = sp.family === 'Weather' ? `<path d="M92 86 l-8 14 h7 l-5 12 l12 -16 h-7 l5 -10z" fill="#ffeb3b" stroke="#c7a600" stroke-width="1.5"/>` : '';
  const note = sp.family === 'Band' ? `<text x="92" y="36" font-size="18" fill="${edge}">♪</text>` : '';
  const star = sp.family === 'Legends' ? `<path d="M22 28 l3 7 l7 1 l-5 5 l1 7 l-6-3 l-6 3 l1-7 l-5-5 l7-1z" fill="#fff59d" stroke="#d4b100" stroke-width="1.2"/>` : '';
  const blush = `<ellipse cx="${60 - eyeGap - 6}" cy="72" rx="5" ry="3" fill="#ff8a80" opacity=".6"/><ellipse cx="${60 + eyeGap + 6}" cy="72" rx="5" ry="3" fill="#ff8a80" opacity=".6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${sp.name}">
<g fill="${body}" stroke="${edge}" stroke-width="3">${circles}</g>
<g fill="${body}">${circles}</g>
${crown}${bolt}${note}${star}
<circle cx="${60 - eyeGap}" cy="60" r="${eyeR.toFixed(1)}" fill="#3a2a3a"/><circle cx="${60 + eyeGap}" cy="60" r="${eyeR.toFixed(1)}" fill="#3a2a3a"/>
<circle cx="${60 - eyeGap + 1.5}" cy="58.5" r="1.4" fill="#fff"/><circle cx="${60 + eyeGap + 1.5}" cy="58.5" r="1.4" fill="#fff"/>
${blush}${mouth}</svg>`;
}

// Mint a creature into the collection (duplicates kept and counted).
// soundRef: the sound this creature came from (lib/seed/rec).
export async function mint(species, source, soundRef) {
  await ensurePersist();
  const existing = await creaturesDB.get(species.speciesId);
  const now = new Date().toISOString();
  if (existing) {
    existing.count += 1;
    existing.lastFoundAt = now;
    if (soundRef && !existing.soundRef) existing.soundRef = soundRef;
    await creaturesDB.put(existing);
    return { creature: existing, isNew: false };
  }
  const info = speciesInfo(species);
  const c = {
    id: species.speciesId, seed: species.seed, name: species.name, family: species.family, rarity: species.rarity,
    stats: info.stats, bio: info.bio, soundRef: soundRef || { type: 'seed', seed: species.seed }, shiny: false,
    foundAt: now, lastFoundAt: now, count: 1, source,
  };
  await creaturesDB.put(c);
  return { creature: c, isNew: true };
}

// Each sound maps to exactly one species (deterministic), minted once per sound.
export async function mintFromSound(soundKey, soundRef, source) {
  const minted = (await kv.get('mintedSounds')) || {};
  let species;
  if (soundKey === 'lib-whoopee' || soundKey === 'snd-tuba') species = CATALOG.find((c) => c.name === 'The Nervous Tuba');
  else if (soundKey.startsWith('snd-')) {
    // A library sound group always hatches a creature voiced by that same group.
    const group = soundKey.slice(4);
    const rng = mulberry32(hashStr(soundKey));
    const pool = CATALOG.filter((c) => c.group === group);
    // Library sounds hatch the least rare species of their group, so rare ones still come from packs.
    const rank = (c) => RARITIES.findIndex((r) => r.id === c.rarity);
    const low = Math.min(...pool.map(rank));
    const easy = pool.filter((c) => rank(c) === low);
    species = easy[Math.floor(rng() * easy.length)] || speciesForSeed(hashStr(soundKey));
  } else species = speciesForSeed(hashStr(soundKey));
  if (minted[soundKey]) return { creature: await creaturesDB.get(minted[soundKey]), isNew: false, already: true };
  // Library groups: the creature keeps its own signature voice (a fixed sample from its group).
  const res = await mint(species, source, soundRef && soundRef.type === 'lib' ? null : soundRef);
  minted[soundKey] = species.speciesId;
  await kv.set('mintedSounds', minted);
  return res;
}

// ---- Daily Puff Pack: one per local day, up to 3 banked, never expires ----
export async function packsWaiting() {
  const today = localDayKey();
  let st = await kv.get('packs');
  if (!st) { st = { banked: 1, lastGrantDay: today }; await kv.set('packs', st); }
  const gap = daysBetween(st.lastGrantDay, today);
  if (gap > 0) {
    st.banked = Math.min(3, st.banked + gap);
    st.lastGrantDay = today;
    await kv.set('packs', st);
  }
  return st.banked;
}

export async function openPack() {
  const n = await packsWaiting();
  if (n <= 0) return null;
  const st = await kv.get('packs');
  st.banked -= 1;
  await kv.set('packs', st);
  const rng = mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const rarity = rollRarity(rng);
    const pool = CATALOG.filter((c) => c.rarity === rarity);
    const sp = pool[Math.floor(rng() * pool.length)];
    out.push(await mint(sp, 'Puff Pack'));
  }
  return out;
}

export async function collectionStats() {
  const all = await creaturesDB.all();
  const owned = new Set(all.map((c) => c.id));
  const per = {};
  for (const f of FAMILIES) {
    const sp = CATALOG.filter((c) => c.family === f);
    per[f] = { have: sp.filter((s) => owned.has(s.speciesId)).length, total: sp.length };
  }
  return { all, per, have: owned.size, total: CATALOG.length };
}
