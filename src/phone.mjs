// Téléphone (même coque que la page d'accueil du site) affichant les vrais
// écrans filmés : défilement fluide, appui sur un bouton, écran suivant.
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
    out[k] = Object.assign({}, s, { long: await img(s.long), chrome: await img(s.chrome), still: await img(s.still) });
  }
  return out;
}

// État de l'écran à l'instant lt de la scène : position de défilement, appui, écran suivant.
export function screenState(shot, screen, lt, dur) {
  const maxScroll = Math.max(0, shot.h - 844);
  const from = clamp(screen.from || 0, 0, maxScroll);
  const click = !!shot.still && !!screen.click;
  const to = click ? clamp(shot.scroll_at_tap || 0, 0, maxScroll) : clamp(screen.to != null ? screen.to : Math.min(maxScroll, 1100), 0, maxScroll);
  const endScroll = click ? 0.45 : 0.9;
  const p = inOut(prog(lt, 0.6, Math.max(0.5, dur * endScroll - 0.6)));
  const tapAt = dur * 0.5;
  return {
    scroll: from + (to - from) * p,
    tap: click && shot.tap ? { x: shot.tap.x, y: shot.tap.y, k: prog(lt, tapAt, 0.7) } : null,
    still: click ? inOut(prog(lt, tapAt + 0.35, 0.5)) : 0,
    zoom: 1 + 0.02 * prog(lt, 0, dur),
  };
}

function drawScreen(ctx, shot, st, x, y, w, h) {
  const k = w / 390; // px vidéo par px du site
  ctx.fillStyle = '#0a0f1e'; ctx.fillRect(x, y, w, h);
  if (shot.long) {
    const sy = Math.round(st.scroll * DPR), sh = Math.min(shot.long.height - sy, 844 * DPR);
    if (sh > 0) ctx.drawImage(shot.long, 0, sy, shot.long.width, sh, x, y, w, (sh / DPR) * k);
  }
  if (shot.chrome) ctx.drawImage(shot.chrome, x, y, w, h);
  if (st.tap && st.tap.k > 0 && st.tap.k < 1) {
    const tx = x + st.tap.x * k, ty = y + (st.tap.y + (shot.scroll_at_tap || 0) - st.scroll) * k;
    ctx.globalAlpha = 1 - st.tap.k;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(tx, ty, 18 + 50 * st.tap.k, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(tx, ty, 14 * (1 - st.tap.k * 0.5), 0, Math.PI * 2); ctx.fill();
  }
  if (st.still > 0 && shot.still) { ctx.globalAlpha = st.still; ctx.drawImage(shot.still, x, y, w, h); ctx.globalAlpha = 1; }
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
