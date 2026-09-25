// Téléphone qui diffuse le parcours FILMÉ du vrai site (vidéo continue), avec
// un zoom qui amène au centre la zone dont parle la voix.
import { PH } from './phone.mjs';
import { clamp, prog, easeOut, rgba, rr } from './draw.mjs';

export const CW = 780, CH = 1688;
const inOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

// 0 → 1 : progression du zoom dans la scène { y, k, at, len }.
export function zoomOf(s, lt) {
  const Z = s.zoom;
  if (!Z) return 0;
  const at = s.dur * (Z.at != null ? Z.at : 0.4);
  const out = Z.len ? at + 0.8 + Z.len : s.dur - 0.7;
  return inOut(prog(lt, at, 0.8)) * (1 - inOut(prog(lt, out, 0.6)));
}

export function drawWalkPhone(ctx, env, s, lt, t, accent) {
  const frame = env.clipFrame;
  if (!frame) return;
  const inP = s.prevPhone ? 1 : easeOut(prog(lt, 0, 0.8));
  const outP = s.nextPhone ? 0 : inOut(prog(lt, s.dur - 0.5, 0.5));
  const vis = inP * (1 - outP);
  if (vis <= 0.001) return;
  const { cx, sw, sh } = PH, b = 13, W2 = sw + b * 2, H2 = sh + b * 2;
  const zp = zoomOf(s, lt), k = s.zoom ? s.zoom.k || 1.4 : 1, z = 1 + (k - 1) * zp;
  const py = s.zoom ? (clamp(s.zoom.y == null ? 0.5 : s.zoom.y, 0, 1) - 0.5) * sh : 0;
  const cy = PH.cy + (1 - inP) * 760 + outP * 760 + Math.sin(t * 0.8) * 6 * (1 - zp);
  ctx.save();
  ctx.globalAlpha = clamp(vis * 1.4, 0, 1);
  ctx.translate(cx, cy - py * z * zp);
  ctx.rotate(((1 - inP) * 0.14 - outP * 0.1 + Math.sin(t * 0.5) * 0.005) * (1 - zp));
  ctx.scale(z, z);
  const glow = ctx.createRadialGradient(0, py, 0, 0, py, 640);
  glow.addColorStop(0, rgba(accent, 0.3 + 0.15 * zp)); glow.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow; ctx.fillRect(-720, -760, 1440, 1520);
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 40;
  const g = ctx.createLinearGradient(-W2 / 2, -H2 / 2, W2 / 2, H2 / 2);
  g.addColorStop(0, '#2A3550'); g.addColorStop(1, '#0E1526');
  ctx.fillStyle = g; rr(ctx, -W2 / 2, -H2 / 2, W2, H2, 58); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  rr(ctx, -sw / 2, -sh / 2, sw, sh, 46); ctx.clip();
  ctx.drawImage(frame, -sw / 2, -sh / 2, sw, sh);
  const sheen = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.06)'); sheen.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; rr(ctx, -52, -sh / 2 + 12, 104, 30, 15); ctx.fill();
  ctx.restore();
}
