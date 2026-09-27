// Couche « rétention TikTok » posée sur toutes les vidéos verticales v2 :
// caméra qui respire, zoom-punch sur les mots forts, transitions variées
// (punch, whip pan, glitch, flash), barre de progression, compteur de match
// et accroche « attends la fin ». Aucun émoji (rendu fiable), aucun flou.
import { createCanvas } from '@napi-rs/canvas';
import { W, H, clamp, prog, easeOut, easeBack, rgba, rr, font, isHi, seeded } from '../draw.mjs';

let post = null;
const CUTS = ['punch', 'whip', 'glitch', 'flash'];

function cutKind(env, i) { const r = seeded((env.look?.seed || 7) + i * 131); return CUTS[Math.floor(r() * CUTS.length)]; }

// Instant (global) du dernier mot fort prononcé avant t.
function lastHit(sc, t) {
  let best = -1;
  for (const w of sc.words || []) {
    if (!isHi(w.text, sc.highlight)) continue;
    const at = sc.voiceAt + w.start * sc.voiceDur;
    if (at <= t) best = at;
  }
  return best;
}

function pill(ctx, x, y, text, bg, fg, size, a, s) {
  font(ctx, size, 'sans-serif');
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  const w = ctx.measureText(text).width + size * 1.2, h = size * 1.7;
  rr(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, size * 0.05);
  ctx.restore();
}

export function retention(ctx, env, tl, sc, t) {
  if (!post) post = createCanvas(W, H);
  const p2 = post.getContext('2d');
  p2.clearRect(0, 0, W, H); p2.drawImage(ctx.canvas, 0, 0);
  const i = tl.scenes.indexOf(sc), lt = t - sc.start, kind = i > 0 ? cutKind(env, i) : 'punch';
  const accent = env.accent || '#FFD23F', F = env.F || {}, fam = F.black || F.display || 'sans-serif';

  // 1. Caméra : légère respiration continue + zoom-punch à la coupe + à chaque mot fort.
  let s = 1 + 0.025 * (lt / Math.max(1, sc.dur)), dx = 0, rot = 0;
  if (lt < 0.35 && (kind === 'punch' || i === 0)) s += 0.14 * (1 - easeOut(lt / 0.35));
  const hit = lastHit(sc, t);
  if (hit >= 0 && t - hit < 0.25) s += 0.05 * (1 - (t - hit) / 0.25);
  if (kind === 'whip' && lt < 0.28) { const q = 1 - easeOut(lt / 0.28); dx = 420 * q; rot = 0.02 * q; }
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2 + dx, H / 2); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(post, 0, 0);
  // Traînée du whip pan : copies décalées, sans flou.
  if (kind === 'whip' && lt < 0.28) {
    const q = 1 - lt / 0.28;
    for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.18 * q; ctx.drawImage(post, -k * 60 * q, 0); }
  }
  ctx.restore();

  // 2. Glitch de coupe : tranches décalées + séparation rouge/cyan.
  if (kind === 'glitch' && lt < 0.22) {
    const r = seeded(Math.floor(t * 30) + 11), q = 1 - lt / 0.22;
    for (let k = 0; k < 7; k++) {
      const y = Math.floor(r() * H), h = 30 + Math.floor(r() * 140), off = (r() - 0.5) * 180 * q;
      ctx.drawImage(post, 0, y, W, h, off, y, W, h);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * q;
    ctx.fillStyle = 'rgba(255,40,90,1)'; ctx.fillRect(0, 0, W, H * 0.5 * r());
    ctx.restore();
  }
  // 3. Flash blanc bref (et petit flash sur chaque coupe « punch »).
  const fl = kind === 'flash' ? 0.55 : kind === 'punch' && i > 0 ? 0.25 : 0;
  if (fl && lt < 0.14) { ctx.fillStyle = 'rgba(255,255,255,' + fl * (1 - lt / 0.14) + ')'; ctx.fillRect(0, 0, W, H); }

  // 4. Barre de progression en haut (les gens restent quand ils voient la fin arriver).
  const P = clamp(t / tl.total, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 0, W, 12);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, W * P, 12);
  ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 18; ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(W * P, 6, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  // 5. Accroche des 3 premières secondes.
  if (t < 3.2) {
    const a = clamp(Math.min(t / 0.3, (3.2 - t) / 0.3), 0, 1), b = 1 + 0.05 * Math.sin(t * 9);
    pill(ctx, W / 2, 170, 'ATTENDS LA FIN', accent, '#0B1020', 44, a, b * easeBack(clamp(t / 0.45, 0, 1)));
  }
  // 6. Compteur de match (MATCH 2/3) glissé en haut à gauche.
  const n = (env.picks || []).length;
  if (n > 1 && (sc.kind === 'match' || sc.kind === 'pick')) {
    const k = clamp(Math.round(Number(sc.match_index) || 0), 0, n - 1) + 1, e = easeOut(prog(lt, 0.1, 0.35));
    ctx.save(); ctx.globalAlpha = e; ctx.translate(-220 * (1 - e), 0);
    rr(ctx, 40, 60, 250, 70, 18); ctx.fillStyle = 'rgba(11,16,32,0.82)'; ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(40, 60, 10, 70);
    font(ctx, 38, fam); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFFFFF';
    ctx.fillText('MATCH ' + k + '/' + n, 70, 97);
    ctx.restore();
  }
  // 7. Fin : incitation à revoir (boucle) sur la dernière seconde et demie.
  if (tl.total - t < 1.5) {
    const a = easeOut(prog(t, tl.total - 1.5, 0.3));
    pill(ctx, W / 2, 170, 'REVOIS LES COTES', '#FFFFFF', '#0B1020', 40, a, 1);
  }
}
