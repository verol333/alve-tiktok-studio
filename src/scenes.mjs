import { W, H, clamp, prog, easeOut, easeBack, rgba, rr, font, fitLines, fitSingle, drawWords, isHi, tc, shakeAt, seeded } from './draw.mjs';
import { SITE_DRAW } from './site.mjs';
import { sceneFx, wipeBars, lightLeak, finish } from './fx.mjs';

const caps = (s) => String(s || '').toUpperCase().replace(/ALVECAPITAL\.FR/g, 'alvecapital.fr');
const hhmm = (iso) => { try { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }).format(new Date(iso)); } catch (e) { return ''; } };

function emojiAt(ctx, env, ch, cx, cy, size, lt) {
  const img = env.emoji[ch];
  if (!img) return;
  const s = size * easeBack(prog(lt, 0.05, 0.45));
  if (s <= 1) return;
  const bob = Math.sin(lt * 3.2) * 12;
  ctx.drawImage(img, cx - s / 2, cy - s / 2 + bob, s, s);
}

function logo(ctx, env, img, name, cx, cy, r) {
  ctx.save();
  ctx.shadowColor = rgba(env.pal.a, 0.7); ctx.shadowBlur = 50;
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 8; ctx.strokeStyle = env.pal.a; ctx.stroke();
  if (img) {
    const s = r * 1.35, k = Math.min(s / img.width, s / img.height);
    ctx.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
  } else {
    const ini = String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    font(ctx, Math.round(r * 0.7), env.F.display); ctx.fillStyle = '#0B1020'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ini, cx, cy);
  }
  ctx.restore();
}

function miniLogo(ctx, img, cx, cy, r) {
  ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  if (img) { const s = r * 1.4, k = Math.min(s / img.width, s / img.height); ctx.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k); }
  ctx.restore();
}

function pill(ctx, env, s, cy, size, alpha) {
  if (!s || alpha <= 0) return;
  const z = fitSingle(ctx, s, env.F.xb, size, 18, 900);
  const w = ctx.measureText(s).width + z * 1.6, hh = z * 1.9;
  ctx.save(); ctx.globalAlpha = alpha;
  rr(ctx, 540 - w / 2, cy - hh / 2, w, hh, hh / 2); ctx.fillStyle = 'rgba(8,12,24,0.72)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = env.pal.a; ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 540, cy + 2);
  ctx.restore();
}

function bigText(ctx, env, sc, lt, o) {
  const F = env.F, pal = env.pal;
  const fit = fitLines(ctx, caps(sc.text), F.display, o.size, o.min, 940, o.maxLines);
  const lh = fit.size * 1.08, y0 = o.cy - ((fit.lines.length - 1) * lh) / 2 + fit.size * 0.35;
  fit.lines.forEach((line, i) => {
    let dx = 0, s = 1, alpha = 1;
    if (o.mode === 'stack') { const p = easeOut(prog(lt, 0.06 * i, 0.3)); dx = (i % 2 ? 1 : -1) * (1 - p) * 700; alpha = p; }
    if (o.mode === 'slam') s = 1.7 - 0.7 * easeOut(prog(lt, 0, 0.28));
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(540 + dx, y0 + i * lh); ctx.scale(s, s);
    font(ctx, fit.size, F.display);
    if (o.mode === 'glitch' && (lt < 0.45 || lt % 1.3 < 0.08)) {
      const off = lt < 0.45 ? (1 - lt / 0.45) * 14 + 4 : 8;
      ctx.globalAlpha = 0.7 * alpha;
      drawWords(ctx, line, -off, 0, () => '#FF2E63', 0);
      drawWords(ctx, line, off, 0, () => '#08F7FE', 0);
      ctx.globalAlpha = alpha;
    }
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
    drawWords(ctx, line, 0, 0, (w) => (isHi(w, sc.highlight) ? pal.hi : '#FFFFFF'), Math.round(fit.size * 0.1));
    ctx.restore();
  });
  return y0 - fit.size;
}

