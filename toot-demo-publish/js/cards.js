// On-device share cards (1080x1350 PNG). No face, voice, name or location on any card.
import { creatureSVG } from './creatures.js';

function wrap(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function svgToImage(svg) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// spec: {kind, title, subtitle, big, lines[], species?, accent}
export async function renderCard(spec) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(1, spec.accent ? spec.accent + '55' : '#ffd1e8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // confetti dots
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = ['#ff7043', '#7e57c2', '#29b6f6', '#8bc34a', '#ffb300'][i % 5] + '66';
    ctx.beginPath();
    ctx.arc((i * 197) % W, (i * 331) % H, 6 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 60, 60, W - 120, H - 120, 48);
  ctx.fill();
  ctx.strokeStyle = spec.accent || '#7e57c2';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = spec.accent || '#7e57c2';
  ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText(spec.kind.toUpperCase(), W / 2, 150);
  ctx.fillStyle = '#3a2a3a';
  ctx.font = 'bold 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  let y = 240;
  for (const l of wrap(ctx, spec.title, W - 220)) { ctx.fillText(l, W / 2, y); y += 74; }
  if (spec.species) {
    const img = await svgToImage(creatureSVG(spec.species, 420));
    if (img) ctx.drawImage(img, W / 2 - 210, y - 10, 420, 420);
    y += 430;
  }
  if (spec.big) {
    ctx.font = 'bold 150px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = spec.accent || '#ff7043';
    ctx.fillText(spec.big, W / 2, y + 120);
    y += 170;
  }
  if (spec.subtitle) {
    ctx.font = 'bold 46px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillStyle = '#5d4b5d';
    for (const l of wrap(ctx, spec.subtitle, W - 220)) { ctx.fillText(l, W / 2, y); y += 58; }
    y += 10;
  }
  ctx.font = '40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#3a2a3a';
  for (const para of spec.lines || []) {
    for (const l of wrap(ctx, para, W - 240)) { if (y > H - 170) break; ctx.fillText(l, W / 2, y); y += 52; }
    y += 18;
  }
  ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = '#9e8a9e';
  ctx.fillText('Toot! The family prank & collect game (demo)', W / 2, H - 110);
  ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText(location.host || 'toot', W / 2, H - 72);
  return await new Promise((res) => c.toBlob(res, 'image/png'));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
