// Boîte à outils commune aux deux styles « v2 » (Télé et Face-à-face).
import { createCanvas } from '@napi-rs/canvas';
import { W, H, clamp, prog, easeOut, easeBack, rgba, rr, font, isHi, seeded } from '../draw.mjs';
export { W, H, clamp, prog, easeOut, easeBack, rgba, rr, font, isHi, seeded };

export const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const lerp = (a, b, p) => a + (b - a) * p;
export const idx = (env, sc) => clamp(Math.round(Number(sc.match_index) || 0), 0, env.picks.length - 1);

export function hexRgb(hex) { const n = parseInt(String(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, p) { const x = hexRgb(a), y = hexRgb(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * p).toString(16).padStart(2, '0')).join(''); }
export const lum = (h) => { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const dist = (a, b) => { const x = hexRgb(a), y = hexRgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

// Couleur dominante d'un logo (pixels vraiment colorés), sinon null.
export function logoColor(img) {
  if (!img) return null;
  const c = createCanvas(40, 40), x = c.getContext('2d');
  const k = Math.min(40 / img.width, 40 / img.height);
  x.drawImage(img, (40 - img.width * k) / 2, (40 - img.height * k) / 2, img.width * k, img.height * k);
  const d = x.getImageData(0, 0, 40, 40).data, bins = {};
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (d[i + 3] < 200) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 60 || mx - mn < 70) continue;
    const key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5);
    const e = bins[key] || (bins[key] = { n: 0, r: 0, g: 0, b: 0 });
    e.n++; e.r += r; e.g += g; e.b += b;
  }
  const best = Object.values(bins).sort((a, b) => b.n - a.n)[0];
  if (!best || best.n < 12) return null;
  const h = (v) => Math.round(v / best.n).toString(16).padStart(2, '0');
  return '#' + h(best.r) + h(best.g) + h(best.b);
}

export function teamColors(logos, pal) {
  return logos.map((L) => {
    const h = logoColor(L.home) || pal.a;
    let a = logoColor(L.away) || '#E5484D';
    if (dist(h, a) < 90) a = dist(h, '#E5484D') > 120 ? '#E5484D' : '#2563EB';
    return { home: h, away: a };
  });
}

export function txt(ctx, s, x, y, size, fam, color, align, stroke) {
  font(ctx, size, fam);
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = stroke; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(String(s), x, y); }
  ctx.fillStyle = color; ctx.fillText(String(s), x, y);
}

export function fit(ctx, s, fam, size, min, maxW) {
  let z = size; font(ctx, z, fam);
  while (z > min && ctx.measureText(String(s)).width > maxW) { z -= 2; font(ctx, z, fam); }
  return z;
}

// Lignes de mots (retour à la ligne automatique) avec taille réduite si besoin.
export function lines(ctx, text, fam, size, min, maxW, maxLines) {
  let z = size;
  for (;;) {
    font(ctx, z, fam);
    const out = []; let cur = '';
    for (const w of String(text).split(/\s+/).filter(Boolean)) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
    const widest = Math.max(0, ...out.map((l) => ctx.measureText(l).width));
    if ((out.length <= maxLines && widest <= maxW) || z <= min) return { lines: out, size: z };
    z -= 4;
  }
}

