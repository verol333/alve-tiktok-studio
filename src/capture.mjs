// Filme les VRAIS écrans du site (navigateur mobile connecté en administrateur) :
// page entière (pour le défilement), éléments fixes (menu, barre du bas) et,
// si demandé, l'écran après un appui sur un bouton.
import { chromium } from 'playwright';
import { join } from 'node:path';

const VW = 390, VH = 844, DPR = 2, MAX_H = 5200;
export const screenKey = (s) => [s.path, JSON.stringify(s.steps || s.click || '')].join('|');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Pop-ups d'accueil marqués comme déjà vus : l'écran reste propre.
export function initScript(tok) {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  try {
    const now = String(Date.now());
    localStorage.setItem('base44_access_token', tok);
    localStorage.setItem('token', tok);
    for (const k of ['alve_pwa_dismissed_at', 'alve_push_v2_snooze', 'alve_tiktok_keepalive', 'alve_studio_access',
      'alve_invite_arb_prematch', 'alve_invite_arb_live', 'alve_invite_auto', 'alve_invite_mise_auto']) localStorage.setItem(k, now);
    localStorage.setItem('alve_push_v2_done', '1');
    localStorage.setItem('alve_failure_popup_v2_btts', '1');
  } catch (e) { /* rien */ }
}

// Ferme les invitations flottantes restantes (hors panneaux de la page).
export async function closeInvites(page) {
  await page.evaluate(() => {
    for (const b of document.querySelectorAll('button')) {
      const t = (b.textContent || '').trim();
      if (!/^(Plus tard|Fermer|Pas maintenant)$/i.test(t) && b.getAttribute('aria-label') !== 'Fermer') continue;
      if (b.closest('[role="dialog"]')) continue;
      let e = b, fixed = false;
      while (e) { if (getComputedStyle(e).position === 'fixed') { fixed = true; break; } e = e.parentElement; }
      if (fixed) b.click();
    }
  });
}

async function shoot(page, base, screen, dir, n) {
  await page.goto(base + screen.path, { waitUntil: 'load', timeout: 60000 });
  await wait(screen.wait || 7000);
  const logged = await page.$('nav[aria-label="Navigation mobile"]');
  if (!logged) throw Object.assign(new Error('Session du site expirée : ouvrez l’application en administrateur puis relancez la vidéo'), { fatal: true });
  await closeInvites(page); await wait(600);
  // Défilement complet pour réveiller les contenus qui se chargent à la vue.
  const h = Math.min(MAX_H, await page.evaluate(() => document.documentElement.scrollHeight));
  for (let y = 0; y < h; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await wait(250); }
  await page.evaluate(() => window.scrollTo(0, 0)); await wait(1200);
  await closeInvites(page);
  const out = { h: 0 };
  // 1) Éléments fixes seuls, fond transparent.
  await page.evaluate(() => {
    const st = document.createElement('style'); st.id = 'studio-chrome';
    st.textContent = 'main{visibility:hidden!important}';
    document.head.appendChild(st);
    let e = document.querySelector('main');
    while (e) { e.style.setProperty('background', 'transparent', 'important'); e = e.parentElement; }
    document.documentElement.style.setProperty('background', 'transparent', 'important');
    document.body.style.setProperty('background', 'transparent', 'important');
    for (const f of document.querySelectorAll('.fixed.inset-0.z-0')) f.style.visibility = 'hidden';
  });
  out.chrome = join(dir, 'scr' + n + '_chrome.png');
  await page.screenshot({ path: out.chrome, omitBackground: true });
  await page.evaluate(() => {
    document.getElementById('studio-chrome')?.remove();
    let e = document.querySelector('main');
    while (e) { e.style.removeProperty('background'); e = e.parentElement; }
    document.documentElement.style.removeProperty('background');
    document.body.style.removeProperty('background');
    for (const f of document.querySelectorAll('.fixed.inset-0.z-0')) f.style.visibility = '';
  });
  // 2) Page entière sans les éléments fixes (ils sont reposés par-dessus).
  const hidden = await page.evaluate(() => {
    let k = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).position !== 'fixed' || el.closest('[role="dialog"]')) continue;
      el.dataset.studioHide = '1'; el.style.setProperty('visibility', 'hidden', 'important'); k++;
    }
    return k;
  });
  out.h = Math.min(MAX_H, await page.evaluate(() => document.documentElement.scrollHeight));
  out.long = join(dir, 'scr' + n + '_long.png');
  if (out.h > VH) await page.screenshot({ path: out.long, fullPage: true, clip: { x: 0, y: 0, width: VW, height: out.h } });
  else await page.screenshot({ path: out.long });
  await page.evaluate(() => { for (const el of document.querySelectorAll('[data-studio-hide]')) { el.style.removeProperty('visibility'); delete el.dataset.studioHide; } });
  // 3) Gestes sur le site (appuis, saisie au clavier) : un écran par geste,
  //    et un écran par touche tapée pour montrer la saisie lettre par lettre.
  const steps = screen.steps || (screen.click ? [{ click: screen.click }] : []);
  out.stills = [];
  let m = 0;
  const snap = async (type, step, tap) => { const f = join(dir, 'scr' + n + '_s' + (m++) + '.png'); await page.screenshot({ path: f }); out.stills.push({ file: f, type, step, tap: tap || null }); };
  for (const [k, st] of steps.entries()) {
    if (st.click) {
      const target = page.getByText(st.click, { exact: false }).first();
      await target.scrollIntoViewIfNeeded({ timeout: 8000 });
      await wait(500);
      if (out.scroll_at_tap == null) out.scroll_at_tap = await page.evaluate(() => window.scrollY);
      const box = await target.boundingBox();
      await target.click({ timeout: 8000 });
      await wait(st.wait || 2600);
      await snap('click', k, box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null);
    } else if (st.fill) {
      const input = page.getByPlaceholder(st.fill).first();
      if (out.scroll_at_tap == null) out.scroll_at_tap = await page.evaluate(() => window.scrollY);
      await input.click({ timeout: 8000 });
      for (const ch of String(st.value)) { await page.keyboard.type(ch); await wait(350); await snap('key', k); }
      await wait(st.wait || 1500);
      await snap('settle', k);
    }
  }
  console.log('Écran filmé : ' + screen.path + (out.stills.length ? ' + ' + out.stills.length + ' gestes' : '') + ' (' + out.h + ' px, ' + hidden + ' éléments fixes)');
  return out;
}

export async function captureScreens(job, dir) {
  const list = [], seen = new Set();
  for (const s of job.scenes) if (s.screen && s.screen.path && !seen.has(screenKey(s.screen))) { seen.add(screenKey(s.screen)); list.push(s.screen); }
  const shots = {};
  if (!list.length) return shots;
  if (!job.site_token) throw new Error('Session du site absente : ouvrez l’application en administrateur puis relancez la vidéo');
  console.log('::add-mask::' + job.site_token);
  const browser = await chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true,
    locale: 'fr-FR', timezoneId: 'Africa/Brazzaville',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });
  await ctx.addInitScript(initScript, job.site_token);
  const page = await ctx.newPage();
  try {
    for (const [n, sc] of list.entries()) {
      try { shots[screenKey(sc)] = await shoot(page, job.site_url, sc, dir, n); }
      catch (e) { if (e.fatal) throw e; console.error('Écran non filmé ' + sc.path + ' : ' + String(e.message || e).slice(0, 200)); }
    }
  } finally { await browser.close(); }
  if (!Object.keys(shots).length) throw new Error('Aucun écran du site n’a pu être filmé');
  return shots;
}
