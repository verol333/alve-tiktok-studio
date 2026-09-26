// Style « Face-à-face » : affiche de combat. Écran coupé aux couleurs des
// deux clubs, logos qui s'entrechoquent, étincelles, tampon « verdict ».
import { W, H, clamp, prog, easeOut, easeBack, rr, font, seeded, lerp, idx, mix, txt, fit, lines, disc, check, subscribe, kinetic, subs, brand } from './kit.mjs';
import { COLLIDE, coteT, confT, scoreT, rowT, totalT, subT, resultT } from './timing.mjs';
import { bgFrame } from './bg.mjs';

const hhmm = (iso) => { try { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }).format(new Date(iso)); } catch (e) { return ''; } };
const seamY = (x) => 1000 - x * 0.09;
const CY = 950;
function fire(ctx, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF3B0'); g.addColorStop(0.5, '#FFB020'); g.addColorStop(1, '#FF4D00');
  return g;
}
// Gros titre en lettres de feu.
function hot(ctx, env, s, x, y, size, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; font(ctx, size, env.F.display); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.09; ctx.strokeStyle = '#000000'; ctx.strokeText(s, x, y);
  ctx.shadowColor = 'rgba(255,110,0,0.85)'; ctx.shadowBlur = 40; ctx.fillStyle = fire(ctx, y - size * 0.75, y); ctx.fillText(s, x, y);
  ctx.restore();
}
const flicker = (lt, at) => { const a = prog(lt, at, 0.3); return a >= 1 ? 1 : a * (Math.floor(lt * 40) % 2 ? 0.35 : 1); };

