import { rr, font, fitSingle } from './draw.mjs';

// Design « Stadium Relief » de l'appli (stadiumTheme.js), recopié à l'identique.
export const V = { base: '#1C2336', baseHi: '#222B42', baseLo: '#141B2D', ink: '#E7ECFB', muted: '#9AA4C6', muted2: '#646E92', emerald: '#33D98E', emeraldDeep: '#0D5E3E', indigo: '#818CF8' };
export const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function lin(ctx, x, y, w, h, c1, c2) { const g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }

// Relief (ombre claire en haut à gauche, sombre en bas à droite). k = échelle.
export function raised(ctx, x, y, w, h, r, k, fill) {
  ctx.save();
  const g = fill || lin(ctx, x, y, w, h, V.baseHi, V.base);
  for (const [c, b, o] of [['rgba(0,0,0,.55)', 11, 5], ['rgba(116,134,184,.16)', 9, -4]]) {
    rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.shadowColor = c; ctx.shadowBlur = b * k; ctx.shadowOffsetX = o * k; ctx.shadowOffsetY = o * k; ctx.fill();
  }
  ctx.restore();
}

// Creux (ombres intérieures).
export function inset(ctx, x, y, w, h, r, k, fill) {
  ctx.save();
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill || lin(ctx, x, y, w, h, V.base, V.baseLo); ctx.fill(); ctx.clip();
  ctx.lineWidth = 40; ctx.strokeStyle = '#000';
  for (const [c, b, o] of [['rgba(0,0,0,.5)', 10, 4], ['rgba(116,134,184,.12)', 8, -3]]) {
    rr(ctx, x - 20, y - 20, w + 40, h + 40, r + 20); ctx.shadowColor = c; ctx.shadowBlur = b * k; ctx.shadowOffsetX = o * k; ctx.shadowOffsetY = o * k; ctx.stroke();
  }
  ctx.restore();
}

export function t(ctx, s, x, y, size, fam, color, align) {
  font(ctx, size, fam); ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(String(s), x, y);
}
export function fitT(ctx, s, x, y, size, min, maxW, fam, color, align) {
  fitSingle(ctx, String(s), fam, size, min, maxW); ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(String(s), x, y);
}

export function bookLogo(ctx, img, x, yMid, h, maxW, name, F) {
  if (!img) { fitT(ctx, name, x, yMid + h * 0.3, h * 0.7, 6, maxW, F.black, V.ink); return; }
  let w = (img.width * h) / img.height, hh = h;
  if (w > maxW) { w = maxW; hh = (img.height * w) / img.width; }
  ctx.drawImage(img, x, yMid - hh / 2, w, hh);
}

export function clock(ctx, cx, cy, r, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.45, cy + r * 0.25); ctx.stroke(); ctx.restore();
}

export function calcIcon(ctx, x, y, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.12;
  rr(ctx, x, y, s * 0.8, s, s * 0.14); ctx.stroke();
  ctx.fillRect(x + s * 0.18, y + s * 0.16, s * 0.44, s * 0.18);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(x + s * (0.26 + 0.28 * j), y + s * (0.55 + 0.24 * i), s * 0.06, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

export function arrowsIcon(ctx, cx, cy, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const a = (y, dir) => { ctx.beginPath(); ctx.moveTo(cx - s * 0.45 * dir, y); ctx.lineTo(cx + s * 0.45 * dir, y); ctx.moveTo(cx + s * 0.22 * dir, y - s * 0.22); ctx.lineTo(cx + s * 0.45 * dir, y); ctx.lineTo(cx + s * 0.22 * dir, y + s * 0.22); ctx.stroke(); };
  a(cy - s * 0.22, 1); a(cy + s * 0.22, -1); ctx.restore();
}

export function check(ctx, cx, cy, r, p) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p);
  ctx.fillStyle = V.emerald; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#06101F'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-r * 0.42, 0); ctx.lineTo(-r * 0.1, r * 0.32); ctx.lineTo(r * 0.45, -r * 0.3); ctx.stroke(); ctx.restore();
}

// Bouton émeraude « Calculer ma mise » (plein largeur de la carte).
export function calcButton(ctx, x, y, w, h, r, F, press) {
  ctx.save();
  const g = lin(ctx, x, y, w, h, V.emerald, V.emeraldDeep); rr(ctx, x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
  if (press > 0) { ctx.globalAlpha = 0.35 * Math.sin(Math.PI * press); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.globalAlpha = 1; }
  font(ctx, 13, F.xb); const tw = ctx.measureText('Calculer ma mise').width, x0 = x + w / 2 - (tw + 20) / 2;
  calcIcon(ctx, x0, y + h / 2 - 7, 14, '#FFFFFF');
  t(ctx, 'Calculer ma mise', x0 + 20, y + h / 2 + 4.5, 13, F.xb, '#FFFFFF');
  ctx.restore();
}
