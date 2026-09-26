// Couche « motion design » façon After Effects, calée sur la voix :
// tracés qui se dessinent (trim path), flèches, crochets, ondes de choc,
// éclats, volets de transition, iris, lueurs, vignette et grain de film.
import { createCanvas } from '@napi-rs/canvas';
import { W, H, clamp, prog, easeOut, rgba, rr, seeded } from './draw.mjs';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Instant (local à la scène) où un mot est prononcé ; sinon valeur par défaut.
export function wordAt(sc, re, fallback) {
  const w = (sc.words || []).find((x) => re.test(norm(x.text)));
  if (!w) return fallback;
  return (sc.voiceAt - sc.start) + w.start * sc.voiceDur;
}

// Trait qui se dessine progressivement (p de 0 à 1).
function trim(ctx, path, len, p, color, width) {
  if (p <= 0) return;
  ctx.save();
  ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 22;
  ctx.setLineDash([len, len]); ctx.lineDashOffset = len * (1 - clamp(p, 0, 1));
  path(ctx); ctx.stroke();
  ctx.restore();
}

// Cadre arrondi qui se trace autour d'un élément, puis coins en crochets.
export function boxOn(ctx, x, y, w, h, lt, at, color) {
  const p = easeOut(prog(lt, at, 0.5));
  trim(ctx, (c) => rr(c, x, y, w, h, 26), 2 * (w + h), p, color, 7);
  const q = easeOut(prog(lt, at + 0.35, 0.3));
  if (q <= 0) return;
  const k = 34 * q, pad = 18;
  ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.globalAlpha = q;
  const corner = (cx, cy, sx, sy) => { ctx.beginPath(); ctx.moveTo(cx + sx * k, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * k); ctx.stroke(); };
  corner(x - pad, y - pad, 1, 1); corner(x + w + pad, y - pad, -1, 1);
  corner(x - pad, y + h + pad, 1, -1); corner(x + w + pad, y + h + pad, -1, -1);
  ctx.restore();
}

// Flèche courbe qui se dessine, pointe qui « claque » à l'arrivée.
export function arrowOn(ctx, x0, y0, cx, cy, x1, y1, lt, at, color) {
  const p = easeOut(prog(lt, at, 0.45));
  trim(ctx, (c) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); }, Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy), p, color, 8);
  const h = prog(lt, at + 0.38, 0.15);
  if (h <= 0) return;
  const a = Math.atan2(y1 - cy, x1 - cx), s = 34 * (0.6 + 0.4 * h);
  ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.translate(x1, y1); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-s, -s * 0.6); ctx.lineTo(-s, s * 0.6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Soulignement qui glisse sous un texte.
export function underline(ctx, x0, x1, y, lt, at, color) {
  trim(ctx, (c) => { c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + 14, x1, y - 4); }, (x1 - x0) * 1.05, easeOut(prog(lt, at, 0.4)), color, 10);
}

// Anneau tracé autour d'un cercle (logos, jauge).
export function ringOn(ctx, cx, cy, r, lt, at, color) {
  const p = easeOut(prog(lt, at, 0.6));
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.stroke();
  ctx.restore();
}

// Onde de choc + éclats radiaux au moment d'un impact.
export function shock(ctx, cx, cy, lt, at, color) {
  const d = lt - at;
  if (d < 0 || d > 0.7) return;
  const p = d / 0.7, e = easeOut(p);
  ctx.save(); ctx.globalAlpha = 1 - p;
  ctx.strokeStyle = color; ctx.lineWidth = 14 * (1 - p) + 2;
  ctx.beginPath(); ctx.arc(cx, cy, 60 + 420 * e, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = '#FFFFFF'; ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2, r0 = 90 + 260 * e, r1 = r0 + 70 * (1 - p);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
  }
  ctx.restore();
}

