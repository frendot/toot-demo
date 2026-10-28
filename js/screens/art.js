// Static app-owned SVG art (mascot, judges, lab props, trophy).
export function cloudSVG(size = 120, wink = false) {
  return `<svg viewBox="0 0 120 100" width="${size}" height="${(size * 100) / 120}" aria-hidden="true">
<g fill="#ffe082" stroke="#e0a800" stroke-width="3"><circle cx="38" cy="58" r="24"/><circle cx="62" cy="42" r="28"/><circle cx="86" cy="58" r="22"/><rect x="30" y="56" width="62" height="26" rx="13"/></g>
<g fill="#ffe082"><circle cx="38" cy="58" r="22"/><circle cx="62" cy="42" r="26"/><circle cx="86" cy="58" r="20"/><rect x="32" y="56" width="58" height="24" rx="12"/></g>
<circle cx="52" cy="54" r="5" fill="#3a2a3a"/>${wink ? '<path class="wink-eye" d="M66 54 q6 -6 12 0" stroke="#3a2a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' : '<circle cx="72" cy="54" r="5" fill="#3a2a3a"/>'}
<path d="M50 66 q12 12 24 0" stroke="#3a2a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<ellipse cx="44" cy="64" rx="5" ry="3" fill="#ff8a80" opacity=".7"/><ellipse cx="80" cy="64" rx="5" ry="3" fill="#ff8a80" opacity=".7"/></svg>`;
}

export function judgeSVG(id, size = 96) {
  const face = `<circle cx="50" cy="52" r="30" fill="#ffd8b5" stroke="#c98d5b" stroke-width="2.5"/>`;
  const smile = `<path d="M38 64 q12 10 24 0" stroke="#5a3a2a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (id === 'prof') {
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="Professor Toot"><circle cx="50" cy="50" r="48" fill="#ede7f6"/>
<path d="M20 44 q-6 -24 14 -26 q4 -10 16 -6 q12 -6 18 4 q18 0 14 26" fill="#fff" stroke="#bbb" stroke-width="2"/>${face}
<circle cx="40" cy="48" r="8" fill="none" stroke="#5e35b1" stroke-width="3"/><circle cx="60" cy="48" r="8" fill="none" stroke="#5e35b1" stroke-width="3"/><path d="M48 48 h4" stroke="#5e35b1" stroke-width="3"/>
<circle cx="40" cy="48" r="2.5" fill="#333"/><circle cx="60" cy="48" r="2.5" fill="#333"/>
<path d="M36 60 q14 -6 28 0 q-14 4 -28 0z" fill="#fff" stroke="#bbb"/>${smile}
<path d="M30 84 l20 -6 l20 6 v14 h-40z" fill="#fff" stroke="#bbb"/></svg>`;
  }
  if (id === 'reggie') {
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="Sir Reginald Pardonme"><circle cx="50" cy="50" r="48" fill="#e0f2f1"/>
<rect x="30" y="4" width="40" height="26" rx="3" fill="#263238"/><rect x="22" y="28" width="56" height="6" rx="3" fill="#263238"/>${face}
<circle cx="40" cy="50" r="2.8" fill="#333"/><circle cx="60" cy="50" r="7" fill="none" stroke="#c9a227" stroke-width="2.5"/><circle cx="60" cy="50" r="2.8" fill="#333"/><path d="M66 55 q4 14 -2 26" stroke="#c9a227" stroke-width="1.5" fill="none"/>
<path d="M36 61 q7 -5 14 0 q7 -5 14 0 q-7 5 -14 1 q-7 4 -14 -1z" fill="#6d4c41"/>
<path d="M42 70 q8 4 16 0" stroke="#5a3a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M40 84 l10 6 l10 -6 l-10 -4z" fill="#00897b"/></svg>`;
  }
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-label="Coach Blast"><circle cx="50" cy="50" r="48" fill="#fff3e0"/>
<path d="M20 44 q30 -36 60 0z" fill="#ef6c00"/><rect x="58" y="38" width="28" height="7" rx="3" fill="#ef6c00"/>${face}
<circle cx="40" cy="50" r="3" fill="#333"/><circle cx="60" cy="50" r="3" fill="#333"/>
<ellipse cx="50" cy="66" rx="10" ry="7" fill="#5a3a2a"/><path d="M18 52 q-6 12 4 18" stroke="#333" stroke-width="3" fill="none"/><circle cx="24" cy="72" r="5" fill="#333"/>
<path d="M30 86 h40 v12 h-40z" fill="#ef6c00"/></svg>`;
}

