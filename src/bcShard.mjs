// Étape 2 (machines en parallèle) : chaque machine calcule SA tranche de la vidéo, image par image.
// Aucune horloge réelle : chaque image est exacte, la vidéo est parfaitement fluide.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { api } from './api.mjs';
import { initScript } from './capture.mjs';
const TALL = process.env.TALL === '1';
const DIR = '/tmp/bc', S = +process.env.SHARD, N = +process.env.SHARDS, FPS = 30;
async function main() {
  const meta = JSON.parse(readFileSync(DIR + '/meta.json', 'utf8'));
  const { token } = (process.env.VARIANT ? { token: '', variant: process.env.VARIANT } : await api('access'));
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: TALL ? { width: 720, height: 1280 } : { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  await ctx.addInitScript(initScript, token);
  const deck = {};
  for (const c of meta.deck) {
    await ctx.route('**/__deck_' + c.k + '.webm', (r) => r.fulfill({ path: DIR + '/deck_' + c.k + '.webm', contentType: 'video/webm' }));
    deck[c.k] = { url: '/__deck_' + c.k + '.webm', start: c.start };
  }
  const page = await ctx.newPage();
  await page.goto('https://al-ve-pro.base44.app/BroadcastRender?frames=1&v=' + meta.variant, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__wav, null, { timeout: 240000, polling: 300 });
  await page.evaluate((d) => { window.__deck = Object.keys(d).length ? d : null; window.__go(); }, deck);
  await page.waitForFunction(() => window.__seek, null, { timeout: 300000, polling: 300 });
  const total = Math.ceil(meta.dur * FPS), a = Math.floor((total * S) / N), b = Math.floor((total * (S + 1)) / N);
  const out = DIR + '/part_' + String(S).padStart(2, '0') + '.mp4';
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', (TALL ? 'scale=1080:1920' : 'scale=1920:1080') + ':flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-r', String(FPS), '-profile:v', 'high', out], { stdio: ['pipe', 'ignore', 'inherit'] });
  const t0 = Date.now();
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => window.__seek(t), f / FPS);
    const img = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(img)) await once(ff.stdin, 'drain');
    if ((f - a) % 300 === 0) console.log('image ' + (f - a) + '/' + (b - a) + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  }
  ff.stdin.end(); const [code] = await once(ff, 'close');
  if (code) throw new Error('encodage de la tranche ' + S + ' raté');
  await browser.close();
  console.log('tranche ' + S + ' finie : ' + (b - a) + ' images');
}
main().catch((e) => { console.error(e); process.exit(1); });
