// Habillage « cinéma » de la vidéo longue : chaque scène choisit son look
// (plan vidéo étalonné, fond animé, fond blanc avec vrais logos, tableau de
// score, coupon, écran du site) + texte cinétique calé mot à mot sur la voix.
import { createCanvas } from '@napi-rs/canvas';
import { clamp, prog, easeOut, easeBack, rgba, rr, font } from './draw.mjs';

const W = 1920, H = 1080;
const INK = '#0B1020', PAPER = '#F4F6FB', MUTE_D = '#5B6478', MUTE_L = '#9AA4C6';
const GREEN = '#10B981', RED = '#EF4444';
const HUES = {
  mint: ['#33D98E', '#0EA5E9'], indigo: ['#818CF8', '#C084FC'], gold: ['#F3C969', '#FB923C'],
  red: ['#F87171', '#FB7185'], cyan: ['#22D3EE', '#818CF8'],
};
const hue = (s) => HUES[(s.look && s.look.hue) || 'mint'] || HUES.mint;
const T = (s, f) => (s.voiceAt - s.start) + s.voiceDur * f;
const norm = (w) => String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fr = (x) => Number(x).toFixed(2).replace('.', ',');
const img = (env, u) => (u && env.imgs && env.imgs[u]) || null;

// ── Fonds ──
function vignette(ctx, a) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + a + ')');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
function blobs(ctx, s, t, alpha, base) {
  const [c1, c2] = hue(s);
  [[0.22, 0.3, c1, 0.21], [0.78, 0.7, c2, 0.17], [0.55, 0.12, c1, 0.13]].forEach(([fx, fy, c, sp], i) => {
    const x = W * fx + Math.sin(t * sp + i * 2) * 320, y = H * fy + Math.cos(t * sp * 0.8 + i) * 200;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 820);
    g.addColorStop(0, rgba(c, alpha)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
}
function bgMesh(ctx, s, t) {
  ctx.fillStyle = '#070A14'; ctx.fillRect(0, 0, W, H);
  blobs(ctx, s, t, 0.3);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  const off = (t * 24) % 80;
  ctx.beginPath();
  for (let x = off - 80; x < W; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = off - 80; y < H; y += 80) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  vignette(ctx, 0.6);
}
function bgLight(ctx, s, t) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  blobs(ctx, s, t, 0.16);
  ctx.fillStyle = 'rgba(11,16,32,0.07)';
  const off = (t * 12) % 48;
  for (let y = off - 48; y < H; y += 48) for (let x = 24; x < W; x += 48) ctx.fillRect(x, y, 3, 3);
}
function bgBroll(ctx, env, s, lt, t) {
  const f = env.brollFrame;
  if (!f) return bgMesh(ctx, s, t);
  ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H);
  const z = 1.06 + 0.08 * prog(lt, 0, s.dur), w = W * z, h = H * z;
  ctx.drawImage(f, (W - w) / 2, (H - h) / 2, w, h);
  ctx.fillStyle = 'rgba(5,7,13,0.58)'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, rgba(hue(s)[0], 0.2)); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  vignette(ctx, 0.7);
}
function bars(ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 56); ctx.fillRect(0, H - 56, W, 56); }

// ── Petits outils ──
function drawFit(ctx, im, cx, cy, bw, bh) {
  if (!im) return;
  const k = Math.min(bw / im.width, bh / im.height), w = im.width * k, h = im.height * k;
  ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
}
function circleImg(ctx, im, cx, cy, r) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#1C2336'; ctx.fill(); ctx.clip();
  if (im) { const k = Math.max((2 * r) / im.width, (2 * r) / im.height); ctx.drawImage(im, cx - (im.width * k) / 2, cy - (im.height * k) / 2, im.width * k, im.height * k); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}