export function beakersSVG() {
  return `<svg viewBox="0 0 220 120" width="100%" height="120" aria-hidden="true">
<g class="bubbles"><circle cx="50" cy="40" r="5"/><circle cx="60" cy="30" r="4"/><circle cx="110" cy="25" r="6"/><circle cx="170" cy="35" r="5"/><circle cx="162" cy="22" r="3"/></g>
<path d="M35 50 h30 v10 l18 50 h-66 l18 -50z" fill="#b2ebf2" stroke="#00838f" stroke-width="3"/><path d="M22 95 l10 -26 h36 l10 26z" fill="#4dd0e1" class="liquid"/>
<path d="M95 40 h30 v60 a15 15 0 0 1 -30 0z" fill="#f8bbd0" stroke="#ad1457" stroke-width="3"/><path d="M95 70 h30 v30 a15 15 0 0 1 -30 0z" fill="#f06292" class="liquid"/>
<path d="M155 50 h30 v10 l18 50 h-66 l18 -50z" fill="#dcedc8" stroke="#558b2f" stroke-width="3"/><path d="M142 95 l10 -26 h36 l10 26z" fill="#9ccc65" class="liquid"/></svg>`;
}

export function trophySVG(size = 180) {
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">
<path d="M30 14 h60 v20 a30 30 0 0 1 -60 0z" fill="#ffca28" stroke="#c79a00" stroke-width="3"/>
<path d="M30 20 h-14 a14 14 0 0 0 16 22" fill="none" stroke="#c79a00" stroke-width="4"/><path d="M90 20 h14 a14 14 0 0 1 -16 22" fill="none" stroke="#c79a00" stroke-width="4"/>
<rect x="54" y="62" width="12" height="20" fill="#ffca28" stroke="#c79a00" stroke-width="3"/><rect x="36" y="82" width="48" height="14" rx="3" fill="#8d6e63" stroke="#5d4037" stroke-width="3"/>
<circle cx="50" cy="32" r="3" fill="#3a2a3a"/><circle cx="70" cy="32" r="3" fill="#3a2a3a"/><path d="M50 42 q10 8 20 0" stroke="#3a2a3a" stroke-width="3" fill="none" stroke-linecap="round"/>
<text x="60" y="114" font-size="12" text-anchor="middle" fill="#5d4037" font-weight="bold">CHAMPION</text></svg>`;
}

export function tootometerSVG() {
  return `<svg viewBox="0 0 200 120" width="220" height="132" aria-label="Tootometer">
<path d="M20 100 a80 80 0 0 1 160 0" fill="none" stroke="#e0e0e0" stroke-width="18"/>
<path d="M20 100 a80 80 0 0 1 53 -75" fill="none" stroke="#8bc34a" stroke-width="18"/>
<path d="M73 25 a80 80 0 0 1 54 0" fill="none" stroke="#ffb300" stroke-width="18"/>
<path d="M127 25 a80 80 0 0 1 53 75" fill="none" stroke="#e53935" stroke-width="18"/>
<g class="needle"><path d="M100 100 L100 30" stroke="#3a2a3a" stroke-width="5" stroke-linecap="round"/></g><circle cx="100" cy="100" r="9" fill="#3a2a3a"/>
<text x="100" y="118" text-anchor="middle" font-size="12" fill="#5d4b5d" font-weight="bold">TOOTOMETER</text></svg>`;
}
