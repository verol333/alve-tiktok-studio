// Habillage TikTok « motion design » : looks dessinés nativement en 1080x1920
// (compte à rebours 3D, mots barrés, carte du match en 3D, capture du bookmaker
// zoomée et entourée, règle en relief + tampon, mur de matchs, bouton s'abonner)
// + sous-titres animés mot par mot.
import { clamp, prog, easeOut, easeBack, rgba, rr, font } from './draw.mjs';
import { TK2, tk2Sfx } from './tk2.mjs';

const W = 1080, H = 1920;
const A = { acc: '#3DFFB5', hot: '#FFD23F', red: '#FF4D5E', ink: '#FFFFFF', mute: '#9AA4C6' };
const norm = (w) => String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const wordAt = (s, k) => s.voiceAt - s.start + s.words[k].start * s.voiceDur;
const T = (s, f) => (s.voiceAt - s.start) + s.voiceDur * f;
const img = (env, u) => (u && env.imgs && env.imgs[u]) || null;
function sayAt(s, frag, dflt) {
  const n = norm(frag); const k = n ? (s.words || []).findIndex((w) => norm(w.text).startsWith(n)) : -1;
  return k < 0 ? dflt : wordAt(s, k);
}
const shake = (lt, at, amp) => { const d = lt - at; return d < 0 || d > 0.45 ? 0 : amp * (1 - d / 0.45) * Math.sin(d * 70); };
function flash(ctx, lt, at, a) { const f = lt >= at ? 1 - prog(lt, at, 0.3) : 0; if (f > 0) { ctx.fillStyle = 'rgba(255,255,255,' + a * f + ')'; ctx.fillRect(0, 0, W, H); } }
function text(ctx, s, x, y, size, fam, color, align) { font(ctx, size, fam); ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(String(s), x, y); }
function fit(ctx, s, size, min, maxW, fam) { let z = size; font(ctx, z, fam); while (z > min && ctx.measureText(String(s)).width > maxW) { z -= 3; font(ctx, z, fam); } return z; }
// Texte en relief (extrusion 3D) avec dégradé sur la face avant.
function text3d(ctx, s, x, y, size, fam, c1, c2, depth) {
  font(ctx, size, fam); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (let i = depth; i > 0; i--) { ctx.fillStyle = i === depth ? 'rgba(0,0,0,0.55)' : rgba(c2, 0.35 + 0.4 * (1 - i / depth)); ctx.fillText(s, x + i * 0.9, y + i * 1.3); }
  const g = ctx.createLinearGradient(0, y - size, 0, y); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.45, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.shadowColor = rgba(c1, 0.6); ctx.shadowBlur = 40; ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}
function circleLogo(ctx, im, cx, cy, r, ring) {
  ctx.save(); ctx.shadowColor = rgba(ring, 0.7); ctx.shadowBlur = 50;
  ctx.fillStyle = '#0B1224'; ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = ring; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();
  if (im) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip(); const k = Math.max((2 * r) / im.width, (2 * r) / im.height); ctx.drawImage(im, cx - (im.width * k) / 2, cy - (im.height * k) / 2, im.width * k, im.height * k); ctx.restore(); }
}
function scribble(ctx, cx, cy, rx, ry, p, color) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.shadowColor = rgba(color, 0.8); ctx.shadowBlur = 20; ctx.beginPath();
  const a0 = -2.3, a1 = a0 + Math.PI * 2.15 * easeOut(p);
  for (let a = a0, f = true; a <= a1; a += 0.04, f = false) { const k = 1 + 0.04 * Math.sin(a * 3 + 1), x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k; if (f) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke(); ctx.restore();
}
function stamp(ctx, env, s, cx, cy, lt, at, color, size) {
  const a = prog(lt, at, 0.22); if (a <= 0) return;
  const z = 2.6 - 1.6 * easeOut(a);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.1); ctx.scale(z, z); ctx.globalAlpha = clamp(a * 1.5, 0, 1);
  const fs = fit(ctx, s, size || 104, 50, 880, env.F.display); const w = ctx.measureText(s).width + 80;
  ctx.fillStyle = rgba(color, 0.16); rr(ctx, -w / 2, -fs * 0.95, w, fs * 1.35, 22); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.stroke();
  text(ctx, s, 0, fs * 0.2, fs, env.F.display, color); ctx.restore();
}

