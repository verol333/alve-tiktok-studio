// Filme le VRAI site en vidéo (navigateur mobile connecté en administrateur) :
// un seul parcours continu avec un curseur visible, de vrais appuis, une vraie
// saisie et un vrai défilement. Chaque scène garde son extrait [début, fin] de
// l'enregistrement : ce qu'on voit correspond exactement à ce que dit la voix.
import { chromium } from 'playwright';
import { join } from 'node:path';
import { initScript, closeInvites } from './capture.mjs';
import { run, duration } from './sh.mjs';

const VW = 390, VH = 844;
export const CW = 780, CH = 1688;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Curseur et onde d'appui dessinés DANS la page : ils bougent avec le vrai site.
function cursorScript() {
  const make = () => {
    if (!document.body || document.getElementById('studio-cursor')) return;
    const st = document.createElement('style');
    st.textContent = '#studio-cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transition-property:transform;transition-timing-function:cubic-bezier(.3,.7,.2,1);filter:drop-shadow(0 3px 6px rgba(0,0,0,.55))}'
      + '.studio-ripple{position:fixed;z-index:2147483646;pointer-events:none;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;background:rgba(51,217,142,.45);border:2px solid rgba(255,255,255,.9);animation:studio-rip .6s ease-out forwards}'
      + '@keyframes studio-rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}';
    document.head.appendChild(st);
    const c = document.createElement('div');
    c.id = 'studio-cursor';
    c.innerHTML = '<svg width="36" height="42" viewBox="0 0 24 28"><path d="M3 2L3 22L8.5 17L12 25.5L15.5 24L12 15.8L19.5 15.8Z" fill="#fff" stroke="#0A0F1E" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    let p = [300, 640];
    try { p = JSON.parse(sessionStorage.getItem('studio_cursor') || '[300,640]'); } catch (e) { /* rien */ }
    c.style.transform = 'translate(' + (p[0] - 4.5) + 'px,' + (p[1] - 3) + 'px)';
    document.body.appendChild(c);
  };
  window.__studioMove = (x, y, ms) => {
    make();
    const c = document.getElementById('studio-cursor');
    c.style.transitionDuration = (ms / 1000) + 's';
    c.style.transform = 'translate(' + (x - 4.5) + 'px,' + (y - 3) + 'px)';
    try { sessionStorage.setItem('studio_cursor', JSON.stringify([x, y])); } catch (e) { /* rien */ }
  };
  window.__studioRipple = (x, y) => {
    const r = document.createElement('div');
    r.className = 'studio-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px';
    document.body.appendChild(r); setTimeout(() => r.remove(), 700);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', make); else make();
  setInterval(make, 400);
}

// Masque les numéros de téléphone et adresses mail affichés par le site.
function maskScript() {
  const PHONE = /(?:\+|00)\d[\d\s.-]{7,}\d|\b(?:0\d|2\d\d)\d(?:[\s.-]?\d){6,}\b/g;
  const MAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  const fix = (n) => {
    const v = n.nodeValue;
    if (!v || v.length < 8) return;
    const w = v.replace(MAIL, (m) => (m === 'exemple@gmail.com' ? m : 'compte@exemple.com')).replace(PHONE, '+242 XX XXX XX XX');
    if (w !== v) n.nodeValue = w;
  };
  const sweep = (root) => {
    if (!root) return;
    if (root.nodeType === 3) { fix(root); return; }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) fix(n);
  };
  const start = () => {
    sweep(document.body);
    new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'characterData') fix(m.target); else m.addedNodes.forEach(sweep); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}

async function smoothScroll(page, to, ms) {
  await page.evaluate(([to, ms]) => new Promise((res) => {
    const from = window.scrollY, t0 = performance.now();
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const step = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, from + (to - from) * ease(p)); if (p < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  }), [to, ms]);
}

async function moveTo(page, x, y, ms) {
  await page.evaluate(([x, y, ms]) => window.__studioMove(x, y, ms), [x, y, ms]);
  await wait(ms + 120);
}

async function locate(page, t) {
  const root = t.within === 'dialog' ? page.getByRole('dialog') : page;
  const loc = t.label ? root.locator('[aria-label="' + t.label + '"]')
    : t.css ? root.locator(t.css)
    : t.re ? root.getByText(new RegExp(t.re, 'i'))
    : t.placeholder ? root.getByPlaceholder(t.placeholder)
    : root.getByText(t.text, { exact: !!t.exact });
  const vis = loc.locator('visible=true').first();
  await vis.waitFor({ state: 'visible', timeout: t.timeout || 20000 });
  return vis;
}

// Amène l'élément à l'écran en douceur (comme un vrai défilement au doigt).
async function bring(page, loc) {
  let box = await loc.boundingBox();
  if (box && box.y > 90 && box.y + box.height < VH - 100) return box;
  if (box) {
    const to = await page.evaluate((y) => Math.max(0, window.scrollY + y - 844 * 0.42), box.y);
    await smoothScroll(page, to, 900); await wait(250);
    box = await loc.boundingBox();
  }
  if (!box || box.y < 60 || box.y + box.height > VH - 40) { await loc.scrollIntoViewIfNeeded({ timeout: 8000 }); await wait(400); box = await loc.boundingBox(); }
  if (!box) throw new Error('élément introuvable à l’écran');
  return box;
}

