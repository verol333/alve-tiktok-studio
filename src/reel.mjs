// Vidéo TikTok verticale « premium » (1080x1920) : le VRAI site filmé en vidéo
// dans un téléphone (curseur, appuis, saisie, défilement), schémas chiffrés,
// plans d'illustration, titres tapés, zooms et transitions.
// Voix : voix clonée de l'administrateur (voix Henri en secours).
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createCanvas } from '@napi-rs/canvas';
import { download } from './api.mjs';
import { run } from './sh.mjs';
import { loadFonts, loadImg } from './assets.mjs';
import { buildTimeline } from './timeline.mjs';
import { makeSfx, mixAudio, libraryMusic } from './audio.mjs';
import { Broll } from './broll.mjs';
import { Clip } from './clip.mjs';
import { recordWalkthrough, CW, CH } from './record.mjs';
import { VISUALS, visualSfx } from './visuals.mjs';
import { voices } from './long.mjs';
import { clamp, prog, easeOut, easeBack, rgba, rr, font, fitLines, seeded, isHi, drawWords } from './draw.mjs';

const W = 1080, H = 1920, FPS = 30;
const P = { a: '#33D98E', b: '#818CF8', d1: '#0A0F1E', d2: '#1C2336', ink: '#E7ECFB', mute: '#9AA4C6' };
const ACC = ['#33D98E', '#818CF8', '#F3C969', '#22D3EE', '#FB923C', '#F472B6'];
const accent = (s) => ACC[(s.step || 0) % ACC.length];
const PH = { cx: 540, cy: 1045, sh: 1100 };
PH.sw = Math.round(PH.sh * 390 / 844);
const SUB_Y = 1712;
const URL_TXT = 'alvecapital.fr';
const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const typeDur = (text) => clamp(String(text || '').length / 28, 0.5, 1.4);
const Tof = (s) => (f) => (s.voiceAt - s.start) + s.voiceDur * f;
const ctaTimes = (s) => { const t0 = Tof(s)(0.1), tType = URL_TXT.length / 12; return { t0, tType, tTap: t0 + tType + 1.2 }; };

// Chaque extrait filmé impose au moins sa durée (accéléré jusqu'à x1,35 si besoin).
function fitToClips(tl, segs) {
  let t = 0;
  tl.scenes.forEach((s, i) => {
    const d = t - s.start;
    s.start = t; s.voiceAt += d;
    const seg = segs[i];
    if (seg) {
      const len = Math.max(0.5, seg.end - seg.start);
      s.seg = seg; s.rate = 1;
      if (len > s.dur) { s.rate = Math.min(1.6, len / s.dur); s.dur = len / s.rate; }
    }
    t += s.dur;
  });
  tl.total = t;
  tl.scenes.forEach((s, i) => { s.prevPhone = !!(tl.scenes[i - 1] && tl.scenes[i - 1].seg); s.nextPhone = !!(tl.scenes[i + 1] && tl.scenes[i + 1].seg); });
}

function logo(ctx, env, cx, cy, size, glow) {
  const k = size / Math.max(env.logo.width, env.logo.height), w = env.logo.width * k, h = env.logo.height * k;
  if (glow) { ctx.shadowColor = rgba(P.a, 0.55); ctx.shadowBlur = glow; }
  ctx.drawImage(env.logo, cx - w / 2, cy - h / 2, w, h);
  ctx.shadowBlur = 0;
}

