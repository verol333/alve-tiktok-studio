// Vidéo YouTube longue (1920x1080) : présentation complète du site.
// Scènes : intro, chapter (titre de chapitre), point (titre + points clés), outro.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createCanvas } from '@napi-rs/canvas';
import { api, download } from './api.mjs';
import { run, duration } from './sh.mjs';
import { loadFonts, loadImg, loadEmoji } from './assets.mjs';
import { buildTimeline } from './timeline.mjs';
import { makeSfx, mixAudio } from './audio.mjs';
import { clamp, prog, easeOut, easeBack, rgba, rr, font, fitLines, seeded } from './draw.mjs';

const W = 1920, H = 1080, FPS = 25;
const P = { a: '#33D98E', b: '#818CF8', d1: '#0A0F1E', d2: '#1C2336', ink: '#E7ECFB', mute: '#9AA4C6' };
const ACCENTS = ['#33D98E', '#818CF8', '#F3C969', '#22D3EE', '#FB923C', '#F472B6'];
const accentOf = (s) => ACCENTS[(s.chapter || 0) % ACCENTS.length];

function background(ctx, env, s, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  ctx.fillStyle = P.d1; ctx.fillRect(0, 0, W, H);
  if (env.bg) {
    const z = 1.08 + 0.05 * Math.sin(t * 0.05);
    const k = Math.max(W / env.bg.width, H / env.bg.height) * z;
    const w = env.bg.width * k, h = env.bg.height * k;
    ctx.globalAlpha = 0.16;
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
    rg.addColorStop(0, rgba(i ? P.b : acc, 0.2)); rg.addColorStop(1, rgba(acc, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  });
  ctx.fillStyle = '#FFFFFF';
  for (const p of env.particles) {
    const y = (((p.y - t * p.v) % H) + H) % H;
    ctx.globalAlpha = p.a;
    ctx.beginPath(); ctx.arc(p.x + Math.sin(t + p.y) * 12, y, p.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function textBlock(ctx, text, fam, size, min, maxW, maxLines, x, y, color) {
  const fit = fitLines(ctx, text, fam, size, min, maxW, maxLines);
  font(ctx, fit.size, fam); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  fit.lines.forEach((l, i) => ctx.fillText(l.join(' '), x, y + i * fit.size * 1.12));
  return fit.lines.length * fit.size * 1.12;
}

function emojiPanel(ctx, env, s, lt, cx, cy, size, acc) {
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.8);
  rg.addColorStop(0, rgba(acc, 0.32)); rg.addColorStop(1, rgba(acc, 0));
  ctx.fillStyle = rg; ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  ctx.save(); ctx.translate(cx, cy);
  ctx.lineCap = 'round';
  ctx.lineWidth = 7; ctx.strokeStyle = rgba(acc, 0.75);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.6, lt * 0.9, lt * 0.9 + Math.PI * 1.25); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = rgba(P.ink, 0.22);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.68, -lt * 0.6, -lt * 0.6 + Math.PI * 0.8); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = lt * 0.7 + i * 2.1, r = size * 0.6;
    ctx.fillStyle = i === 0 ? acc : rgba(P.ink, 0.5);
    ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, i === 0 ? 10 : 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const img = env.emoji[s.emoji];
  const pop = easeBack(prog(lt, 0.15, 0.7));
  const z = size * 0.62 * pop;
  if (img && z > 2) ctx.drawImage(img, cx - z / 2, cy - z / 2 + Math.sin(lt * 2) * 14, z, z);
}

function drawIntro(ctx, env, s, lt) {
  const p = easeBack(prog(lt, 0.1, 0.9));
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(Math.max(0.01, 0.7 + 0.3 * p), Math.max(0.01, 0.7 + 0.3 * p));
  ctx.globalAlpha *= clamp(p, 0, 1);
  font(ctx, 210, env.F.display); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.shadowColor = rgba(P.a, 0.6); ctx.shadowBlur = 50; ctx.fillText('AL VE CAPITAL', 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
  const q = easeOut(prog(lt, 0.7, 0.7));
  ctx.save(); ctx.globalAlpha *= q;
  ctx.fillStyle = P.a; ctx.fillRect(W / 2 - 260 * q, 520, 520 * q, 6);
  font(ctx, 58, env.F.xb); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.fillText(s.title || 'La présentation complète', W / 2, 630);
  font(ctx, 36, env.F.sb); ctx.fillStyle = P.mute;
  ctx.fillText('Pronostics · Arbitrage · Mise automatique · Outils IA · Virtuel', W / 2, 700);
  ctx.restore();
  const img = env.emoji[s.emoji];
  if (img) { const z = 150 * easeBack(prog(lt, 1.1, 0.6)); if (z > 2) ctx.drawImage(img, W / 2 - z / 2, 220 - z / 2 + Math.sin(lt * 2) * 10, z, z); }
}

function drawChapter(ctx, env, s, lt) {
  const acc = accentOf(s);
  const p = easeOut(prog(lt, 0, 0.7));
  font(ctx, 440, env.F.display); ctx.textAlign = 'left'; ctx.fillStyle = rgba(acc, 0.16 * p);
  ctx.fillText(String(s.chapter).padStart(2, '0'), 100 - (1 - p) * 80, 700);
  font(ctx, 36, env.F.xb); ctx.fillStyle = acc; ctx.fillText('CHAPITRE ' + s.chapter, 130, 400);
  ctx.fillRect(130, 426, 280 * easeOut(prog(lt, 0.2, 0.8)), 7);
  const q = easeOut(prog(lt, 0.15, 0.6));
  ctx.save(); ctx.globalAlpha *= q; ctx.translate(0, (1 - q) * 40);
  textBlock(ctx, s.title, env.F.black, 118, 70, 1080, 2, 130, 560, P.ink);
  ctx.restore();
  emojiPanel(ctx, env, s, lt, 1500, 560, 560, acc);
}

function drawPoint(ctx, env, s, lt) {
  const acc = accentOf(s);
  const chip = 'CHAPITRE ' + s.chapter + ' · ' + String(env.chapters[s.chapter] || '').toUpperCase();
  font(ctx, 26, env.F.xb);
  const cw = Math.min(1060, ctx.measureText(chip).width + 56);
  ctx.fillStyle = rgba(acc, 0.16); rr(ctx, 120, 78, cw, 54, 27); ctx.fill();
  ctx.fillStyle = acc; ctx.textAlign = 'left'; ctx.fillText(chip, 148, 114);
  const ta = easeOut(prog(lt, 0.1, 0.6));
  ctx.save(); ctx.globalAlpha *= ta; ctx.translate(0, (1 - ta) * 30);
  const th = textBlock(ctx, s.title || '', env.F.black, 76, 48, 1040, 2, 120, 236, P.ink);
  ctx.restore();
  const bl = s.bullets || [], n = bl.length;
  const top = 236 + th + 10, gap = 22;
  const ch = n ? Math.min(128, (910 - top - (n - 1) * gap) / n) : 0;
  const lead = s.voiceAt - s.start;
  bl.forEach((b, i) => {
    const at = lead + 0.3 + s.voiceDur * 0.82 * (i / Math.max(n, 1));
    const p = easeOut(prog(lt, at, 0.5));
    if (p <= 0) return;
    const y = top + i * (ch + gap);
    ctx.save(); ctx.globalAlpha *= p; ctx.translate(-(1 - p) * 70, 0);
    ctx.fillStyle = 'rgba(28,35,54,0.84)'; rr(ctx, 120, y, 1040, ch, 24); ctx.fill();
    ctx.strokeStyle = rgba(acc, 0.35); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = acc; rr(ctx, 120, y, 10, ch, 5); ctx.fill();
    ctx.beginPath(); ctx.arc(200, y + ch / 2, 30, 0, Math.PI * 2); ctx.fillStyle = rgba(acc, 0.2); ctx.fill();
    font(ctx, 32, env.F.black); ctx.fillStyle = acc; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), 200, y + ch / 2 + 11);
    const fit = fitLines(ctx, b, env.F.sb, 38, 26, 870, 2);
    font(ctx, fit.size, env.F.sb); ctx.fillStyle = P.ink; ctx.textAlign = 'left';
    const lh = fit.size * 1.2, y0 = y + ch / 2 - (fit.lines.length * lh) / 2 + fit.size * 0.85;
    fit.lines.forEach((l, k) => ctx.fillText(l.join(' '), 256, y0 + k * lh));
    ctx.restore();
  });
  emojiPanel(ctx, env, s, lt, 1540, 560, 520, acc);
}

