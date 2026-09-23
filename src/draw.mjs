export const W = 1080, H = 1920, FPS = 30;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const prog = (t, start, dur) => clamp((t - start) / dur, 0, 1);
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);
export const easeBack = (p) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

export function rgba(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function font(ctx, size, fam) { ctx.font = size + 'px ' + fam; }

export function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = []; let cur = [];
  for (const w of words) {
    const test = cur.concat(w).join(' ');
    if (cur.length && ctx.measureText(test).width > maxW) { lines.push(cur); cur = [w]; } else cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines.length ? lines : [[' ']];
}

// Texte sur plusieurs lignes : réduit la taille jusqu'à ce que tout tienne.
export function fitLines(ctx, text, fam, size, minSize, maxW, maxLines) {
  let s = size;
  for (;;) {
    font(ctx, s, fam);
    const lines = wrap(ctx, text, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l.join(' ')).width));
    if ((lines.length <= maxLines && widest <= maxW) || s <= minSize) return { lines, size: s };
    s -= 4;
  }
}

export function fitSingle(ctx, s, fam, size, min, maxW) {
  let z = size; font(ctx, z, fam);
  while (z > min && ctx.measureText(String(s)).width > maxW) { z -= 2; font(ctx, z, fam); }
  return z;
}

// Ligne de mots centrée, chaque mot avec sa couleur (contour noir optionnel).
export function drawWords(ctx, words, cx, y, colorOf, stroke) {
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  words.forEach((w, i) => {
    if (stroke) { ctx.lineWidth = stroke; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(w, x, y); }
    ctx.fillStyle = colorOf(w, i);
    ctx.fillText(w, x, y);
    x += widths[i] + space;
  });
}

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
export function isHi(word, highlight) {
  if (!highlight) return false;
  const w = norm(word);
  return !!w && String(highlight).split(/\s+/).some((h) => norm(h) === w);
}

// Texte centré (lueur optionnelle).
export function tc(ctx, s, x, y, size, fam, color, glow) {
  font(ctx, size, fam);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 30; }
  ctx.fillText(String(s), x, y);
  ctx.shadowBlur = 0;
}

export function shakeAt(lt, at, amp) {
  const d = lt - at;
  if (d < 0 || d > 0.35) return 0;
  return amp * (1 - d / 0.35) * Math.sin(d * 90);
}
