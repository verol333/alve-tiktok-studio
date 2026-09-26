import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { freemem } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, FPS } from './draw.mjs';
import { drawBackground, drawHud, drawSubs } from './hud.mjs';
import { drawScene } from './scenes.mjs';
import { run } from './sh.mjs';

// Chaque image lue sur le canevas garde ~8 Mo que le processus ne rend jamais :
// d'un seul bloc, une vidéo de 90 s saturait les 16 Go de la machine. Le montage
// est donc découpé en segments de 20 s, chacun dans un processus séparé.
const SEG = 600, PAR = 2;
const mem = () => 'mémoire ' + Math.round(process.memoryUsage().rss / 1e6) + ' Mo, libre ' + Math.round(freemem() / 1e6) + ' Mo';

export async function renderVideo(spec, tl, out, DIR) {
  const frames = Math.ceil(tl.total * FPS), segs = [];
  for (let f = 0; f < frames; f += SEG) segs.push([f, Math.min(frames, f + SEG), join(DIR, 'pseg' + segs.length + '.mp4')]);
  const specFile = join(DIR, 'prono-spec.json');
  writeFileSync(specFile, JSON.stringify({ spec, tl, DIR }));
  console.log('Montage en ' + segs.length + ' segments (' + PAR + ' en parallèle) — ' + mem());
  let next = 0;
  const worker = async () => { while (next < segs.length) { const k = next++; await segment(specFile, segs[k], k); } };
  await Promise.all(Array.from({ length: Math.min(PAR, segs.length) }, worker));
  const list = join(DIR, 'psegs.txt');
  writeFileSync(list, segs.map((s) => "file '" + s[2] + "'").join('\n'));
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
}

async function segment(specFile, [f0, f1, out], k) {
  const script = fileURLToPath(new URL('./renderSeg.mjs', import.meta.url));
  for (let a = 1; a <= 2; a++) {
    const p = spawn(process.execPath, [script, specFile, String(f0), String(f1), out], { stdio: ['ignore', 'inherit', 'inherit'] });
    const [code, sig] = await once(p, 'close');
    if (code === 0) { console.log('Segment ' + (k + 1) + ' terminé — ' + mem()); return; }
    console.error('Segment ' + (k + 1) + ' interrompu (code ' + code + (sig ? ', ' + sig : '') + ')' + (a < 2 ? ' : nouvel essai' : ''));
  }
  throw new Error('Segment ' + (k + 1) + ' impossible à monter');
}

// Images f0 à f1 (exclue), encodées dans le fichier out.
export async function renderFrames(env, tl, f0, f1, out) {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  env.layer = createCanvas(W, H);
  const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-maxrate', '9M', '-bufsize', '18M', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errTail = '';
  ff.stderr.on('data', (d) => { errTail = (errTail + d).slice(-2000); });
  ff.stdin.on('error', () => {});
  const frames = Math.ceil(tl.total * FPS);
  for (let f = f0; f < f1; f++) {
    const t = f / FPS;
    const sc = tl.scenes.find((s) => t >= s.start && t < s.start + s.dur) || tl.scenes[tl.scenes.length - 1];
    drawBackground(ctx, env, t);
    drawScene(ctx, env, sc, t);
    drawSubs(ctx, env, sc, t);
    drawHud(ctx, env, t);
    const img = ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if ((f - f0) % 300 === 0) console.log('image ' + f + ' / ' + frames + ' — ' + mem());
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('Encodage vidéo échoué : ' + errTail.slice(-300));
}