function drawOutro(ctx, env, s, lt) {
  font(ctx, 56, env.F.sb); ctx.textAlign = 'center'; ctx.fillStyle = P.ink;
  ctx.globalAlpha *= 1;
  ctx.fillText('Rendez-vous sur', W / 2, 330);
  const p = easeBack(prog(lt, 0.2, 0.9));
  ctx.save(); ctx.translate(W / 2, 520); ctx.scale(Math.max(0.01, p), Math.max(0.01, p));
  font(ctx, 200, env.F.display); ctx.fillStyle = P.a; ctx.shadowColor = rgba(P.a, 0.7); ctx.shadowBlur = 60;
  ctx.fillText('alvecapital.fr', 0, 0); ctx.shadowBlur = 0;
  ctx.restore();
  const q = easeOut(prog(lt, 1.0, 0.7));
  ctx.save(); ctx.globalAlpha *= q;
  const pill = 'Compte gratuit · Pronostics · Arbitrage · Outils IA';
  font(ctx, 40, env.F.xb); const w = ctx.measureText(pill).width + 80;
  ctx.fillStyle = rgba(P.a, 0.16); rr(ctx, W / 2 - w / 2, 610, w, 80, 40); ctx.fill();
  ctx.fillStyle = P.ink; ctx.textAlign = 'center'; ctx.fillText(pill, W / 2, 664);
  font(ctx, 32, env.F.sb); ctx.fillStyle = P.mute; ctx.fillText('18+ · Joue toujours de façon responsable', W / 2, 790);
  ctx.restore();
}