function hook(ctx, env, sc, lt) {
  const top = bigText(ctx, env, sc, lt, { size: 124, min: 76, maxLines: 4, cy: 860, mode: env.style.hook_style || 'slam' });
  emojiAt(ctx, env, sc.emoji, 540, Math.min(560, top - 130), 230, lt);
}

function retention(ctx, env, sc, lt) {
  ctx.save(); ctx.strokeStyle = rgba(env.pal.a, 0.5); ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(540, 820, 330 + Math.sin(lt * 4) * 14, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  bigText(ctx, env, sc, lt, { size: 104, min: 66, maxLines: 4, cy: 860, mode: 'stack' });
  emojiAt(ctx, env, sc.emoji, 540, 470, 180, lt);
}

function teamName(ctx, env, name, cx, y) {
  const fit = fitLines(ctx, String(name || ''), env.F.xb, 40, 26, 380, 2);
  font(ctx, fit.size, env.F.xb);
  fit.lines.forEach((ln, i) => drawWords(ctx, ln, cx, y + i * fit.size * 1.15, () => '#FFFFFF', 8));
}

function match(ctx, env, sc, lt) {
  const i = clamp(sc.match_index, 0, env.picks.length - 1), p = env.picks[i], L = env.logos[i] || {};
  pill(ctx, env, String(p.league || '').toUpperCase(), 380, 30, easeOut(prog(lt, 0, 0.3)));
  const e = easeBack(prog(lt, 0.05, 0.5));
  logo(ctx, env, L.home, p.team_home, -200 + 480 * e, 660, 150);
  logo(ctx, env, L.away, p.team_away, 1280 - 480 * e, 660, 150);
  const v = prog(lt, 0.45, 0.22);
  if (v > 0) {
    ctx.save(); ctx.translate(540, 690); const s = 2.4 - 1.4 * easeOut(v); ctx.scale(s, s); ctx.globalAlpha = v;
    ctx.strokeStyle = rgba(env.pal.hi, 0.9); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, 100); ctx.lineTo(40, -100); ctx.stroke();
    tc(ctx, 'VS', 0, 42, 120, env.F.display, env.pal.hi, rgba(env.pal.hi, 0.8));
    ctx.restore();
  }
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0.4, 0.35));
  teamName(ctx, env, p.team_home, 280, 880); teamName(ctx, env, p.team_away, 800, 880);
  ctx.restore();
  const k = hhmm(p.kickoff_iso);
  if (k) pill(ctx, env, (env.when === 'demain' ? 'DEMAIN · ' : "COUP D'ENVOI ") + k, 1020, 30, easeOut(prog(lt, 0.7, 0.3)));
  const s = prog(lt, 1.0, 0.35);
  if (p.probable_score && s > 0) {
    ctx.save(); ctx.globalAlpha = s;
    tc(ctx, 'SCORE À FORT POTENTIEL', 540, 1105, 28, env.F.sb, 'rgba(255,255,255,0.85)');
    ctx.translate(540, 1215); const z = easeBack(s); ctx.scale(z, z);
    tc(ctx, String(p.probable_score).replace('-', ' - '), 0, 0, 120, env.F.display, env.pal.hi, rgba(env.pal.hi, 0.6));
    ctx.restore();
  }
}

