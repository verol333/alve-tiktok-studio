// Téléphone (même coque que la page d'accueil du site) affichant les vrais
// écrans filmés : défilement fluide, appuis, saisie au clavier, écran suivant.
import { loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { clamp, prog, rgba, rr } from './draw.mjs';

export const PH = { cx: 1450, cy: 540, sh: 900 };
PH.sw = Math.round(PH.sh * 390 / 844);
const DPR = 2;
const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export async function loadShots(raw) {
  const out = {};
  const img = async (f) => (f ? loadImage(readFileSync(f)) : null);
  for (const [k, s] of Object.entries(raw)) {
    const stills = [];
    for (const x of s.stills || []) stills.push(Object.assign({}, x, { img: await img(x.file) }));
    out[k] = Object.assign({}, s, { long: await img(s.long), chrome: await img(s.chrome), stills });
  }
  return out;
}

const acts = (shot, screen) => !screen.static && (shot.stills || []).length > 0;
const skipOf = (shot, screen) => {
  if (!screen.skip_steps) return 0;
  const i = shot.stills.findIndex((x) => x.step >= screen.skip_steps);
  return i < 0 ? shot.stills.length : i;
};

// Instant (dans la scène) où chaque geste filmé apparaît ; -1 = déjà fait.
export function stepTimes(shot, screen, dur) {
  if (!acts(shot, screen)) return [];
  const st = shot.stills, skip = skipOf(shot, screen), pace = screen.pace || 1;
  const upto = screen.upto != null ? screen.upto : Infinity;
  const t0 = skip ? 0.5 : clamp(dur * 0.3, 1.8, 4.5);
  let t = t0; const times = [];
  st.forEach((x, k) => {
    if (k < skip) { times.push(-1); return; }
    if (x.step >= upto) { times.push(Infinity); return; }
    if (k > skip) t += (x.type === 'click' ? 1.4 : x.type === 'key' ? 0.18 : 0.45) * (x.type === 'key' ? 1 : pace);
    times.push(t);
  });
  const last = t, lim = dur - 1.2;
  if (last > lim && last > t0) { const f = Math.max(0.3, (lim - t0) / (last - t0)); return times.map((x) => (x < 0 || !Number.isFinite(x) ? x : t0 + (x - t0) * f)); }
  return times;
}

export function screenState(shot, screen, lt, dur) {
  const maxScroll = Math.max(0, shot.h - 844);
  const from = clamp(screen.from || 0, 0, maxScroll);
  const act = acts(shot, screen);
  const times = stepTimes(shot, screen, dur);
  const first = act ? (times.find((x) => x >= 0 && Number.isFinite(x)) ?? dur * 0.75) : dur * 0.9;
  const to = act ? clamp(shot.scroll_at_tap || 0, 0, maxScroll) : clamp(screen.to != null ? screen.to : Math.min(maxScroll, 1100), 0, maxScroll);
  const already = act && times[0] === -1;
  const p = already ? 1 : inOut(prog(lt, 0.5, Math.max(0.4, first - 1.0)));
  let cur = -1;
  times.forEach((x, k) => { if (x <= lt) cur = k; });
  const kind = cur >= 0 ? shot.stills[cur].type : '';
  const fade = cur < 0 ? 0 : times[cur] < 0 ? 1 : inOut(prog(lt, times[cur], kind === 'key' ? 0.05 : 0.3));
  let tap = null;
  times.forEach((x, k) => {
    const s = shot.stills[k];
    if (x >= 0 && Number.isFinite(x) && s.type === 'click' && s.tap && lt > x - 0.45 && lt < x + 0.35) tap = { x: s.tap.x, y: s.tap.y, k: prog(lt, x - 0.45, 0.8) };
  });
  return { scroll: from + (to - from) * p, cur, fade, tap, zoom: 1 + 0.02 * prog(lt, 0, dur) };
}

function drawScreen(ctx, shot, st, x, y, w, h) {
  const k = w / 390;
  ctx.fillStyle = '#0a0f1e'; ctx.fillRect(x, y, w, h);
  if (st.cur < 1 || st.fade < 1) {
    if (shot.long) {
      const sy = Math.round(st.scroll * DPR), sh = Math.min(shot.long.height - sy, 844 * DPR);
      if (sh > 0) ctx.drawImage(shot.long, 0, sy, shot.long.width, sh, x, y, w, (sh / DPR) * k);
    }
    if (shot.chrome) ctx.drawImage(shot.chrome, x, y, w, h);
  }
  const a0 = ctx.globalAlpha;
  if (st.cur >= 1 && shot.stills[st.cur - 1].img) ctx.drawImage(shot.stills[st.cur - 1].img, x, y, w, h);
  if (st.cur >= 0 && shot.stills[st.cur].img) { ctx.globalAlpha = a0 * st.fade; ctx.drawImage(shot.stills[st.cur].img, x, y, w, h); ctx.globalAlpha = a0; }
  if (st.tap && st.tap.k > 0 && st.tap.k < 1) {
    const tx = x + st.tap.x * k, ty = y + st.tap.y * k;
    ctx.globalAlpha = a0 * (1 - st.tap.k);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(tx, ty, 18 + 50 * st.tap.k, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a0 * Math.min(1, 2 * (1 - st.tap.k));
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(tx, ty, 14, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a0;
  }
}

// layers : [{ shot, st, alpha }] dessinés l'un sur l'autre (fondu entre deux écrans).
export function drawPhone(ctx, layers, vis, t, accent) {
  if (vis <= 0.001 || !layers.length) return;
  const { cx, sw, sh } = PH;
  const cy = PH.cy + (1 - vis) * 700 + Math.sin(t * 0.8) * 6;
  const rot = (1 - vis) * 0.12 + Math.sin(t * 0.5) * 0.006;
  const b = 13, W2 = sw + b * 2, H2 = sh + b * 2;
  ctx.save();
  ctx.globalAlpha = clamp(vis * 1.4, 0, 1);
  ctx.translate(cx, cy); ctx.rotate(rot);
  const z = layers[0].st.zoom || 1; ctx.scale(z, z);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 620);
  glow.addColorStop(0, rgba(accent, 0.3)); glow.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow; ctx.fillRect(-700, -700, 1400, 1400);
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 40;
  const g = ctx.createLinearGradient(-W2 / 2, -H2 / 2, W2 / 2, H2 / 2);
  g.addColorStop(0, '#2A3550'); g.addColorStop(1, '#0E1526');
  ctx.fillStyle = g; rr(ctx, -W2 / 2, -H2 / 2, W2, H2, 58); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  rr(ctx, -sw / 2, -sh / 2, sw, sh, 46); ctx.clip();
  const a0 = ctx.globalAlpha;
  for (const l of layers) { ctx.globalAlpha = a0 * l.alpha; drawScreen(ctx, l.shot, l.st, -sw / 2, -sh / 2, sw, sh); }
  ctx.globalAlpha = a0;
  const sheen = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.06)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; rr(ctx, -52, -sh / 2 + 12, 104, 30, 15); ctx.fill();
  ctx.restore();
}
