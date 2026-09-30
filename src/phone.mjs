// Filme le parcours du téléphone directement sur le vrai site (plein écran, sans cadre intégré),
// au rythme exact des clics de la voix. Le cadre cyan et la flèche sont dessinés dans la page.
import { initScript } from './capture.mjs';
import { run } from './sh.mjs';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = (t) => wait(Math.max(0, t - Date.now()));
const LEAD = 1.3, H = 904, NAV = 72;

function mark(tap) {
  const H = 904, NAV = 72;
  let els = [...document.querySelectorAll(tap.sel || "button, a, [role='button']")];
  if (tap.text) els = els.filter((b) => b.textContent.toLowerCase().includes(tap.text.toLowerCase()));
  if (!els.length) return false;
  if (tap.all) { els[0].scrollIntoView({ block: 'start' }); els = els.filter((b) => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= H - NAV; }); }
  else { els = els.slice(0, 1); els[0].scrollIntoView({ block: 'center' }); }
  document.querySelectorAll('.__hl').forEach((n) => n.remove());
  window.__hlEls = els;
  els.forEach((el, i) => {
    const d = document.createElement('div'); d.className = '__hl';
    d.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:3px solid #67e8f9;border-radius:16px;box-shadow:0 0 18px #22D3EE,inset 0 0 12px rgba(34,211,238,.35);transition:transform .3s,opacity .35s;opacity:0;transform:scale(1.25)';
    const f = () => { const r = el.getBoundingClientRect(); Object.assign(d.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' }); if (d.isConnected) requestAnimationFrame(f); };
    document.body.appendChild(d); f();
    setTimeout(() => { d.style.opacity = 1; d.style.transform = 'scale(1)'; }, 30 + (tap.look ? i * 250 : 0));
  });
  if (!tap.look) {
    const r = els[0].getBoundingClientRect(), c = document.createElement('div'); c.className = '__hl';
    c.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="#22d3ee" stroke="#fff" stroke-width="1.6"><path d="M4 3l7 17 2.5-7.5L21 10z"/></svg>';
    c.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;transition:all 1s ease-in-out;left:' + (r.left + r.width / 2 + 70) + 'px;top:' + (r.top + r.height / 2 + 90) + 'px;opacity:0';
    document.body.appendChild(c);
    setTimeout(() => { c.style.left = r.left + r.width / 2 + 'px'; c.style.top = r.top + r.height / 2 + 'px'; c.style.opacity = 1; }, 30);
  }
  return true;
}
function press() {
  const el = window.__hlEls?.[0]; if (!el) return;
  const r = el.getBoundingClientRect(), p = document.createElement('div'); p.className = '__hl';
  p.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:48px;height:48px;border-radius:50%;background:rgba(103,232,249,.6);transition:all .6s;left:' + (r.left + r.width / 2 - 24) + 'px;top:' + (r.top + r.height / 2 - 24) + 'px';
  document.body.appendChild(p); setTimeout(() => { p.style.transform = 'scale(2.2)'; p.style.opacity = 0; }, 20);
  el.click();
}

export async function shootPhone(browser, token, walk, dir) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: H }, deviceScaleFactor: 2, recordVideo: { dir: dir + '/phone', size: { width: 860, height: 1808 } } });
  await ctx.addInitScript(initScript, token);
  const p = await ctx.newPage(); const tRec = Date.now();
  await p.goto('https://al-ve-pro.base44.app/', { waitUntil: 'networkidle', timeout: 90000 });
  await wait(5000);
  const t0 = Date.now(), at = (s) => t0 + (s - walk.start) * 1000;
  for (const tap of walk.taps) {
    await until(at(tap.at - LEAD));
    let ok = false; const lim = Date.now() + 8000;
    while (!(ok = await p.evaluate(mark, tap).catch(() => false)) && Date.now() < lim) await wait(150);
    if (!ok) { console.log('Élément introuvable', tap.text || tap.sel); continue; }
    if (tap.look) { await wait(tap.look * 1000); } else { await until(at(tap.at)); await p.evaluate(press).catch(() => {}); await wait(900); }
    await p.evaluate(() => document.querySelectorAll('.__hl').forEach((n) => n.remove())).catch(() => {});
  }
  await wait(4000);
  const vpath = await p.video().path();
  await ctx.close();
  const out = dir + '/phone.webm';
  await run('ffmpeg', ['-y', '-ss', ((t0 - tRec) / 1000).toFixed(3), '-i', vpath, '-an', '-c:v', 'libvpx', '-b:v', '4M', '-deadline', 'good', '-cpu-used', '4', out]);
  return out;
}
