// Slides animées façon keynote / After Effects pour la vidéo longue (1920x1080).
// Tout est piloté par la voix : chaque élément apparaît à l'instant où il est dit.
import { clamp, prog, easeOut, easeBack, rgba, rr, font } from './draw.mjs';

const W = 1920, H = 1080, INK = '#0B1020', MUTE = '#5B6478', PAPER = '#F7F8FC';
const COL = { mint: '#10B981', cyan: '#0E7490', red: '#EF4444', gold: '#D97706', indigo: '#4F46E5' };
const T = (s, f) => (s.voiceAt - s.start) + s.voiceDur * f;
const acc = (L) => COL[L.hue] || COL.cyan;
const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function tx(ctx, str, x, y, size, fam, color, align = 'center', maxW = 0) {
  let z = size; font(ctx, z, fam);
  while (maxW && z > 16 && ctx.measureText(str).width > maxW) { z -= 2; font(ctx, z, fam); }
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y);
  return ctx.measureText(str).width;
}
function panel(ctx, x, y, w, h, r, fill, lift = 1) {
  ctx.fillStyle = 'rgba(15,23,42,' + (0.08 * lift) + ')'; rr(ctx, x + 6, y + 14, w, h, r); ctx.fill();
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
}
function check(ctx, x, y, r, p, color) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); const a = [x - r * 0.45, y], b = [x - r * 0.1, y + r * 0.35], c = [x + r * 0.5, y - r * 0.35];
  const q = clamp(p * 2, 0, 1), q2 = clamp(p * 2 - 1, 0, 1);
  ctx.moveTo(...a); ctx.lineTo(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q);
  if (q2 > 0) ctx.lineTo(b[0] + (c[0] - b[0]) * q2, b[1] + (c[1] - b[1]) * q2);
  ctx.stroke(); ctx.restore();
}

// Décor : papier clair, grille de points qui dérive, formes géométriques en mouvement,
// et un volet de couleur qui balaie l'écran à l'entrée (transition de slide).
function backdrop(ctx, s, lt, t, c) {
  const v = (s.look && s.look.bg != null) ? s.look.bg : Math.abs(Math.round((s.start || 0) * 7)) % 4;
  const g = ctx.createLinearGradient(0, 0, W, H);
  if (v === 1) { g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, rgba(c, 0.10)); }
  else if (v === 2) { g.addColorStop(0, rgba(c, 0.08)); g.addColorStop(1, '#F1F4FA'); }
  else if (v === 3) { g.addColorStop(0, '#EEF2F8'); g.addColorStop(0.6, '#FFFFFF'); g.addColorStop(1, rgba(c, 0.07)); }
  else { g.addColorStop(0, PAPER); g.addColorStop(1, PAPER); }
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const off = (t * 18) % 48;
  if (v === 1) { ctx.strokeStyle = rgba(c, 0.07); ctx.lineWidth = 3; for (let x = -H; x < W + H; x += 70) { ctx.beginPath(); ctx.moveTo(x + off, 0); ctx.lineTo(x + off - H, H); ctx.stroke(); } }
  else if (v === 2) { ctx.strokeStyle = 'rgba(11,16,32,0.05)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x + off % 80, 0); ctx.lineTo(x + off % 80, H); ctx.stroke(); } for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y + off % 80); ctx.lineTo(W, y + off % 80); ctx.stroke(); } }
  else if (v === 3) { ctx.strokeStyle = rgba(c, 0.09); ctx.lineWidth = 4; for (let k = 0; k < 5; k++) { ctx.beginPath(); for (let x = 0; x <= W; x += 40) { const y = H * (0.2 + k * 0.17) + Math.sin(x / 180 + t * 0.8 + k) * 26; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); } }
  else { ctx.fillStyle = 'rgba(11,16,32,0.06)'; for (let x = -48; x < W + 48; x += 48) for (let y = -48; y < H + 48; y += 48) { ctx.beginPath(); ctx.arc(x + off, y + off * 0.5, 2, 0, 6.283); ctx.fill(); } }
  [[0.1, 0.85, 220, 0.5], [0.92, 0.18, 280, 0.35], [0.8, 0.9, 140, 0.7]].forEach(([fx, fy, r, sp], i) => {
    const x = W * fx + Math.sin(t * sp + i) * 40, y = H * fy + Math.cos(t * sp + i) * 30;
    ctx.fillStyle = rgba(c, 0.07 + i * 0.02); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  });
  ctx.save(); ctx.translate(W * 0.86, H * 0.55); ctx.rotate(t * 0.25); ctx.strokeStyle = rgba(c, 0.18); ctx.lineWidth = 6;
  rr(ctx, -70, -70, 140, 140, 24); ctx.stroke(); ctx.restore();
  ctx.fillStyle = c; ctx.fillRect(0, 0, 14, H);
  const w1 = easeOut(prog(lt, 0, 0.45)), w2 = easeOut(prog(lt, 0.12, 0.45));
  if (w2 < 1) { ctx.fillStyle = c; ctx.fillRect(W * w1, 0, W * (1 - w1), H); ctx.fillStyle = INK; ctx.fillRect(W * w2, 0, W * (1 - w2) * 0.35 * (1 - w2), H); }
}
function header(ctx, env, L, lt, c) {
  if (L.kicker) {
    const a = easeBack(prog(lt, 0.25, 0.5)); font(ctx, 26, env.F.xb);
    const w = ctx.measureText(L.kicker).width + 56;
    ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(-(1 - a) * 80, 0);
    ctx.fillStyle = rgba(c, 0.14); rr(ctx, 110, 84, w, 50, 25); ctx.fill();
    tx(ctx, L.kicker, 138, 118, 26, env.F.xb, c, 'left'); ctx.restore();
  }
  if (L.title) {
    const r = easeOut(prog(lt, 0.4, 0.7));
    ctx.save(); ctx.beginPath(); ctx.rect(100, 140, 1700 * r, 130); ctx.clip();
    tx(ctx, L.title, 110, 240, 84, env.F.display, INK, 'left', 1650); ctx.restore();
    ctx.fillStyle = c; ctx.fillRect(110, 262, 180 * r, 8);
  }
}
const times = (s, L, n, a = 0.06, b = 0.85) => (L.at && L.at.length >= n ? L.at : Array.from({ length: n }, (_, i) => a + ((b - a) * i) / Math.max(1, n))).map((f) => T(s, f));