function card(ctx, x, y, w, h, r, fill, shadow) {
  ctx.save();
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; }
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.restore();
}
function txt(ctx, s, x, y, size, fam, color, align) {
  font(ctx, size, fam); ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(s), x, y);
}
function fitTxt(ctx, s, x, y, size, min, maxW, fam, color, align) {
  let z = size; font(ctx, z, fam);
  while (z > min && ctx.measureText(String(s)).width > maxW) { z -= 2; font(ctx, z, fam); }
  txt(ctx, s, x, y, z, fam, color, align);
}
const shake = (lt, at, amp) => { const d = lt - at; return d < 0 || d > 0.4 ? 0 : amp * (1 - d / 0.4) * Math.sin(d * 80); };
function stamp(ctx, env, text, cx, cy, lt, at, color) {
  const a = prog(lt, at, 0.22);
  if (a <= 0) return;
  const z = 2.4 - 1.4 * easeOut(a);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.12); ctx.scale(z, z); ctx.globalAlpha = clamp(a * 1.5, 0, 1);
  font(ctx, 150, env.F.display); const w = ctx.measureText(text).width + 90;
  ctx.fillStyle = rgba(color, 0.12); rr(ctx, -w / 2, -105, w, 190, 20); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText(text, 0, 55);
  ctx.restore();
}
function flashAt(ctx, lt, at, a) {
  const f = lt >= at ? 1 - prog(lt, at, 0.25) : 0;
  if (f > 0) { ctx.fillStyle = 'rgba(255,255,255,' + a * f + ')'; ctx.fillRect(0, 0, W, H); }
}

// ── Texte cinétique : les mots apparaissent au moment où Henri les dit ──
function groupsOf(s, chars) {
  s._kg = s._kg || {};
  if (s._kg[chars]) return s._kg[chars];
  const out = []; let cur = null;
  s.words.forEach((w, k) => {
    const stop = cur && /[.!?…:]$/.test(s.words[k - 1].text);
    if (!cur || stop || cur.len + w.text.length > chars) { cur = { from: k, to: k, len: w.text.length }; out.push(cur); }
    else { cur.to = k; cur.len += w.text.length + 1; }
  });
  return (s._kg[chars] = out);
}
function hiWords(s) {
  if (!s._hi) s._hi = new Set(String(s.highlight || '').split(/\s+/).map(norm).filter(Boolean));
  return s._hi;
}
const isHi = (s, w) => hiWords(s).has(norm(w)) || /\d/.test(w);
const wordAt = (s, k) => s.voiceAt - s.start + s.words[k].start * s.voiceDur;

function textFlow(ctx, s, lt, t, o) {
  if (!s.words || !s.words.length) return;
  const p = (t - s.voiceAt) / s.voiceDur;
  if (p < -0.02) return;
  let k = s.words.findIndex((w) => p < w.end); if (k < 0) k = s.words.length - 1;
  const g = groupsOf(s, o.chars).find((x) => k >= x.from && k <= x.to);
  if (!g) return;
  const words = s.words.slice(g.from, g.to + 1).map((w) => (o.upper ? w.text.toUpperCase() : w.text));
  let size = o.size, lines, sp;
  for (;;) {
    font(ctx, size, o.fam); sp = ctx.measureText(' ').width;
    lines = []; let cur = [], cw = 0;
    words.forEach((w, i) => {
      const ww = ctx.measureText(w).width;
      if (cur.length && cw + sp + ww > o.w) { lines.push({ items: cur, w: cw }); cur = []; cw = 0; }
      cw += (cur.length ? sp : 0) + ww; cur.push({ w, ww, i });
    });
    if (cur.length) lines.push({ items: cur, w: cw });
    if (lines.length <= o.lines || size <= o.min) break;
    size -= 6;
  }
  const lh = size * (o.lh || 1.04);
  const top = o.cy - (lines.length * lh) / 2 + size * 0.78;
  const rise = (1 - easeOut(prog(lt, wordAt(s, g.from) - 0.05, 0.3))) * 26;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  lines.forEach((ln, li) => {
    let x = o.align === 'left' ? o.x : o.cx - ln.w / 2;
    const y = top + li * lh + rise;
    ln.items.forEach(({ w, ww, i }) => {
      const kk = g.from + i, ws = wordAt(s, kk), a = prog(lt, ws - 0.04, 0.16);
      if (a > 0) {
        const hi = isHi(s, s.words[kk].text), z = 0.72 + 0.28 * easeBack(a), mx = x + ww / 2, my = y - size * 0.35;
        ctx.save(); ctx.globalAlpha *= clamp(a * 1.4, 0, 1);
        ctx.translate(mx, my); ctx.scale(z, z); ctx.translate(-mx, -my);
        font(ctx, size, o.fam);
        if (hi) { ctx.shadowColor = rgba(o.acc, 0.5); ctx.shadowBlur = 26; }
        ctx.fillStyle = hi ? o.acc : o.color; ctx.fillText(w, x, y); ctx.shadowBlur = 0;
        if (hi) { const u = easeOut(prog(lt, ws + 0.08, 0.3)); ctx.fillStyle = o.acc; ctx.fillRect(x, y + size * 0.12, ww * u, Math.max(5, size * 0.055)); }
        ctx.restore();
      }
      x += ww + sp;
    });
  });
}

