// Sous-titres « premium » de la vidéo longue : mots clés surlignés et grossis
// quand ils sont prononcés, emojis 3D (Fluent, licence MIT) qui surgissent au
// mot près avec rebond, et mots « choc » affichés en très grand.
// Aucun shadowBlur (saturait la mémoire) : ombres dessinées en formes pleines.
import { clamp, easeBack, easeOut, rgba, rr, font, isHi } from './draw.mjs';

const FL = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/';
const E = (n, alt) => FL + encodeURIComponent(n) + '/3D/' + (alt || n.toLowerCase().replace(/ /g, '_') + '_3d.png');
export const EMOJI = {
  fire: E('Fire'), money: E('Money bag'), rocket: E('Rocket'), warn: E('Warning'), chart: E('Chart increasing'),
  check: E('Check mark button'), cross: E('Cross mark'), bulb: E('Light bulb'), trophy: E('Trophy'), brain: E('Brain'),
  phone: E('Mobile phone'), robot: E('Robot'), timer: E('Stopwatch'), party: E('Party popper'), gem: E('Gem stone'),
  shield: E('Shield'), ball: E('Soccer ball'), mail: E('Envelope'), eyes: E('Eyes'), stop: E('Stop sign'), key: E('Key'),
  lock: E('Locked'), sparkles: E('Sparkles'), down: E('Chart decreasing'), thinking: E('Thinking face'), star: E('Star-struck'),
  hundred: E('Hundred points'), dice: E('Game die'),
  point: FL + 'Backhand%20index%20pointing%20down/Default/3D/backhand_index_pointing_down_3d_default.png',
};

// Mot prononcé -> emoji (choisi automatiquement si la scène n'en impose pas).
const AUTO = [
  [/^(gain|gains|gagne|gagner|argent|francs?|capital|encaisse|encaisser|mise|mises)$/, 'money'],
  [/^(risque|risques|attention|piege|danger)$/, 'warn'], [/^(perdre|perdu|perte|tombe|tombent|sautent|fondent)$/, 'down'],
  [/^(ia|intelligence)$/, 'robot'], [/^(code|codes)$/, 'key'], [/^(gratuit|gratuitement|offertes?)$/, 'party'],
  [/^(grimper|monter|montes|paliers?|montante)$/, 'chart'], [/^(vite|rapide|minute|minutes|heure)$/, 'timer'],
  [/^(controle|securiser|regles?|responsable)$/, 'shield'], [/^(impossible|jamais)$/, 'stop'], [/^(email|mail|spams?)$/, 'mail'],
  [/^(compte|inscription|connectes?)$/, 'phone'], [/^(fiable|recommande|conseille|valides?)$/, 'check'], [/^(virtuel|virtuels|simules)$/, 'dice'],
  [/^(reel|reels|football|matchs?)$/, 'ball'], [/^(methode|comprends|difference)$/, 'bulb'], [/^(objectif|final)$/, 'trophy'],
];
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

// Instants (en secondes absolues) des emojis de la scène, au mot près.
export function popsOf(s) {
  if (s._pops) return s._pops;
  const out = [], words = s.words || [];
  const at = (k) => s.voiceAt + words[k].start * s.voiceDur;
  const find = (w, from = 0) => words.findIndex((x, k) => k >= from && norm(x.text) === norm(w));
  if (Array.isArray(s.pops)) {
    for (const p of s.pops) { const k = find(p.w); if (k >= 0 && EMOJI[p.e]) out.push({ at: at(k), e: p.e, k }); }
  } else if (s.kind !== 'outro' && !s.nopops) {
    let last = -9;
    words.forEach((w, k) => {
      if (out.length >= 2 || !isHi(w.text, s.highlight)) return;
      const hit = AUTO.find(([re]) => re.test(norm(w.text)));
      if (hit && at(k) - last > 1.4) { out.push({ at: at(k), e: hit[1], k }); last = at(k); }
    });
  }
  s._pops = out;
  return out;
}

export function emojiUrls(scenes) {
  const set = new Set();
  scenes.forEach((s) => popsOf(s).forEach((p) => set.add(EMOJI[p.e])));
  return [...set];
}

// Bruitages : scintillement à chaque emoji, tiroir-caisse sur l'argent, basse sur le mot choc.
export function subsSfx(s) {
  const ev = popsOf(s).map((p) => ({ name: p.e === 'money' ? 'cash' : 'sparkle', at: p.at - 0.03, vol: p.e === 'money' ? 0.42 : 0.3 }));
  const pk = punchOf(s);
  if (pk) ev.push({ name: 'drop', at: pk.at - 0.05, vol: 0.55 });
  return ev;
}

function punchOf(s) {
  if (!s.punch || !s.words) return null;
  const k = s.words.findIndex((w) => norm(w.text) === norm(String(s.punch).split(' ')[0]));
  return { at: s.voiceAt + (k >= 0 ? s.words[k].start : 0.05) * s.voiceDur, text: String(s.punch).toUpperCase() };
}

function drawEmoji(ctx, img, x, y, size, d, seed) {
  const inP = clamp(d / 0.38, 0, 1), outP = clamp((d - 1.5) / 0.3, 0, 1);
  const sc = easeBack(inP) * (1 - 0.6 * outP);
  if (sc <= 0.01) return;
  const bob = Math.sin(d * 5 + seed) * 6, rot = Math.sin(d * 7 + seed) * 0.12 * (1 - inP * 0.5) + (1 - inP) * -0.5;
  ctx.save(); ctx.globalAlpha = 1 - outP;
  // Ombre portée au sol (ellipse pleine, pas de flou).
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y + size * 0.52, size * 0.34 * sc, size * 0.08 * sc, 0, 0, Math.PI * 2); ctx.fill();
  // Éclats autour de l'apparition.
  if (d < 0.5) {
    const r0 = size * (0.45 + d * 1.4); ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - d / 0.5)).toFixed(2) + ')'; ctx.lineWidth = 4;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + seed; ctx.moveTo(x + Math.cos(a) * r0, y + bob + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * (r0 + 18), y + bob + Math.sin(a) * (r0 + 18)); } ctx.stroke();
  }
  ctx.translate(x, y + bob); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// Remplace la ligne de sous-titres classique (y = ligne de base).
