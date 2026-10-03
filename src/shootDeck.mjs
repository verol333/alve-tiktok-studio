// Pré-enregistre les écrans du téléphone : le VRAI site filmé directement (aucun cadre imbriqué).
// Chaque écran a sa propre page, chargée et vérifiée AVANT le top départ, puis les morceaux
// sont recollés au rythme exact de la voix. Une image noire = échec du montage (jamais de vidéo noire).
import { initScript, closeInvites } from './capture.mjs';
import { run } from './sh.mjs';
import { execFileSync } from 'node:child_process';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SITE = 'https://al-ve-pro.base44.app';
const SIZE = { width: 390, height: 844 };
const ring = (sel, re) => (p) => p.evaluate(([s, r]) => {
  const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent && (!r || new RegExp(r).test(e.textContent)));
  if (el) { el.scrollIntoView({ block: 'center' }); el.style.boxShadow = '0 0 0 4px #22D3EE, 0 0 26px #22D3EE'; el.style.borderRadius = '12px'; }
}, [sel, re || '']);
const scrollBy = (sel, px, ms) => async (p) => {
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 0; i < steps; i++) { await p.evaluate(([s, d]) => { const el = s ? document.querySelector(s) : document.scrollingElement; if (el) el.scrollTop += d; }, [sel, px / steps]); await wait(50); }
};
const typeAll = async (p, dur) => {
  const ins = p.locator('input:visible'); const n = await ins.count();
  const vals = ['monadresse@gmail.com', 'MotDePasse2026', 'MotDePasse2026'];
  for (let i = 0; i < Math.min(n, 3); i++) { await ins.nth(i).click().catch(() => {}); await p.keyboard.type(vals[i], { delay: Math.max(20, (dur * 1000) / 3 / vals[i].length) }); }
};

// Les plans : écran, fenêtre [a, b] en secondes dans la scène, préparation, gestes calés.
function shots(k, g, dur) {
  const LIST = '[role="dialog"] .overflow-y-auto';
  if (k === 'inbox') return [{ path: '/Home', a: 0, b: dur,
    prep: async (p) => { await p.locator('[aria-label="Messages"]:visible').first().click(); await p.waitForSelector(LIST, { timeout: 30000 }); await wait(2500); },
    acts: [[g[3] ?? dur * 0.7, scrollBy(LIST, 520, ((dur - (g[3] ?? dur * 0.7)) * 1000) * 0.85)]] }];
  const [s0, s1, s2, s3, s4] = g;
  return [
    { path: '/landing-preview', guest: true, a: 0, b: s1, ready: 'text=Ouvrir la plateforme', acts: [[0.2, ring('a,button', 'Ouvrir la plateforme')]] },
    { path: '/login', guest: true, a: s1, b: s2 + 1.5, ready: 'input', acts: [[s1 + 0.3, (p) => typeAll(p, s2 - s1 - 0.6)]] },
    { path: '/Home', a: s2 + 1.5, b: s3 + 2.4, ready: '[aria-label="Menu"]',
      acts: [[s3 + 0.1, (p) => p.locator('[aria-label="Menu"]:visible').first().click()], [s3 + 1.2, ring('a', '^Arbitrage')]] },
    { path: '/Arbitrage', a: s3 + 2.4, b: dur, ready: 'text=%', acts: [[s4 + 1, scrollBy(null, 900, (dur - s4 - 1.5) * 1000)]] },
  ];
}

function brightness(file) {
  const out = execFileSync('ffmpeg', ['-i', file, '-vf', 'fps=1,signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  return out;
}
function avgLuma(file) {
  let txt = '';
  try { execFileSync('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'fps=2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { /* rien */ }
  txt = execFileSync('sh', ['-c', 'ffmpeg -hide_banner -i "' + file + '" -vf "fps=2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - 2>/dev/null'], { encoding: 'utf8' });
  const v = [...txt.matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]);
  return { min: Math.min(...v), avg: v.reduce((x, y) => x + y, 0) / (v.length || 1), dark: v.filter((x) => x < 12).length, n: v.length };
}

async function one(browser, token, item, dir) {
  const dur = item.end - item.start, g = item.segs || [];
  const list = shots(item.k, g, dur);
  const pages = await Promise.all(list.map(async (s, i) => {
    const ctx = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: dir + '/deck_' + item.k + '_' + i, size: SIZE } });
    await ctx.addInitScript(initScript, token);
    const p = await ctx.newPage(); const tRec = Date.now();
    await p.goto(SITE + s.path, { waitUntil: 'load', timeout: 90000 });
    if (s.ready) await p.waitForSelector(s.ready, { timeout: 90000 });
    await wait(5000); await closeInvites(p).catch(() => {}); await wait(800);
    if (s.prep) await s.prep(p);
    console.log('écran ' + item.k + ' ' + s.path + ' affiché');
    return { s, ctx, p, tRec };
  }));
  const tGo = Date.now();
  await Promise.all(pages.map(async ({ s, p }) => {
    for (const [at, fn] of s.acts || []) { const d = tGo + at * 1000 - Date.now(); if (d > 0) await wait(d); await fn(p).catch((e) => console.log('geste raté ' + s.path + ' : ' + e.message)); }
  }));
  const left = tGo + (dur + 0.8) * 1000 - Date.now(); if (left > 0) await wait(left);
  const raws = [];
  for (const x of pages) { const v = x.p.video(); await x.ctx.close(); raws.push(await v.path()); }
  const args = ['-y'];
  pages.forEach((x, i) => args.push('-ss', ((tGo - x.tRec) / 1000 + x.s.a).toFixed(3), '-t', (x.s.b - x.s.a).toFixed(3), '-i', raws[i]));
  const f = pages.map((_, i) => '[' + i + ':v]scale=390:844,fps=30,setsar=1[v' + i + ']').join(';') + ';' + pages.map((_, i) => '[v' + i + ']').join('') + 'concat=n=' + pages.length + ':v=1:a=0[out]';
  const out = dir + '/deck_' + item.k + '.webm';
  await run('ffmpeg', [...args, '-filter_complex', f, '-map', '[out]', '-an', '-c:v', 'libvpx', '-b:v', '5M', '-g', '10', '-deadline', 'good', '-cpu-used', '4', out]);
  const L = avgLuma(out);
  console.log('contrôle image ' + item.k + ' : luminosité moyenne ' + L.avg.toFixed(1) + ', images noires ' + L.dark + '/' + L.n);
  if (!L.n || L.dark > L.n * 0.15) throw new Error('Écran du téléphone noir (' + item.k + ') : montage arrêté');
  return out;
}

export async function shootDeck(browser, token, plan, dir) {
  const files = await Promise.all(plan.map((it) => one(browser, token, it, dir)));
  return plan.map((it, i) => ({ ...it, file: files[i] }));
}