function pick(ctx, env, sc, lt) {
  const pal = env.pal, F = env.F;
  const i = clamp(sc.match_index, 0, env.picks.length - 1), p = env.picks[i], L = env.logos[i] || {};
  const e = easeBack(prog(lt, 0, 0.45)), z = 0.85 + 0.15 * e;
  ctx.save();
  ctx.globalAlpha = clamp(e, 0, 1);
  ctx.translate(540, 745); ctx.scale(z, z); ctx.translate(-540, -745);
  rr(ctx, 80, 330, 920, 830, 48); ctx.fillStyle = 'rgba(8,12,26,0.78)'; ctx.shadowColor = rgba(pal.a, 0.55); ctx.shadowBlur = 60; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 4; ctx.strokeStyle = rgba(pal.a, 0.9); ctx.stroke();
  tc(ctx, 'NOTRE LECTURE', 540, 415, 32, F.xb, pal.a);
  miniLogo(ctx, L.home, 180, 492, 44); miniLogo(ctx, L.away, 900, 492, 44);
  const teams = p.team_home + ' - ' + p.team_away;
  tc(ctx, teams, 540, 503, fitSingle(ctx, teams, F.sb, 30, 18, 580), F.sb, 'rgba(255,255,255,0.8)');
  const lab = fitLines(ctx, String(p.label || '').toUpperCase(), F.black, 70, 38, 820, 3);
  const lh = lab.size * 1.12, ly = 660 - ((lab.lines.length - 1) * lh) / 2;
  font(ctx, lab.size, F.black);
  lab.lines.forEach((ln, k) => drawWords(ctx, ln, 540, ly + k * lh, () => '#FFFFFF', 0));
  const c = easeOut(prog(lt, 0.5, 0.7)), val = 1 + (Number(p.cote) - 1) * c;
  tc(ctx, 'COTE', 310, 850, 32, F.sb, 'rgba(255,255,255,0.7)');
  ctx.save(); const pop = 1 + 0.12 * Math.sin(Math.PI * prog(lt, 1.2, 0.2)); ctx.translate(310, 1000); ctx.scale(pop, pop);
  tc(ctx, val.toFixed(2), 0, 0, 150, F.display, pal.hi, rgba(pal.hi, 0.55)); ctx.restore();
  const r = 118, cx = 760, cy = 935, cp = easeOut(prog(lt, 0.6, 0.9)), conf = clamp(Number(p.confidence) || 0, 0, 100);
  ctx.lineCap = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (cp > 0) { ctx.strokeStyle = pal.a; ctx.shadowColor = pal.a; ctx.shadowBlur = 25; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * conf * cp) / 100); ctx.stroke(); ctx.shadowBlur = 0; }
  tc(ctx, Math.round(conf * cp) + '%', cx, cy + 26, 74, F.display, '#FFFFFF');
  tc(ctx, 'FIABILITÉ', cx, cy + r + 62, 26, F.xb, 'rgba(255,255,255,0.75)');
  const sh = prog(lt, 1.3, 0.6);
  if (sh > 0 && sh < 1) {
    ctx.save(); rr(ctx, 80, 330, 920, 830, 48); ctx.clip();
    const x = 80 + sh * 1300 - 200, g = ctx.createLinearGradient(x - 120, 0, x + 120, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(80, 330, 920, 830); ctx.restore();
  }
  ctx.restore();
  emojiAt(ctx, env, sc.emoji, 935, 345, 140, lt);
}

function confetti(ctx, env, dt, cx, cy) {
  if (dt < 0 || dt > 2.6) return;
  const r = seeded(99), cols = [env.pal.a, env.pal.b, env.pal.hi, '#FFFFFF'];
  for (let i = 0; i < 70; i++) {
    const ang = r() * Math.PI * 2, sp = 500 + r() * 900, vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp - 500;
    const rot = r() * 6 + dt * (r() * 10 - 5);
    ctx.save(); ctx.globalAlpha = clamp(1 - dt / 2.6, 0, 1);
    ctx.translate(cx + vx * dt, cy + vy * dt + 1100 * dt * dt); ctx.rotate(rot);
    ctx.fillStyle = cols[i % 4]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
  }
}

export const comboRevealAt = (env) => 0.5 + 0.15 * env.picks.length;

