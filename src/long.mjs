// Vidéo YouTube longue (1920x1080) : présentation du site avec ses VRAIS écrans.
// À gauche : chapitre, titre, points clés. À droite : un téléphone qui affiche
// les écrans réels du site, filmés juste avant le montage (défilement, appuis).
// Voix : voix clonée de l'administrateur (voix Henri en secours).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { freemem } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { api, download } from './api.mjs';
import { run, duration } from './sh.mjs';
import { loadFonts, loadImg } from './assets.mjs';
import { buildTimeline } from './timeline.mjs';
import { makeSfx, mixAudio, libraryMusic } from './audio.mjs';
import { cloneVoices } from './clone.mjs';
import { captureScreens, screenKey } from './capture.mjs';
import { loadShots, screenState, drawPhone, stepTimes } from './phone.mjs';
import { Broll } from './broll.mjs';
import { VISUALS, visualSfx } from './visuals.mjs';
import { LOOKS, lookSfx, lookImages, finishFx } from './cine.mjs';
import { Clip } from './clip.mjs';
import { drawWalkPhone, CW, CH } from './walkPhone.mjs';
import { alignScenes } from './align.mjs';
import { clamp, prog, easeOut, easeBack, rgba, rr, font, fitLines, seeded } from './draw.mjs';

const W = 1920, H = 1080, FPS = 30;
const P = { a: '#33D98E', b: '#818CF8', d1: '#0A0F1E', d2: '#1C2336', ink: '#E7ECFB', mute: '#9AA4C6' };
const ACCENTS = ['#33D98E', '#818CF8', '#F3C969', '#22D3EE', '#FB923C', '#F472B6'];
const accentOf = (s) => ACCENTS[(s.chapter || 0) % ACCENTS.length];
const COL = { x: 120, w: 1060, cx: 650 };