// ── Fond : dégradé nuit, halo mobile, sol en grille 3D qui défile, particules ──
// Illustration plein écran (visuel graphique) : zoom et glissement lents de caméra.
function artBg(ctx, im, t, lt, dur) {
  const p = clamp(lt / Math.max(1, dur || 4), 0, 1), z = 1.08 + 0.12 * p;
  const k = Math.max(W / im.width, H / im.height) * z, w = im.width * k, h = im.height * k;
  const dx = Math.sin(t * 0.35) * 22, dy = -30 * p + Math.cos(t * 0.3) * 14;
  ctx.drawImage(im, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h);
  const sh = ctx.createLinearGradient(0, H * 0.62, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  const gl = ((lt * 0.45) % 1.6) - 0.3; const g = ctx.createLinearGradient(W * gl - 300, 0, W * gl + 300, H); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function bg(ctx, env, s, t, acc) {
  const art = img(env, s.look && s.look.art);
  if (art) { const lt = t - s.start; artBg(ctx, art, t, lt, s.dur); for (const p of env.particles || []) { const y = (p.y - t * p.v * 1.6) % H; ctx.fillStyle = rgba(acc, p.a * 0.6); ctx.fillRect(p.x, y < 0 ? y + H : y, p.s, p.s); } ctx.fillStyle = 'rgba(2,4,10,' + (s.look.type === 'art' ? 0 : 0.45) + ')'; ctx.fillRect(0, 0, W, H); return; }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04060D'); g.addColorStop(0.55, '#0A1122'); g.addColorStop(1, '#03050B');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const hx = W / 2 + Math.sin(t * 0.6) * 260, hy = 700 + Math.cos(t * 0.45) * 160;
  const r = ctx.createRadialGradient(hx, hy, 0, hx, hy, 900); r.addColorStop(0, rgba(acc, 0.28)); r.addColorStop(1, rgba(acc, 0)); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  const r2 = ctx.createRadialGradient(W - hx * 0.6, 1500, 0, W - hx * 0.6, 1500, 700); r2.addColorStop(0, rgba(A.hot, 0.12)); r2.addColorStop(1, rgba(A.hot, 0)); ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
  // Sol 3D en perspective
  const hor = 1180, vx = W / 2;
  ctx.save(); ctx.strokeStyle = rgba(acc, 0.22); ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(vx, hor); ctx.lineTo(vx + i * 260, H + 40); ctx.stroke(); }
  const off = (t * 0.9) % 1;
  for (let j = 0; j < 14; j++) { const d = (j + off) / 14, y = hor + (H - hor) * d * d; ctx.globalAlpha = d; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  const fade = ctx.createLinearGradient(0, hor - 40, 0, hor + 220); fade.addColorStop(0, '#0A1122'); fade.addColorStop(1, 'rgba(10,17,34,0)'); ctx.fillStyle = fade; ctx.fillRect(0, hor - 40, W, 260);
  for (const p of env.particles || []) { const y = (p.y - t * p.v * 1.6) % H; ctx.fillStyle = rgba(acc, p.a); ctx.fillRect(p.x, y < 0 ? y + H : y, p.s, p.s); }
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// ── Sous-titres animés : 1 à 3 mots, gros, contour, mot prononcé qui « pop » ──
function groups(s) {
  if (s._tg) return s._tg;
  const out = []; let cur = null;
  s.words.forEach((w, k) => { const stop = cur && /[.!?…:,]$/.test(s.words[k - 1].text); if (!cur || stop || k - cur.from >= 3 || cur.len + w.text.length > 16) { cur = { from: k, to: k, len: w.text.length }; out.push(cur); } else { cur.to = k; cur.len += w.text.length + 1; } });
  return (s._tg = out);
}
export function tkCaption(ctx, env, s, lt, y) {
  if (!s.words || !s.words.length) return;
  const t = s.start + lt, p = (t - s.voiceAt) / s.voiceDur; if (p < 0 || p > 1.03) return;
  let cur = s.words.findIndex((w) => p < w.end); if (cur < 0) cur = s.words.length - 1;
  const g = groups(s).find((x) => cur >= x.from && cur <= x.to); if (!g) return;
  const hi = new Set(String(s.highlight || '').split(/\s+/).map(norm).filter(Boolean));
  const words = s.words.slice(g.from, g.to + 1).map((w) => w.text.toUpperCase());
  const fam = env.F.black; let size = 104, sp, ws, total;
  for (;;) { font(ctx, size, fam); sp = ctx.measureText(' ').width; ws = words.map((w) => ctx.measureText(w).width); total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1); if (total <= 960 || size <= 56) break; size -= 4; }
  const gin = easeBack(prog(lt, wordAt(s, g.from) - 0.06, 0.22));
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(0.6 + 0.4 * gin, 0.6 + 0.4 * gin); ctx.translate(-W / 2, -y);
  let x = W / 2 - total / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  words.forEach((w, i) => {
    const k = g.from + i, on = k === cur, said = k <= cur, pop = on ? easeBack(prog(lt, wordAt(s, k) - 0.03, 0.18)) : 1;
    const isH = hi.has(norm(w)) || /\d/.test(w), col = !said ? 'rgba(255,255,255,0.45)' : isH ? A.hot : on ? A.acc : '#FFFFFF';
    const mx = x + ws[i] / 2, my = y - size * 0.35, z = on ? 1 + 0.18 * pop - 0.18 * prog(lt, wordAt(s, k) + 0.15, 0.2) : 1;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(on ? -0.03 : 0); ctx.scale(z, z); ctx.translate(-mx, -my); font(ctx, size, fam);
    ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.strokeText(w, x, y);
    if (on || isH) { ctx.shadowColor = rgba(col.startsWith('#') ? col : A.acc, 0.8); ctx.shadowBlur = 30; }
    ctx.fillStyle = col; ctx.fillText(w, x, y); ctx.restore();
    x += ws[i] + sp;
  });
  ctx.restore();
}

export const TK = {
  // Visuel graphique seul : illustration animée + un mot clé discret en haut.
  art(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.acc);
    if (L.kicker) { const k = easeOut(prog(lt, 0.3, 0.5)); ctx.save(); ctx.globalAlpha = k; font(ctx, 40, env.F.xb); const w = ctx.measureText(L.kicker).width + 80; ctx.fillStyle = 'rgba(4,8,18,0.72)'; rr(ctx, W / 2 - w / 2, 170, w, 80, 40); ctx.fill(); ctx.strokeStyle = rgba(A.acc, 0.8); ctx.lineWidth = 3; ctx.stroke(); text(ctx, L.kicker, W / 2, 224, 40, env.F.xb, '#FFFFFF'); ctx.restore(); }
    return { capY: 1640 };
  },
  // Compte à rebours 5 → 0 dans un anneau lumineux.
  countdown(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.acc);
    const dur = L.span || Math.min(3.2, s.dur - 0.3), n = Math.max(0, Math.ceil(5 - (lt / dur) * 5)), fr = ((lt / dur) * 5) % 1;
    const cy = 760, R = 290, a = easeBack(prog(lt, 0, 0.45));
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(a, a);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 34; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = n > 0 ? A.acc : A.red; ctx.shadowColor = rgba(n > 0 ? A.acc : A.red, 0.9); ctx.shadowBlur = 40; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(1 - lt / dur, 0, 1)); ctx.stroke(); ctx.shadowBlur = 0;
    for (let i = 0; i < 60; i++) { const an = (i / 60) * Math.PI * 2; ctx.fillStyle = i % 5 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)'; ctx.fillRect(Math.cos(an) * (R + 44) - 2, Math.sin(an) * (R + 44) - 2, 4, i % 5 ? 4 : 14); }
    const z = 1.25 - 0.25 * easeOut(clamp(fr * 3, 0, 1));
    ctx.scale(z, z); text3d(ctx, String(n), 0, 120, 360, env.F.display, n > 0 ? A.acc : A.red, n > 0 ? '#0E7A5A' : '#7A0E1A', 18);
    ctx.restore();
    text(ctx, 'SECONDES', W / 2, cy + R + 150, 58, env.F.xb, rgba('#FFFFFF', 0.85 * a));
    if (L.kicker) { const k = easeOut(prog(lt, 0.2, 0.4)); ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = A.red; rr(ctx, W / 2 - 230, 250, 460, 84, 42); ctx.fill(); text(ctx, L.kicker, W / 2, 308, 44, env.F.xb, '#FFFFFF'); ctx.restore(); }
    if (n === 0) flash(ctx, lt, dur, 0.5);
    return { capY: 1560 };
  },

  // Mots qui arrivent puis se font barrer, et la conclusion qui claque.
  strike(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.red);
    const items = L.items || [], y0 = 420;
    items.forEach((it, i) => {
      const at = sayAt(s, it.say || it.label, T(s, 0.08 + i * 0.22)), a = easeBack(prog(lt, at - 0.1, 0.35)); if (a <= 0) return;
      const y = y0 + i * 230, sx = shake(lt, at + 0.35, 14);
      ctx.save(); ctx.translate(W / 2 + (1 - clamp(a, 0, 1)) * 700 + sx, y); ctx.rotate((1 - clamp(a, 0, 1)) * 0.3 - 0.02);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, -440, -90, 880, 170, 30); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3; ctx.stroke();
      const fs = fit(ctx, it.label, 96, 50, 700, env.F.black); text(ctx, it.label, 0, fs * 0.33, fs, env.F.black, '#FFFFFF');
      const sp = easeOut(prog(lt, at + 0.3, 0.22));
      if (sp > 0) { ctx.strokeStyle = A.red; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.shadowColor = rgba(A.red, 0.9); ctx.shadowBlur = 24; ctx.beginPath(); ctx.moveTo(-400, 10); ctx.lineTo(-400 + 800 * sp, -14); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = A.red; ctx.beginPath(); ctx.arc(390, -80, 44 * easeBack(sp), 0, Math.PI * 2); ctx.fill(); text(ctx, '✕', 390, -62, 54, env.F.xb, '#FFFFFF'); }
      ctx.restore();
    });
    if (L.final) {
      const fa = sayAt(s, L.final_say, T(s, 0.8)), a = easeBack(prog(lt, fa - 0.05, 0.4));
      if (a > 0) { ctx.save(); ctx.translate(W / 2, 1180 + shake(lt, fa, 16)); ctx.scale(a, a); ctx.fillStyle = A.acc; ctx.shadowColor = rgba(A.acc, 0.8); ctx.shadowBlur = 50; rr(ctx, -430, -110, 860, 190, 40); ctx.fill(); ctx.shadowBlur = 0; const fs = fit(ctx, L.final, 104, 50, 780, env.F.display); text(ctx, L.final, 0, fs * 0.3, fs, env.F.display, '#04140D'); ctx.restore(); flash(ctx, lt, fa, 0.35); }
    }
    return { capY: 1600 };
  },

  // Carte du match en 3D : elle pivote pour se présenter, reflet qui balaie.
  matchcard(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.acc);
    const a = easeOut(prog(lt, 0, 0.8)), ang = (1 - a) * 1.35 + Math.sin(t * 1.3) * 0.06, sx = Math.max(0.04, Math.cos(ang)), tilt = Math.sin(ang) * 0.18;
    const cw = 940, ch = 860, cy = 800 + Math.sin(t * 1.6) * 8;
    ctx.save(); ctx.translate(W / 2, cy); ctx.transform(sx, tilt, 0, 1, 0, 0); ctx.globalAlpha = clamp(a * 1.6, 0, 1);
    ctx.shadowColor = rgba(A.acc, 0.35); ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
    const g = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2); g.addColorStop(0, '#16213B'); g.addColorStop(1, '#070B16'); ctx.fillStyle = g; rr(ctx, -cw / 2, -ch / 2, cw, ch, 48); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = rgba(A.acc, 0.55); ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); rr(ctx, -cw / 2, -ch / 2, cw, ch, 48); ctx.clip();
    const pitch = ctx.createLinearGradient(0, -ch / 2, 0, -ch / 2 + 300); pitch.addColorStop(0, 'rgba(34,197,94,0.35)'); pitch.addColorStop(1, 'rgba(34,197,94,0)'); ctx.fillStyle = pitch; ctx.fillRect(-cw / 2, -ch / 2, cw, 300);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -ch / 2 + 40, 150, 0, Math.PI); ctx.stroke();
    const gx = -cw + ((lt * 700) % (cw * 3)); const gl = ctx.createLinearGradient(gx, 0, gx + 260, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.14)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    ctx.fillStyle = rgba(A.hot, 0.16); const lw = fit(ctx, L.league, 38, 26, 760, env.F.xb) ; font(ctx, lw, env.F.xb); const lwid = ctx.measureText(L.league).width + 70; rr(ctx, -lwid / 2, -ch / 2 + 50, lwid, 72, 36); ctx.fill(); text(ctx, L.league, 0, -ch / 2 + 99, lw, env.F.xb, A.hot);
    const la = easeBack(prog(lt, 0.45, 0.5)), ra = easeBack(prog(lt, 0.6, 0.5));
    ctx.save(); ctx.translate(-240, -40); ctx.scale(la, la); circleLogo(ctx, img(env, L.home_logo), 0, 0, 120, A.acc); ctx.restore();
    ctx.save(); ctx.translate(240, -40); ctx.scale(ra, ra); circleLogo(ctx, img(env, L.away_logo), 0, 0, 120, A.hot); ctx.restore();
    const hs = fit(ctx, L.home.toUpperCase(), 58, 34, 400, env.F.black); text(ctx, L.home.toUpperCase(), -240, 170, hs, env.F.black, '#FFFFFF');
    const as = fit(ctx, L.away.toUpperCase(), 58, 34, 400, env.F.black); text(ctx, L.away.toUpperCase(), 240, 170, as, env.F.black, '#FFFFFF');
    const va = easeBack(prog(lt, 0.8, 0.4)); ctx.save(); ctx.translate(0, -40); ctx.scale(va, va); ctx.rotate(-0.08); text3d(ctx, 'VS', 0, 40, 120, env.F.display, A.hot, '#8A5A00', 10); ctx.restore();
    const ka = easeOut(prog(lt, 1.0, 0.4)); ctx.globalAlpha *= ka;
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(ctx, -330, 250, 660, 110, 55); ctx.fill();
    ctx.fillStyle = A.red; ctx.beginPath(); ctx.arc(-270, 305, 12 + 4 * Math.sin(t * 6), 0, Math.PI * 2); ctx.fill();
    text(ctx, L.when, 20, 322, 50, env.F.xb, '#FFFFFF');
    ctx.restore();
    return { capY: 1560 };
  },

  // Vraie capture du bookmaker : téléphone, zoom caméra sur la cote, entourée.
  shot(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.acc); const im = img(env, L.shot); if (!im) return {};
    const za = sayAt(s, L.zoom_say, T(s, 0.3)), z = easeOut(prog(lt, za - 0.2, 0.9)), k0 = 1260 / im.height, k = k0 * (1 + (L.k || 1.9) * z);
    const fx = L.fx * im.width, fy = L.fy * im.height, cx = W / 2, cy = 760;
    const px = cx - (im.width * k0) / 2 * (1 - z) - fx * k * z + (cx - cx) , py = 0;
    // Caméra : du téléphone entier vers le point visé.
    const ox = (1 - z) * (cx - (im.width * k0) / 2) + z * (cx - fx * k), oy = (1 - z) * (cy - (im.height * k0) / 2) + z * (cy - fy * k);
    const a = easeBack(prog(lt, 0, 0.5)), bw = im.width * k, bh = im.height * k;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(0, (1 - clamp(a, 0, 1)) * 400);
    const fw = im.width * k0 + 36, fh = im.height * k0 + 36, fxp = cx - fw / 2, fyp = cy - fh / 2;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.fillStyle = '#111'; rr(ctx, fxp, fyp, fw, fh, 64); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = rgba(A.acc, 0.5); ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); rr(ctx, fxp + 18, fyp + 18, fw - 36, fh - 36, 48); ctx.clip();
    if (z > 0.02) { ctx.restore(); ctx.save(); rr(ctx, 60, 200, W - 120, 1140, 48); ctx.clip(); }
    ctx.drawImage(im, ox, oy, bw, bh); ctx.restore();
    if (z > 0.02) { ctx.strokeStyle = rgba(A.acc, 0.6 * z); ctx.lineWidth = 5; rr(ctx, 60, 200, W - 120, 1140, 48); ctx.stroke(); }
    ctx.restore();
    const ca = za + 0.8, tx = ox + fx * k, ty = oy + fy * k;
    scribble(ctx, tx, ty, (L.rw || 0.17) * im.width * k, (L.rh || 0.05) * im.height * k, prog(lt, ca, 0.6), A.hot);
    const ba = easeBack(prog(lt, ca + 0.5, 0.4));
    if (ba > 0 && L.badge) { ctx.save(); ctx.translate(W / 2, 1440); ctx.scale(ba, ba); ctx.fillStyle = A.hot; ctx.shadowColor = rgba(A.hot, 0.7); ctx.shadowBlur = 40; rr(ctx, -300, -70, 600, 130, 65); ctx.fill(); ctx.shadowBlur = 0; text(ctx, L.badge, 0, 22, 70, env.F.display, '#1A1200'); ctx.restore(); }
    if (L.src) text(ctx, L.src, W / 2, 170, 34, env.F.sb, rgba('#FFFFFF', 0.6));
    return { capY: 1640 };
  },

  // La règle en relief, puis le tampon qui tombe.
  rule(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.hot);
    const sa = sayAt(s, L.stamp_say, T(s, 0.7)), sh = shake(lt, sa, 22), a = easeBack(prog(lt, 0.05, 0.55));
    text(ctx, L.kicker || '', W / 2, 360, 50, env.F.xb, rgba(A.acc, easeOut(prog(lt, 0.1, 0.4))));
    ctx.save(); ctx.translate(W / 2 + sh, 720); ctx.scale(a, a); ctx.rotate(Math.sin(t * 1.2) * 0.02);
    text3d(ctx, L.value, 0, 120, 330, env.F.display, A.hot, '#8A5A00', 22); ctx.restore();
    if (L.sub) { const b = easeOut(prog(lt, 0.5, 0.4)); ctx.save(); ctx.globalAlpha = b; text(ctx, L.sub, W / 2, 960, 50, env.F.xb, '#FFFFFF'); ctx.restore(); }
    stamp(ctx, env, L.stamp, W / 2, 1210, lt, sa, A.acc, 100);
    flash(ctx, lt, sa, 0.4);
    return { capY: 1560 };
  },

  // Mur de matchs qui défile en perspective + compteur qui s'emballe.
  wall(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.red); const cards = L.cards || []; if (!cards.length) return {};
    ctx.save();
    for (let r = 0; r < 14; r++) for (let c = 0; c < 2; c++) {
      const card = cards[(r * 2 + c) % cards.length], y = 260 + r * 190 - ((lt * 520) % (190 * 7)), x = c ? 560 : 60;
      if (y < -200 || y > H) continue;
      ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(x + 230, y + 80); ctx.rotate(-0.05);
      ctx.fillStyle = 'rgba(22,33,59,0.92)'; rr(ctx, -230, -80, 460, 160, 26); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
      circleLogo(ctx, img(env, card.home_logo), -170, -20, 30, 'rgba(255,255,255,0.3)'); circleLogo(ctx, img(env, card.away_logo), -170, 50, 30, 'rgba(255,255,255,0.3)');
      const f1 = fit(ctx, card.home, 32, 20, 300, env.F.xb); text(ctx, card.home, -115, -8, f1, env.F.xb, '#FFFFFF', 'left');
      const f2 = fit(ctx, card.away, 32, 20, 300, env.F.xb); text(ctx, card.away, -115, 62, f2, env.F.xb, '#FFFFFF', 'left');
      ctx.restore();
    }
    ctx.restore();
    const dg = ctx.createLinearGradient(0, 0, 0, H); dg.addColorStop(0, 'rgba(4,6,13,0.95)'); dg.addColorStop(0.3, 'rgba(4,6,13,0.2)'); dg.addColorStop(0.7, 'rgba(4,6,13,0.2)'); dg.addColorStop(1, 'rgba(4,6,13,0.95)'); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
    const n = Math.round((L.count || 300) * easeOut(prog(lt, 0.1, Math.max(1, s.dur * 0.6))));
    ctx.save(); ctx.translate(W / 2 + shake(lt, s.dur * 0.6, 10), 820); ctx.fillStyle = 'rgba(4,6,13,0.85)'; rr(ctx, -420, -230, 840, 380, 50); ctx.fill(); ctx.strokeStyle = rgba(A.red, 0.7); ctx.lineWidth = 5; ctx.stroke();
    text3d(ctx, String(n), 0, 40, 230, env.F.display, A.red, '#6A0A14', 14); text(ctx, L.label || 'MATCHS PAR JOUR', 0, 120, 52, env.F.xb, '#FFFFFF'); ctx.restore();
    return { capY: 1560 };
  },

  // Bouton « S'abonner » + doigt qui tape + cloche.
  subscribe(ctx, env, s, lt, t) {
    const L = s.look; bg(ctx, env, s, t, A.red);
    const a = easeBack(prog(lt, 0.1, 0.5)), tap = T(s, L.tap_at == null ? 0.35 : L.tap_at), done = lt > tap + 0.1;
    ctx.save(); ctx.translate(W / 2, 760); ctx.scale(a * (lt > tap && lt < tap + 0.2 ? 0.92 : 1), a);
    ctx.fillStyle = done ? '#2A2F3F' : A.red; ctx.shadowColor = rgba(done ? '#FFFFFF' : A.red, 0.6); ctx.shadowBlur = 50; rr(ctx, -360, -95, 720, 190, 95); ctx.fill(); ctx.shadowBlur = 0;
    text(ctx, done ? 'ABONNÉ ✓' : "S'ABONNER", 0, 30, 88, env.F.display, '#FFFFFF'); ctx.restore();
    const hx = W / 2 + 200, hy = 900 + (1 - easeOut(prog(lt, tap - 0.5, 0.5))) * 400;
    ctx.save(); ctx.globalAlpha = 1 - prog(lt, tap + 0.6, 0.3); ctx.fillStyle = '#FFE0C2'; ctx.beginPath(); ctx.arc(hx, hy, 46, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(hx - 30, hy, 60, 170); ctx.restore();
    if (lt > tap) { const r = prog(lt, tap, 0.5); ctx.strokeStyle = rgba('#FFFFFF', 1 - r); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(hx, hy - 20, 40 + r * 120, 0, Math.PI * 2); ctx.stroke(); }
    const ba = easeBack(prog(lt, tap + 0.3, 0.4)); if (ba > 0) { ctx.save(); ctx.translate(W / 2, 1100); ctx.scale(ba, ba); ctx.rotate(Math.sin(lt * 18) * 0.25 * (1 - prog(lt, tap + 0.3, 1.2))); text(ctx, '🔔', 0, 60, 170, env.F.xb, A.hot); ctx.restore(); }
    if (L.site) { const sa = easeOut(prog(lt, tap + 0.6, 0.4)); ctx.save(); ctx.globalAlpha = sa; text(ctx, L.site, W / 2, 1320, 64, env.F.black, A.acc); ctx.restore(); }
    return { capY: 1580 };
  },
};

