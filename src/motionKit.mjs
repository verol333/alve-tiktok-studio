// Motion kit: springs, kinetic type, counters, draw-on panels, camera punch, living backgrounds.
import { easeOut, rr, font } from './draw.mjs';
export const W = 1920, H = 1080, WHITE = '#F6FAFF', MUTED = '#A4B4CC', GREEN = '#3DE1AB', AMBER = '#FFC174', RED = '#FF8394', INK = '#070D1A';
export const clamp = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
export const spring = (t) => t <= 0 ? 0 : t >= 2.2 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(11 * t);
export const smooth = (p) => p * p * (3 - 2 * p);
export function label(ctx, text, x, y, size, family, color = WHITE, align = 'center') {
  font(ctx, size, family); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
export function pop(ctx, lt, t0, cx, cy, draw, from = 'scale', dist = 180) {
  const t = lt - t0; if (t < 0) return;
  const k = spring(t * 1.5);
  ctx.save(); ctx.globalAlpha *= clamp(t * 5); ctx.translate(cx, cy + Math.sin(lt * 1.7 + cx * .013) * 7);
  if (from === 'scale') { ctx.scale(k, k); ctx.rotate((1 - k) * -.12); }
  else if (from === 'left') { ctx.translate(-(1 - k) * dist, 0); ctx.rotate((1 - k) * -.05); }
  else if (from === 'right') { ctx.translate((1 - k) * dist, 0); ctx.rotate((1 - k) * .05); }
  else ctx.translate(0, (1 - k) * dist);
  draw(); ctx.restore();
}
export function kinetic(ctx, text, x, y, size, family, color, lt, t0, gap = .035) {
  font(ctx, size, family); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const chars = [...text], ws = chars.map((c) => ctx.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0);
  let cx = x - tot / 2; ctx.fillStyle = color;
  chars.forEach((c, i) => {
    const t = lt - t0 - i * gap; if (t > 0 && c !== ' ') {
      const k = spring(t * 2);
      ctx.save(); ctx.globalAlpha *= clamp(t * 7); ctx.translate(cx + ws[i] / 2, y - (1 - k) * size * .9);
      ctx.scale(1, .6 + .4 * k); ctx.fillText(c, -ws[i] / 2, 0); ctx.restore();
    }
    cx += ws[i];
  });
}
export function counter(ctx, text, x, y, size, family, color, lt, t0, d = .9) {
  const m = text.match(/(\d+)(?:,(\d+))?/); if (!m) return label(ctx, text, x, y, size, family, color);
  const dec = m[2] ? m[2].length : 0, v = parseFloat(m[1] + '.' + (m[2] || 0)) * easeOut(clamp((lt - t0) / d));
  label(ctx, text.replace(m[0], v.toFixed(dec).replace('.', ',')), x, y, size, family, color);
}
export function panel(ctx, w, h, border, lt, t0, fill = '#1A2940') {
  const x = -w / 2, y = -h / 2, p = clamp((lt - t0) / .7), per = 2 * (w + h);
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, 30); ctx.fill();
  const ph = ((lt - t0) * .45) % 1.6;
  if (ph < 1) {
    ctx.save(); rr(ctx, x, y, w, h, 30); ctx.clip();
    const sx = x - 300 + (w + 600) * ph, g = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.09)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 160, y, 320, h); ctx.restore();
  }
  ctx.save(); ctx.strokeStyle = border; ctx.lineWidth = 5; ctx.setLineDash([per * p, per]); rr(ctx, x, y, w, h, 30); ctx.stroke(); ctx.restore();
}
export function arrow(ctx, x0, y, len, q, color) {
  if (q <= .02) return; ctx.fillStyle = color; ctx.fillRect(x0, y - 6, len * q, 12);
  const hx = x0 + len * q; ctx.beginPath(); ctx.moveTo(hx + 26, y); ctx.lineTo(hx - 20, y - 30); ctx.lineTo(hx - 20, y + 30); ctx.fill();
}
export function check(ctx, x, y, r, q, color = GREEN) {
  if (q <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(spring(q * 2), spring(q * 2));
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = r * .22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-r * .42, 0); ctx.lineTo(-r * .1, r * .32); ctx.lineTo(r * .45, -r * .34); ctx.stroke(); ctx.restore();
}
export function camera(ctx, s, lt, hits) {
  const dur = s.voiceDur || 6; let punch = 0;
  for (const h of hits) if (lt > h) punch += Math.exp(-(lt - h) * 7) * Math.sin((lt - h) * 20) * .5 + Math.exp(-(lt - h) * 5) * .5;
  const k = 1 + .045 * clamp(lt / dur) + .03 * punch;
  ctx.translate(W / 2 + Math.sin(lt * .6) * 10, H / 2 + Math.cos(lt * .5) * 6); ctx.scale(k, k); ctx.rotate(Math.sin(lt * .4) * .004); ctx.translate(-W / 2, -H / 2);
}
function particles(ctx, lt, color) {
  for (let i = 0; i < 46; i++) {
    const sx = (i * 397) % W, sp = 18 + (i * 53) % 40, y = (H + 40) - ((lt * sp + i * 131) % (H + 80));
    ctx.globalAlpha = .08 + (i % 5) * .03; ctx.fillStyle = i % 3 ? color : AMBER;
    ctx.fillRect(sx + Math.sin(lt + i) * 22, y, 3 + (i % 3), 3 + (i % 3));
  }
  ctx.globalAlpha = 1;
}
// Background chosen per scene: broll video, flat colour with moving bands, rotating rays, or glowing gradient.
export function backdrop(ctx, env, L, lt) {
  const kind = env.brollFrame ? 'broll' : (L.bg || 'glow'), accent = L.accent || GREEN;
  if (kind === 'broll') {
    const bf = env.brollFrame, z = (1.06 + .05 * clamp(lt / 8)) * Math.max(W / bf.width, H / bf.height);
    ctx.drawImage(bf, (W - bf.width * z) / 2 + Math.sin(lt * .3) * 20, (H - bf.height * z) / 2, bf.width * z, bf.height * z);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(7,13,26,.72)'); g.addColorStop(1, 'rgba(7,13,26,.86)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else if (kind === 'solid') {
    ctx.fillStyle = L.bgColor || '#0E1A2E'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-.35); ctx.globalAlpha = .06; ctx.fillStyle = accent;
    for (let i = -6; i < 7; i++) ctx.fillRect(i * 320 + ((lt * 60) % 320), -1400, 120, 2800);
    ctx.restore(); ctx.globalAlpha = 1;
  } else if (kind === 'rays') {
    ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * .55); ctx.rotate(lt * .12); ctx.fillStyle = accent;
    for (let i = 0; i < 16; i++) { ctx.globalAlpha = i % 2 ? .05 : .09; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1500, i * Math.PI / 8, i * Math.PI / 8 + Math.PI / 16); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, INK); g.addColorStop(1, L.bgColor || '#132D3D');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const x = 1100 + Math.sin(lt * .7) * 420, a = ctx.createRadialGradient(x, 510, 0, x, 510, 700);
  a.addColorStop(0, 'rgba(61,225,171,.16)'); a.addColorStop(1, 'rgba(61,225,171,0)');
  ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
  particles(ctx, lt, accent);
}
// Brand watermark on every scene.
export function brandTag(ctx, env, lt) {
  ctx.save(); ctx.globalAlpha = clamp(lt * 2) * .9;
  ctx.fillStyle = 'rgba(7,13,26,.6)'; rr(ctx, 40, 34, 330, 58, 29); ctx.fill();
  ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(72, 63, 9 + Math.sin(lt * 4) * 2, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'AL VE CAPITAL', 94, 64, 28, env.F.xb, WHITE, 'left'); ctx.restore();
}