function background(ctx, env, s, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.fillStyle = P.d1; ctx.fillRect(0, 0, W, H);
  if (env.brollFrame) {
    // Plan d'illustration en fond (lent zoom), assombri pour garder le texte lisible.
    const z = 1.04 + 0.06 * prog(t - s.start, 0, s.dur), w = W * z, h = H * z;
    ctx.drawImage(env.brollFrame, (W - w) / 2, (H - h) / 2, w, h);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    const side = s.kind === 'chapter' || s.kind === 'point';
    g.addColorStop(0, 'rgba(10,15,30,' + (side ? 0.93 : 0.74) + ')');
    g.addColorStop(0.55, 'rgba(10,15,30,' + (side ? 0.6 : 0.62) + ')');
    g.addColorStop(1, 'rgba(10,15,30,' + (side ? 0.45 : 0.74) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    return;
  }
  if (env.bg) {
    const z = 1.08 + 0.05 * Math.sin(t * 0.05);
    const k = Math.max(W / env.bg.width, H / env.bg.height) * z;
    const w = env.bg.width * k, h = env.bg.height * k;
    ctx.globalAlpha = 0.12;
    ctx.drawImage(env.bg, (W - w) / 2 + Math.sin(t * 0.1) * 40, (H - h) / 2 + Math.cos(t * 0.08) * 25, w, h);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, rgba(P.d1, 0.85)); g.addColorStop(0.5, rgba(P.d2, 0.55)); g.addColorStop(1, rgba(P.d1, 0.92));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const acc = accentOf(s);
  [[0.2, 0.3, 0.23], [0.8, 0.7, 0.17]].forEach(([fx, fy, sp], i) => {
    const x = W * fx + Math.sin(t * sp + i) * 260, y = H * fy + Math.cos(t * sp * 0.8 + i) * 160;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 720);
    rg.addColorStop(0, rgba(i ? P.b : acc, 0.18)); rg.addColorStop(1, rgba(acc, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  });
  ctx.fillStyle = '#FFFFFF';
  if (s.kind !== 'cta' && s.kind !== 'outro') for (const p of env.particles) {
    const y = (((p.y - t * p.v) % H) + H) % H;
    ctx.globalAlpha = p.a;
    ctx.beginPath(); ctx.arc(p.x + Math.sin(t + p.y) * 12, y, p.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function logo(ctx, env, cx, cy, size, glow) {
  if (!env.logo) return;
  const k = size / Math.max(env.logo.width, env.logo.height);
  const w = env.logo.width * k, h = env.logo.height * k;
  if (glow) { ctx.shadowColor = rgba(P.a, 0.55); ctx.shadowBlur = glow; }
  ctx.drawImage(env.logo, cx - w / 2, cy - h / 2, w, h);
  ctx.shadowBlur = 0;
}

function textBlock(ctx, text, fam, size, min, maxW, maxLines, x, y, color) {
  const fit = fitLines(ctx, text, fam, size, min, maxW, maxLines);
  font(ctx, fit.size, fam); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  fit.lines.forEach((l, i) => ctx.fillText(l.join(' '), x, y + i * fit.size * 1.12));
  return fit.lines.length * fit.size * 1.12;
}

// Titre tapé lettre par lettre, avec curseur clignotant.
const typeDur = (text) => clamp(String(text || '').length / 30, 0.5, 1.5);
function typedBlock(ctx, text, fam, size, min, maxW, maxLines, x, y, color, lt, at, caret) {
  const fit = fitLines(ctx, text, fam, size, min, maxW, maxLines);
  const total = String(text || '').length, d = typeDur(text);
  let rem = Math.floor(total * prog(lt, at, d));
  font(ctx, fit.size, fam); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const lh = fit.size * 1.12; let cx = x, cy = y;
  fit.lines.forEach((l, i) => {
    const str = l.join(' ');
    if (rem <= 0) return;
    const part = str.slice(0, rem), yy = y + i * lh;
    ctx.fillText(part, x, yy);
    cx = x + ctx.measureText(part).width; cy = yy;
    rem -= str.length + 1;
  });
  if (lt >= at && lt < at + d + 1.4 && (lt < at + d || Math.floor(lt * 2.4) % 2 === 0)) {
    ctx.fillStyle = caret; ctx.fillRect(cx + 8, cy - fit.size * 0.8, Math.max(4, fit.size * 0.07), fit.size * 0.92);
  }
  return fit.lines.length * lh;
}

function drawCta(ctx, env, s, lt) {
  const T = (f) => (s.voiceAt - s.start) + s.voiceDur * f;
  const url = 'alvecapital.fr', t0 = T(0.12), tType = url.length / 12, tTap = t0 + tType + 1.3;
  const a = easeOut(prog(lt, 0.1, 0.6));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 30);
  font(ctx, 72, env.F.black); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.fillText(s.title || "Ton compte gratuit t'attend", W / 2, 230);
  ctx.restore();
  const pb = easeOut(prog(lt, 0.3, 0.6));
  ctx.save(); ctx.globalAlpha *= pb;
  const bx = W / 2 - 480, by = 300, bw = 960, bh = 104;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#F4F6FB'; rr(ctx, bx, by, bw, bh, 52); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = P.a; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx + 62, by + bh / 2, 16, 0, Math.PI * 2); ctx.stroke();
  const n = Math.floor(url.length * prog(lt, t0, tType));
  font(ctx, 56, env.F.xb); ctx.textAlign = 'left'; ctx.fillStyle = '#0A0F1E';
  const part = url.slice(0, n); ctx.fillText(part, bx + 108, by + 72);
  if (lt < t0 + tType + 0.8 && Math.floor(lt * 2.4) % 2 === 0) { ctx.fillStyle = P.a; ctx.fillRect(bx + 114 + ctx.measureText(part).width, by + 26, 5, 56); }
  ctx.restore();
  const pc = prog(lt, t0 + tType + 0.3, 0.6);
  if (pc > 0) {
    const done = lt > tTap + 0.1;
    ctx.save(); ctx.translate(W / 2, 560); const z = Math.max(0.01, easeBack(pc)) * (lt > tTap - 0.08 && lt < tTap + 0.12 ? 0.95 : 1); ctx.scale(z, z);
    ctx.shadowColor = rgba(P.a, 0.6); ctx.shadowBlur = 50;
    const g = ctx.createLinearGradient(-380, 0, 380, 0); g.addColorStop(0, '#33D98E'); g.addColorStop(1, '#10B981');
    ctx.fillStyle = g; rr(ctx, -380, -70, 760, 140, 70); ctx.fill(); ctx.shadowBlur = 0;
    font(ctx, 50, env.F.black); ctx.textAlign = 'center'; ctx.fillStyle = '#0A0F1E';
    ctx.fillText(done ? 'Compte créé  ✓' : 'Créer mon compte gratuit', 0, 18);
    ctx.restore();
    const k = prog(lt, tTap - 0.3, 0.8);
    if (k > 0 && k < 1) { ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(W / 2 + 160, 560, 24 + 80 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  const q = easeOut(prog(lt, tTap + 0.4, 0.6));
  ctx.save(); ctx.globalAlpha *= q;
  font(ctx, 36, env.F.xb); ctx.textAlign = 'center'; ctx.fillStyle = P.mute;
  ctx.fillText('Pronostics · Arbitrage · Mise automatique · Coupons', W / 2, 740);
  ctx.restore();
  s._cta = { t0, tType, tTap };
}

function drawIntro(ctx, env, s, lt) {
  const p = easeBack(prog(lt, 0.05, 0.9));
  ctx.save(); ctx.translate(W / 2, 330); const z = Math.max(0.01, 0.6 + 0.4 * p); ctx.scale(z, z);
  ctx.globalAlpha *= clamp(p, 0, 1);
  logo(ctx, env, 0, 0, 300, 40 + 20 * Math.sin(lt * 3));
  ctx.restore();
  const q = easeOut(prog(lt, 0.5, 0.7));
  ctx.save(); ctx.globalAlpha *= q; ctx.translate(0, (1 - q) * 30);
  font(ctx, 130, env.F.display); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.fillText('AL VE CAPITAL', W / 2, 640);
  ctx.fillStyle = P.a; ctx.fillRect(W / 2 - 240 * q, 676, 480 * q, 6);
  font(ctx, 52, env.F.xb); ctx.fillStyle = P.ink;
  const it = s.title || 'Le site en quelques minutes', nn = Math.floor(it.length * prog(lt, 0.9, typeDur(it)));
  ctx.fillText(it.slice(0, nn), W / 2, 770);
  font(ctx, 32, env.F.sb); ctx.fillStyle = P.mute;
  ctx.fillText('Pronostics · Arbitrage · Mise automatique · ProLab · Montante · Virtuel', W / 2, 836);
  ctx.restore();
}

function drawChapter(ctx, env, s, lt) {
  const acc = accentOf(s);
  const p = easeOut(prog(lt, 0, 0.7));
  font(ctx, 420, env.F.display); ctx.textAlign = 'left'; ctx.fillStyle = rgba(acc, 0.14 * p);
  ctx.fillText(String(s.chapter).padStart(2, '0'), 90 - (1 - p) * 80, 720);
  ctx.fillStyle = acc; ctx.fillRect(COL.x + 10, 444, 260 * easeOut(prog(lt, 0.2, 0.8)), 7);
  typedBlock(ctx, s.title, env.F.black, 112, 64, COL.w - 40, 2, COL.x + 10, 580, P.ink, lt, 0.35, acc);
  const sw = prog(lt, 0.1, 1.1);
  if (sw > 0 && sw < 1) {
    const x = -500 + sw * (W + 1000), g = ctx.createLinearGradient(x - 250, 0, x + 250, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.09)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function drawPoint(ctx, env, s, lt) {
  const acc = accentOf(s);
  const chip = String(env.chapters[s.chapter] || s.title || '').toUpperCase();
  font(ctx, 24, env.F.xb);
  const cw = Math.min(COL.w, ctx.measureText(chip).width + 56);
  ctx.fillStyle = rgba(acc, 0.16); rr(ctx, COL.x, 130, cw, 52, 26); ctx.fill();
  ctx.fillStyle = acc; ctx.textAlign = 'left'; ctx.fillText(chip, COL.x + 28, 165);
  const th = typedBlock(ctx, s.title || '', env.F.black, 72, 46, COL.w, 2, COL.x, 280, P.ink, lt, 0.15, acc);
  const bl = s.bullets || [], n = bl.length;
  const top = 280 + th + 10, gap = 20;
  const ch = n ? Math.min(118, (900 - top - (n - 1) * gap) / n) : 0;
  const lead = s.voiceAt - s.start;
  bl.forEach((b, i) => {
    const at = lead + 0.3 + s.voiceDur * 0.8 * (i / Math.max(n, 1));
    const p = easeOut(prog(lt, at, 0.55));
    if (p <= 0) return;
    const y = top + i * (ch + gap);
    ctx.save(); ctx.globalAlpha *= p; ctx.translate(-(1 - p) * 60, 0);
    ctx.fillStyle = 'rgba(28,35,54,0.86)'; rr(ctx, COL.x, y, COL.w - 60, ch, 22); ctx.fill();
    ctx.strokeStyle = rgba(acc, 0.32); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = acc; rr(ctx, COL.x, y, 9, ch, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(COL.x + 72, y + ch / 2, 28, 0, Math.PI * 2); ctx.fillStyle = rgba(acc, 0.2); ctx.fill();
    font(ctx, 30, env.F.black); ctx.fillStyle = acc; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), COL.x + 72, y + ch / 2 + 10);
    const fit = fitLines(ctx, b, env.F.sb, 36, 24, COL.w - 200, 2);
    font(ctx, fit.size, env.F.sb); ctx.fillStyle = P.ink; ctx.textAlign = 'left';
    const lh = fit.size * 1.2, y0 = y + ch / 2 - (fit.lines.length * lh) / 2 + fit.size * 0.85;
    fit.lines.forEach((l, k) => ctx.fillText(l.join(' '), COL.x + 124, y0 + k * lh));
    ctx.restore();
  });
}

// Carte de fin sobre : logo, nom, adresse du site dans une barre discrète.
function drawOutro(ctx, env, s, lt) {
  const a = easeOut(prog(lt, 0.05, 0.7));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 24);
  logo(ctx, env, W / 2, 290, 150, 0);
  font(ctx, 84, env.F.display); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.fillText('AL VE CAPITAL', W / 2, 470);
  ctx.restore();
  const b = easeOut(prog(lt, 0.45, 0.7));
  ctx.fillStyle = P.a; ctx.fillRect(W / 2 - 170 * b, 502, 340 * b, 4);
  const c = easeOut(prog(lt, 0.75, 0.7));
  ctx.save(); ctx.globalAlpha *= c; ctx.translate(0, (1 - c) * 18);
  const bw = 620, bh = 92, bx = W / 2 - bw / 2, by = 570;
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, bx, by, bw, bh, 46); ctx.fill();
  ctx.strokeStyle = rgba(P.a, 0.5); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = P.a; ctx.beginPath(); ctx.arc(bx + 58, by + bh / 2, 9, 0, Math.PI * 2); ctx.fill();
  font(ctx, 48, env.F.xb); ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF';
  ctx.fillText('alvecapital.fr', W / 2 + 18, by + 62);
  ctx.restore();
  const d = easeOut(prog(lt, 1.15, 0.7));
  ctx.save(); ctx.globalAlpha *= d;
  font(ctx, 30, env.F.sb); ctx.textAlign = 'center'; ctx.fillStyle = P.mute;
  ctx.fillText('Compte gratuit  ·  18+  ·  Joue toujours de façon responsable', W / 2, 770);
  ctx.restore();
}

function drawOutroOld(ctx, env, s, lt) {
  const p0 = easeBack(prog(lt, 0.05, 0.8));
  ctx.save(); ctx.translate(W / 2, 220); const z0 = Math.max(0.01, p0); ctx.scale(z0, z0);
  logo(ctx, env, 0, 0, 200, 40); ctx.restore();
  font(ctx, 54, env.F.sb); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.fillText('Rendez-vous sur', W / 2, 430);
  const p = easeBack(prog(lt, 0.25, 0.9));
  ctx.save(); ctx.translate(W / 2, 600); ctx.scale(Math.max(0.01, p), Math.max(0.01, p));
  font(ctx, 190, env.F.display); ctx.fillStyle = P.a; ctx.shadowColor = rgba(P.a, 0.7); ctx.shadowBlur = 60;
  ctx.fillText('alvecapital.fr', 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
  const q = easeOut(prog(lt, 1.0, 0.7));
  ctx.save(); ctx.globalAlpha *= q;
  const pill = 'Compte gratuit · Pronostics · Arbitrage · Outils IA';
  font(ctx, 38, env.F.xb); const w = ctx.measureText(pill).width + 80;
  ctx.fillStyle = rgba(P.a, 0.16); rr(ctx, W / 2 - w / 2, 690, w, 78, 39); ctx.fill();
  ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.fillText(pill, W / 2, 742);
  font(ctx, 30, env.F.sb); ctx.fillStyle = P.mute; ctx.fillText('18+ · Joue toujours de façon responsable', W / 2, 860);
  ctx.restore();
}

function groups(s) {
  if (s._g) return s._g;
  const out = []; let cur = null;
  s.words.forEach((w, k) => {
    if (!cur || k - cur.from >= 8 || cur.len + w.text.length > 44) { cur = { from: k, to: k, len: w.text.length }; out.push(cur); }
    else { cur.to = k; cur.len += w.text.length + 1; }
  });
  s._g = out;
  return out;
}

function drawSubs(ctx, env, s, t, cx) {
  if (!s.words.length) return;
  const p = (t - s.voiceAt) / s.voiceDur;
  if (p < 0 || p > 1.03) return;
  let cur = s.words.findIndex((w) => p < w.end);
  if (cur < 0) cur = s.words.length - 1;
  const g = groups(s).find((x) => cur >= x.from && cur <= x.to);
  if (!g) return;
  const words = s.words.slice(g.from, g.to + 1).map((w) => w.text);
  let size = 40; font(ctx, size, env.F.xb);
  const measure = () => { const sp = ctx.measureText(' ').width; const ws = words.map((w) => ctx.measureText(w).width); return { sp, ws, total: ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1) }; };
  let m = measure();
  const maxW = cx === W / 2 ? W - 260 : COL.w;
  while (m.total > maxW && size > 26) { size -= 2; font(ctx, size, env.F.xb); m = measure(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(5,8,18,0.78)'; rr(ctx, cx - m.total / 2 - 34, 950, m.total + 68, 74, 37); ctx.fill();
  let x = cx - m.total / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const acc = accentOf(s);
  words.forEach((w, i) => {
    const k = g.from + i;
    ctx.fillStyle = k === cur ? acc : k < cur ? P.ink : rgba(P.ink, 0.55);
    ctx.fillText(w, x, 1000);
    x += m.ws[i] + m.sp;
  });
}

function drawHud(ctx, env, s, t, light) {
  ctx.globalAlpha = 1;
  if (s.kind !== 'intro' && s.kind !== 'outro' && !(s.look && s.look.nohud)) {
    logo(ctx, env, COL.x + 26, 66, 54, 0);
    font(ctx, 30, env.F.display); ctx.textAlign = 'left'; ctx.fillStyle = light ? '#0B1020' : rgba(P.ink, 0.92);
    ctx.fillText('AL VE CAPITAL', COL.x + 66, 64);
    font(ctx, 20, env.F.sb); ctx.fillStyle = light ? 'rgba(11,16,32,0.55)' : rgba(P.ink, 0.5); ctx.fillText('alvecapital.fr', COL.x + 66, 90);
  }
  const y = H - 8;
  ctx.fillStyle = rgba(P.ink, 0.1); ctx.fillRect(0, y, W, 8);
  ctx.fillStyle = accentOf(s); ctx.fillRect(0, y, W * (t / env.total), 8);
  ctx.fillStyle = P.d1;
  for (const m of env.marks) ctx.fillRect(W * m - 2, y, 4, 8);
}

// Écran réel du site affiché par le téléphone pendant la scène i.
function layerOf(env, s, lt) {
  const shot = s.shotKey && env.shots[s.shotKey];
  return shot ? { shot, st: screenState(shot, s.shotScreen, lt, s.dur), alpha: 1 } : null;
}

function phone(ctx, env, tl, i, t) {
  const s = tl.scenes[i], lt = t - s.start;
  const cur = layerOf(env, s, lt);
  if (!cur) return;
  const prev = tl.scenes[i - 1], next = tl.scenes[i + 1];
  const layers = [cur];
  const prevL = prev && layerOf(env, prev, prev.dur);
  if (prevL && lt < 0.7) { prevL.alpha = 1 - easeOut(prog(lt, 0, 0.7)); layers.push(prevL); }
  let vis = prevL ? 1 : easeOut(prog(lt, 0, 0.9));
  if (!(next && next.shotKey && env.shots[next.shotKey])) vis *= 1 - prog(lt, s.dur - 0.5, 0.5);
  drawPhone(ctx, layers, vis, t, accentOf(s));
}

function drawFrame(ctx, env, tl, i, t) {
  const s = tl.scenes[i];
  const look = s.look && LOOKS[s.look.type];
  if (look) {
    const lt = t - s.start;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    const r = look(ctx, env, s, lt, t) || {};
    if (r.phone) { if (s.seg) drawWalkPhone(ctx, env, s, lt, t, accentOf(s)); else phone(ctx, env, tl, i, t); }
    if (r.subs) drawSubs(ctx, env, s, t, W / 2);
    drawHud(ctx, env, s, t, r.light);
    finishFx(ctx, s, lt);
    return;
  }
  background(ctx, env, s, t);
  if (s.seg) drawWalkPhone(ctx, env, s, t - s.start, t, accentOf(s)); else phone(ctx, env, tl, i, t);
  const lt = t - s.start;
  const inn = easeOut(prog(lt, 0, 0.5)), out = prog(lt, s.dur - 0.3, 0.3);
  ctx.save();
  ctx.globalAlpha = clamp(inn * (1 - out), 0, 1);
  ctx.translate((1 - inn) * 70 - out * 70, 0);
  if (s.kind === 'intro') drawIntro(ctx, env, s, lt);
  else if (s.kind === 'chapter') drawChapter(ctx, env, s, lt);
  else if (s.kind === 'outro') drawOutro(ctx, env, s, lt);
  else if (s.kind === 'cta') drawCta(ctx, env, s, lt);
  else drawPoint(ctx, env, s, lt);
  ctx.restore();
  const vz = s.visual && VISUALS[s.visual.type];
  if (vz) {
    const T = (f) => (s.voiceAt - s.start) + s.voiceDur * f;
    ctx.save(); ctx.globalAlpha = clamp(inn * (1 - out), 0, 1); ctx.translate((1 - inn) * 120, 0);
    vz(ctx, env.F, lt, T, s.visual);
    ctx.restore();
  }
  const side = (s.shotKey && env.shots[s.shotKey]) || vz || s.seg;
  drawSubs(ctx, env, s, t, side ? COL.cx : W / 2);
  drawHud(ctx, env, s, t);
  finishFx(ctx, s, t - s.start);
}

// Montage découpé en segments d'une minute, chacun dans un processus séparé :
// la mémoire est entièrement libérée entre deux segments (une vidéo de 7 min
// d'un seul bloc saturait la machine vers la 6e minute de montage), un segment
// interrompu est refait seul, et deux segments se montent en même temps.
const SEG = 1800, PAR = 2;
const mem = () => 'mémoire ' + Math.round(process.memoryUsage().rss / 1e6) + ' Mo, libre ' + Math.round(freemem() / 1e6) + ' Mo';

async function render(spec, tl, out, DIR) {
  const frames = Math.ceil(tl.total * FPS), segs = [];
  for (let f = 0; f < frames; f += SEG) segs.push([f, Math.min(frames, f + SEG), join(DIR, 'seg' + segs.length + '.mp4')]);
  const specFile = join(DIR, 'long-spec.json');
  writeFileSync(specFile, JSON.stringify({ spec, tl }));
  console.log('Montage en ' + segs.length + ' segments (' + PAR + ' en parallèle) — ' + mem());
  let next = 0;
  const worker = async () => { while (next < segs.length) { const k = next++; await segment(specFile, segs[k], k); } };
  await Promise.all(Array.from({ length: Math.min(PAR, segs.length) }, worker));
  const list = join(DIR, 'segs.txt');
  writeFileSync(list, segs.map((s) => "file '" + s[2] + "'").join('\n'));
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
}

async function segment(specFile, [f0, f1, out], k) {
  const script = fileURLToPath(new URL('./longSegment.mjs', import.meta.url));
  for (let a = 1; a <= 2; a++) {
    const p = spawn(process.execPath, [script, specFile, String(f0), String(f1), out], { stdio: ['ignore', 'inherit', 'inherit'] });
    const [code, sig] = await once(p, 'close');
    if (code === 0) { console.log('Segment ' + (k + 1) + ' terminé — ' + mem()); return; }
    console.error('Segment ' + (k + 1) + ' interrompu (code ' + code + (sig ? ', ' + sig : '') + ')' + (a < 2 ? ' : nouvel essai' : ''));
  }
  throw new Error('Segment ' + (k + 1) + ' impossible à monter');
}

// Reconstruit l'habillage dans le processus du segment (polices déjà
// téléchargées, écrans filmés relus depuis le disque).
export async function buildEnv(spec, DIR) {
  for (const name of Object.values(spec.F)) GlobalFonts.registerFromPath(join(DIR, name + '.ttf'), name);
  const r = seeded(7);
  const env = {
    F: spec.F, total: spec.total, chapters: spec.chapters, marks: spec.marks, brolls: spec.brolls, brollDur: spec.brollDur || {},
    shots: await loadShots(spec.raw),
    particles: Array.from({ length: 50 }, () => ({ x: r() * W, y: r() * H, v: 15 + r() * 45, s: 2 + r() * 4, a: 0.1 + r() * 0.25 })),
    bg: await loadImg(spec.bg), logo: await loadImg(spec.logo), imgs: {}, walk: spec.walk || null,
  };
  for (const u of spec.imgs || []) env.imgs[u] = await loadImg(u);
  if (!env.logo) throw new Error('Logo du site introuvable');
  return env;
}

// Images f0 à f1 (exclue) de la vidéo, encodées dans le fichier out.
export async function renderSegment(env, tl, f0, f1, out) {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errTail = '';
  ff.stderr.on('data', (d) => { errTail = (errTail + d).slice(-2000); });
  ff.stdin.on('error', () => {});
  let i = 0, bi = -1, reader = null, clip = null;
  for (let f = f0; f < f1; f++) {
    const t = f / FPS;
    while (i < tl.scenes.length - 1 && t >= tl.scenes[i].start + tl.scenes[i].dur) i++;
    if (i !== bi) {
      if (reader) reader.close();
      if (clip) clip.close();
      reader = null; clip = null; bi = i;
      const sc = tl.scenes[i], file = sc.broll && env.brolls[sc.broll];
      if (file) {
        // Segment commencé en cours de scène : le plan reprend au bon endroit.
        const d = env.brollDur[sc.broll] || 0;
        let at = (sc.broll_start || 1) + Math.max(0, t - sc.start);
        if (d > 2) at = at % (d - 0.5);
        reader = new Broll(file, at);
      }
      // Scène filmée sur le site : l'extrait reprend au bon endroit.
      if (sc.seg && env.walk) {
        const off = Math.max(0, t - sc.start) * (sc.rate || 1);
        clip = new Clip(env.walk, sc.seg.start + off, Math.max(0.3, sc.seg.end - sc.seg.start - off + 0.15), sc.rate || 1, CW, CH);
      }
    }
    env.brollFrame = reader ? await reader.next() : null;
    env.clipFrame = clip ? ((await clip.next()) || null) : null;
    drawFrame(ctx, env, tl, i, t);
    const img = ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if ((f - f0) % 600 === 0) console.log('image ' + f + ' / ' + Math.ceil(tl.total * FPS) + ' — ' + mem());
  }
  if (reader) reader.close();
  if (clip) clip.close();
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('Encodage vidéo échoué : ' + errTail.slice(-300));
}

function events(tl, env) {
  const ev = [];
  tl.scenes.forEach((s) => {
    if (s.look) for (const [name, at, vol] of lookSfx(s)) ev.push({ name, at: s.start + at, vol });
    if (s.kind === 'intro') ev.push({ name: 'impact', at: 0.3, vol: 0.8 });
    if (s.kind === 'chapter') ev.push({ name: 'rise', at: s.start - 0.4, vol: 0.3 }, { name: 'impact', at: s.start + 0.35, vol: 0.55 });
    if (s.kind === 'point') ev.push({ name: 'whoosh', at: s.start - 0.08, vol: 0.35 });
    const T = (f) => (s.voiceAt - s.start) + s.voiceDur * f;
    if (s.kind === 'chapter') ev.push({ name: typeDur(s.title) < 1 ? 'keys_s' : 'keys', at: s.start + 0.35, vol: 0.35 });
    if (s.kind === 'point' && s.title) ev.push({ name: typeDur(s.title) < 1 ? 'keys_s' : 'keys', at: s.start + 0.15, vol: 0.3 });
    const nb = (s.bullets || []).length;
    for (let b = 0; b < nb; b++) ev.push({ name: 'pop', at: s.start + T(0) + 0.3 + s.voiceDur * 0.8 * (b / nb), vol: 0.35 });
    if (s.visual && VISUALS[s.visual.type]) for (const [name, at] of visualSfx(s.visual.type, T)) ev.push({ name, at: s.start + at, vol: name === 'key' ? 0.35 : 0.4 });
    if (s.shotKey && env.shots[s.shotKey]) {
      const shot = env.shots[s.shotKey];
      stepTimes(shot, s.shotScreen, s.dur).forEach((x, k) => {
        if (x < 0 || !Number.isFinite(x)) return;
        const ty = shot.stills[k].type;
        if (ty === 'click') ev.push({ name: 'tap', at: s.start + x - 0.05, vol: 0.45 });
        if (ty === 'key') ev.push({ name: 'key', at: s.start + x, vol: 0.4 });
      });
    }
    if (s.kind === 'cta') {
      const t0 = T(0.12), tType = 'alvecapital.fr'.length / 12, tTap = t0 + tType + 1.3;
      ev.push({ name: 'keys', at: s.start + t0, vol: 0.4 }, { name: 'pop', at: s.start + t0 + tType + 0.3, vol: 0.4 }, { name: 'tap', at: s.start + tTap - 0.05, vol: 0.5 }, { name: 'ding', at: s.start + tTap + 0.1, vol: 0.45 });
    }
    if (s.kind === 'outro') ev.push({ name: 'ding', at: s.start + 0.4, vol: 0.45 });
    if (s.seg) for (const e of s.seg.ev || []) {
      const at = s.start + e.at / (s.rate || 1);
      if (at < s.start + s.dur) ev.push({ name: e.type === 'key' ? 'key' : e.type === 'ring' ? 'pop' : 'tap', at, vol: e.type === 'key' ? 0.35 : e.type === 'ring' ? 0.3 : 0.45 });
    }
    if (s.seg && s.zoom) ev.push({ name: 'whoosh', at: s.start + s.dur * (s.zoom.at != null ? s.zoom.at : 0.4), vol: 0.22 });
  });
  return ev;
}

// Aperçu déposé sur le dépôt du studio (trop lourd pour un envoi direct).
export async function publishPreview(file) {
  const repo = process.env.GH_REPO, tok = process.env.GH_TOKEN;
  if (!repo || !tok) throw new Error('Jeton du dépôt manquant');
  const hd = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'alve-studio' };
  const tag = 'apercu-' + Date.now();
  const rel = await (await fetch('https://api.github.com/repos/' + repo + '/releases', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hd), body: JSON.stringify({ tag_name: tag, name: 'Aperçu ' + tag, prerelease: true }) })).json();
  if (!rel.upload_url) throw new Error('Dépôt de l’aperçu refusé : ' + JSON.stringify(rel).slice(0, 200));
  const buf = readFileSync(file);
  const r = await fetch(rel.upload_url.replace(/\{.*\}$/, '') + '?name=apercu.mp4', { method: 'POST', headers: Object.assign({ 'Content-Type': 'video/mp4', 'Content-Length': String(buf.length) }, hd), body: buf });
  const j = await r.json().catch(() => ({}));
  if (!j.browser_download_url) throw new Error('Envoi de l’aperçu échoué (' + r.status + ')');
  return j.browser_download_url;
}

export async function voices(job, DIR) {
  const files = [], durs = [];
  for (const [i, s] of job.scenes.entries()) {
    const f = join(DIR, 'v' + i + '.mp3');
    await download(s.audio_url, f);
    const d = await duration(f);
    if (!(d > 0.4)) throw new Error('Voix de la scène ' + (i + 1) + ' vide');
    files.push(f); durs.push(d);
  }
  console.log('Voix Henri : ' + files.length + ' scènes');
  return { files, durs, voice: 'henri' };
}

// Scènes filmées : chaque scène dure au moins le temps de son extrait (accéléré
// jusqu'à ×1,6) et tout ce qui suit est décalé d'autant.
function fitWalk(tl, segs) {
  let t = 0;
  tl.scenes.forEach((s, i) => {
    const d = t - s.start;
    s.start = t; s.voiceAt += d;
    const seg = segs && segs[i];
    if (seg) {
      const len = Math.max(0.5, seg.end - seg.start);
      s.seg = seg; s.rate = 1;
      if (len > s.dur) s.dur = len; // jamais accéléré : la scène s'allonge si besoin
    }
    t += s.dur;
  });
  tl.total = t;
  tl.scenes.forEach((s, i) => {
    s.prevPhone = !!(s.seg && tl.scenes[i - 1] && tl.scenes[i - 1].seg);
    s.nextPhone = !!(s.seg && tl.scenes[i + 1] && tl.scenes[i + 1].seg);
  });
}

export async function runLong(job, DIR) {
  // 1) Les vrais écrans d'abord : une session expirée arrête tout de suite.
  const raw = await captureScreens(job, DIR);
  const shots = await loadShots(raw);
  // Parcours FILMÉ en vidéo sur le vrai site (landing, inscription, menu, arbitrage, mise auto).
  // 2) La voix d'abord : le parcours est ensuite filmé au rythme exact de chaque mot.
  const vo = await voices(job, DIR);
  const tl = buildTimeline(job.scenes, vo.durs);
  await alignScenes(tl, vo.files, DIR);
  const nw = (w) => String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const plan = {};
  tl.scenes.forEach((s, i) => { if (s.walk) plan[i] = { dur: s.dur, words: (s.words || []).map((w) => ({ n: nw(w.text), t: (s.voiceAt - s.start) + w.start * s.voiceDur })) }; });
  const { recordWalkthrough } = await import('./record.mjs');
  const walk = await recordWalkthrough(job, DIR, plan);
  fitWalk(tl, walk.segs);
  console.log('Vidéo longue : ' + tl.scenes.length + ' scènes, ' + tl.total.toFixed(1) + ' s');
  tl.scenes.forEach((s, i) => {
    if (s.screen && s.screen.path) { s.shotKey = screenKey(s.screen); s.shotScreen = s.screen; }
    else if (s.kind === 'chapter') {
      const nx = tl.scenes.slice(i + 1).find((x) => x.screen && x.screen.path);
      if (nx && nx.chapter === s.chapter) { s.shotKey = screenKey(nx.screen); s.shotScreen = { path: nx.screen.path, from: nx.screen.from || 0, to: nx.screen.from || 0, static: true }; }
    }
  });
  const F = await loadFonts(DIR);
  const logoUrl = job.logo_url;
  if (!(await loadImg(logoUrl))) throw new Error('Logo du site introuvable');
  const env = { shots, chapters: {}, marks: [] };
  // Plans d'illustration (bibliothèque du site) téléchargés une seule fois.
  const brolls = {}, brollDur = {};
  const urls = [...new Set(tl.scenes.map((s) => s.broll).filter(Boolean))];
  for (const [k, u] of urls.entries()) {
    const f = join(DIR, 'broll' + k + '.mp4');
    try { await download(u, f); brolls[u] = f; brollDur[u] = await duration(f).catch(() => 0); } catch (e) { console.error('Plan d’illustration indisponible : ' + u); }
  }
  console.log('Plans d’illustration : ' + Object.keys(brolls).length + ' / ' + urls.length);
  for (const s of tl.scenes) if (s.kind === 'chapter') { env.chapters[s.chapter] = s.title; env.marks.push(s.start / tl.total); }
  const video = join(DIR, 'video.mp4'), audio = join(DIR, 'audio.m4a'), final = join(DIR, 'final.mp4');
  const spec = { F, walk: walk.file, total: tl.total, chapters: env.chapters, marks: env.marks, raw, bg: (job.backgrounds || [])[0], logo: logoUrl, brolls, brollDur, imgs: lookImages(tl.scenes) };
  await render(spec, tl, video, DIR);
  await makeSfx(DIR, tl.total);
  await libraryMusic(DIR, job.music_url || (job.style || {}).music_url, tl.total);
  await mixAudio(DIR, tl, vo.files, events(tl, env), audio);
  await run('ffmpeg', ['-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', final]);
  const info = JSON.parse(out);
  const v = info.streams.find((x) => x.codec_type === 'video'), a = info.streams.find((x) => x.codec_type === 'audio');
  if (!v || v.width !== W || v.height !== H || !a) throw new Error('Contrôle technique : format ou son incorrect');
  console.log('Contrôle technique OK : ' + parseFloat(info.format.duration).toFixed(1) + ' s');
  const prev = join(DIR, 'preview.mp4');
  await run('ffmpeg', ['-y', '-i', final, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', prev]);
  const url = await publishPreview(prev);
  console.log('Aperçu : ' + url);
  const full = await publishPreview(final);
  console.log('Version pleine qualité : ' + full);
  await api('preview', { video_url: url, final_url: full, voice: vo.voice });
  await api('done');
}
