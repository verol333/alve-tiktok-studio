// Pré-enregistre les écrans du téléphone : le VRAI site filmé directement, plein écran, avec un curseur visible.
import { initScript, closeInvites } from './capture.mjs';
import { run } from './sh.mjs';
import { execFileSync } from 'node:child_process';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SITE = 'https://al-ve-pro.base44.app';
const SIZE = { width: 390, height: 844 };
const LIST = '[role="dialog"] .overflow-y-auto';

// Curseur (flèche blanche) + cercle lumineux + onde au moment du clic.
async function cursorTo(p, sel, re, idx, click) {
  const pt = await p.evaluate(([s, r, i]) => {
    if (!document.getElementById('__cur')) {
      const c = document.createElement('div'); c.id = '__cur';
      c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M5 2l14 10-6.5 1.2L9 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      c.style.cssText = 'position:fixed;left:72%;top:78%;z-index:2147483647;pointer-events:none;transition:left .7s cubic-bezier(.3,.8,.3,1),top .7s cubic-bezier(.3,.8,.3,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.55))';
      document.body.appendChild(c);
    }
    const all = [...document.querySelectorAll(s)].filter((e) => e.offsetParent && (!r || new RegExp(r, 'i').test(e.textContent.trim())));
    const el = all[i || 0]; if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const b = el.getBoundingClientRect();
    const cur = document.getElementById('__cur');
    cur.style.left = (b.left + b.width / 2 - 6) + 'px'; cur.style.top = (b.top + b.height / 2 - 4) + 'px';
    el.style.boxShadow = '0 0 0 4px #22D3EE, 0 0 26px #22D3EE'; el.style.borderRadius = '12px';
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, [sel, re || '', idx || 0]);
  if (!pt) { console.log('élément absent : ' + sel + ' ' + (re || '')); return null; }
  await wait(800);
  await p.evaluate(([x, y]) => {
    const w = document.createElement('div');
    w.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:3px solid #22D3EE;width:16px;height:16px;left:' + (x - 8) + 'px;top:' + (y - 8) + 'px;transition:all .45s ease-out;opacity:1';
    document.body.appendChild(w); requestAnimationFrame(() => { w.style.width = w.style.height = '60px'; w.style.left = (x - 30) + 'px'; w.style.top = (y - 30) + 'px'; w.style.opacity = '0'; });
    setTimeout(() => w.remove(), 600);
  }, [pt.x, pt.y]);
  if (click) await p.mouse.click(pt.x, pt.y);
  await wait(250);
  return pt;
}
const tap = (sel, re, click = true) => (p) => cursorTo(p, sel, re, 0, click);
const scrollBy = (sel, px, ms) => async (p) => {
  const steps = Math.max(1, Math.round(ms / 40));
  for (let i = 0; i < steps; i++) { await p.evaluate(([s, d]) => { const el = s ? document.querySelector(s) : document.scrollingElement; if (el) el.scrollTop += d; }, [sel, px / steps]); await wait(40); }
};
// Inscription : clic sur Sign up, puis e-mail, mot de passe, confirmation, lettre par lettre.
const signup = (dur) => async (p) => {
  const t0 = Date.now();
  await cursorTo(p, 'a,button', '^sign up$|^s.inscrire$|créer un compte', 0, true);
  await wait(900);
  const vals = ['monadresse@gmail.com', 'MotDePasse2026', 'MotDePasse2026'];
  const n = Math.min(3, await p.locator('input:visible').count());
  const left = Math.max(1.5, dur - (Date.now() - t0) / 1000 - 0.3);
  for (let i = 0; i < n; i++) {
    await cursorTo(p, 'input', '', i, true);
    await p.keyboard.type(vals[i], { delay: Math.max(25, ((left / n - 1.1) * 1000) / vals[i].length) });
  }
};
// Somme annoncée par la voix = carte encadrée en or, amenée au centre de l'écran.
const gain = (n) => (p) => p.evaluate(([L, n]) => {
  const l = document.querySelector(L); if (!l) return;
  l.querySelectorAll('[data-gain]').forEach((e) => { e.style.outline = 'none'; e.style.boxShadow = 'none'; });
  const t = [...l.querySelectorAll('*')].find((e) => !e.children.length && new RegExp('\\+\\s?' + n + '\\s?XAF').test(e.textContent));
  if (!t) return;
  let c = t; while (c.parentElement && c.parentElement !== l && c.offsetHeight < 150) c = c.parentElement;
  c.dataset.gain = '1';
  const tr = c.getBoundingClientRect(), lr = l.getBoundingClientRect();
  l.scrollTo({ top: l.scrollTop + tr.top - lr.top - 14, behavior: 'smooth' });
  c.style.outline = '3px solid #F5C542'; c.style.outlineOffset = '2px'; c.style.boxShadow = '0 0 24px #F5C54299'; c.style.borderRadius = '16px';
}, [LIST, n]);
const FULL = '[role=dialog]{top:0!important;bottom:0!important;height:100vh!important;max-height:100vh!important;border-radius:0!important;margin:0!important}';

function shots(k, g, dur) {
  if (k === 'inbox') {
    const a = g[3] ?? dur * 0.6, d = dur - a;
    const txt = 'Regarde mes derniers messages : 143 francs ce matin, 396, 333 cette nuit, encore 98.';
    const at = (w) => a + (txt.indexOf(w) / txt.length) * d - 0.35;
    return [{ path: '/Home', a: 0, b: dur,
      prep: async (p) => { await p.locator('[aria-label="Messages"]:visible').first().click(); await p.waitForSelector(LIST, { timeout: 30000 }); await p.addStyleTag({ content: FULL }); await wait(2500); },
      acts: [['143', at('143')], ['396', at('396')], ['333', at('333')], ['98', at('98')]].map(([n, t]) => [t, gain(n)]) }];
  }
  const [s0, s1, s2, s3, s4] = g;
  return [
    { path: '/landing-preview', guest: true, a: 0, b: s1, ready: 'text=Ouvrir la plateforme', acts: [[0.2, tap('a,button', 'Ouvrir la plateforme', false)], [Math.max(0.5, s1 - 1.3), tap('a,button', 'Ouvrir la plateforme', false)]] },
    { path: '/login', guest: true, a: s1, b: s2 + 1.5, ready: 'input', acts: [[s1 + 0.1, signup(s2 - s1 + 1.2)]] },
    { path: '/Home', a: s2 + 1.5, b: s3 + 2.6, ready: '[aria-label="Menu"]',
      acts: [[s3 - 0.6, tap('[aria-label="Menu"]', '')], [s3 + 1.0, tap('a', '^Arbitrage', false)]] },
    { path: '/Arbitrage', a: s3 + 2.6, b: dur, ready: 'text=%', acts: [[s4 + 1, scrollBy(null, 900, (dur - s4 - 1.5) * 1000)]] },
  ];
}

function avgLuma(file) {
  const txt = execFileSync('sh', ['-c', 'ffmpeg -hide_banner -i "' + file + '" -vf "fps=2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - 2>/dev/null'], { encoding: 'utf8' });
  const v = [...txt.matchAll(/YAVG=([\d.]+)/g)].map((m) => +m[1]);
  return { avg: v.reduce((x, y) => x + y, 0) / (v.length || 1), dark: v.filter((x) => x < 12).length, n: v.length };
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
  // Une image clé par image : le rendu image par image retrouve chaque instant exactement.
  await run('ffmpeg', [...args, '-filter_complex', f, '-map', '[out]', '-an', '-c:v', 'libvpx', '-b:v', '8M', '-g', '1', '-deadline', 'realtime', '-cpu-used', '8', out]);
  const L = avgLuma(out);
  console.log('contrôle image ' + item.k + ' : luminosité ' + L.avg.toFixed(1) + ', noires ' + L.dark + '/' + L.n);
  if (!L.n || L.dark > L.n * 0.15) throw new Error('Écran du téléphone noir (' + item.k + ') : montage arrêté');
  return out;
}

export async function shootDeck(browser, token, plan, dir) {
  const files = await Promise.all(plan.map((it) => one(browser, token, it, dir)));
  return plan.map((it, i) => ({ ...it, file: files[i] }));
}