function combo(ctx, env, sc, lt) {
  const pal = env.pal, F = env.F, n = env.picks.length;
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0, 0.3));
  tc(ctx, env.when === 'demain' ? 'LE COMBINÉ DE DEMAIN' : 'LE COMBINÉ DU JOUR', 540, 400, 58, F.black, '#FFFFFF', rgba(pal.a, 0.7)); ctx.restore();
  env.picks.forEach((p, i) => {
    const e = easeOut(prog(lt, 0.15 + 0.15 * i, 0.4)), y = 450 + i * 165, x = 80 + (1 - e) * 1000, L = env.logos[i] || {};
    ctx.save(); ctx.globalAlpha = e;
    rr(ctx, x, y, 920, 145, 32); ctx.fillStyle = 'rgba(8,12,26,0.8)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = rgba(pal.a, 0.7); ctx.stroke();
    miniLogo(ctx, L.home, x + 70, y + 72, 38); miniLogo(ctx, L.away, x + 150, y + 72, 38);
    const teams = p.team_home + ' - ' + p.team_away;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    fitSingle(ctx, teams, F.sb, 24, 16, 500); ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillText(teams, x + 215, y + 58);
    fitSingle(ctx, String(p.label || ''), F.xb, 36, 18, 500); ctx.fillStyle = '#FFFFFF'; ctx.fillText(String(p.label || ''), x + 215, y + 106);
    ctx.textAlign = 'right'; font(ctx, 62, F.display); ctx.fillStyle = pal.hi; ctx.fillText(Number(p.cote).toFixed(2), x + 890, y + 96);
    ctx.restore();
  });
  const at = comboRevealAt(env), yT = 450 + n * 165 + 40, t1 = prog(lt, at, 0.3);
  if (t1 > 0) {
    ctx.save(); ctx.globalAlpha = t1;
    tc(ctx, 'COTE TOTALE', 540, yT + 30, 36, F.xb, 'rgba(255,255,255,0.85)');
    const val = 1 + (env.totalOdds - 1) * easeOut(prog(lt, at, 0.9)), k = 1 + 0.15 * Math.sin(Math.PI * prog(lt, at + 0.9, 0.25));
    ctx.translate(540, yT + 200); ctx.scale(k, k);
    tc(ctx, val.toFixed(2), 0, 0, 190, F.display, pal.hi, rgba(pal.hi, 0.7));
    ctx.restore();
  }
}

function teaser(ctx, env, sc, lt) {
  const pal = env.pal, F = env.F, e = easeBack(prog(lt, 0, 0.5));
  ctx.save(); ctx.globalAlpha = clamp(e, 0, 1);
  ctx.translate(540, 720); ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); ctx.rotate((1 - e) * -0.2 + Math.sin(lt * 1.5) * 0.02); ctx.translate(-540, -720);
  rr(ctx, 350, 360, 380, 720, 60); ctx.fillStyle = '#0A0F1E'; ctx.shadowColor = rgba(pal.a, 0.6); ctx.shadowBlur = 60; ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 8; ctx.strokeStyle = pal.b; ctx.stroke();
  for (let i = 0; i < 6; i++) { rr(ctx, 390, 430 + i * 105, 300, 80, 18); ctx.fillStyle = rgba(pal.a, 0.12 + 0.06 * Math.sin(lt * 3 + i)); ctx.fill(); }
  const k = 1 + 0.06 * Math.sin(lt * 5);
  ctx.translate(540, 700); ctx.scale(k, k);
  ctx.lineWidth = 22; ctx.strokeStyle = pal.hi; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -40, 62, Math.PI, 0); ctx.moveTo(-62, -40); ctx.lineTo(-62, 5); ctx.moveTo(62, -40); ctx.lineTo(62, 5); ctx.stroke();
  rr(ctx, -100, 0, 200, 150, 28); ctx.fillStyle = pal.hi; ctx.fill();
  ctx.fillStyle = '#0A0F1E'; ctx.beginPath(); ctx.arc(0, 60, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-8, 60, 16, 45);
  ctx.restore();
  const r = seeded(7);
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? 880 + r() * 80 : 120 + r() * 80, y0 = 520 + r() * 560;
    ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * Math.sin(lt * 2 + i);
    tc(ctx, '?', side, y0 - ((lt * 60 + r() * 200) % 200), Math.round(90 + r() * 40), F.display, pal.b); ctx.restore();
  }
  const url = 'alvecapital.fr', n = Math.floor(url.length * prog(lt, 0.4, 0.8));
  tc(ctx, url.slice(0, n) + (lt % 0.8 < 0.4 ? '|' : ' '), 540, 1180, 64, F.black, '#FFFFFF', rgba(pal.a, 0.9));
  emojiAt(ctx, env, sc.emoji, 880, 420, 140, lt);
}

