// Étape 1 : son exact + écrans du téléphone, partagés ensuite avec toutes les machines de rendu.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { api } from './api.mjs';
import { initScript } from './capture.mjs';
import { shootDeck } from './shootDeck.mjs';
const DIR = '/tmp/bc'; mkdirSync(DIR, { recursive: true });
async function main() {
  const { token, variant } = await api('access');
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(initScript, token);
  const page = await ctx.newPage();
  await page.goto('https://al-ve-pro.base44.app/BroadcastRender?v=' + variant, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__wav, null, { timeout: 240000, polling: 500 });
  const plan = await page.evaluate(() => window.__deckPlan || []);
  const dur = await page.evaluate(() => window.__bcDur);
  writeFileSync(DIR + '/mix.wav', Buffer.from(await page.evaluate(() => window.__wav), 'base64'));
  await ctx.close();
  console.log('son prêt, durée ' + dur.toFixed(1) + ' s');
  const clips = plan.length ? await shootDeck(browser, token, plan, DIR) : [];
  await browser.close();
  writeFileSync(DIR + '/meta.json', JSON.stringify({ variant, dur, deck: clips.map((c) => ({ k: c.k, start: c.start })) }));
  console.log('écrans enregistrés : ' + clips.map((c) => c.k).join(', '));
}
main().catch(async (e) => { console.error(e); await api('fail', { error: String(e?.message || e) }).catch(() => {}); process.exit(1); });
