// Identité visuelle propre à CHAQUE vidéo : texture, cadre et transitions tirés au sort
// côté appli (style.look). Sans identité, les styles gardent leur habillage d'origine.
import { W, H, clamp, inOut, lerp, rr, rgba, seeded, txt, font, brand } from './kit.mjs';

export function prepLook(env) {
  const L = env.look; if (!L) return;
  const r = seeded((L.seed || 1) >>> 0);
  env.lookDots = Array.from({ length: 48 }, () => ({ x: r() * W, y: r() * H, v: 40 + r() * 160, s: 4 + r() * 10, a: 0.25 + r() * 0.5, ph: r() * 6, c: r() < 0.5 ? L.accent : L.hot }));
  const tr = L.transitions && L.transitions.length ? L.transitions : ['native'];
  env.lookTr = env.bounds.map((_, k) => tr[k % tr.length]);
}

export function overlay(ctx, env, t) {
  const L = env.look; if (!L) return;
  const o = L.overlay;
  ctx.save();
  if (o === 'grain' || o === 'vhs') {
    const r = seeded(Math.floor(t * 30) * 7919 + 13);
    for (let i = 0; i < 700; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)'; ctx.fillRect(r() * W, r() * H, 3, 3); }
  }
  if (o === 'scanlines' || o === 'vhs') {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    const by = ((t * 0.25) % 1) * (H + 300) - 150, g = ctx.createLinearGradient(0, by - 90, 0, by + 90);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, by - 90, W, 180);
  }
  if (o === 'vhs') {
    if (Math.floor(t * 1.4) % 2 === 0) { ctx.fillStyle = '#FF3B3B'; ctx.beginPath(); ctx.arc(872, 110, 11, 0, Math.PI * 2); ctx.fill(); }
    txt(ctx, 'REC', 940, 122, 34, env.F.xb, '#FFFFFF', 'center', 6);
  }
  if (o === 'halftone') {
    ctx.fillStyle = rgba(L.accent, 0.22);
    for (let y = 0; y < H; y += 34) {
      const k = y < H * 0.22 ? 1 - y / (H * 0.22) : y > H * 0.75 ? (y - H * 0.75) / (H * 0.25) : 0;
      if (k <= 0) continue;
      for (let x = (y / 34) % 2 ? 17 : 0; x < W; x += 34) { ctx.beginPath(); ctx.arc(x, y, 2 + 9 * k, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  if (o === 'lightleak') {
    ctx.globalCompositeOperation = 'lighter';
    [[L.accent, 0.15, 0], [L.hot, 0.11, 2.1]].forEach(([c, sp, ph]) => {
      const x = 540 + Math.sin(t * sp * 6 + ph) * 620, y = 960 + Math.cos(t * sp * 4 + ph) * 900;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 700); g.addColorStop(0, rgba(c, 0.22)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
  }
  if (o === 'vignette') {
    const g = ctx.createRadialGradient(540, 960, 380, 540, 960, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = rgba(L.accent, 0.06); ctx.fillRect(0, 0, W, H);
  }
  if (o === 'grid') {
    ctx.strokeStyle = rgba(L.accent, 0.12); ctx.lineWidth = 2; const off = (t * 40) % 90;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 90) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = off - 90; y <= H; y += 90) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }
  if (o === 'bokeh') {
    for (const d of env.lookDots) {
      const y = (d.y - t * d.v * 0.3 + H * 10) % H, x = d.x + Math.sin(t + d.ph) * 30, rad = d.s * 5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, rgba(d.c, d.a * 0.5)); g.addColorStop(1, rgba(d.c, 0));
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  if (o === 'confetti') {
    for (const d of env.lookDots) {
      const y = ((d.y + t * d.v) % (H + 40)) - 20, x = d.x + Math.sin(t * 2 + d.ph) * 40;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 3 + d.ph); ctx.globalAlpha = d.a; ctx.fillStyle = d.c; ctx.fillRect(-d.s / 2, -d.s, d.s, d.s * 2); ctx.restore();
    }
  }
  if (o === 'rain') {
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.beginPath();
    for (const d of env.lookDots) { const y = ((d.y + t * d.v * 6) % (H + 200)) - 100, x = (d.x + t * 60) % W; ctx.moveTo(x, y); ctx.lineTo(x - 18, y + 90); }
    ctx.stroke();
  }
  ctx.restore();
}

export function frame(ctx, env, t) {
  const L = env.look; if (!L || !L.frame || L.frame === 'none') return;
  ctx.save();
  if (L.frame === 'brackets') {
    ctx.strokeStyle = rgba(L.accent, 0.6 + 0.4 * Math.sin(t * 3)); ctx.lineWidth = 8; ctx.lineCap = 'square';
    const m = 34, k = 90;
    for (const [x, y, sx, sy] of [[m, 190, 1, 1], [W - m, 190, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + sy * k); ctx.lineTo(x, y); ctx.lineTo(x + sx * k, y); ctx.stroke();
    }
  } else if (L.frame === 'border') {
    rr(ctx, 22, 22, W - 44, H - 44, 36); ctx.lineWidth = 6; ctx.strokeStyle = rgba(L.accent, 0.8); ctx.stroke();
  } else if (L.frame === 'ticker') {
    ctx.fillStyle = L.accent; ctx.fillRect(0, H - 84, W, 64);
    font(ctx, 34, env.F.black); ctx.fillStyle = '#0B1020'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const s = 'AL VE CAPITAL   •   ANALYSE FOOT   •   18+ JOUE RESPONSABLE   •   ', w = ctx.measureText(s).width;
    for (let x = -((t * 160) % w); x < W; x += w) ctx.fillText(s, x, H - 52);
  } else if (L.frame === 'side') {
    const h = H * clamp(t / env.total, 0, 1);
    ctx.fillStyle = rgba(L.accent, 0.25); ctx.fillRect(0, 0, 12, H); ctx.fillRect(W - 12, 0, 12, H);
    ctx.fillStyle = L.accent; ctx.fillRect(0, 0, 12, h); ctx.fillRect(W - 12, H - h, 12, h);
  }
  ctx.restore();
}

// Transition de l'identité du jour. false = laisser la transition d'origine du style.
export function transition(ctx, env, t) {
  const L = env.look; if (!L) return false;
  const k = env.bounds.findIndex((b) => Math.abs(t - b) < 0.45);
  if (k < 0) return true;
  const type = env.lookTr[k];
  if (type === 'native') return false;
  const d = t - env.bounds[k], p = clamp((d + 0.4) / 0.8, 0, 1), cover = 1 - Math.abs(p - 0.5) * 2;
  ctx.save();
  if (type === 'flash') {
    if (d > -0.06 && d < 0.22) { const a = d < 0 ? 1 + d / 0.06 : 1 - d / 0.22; ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  } else if (type === 'iris') {
    const r = inOut(cover) * 1150; ctx.fillStyle = L.accent; ctx.beginPath();
    if (p < 0.5) ctx.arc(540, 960, r, 0, Math.PI * 2);
    else { ctx.rect(0, 0, W, H); ctx.arc(540, 960, Math.max(0.1, 1150 - r), 0, Math.PI * 2, true); }
    ctx.fill();
  } else if (type === 'blinds') {
    const n = 12, h = H / n; ctx.fillStyle = L.accent;
    for (let i = 0; i < n; i++) { const q = clamp(cover * 1.6 - (i % 2) * 0.3, 0, 1); ctx.fillRect(i % 2 ? W * (1 - q) : 0, i * h, W * q, h + 1); }
  } else if (type === 'shutter') {
    const hh = 960 * inOut(cover);
    ctx.fillStyle = '#0B1020'; ctx.fillRect(0, 0, W, hh); ctx.fillRect(0, H - hh, W, hh);
    ctx.fillStyle = L.accent; ctx.fillRect(0, hh - 10, W, 10); ctx.fillRect(0, H - hh, W, 10);
  } else if (type === 'ink') {
    const top = p < 0.5 ? 0 : H * inOut((p - 0.5) * 2), bot = p < 0.5 ? H * inOut(cover) : H + 80;
    ctx.fillStyle = L.accent; ctx.beginPath(); ctx.moveTo(0, top);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, bot + Math.sin(x / 70 + t * 8) * 40);
    ctx.lineTo(W, top); ctx.closePath(); ctx.fill();
  } else if (type === 'glitchcut') {
    if (Math.abs(d) < 0.18) {
      const r = seeded(Math.floor(t * 30) * 31 + 7), cols = [L.accent, L.hot, '#000000', '#FFFFFF'];
      for (let i = 0; i < 14; i++) { const y = r() * H, h = 20 + r() * 120; ctx.globalAlpha = 0.5 + r() * 0.5; ctx.fillStyle = cols[Math.floor(r() * 4)]; ctx.fillRect((r() - 0.5) * 200, y, W, h); }
    }
  } else if (type === 'zoom') {
    const a = cover * cover, g = ctx.createRadialGradient(540, 960, 0, 540, 960, 1100);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * a).toFixed(3) + ')'); g.addColorStop(1, rgba(L.accent, 0.5 * a));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * a).toFixed(3) + ')'; ctx.lineWidth = 6; ctx.beginPath();
    for (let i = 0; i < 36; i++) { const an = (i / 36) * Math.PI * 2, r0 = 300 + (1 - a) * 400; ctx.moveTo(540 + Math.cos(an) * r0, 960 + Math.sin(an) * r0); ctx.lineTo(540 + Math.cos(an) * 1400, 960 + Math.sin(an) * 1400); }
    ctx.stroke();
  } else if (type === 'bands') {
    [L.accent, L.hot, '#0B1020'].forEach((c, j) => {
      const q = clamp(p + (2 - j) * 0.08 - 0.08, 0, 1); if (q <= 0 || q >= 1) return;
      const cx = lerp(-1512, 2592, inOut(q)); ctx.fillStyle = c; ctx.beginPath();
      ctx.moveTo(cx - 700, -10); ctx.lineTo(cx + 1300, -10); ctx.lineTo(cx + 1000, H + 10); ctx.lineTo(cx - 1000, H + 10); ctx.closePath(); ctx.fill();
    });
  }
  if (['iris', 'blinds', 'shutter', 'ink', 'bands'].includes(type) && Math.abs(d) < 0.1) { ctx.globalAlpha = 1 - Math.abs(d) / 0.1; brand(ctx, env, 540, 960, 260); }
  ctx.restore();
  return true;
}