// Pastille logo : disque blanc bombé, anneau à la couleur du club, reflet.
export function disc(ctx, env, img, name, cx, cy, r, ring) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = r * 0.35; ctx.shadowOffsetY = r * 0.08;
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D5DAE4');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (ring) { ctx.lineWidth = Math.max(3, r * 0.08); ctx.strokeStyle = ring; ctx.stroke(); }
  if (img) {
    const s = r * 1.32, k = Math.min(s / img.width, s / img.height);
    ctx.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
  } else {
    const ini = String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    txt(ctx, ini, cx, cy + r * 0.25, Math.round(r * 0.7), env.F.display, '#0B1020');
  }
  const gl = ctx.createLinearGradient(cx, cy - r, cx, cy);
  gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.45, r * 0.78, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Coche dessinée (pas d'émoji).
export function check(ctx, cx, cy, r, color, p) {
  if (p <= 0) return;
  ctx.save();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r * easeBack(clamp(p * 1.4, 0, 1))), 0, Math.PI * 2); ctx.fill();
  const q = clamp((p - 0.35) / 0.65, 0, 1);
  if (q > 0) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const a = [cx - r * 0.45, cy + r * 0.02], b = [cx - r * 0.1, cy + r * 0.36], c = [cx + r * 0.5, cy - r * 0.34];
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    if (q < 0.4) ctx.lineTo(lerp(a[0], b[0], q / 0.4), lerp(a[1], b[1], q / 0.4));
    else { ctx.lineTo(b[0], b[1]); ctx.lineTo(lerp(b[0], c[0], (q - 0.4) / 0.6), lerp(b[1], c[1], (q - 0.4) / 0.6)); }
    ctx.stroke();
  }
  ctx.restore();
}