async function act(page, a, mark) {
  if (a.scroll != null) {
    const ms = a.dur || 2200;
    const cur = await page.evaluate(() => window.scrollY);
    await moveTo(page, 300, a.scroll > cur ? 660 : 460, 500);
    await page.evaluate(([y, ms]) => window.__studioMove(300, y, ms), [a.scroll > cur ? 460 : 660, ms]);
    await smoothScroll(page, a.scroll, ms); await wait(300);
    return;
  }
  if (a.press) { await page.keyboard.press(a.press); await wait(a.wait || 900); return; }
  // Centre l'élément à l'écran (y compris dans un panneau qui défile), curseur dessus.
  if (a.center) {
    const loc = await locate(page, a.soft ? { ...a.center, timeout: 6000 } : a.center);
    await loc.evaluate((e) => (e.closest('[data-arb-key]') || e).scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await wait(1300);
    const box = await loc.boundingBox();
    if (box) await moveTo(page, box.x + box.width / 2, box.y + Math.min(box.height / 2, 60), 700);
    await wait(a.wait || 600);
    return;
  }
  const target = a.tap || a.point || (a.fill ? (typeof a.fill === 'string' ? { placeholder: a.fill } : a.fill) : null);
  if (!target) { await wait(a.wait || 500); return; }
  const loc = await locate(page, a.soft ? { ...target, timeout: 5000 } : target);
  const box = await bring(page, loc);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await moveTo(page, x, y, 750);
  await wait(250);
  if (a.point) { await wait(a.wait || 800); return; }
  await page.evaluate(([x, y]) => window.__studioRipple(x, y), [x, y]);
  mark('tap');
  await loc.click({ timeout: 8000 });
  if (a.fill) {
    await wait(500);
    for (const ch of String(a.value)) { await page.keyboard.type(ch); mark('key'); await wait(110); }
  }
  await wait(a.wait || 1500);
}

export async function recordWalkthrough(job, dir) {
  const list = job.scenes.map((s, i) => [s, i]).filter(([s]) => s.walk);
  if (!list.length) return { file: null, segs: {} };
  if (!job.site_token) throw new Error('Session du site absente : ouvrez l’application en administrateur puis relancez la vidéo');
  console.log('::add-mask::' + job.site_token);
  const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'fr-FR', timezoneId: 'Africa/Brazzaville',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    recordVideo: { dir: join(dir, 'walk'), size: { width: VW, height: VH } }, // taille = écran, sinon marge grise
  });
  await ctx.addInitScript(initScript, job.site_token);
  await ctx.addInitScript(cursorScript);
  await ctx.addInitScript(maskScript);
  const page = await ctx.newPage();
  const T0 = Date.now(), now = () => (Date.now() - T0) / 1000;
  const segs = {};
  let raw = null, tEnd = 0;
  try {
    for (const [s, i] of list) {
      const w = s.walk;
      try {
        if (w.path) {
          await page.goto(job.site_url + w.path, { waitUntil: 'load', timeout: 60000 });
          await wait(w.wait || 6000);
          if (!w.public && !(await page.$('nav[aria-label="Navigation mobile"]'))) throw Object.assign(new Error('Session du site expirée : ouvrez l’application en administrateur puis relancez la vidéo'), { fatal: true });
          await closeInvites(page); await wait(300);
        }
        const seg = { start: now(), ev: [] };
        for (const a of w.acts || []) {
          try { await act(page, a, (type) => seg.ev.push({ type, at: now() - seg.start })); }
          catch (e) { if (!a.soft) throw e; console.log('Scène ' + (i + 1) + ' : geste facultatif ignoré (' + String(e.message || e).split('\n')[0].slice(0, 120) + ')'); }
        }
        seg.end = now(); segs[i] = seg;
        console.log('Scène ' + (i + 1) + ' filmée sur le site : ' + (seg.end - seg.start).toFixed(1) + ' s');
      } catch (e) {
        if (e.fatal) throw e;
        throw new Error('Parcours du site, scène ' + (i + 1) + ' : ' + String(e.message || e).split('\n')[0].slice(0, 200));
      }
    }
  } finally {
    tEnd = now();
    raw = await page.video().path();
    await ctx.close(); await browser.close();
  }
  // Vidéo à cadence fixe + recalage de l'horloge (l'enregistrement démarre un peu avant).
  const file = join(dir, 'walk.mp4');
  await run('ffmpeg', ['-y', '-i', raw, '-vf', 'fps=30,scale=' + CW + ':' + CH + ':flags=lanczos', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', file]);
  const d = await duration(file).catch(() => NaN);
  const off = Number.isFinite(d) ? Math.max(-0.5, Math.min(3, d - tEnd)) : 0;
  for (const k of Object.keys(segs)) { segs[k].start += off; segs[k].end += off; }
  console.log('Parcours filmé : ' + (Number.isFinite(d) ? d.toFixed(1) : '?') + ' s (recalage ' + off.toFixed(2) + ' s)');
  return { file, segs };
}