const LAY = {
  // Grand titre de chapitre / phrase choc, lignes révélées une par une.
  title(ctx, env, s, lt, t, L, c) {
    const lines = L.lines || [L.title || ''], at = times(s, { at: L.at }, lines.length, 0.02, 0.6);
    const top = H / 2 - (lines.length * 130) / 2 + 60;
    if (L.num != null) { const a = easeBack(prog(lt, 0.2, 0.6)); ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); tx(ctx, String(L.num).padStart(2, '0'), 150, top - 90, 60, env.F.display, c, 'left'); ctx.restore(); }
    if (L.kicker) tx(ctx, L.kicker, 150, top - 150 + (L.num != null ? 0 : 60), 28, env.F.xb, MUTE, 'left');
    lines.forEach((ln, i) => {
      const p = easeOut(prog(lt, at[i], 0.55)), y = top + i * 130;
      ctx.save(); ctx.beginPath(); ctx.rect(140, y - 120, 1700, 150); ctx.clip();
      ctx.translate(0, (1 - p) * 140);
      const hi = L.hi != null && L.hi === i;
      if (hi) { font(ctx, 118, env.F.display); const w = Math.min(1660, ctx.measureText(ln).width); ctx.fillStyle = rgba(c, 0.18); ctx.fillRect(140, y - 70, (w + 30) * easeOut(prog(lt, at[i] + 0.4, 0.5)), 60); }
      tx(ctx, ln, 150, y, 118, env.F.display, hi ? c : INK, 'left', 1650); ctx.restore();
    });
  },
  // Liste à puces : chaque point glisse, sa pastille rebondit, puis une coche se dessine.
  bullets(ctx, env, s, lt, t, L, c) {
    const it = L.items || [], at = times(s, L, it.length), rowH = Math.min(150, 680 / Math.max(1, it.length));
    it.forEach((x, i) => {
      const p = easeBack(prog(lt, at[i], 0.55)); if (p <= 0) return;
      const y = 330 + i * rowH, act = lt >= at[i] && (i === it.length - 1 || lt < at[i + 1]);
      ctx.save(); ctx.globalAlpha *= clamp(p, 0, 1); ctx.translate((1 - p) * 260, 0);
      panel(ctx, 110, y, 1400, rowH - 24, 26, act ? '#FFFFFF' : 'rgba(255,255,255,0.75)', act ? 1.4 : 0.6);
      if (act) { ctx.fillStyle = c; rr(ctx, 110, y, 12, rowH - 24, 6); ctx.fill(); }
      const cy = y + (rowH - 24) / 2, z = easeBack(prog(lt, at[i] + 0.1, 0.5));
      ctx.save(); ctx.translate(190, cy); ctx.scale(z, z); ctx.fillStyle = act ? c : rgba(c, 0.18); ctx.beginPath(); ctx.arc(0, 0, 38, 0, 6.283); ctx.fill();
      if (L.check) check(ctx, 0, 0, 30, prog(lt, at[i] + 0.3, 0.4), act ? '#FFFFFF' : c); else tx(ctx, String(i + 1), 0, 16, 44, env.F.display, act ? '#FFFFFF' : c);
      ctx.restore();
      tx(ctx, typeof x === 'string' ? x : x.t, 260, cy + 16, Math.min(50, rowH * 0.4), env.F.xb, INK, 'left', 1200);
      if (typeof x === 'object' && x.sub) tx(ctx, x.sub, 1490, cy + 14, 36, env.F.display, c, 'right');
      ctx.restore();
    });
  },
  // Duel en deux colonnes : cartes qui entrent par les côtés, pastille VS qui tourne.
  versus(ctx, env, s, lt, t, L, c) {
    const sides = [L.left || {}, L.right || {}], n0 = (sides[0].items || []).length, n1 = (sides[1].items || []).length;
    const at = times(s, L, n0 + n1, 0.05, 0.92);
    sides.forEach((sd, k) => {
      const col = COL[sd.hue] || (k ? COL.cyan : COL.mint), x = k ? 1000 : 110, t0 = k ? at[n0] - 0.3 : 0.3;
      const p = easeOut(prog(lt, t0, 0.6)); if (p <= 0) return;
      ctx.save(); ctx.globalAlpha *= p; ctx.translate((k ? 1 : -1) * (1 - p) * 300, 0);
      panel(ctx, x, 310, 810, 700, 34, '#FFFFFF', 1.2);
      ctx.fillStyle = col; rr(ctx, x, 310, 810, 120, 34); ctx.fill(); ctx.fillRect(x, 380, 810, 50);
      tx(ctx, sd.title || '', x + 405, 392, 58, env.F.display, '#FFFFFF', 'center', 760);
      (sd.items || []).forEach((it, i) => {
        const tt = at[(k ? n0 : 0) + i], q = easeBack(prog(lt, tt, 0.5)); if (q <= 0) return;
        const y = 490 + i * 120; ctx.save(); ctx.globalAlpha *= clamp(q, 0, 1); ctx.translate((1 - q) * 60, 0);
        const bad = typeof it === 'object' && it.bad, lbl = typeof it === 'string' ? it : it.t;
        ctx.fillStyle = rgba(bad ? COL.red : col, 0.14); ctx.beginPath(); ctx.arc(x + 70, y, 30, 0, 6.283); ctx.fill();
        if (bad) { ctx.strokeStyle = COL.red; ctx.lineWidth = 7; ctx.lineCap = 'round'; const e = 12 * prog(lt, tt + 0.2, 0.3); ctx.beginPath(); ctx.moveTo(x + 70 - e, y - e); ctx.lineTo(x + 70 + e, y + e); ctx.moveTo(x + 70 + e, y - e); ctx.lineTo(x + 70 - e, y + e); ctx.stroke(); }
        else check(ctx, x + 70, y, 24, prog(lt, tt + 0.2, 0.4), col);
        tx(ctx, lbl, x + 125, y + 15, 40, env.F.xb, INK, 'left', 650); ctx.restore();
      });
      ctx.restore();
    });
    const v = easeBack(prog(lt, 0.7, 0.6));
    if (v > 0) { ctx.save(); ctx.translate(W / 2 + 5, 660); ctx.rotate((1 - v) * 3 + Math.sin(t * 2) * 0.05); ctx.scale(v, v); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 70, 0, 6.283); ctx.fill(); tx(ctx, L.mid || 'VS', 0, 20, 52, env.F.display, '#FFFFFF'); ctx.restore(); }
  },
  // Compteur géant avec anneau de progression.
  counter(ctx, env, s, lt, t, L, c) {
    const t0 = T(s, L.from || 0.05), d = L.dur || 1.6, p = easeOut(prog(lt, t0, d));
    const cx = L.title ? 1200 : W / 2, cy = L.title ? 640 : 560, R = 290;
    ctx.lineWidth = 34; ctx.strokeStyle = rgba(c, 0.12); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -1.571, -1.571 + 6.283 * p * (L.ring == null ? 1 : L.ring)); ctx.stroke(); ctx.lineCap = 'butt';
    const z = lt > t0 + d ? 1 + 0.07 * (1 - prog(lt, t0 + d, 0.35)) : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(z, z);
    const from = L.start || 0, v = from + (L.value - from) * p;
    tx(ctx, (L.prefix || '') + (L.dec ? v.toFixed(L.dec).replace('.', ',') : money(v)) + (L.suffix || ''), 0, 40, L.size || 150, env.F.display, INK, 'center', R * 1.8);
    ctx.restore();
    if (L.label) tx(ctx, L.label, cx, cy + R + 90, 44, env.F.xb, c, 'center', 900);
    if (L.sub) { ctx.save(); ctx.globalAlpha *= easeOut(prog(lt, t0 + d * 0.6, 0.5)); tx(ctx, L.sub, cx, cy + R + 150, 34, env.F.sb, MUTE, 'center', 900); ctx.restore(); }
    if (lt > t0 + d) { const k = prog(lt, t0 + d, 1.1); for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283, r = R + 30 + 260 * easeOut(k); ctx.fillStyle = rgba(i % 2 ? c : INK, 0.7 * (1 - k)); ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 12, 12); } }
  },
  // Chances qui fondent : une barre par match ajouté au combiné.
  decay(ctx, env, s, lt, t, L, c) {
    const n = L.n || 15, p0 = L.p || 0.77, bw = 1500 / n, base = 940, maxH = 560, st = T(s, L.from || 0.15), sp = ((T(s, L.to || 0.8)) - st) / n;
    ctx.fillStyle = 'rgba(11,16,32,0.12)'; ctx.fillRect(160, base, 1560, 4);
    for (let i = 0; i < n; i++) {
      const q = easeBack(prog(lt, st + i * sp, 0.45)); if (q <= 0) continue;
      const v = Math.pow(p0, i + 1), h = maxH * v * clamp(q, 0, 1.1), x = 190 + i * bw;
      const col = v > 0.3 ? COL.mint : v > 0.1 ? COL.gold : COL.red;
      ctx.fillStyle = col; rr(ctx, x, base - h, bw - 18, Math.max(6, h), 12); ctx.fill();
      tx(ctx, Math.round(v * 100) + '%', x + (bw - 18) / 2, base - h - 16, 30, env.F.xb, col);
      tx(ctx, String(i + 1), x + (bw - 18) / 2, base + 46, 28, env.F.sb, MUTE);
    }
    tx(ctx, L.axis || 'nombre de matchs dans le combiné', W / 2, base + 100, 30, env.F.sb, MUTE);
  },
  // Escalier de la montante : chaque palier monte, la mise grandit.
  stairs(ctx, env, s, lt, t, L, c) {
    const n = L.n || 5, st = T(s, L.from || 0.1), sp = (T(s, L.to || 0.85) - st) / n, bw = 1500 / (n + 1), lost = L.lost == null ? -1 : L.lost;
    let v = L.start || 10000;
    for (let i = 0; i <= n; i++) {
      const at = i ? st + (i - 1) * sp : 0.3, q = easeBack(prog(lt, at, 0.5)); if (q <= 0) { v *= L.odd; continue; }
      const x = 200 + i * bw, h = 110 + i * (480 / n), y = 960 - h * clamp(q, 0, 1.08), dead = lost >= 0 && i > lost;
      const col = i === 0 ? INK : lost === i ? COL.red : dead ? 'rgba(11,16,32,0.15)' : c;
      ctx.fillStyle = col; rr(ctx, x, y, bw - 22, 960 - y, 16); ctx.fill();
      tx(ctx, i ? 'PALIER ' + i : 'DÉPART', x + (bw - 22) / 2, 1010, 26, env.F.xb, MUTE);
      if (!dead) tx(ctx, money(v) + ' F', x + (bw - 22) / 2, y - 22, 40, env.F.display, lost === i ? COL.red : INK, 'center', bw);
      if (lost === i) tx(ctx, 'PERDU', x + (bw - 22) / 2, y + 60, 38, env.F.display, '#FFFFFF');
      v *= L.odd;
    }
  },
  // Étapes horizontales reliées par une ligne qui se remplit.
  steps(ctx, env, s, lt, t, L, c) {
    const it = L.items || [], n = it.length, at = times(s, L, n), gap = 1600 / n, y = 600;
    for (let i = 0; i < n; i++) {
      const x = 160 + gap * i + gap / 2, q = easeBack(prog(lt, at[i], 0.5));
      if (i < n - 1) { const f = prog(lt, at[i] + 0.3, Math.max(0.3, (at[i + 1] || at[i]) - at[i])); ctx.fillStyle = 'rgba(11,16,32,0.1)'; ctx.fillRect(x, y - 4, gap, 8); ctx.fillStyle = c; ctx.fillRect(x, y - 4, gap * f, 8); }
      if (q <= 0) continue;
      ctx.save(); ctx.translate(x, y); ctx.scale(q, q); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 64, 0, 6.283); ctx.fill();
      tx(ctx, String(i + 1), 0, 22, 64, env.F.display, '#FFFFFF'); ctx.restore();
      ctx.save(); ctx.globalAlpha *= clamp(q, 0, 1); ctx.translate(0, (1 - q) * 40);
      const lbl = typeof it[i] === 'string' ? it[i] : it[i].t; tx(ctx, lbl, x, y + 140, 40, env.F.xb, INK, 'center', gap - 30);
      if (typeof it[i] === 'object' && it[i].sub) tx(ctx, it[i].sub, x, y + 190, 30, env.F.sb, MUTE, 'center', gap - 30);
      ctx.restore();
    }
  },
};