function background(ctx, env, sc, t, fr) {
  const C = env.colors[sc.kind === 'match' || sc.kind === 'pick' ? idx(env, sc) : 0];
  const g1 = ctx.createLinearGradient(0, 0, 0, 1000);
  g1.addColorStop(0, mix(C.home, '#000000', 0.86)); g1.addColorStop(1, mix(C.home, '#000000', 0.45));
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, seamY(0)); ctx.lineTo(W, seamY(W)); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
  const g2 = ctx.createLinearGradient(0, 900, 0, H);
  g2.addColorStop(0, mix(C.away, '#000000', 0.45)); g2.addColorStop(1, mix(C.away, '#000000', 0.88));
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); ctx.restore();
  if (fr) {
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.65;
    const z = 1.1 + 0.04 * Math.sin(t * 0.3); ctx.drawImage(fr, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z); ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let k = 0; k < 4; k++) {
    const x = 540 + Math.sin(t * 0.21 + k * 1.7) * 420, y = 300 + k * 430 + Math.cos(t * 0.17 + k) * 120;
    const r = ctx.createRadialGradient(x, y, 0, x, y, 520);
    r.addColorStop(0, 'rgba(255,255,255,0.07)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of env.embers) {
    const y = H + 60 - ((t * e.v + e.y) % (H + 120)), x = e.x + Math.sin(t * 1.3 + e.ph) * 30;
    ctx.globalAlpha = e.a * (0.6 + 0.4 * Math.sin(t * 9 + e.ph)); ctx.fillStyle = e.c;
    ctx.beginPath(); ctx.arc(x, y, e.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const r = seeded(Math.floor(t * 15) + 7), pts = [];
  for (let x = 0; x <= W + 54; x += 54) pts.push([x, seamY(x) + (r() - 0.5) * 26]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  for (const [lw, a] of [[18, 0.16], [5, 0.85]]) {
    ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(255,215,150,' + (a * (0.7 + 0.3 * r())).toFixed(3) + ')';
    ctx.beginPath(); pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.restore();
  const v = ctx.createRadialGradient(540, 960, 380, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function burst(ctx, env, x, y, d, big) {
  if (d < 0 || d > 0.7) return;
  const q = d / 0.7;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - q; ctx.lineWidth = (big ? 34 : 18) * (1 - q) + 2; ctx.strokeStyle = '#FFE2A8';
  ctx.beginPath(); ctx.arc(x, y, 50 + (big ? 900 : 520) * easeOut(q), 0, Math.PI * 2); ctx.stroke();
  ctx.lineCap = 'round';
  for (const s of env.sparks) {
    const dx = Math.cos(s.ang), dy = Math.sin(s.ang), px = x + dx * s.sp * d, py = y + dy * s.sp * d + 900 * d * d;
    ctx.globalAlpha = 1 - q; ctx.strokeStyle = s.c; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - dx * s.len * (1 - q), py - dy * s.len * (1 - q)); ctx.stroke();
  }
  ctx.restore();
  if (d < 0.22) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - d / 0.22)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
}

function plateTxt(ctx, env, s, y, a) {
  if (a <= 0 || !s) return;
  const F = env.F, z = fit(ctx, s, F.xb, 26, 18, 820), w = ctx.measureText(s).width + 48;
  ctx.save(); ctx.globalAlpha = a;
  rr(ctx, 540 - w / 2, y - 30, w, 60, 30); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,176,32,0.8)'; ctx.stroke();
  txt(ctx, s, 540, y + 9, z, F.xb, '#FFFFFF'); ctx.restore();
}

function match(ctx, env, sc, t, lt) {
  const F = env.F, i = idx(env, sc), p = env.picks[i], L = env.logos[i] || {}, C = env.colors[i], R = 150, c = COLLIDE;
  let hy, ay;
  if (lt < c) { const q = Math.pow(lt / c, 2.2); hy = lerp(-260, CY - R, q); ay = lerp(H + 260, CY + R, q); }
  else { const q = easeBack(prog(lt, c, 0.55)); hy = lerp(CY - R, 650, q); ay = lerp(CY + R, 1250, q); }
  if (lt < c) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = -3; k <= 3; k++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(540 + k * 38, hy - R - 40); ctx.lineTo(540 + k * 38, hy - R - 300); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(540 + k * 38, ay + R + 40); ctx.lineTo(540 + k * 38, ay + R + 300); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save(); ctx.shadowColor = C.home; ctx.shadowBlur = 60; disc(ctx, env, L.home, p.team_home, 540, hy, R, C.home); ctx.restore();
  ctx.save(); ctx.shadowColor = C.away; ctx.shadowBlur = 60; disc(ctx, env, L.away, p.team_away, 540, ay, R, C.away); ctx.restore();
  const k = hhmm(p.kickoff_iso);
  plateTxt(ctx, env, String(p.league || '').toUpperCase() + (k ? '  ·  ' + (env.when === 'demain' ? 'DEMAIN ' : '') + k : ''), 290, easeOut(prog(lt, 0.9, 0.3)));
  const n = easeOut(prog(lt, c + 0.2, 0.35));
  if (n > 0) {
    const hn = String(p.team_home || '').toUpperCase(), an = String(p.team_away || '').toUpperCase();
    ctx.save(); ctx.globalAlpha = n;
    txt(ctx, hn, 540 - (1 - n) * 600, 460, fit(ctx, hn, F.display, 100, 50, 980), F.display, '#FFFFFF', 'center', 10);
    txt(ctx, an, 540 + (1 - n) * 600, 1480, fit(ctx, an, F.display, 100, 50, 980), F.display, '#FFFFFF', 'center', 10);
    ctx.restore();
  }
  const sAt = scoreT(sc), hasScore = !!p.probable_score && /\d+\s*[-:]\s*\d+/.test(p.probable_score);
  const vp = prog(lt, c + 0.12, 0.22), out = hasScore ? prog(lt, sAt - 0.15, 0.15) : 0;
  if (vp > 0 && out < 1) {
    const s = 2.4 - 1.4 * easeOut(vp);
    ctx.save(); ctx.translate(540, CY); ctx.scale(s * (1 - out), s * (1 - out)); ctx.globalAlpha = clamp(vp * 2, 0, 1) * (1 - out);
    font(ctx, 190, F.display); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = '#000000'; ctx.strokeText('VS', 0, 70);
    const g = ctx.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, '#AEB6C8'); g.addColorStop(1, '#FFFFFF');
    ctx.shadowColor = 'rgba(255,40,40,0.9)'; ctx.shadowBlur = 45; ctx.fillStyle = g; ctx.fillText('VS', 0, 70);
    ctx.restore();
  }
  if (hasScore) {
    const sp = prog(lt, sAt, 0.22);
    if (sp > 0) {
      txt(ctx, 'SCORE PROBABLE', 540, 850, 30, F.black, '#FFFFFF', 'center', 6);
      ctx.save(); ctx.translate(540, CY); const z = 2.6 - 1.6 * easeOut(sp); ctx.scale(z, z); ctx.globalAlpha = clamp(sp * 2, 0, 1);
      hot(ctx, env, String(p.probable_score).replace(/\s*[-:]\s*/, ' - '), 0, 62, 170, 1);
      ctx.restore();
      burst(ctx, env, 540, CY, lt - sAt - 0.1, false);
    }
  }
  burst(ctx, env, 540, CY, lt - c, true);
}

function pick(ctx, env, sc, t, lt) {
  const F = env.F, i = idx(env, sc), p = env.picks[i], L = env.logos[i] || {}, C = env.colors[i];
  const cAt = coteT(sc, p), fAt = confT(sc, p);
  hot(ctx, env, 'LE VERDICT', 540, 440, 120, flicker(lt, 0));
  const lp = easeBack(prog(lt, 0.15, 0.4));
  if (lp > 0) {
    ctx.save(); ctx.globalAlpha = clamp(lp, 0, 1);
    disc(ctx, env, L.home, p.team_home, 400 - 200 * (1 - lp), 560, 52, C.home);
    disc(ctx, env, L.away, p.team_away, 680 + 200 * (1 - lp), 560, 52, C.away);
    txt(ctx, 'VS', 540, 578, 48, F.display, '#FFFFFF', 'center', 6);
    ctx.restore();
  }
  const bp = easeOut(prog(lt, 0.3, 0.35));
  if (bp > 0) {
    ctx.save(); ctx.globalAlpha = bp; ctx.translate(0, 40 * (1 - bp));
    rr(ctx, 60, 640, 960, 250, 24); ctx.fillStyle = 'rgba(0,0,0,0.66)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,176,32,0.6)'; ctx.stroke();
    const lab = lines(ctx, String(p.label || '').toUpperCase(), F.display, 104, 56, 900, 2);
    const lh = lab.size * 1.02, ly = 765 - ((lab.lines.length - 1) * lh) / 2 + lab.size * 0.33;
    lab.lines.forEach((ln, k) => txt(ctx, ln, 540, ly + k * lh, lab.size, F.display, '#FFFFFF', 'center', 8));
    ctx.restore();
  }
  const sp = prog(lt, cAt - 0.08, 0.2);
  if (sp > 0) {
    ctx.save(); ctx.translate(540, 1030); ctx.rotate(-0.1); const z = 2.6 - 1.6 * easeOut(sp); ctx.scale(z, z); ctx.globalAlpha = clamp(sp * 2, 0, 1);
    rr(ctx, -330, -95, 660, 190, 22); ctx.fillStyle = 'rgba(255,59,48,0.14)'; ctx.fill();
    ctx.lineWidth = 12; ctx.strokeStyle = '#FF3B30'; ctx.stroke();
    rr(ctx, -312, -77, 624, 154, 14); ctx.lineWidth = 3; ctx.stroke();
    txt(ctx, 'COTE ' + Number(p.cote).toFixed(2), 0, 48, 130, F.display, '#FF3B30');
    ctx.restore();
    const d = lt - cAt - 0.12;
    if (d > 0 && d < 0.5) {
      const q = d / 0.5, r = seeded(5);
      ctx.save(); ctx.fillStyle = 'rgba(255,200,180,' + (0.8 * (1 - q)).toFixed(3) + ')';
      for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, v = 250 + r() * 500, s = 4 + r() * 8; ctx.fillRect(540 + Math.cos(a) * (330 + v * d), 1030 + Math.sin(a) * (120 + v * d * 0.6), s, s); }
      ctx.restore();
    }
  }
  if (lt > 0.5) {
    const mp = easeOut(prog(lt, fAt - 0.2, 0.8)), conf = clamp(Number(p.confidence) || 0, 0, 100), on = Math.round((conf / 5) * mp);
    txt(ctx, 'FIABILITÉ', 110, 1235, 34, F.black, '#FFFFFF', 'left', 6);
    txt(ctx, Math.round(conf * mp) + '%', 970, 1242, 66, F.display, '#FFFFFF', 'right', 8);
    for (let k = 0; k < 20; k++) {
      rr(ctx, 110 + k * 43, 1265, 36, 70, 6);
      ctx.fillStyle = k < on ? mix('#22C55E', '#FFB020', k / 20) : 'rgba(255,255,255,0.12)'; ctx.fill();
    }
  }
}

function combo(ctx, env, sc, t, lt) {
  const F = env.F, n = env.picks.length;
  hot(ctx, env, 'LE COMBINÉ', 540, 420, 120, flicker(lt, 0));
  env.picks.forEach((p, k) => {
    const q = prog(lt, rowT(k), 0.18);
    if (q <= 0) return;
    const y = 490 + k * 175, side = k % 2 ? 1 : -1, e = easeOut(q), L = env.logos[k] || {}, C = env.colors[k];
    ctx.save(); ctx.translate(side * (1 - e) * 1100, 0);
    rr(ctx, 50, y, 980, 150, 20); ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fill();
    ctx.fillStyle = C.home; ctx.fillRect(50, y + 12, 10, 126); ctx.fillStyle = C.away; ctx.fillRect(1020, y + 12, 10, 126);
    disc(ctx, env, L.home, p.team_home, 125, y + 75, 42, C.home); disc(ctx, env, L.away, p.team_away, 205, y + 75, 42, C.away);
    const lab = String(p.label || ''), tm = p.team_home + ' - ' + p.team_away;
    txt(ctx, lab, 270, y + 68, fit(ctx, lab, F.xb, 36, 20, 540), F.xb, '#FFFFFF', 'left');
    txt(ctx, tm, 270, y + 110, fit(ctx, tm, F.sb, 24, 16, 540), F.sb, 'rgba(255,255,255,0.6)', 'left');
    txt(ctx, Number(p.cote).toFixed(2), 1000, y + 100, 76, F.display, '#FFB020', 'right');
    ctx.restore();
  });
  const tAt = totalT(sc, env), tp = prog(lt, tAt, 0.22), by = 490 + (n - 1) * 175 + 200;
  if (tp > 0) {
    ctx.save(); ctx.globalAlpha = clamp(tp * 2, 0, 1); txt(ctx, 'COTE TOTALE', 540, by + 20, 40, F.black, '#FFFFFF', 'center', 6); ctx.restore();
    ctx.save(); ctx.translate(540, by + 230); const z = 3 - 2 * easeOut(tp); ctx.scale(z, z);
    hot(ctx, env, env.totalOdds.toFixed(2), 0, 0, 230, clamp(tp * 2, 0, 1)); ctx.restore();
    burst(ctx, env, 540, by + 150, lt - tAt - 0.05, true);
  }
}

function results(ctx, env, sc, t, lt) {
  const F = env.F, pr = env.proof || {}, wins = (pr.wins || []).slice(0, 3), n = wins.length;
  hot(ctx, env, pr.ours ? n + ' SUR ' + n + " HIER" : 'DÉJÀ VALIDÉS', 540, 430, 120, flicker(lt, 0));
  wins.forEach((w, k) => {
    const at = resultT(sc, k, n, w.team_home), q = prog(lt, at, 0.2);
    if (q <= 0) return;
    const y = 500 + k * 240, e = easeOut(q), L = env.proofLogos[k] || {};
    ctx.save(); ctx.translate((k % 2 ? 1 : -1) * (1 - e) * 1100, 0);
    rr(ctx, 50, y, 980, 200, 20); ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fill();
    disc(ctx, env, L.home, w.team_home, 125, y + 75, 42, null); disc(ctx, env, L.away, w.team_away, 205, y + 75, 42, null);
    const tm = w.team_home + ' - ' + w.team_away;
    txt(ctx, tm, 270, y + 68, fit(ctx, tm, F.xb, 32, 18, 440), F.xb, '#FFFFFF', 'left');
    txt(ctx, w.label, 270, y + 110, fit(ctx, w.label, F.sb, 24, 16, 440), F.sb, 'rgba(255,255,255,0.7)', 'left');
    txt(ctx, String(w.final_score).replace(/\s*[-:]\s*/, ' - '), 270, y + 175, 56, F.display, '#FFB020', 'left');
    ctx.restore();
    const s = prog(lt, at + 0.25, 0.2);
    if (s > 0) {
      ctx.save(); ctx.translate(860, y + 100); ctx.rotate(-0.18); const z = 2.2 - 1.2 * easeOut(s); ctx.scale(z, z); ctx.globalAlpha = clamp(s * 2, 0, 1);
      rr(ctx, -130, -50, 260, 100, 14); ctx.lineWidth = 8; ctx.strokeStyle = '#22C55E'; ctx.stroke();
      txt(ctx, 'VALIDÉ', 0, 22, 62, F.display, '#22C55E'); ctx.restore();
    }
  });
}

function site(ctx, env, sc, t, lt) {
  const F = env.F;
  { const e = easeBack(prog(lt, 0, 0.4)); ctx.save(); ctx.shadowColor = '#FFB020'; ctx.shadowBlur = 60; brand(ctx, env, 540, 470, 260 * e); ctx.restore(); }
  txt(ctx, 'RENDEZ-VOUS SUR', 540, 720, 90, F.display, '#FFFFFF', 'center', 10);
  const on = lt > 0.4 && !(lt > 0.5 && lt < 0.58) && !(lt > 0.7 && lt < 0.74);
  if (on) {
    const z = fit(ctx, 'alvecapital.fr', F.black, 110, 60, 960);
    ctx.save(); ctx.shadowColor = '#FFB020'; ctx.shadowBlur = 50;
    txt(ctx, 'alvecapital.fr', 540, 920, z, F.black, '#FFF6E0'); txt(ctx, 'alvecapital.fr', 540, 920, z, F.black, '#FFF6E0');
    ctx.restore();
  }
  const c = easeBack(prog(lt, 1.2, 0.35));
  if (c > 0) {
    ctx.save(); ctx.translate(540, 1080); ctx.scale(c, c);
    rr(ctx, -240, -48, 480, 96, 48); ctx.fillStyle = fire(ctx, -48, 48); ctx.fill();
    txt(ctx, 'COMPTE GRATUIT', 0, 17, 46, F.display, '#1A0A00'); ctx.restore();
  }
}

function hook(ctx, env, sc, t) { kinetic(ctx, env, sc, t, { size: 150, min: 84, maxW: 940, maxLines: 5, cy: 900, mode: 'arena' }); }
function kin(ctx, env, sc, t) { kinetic(ctx, env, sc, t, { size: 136, min: 76, maxW: 940, maxLines: 5, cy: 900, mode: 'arena' }); }
function outro(ctx, env, sc, t, lt) {
  kinetic(ctx, env, sc, t, { size: 112, min: 64, maxW: 940, maxLines: 5, cy: 760, mode: 'arena' });
  subscribe(ctx, env, 1240, lt, subT(sc));
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0.6, 0.4));
  txt(ctx, '18+  ·  JOUE RESPONSABLE', 540, 1380, 30, env.F.xb, 'rgba(255,255,255,0.85)', 'center', 6); ctx.restore();
}