function background(ctx, env, s, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.fillStyle = P.d1; ctx.fillRect(0, 0, W, H);
  const lt = t - s.start;
  if (env.brollFrame) {
    const f = env.brollFrame, z = 1.05 + 0.08 * prog(lt, 0, s.dur);
    const k = Math.max(W / f.width, H / f.height) * z, w = f.width * k, h = f.height * k;
    ctx.drawImage(f, (W - w) / 2, (H - h) / 2, w, h);
    ctx.fillStyle = 'rgba(10,15,30,' + (s.kind === 'hook' ? 0.45 : 0.72) + ')'; ctx.fillRect(0, 0, W, H);
  } else {
    if (env.bg) {
      const z = 1.1 + 0.05 * Math.sin(t * 0.05), k = Math.max(W / env.bg.width, H / env.bg.height) * z;
      const w = env.bg.width * k, h = env.bg.height * k;
      ctx.globalAlpha = 0.14; ctx.drawImage(env.bg, (W - w) / 2 + Math.sin(t * 0.1) * 30, (H - h) / 2 + Math.cos(t * 0.08) * 40, w, h); ctx.globalAlpha = 1;
    }
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, rgba(P.d1, 0.85)); g.addColorStop(0.5, rgba(P.d2, 0.55)); g.addColorStop(1, rgba(P.d1, 0.92));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const acc = accent(s);
    [[0.25, 0.25, 0.23], [0.75, 0.75, 0.17]].forEach(([fx, fy, sp], i) => {
      const x = W * fx + Math.sin(t * sp + i) * 200, y = H * fy + Math.cos(t * sp * 0.8 + i) * 260;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 800);
      rg.addColorStop(0, rgba(i ? P.b : acc, 0.2)); rg.addColorStop(1, rgba(acc, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    });
    ctx.fillStyle = '#FFFFFF';
    for (const p of env.particles) {
      const y = (((p.y - t * p.v) % H) + H) % H;
      ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x + Math.sin(t + p.y) * 12, y, p.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.4, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function typedCenter(ctx, text, fam, size, min, maxW, maxLines, cx, y, color, lt, at, caret) {
  const fit = fitLines(ctx, text, fam, size, min, maxW, maxLines);
  const total = String(text || '').length, d = typeDur(text);
  let rem = Math.floor(total * prog(lt, at, d));
  font(ctx, fit.size, fam); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const lh = fit.size * 1.12; let ex = cx, ey = y;
  fit.lines.forEach((l, i) => {
    const str = l.join(' '), yy = y + i * lh, x0 = cx - ctx.measureText(str).width / 2;
    if (rem <= 0) return;
    const part = str.slice(0, rem);
    ctx.fillText(part, x0, yy);
    ex = x0 + ctx.measureText(part).width; ey = yy;
    rem -= str.length + 1;
  });
  if (lt >= at && lt < at + d + 1.2 && (lt < at + d || Math.floor(lt * 2.4) % 2 === 0)) {
    ctx.fillStyle = caret; ctx.fillRect(ex + 6, ey - fit.size * 0.8, Math.max(4, fit.size * 0.07), fit.size * 0.92);
  }
}

function drawTitle(ctx, env, s, lt) {
  if (!s.title) return;
  const acc = accent(s);
  let y = 300;
  if (s.step) {
    const chip = 'ÉTAPE ' + s.step;
    font(ctx, 30, env.F.xb);
    const w = ctx.measureText(chip).width + 52, p = Math.max(0.01, easeBack(prog(lt, 0.05, 0.5)));
    ctx.save(); ctx.translate(W / 2, 258); ctx.scale(p, p);
    ctx.fillStyle = rgba(acc, 0.18); rr(ctx, -w / 2, -30, w, 60, 30); ctx.fill();
    ctx.strokeStyle = rgba(acc, 0.65); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = acc; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(chip, 0, 11);
    ctx.restore();
    y = 372;
  }
  typedCenter(ctx, s.title, env.F.black, 70, 46, 960, 2, W / 2, y, P.ink, lt, 0.25, acc);
}

function drawHook(ctx, env, s, lt) {
  const txt = String(s.text || '').toUpperCase();
  const fit = fitLines(ctx, txt, env.F.display, 150, 80, 940, 4);
  const lh = fit.size * 1.1, y0 = 960 - ((fit.lines.length - 1) * lh) / 2 + fit.size * 0.35;
  fit.lines.forEach((l, i) => {
    const at = 0.08 + i * 0.16, p = prog(lt, at, 0.32);
    if (p <= 0) return;
    const z = 1 + 0.8 * (1 - easeOut(p)), d = lt - at - 0.32;
    const shake = d > 0 && d < 0.3 ? Math.sin(d * 90) * 9 * (1 - d / 0.3) : 0;
    ctx.save(); ctx.translate(W / 2 + shake, y0 + i * lh); ctx.scale(z, z); ctx.globalAlpha *= easeOut(p);
    font(ctx, fit.size, env.F.display);
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30;
    drawWords(ctx, l, 0, 0, (w) => (isHi(w, s.highlight) ? P.a : '#FFFFFF'), 10);
    ctx.restore();
  });
}

function drawCta(ctx, env, s, lt) {
  const { t0, tType, tTap } = ctaTimes(s);
  const a = easeOut(prog(lt, 0.1, 0.6));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 30);
  logo(ctx, env, W / 2, 470, 190, 30);
  const fit = fitLines(ctx, s.title || "Ton compte gratuit t'attend", env.F.black, 84, 54, 940, 2);
  font(ctx, fit.size, env.F.black); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = P.ink;
  fit.lines.forEach((l, i) => ctx.fillText(l.join(' '), W / 2, 680 + i * fit.size * 1.1));
  ctx.restore();
  const pb = easeOut(prog(lt, 0.3, 0.6));
  ctx.save(); ctx.globalAlpha *= pb;
  const bx = 90, by = 830, bw = 900, bh = 120;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#F4F6FB'; rr(ctx, bx, by, bw, bh, 60); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = P.a; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(bx + 66, by + bh / 2, 18, 0, Math.PI * 2); ctx.stroke();
  const n = Math.floor(URL_TXT.length * prog(lt, t0, tType));
  font(ctx, 62, env.F.xb); ctx.textAlign = 'left'; ctx.fillStyle = '#0A0F1E';
  const part = URL_TXT.slice(0, n); ctx.fillText(part, bx + 116, by + 83);
  if (lt < t0 + tType + 0.8 && Math.floor(lt * 2.4) % 2 === 0) { ctx.fillStyle = P.a; ctx.fillRect(bx + 122 + ctx.measureText(part).width, by + 30, 5, 62); }
  ctx.restore();
  const pc = prog(lt, t0 + tType + 0.3, 0.6);
  if (pc > 0) {
    const done = lt > tTap + 0.1;
    ctx.save(); ctx.translate(W / 2, 1080);
    const z = Math.max(0.01, easeBack(pc)) * (lt > tTap - 0.08 && lt < tTap + 0.12 ? 0.95 : 1); ctx.scale(z, z);
    ctx.shadowColor = rgba(P.a, 0.6); ctx.shadowBlur = 50;
    const g = ctx.createLinearGradient(-420, 0, 420, 0); g.addColorStop(0, '#33D98E'); g.addColorStop(1, '#10B981');
    ctx.fillStyle = g; rr(ctx, -420, -80, 840, 160, 80); ctx.fill(); ctx.shadowBlur = 0;
    font(ctx, 52, env.F.black); ctx.textAlign = 'center'; ctx.fillStyle = '#0A0F1E';
    ctx.fillText(done ? 'Compte créé !' : 'Créer mon compte gratuit', 0, 18);
    ctx.restore();
    const k = prog(lt, tTap - 0.3, 0.8);
    if (k > 0 && k < 1) { ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(W / 2 + 180, 1080, 26 + 90 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  const q = easeOut(prog(lt, tTap + 0.4, 0.6));
  ctx.save(); ctx.globalAlpha *= q;
  font(ctx, 36, env.F.xb); ctx.textAlign = 'center'; ctx.fillStyle = P.mute;
  ctx.fillText('Arbitrage · Robot · Coupons · Pronostics', W / 2, 1260);
  font(ctx, 30, env.F.sb); ctx.fillText('18+ · Joue responsable', W / 2, 1316);
  ctx.restore();
}

function drawOutro(ctx, env, s, lt) {
  const p = easeBack(prog(lt, 0.05, 0.8));
  ctx.save(); ctx.translate(W / 2, 760); const z = Math.max(0.01, 0.6 + 0.4 * p); ctx.scale(z, z);
  ctx.globalAlpha *= clamp(p, 0, 1);
  logo(ctx, env, 0, 0, 360, 40 + 20 * Math.sin(lt * 3));
  ctx.restore();
  const q = easeOut(prog(lt, 0.4, 0.6));
  ctx.save(); ctx.globalAlpha *= q; ctx.translate(0, (1 - q) * 30);
  font(ctx, 120, env.F.display); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = P.ink;
  ctx.fillText('AL VE CAPITAL', W / 2, 1080);
  ctx.fillStyle = P.a; ctx.fillRect(W / 2 - 230 * q, 1112, 460 * q, 7);
  font(ctx, 74, env.F.xb); ctx.fillStyle = P.a; ctx.fillText(URL_TXT, W / 2, 1222);
  font(ctx, 34, env.F.sb); ctx.fillStyle = P.mute; ctx.fillText('Compte gratuit · 18+ · Joue responsable', W / 2, 1300);
  ctx.restore();
}

function drawSubs(ctx, env, s, t) {
  if (!s.words.length || s.kind === 'hook') return;
  const p = (t - s.voiceAt) / s.voiceDur;
  if (p < 0 || p > 1.03) return;
  let cur = s.words.findIndex((w) => p < w.end);
  if (cur < 0) cur = s.words.length - 1;
  const g = s.chunks.find((x) => cur >= x.from && cur <= x.to);
  if (!g) return;
  const words = s.words.slice(g.from, g.to + 1).map((w) => w.text);
  let size = 56; font(ctx, size, env.F.xb);
  const measure = () => { const sp = ctx.measureText(' ').width; const ws = words.map((w) => ctx.measureText(w).width); return { sp, ws, total: ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1) }; };
  let m = measure();
  while (m.total > 940 && size > 34) { size -= 2; font(ctx, size, env.F.xb); m = measure(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(5,8,18,0.82)'; rr(ctx, W / 2 - m.total / 2 - 36, SUB_Y - 60, m.total + 72, 88, 44); ctx.fill();
  let x = W / 2 - m.total / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const acc = s.step ? accent(s) : P.a;
  words.forEach((w, i) => {
    const k = g.from + i;
    ctx.fillStyle = k === cur ? acc : k < cur ? P.ink : rgba(P.ink, 0.55);
    ctx.fillText(w, x, SUB_Y);
    x += m.ws[i] + m.sp;
  });
}

function hud(ctx, env, s, t) {
  ctx.globalAlpha = 1;
  if (s.kind !== 'outro') {
    logo(ctx, env, 96, 124, 64, 0);
    font(ctx, 36, env.F.display); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = rgba(P.ink, 0.95);
    ctx.fillText('AL VE CAPITAL', 142, 122);
    font(ctx, 24, env.F.sb); ctx.fillStyle = rgba(P.ink, 0.55); ctx.fillText(URL_TXT, 142, 154);
  }
  ctx.fillStyle = rgba(P.ink, 0.12); ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = s.step ? accent(s) : P.a; ctx.fillRect(0, 0, W * (t / env.total), 8);
}

function zoomOf(s, lt) {
  if (!s.zoom) return 1;
  const at = s.dur * (s.zoom.at != null ? s.zoom.at : 0.45);
  return 1 + ((s.zoom.k || 1.25) - 1) * inOut(prog(lt, at, 0.9)) * (1 - inOut(prog(lt, s.dur - 0.7, 0.6)));
}

// Téléphone (même coque que le site) qui diffuse l'extrait filmé de la scène.
function drawPhone(ctx, env, s, lt, t) {
  if (!env.clipFrame) return;
  const inP = s.prevPhone ? 1 : easeOut(prog(lt, 0, 0.8));
  const outP = s.nextPhone ? 0 : inOut(prog(lt, s.dur - 0.5, 0.5));
  const vis = inP * (1 - outP);
  if (vis <= 0.001) return;
  const { cx, sw, sh } = PH, b = 14, W2 = sw + b * 2, H2 = sh + b * 2;
  const cy = PH.cy + (1 - inP) * 1000 + outP * 1000 + Math.sin(t * 0.8) * 5;
  const rot = (1 - inP) * 0.16 - outP * 0.12 + Math.sin(t * 0.5) * 0.004;
  ctx.save();
  ctx.globalAlpha = clamp(vis * 1.3, 0, 1);
  ctx.translate(cx, cy); ctx.rotate(rot);
  const z = zoomOf(s, lt);
  if (z > 1.001) { const py = (s.zoom.y - 0.5) * sh; ctx.translate(0, py); ctx.scale(z, z); ctx.translate(0, -py); }
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 720);
  glow.addColorStop(0, rgba(accent(s), 0.28)); glow.addColorStop(1, rgba(accent(s), 0));
  ctx.fillStyle = glow; ctx.fillRect(-800, -900, 1600, 1800);
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 44;
  const g = ctx.createLinearGradient(-W2 / 2, -H2 / 2, W2 / 2, H2 / 2);
  g.addColorStop(0, '#2A3550'); g.addColorStop(1, '#0E1526');
  ctx.fillStyle = g; rr(ctx, -W2 / 2, -H2 / 2, W2, H2, 64); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  rr(ctx, -sw / 2, -sh / 2, sw, sh, 52); ctx.clip();
  ctx.drawImage(env.clipFrame, -sw / 2, -sh / 2, sw, sh);
  if (s.prevPhone && env.prevShot && lt < 0.4) {
    const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * (1 - easeOut(prog(lt, 0, 0.4)));
    ctx.drawImage(env.prevShot, -sw / 2, -sh / 2, sw, sh); ctx.globalAlpha = a0;
  }
  const sheen = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.06)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; rr(ctx, -58, -sh / 2 + 14, 116, 32, 16); ctx.fill();
  ctx.restore();
}

function drawFrame(ctx, env, s, t) {
  const lt = t - s.start;
  background(ctx, env, s, t);
  if (s.seg) drawPhone(ctx, env, s, lt, t);
  const inn = easeOut(prog(lt, 0, 0.5)), out = prog(lt, s.dur - 0.3, 0.3);
  const a = clamp(inn * (1 - out), 0, 1);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - inn) * 40);
  if (s.kind === 'hook') drawHook(ctx, env, s, lt);
  else if (s.kind === 'cta') drawCta(ctx, env, s, lt);
  else if (s.kind === 'outro') drawOutro(ctx, env, s, lt);
  else {
    const k = s.zoom ? (zoomOf(s, lt) - 1) / ((s.zoom.k || 1.25) - 1) : 0;
    ctx.globalAlpha = a * (1 - 0.85 * k);
    drawTitle(ctx, env, s, lt);
  }
  ctx.restore();
  const vz = s.visual && VISUALS[s.visual.type];
  if (vz) {
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(W / 2 + (1 - inn) * 120, 1010); ctx.scale(1.42, 1.42); ctx.translate(-1450, -555);
    vz(ctx, env.F, lt, Tof(s), s.visual);
    ctx.restore();
  }
  drawSubs(ctx, env, s, t);
  hud(ctx, env, s, t);
  if (s.index > 0 && !(s.prevPhone && s.seg)) {
    const f = 1 - prog(lt, 0, 0.22);
    if (f > 0) { ctx.globalAlpha = 0.3 * f; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  const sw = prog(lt, 0.05, 0.9);
  if (s.step && sw > 0 && sw < 1) {
    const x = -500 + sw * (W + 1000), g = ctx.createLinearGradient(x - 250, 0, x + 250, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

async function render(env, tl, out) {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errTail = '';
  ff.stderr.on('data', (d) => { errTail = (errTail + d).slice(-2000); });
  ff.stdin.on('error', () => {});
  const frames = Math.ceil(tl.total * FPS);
  let i = 0, bi = -1, br = null, cl = null;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    while (i < tl.scenes.length - 1 && t >= tl.scenes[i].start + tl.scenes[i].dur) i++;
    if (i !== bi) {
      if (cl && env.clipFrame) { env.prevShot = env.prevShot || createCanvas(CW, CH); env.prevShot.getContext('2d').drawImage(env.clipFrame, 0, 0, CW, CH); }
      if (br) br.close();
      if (cl) cl.close();
      br = null; cl = null; bi = i; env.clipFrame = null;
      const sc = tl.scenes[i];
      if (sc.broll && env.brolls[sc.broll]) br = new Broll(env.brolls[sc.broll], sc.broll_start || 1);
      if (sc.seg && env.walk) cl = new Clip(env.walk, sc.seg.start, sc.seg.end - sc.seg.start + 0.15, sc.rate || 1, CW, CH);
    }
    env.brollFrame = br ? await br.next() : null;
    if (cl) env.clipFrame = (await cl.next()) || env.prevShot || null;
    drawFrame(ctx, env, tl.scenes[i], t);
    const img = ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if (f % 600 === 0) console.log('image ' + f + ' / ' + frames);
  }
  if (br) br.close();
  if (cl) cl.close();
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('Encodage vidéo échoué : ' + errTail.slice(-300));
}

function events(tl) {
  const ev = [];
  tl.scenes.forEach((s) => {
    const T = Tof(s);
    if (s.index > 0) ev.push({ name: 'whoosh', at: s.start - 0.08, vol: s.prevPhone && s.seg ? 0.25 : 0.45 });
    if (s.kind === 'hook') ev.push({ name: 'impact', at: s.start + 0.35, vol: 0.8 });
    if (s.step) ev.push({ name: 'rise', at: s.start - 0.3, vol: 0.2 });
    if (s.title && (s.step || s.visual)) ev.push({ name: typeDur(s.title) < 1 ? 'keys_s' : 'keys', at: s.start + 0.3, vol: 0.25 });
    if (s.visual && VISUALS[s.visual.type]) for (const [name, at] of visualSfx(s.visual.type, T)) ev.push({ name, at: s.start + at, vol: name === 'key' ? 0.3 : 0.38 });
    if (s.seg) for (const e of s.seg.ev) {
      const at = s.start + e.at / s.rate;
      if (at < s.start + s.dur) ev.push({ name: e.type === 'key' ? 'key' : 'tap', at, vol: e.type === 'key' ? 0.35 : 0.45 });
    }
    if (s.kind === 'cta') {
      const c = ctaTimes(s);
      ev.push({ name: 'keys', at: s.start + c.t0, vol: 0.35 }, { name: 'pop', at: s.start + c.t0 + c.tType + 0.3, vol: 0.4 }, { name: 'tap', at: s.start + c.tTap - 0.05, vol: 0.45 }, { name: 'ding', at: s.start + c.tTap + 0.1, vol: 0.4 });
    }
    if (s.kind === 'outro') ev.push({ name: 'ding', at: s.start + 0.4, vol: 0.4 });
  });
  return ev.filter((e) => e.at >= 0);
}

export async function buildReel(job, DIR) {
  // 1) Le vrai site filmé d'abord : une session expirée arrête tout de suite.
  const walk = await recordWalkthrough(job, DIR);
  // 2) La voix, puis le minutage calé sur les extraits filmés.
  const vo = await voices(job, DIR);
  const tl = buildTimeline(job.scenes, vo.durs);
  fitToClips(tl, walk.segs);
  console.log('Vidéo TikTok : ' + tl.scenes.length + ' scènes, ' + tl.total.toFixed(1) + ' s');
  if (tl.total < 15 || tl.total > 180) throw new Error('Durée anormale : ' + tl.total.toFixed(1) + ' s');
  const r = seeded(11);
  const env = {
    F: await loadFonts(DIR), total: tl.total, walk: walk.file, brolls: {},
    particles: Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * H, v: 15 + r() * 45, s: 2 + r() * 4, a: 0.1 + r() * 0.25 })),
    bg: await loadImg((job.backgrounds || [])[0]), logo: await loadImg(job.logo_url),
  };
  if (!env.logo) throw new Error('Logo du site introuvable');
  // Logos des opérateurs pour le schéma « scan en temps réel ».
  for (const s of tl.scenes) if (s.visual && s.visual.logos) s.visual._imgs = await Promise.all(s.visual.logos.map((b) => loadImg(b.logo).catch(() => null)));
  const urls = [...new Set(tl.scenes.map((s) => s.broll).filter(Boolean))];
  for (const [k, u] of urls.entries()) {
    const f = join(DIR, 'broll' + k + '.mp4');
    try { await download(u, f); env.brolls[u] = f; } catch (e) { console.error('Plan d’illustration indisponible : ' + u); }
  }
  const video = join(DIR, 'video.mp4'), audio = join(DIR, 'audio.m4a'), final = join(DIR, 'final.mp4');
  await render(env, tl, video);
  await makeSfx(DIR, tl.total);
  await libraryMusic(DIR, (job.style || {}).music_url || job.music_url, tl.total);
  await mixAudio(DIR, tl, vo.files, events(tl), audio);
  await run('ffmpeg', ['-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);
  return { final, tl, audio, voice: vo.voice };
}