function outro(ctx, env, sc, lt) {
  const pal = env.pal, F = env.F;
  const e = easeBack(prog(lt, 0, 0.45)), pulse = 1 + 0.045 * Math.sin(lt * 6);
  ctx.save(); ctx.translate(540, 520); ctx.scale(e * pulse, e * pulse);
  rr(ctx, -380, -80, 760, 160, 80); ctx.fillStyle = pal.a; ctx.shadowColor = pal.a; ctx.shadowBlur = 50; ctx.fill(); ctx.shadowBlur = 0;
  tc(ctx, '+ ABONNE-TOI', 0, 26, 72, F.black, '#FFFFFF'); ctx.restore();
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0.3, 0.4));
  tc(ctx, env.type === 'site' ? 'TA QUESTION' : 'TON SCORE EXACT', 540, 740, 54, F.black, '#FFFFFF'); tc(ctx, 'EN COMMENTAIRE', 540, 810, 54, F.black, pal.hi);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0.6, 0.4));
  tc(ctx, 'RENDEZ-VOUS SUR NOTRE SITE', 540, 940, 44, F.xb, 'rgba(255,255,255,0.85)');
  const by = 985 + Math.abs(Math.sin(lt * 4)) * 18;
  ctx.strokeStyle = pal.hi; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(510, by); ctx.lineTo(540, by + 30); ctx.lineTo(570, by); ctx.stroke();
  tc(ctx, 'alvecapital.fr', 540, 1110, 80, F.display, pal.hi, rgba(pal.hi, 0.5));
  ctx.restore();
  ctx.save(); ctx.globalAlpha = prog(lt, 0.9, 0.4);
  const d = '18+  ·  Analyse statistique, pas un conseil  ·  Joue responsable';
  tc(ctx, d, 540, 1190, fitSingle(ctx, d, F.sb, 28, 18, 960), F.sb, 'rgba(255,255,255,0.8)');
  ctx.restore();
}

// Preuve : nos pronostics validés la veille sur le site (chiffres réels).
function results(ctx, env, sc, lt) {
  const pal = env.pal, F = env.F, p = env.proof;
  if (!p || !p.wins || !p.wins.length) return retention(ctx, env, sc, lt);
  const G = '#33D98E';
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0, 0.3));
  tc(ctx, 'NOS RÉSULTATS VALIDÉS', 540, 380, 56, F.black, '#FFFFFF', rgba(pal.a, 0.7));
  ctx.restore();
  const c = easeOut(prog(lt, 0.2, 0.9)), n = Math.round(p.won * c);
  ctx.save(); const z = 1 + 0.08 * Math.sin(Math.PI * prog(lt, 1.1, 0.25)); ctx.translate(540, 560); ctx.scale(z, z);
  tc(ctx, String(n), 0, 0, 180, F.display, G, 'rgba(51,217,142,0.6)'); ctx.restore();
  tc(ctx, 'PRONOSTICS VALIDÉS HIER', 540, 650, 38, F.xb, 'rgba(255,255,255,0.85)');
  p.wins.slice(0, 3).forEach((w, i) => {
    const e = easeOut(prog(lt, 0.5 + 0.2 * i, 0.4)), y = 700 + i * 175, x = 80 + (1 - e) * 1000;
    ctx.save(); ctx.globalAlpha = e;
    rr(ctx, x, y, 920, 150, 32); ctx.fillStyle = 'rgba(8,12,26,0.82)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(51,217,142,0.8)'; ctx.stroke();
    const teams = w.team_home + ' - ' + w.team_away;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    fitSingle(ctx, teams, F.sb, 26, 16, 580); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(teams, x + 40, y + 58);
    fitSingle(ctx, String(w.label), F.xb, 34, 18, 580); ctx.fillStyle = '#FFFFFF'; ctx.fillText(String(w.label), x + 40, y + 110);
    ctx.textAlign = 'center';
    tc(ctx, String(w.final_score).replace('-', ' - '), x + 730, y + 94, 50, F.display, '#FFFFFF');
    ctx.fillStyle = G; ctx.beginPath(); ctx.arc(x + 860, y + 75, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#06101F'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 846, y + 76); ctx.lineTo(x + 857, y + 87); ctx.lineTo(x + 875, y + 64); ctx.stroke();
    ctx.restore();
  });
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 1.3, 0.4));
  tc(ctx, 'alvecapital.fr', 540, 1250, 56, F.display, pal.hi, rgba(pal.hi, 0.5)); ctx.restore();
}