export function drawSubsPro(ctx, env, s, t, cx, maxW, acc, ink, fam, y = 1000) {
  if (!s.words || !s.words.length) return;
  const p = (t - s.voiceAt) / s.voiceDur;
  if (p < 0 || p > 1.03) return;
  let cur = s.words.findIndex((w) => p < w.end); if (cur < 0) cur = s.words.length - 1;
  // Groupes courts (5 mots max) : lecture plus rapide, plus « réseaux sociaux ».
  if (!s._g2) { const g = []; let c = null; s.words.forEach((w, k) => { if (!c || k - c.from >= 5 || c.len + w.text.length > 32) { c = { from: k, to: k, len: w.text.length }; g.push(c); } else { c.to = k; c.len += w.text.length + 1; } }); s._g2 = g; }
  const g = s._g2.find((x) => cur >= x.from && cur <= x.to); if (!g) return;
  const words = s.words.slice(g.from, g.to + 1).map((w) => w.text);
  const gIn = easeOut(clamp((t - (s.voiceAt + s.words[g.from].start * s.voiceDur)) / 0.18, 0, 1));
  let size = 50; font(ctx, size, fam);
  const meas = () => { const sp = ctx.measureText(' ').width; const ws = words.map((w) => ctx.measureText(w).width); return { sp, ws, total: ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1) }; };
  let m = meas(); while (m.total > maxW - 80 && size > 30) { size -= 2; font(ctx, size, fam); m = meas(); }
  ctx.save(); ctx.globalAlpha = 1; ctx.translate(0, (1 - gIn) * 24);
  ctx.fillStyle = 'rgba(5,8,18,0.82)'; rr(ctx, cx - m.total / 2 - 38, y - size - 12, m.total + 76, size + 40, 22); ctx.fill();
  ctx.fillStyle = acc; rr(ctx, cx - m.total / 2 - 38, y - size - 12, 10, size + 40, 5); ctx.fill();
  let x = cx - m.total / 2; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  words.forEach((w, i) => {
    const k = g.from + i, hi = isHi(w, s.highlight) || /\d/.test(w), said = k <= cur;
    const wt = s.voiceAt + s.words[k].start * s.voiceDur, pop = k === cur ? easeBack(clamp((t - wt) / 0.22, 0, 1)) : 1;
    const zoom = hi && k === cur ? 1 + 0.28 * Math.sin(Math.PI * clamp((t - wt) / 0.45, 0, 1)) : 1;
    ctx.save(); ctx.translate(x + m.ws[i] / 2, y - size * 0.35); ctx.scale(zoom * (0.85 + 0.15 * pop), zoom * (0.85 + 0.15 * pop));
    if (hi && said) {
      // Surligneur qui se déroule sous le mot clé.
      const q = easeOut(clamp((t - wt) / 0.25, 0, 1));
      ctx.fillStyle = acc; ctx.save(); ctx.rotate(-0.025); rr(ctx, -m.ws[i] / 2 - 10, -size * 0.62, (m.ws[i] + 20) * q, size * 1.02, 10); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#0A0F1E';
    } else ctx.fillStyle = k === cur ? acc : said ? ink : rgba(ink, 0.5);
    ctx.fillText(w, -m.ws[i] / 2, size * 0.35);
    ctx.restore();
    x += m.ws[i] + m.sp;
  });
  ctx.restore();
  // Emojis 3D au-dessus de la ligne.
  for (const pp of popsOf(s)) {
    const d = t - pp.at, img = env.imgs && env.imgs[EMOJI[pp.e]];
    if (!img || d < 0 || d > 1.8) continue;
    const side = pp.k % 2 ? 1 : -1;
    drawEmoji(ctx, img, cx + side * (m.total / 2 + 30), y - size - 60, 128, d, pp.k);
  }
  // Mot choc : très grand, au centre, une fraction de seconde.
  const pk = punchOf(s);
  if (pk) {
    const d = t - pk.at;
    if (d >= 0 && d < 1.1) {
      const a = d < 0.9 ? 1 : 1 - (d - 0.9) / 0.2, k = easeBack(clamp(d / 0.3, 0, 1));
      ctx.save(); ctx.globalAlpha = 0.55 * a; ctx.fillStyle = '#05070C'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalAlpha = a; ctx.translate(ctx.canvas.width / 2, ctx.canvas.height * 0.46); ctx.scale(k * (1 + d * 0.08), k * (1 + d * 0.08)); ctx.rotate(-0.04);
      let fs = 210; font(ctx, fs, env.F.kin || env.F.display); while (ctx.measureText(pk.text).width > ctx.canvas.width * 0.86 && fs > 80) { fs -= 10; font(ctx, fs, env.F.kin || env.F.display); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 14; ctx.lineJoin = 'round'; ctx.strokeStyle = '#05070C'; ctx.strokeText(pk.text, 6, 8);
      ctx.fillStyle = acc; ctx.fillText(pk.text, 6, 8); ctx.fillStyle = '#FFFFFF'; ctx.fillText(pk.text, 0, 0);
      ctx.restore();
    }
  }
}