export function drawSlide(ctx, env, s, lt, t) {
  const L = s.look, c = acc(L);
  backdrop(ctx, s, lt, t, c);
  if (L.layout !== 'title') header(ctx, env, L, lt, c);
  (LAY[L.layout] || LAY.title)(ctx, env, s, lt, t, L, c);
  return { light: true, subs: false };
}

export function slideSfx(s) {
  const L = s.look || {}, out = [['whoosh', 0, 0.4]];
  const n = (L.items || L.lines || []).length || ((L.left && L.left.items || []).length + (L.right && L.right.items || []).length) || (L.n || 0);
  const it = L.layout === 'versus' ? times(s, L, n, 0.05, 0.92) : L.layout === 'title' ? times(s, { at: L.at }, n, 0.02, 0.6) : L.layout === 'bullets' || L.layout === 'steps' ? times(s, L, n) : [];
  it.forEach((x) => out.push(['pop', x, 0.3]));
  if (L.layout === 'counter') out.push(['rise', T(s, L.from || 0.05), 0.3], ['ding', T(s, L.from || 0.05) + (L.dur || 1.6), 0.5]);
  if (L.layout === 'decay' || L.layout === 'stairs') { const st = T(s, L.from || 0.15), sp = (T(s, L.to || 0.8) - st) / (L.n || 5); for (let i = 0; i < (L.n || 5); i += L.layout === 'decay' ? 3 : 1) out.push(['pop', st + i * sp, 0.25]); if (L.lost != null) out.push(['impact', st + (L.lost - 1) * sp + 0.3, 0.8]); }
  return out;
}