// Annotations propres à chaque scène (dessinées sur le calque de la scène).
export function sceneFx(ctx, env, sc, lt) {
  const pal = env.pal;
  const T = fxTimes(env, sc);
  if (sc.kind === 'hook') shock(ctx, 540, 860, lt, 0.2, pal.a);
  if (sc.kind === 'match') {
    ringOn(ctx, 280, 660, 172, lt, 0.55, pal.a); ringOn(ctx, 800, 660, 172, lt, 0.7, pal.b);
    shock(ctx, 540, 690, lt, 0.5, pal.hi);
    if (T.score != null) boxOn(ctx, 330, 1115, 420, 140, lt, T.score, pal.hi);
  }
  if (sc.kind === 'pick') {
    underline(ctx, 200, 880, 725, lt, T.label, pal.a);
    boxOn(ctx, 150, 880, 320, 170, lt, T.cote, pal.hi);
    arrowOn(ctx, 470, 870, 560, 760, 630, 870, lt, T.conf, '#FFFFFF');
    ringOn(ctx, 760, 935, 152, lt, T.conf + 0.2, pal.hi);
  }
  if (sc.kind === 'combo' && T.total != null) {
    const n = env.picks.length, y = 450 + n * 165 + 40 + 200;
    shock(ctx, 540, y - 60, lt, T.total, pal.hi);
    boxOn(ctx, 290, y - 170, 500, 200, lt, T.total + 0.1, pal.hi);
  }
  if (sc.kind === 'outro') {
    boxOn(ctx, 250, 1030, 580, 110, lt, 0.9, pal.hi);
    arrowOn(ctx, 900, 330, 980, 470, 930, 560, lt, 0.4, pal.hi);
  }
}

// Instants des annotations (partagés avec les bruitages).
export function fxTimes(env, sc) {
  const t = {};
  if (sc.kind === 'match') t.score = wordAt(sc, /^(score|un|deux|trois|zero|\d)/, 1.3);
  if (sc.kind === 'pick') {
    t.label = Math.max(0.6, wordAt(sc, /./, 0.6));
    t.cote = Math.max(1.0, wordAt(sc, /^cote/, 1.4));
    t.conf = Math.max(t.cote + 0.6, wordAt(sc, /^fiabilit/, 2.2));
  }
  if (sc.kind === 'combo') t.total = 0.5 + 0.15 * env.picks.length + 0.9;
  return t;
}

// Bruitages des annotations : trait (« swish »), pointe de flèche (« pop »).
export function fxEvents(tl, env) {
  const ev = [];
  tl.scenes.forEach((s) => {
    const T = fxTimes(env, s), at = (x) => s.start + x;
    if (s.kind === 'match') { ev.push({ name: 'whoosh', at: at(0.55), vol: 0.25 }); if (T.score != null) ev.push({ name: 'whoosh', at: at(T.score), vol: 0.3 }, { name: 'tap', at: at(T.score + 0.4), vol: 0.4 }); }
    if (s.kind === 'pick') ev.push({ name: 'whoosh', at: at(T.label), vol: 0.22 }, { name: 'whoosh', at: at(T.cote), vol: 0.3 }, { name: 'tap', at: at(T.cote + 0.4), vol: 0.45 }, { name: 'pop', at: at(T.conf + 0.4), vol: 0.45 });
    if (s.kind === 'outro') ev.push({ name: 'pop', at: at(0.8), vol: 0.4 }, { name: 'whoosh', at: at(0.9), vol: 0.25 });
  });
  return ev;
}

// Volets de transition : trois bandes obliques aux couleurs de la vidéo.
export function wipeBars(ctx, env, lt) {
  if (lt > 0.55) return;
  const cols = [env.pal.a, env.pal.b, env.pal.hi];
  ctx.save(); ctx.translate(540, 960); ctx.rotate(-0.35); ctx.translate(-540, -960);
  cols.forEach((c, i) => {
    const p = easeOut(prog(lt, i * 0.05, 0.42)), x = -1500 + p * 3600;
    ctx.fillStyle = c; ctx.fillRect(x - 700 + i * 180, -600, 520, H + 1200);
  });
  ctx.restore();
}

// Lueur colorée (light leak) qui traverse l'image aux transitions.
export function lightLeak(ctx, env, lt, seed) {
  if (lt > 1.1) return;
  const p = prog(lt, 0, 1.1), r = seeded(seed + 3), x = -300 + p * 1700, y = 300 + r() * 1300;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 700);
  g.addColorStop(0, rgba(env.pal.hi, 0.28 * Math.sin(Math.PI * p))); g.addColorStop(1, rgba(env.pal.hi, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// Finition cinéma : vignette + grain de film léger et vivant.
let grain = null;
export function finish(ctx, t) {
  const v = ctx.createRadialGradient(540, 960, 520, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (!grain) {
    grain = createCanvas(256, 256); const g = grain.getContext('2d'), img = g.createImageData(256, 256), r = seeded(42);
    for (let i = 0; i < img.data.length; i += 4) { const n = Math.floor(r() * 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  }
  const f = Math.floor(t * 30), ox = (f * 97) % 256, oy = (f * 61) % 256;
  ctx.save(); ctx.globalAlpha = 0.045;
  for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) ctx.drawImage(grain, x, y);
  ctx.restore();
}
