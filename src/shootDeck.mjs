// Pré-enregistre les écrans du téléphone (vrai site) AVANT le tournage, une vidéo par scène,
// au rythme exact de la voix. Les deux scènes sont filmées en parallèle.
import { initScript } from './capture.mjs';
import { run } from './sh.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Session admin partout ; la page d'inscription voit un visiteur non connecté (sans effacer la session).
const init = (tok) => `(${initScript})(${JSON.stringify(tok)});
if (/^\\/login/.test(location.pathname)) {
  localStorage.setItem('base44_access_token', ${JSON.stringify(tok)}); localStorage.setItem('token', ${JSON.stringify(tok)});
  const P = Storage.prototype, hit = (k) => /token|auth|session/i.test(String(k)), g = P.getItem, s = P.setItem, r = P.removeItem;
  P.getItem = function (k) { return hit(k) ? null : g.call(this, k); };
  P.setItem = function (k, v) { if (!hit(k)) s.call(this, k, v); };
  P.removeItem = function (k) { if (!hit(k)) r.call(this, k); };
}`;

async function one(browser, token, item, dir) {
  const size = { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: dir + '/deck_' + item.k, size } });
  await ctx.addInitScript({ content: init(token) });
  const p = await ctx.newPage(); const tRec = Date.now();
  await p.goto('https://al-ve-pro.base44.app/DeckRender?k=' + item.k, { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForFunction(() => window.__deckReady && window.__go, null, { timeout: 360000, polling: 500 });
  console.log('écran ' + item.k + ' prêt (complet : ' + (await p.evaluate(() => window.__deckOk)) + ')');
  const tGo = Date.now(); await p.evaluate(() => window.__go());
  await p.waitForFunction(() => window.__deckDone, null, { timeout: 15 * 60000, polling: 500 });
  const raw = await p.video().path(); await ctx.close();
  const out = dir + '/deck_' + item.k + '.webm';
  await run('ffmpeg', ['-y', '-ss', ((tGo - tRec) / 1000).toFixed(3), '-i', raw, '-an', '-c:v', 'libvpx', '-b:v', '5M', '-g', '15', '-deadline', 'good', '-cpu-used', '4', out]);
  return out;
}

export async function shootDeck(browser, token, plan, dir) {
  const files = await Promise.all(plan.map((it) => one(browser, token, it, dir)));
  return plan.map((it, i) => ({ ...it, file: files[i] }));
}