const DRAW = { hook, retention, match, pick, combo, teaser, outro, results, ...SITE_DRAW };

function shakeOf(env, sc, lt) {
  if (sc.kind === 'match') return shakeAt(lt, 0.45, 16);
  if (sc.kind === 'hook' && env.style.hook_style === 'slam') return shakeAt(lt, 0.28, 18);
  if (sc.kind === 'combo') return shakeAt(lt, comboRevealAt(env) + 0.9, 14);
  return 0;
}

// Scène dessinée sur un calque, puis posée avec sa transition (zoom, glissé, whip, flash),
// un « punch » de zoom à mi-scène (relance d'attention) et les secousses d'impact.
export function drawScene(ctx, env, sc, t) {
  const lt = t - sc.start, L = env.layer.getContext('2d');
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.shadowBlur = 0; L.clearRect(0, 0, W, H);
  (DRAW[sc.kind] || retention)(L, env, sc, lt);
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.shadowBlur = 0;
  sceneFx(L, env, sc, lt);
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1;
  const list = env.style.transitions, trans = sc.index === 0 ? 'none' : list[sc.index % list.length];
  const p = easeOut(prog(lt, 0, 0.32)), out = prog(lt, sc.dur - 0.16, 0.16);
  let alpha = 1, s = 1, dx = 0, dy = 0;
  if (trans === 'zoom') { s = 1.3 - 0.3 * p; alpha = p; }
  else if (trans === 'slide') { dy = (1 - p) * 320; alpha = p; }
  else if (trans === 'whip') dx = (1 - p) * (sc.index % 2 ? 1 : -1) * 1100;
  if (sc.dur > 3) s *= 1 + 0.04 * Math.sin(Math.PI * prog(lt, sc.dur * 0.55, 0.3));
  s *= 1 + 0.03 * (lt / sc.dur); // lente poussée caméra
  s *= 1 + 0.05 * out; alpha *= 1 - out;
  const sh = shakeOf(env, sc, lt);
  const put = (ox, a) => {
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(540 + ox + sh, 960 + dy - sh * 0.7); ctx.scale(s, s); ctx.translate(-540, -960);
    ctx.drawImage(env.layer, 0, 0); ctx.restore();
  };
  if (trans === 'whip' && p < 1) { put(dx * 1.3, 0.12 * alpha); put(dx * 1.15, 0.25 * alpha); }
  const iris = sc.index > 0 && sc.index % 3 === 1 && lt < 0.5;
  if (iris) { ctx.save(); ctx.beginPath(); ctx.arc(540, 960, 40 + 1150 * easeOut(prog(lt, 0, 0.5)), 0, Math.PI * 2); ctx.clip(); }
  put(dx, alpha);
  if (iris) ctx.restore();
  if (sc.index > 0 && sc.index % 3 === 2) wipeBars(ctx, env, lt);
  if (sc.index > 0) lightLeak(ctx, env, lt, sc.index);
  finish(ctx, t);
  if (trans === 'flash' && lt < 0.25) { ctx.save(); ctx.globalAlpha = 0.85 * (1 - lt / 0.25); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