function groups(s) {
  if (s._g) return s._g;
  const out = []; let cur = null;
  s.words.forEach((w, k) => {
    if (!cur || k - cur.from >= 9 || cur.len + w.text.length > 50) { cur = { from: k, to: k, len: w.text.length }; out.push(cur); }
    else { cur.to = k; cur.len += w.text.length + 1; }
  });
  s._g = out;
  return out;
}

function drawSubs(ctx, env, s, t) {
  if (!s.words.length) return;
  const p = (t - s.voiceAt) / s.voiceDur;
  if (p < 0 || p > 1.03) return;
  let cur = s.words.findIndex((w) => p < w.end);
  if (cur < 0) cur = s.words.length - 1;
  const g = groups(s).find((x) => cur >= x.from && cur <= x.to);
  if (!g) return;
  const words = s.words.slice(g.from, g.to + 1).map((w) => w.text);
  let size = 42; font(ctx, size, env.F.xb);
  const measure = () => { const sp = ctx.measureText(' ').width; const ws = words.map((w) => ctx.measureText(w).width); return { sp, ws, total: ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1) }; };
  let m = measure();
  while (m.total > W - 260 && size > 28) { size -= 2; font(ctx, size, env.F.xb); m = measure(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(5,8,18,0.74)'; rr(ctx, W / 2 - m.total / 2 - 36, 952, m.total + 72, 76, 38); ctx.fill();
  let x = W / 2 - m.total / 2;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const acc = accentOf(s);
  words.forEach((w, i) => {
    const k = g.from + i;
    ctx.fillStyle = k === cur ? acc : k < cur ? P.ink : rgba(P.ink, 0.55);
    ctx.fillText(w, x, 1004);
    x += m.ws[i] + m.sp;
  });
}

function drawHud(ctx, env, s, t) {
  ctx.globalAlpha = 1;
  font(ctx, 32, env.F.display); ctx.textAlign = 'right'; ctx.fillStyle = rgba(P.ink, 0.9);
  ctx.fillText('AL VE CAPITAL', W - 110, 110);
  font(ctx, 22, env.F.sb); ctx.fillStyle = rgba(P.ink, 0.5); ctx.fillText('alvecapital.fr', W - 110, 140);
  const y = H - 9;
  ctx.fillStyle = rgba(P.ink, 0.1); ctx.fillRect(0, y, W, 9);
  ctx.fillStyle = accentOf(s); ctx.fillRect(0, y, W * (t / env.total), 9);
  ctx.fillStyle = P.d1;
  for (const m of env.marks) ctx.fillRect(W * m - 2, y, 4, 9);
}

function drawFrame(ctx, env, s, t) {
  background(ctx, env, s, t);
  const lt = t - s.start;
  const inn = easeOut(prog(lt, 0, 0.5)), out = prog(lt, s.dur - 0.3, 0.3);
  ctx.save();
  ctx.globalAlpha = clamp(inn * (1 - out), 0, 1);
  ctx.translate((1 - inn) * 90 - out * 90, 0);
  if (s.kind === 'intro') drawIntro(ctx, env, s, lt);
  else if (s.kind === 'chapter') drawChapter(ctx, env, s, lt);
  else if (s.kind === 'outro') drawOutro(ctx, env, s, lt);
  else drawPoint(ctx, env, s, lt);
  ctx.restore();
  drawSubs(ctx, env, s, t);
  drawHud(ctx, env, s, t);
}

async function render(env, tl, out) {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errTail = '';
  ff.stderr.on('data', (d) => { errTail = (errTail + d).slice(-2000); });
  ff.stdin.on('error', () => {});
  const frames = Math.ceil(tl.total * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    const s = tl.scenes.find((x) => t >= x.start && t < x.start + x.dur) || tl.scenes[tl.scenes.length - 1];
    drawFrame(ctx, env, s, t);
    const img = ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if (f % 500 === 0) console.log('image ' + f + ' / ' + frames);
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('Encodage vidéo échoué : ' + errTail.slice(-300));
}

function events(tl) {
  const ev = [];
  tl.scenes.forEach((s) => {
    if (s.kind === 'intro') ev.push({ name: 'impact', at: 0.3, vol: 0.8 });
    if (s.kind === 'chapter') ev.push({ name: 'rise', at: s.start - 0.4, vol: 0.35 }, { name: 'impact', at: s.start + 0.35, vol: 0.6 });
    if (s.kind === 'point') ev.push({ name: 'whoosh', at: s.start - 0.08, vol: 0.4 });
    if (s.kind === 'outro') ev.push({ name: 'ding', at: s.start + 0.4, vol: 0.45 });
  });
  return ev;
}

// Aperçu déposé sur le dépôt du studio (trop lourd pour un envoi direct).
async function publishPreview(file) {
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

export async function runLong(job, DIR) {
  const voiceFiles = [], durs = [];
  for (const [i, s] of job.scenes.entries()) {
    const f = join(DIR, 'v' + i + '.mp3');
    await download(s.audio_url, f);
    const d = await duration(f);
    if (!(d > 0.4)) throw new Error('Voix de la scène ' + (i + 1) + ' vide');
    voiceFiles.push(f); durs.push(d);
  }
  const tl = buildTimeline(job.scenes, durs);
  console.log('Vidéo longue : ' + tl.scenes.length + ' scènes, ' + tl.total.toFixed(1) + ' s');
  const r = seeded(7);
  const env = {
    F: await loadFonts(DIR), total: tl.total, emoji: {}, chapters: {}, marks: [],
    particles: Array.from({ length: 60 }, () => ({ x: r() * W, y: r() * H, v: 15 + r() * 45, s: 2 + r() * 4, a: 0.12 + r() * 0.3 })),
    bg: await loadImg((job.backgrounds || [])[0]),
  };
  for (const s of tl.scenes) {
    if (s.kind === 'chapter') { env.chapters[s.chapter] = s.title; env.marks.push(s.start / tl.total); }
    if (s.emoji && !(s.emoji in env.emoji)) env.emoji[s.emoji] = await loadEmoji(s.emoji);
  }
  const video = join(DIR, 'video.mp4'), audio = join(DIR, 'audio.m4a'), final = join(DIR, 'final.mp4');
  await render(env, tl, video);
  await makeSfx(DIR, tl.total);
  await mixAudio(DIR, tl, voiceFiles, events(tl), audio);
  await run('ffmpeg', ['-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', final]);
  const info = JSON.parse(out);
  const v = info.streams.find((x) => x.codec_type === 'video'), a = info.streams.find((x) => x.codec_type === 'audio');
  if (!v || v.width !== W || v.height !== H || !a) throw new Error('Contrôle technique : format ou son incorrect');
  console.log('Contrôle technique OK : ' + parseFloat(info.format.duration).toFixed(1) + ' s');
  const prev = join(DIR, 'preview.mp4');
  await run('ffmpeg', ['-y', '-i', final, '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', prev]);
  const url = await publishPreview(prev);
  console.log('Aperçu : ' + url);
  await api('preview', { video_url: url, voice: 'henri' });
  await api('done');
}
