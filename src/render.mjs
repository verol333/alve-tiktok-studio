import { spawn } from 'node:child_process';
import { freemem } from 'node:os';
import { once } from 'node:events';
import { createCanvas } from '@napi-rs/canvas';
import { W, H, FPS } from './draw.mjs';
import { drawBackground, drawHud, drawSubs } from './hud.mjs';
import { drawScene } from './scenes.mjs';

export async function renderVideo(env, tl, out) {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  env.layer = createCanvas(W, H);
  const ff = spawn('ffmpeg', ['-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-maxrate', '9M', '-bufsize', '18M', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'ignore', 'pipe'] });
  let errTail = '';
  ff.stderr.on('data', (d) => { errTail = (errTail + d).slice(-2000); });
  ff.stdin.on('error', () => {});
  const frames = Math.ceil(tl.total * FPS);
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    const sc = tl.scenes.find((s) => t >= s.start && t < s.start + s.dur) || tl.scenes[tl.scenes.length - 1];
    drawBackground(ctx, env, t);
    drawScene(ctx, env, sc, t);
    drawSubs(ctx, env, sc, t);
    drawHud(ctx, env, t);
    const img = ctx.getImageData(0, 0, W, H);
    const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    // Chaque image lue réserve 8 Mo que le ramasse-miettes ne libère pas seul :
    // sans ce nettoyage forcé, une vidéo de 90 s saturait la machine.
    if (f % 30 === 0 && global.gc) global.gc();
    if (f % 150 === 0) console.log('image ' + f + ' / ' + frames + ' — mémoire ' + Math.round(process.memoryUsage().rss / 1e6) + ' Mo, libre ' + Math.round(freemem() / 1e6) + ' Mo');
  }
  ff.stdin.end();
  const [code] = await once(ff, 'close');
  if (code !== 0) throw new Error('Encodage vidéo échoué : ' + errTail.slice(-300));
}