if (process.env.TK2_ON) for (const [k, f] of Object.entries(TK2)) TK[k] = (ctx, env, s, lt, t) => { bg(ctx, env, s, t, A.acc); return f(ctx, env, s, lt, t); };

export function tkSfx(s) {
  const L = s.look || {}, out = [...tk2Sfx(s)];
  if (L.type === 'countdown') { const d = L.span || Math.min(3.2, s.dur - 0.3); for (let i = 0; i < 5; i++) out.push(['pop', (d / 5) * i, 0.45]); out.push(['impact', d, 0.8], ['whoosh', 0, 0.3]); }
  if (L.type === 'strike') { (L.items || []).forEach((it, i) => { const at = sayAt(s, it.say || it.label, T(s, 0.08 + i * 0.22)); out.push(['whoosh', at - 0.1, 0.35], ['impact', at + 0.3, 0.55]); }); if (L.final) out.push(['ding', sayAt(s, L.final_say, T(s, 0.8)), 0.6]); }
  if (L.type === 'matchcard') out.push(['whoosh', 0, 0.5], ['pop', 0.45, 0.4], ['pop', 0.6, 0.4], ['impact', 0.8, 0.6], ['ding', 1.0, 0.35]);
  if (L.type === 'shot') { const za = sayAt(s, L.zoom_say, T(s, 0.3)); out.push(['whoosh', 0, 0.35], ['rise', za - 0.2, 0.4], ['keys_s', za + 0.8, 0.35], ['ding', za + 1.3, 0.55]); }
  if (L.type === 'rule') out.push(['rise', 0, 0.35], ['impact', 0.1, 0.5], ['impact', sayAt(s, L.stamp_say, T(s, 0.7)), 0.95]);
  if (L.type === 'wall') out.push(['whoosh', 0, 0.45], ['rise', 0.1, 0.45], ['impact', s.dur * 0.6, 0.6]);
  if (L.type === 'subscribe') { const tap = T(s, L.tap_at == null ? 0.35 : L.tap_at); out.push(['whoosh', 0.1, 0.35], ['pop', tap, 0.7], ['ding', tap + 0.3, 0.6]); }
  return out;
}
export const tkImages = (L) => [L.art, L.shot, L.home_logo, L.away_logo, ...(L.cards || []).flatMap((c) => [c.home_logo, c.away_logo])].filter(Boolean);