const SCENES = { hook, match, pick, combo, results, site, outro };
const SUBS = new Set(['match', 'pick', 'combo', 'results', 'site']);

function shake(env, sc, lt) {
  const p = env.picks[idx(env, sc)];
  const hits = sc.kind === 'match' ? [COLLIDE] : sc.kind === 'pick' ? [coteT(sc, p)]
    : sc.kind === 'combo' ? env.picks.map((_, k) => rowT(k)).concat([totalT(sc, env)]) : sc.kind === 'hook' ? [0.1] : [];
  let dx = 0, dy = 0;
  for (const h of hits) { const d = lt - h; if (d >= 0 && d < 0.35) { const a = 26 * (1 - d / 0.35); dx += Math.sin(d * 97) * a; dy += Math.cos(d * 83) * a; } }
  return [dx, dy];
}

function chrome(ctx, env, t) {
  const F = env.F;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, W, 6);
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#FF4D00'); g.addColorStop(1, '#FFF3B0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W * clamp(t / env.total, 0, 1), 6);
  const lx = brand(ctx, env, 96, 118, 96) ? 158 : 48;
  txt(ctx, 'AL VE CAPITAL', lx, 120, 52, F.display, '#FFFFFF', 'left', 8);
  txt(ctx, '18+  ·  JOUE RESPONSABLE', lx + 2, 160, 22, F.sb, 'rgba(255,255,255,0.75)', 'left');
}

function flash(ctx, env, t) {
  for (const B of env.bounds) {
    const d = t - B;
    if (d > -0.06 && d < 0.2) {
      const a = d < 0 ? 1 + d / 0.06 : 1 - d / 0.2;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    }
  }
}

export async function drawArena(ctx, env, sc, t) {
  const lt = t - sc.start;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
  background(ctx, env, sc, t, await bgFrame(env, sc, t));
  const [dx, dy] = shake(env, sc, lt), z = lt < 0.3 ? 1.16 - 0.16 * easeOut(lt / 0.3) : 1;
  ctx.save(); ctx.translate(540 + dx, 960 + dy); ctx.scale(z, z); ctx.translate(-540, -960);
  (SCENES[sc.kind] || kin)(ctx, env, sc, t, lt);
  ctx.restore();
  if (SUBS.has(sc.kind)) subs(ctx, env, sc, t, 1590, 'fire');
  chrome(ctx, env, t);
  flash(ctx, env, t);
}
