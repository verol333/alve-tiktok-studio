// Transitions « motion design » entre les scènes de la vidéo longue (paysage ou
// vertical), aux couleurs de l'identité du jour, chacune avec son bruitage.
import { clamp, rgba, seeded } from './draw.mjs';

const inOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
const ALL = ['bands', 'iris', 'blinds', 'shutter', 'glitchcut', 'zoom', 'slice'];

export function prepCuts(env, tl) {
  const L = env.look || {};
  const pool = (L.transitions || []).filter((t) => ALL.includes(t));
  const list = pool.length >= 2 ? pool.concat(ALL.filter((t) => !pool.includes(t)).slice(0, 2)) : ALL;
  env.cuts = [];
  tl.scenes.forEach((s, i) => {
    if (!i) return;
    const p = tl.scenes[i - 1];
    if (p.seg && s.seg) return; // démonstration filmée : coupe franche, pas de volet
    env.cuts.push({ at: s.start, type: s.kind === 'chapter' ? 'bands' : list[env.cuts.length % list.length] });
  });
}

export function cutSfx(env) {
  const ev = [];
  for (const c of env.cuts || []) {
    if (c.type === 'glitchcut') ev.push({ name: 'impact', at: c.at, vol: 0.4 }, { name: 'key', at: c.at - 0.1, vol: 0.3 });
    else if (c.type === 'zoom') ev.push({ name: 'rise', at: c.at - 0.5, vol: 0.25 }, { name: 'impact', at: c.at, vol: 0.45 });
    else ev.push({ name: 'whoosh', at: c.at - 0.3, vol: 0.5 }, { name: 'pop', at: c.at + 0.02, vol: 0.2 });
  }
  return ev;
}

export function drawCut(ctx, env, t, W, H) {
  const c = env.cuts && env.cuts.find((x) => Math.abs(t - x.at) < 0.4);
  if (!c) return;
  const L = env.look || {}, A = L.accent || '#33D98E', B = L.hot || '#FFFFFF', D = '#05070C';
  const d = t - c.at, p = clamp((d + 0.4) / 0.8, 0, 1), cover = 1 - Math.abs(p - 0.5) * 2, e = inOut(cover);
  const R = Math.hypot(W, H) / 2 + 20;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (c.type === 'bands') {
    [A, B, D].forEach((col, j) => {
      const q = clamp(p * 1.25 - j * 0.1, 0, 1); if (q <= 0 || q >= 1) return;
      const x = lerp(-W * 1.1, W * 2.1, inOut(q)), k = W * 0.28;
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(x - W * 0.55 + k, -10); ctx.lineTo(x + W * 0.55 + k, -10); ctx.lineTo(x + W * 0.55 - k, H + 10); ctx.lineTo(x - W * 0.55 - k, H + 10); ctx.closePath(); ctx.fill();
    });
  } else if (c.type === 'iris') {
    ctx.fillStyle = D; ctx.beginPath();
    if (p < 0.5) ctx.arc(W / 2, H / 2, e * R, 0, Math.PI * 2);
    else { ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(0.1, (1 - e) * R), 0, Math.PI * 2, true); }
    ctx.fill();
    ctx.strokeStyle = A; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(1, (p < 0.5 ? e : 1 - e) * R), 0, Math.PI * 2); ctx.stroke();
  } else if (c.type === 'blinds') {
    const n = 9, h = H / n;
    for (let i = 0; i < n; i++) { const q = inOut(clamp(cover * 1.5 - (i / n) * 0.5, 0, 1)); ctx.fillStyle = i % 3 === 1 ? A : D; ctx.fillRect(i % 2 ? W * (1 - q) : 0, i * h, W * q, h + 1); }
  } else if (c.type === 'shutter') {
    const hh = (H / 2 + 4) * e;
    ctx.fillStyle = D; ctx.fillRect(0, 0, W, hh); ctx.fillRect(0, H - hh, W, hh);
    ctx.fillStyle = A; ctx.fillRect(0, hh - 8, W, 8); ctx.fillRect(0, H - hh, W, 8);
  } else if (c.type === 'slice') {
    const o = W * 1.2 * (1 - e);
    ctx.fillStyle = D; ctx.beginPath(); ctx.moveTo(-o, 0); ctx.lineTo(W * 0.62 - o, 0); ctx.lineTo(W * 0.38 - o, H); ctx.lineTo(-o, H); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.62 + o, 0); ctx.lineTo(W + o, 0); ctx.lineTo(W + o, H); ctx.lineTo(W * 0.38 + o, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = A; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(W * 0.62 - o, 0); ctx.lineTo(W * 0.38 - o, H); ctx.moveTo(W * 0.62 + o, 0); ctx.lineTo(W * 0.38 + o, H); ctx.stroke();
  } else if (c.type === 'glitchcut') {
    if (Math.abs(d) < 0.2) {
      const r = seeded(Math.floor(t * 30) * 31 + 7), cols = [A, B, D, '#FFFFFF'];
      for (let i = 0; i < 16; i++) { const y = r() * H, h = 12 + r() * 110; ctx.globalAlpha = 0.45 + r() * 0.5; ctx.fillStyle = cols[Math.floor(r() * 4)]; ctx.fillRect((r() - 0.5) * 260, y, W, h); }
    }
  } else if (c.type === 'zoom') {
    const a = cover * cover, g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R);
    g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')'); g.addColorStop(1, rgba(A, 0.45 * a));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * a).toFixed(3) + ')'; ctx.lineWidth = 5; ctx.beginPath();
    for (let i = 0; i < 40; i++) { const an = (i / 40) * Math.PI * 2, r0 = R * (0.25 + (1 - a) * 0.4); ctx.moveTo(W / 2 + Math.cos(an) * r0, H / 2 + Math.sin(an) * r0); ctx.lineTo(W / 2 + Math.cos(an) * R * 1.3, H / 2 + Math.sin(an) * R * 1.3); }
    ctx.stroke();
  }
  // Logo au cœur des volets pleins.
  if (env.logo && ['iris', 'blinds', 'shutter', 'slice'].includes(c.type) && Math.abs(d) < 0.12) {
    const s = Math.min(W, H) * 0.2, k = s / Math.max(env.logo.width, env.logo.height);
    ctx.globalAlpha = 1 - Math.abs(d) / 0.12;
    ctx.drawImage(env.logo, W / 2 - (env.logo.width * k) / 2, H / 2 - (env.logo.height * k) / 2, env.logo.width * k, env.logo.height * k);
  }
  ctx.restore();
}
