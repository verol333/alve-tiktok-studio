// Tourne la vidéo « Broadcast » : le navigateur joue /BroadcastRender en plein écran,
// le son est le mix exact rendu par la page, ffmpeg assemble un MP4 H.264 lisible sur téléphone.
import { chromium } from 'playwright';
import { writeFileSync, readdirSync } from 'node:fs';
import { api } from './api.mjs';
import { initScript } from './capture.mjs';
import { run } from './sh.mjs';

const DIR = '/tmp/bc';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { token, variant } = await api('access');
  const tall = variant !== 'youtube';
  const size = tall ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: DIR, size } });
  await ctx.addInitScript(initScript, token);
  const page = await ctx.newPage();
  const tPage = Date.now();
  await page.goto('https://al-ve-pro.base44.app/BroadcastRender?v=' + variant, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__wav, null, { timeout: 180000, polling: 500 });
  writeFileSync(DIR + '/mix.wav', Buffer.from(await page.evaluate(() => window.__wav), 'base64'));
  // Laisse le site du téléphone (préchargé) se charger avant de lancer.
  await wait(6000);
  await page.evaluate(() => window.__go());
  await page.waitForFunction(() => window.__bcT0, null, { timeout: 120000 });
  const t0 = await page.evaluate(() => window.__bcT0);
  await page.waitForFunction(() => window.__done, null, { timeout: 15 * 60000, polling: 1000 });
  await wait(800);
  await ctx.close(); await browser.close();
  const raw = DIR + '/' + readdirSync(DIR).find((f) => f.endsWith('.webm'));
  const offset = Math.max(0, (t0 - tPage) / 1000).toFixed(3);
  const scale = tall ? '1080:1920' : '1920:1080';
  await run('ffmpeg', ['-y', '-ss', offset, '-i', raw, '-i', DIR + '/mix.wav', '-map', '0:v', '-map', '1:a',
    '-vf', 'scale=' + scale + ':flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', DIR + '/apercu.mp4']);
  const tag = 'apercu-' + process.env.RUN_ID;
  await run('gh', ['release', 'create', tag, DIR + '/apercu.mp4', '--repo', process.env.GH_REPO, '--title', 'Broadcast ' + variant, '--notes', 'Broadcast BTTS']);
  await api('done', { url: 'https://github.com/' + process.env.GH_REPO + '/releases/download/' + tag + '/apercu.mp4' });
}

main().catch(async (e) => { console.error(e); await api('fail', { error: String(e?.message || e) }).catch(() => {}); process.exit(1); });