function teamsRow(ctx, env, L, y, dark, a) {
  ctx.save(); ctx.globalAlpha *= a;
  const col = dark ? '#FFFFFF' : INK;
  circleImg(ctx, img(env, L.home_logo), W / 2 - 260, y, 38);
  circleImg(ctx, img(env, L.away_logo), W / 2 + 260, y, 38);
  txt(ctx, L.home, W / 2 - 200, y + 14, 40, env.F.xb, col, 'left');
  txt(ctx, L.away, W / 2 + 200, y + 14, 40, env.F.xb, col, 'right');
  txt(ctx, 'VS', W / 2, y + 14, 34, env.F.display, dark ? MUTE_L : MUTE_D);
  ctx.restore();
}

// ── Les looks ──
export const LOOKS = {
  kinetic(ctx, env, s, lt, t) {
    const L = s.look, bg = L.bg || 'mesh', light = bg === 'light';
    if (bg === 'broll') bgBroll(ctx, env, s, lt, t); else if (light) bgLight(ctx, s, t); else bgMesh(ctx, s, t);
    if (L.bars) bars(ctx);
    const acc = light ? (hue(s)[0] === '#F3C969' ? '#D97706' : hue(s)[0] === '#33D98E' ? GREEN : '#4F46E5') : hue(s)[0];
    if (L.kicker) {
      const a = easeOut(prog(lt, 0.1, 0.5));
      ctx.save(); ctx.globalAlpha *= a;
      txt(ctx, L.kicker, W / 2, 190 - (1 - a) * 20, 30, env.F.xb, acc);
      ctx.fillStyle = acc; ctx.fillRect(W / 2 - 60 * a, 212, 120 * a, 4);
      ctx.restore();
    }
    textFlow(ctx, s, lt, t, { cx: W / 2, cy: H / 2 + 30, w: W - 360, size: 150, min: 84, lines: 2, fam: env.F.display, upper: true, color: light ? INK : '#FFFFFF', acc, chars: 26 });
    return { light, subs: false };
  },

  scoreboard(ctx, env, s, lt, t) {
    const L = s.look; bgBroll(ctx, env, s, lt, t); bars(ctx);
    const sa = T(s, L.stamp_at == null ? 0.55 : L.stamp_at), sh = shake(lt, sa, 18);
    const a = easeBack(prog(lt, 0.1, 0.6));
    const cw = 1240, ch = 330, cy = 420 + shake(lt, sa, 8);
    ctx.save(); ctx.translate(sh, -(1 - clamp(a, 0, 1)) * 260); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60;
    ctx.fillStyle = 'rgba(8,12,24,0.86)'; rr(ctx, W / 2 - cw / 2, cy - ch / 2, cw, ch, 34); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.stroke();
    txt(ctx, L.label, W / 2, cy - ch / 2 + 56, 26, env.F.sb, MUTE_L);
    [[L.home_logo, L.home, -420], [L.away_logo, L.away, 420]].forEach(([u, n, dx]) => {
      circleImg(ctx, img(env, u), W / 2 + dx, cy + 5, 72);
      txt(ctx, n.toUpperCase(), W / 2 + dx, cy + 130, 38, env.F.xb, '#FFFFFF');
    });
    const sp = easeBack(prog(lt, 0.45, 0.5));
    ctx.save(); ctx.translate(W / 2, cy + 50); ctx.scale(Math.max(0.01, sp), Math.max(0.01, sp));
    txt(ctx, L.score[0] + '  –  ' + L.score[1], 0, 20, 190, env.F.display, '#FFFFFF');
    ctx.restore();
    ctx.fillStyle = rgba('#F87171', 0.18); rr(ctx, W / 2 - 80, cy + 104, 160, 44, 22); ctx.fill();
    txt(ctx, 'TERMINÉ', W / 2, cy + 135, 24, env.F.xb, '#F87171');
    ctx.restore();
    stamp(ctx, env, L.stamp, W / 2, 790, lt, sa, '#F87171');
    flashAt(ctx, lt, sa, 0.35);
    return { subs: true };
  },

  ticket(ctx, env, s, lt, t) {
    const L = s.look; bgMesh(ctx, s, t);
    const sa = L.stamp ? T(s, L.stamp_at == null ? 0.3 : L.stamp_at) : 1e9, sh = shake(lt, sa, 16);
    const a = easeOut(prog(lt, 0.05, 0.6));
    const tw = 860, th = 560, cy = 470 + Math.sin(t * 1.2) * 6;
    ctx.save(); ctx.translate(W / 2 + sh, cy + (1 - a) * 420); ctx.rotate(-0.035 + (1 - a) * 0.18); ctx.globalAlpha = clamp(a, 0, 1);
    card(ctx, -tw / 2, -th / 2, tw, th, 26, '#FFFFFF', 'rgba(0,0,0,0.55)');
    ctx.save(); rr(ctx, -tw / 2, -th / 2, tw, th, 26); ctx.clip();
    ctx.fillStyle = INK; ctx.fillRect(-tw / 2, -th / 2, tw, 96); ctx.restore();
    txt(ctx, 'COUPON · PARI SIMPLE', -tw / 2 + 44, -th / 2 + 60, 30, env.F.xb, '#FFFFFF', 'left');
    txt(ctx, L.date || '', tw / 2 - 44, -th / 2 + 60, 28, env.F.sb, MUTE_L, 'right');
    let y = -th / 2 + 170;
    (L.rows || []).forEach((r) => {
      txt(ctx, r.match, -tw / 2 + 44, y, 30, env.F.sb, MUTE_D, 'left');
      txt(ctx, r.pick, -tw / 2 + 44, y + 62, 52, env.F.black, INK, 'left');
      txt(ctx, fr(r.odd), tw / 2 - 44, y + 62, 96, env.F.display, INK, 'right');
      y += 140;
    });
    ctx.strokeStyle = 'rgba(11,16,32,0.18)'; ctx.lineWidth = 3; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(-tw / 2 + 40, y - 20); ctx.lineTo(tw / 2 - 40, y - 20); ctx.stroke(); ctx.setLineDash([]);
    const odd = (L.rows || [])[0] ? L.rows[0].odd : 1;
    txt(ctx, 'Mise', -tw / 2 + 44, y + 40, 34, env.F.sb, MUTE_D, 'left');
    txt(ctx, money(L.stake) + ' FCFA', tw / 2 - 44, y + 40, 40, env.F.xb, INK, 'right');
    txt(ctx, 'Gain potentiel', -tw / 2 + 44, y + 110, 34, env.F.sb, MUTE_D, 'left');
    txt(ctx, money(L.stake * odd) + ' FCFA', tw / 2 - 44, y + 110, 46, env.F.black, L.stamp ? 'rgba(11,16,32,0.35)' : GREEN, 'right');
    if (L.stamp && lt > sa) { ctx.strokeStyle = RED; ctx.lineWidth = 5; const u = easeOut(prog(lt, sa + 0.1, 0.3)); ctx.beginPath(); ctx.moveTo(tw / 2 - 360, y + 96); ctx.lineTo(tw / 2 - 360 + 320 * u, y + 96); ctx.stroke(); }
    ctx.restore();
    if (L.stamp) { stamp(ctx, env, L.stamp, W / 2 + 60, 500, lt, sa, RED); flashAt(ctx, lt, sa, 0.25); }
    return { subs: true };
  },

  prob(ctx, env, s, lt, t) {
    const L = s.look, rest = L.focus === 'rest'; bgLight(ctx, s, t);
    teamsRow(ctx, env, L, 150, false, rest ? 1 : easeOut(prog(lt, 0, 0.5)));
    const a = rest ? 1 : easeBack(prog(lt, T(s, 0.02), 0.5));
    txt(ctx, 'COTE · ' + L.pick_label, 520, 360, 30, env.F.xb, MUTE_D);
    ctx.save(); ctx.translate(520, 560); ctx.scale(Math.max(0.01, a), Math.max(0.01, a));
    txt(ctx, fr(L.odd), 0, 100, 300, env.F.display, INK); ctx.restore();
    const b = rest ? 1 : easeOut(prog(lt, T(s, 0.3), 0.4));
    if (b > 0) {
      ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(830, 540); ctx.lineTo(830 + 170 * b, 540); ctx.stroke();
      if (b > 0.9) { ctx.beginPath(); ctx.moveTo(1000, 540); ctx.lineTo(975, 515); ctx.moveTo(1000, 540); ctx.lineTo(975, 565); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    const gx = 1380, gy = 540, R = 220, a0 = -Math.PI / 2;
    const f = rest ? L.pct / 100 : (easeOut(prog(lt, T(s, 0.35), 0.9)) * L.pct) / 100;
    ctx.lineWidth = 46;
    ctx.strokeStyle = 'rgba(11,16,32,0.08)'; ctx.beginPath(); ctx.arc(gx, gy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rest ? rgba(GREEN, 0.35) : GREEN; ctx.beginPath(); ctx.arc(gx, gy, R, a0, a0 + Math.PI * 2 * f); ctx.stroke();
    if (rest) {
      const r2 = easeOut(prog(lt, T(s, 0.05), 0.8)), e0 = a0 + (Math.PI * 2 * L.pct) / 100;
      ctx.strokeStyle = RED; ctx.lineWidth = 56; ctx.beginPath(); ctx.arc(gx, gy, R, e0, e0 + Math.PI * 2 * (1 - L.pct / 100) * r2); ctx.stroke();
      txt(ctx, Math.round((100 - L.pct) * r2) + ' %', gx, gy + 40, 150, env.F.display, RED);
      txt(ctx, 'de chances de tout perdre', gx, gy + R + 110, 34, env.F.xb, RED);
    } else {
      txt(ctx, Math.round(f * 100) + ' %', gx, gy + 40, 150, env.F.display, INK);
      txt(ctx, 'de chances, selon le bookmaker', gx, gy + R + 110, 32, env.F.sb, MUTE_D);
    }
    return { light: true, subs: true };
  },

  odds(ctx, env, s, lt, t) {
    const L = s.look; bgLight(ctx, s, t);
    const acc = '#4F46E5';
    const a0 = easeOut(prog(lt, 0, 0.5));
    ctx.save(); ctx.globalAlpha *= a0;
    fitTxt(ctx, L.home + '  vs  ' + L.away, W / 2, 170 - (1 - a0) * 20, 68, 40, W - 300, env.F.black, INK);
    txt(ctx, [L.league, L.kickoff].filter(Boolean).join('  ·  '), W / 2, 228, 30, env.F.sb, MUTE_D);
    ctx.restore();
    const cw = 660, ch = 420, cy = 560;
    (L.cards || []).forEach((c, i) => {
      const at = T(s, (L.at || [0.3, 0.65])[i] || 0), a = easeBack(prog(lt, at, 0.55));
      if (a <= 0) return;
      const cx = W / 2 + (i ? 1 : -1) * 400;
      ctx.save(); ctx.translate(cx, cy + (1 - clamp(a, 0, 1)) * 120); ctx.globalAlpha *= clamp(a, 0, 1);
      card(ctx, -cw / 2, -ch / 2, cw, ch, 32, '#FFFFFF', 'rgba(15,23,42,0.16)');
      ctx.fillStyle = 'rgba(11,16,32,0.04)'; rr(ctx, -cw / 2 + 24, -ch / 2 + 24, cw - 48, 130, 22); ctx.fill();
      drawFit(ctx, img(env, c.logo), 0, -ch / 2 + 89, 320, 90);
      txt(ctx, c.name, 0, -ch / 2 + 200, 28, env.F.sb, MUTE_D);
      fitTxt(ctx, c.label, 0, 20, 42, 26, cw - 80, env.F.xb, INK);
      const v = 1 + (c.odd - 1) * easeOut(prog(lt, at + 0.25, 0.7));
      ctx.shadowColor = rgba(acc, 0.25); ctx.shadowBlur = 30;
      txt(ctx, fr(v), 0, 165, 150, env.F.display, acc); ctx.shadowBlur = 0;
      ctx.restore();
    });
    const at2 = T(s, ((L.at || [0.3, 0.65])[1]) || 0.65) + 0.6, nb = easeBack(prog(lt, at2, 0.4));
    if (nb > 0) {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(W / 2, cy, Math.max(1, 56 * nb), 0, Math.PI * 2); ctx.fill();
      txt(ctx, '≠', W / 2, cy + 28 * nb, 80 * nb, env.F.display, '#FFFFFF');
    }
    if (L.sum && (L.cards || []).length === 2) {
      const q = easeOut(prog(lt, T(s, 0.93), 0.5));
      if (q > 0) {
        const pct = Math.round((1 / L.cards[0].odd + 1 / L.cards[1].odd) * 1000) / 10;
        const line = 'Probabilités cumulées : ' + String(pct).replace('.', ',') + ' %  →  moins de 100 % = profit garanti';
        ctx.save(); ctx.globalAlpha *= q; font(ctx, 30, env.F.xb); const w = ctx.measureText(line).width + 80;
        ctx.fillStyle = rgba(GREEN, 0.14); rr(ctx, W / 2 - w / 2, 822, w, 70, 35); ctx.fill();
        txt(ctx, line, W / 2, 868, 30, env.F.xb, '#047857'); ctx.restore();
      }
    }
    return { light: true, subs: true };
  },

  split(ctx, env, s, lt, t) {
    const L = s.look; bgLight(ctx, s, t);
    const at = (L.at || [0, 0.15, 0.35, 0.55, 0.75, 0.97]).map((f) => T(s, f));
    const a = easeBack(prog(lt, at[0], 0.5));
    txt(ctx, 'TON CAPITAL', W / 2, 96, 24, env.F.xb, MUTE_D);
    ctx.save(); ctx.translate(W / 2, 160); ctx.scale(Math.max(0.01, a), Math.max(0.01, a));
    card(ctx, -270, -48, 540, 96, 48, INK, 'rgba(15,23,42,0.25)');
    txt(ctx, money(L.capital) + ' FCFA', 0, 24, 62, env.F.display, '#FFFFFF'); ctx.restore();
    const cw = 640, ch = 300, cy = 450;
    (L.legs || []).forEach((l, i) => {
      const t0 = at[1 + i], cx = W / 2 + (i ? 1 : -1) * 420;
      const pl = easeOut(prog(lt, t0 - 0.4, 0.5));
      if (pl > 0) {
        ctx.strokeStyle = GREEN; ctx.lineWidth = 6; ctx.beginPath();
        const N = 24; for (let k = 0; k <= N * pl; k++) {
          const u = k / N, x = W / 2 + (cx - W / 2) * u, y = 208 + (cy - ch / 2 - 208) * (u * u);
          if (!k) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const ca = easeBack(prog(lt, t0 - 0.1, 0.5));
      if (ca > 0) {
        ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha *= clamp(ca, 0, 1); ctx.scale(0.9 + 0.1 * clamp(ca, 0, 1), 0.9 + 0.1 * clamp(ca, 0, 1));
        card(ctx, -cw / 2, -ch / 2, cw, ch, 30, '#FFFFFF', 'rgba(15,23,42,0.16)');
        drawFit(ctx, img(env, l.logo), 0, -ch / 2 + 62, 260, 70);
        fitTxt(ctx, l.label + '  ·  ' + fr(l.odd), 0, -ch / 2 + 150, 32, 22, cw - 60, env.F.xb, MUTE_D);
        const v = l.stake * easeOut(prog(lt, t0, 0.8));
        txt(ctx, money(v) + ' F', 0, ch / 2 - 40, 96, env.F.display, INK);
        ctx.restore();
      }
      const ra = easeOut(prog(lt, at[3 + i], 0.45));
      if (ra > 0) {
        ctx.save(); ctx.globalAlpha *= ra; ctx.translate(cx, 700 + (1 - ra) * 30);
        ctx.fillStyle = rgba(GREEN, 0.13); rr(ctx, -cw / 2, -50, cw, 100, 24); ctx.fill();
        fitTxt(ctx, 'Si ' + l.label, -cw / 2 + 30, -6, 28, 20, cw * 0.55, env.F.sb, MUTE_D, 'left');
        txt(ctx, 'tu récupères', -cw / 2 + 30, 30, 26, env.F.sb, MUTE_D, 'left');
        txt(ctx, money(l.retour) + ' F  ✓', cw / 2 - 30, 20, 52, env.F.black, '#047857', 'right');
        ctx.restore();
      }
    });
    const pa = easeBack(prog(lt, at[5], 0.5));
    if (pa > 0) {
      ctx.save(); ctx.translate(W / 2, 858); ctx.scale(Math.max(0.01, pa), Math.max(0.01, pa));
      const g = ctx.createLinearGradient(-380, 0, 380, 0); g.addColorStop(0, '#33D98E'); g.addColorStop(1, GREEN);
      ctx.shadowColor = rgba(GREEN, 0.45); ctx.shadowBlur = 40; ctx.fillStyle = g; rr(ctx, -380, -50, 760, 100, 50); ctx.fill(); ctx.shadowBlur = 0;
      txt(ctx, '+' + money(L.profit) + ' FCFA garantis', 0, 18, 52, env.F.black, INK); ctx.restore();
    }
    return { light: true, subs: true };
  },

  bigstat(ctx, env, s, lt, t) {
    const L = s.look; bgMesh(ctx, s, t);
    const acc = hue(s)[0], t0 = T(s, 0.02), d = 1.2;
    const a = easeOut(prog(lt, 0, 0.5));
    ctx.save(); ctx.globalAlpha *= a; txt(ctx, L.label, W / 2, 330, 40, env.F.xb, acc);
    ctx.fillStyle = acc; ctx.fillRect(W / 2 - 80 * a, 356, 160 * a, 5); ctx.restore();
    const p = easeOut(prog(lt, t0, d)), done = lt > t0 + d;
    const z = done ? 1 + 0.08 * (1 - prog(lt, t0 + d, 0.3)) : 1;
    ctx.save(); ctx.translate(W / 2, 600); ctx.scale(z, z);
    ctx.shadowColor = rgba(acc, 0.6); ctx.shadowBlur = 60;
    txt(ctx, (L.prefix || '') + money(L.value * p) + (L.suffix || ''), 0, 90, 250, env.F.display, '#FFFFFF');
    ctx.shadowBlur = 0; ctx.restore();
    if (done) {
      const k = prog(lt, t0 + d, 1.2);
      for (let i = 0; i < 28; i++) {
        const ang = (i / 28) * Math.PI * 2, r = 200 + 520 * easeOut(k);
        ctx.fillStyle = rgba(i % 2 ? acc : '#FFFFFF', 0.8 * (1 - k));
        ctx.fillRect(W / 2 + Math.cos(ang) * r * 1.4, 560 + Math.sin(ang) * r * 0.7, 10, 10);
      }
    }
    ctx.save(); ctx.globalAlpha *= easeOut(prog(lt, t0 + 0.6, 0.5));
    txt(ctx, L.sub || '', W / 2, 770, 40, env.F.sb, MUTE_L); ctx.restore();
    return { subs: true };
  },

  phone(ctx, env, s, lt, t) {
    const L = s.look; bgMesh(ctx, s, t);
    const acc = hue(s)[0];
    if (L.chip) {
      font(ctx, 24, env.F.xb); const cw = ctx.measureText(L.chip).width + 56;
      ctx.fillStyle = rgba(acc, 0.16); rr(ctx, 120, 150, cw, 52, 26); ctx.fill();
      txt(ctx, L.chip, 148, 185, 24, env.F.xb, acc, 'left');
    }
    textFlow(ctx, s, lt, t, { x: 120, cy: 560, w: 980, size: 92, min: 58, lines: 4, fam: env.F.black, align: 'left', color: '#FFFFFF', acc, chars: 60, lh: 1.12 });
    return { phone: true, subs: false };
  },
};

// Bruitages propres à chaque look : [nom, instant dans la scène, volume].
export function lookSfx(s) {
  const L = s.look || {}, out = [];
  if (L.flash) out.push(['impact', 0.02, 0.5]);
  if (L.type === 'kinetic' || L.type === 'phone') {
    if (L.type === 'kinetic') out.push(['whoosh', 0, 0.28]);
    let n = 0;
    (s.words || []).forEach((w, k) => { if (n < 4 && hiWords(s).has(norm(w.text))) { out.push(['pop', wordAt(s, k), 0.3]); n++; } });
  }
  if (L.type === 'scoreboard') out.push(['whoosh', 0.1, 0.45], ['pop', 0.5, 0.4], ['impact', T(s, L.stamp_at == null ? 0.55 : L.stamp_at), 0.9]);
  if (L.type === 'ticket') { out.push(['whoosh', 0.05, 0.4]); if (L.stamp) out.push(['impact', T(s, L.stamp_at == null ? 0.3 : L.stamp_at), 0.9]); }
  if (L.type === 'prob') out.push(['whoosh', 0, 0.3], ['pop', T(s, L.focus === 'rest' ? 0.05 : 0.35), 0.4]);
  if (L.type === 'odds') (L.at || [0.3, 0.65]).forEach((f) => out.push(['whoosh', T(s, f), 0.35], ['pop', T(s, f) + 0.9, 0.35]));
  if (L.type === 'split') { const at = L.at || []; out.push(['whoosh', T(s, at[0] || 0), 0.3]); [1, 2, 3, 4].forEach((i) => at[i] != null && out.push(['pop', T(s, at[i]), 0.35])); if (at[5] != null) out.push(['ding', T(s, at[5]), 0.5]); }
  if (L.type === 'bigstat') out.push(['rise', 0, 0.3], ['ding', T(s, 0.02) + 1.2, 0.55]);
  return out;
}

// Images à précharger (logos des bookmakers, drapeaux).
export function lookImages(scenes) {
  const set = new Set();
  for (const s of scenes) {
    const L = s.look; if (!L) continue;
    [L.home_logo, L.away_logo, ...(L.cards || []).map((c) => c.logo), ...(L.legs || []).map((l) => l.logo)].forEach((u) => u && set.add(u));
  }
  return [...set];
}

// Grain de pellicule + éclair d'entrée, sur toutes les images.
let grain = null, pat = null, patCtx = null;
export function finishFx(ctx, s, lt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (s.look && s.look.flash) flashAt(ctx, lt, 0, 0.6);
  if (!grain) {
    grain = createCanvas(256, 256); const g = grain.getContext('2d'), d = g.createImageData(256, 256);
    let x = 12345;
    for (let i = 0; i < d.data.length; i += 4) { x = (x * 1103515245 + 12345) >>> 0; const v = x >>> 24; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }
  if (patCtx !== ctx) { pat = ctx.createPattern(grain, 'repeat'); patCtx = ctx; }
  const ox = Math.floor(Math.random() * 256), oy = Math.floor(Math.random() * 256);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-ox, -oy); ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}
