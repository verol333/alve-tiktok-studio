import { W, H, clamp, prog, easeBack, rgba, rr, font, isHi, seeded } from './draw.mjs';

export const PALETTES = {
  emerald: { a: '#10B981', b: '#34D399', hi: '#FDE047', d1: '#03140F', d2: '#0A3326' },
  violet: { a: '#8B5CF6', b: '#C4B5FD', hi: '#FDE047', d1: '#0B0620', d2: '#26104D' },
  sunset: { a: '#F97316', b: '#FDBA74', hi: '#FFFFFF', d1: '#170802', d2: '#3F1705' },
  ice: { a: '#06B6D4', b: '#67E8F9', hi: '#FDE047', d1: '#02111A', d2: '#083247' },
  crimson: { a: '#EF4444', b: '#FCA5A5', hi: '#FDE047', d1: '#170305', d2: '#420A12' },
  stadium: { a: '#33D98E', b: '#818CF8', hi: '#F3C969', d1: '#0A0F1E', d2: '#1C2336' },
  gold: { a: '#F59E0B', b: '#FDE68A', hi: '#FFFFFF', d1: '#140C02', d2: '#3A2606' },
};

export function makeParticles() {
  const r = seeded(42);
  return Array.from({ length: 40 }, () => ({ x: r() * W, y: r() * H, v: 20 + r() * 60, s: 2 + r() * 5, a: 0.15 + r() * 0.35 }));
}

// Fond animé : photo stade (zoom lent), dégradé de la palette, halos mobiles, particules, vignette.
export function drawBackground(ctx, env, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const pal = env.pal;
  ctx.fillStyle = pal.d1; ctx.fillRect(0, 0, W, H);
  const img = env.bg;
  if (img) {
    const z = 1.1 + 0.12 * (t / env.total);
    const k = Math.max(W / img.width, H / img.height) * z;
    const w = img.width * k, hh = img.height * k;
    ctx.globalAlpha = env.bgAlpha ?? 0.9;
    ctx.drawImage(img, (W - w) / 2 + Math.sin(t * 0.2) * 30, (H - hh) / 2 + Math.cos(t * 0.15) * 20, w, hh);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(pal.d1, 0.75)); g.addColorStop(0.45, rgba(pal.d2, 0.45)); g.addColorStop(1, rgba(pal.d1, 0.92));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  [[0.3, 0.35, 0.5], [0.75, 0.65, 0.37]].forEach(([fx, fy, sp], i) => {
    const x = W * fx + Math.sin(t * sp + i) * 180, y = H * fy + Math.cos(t * sp * 0.8 + i) * 220;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 520);
    rg.addColorStop(0, rgba(i ? pal.b : pal.a, 0.26)); rg.addColorStop(1, rgba(pal.a, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  });
  ctx.fillStyle = '#FFFFFF';
  for (const p of env.particles) {
    const y = (((p.y - t * p.v) % H) + H) % H;
    ctx.globalAlpha = p.a;
    ctx.beginPath(); ctx.arc(p.x + Math.sin(t + p.y) * 10, y, p.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// Habillage fixe : barre de progression, logo AL VE CAPITAL, mention responsable, filigrane.
export function drawHud(ctx, env, t) {
  const pal = env.pal, F = env.F;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = pal.a; ctx.fillRect(0, 0, W * clamp(t / env.total, 0, 1), 8);
  const g = ctx.createLinearGradient(54, 60, 138, 144);
  g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  rr(ctx, 54, 60, 84, 84, 24); ctx.fillStyle = g; ctx.fill();
  font(ctx, 46, F.display); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#06101F'; ctx.fillText('AV', 96, 104);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  font(ctx, 36, F.black); ctx.fillStyle = '#FFFFFF'; ctx.fillText('AL VE CAPITAL', 158, 100);
  font(ctx, 22, F.sb); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(env.hudSub || 'Analyse foot du jour', 158, 134);
  ctx.textAlign = 'center';
  font(ctx, 22, F.sb); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('18+  ·  Analyse, pas un conseil  ·  Joue responsable', 540, 205);
}

// Sous-titres karaoké style TikTok : 1 à 3 mots, le mot prononcé s'allume.
export function drawSubs(ctx, env, sc, t) {
  if (!sc || sc.kind === 'hook' || !sc.words.length) return;
  const lt = t - sc.voiceAt;
  if (lt < 0) return;
  const d = sc.voiceDur * 0.96;
  let k = sc.words.findIndex((w) => lt < w.end * d);
  if (k < 0) k = sc.words.length - 1;
  const chunk = sc.chunks.find((c) => k >= c.from && k <= c.to) || sc.chunks[0];
  const F = env.F, pal = env.pal, pillMode = env.style.subtitle_style === 'pill';
  const list = sc.words.slice(chunk.from, chunk.to + 1).map((w) => (/alvecapital\.fr/i.test(w.text) ? w.text.toLowerCase() : w.text.toUpperCase()));
  let size = 74; font(ctx, size, F.black);
  let width = ctx.measureText(list.join(' ')).width;
  while (width > 960 && size > 44) { size -= 4; font(ctx, size, F.black); width = ctx.measureText(list.join(' ')).width; }
  const space = ctx.measureText(' ').width;
  const y = 1340; let x = 540 - width / 2;
  const cs = 0.85 + 0.15 * easeBack(prog(lt, sc.words[chunk.from].start * d, 0.12));
  ctx.save();
  ctx.translate(540, y); ctx.scale(cs, cs); ctx.translate(-540, -y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  list.forEach((w, i) => {
    const wi = chunk.from + i, ww = ctx.measureText(w).width, active = wi === k;
    if (active && pillMode) { rr(ctx, x - 14, y - size * 0.82, ww + 28, size * 1.08, 18); ctx.fillStyle = pal.a; ctx.fill(); }
    else { ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.strokeText(w, x, y); }
    ctx.fillStyle = active ? (pillMode ? '#FFFFFF' : pal.hi) : (isHi(w, sc.highlight) ? pal.hi : (wi < k ? '#FFFFFF' : 'rgba(255,255,255,0.55)'));
    ctx.fillText(w, x, y);
    x += ww + space;
  });
  ctx.restore();
}