// Bouton « S'abonner » qu'on voit se faire presser.
export function subscribe(ctx, env, cy, lt, at) {
  const a = easeBack(prog(lt, 0.2, 0.45));
  if (a <= 0) return;
  const press = lt > at && lt < at + 0.18 ? 0.9 : 1, done = lt >= at + 0.18;
  ctx.save(); ctx.translate(540, cy); ctx.scale(a * press, a * press);
  rr(ctx, -270, -62, 540, 124, 62); ctx.fillStyle = done ? '#3A3F4B' : '#FF0033'; ctx.fill();
  txt(ctx, done ? 'ABONNÉ' : "S'ABONNER", done ? 30 : 0, 18, 50, env.F.black, '#FFFFFF');
  if (done) check(ctx, -150, 0, 26, '#22C55E', prog(lt, at + 0.18, 0.4));
  ctx.restore();
  if (lt > at && lt < at + 0.5) {
    const q = prog(lt, at, 0.5);
    ctx.save(); ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(540, cy, 80 + q * 260, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
}

const wordAt = (sc, i) => sc.voiceAt + sc.words[i].start * sc.voiceDur;
const show = (w) => (/alvecapital\.fr/i.test(w) ? w.toLowerCase() : w.toUpperCase());

// Typographie animée : chaque mot surgit à l'instant exact où il est prononcé.
export function kinetic(ctx, env, sc, t, o) {
  const words = sc.words.map((w) => show(w.text));
  if (!words.length) return;
  const F = env.F;
  let z = o.size, rows;
  for (;;) {
    font(ctx, z, F.display);
    const sp = ctx.measureText(' ').width;
    rows = []; let cur = [], w = 0;
    words.forEach((s, i) => {
      const ww = ctx.measureText(s).width;
      if (cur.length && w + sp + ww > o.maxW) { rows.push({ items: cur, w }); cur = []; w = 0; }
      if (cur.length) w += sp;
      cur.push({ i, s, ww, x: w }); w += ww;
    });
    if (cur.length) rows.push({ items: cur, w });
    const widest = Math.max(...rows.map((r) => r.w));
    if ((rows.length <= o.maxLines && widest <= o.maxW) || z <= o.min) break;
    z -= 6;
  }
  const lh = z * 1.04, y0 = o.cy - ((rows.length - 1) * lh) / 2 + z * 0.36;
  const arena = o.mode === 'arena';
  rows.forEach((row, r) => {
    const y = y0 + r * lh, x0 = 540 - row.w / 2;
    row.items.forEach((it) => {
      const at = wordAt(sc, it.i) - 0.05, p = prog(t, at, arena ? 0.16 : 0.22);
      if (p <= 0) return;
      const e = easeOut(p), hi = isHi(sc.words[it.i].text, sc.highlight), cx = x0 + it.x + it.ww / 2, my = y - z * 0.36;
      const s = arena ? 1.3 - 0.3 * e : 1 + 0.45 * (1 - e);
      ctx.save(); ctx.globalAlpha = clamp(p * 1.6, 0, 1);
      ctx.translate(cx, my + (arena ? 0 : 36 * (1 - e))); ctx.scale(s, s); ctx.translate(-cx, -my);
      font(ctx, z, F.display); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      if (arena) {
        if (p < 1) {
          ctx.globalAlpha = 0.4 * (1 - p);
          ctx.fillStyle = '#FF2E63'; ctx.fillText(it.s, cx - 6 * (1 - p), y);
          ctx.fillStyle = '#08F7FE'; ctx.fillText(it.s, cx + 6 * (1 - p), y);
          ctx.globalAlpha = clamp(p * 1.6, 0, 1);
        }
        ctx.lineJoin = 'round'; ctx.lineWidth = z * 0.09; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.strokeText(it.s, cx, y);
        if (hi) {
          const g = ctx.createLinearGradient(0, y - z * 0.8, 0, y);
          g.addColorStop(0, '#FFF3B0'); g.addColorStop(0.5, '#FFB020'); g.addColorStop(1, '#FF4D00');
          ctx.shadowColor = 'rgba(255,120,0,0.9)'; ctx.shadowBlur = 40; ctx.fillStyle = g;
        } else ctx.fillStyle = '#FFFFFF';
        ctx.fillText(it.s, cx, y);
      } else {
        if (hi) {
          const q = inOut(prog(t, at + 0.06, 0.22));
          ctx.save(); ctx.translate(x0 + it.x - 14, y - z * 0.82); ctx.transform(1, 0, -0.18, 1, 0, 0);
          ctx.fillStyle = env.accent; ctx.fillRect(0, 0, (it.ww + 28) * q, z * 0.98); ctx.restore();
          ctx.fillStyle = q > 0.5 ? '#0B1020' : '#FFFFFF';
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 26; ctx.fillStyle = '#FFFFFF';
        }
        ctx.fillText(it.s, cx, y);
      }
      ctx.restore();
    });
  });
}

// Sous-titres : 1 à 3 mots, le mot prononcé est surligné.
export function subs(ctx, env, sc, t, y, mode) {
  if (!sc.words.length) return;
  const lt = t - sc.voiceAt, d = sc.voiceDur;
  if (lt < 0 || lt > d + 0.3) return;
  let k = sc.words.findIndex((w) => lt < w.end * d);
  if (k < 0) k = sc.words.length - 1;
  const chunk = sc.chunks.find((c) => k >= c.from && k <= c.to) || sc.chunks[0];
  const list = sc.words.slice(chunk.from, chunk.to + 1).map((w) => show(w.text));
  const F = env.F;
  let size = 64; font(ctx, size, F.black);
  let width = ctx.measureText(list.join(' ')).width;
  while (width > 940 && size > 40) { size -= 4; font(ctx, size, F.black); width = ctx.measureText(list.join(' ')).width; }
  const space = ctx.measureText(' ').width;
  let x = 540 - width / 2;
  const pop = 0.88 + 0.12 * easeBack(prog(lt, sc.words[chunk.from].start * d, 0.14));
  ctx.save(); ctx.translate(540, y); ctx.scale(pop, pop); ctx.translate(-540, -y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  list.forEach((w, i) => {
    const wi = chunk.from + i, ww = ctx.measureText(w).width, on = wi === k;
    if (on && mode === 'box') {
      ctx.save(); ctx.translate(x + ww / 2, y - size * 0.32); ctx.rotate(-0.025);
      rr(ctx, -ww / 2 - 14, -size * 0.64, ww + 28, size * 1.14, 12); ctx.fillStyle = env.accent; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#0B1020';
    } else {
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.strokeText(w, x, y);
      ctx.fillStyle = on ? env.hot : (wi < k ? '#FFFFFF' : 'rgba(255,255,255,0.6)');
    }
    ctx.fillText(w, x, y);
    x += ww + space;
  });
  ctx.restore();
}

// Vrai logo du site (image envoyée par l'appli), centré en (cx, cy). false si absent.
export function brand(ctx, env, cx, cy, size) {
  const L = env.logo; if (!L || !(size > 1)) return false;
  const k = size / Math.max(L.width, L.height), w = L.width * k, h = L.height * k;
  ctx.drawImage(L, cx - w / 2, cy - h / 2, w, h); return true;
}
