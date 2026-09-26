// Style « Télé » : habillage d'avant-match façon chaîne sportive, sur de vrais
// plans de stade. Plaques aux couleurs des clubs, tableau de score, ticket.
import { W, H, clamp, prog, easeOut, easeBack, rgba, rr, font, inOut, lerp, idx, mix, lum, txt, fit, lines, disc, check, subscribe, kinetic, subs, brand } from './kit.mjs';
import { COLLIDE, coteT, confT, scoreT, rowT, totalT, subT, resultT } from './timing.mjs';
import { bgFrame } from './bg.mjs';

const NAVY = '#0A1330', CARD = 'rgba(8,14,34,0.9)';
const hhmm = (iso) => { try { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }).format(new Date(iso)); } catch (e) { return ''; } };

function skew(ctx, x, y, w, h, s) { ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + w + s, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }

function sweep(ctx, x, y, w, h, p) {
  if (p <= 0 || p >= 1) return;
  const cx = x - 200 + p * (w + 400), g = ctx.createLinearGradient(cx - 140, 0, cx + 140, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}

// Bandeau d'information (compétition à gauche, heure à droite).
function header(ctx, env, left, right, y, lt) {
  const F = env.F, p = inOut(prog(lt, 0, 0.4));
  if (p <= 0) return;
  ctx.save(); ctx.fillStyle = env.accent; ctx.fillRect(56, y, 12, 72);
  ctx.beginPath(); ctx.rect(68, y, 600 * p, 72); ctx.clip();
  ctx.fillStyle = CARD; ctx.fillRect(68, y, 600, 72);
  txt(ctx, left, 92, y + 48, fit(ctx, left, F.xb, 30, 18, 550), F.xb, '#FFFFFF', 'left');
  ctx.restore();
  const q = easeBack(prog(lt, 0.3, 0.35));
  if (right && q > 0) {
    const z = fit(ctx, right, F.black, 28, 18, 290), w = ctx.measureText(right).width + 44;
    ctx.save(); ctx.translate(1024 - w / 2, y + 36); ctx.scale(q, q);
    rr(ctx, -w / 2, -36, w, 72, 12); ctx.fillStyle = env.accent; ctx.fill();
    txt(ctx, right, 0, 11, z, F.black, '#0B1020'); ctx.restore();
  }
}

// Plaque d'équipe qui entre de côté, aux couleurs du club.
function plate(ctx, env, o) {
  if (o.p <= 0) return;
  const F = env.F, y = o.y, h = 290, left = o.side < 0, light = lum(o.color) > 0.72;
  ctx.save(); ctx.translate(o.side * (1 - o.p) * 1300, 0);
  skew(ctx, -80, y, W + 160, h, left ? 70 : -70);
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(0, y, W, y + h), deep = mix(o.color, '#000000', light ? 0.3 : 0.72), near = mix(o.color, '#000000', 0.12);
  g.addColorStop(0, left ? near : deep); g.addColorStop(1, left ? deep : near);
  ctx.fillStyle = g; ctx.fillRect(-100, y, W + 200, h);
  ctx.globalAlpha = 0.07; ctx.fillStyle = '#FFFFFF';
  for (let k = -4; k < 22; k++) { const x = k * 70 + ((o.lt * 40) % 70); ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + 28, y + h); ctx.lineTo(x + 148, y); ctx.lineTo(x + 120, y); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (o.img) {
    const S = 520, k = Math.min(S / o.img.width, S / o.img.height), wx = left ? 800 : 280;
    ctx.globalAlpha = 0.12; ctx.drawImage(o.img, wx - (o.img.width * k) / 2, y + h / 2 - (o.img.height * k) / 2, o.img.width * k, o.img.height * k); ctx.globalAlpha = 1;
  }
  sweep(ctx, 0, y, W, h, prog(o.lt, o.sweepAt, 0.7));
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; skew(ctx, -80, y, W + 160, h, left ? 70 : -70); ctx.stroke();
  disc(ctx, env, o.img, o.name, left ? 190 : 890, y + h / 2, 108, '#FFFFFF');
  const col = light ? '#0B1020' : '#FFFFFF', nx = left ? 330 : 750, al = left ? 'left' : 'right';
  const L = lines(ctx, String(o.name || '').toUpperCase(), F.display, 96, 50, 420, 2);
  const lh = L.size * 1.02, ny = y + h / 2 - ((L.lines.length - 1) * lh) / 2 + L.size * 0.33;
  if (!light) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; }
  L.lines.forEach((ln, i) => txt(ctx, ln, nx, ny + i * lh, L.size, F.display, col, al));
  ctx.shadowBlur = 0;
  txt(ctx, left ? 'DOMICILE' : 'EXTÉRIEUR', nx, y + h - 22, 22, F.sb, light ? 'rgba(11,16,32,0.7)' : 'rgba(255,255,255,0.7)', al);
  ctx.restore();
}

function vs(ctx, env, cx, cy, p) {
  if (p <= 0) return;
  const s = 2.2 - 1.2 * easeOut(p);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha = clamp(p * 2, 0, 1);
  ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; ctx.lineTo(Math.cos(a) * 82, Math.sin(a) * 82); } ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.fillStyle = NAVY; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 6; ctx.strokeStyle = env.accent; ctx.stroke();
  txt(ctx, 'VS', 0, 26, 76, env.F.display, env.accent);
  ctx.restore();
}

// Tableau de score façon panneau à volets.
function scoreboard(ctx, env, score, y, lt, at) {
  const m = String(score).match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return;
  const p = prog(lt, at - 0.15, 0.3);
  if (p <= 0) return;
  const F = env.F;
  ctx.save(); ctx.globalAlpha = clamp(p * 2, 0, 1);
  rr(ctx, 330, y - 44, 420, 56, 10); ctx.fillStyle = env.accent; ctx.fill();
  txt(ctx, 'SCORE PROBABLE', 540, y - 5, 30, F.black, '#0B1020');
  txt(ctx, '-', 540, y + 140, 90, F.display, '#FFFFFF');
  ctx.restore();
  [m[1], m[2]].forEach((d, k) => {
    const q = easeBack(prog(lt, at + k * 0.1, 0.35));
    if (q <= 0) return;
    ctx.save(); ctx.translate(k ? 660 : 420, y + 110); ctx.scale(1, q);
    rr(ctx, -95, -95, 190, 190, 18); ctx.fillStyle = NAVY; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(-95, -95, 190, 95);
    txt(ctx, d, 0, 54, 150, F.display, '#FFFFFF');
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-95, -2, 190, 4);
    ctx.restore();
  });
}

function match(ctx, env, sc, t, lt) {
  const i = idx(env, sc), p = env.picks[i], L = env.logos[i] || {}, C = env.colors[i], k = hhmm(p.kickoff_iso);
  header(ctx, env, String(p.league || '').toUpperCase(), k ? (env.when === 'demain' ? 'DEMAIN ' : '') + k : '', 330, lt);
  plate(ctx, env, { y: 470, side: -1, color: C.home, img: L.home, name: p.team_home, p: inOut(prog(lt, 0.08, 0.45)), lt, sweepAt: 0.7 });
  plate(ctx, env, { y: 840, side: 1, color: C.away, img: L.away, name: p.team_away, p: inOut(prog(lt, 0.22, 0.45)), lt, sweepAt: 0.85 });
  vs(ctx, env, 540, 805, prog(lt, COLLIDE, 0.25));
  if (p.probable_score) scoreboard(ctx, env, p.probable_score, 1210, lt, scoreT(sc));
}

function pick(ctx, env, sc, t, lt) {
  const F = env.F, i = idx(env, sc), p = env.picks[i], L = env.logos[i] || {}, C = env.colors[i];
  const cAt = coteT(sc, p), fAt = confT(sc, p);
  const hp = inOut(prog(lt, 0, 0.4));
  if (hp > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 350, 70 + 960 * hp, 110); ctx.clip();
    skew(ctx, 60, 360, 930, 90, 24); ctx.fillStyle = env.accent; ctx.fill();
    txt(ctx, 'NOTRE PRONO', 104, 424, 50, F.display, '#0B1020', 'left');
    disc(ctx, env, L.home, p.team_home, 850, 405, 36, C.home); disc(ctx, env, L.away, p.team_away, 942, 405, 36, C.away);
    ctx.restore();
  }
  const mp = easeOut(prog(lt, 0.15, 0.45));
  if (mp > 0) {
    ctx.save(); ctx.globalAlpha = mp; ctx.translate(0, 50 * (1 - mp));
    rr(ctx, 60, 470, 960, 330, 22); ctx.fillStyle = CARD; ctx.fill();
    const g = ctx.createLinearGradient(0, 490, 0, 780); g.addColorStop(0, C.home); g.addColorStop(1, C.away);
    ctx.fillStyle = g; ctx.fillRect(60, 490, 12, 290);
    const lab = lines(ctx, String(p.label || '').toUpperCase(), F.display, 110, 56, 860, 2);
    const lh = lab.size * 1.02, ly = 625 - ((lab.lines.length - 1) * lh) / 2 + lab.size * 0.25;
    lab.lines.forEach((ln, k) => txt(ctx, ln, 550, ly + k * lh, lab.size, F.display, '#FFFFFF'));
    const teams = (p.team_home + '  -  ' + p.team_away).toUpperCase();
    txt(ctx, teams, 550, 765, fit(ctx, teams, F.sb, 28, 18, 860), F.sb, 'rgba(255,255,255,0.65)');
    sweep(ctx, 60, 470, 960, 330, prog(lt, cAt + 0.4, 0.8));
    ctx.restore();
  }
  const t1 = easeOut(prog(lt, 0.35, 0.4)), t2 = easeOut(prog(lt, 0.45, 0.4));
  const cv = 1 + (Number(p.cote) - 1) * easeOut(prog(lt, cAt - 0.25, 0.55));
  const conf = clamp(Number(p.confidence) || 0, 0, 100), fv = conf * easeOut(prog(lt, fAt - 0.25, 0.7));
  if (t1 > 0) {
    ctx.save(); ctx.globalAlpha = t1; ctx.translate(0, 60 * (1 - t1));
    rr(ctx, 60, 830, 465, 320, 22); ctx.fillStyle = CARD; ctx.fill();
    txt(ctx, 'COTE', 292, 892, 30, F.black, 'rgba(255,255,255,0.7)');
    const pulse = 1 + 0.12 * Math.sin(Math.PI * prog(lt, cAt + 0.3, 0.25));
    ctx.translate(292, 1062); ctx.scale(pulse, pulse);
    ctx.shadowColor = rgba(env.accent, 0.8); ctx.shadowBlur = 36 * prog(lt, cAt + 0.25, 0.2);
    txt(ctx, cv.toFixed(2), 0, 0, 150, F.display, env.accent);
    ctx.restore();
  }
  if (t2 > 0) {
    ctx.save(); ctx.globalAlpha = t2; ctx.translate(0, 60 * (1 - t2));
    rr(ctx, 555, 830, 465, 320, 22); ctx.fillStyle = CARD; ctx.fill();
    txt(ctx, 'FIABILITÉ', 787, 892, 30, F.black, 'rgba(255,255,255,0.7)');
    txt(ctx, Math.round(fv) + '%', 787, 1032, 130, F.display, '#FFFFFF');
    rr(ctx, 600, 1078, 375, 26, 13); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    if (fv > 0) {
      const g2 = ctx.createLinearGradient(600, 0, 975, 0); g2.addColorStop(0, '#22C55E'); g2.addColorStop(1, env.accent);
      rr(ctx, 600, 1078, Math.max(26, (375 * fv) / 100), 26, 13); ctx.fillStyle = g2; ctx.fill();
    }
    ctx.restore();
  }
}

function paper(ctx, x, y, w, h) {
  const z = 20, n = Math.round(w / z);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20;
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let k = 0; k < n; k++) { ctx.lineTo(x + k * z + z / 2, y + 12); ctx.lineTo(x + (k + 1) * z, y); }
  ctx.lineTo(x + w, y + h);
  for (let k = n; k > 0; k--) { ctx.lineTo(x + k * z - z / 2, y + h - 12); ctx.lineTo(x + (k - 1) * z, y + h); }
  ctx.closePath(); ctx.fillStyle = '#F7F5EF'; ctx.fill(); ctx.restore();
}
function dashed(ctx, x0, x1, y) {
  ctx.save(); ctx.setLineDash([14, 10]); ctx.strokeStyle = 'rgba(11,16,32,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore();
}

// Le ticket du jour qui s'imprime ligne par ligne.
function combo(ctx, env, sc, t, lt) {
  const F = env.F, n = env.picks.length, top = 360, rowH = 150, hh = 190 + n * rowH + 250;
  const e = easeOut(prog(lt, 0, 0.55));
  if (e <= 0) return;
  ctx.save();
  ctx.translate(540, top + hh / 2 + (1 - e) * 1400); ctx.rotate(-0.02 - 0.05 * (1 - e)); ctx.translate(-540, -(top + hh / 2));
  paper(ctx, 130, top, 820, hh);
  txt(ctx, 'TICKET DU JOUR', 540, top + 95, 70, F.display, '#0B1020');
  txt(ctx, 'AL VE CAPITAL  ·  ANALYSE  ·  18+', 540, top + 138, 22, F.sb, '#6B7280');
  dashed(ctx, 170, 910, top + 170);
  env.picks.forEach((p, k) => {
    const rp = easeOut(prog(lt, rowT(k), 0.3));
    if (rp <= 0) return;
    const y = top + 190 + k * rowH, L = env.logos[k] || {}, C = env.colors[k];
    ctx.save(); ctx.globalAlpha = rp; ctx.translate(-40 * (1 - rp), 0);
    disc(ctx, env, L.home, p.team_home, 205, y + 60, 30, C.home); disc(ctx, env, L.away, p.team_away, 265, y + 60, 30, C.away);
    const lab = String(p.label || '');
    txt(ctx, lab, 320, y + 58, fit(ctx, lab, F.xb, 34, 20, 430), F.xb, '#0B1020', 'left');
    const tm = p.team_home + ' - ' + p.team_away;
    txt(ctx, tm, 320, y + 98, fit(ctx, tm, F.sb, 22, 16, 430), F.sb, '#6B7280', 'left');
    txt(ctx, Number(p.cote).toFixed(2), 910, y + 78, 58, F.display, '#0B1020', 'right');
    dashed(ctx, 170, 910, y + rowH - 8);
    ctx.restore();
  });
  const tAt = totalT(sc, env), tp = prog(lt, tAt, 0.4), by = top + 190 + n * rowH;
  if (tp > 0) {
    ctx.save(); ctx.globalAlpha = clamp(tp * 2, 0, 1);
    txt(ctx, 'COTE TOTALE', 540, by + 60, 32, F.black, '#6B7280');
    const s = 1.8 - 0.8 * easeBack(tp);
    ctx.translate(540, by + 195); ctx.scale(s, s);
    txt(ctx, env.totalOdds.toFixed(2), 0, 0, 150, F.display, '#0E9F6E');
    ctx.restore();
    const sp = prog(lt, tAt + 0.35, 0.25);
    if (sp > 0) {
      ctx.save(); ctx.translate(810, by + 125); ctx.rotate(-0.25); const z = 1.8 - 0.8 * easeOut(sp); ctx.scale(z, z);
      ctx.globalAlpha = 0.85 * clamp(sp * 2, 0, 1);
      rr(ctx, -110, -40, 220, 80, 12); ctx.lineWidth = 6; ctx.strokeStyle = '#E5484D'; ctx.stroke();
      txt(ctx, 'ANALYSÉ', 0, 16, 44, F.display, '#E5484D');
      ctx.restore();
    }
  }
  ctx.restore();
}

function results(ctx, env, sc, t, lt) {
  const F = env.F, pr = env.proof || {}, wins = (pr.wins || []).slice(0, 3), n = wins.length;
  header(ctx, env, pr.ours ? "NOS PRONOS D'HIER" : 'RÉSULTATS VALIDÉS', pr.ours ? n + ' SUR ' + n : (pr.won ? pr.won + ' VALIDÉS' : ''), 330, lt);
  wins.forEach((w, k) => {
    const at = resultT(sc, k, n, w.team_home), p = easeOut(prog(lt, at, 0.35));
    if (p <= 0) return;
    const y = 460 + k * 250, L = env.proofLogos[k] || {};
    ctx.save(); ctx.globalAlpha = p; ctx.translate((k % 2 ? 1 : -1) * 200 * (1 - p), 0);
    rr(ctx, 60, y, 960, 210, 22); ctx.fillStyle = CARD; ctx.fill();
    disc(ctx, env, L.home, w.team_home, 140, y + 80, 44, null); disc(ctx, env, L.away, w.team_away, 240, y + 80, 44, null);
    const tm = w.team_home + ' - ' + w.team_away;
    txt(ctx, tm, 310, y + 70, fit(ctx, tm, F.xb, 32, 18, 400), F.xb, '#FFFFFF', 'left');
    txt(ctx, w.label, 310, y + 115, fit(ctx, w.label, F.sb, 26, 16, 400), F.sb, 'rgba(255,255,255,0.7)', 'left');
    if (w.cote) txt(ctx, 'COTE ' + Number(w.cote).toFixed(2), 310, y + 168, 28, F.black, env.accent, 'left');
    txt(ctx, String(w.final_score).replace(/\s*[-:]\s*/, ' - '), 815, y + 135, 90, F.display, '#FFFFFF');
    check(ctx, 965, y + 60, 34, '#22C55E', prog(lt, at + 0.25, 0.4));
    ctx.restore();
  });
}

function site(ctx, env, sc, t, lt) {
  const F = env.F, a = easeOut(prog(lt, 0, 0.4));
  ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = rgba(env.accent, 0.55); ctx.shadowBlur = 60; brand(ctx, env, 540, 470, 250 + 12 * Math.sin(lt * 3)); ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
  txt(ctx, 'RENDEZ-VOUS SUR', 540, 700, 84, F.display, '#FFFFFF'); ctx.restore();
  const b = easeBack(prog(lt, 0.2, 0.45));
  if (b > 0) {
    ctx.save(); ctx.translate(540, 860); ctx.scale(b, b);
    ctx.shadowColor = rgba(env.accent, 0.6); ctx.shadowBlur = 50;
    rr(ctx, -440, -80, 880, 160, 80); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0B1020'; ctx.beginPath(); ctx.arc(-362, 0, 50, 0, Math.PI * 2); ctx.fill();
    if (!brand(ctx, env, -362, 0, 80)) txt(ctx, 'AV', -362, 13, 34, F.display, env.accent);
    const url = 'alvecapital.fr', shown = url.slice(0, Math.floor(url.length * prog(lt, 0.45, 0.8))), z = fit(ctx, url, F.black, 80, 50, 680);
    txt(ctx, shown, -300, 28, z, F.black, '#0B1020', 'left');
    font(ctx, z, F.black); const cw = ctx.measureText(shown).width;
    if (Math.floor(lt * 3) % 2 === 0) { ctx.fillStyle = '#0B1020'; ctx.fillRect(-300 + cw + 8, -38, 6, 76); }
    ctx.restore();
  }
  const c = easeBack(prog(lt, 1.3, 0.4));
  if (c > 0) {
    ctx.save(); ctx.translate(540, 1060); ctx.scale(c, c);
    rr(ctx, -230, -46, 460, 92, 46); ctx.fillStyle = env.accent; ctx.fill();
    txt(ctx, 'COMPTE GRATUIT', 0, 16, 44, F.display, '#0B1020'); ctx.restore();
  }
}

function hook(ctx, env, sc, t, lt) {
  kinetic(ctx, env, sc, t, { size: 150, min: 84, maxW: 940, maxLines: 5, cy: 900, mode: 'bc' });
  if (lt < 0.3) { ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - lt / 0.3)) + ')'; ctx.fillRect(0, 0, W, H); }
}
function kin(ctx, env, sc, t) { kinetic(ctx, env, sc, t, { size: 136, min: 76, maxW: 940, maxLines: 5, cy: 900, mode: 'bc' }); }
function outro(ctx, env, sc, t, lt) {
  kinetic(ctx, env, sc, t, { size: 112, min: 64, maxW: 940, maxLines: 5, cy: 760, mode: 'bc' });
  subscribe(ctx, env, 1240, lt, subT(sc));
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0.6, 0.4));
  txt(ctx, '18+  ·  JOUE RESPONSABLE', 540, 1380, 30, env.F.xb, 'rgba(255,255,255,0.8)'); ctx.restore();
}

const SCENES = { hook, match, pick, combo, results, site, outro };
const SUBS = new Set(['match', 'pick', 'combo', 'results', 'site']);

function chrome(ctx, env, t) {
  const F = env.F;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, 0, W, 6);
  ctx.fillStyle = env.accent; ctx.fillRect(0, 0, W * clamp(t / env.total, 0, 1), 6);
  rr(ctx, 44, 64, 92, 92, 18); ctx.fillStyle = 'rgba(8,14,32,0.82)'; ctx.fill();
  if (!brand(ctx, env, 90, 110, 82)) txt(ctx, 'AV', 90, 128, 52, F.display, env.accent);
  rr(ctx, 146, 64, 390, 92, 18); ctx.fillStyle = 'rgba(8,14,32,0.82)'; ctx.fill();
  txt(ctx, 'AL VE CAPITAL', 166, 108, 34, F.black, '#FFFFFF', 'left');
  ctx.fillStyle = Math.floor(t * 1.6) % 2 === 0 ? '#FF3B3B' : 'rgba(255,59,59,0.35)';
  ctx.beginPath(); ctx.arc(173, 133, 7, 0, Math.PI * 2); ctx.fill();
  txt(ctx, 'ANALYSE ' + (env.when === 'demain' ? 'DE DEMAIN' : 'DU JOUR') + '  ·  18+', 188, 141, 21, F.sb, 'rgba(255,255,255,0.8)', 'left');
}

// Transition « habillage télé » : trois bandes qui balaient l'écran et masquent la coupe.
function stinger(ctx, env, t) {
  const B = env.bounds.find((b) => Math.abs(t - b) < 0.45);
  if (B == null) return;
  [env.accent, '#FFFFFF', NAVY].forEach((c, k) => {
    const p = clamp((t - B) / 0.9 + 0.5 + (2 - k) * 0.08, 0, 1);
    if (p <= 0 || p >= 1) return;
    const cx = lerp(-1512, 2592, inOut(p));
    ctx.fillStyle = c; skew(ctx, cx - 1000, -10, 2000, H + 20, 300); ctx.fill();
  });
  const d = Math.abs(t - B);
  if (d < 0.1) {
    ctx.save(); ctx.globalAlpha = 1 - d / 0.1;
    brand(ctx, env, 540, 790, 260); txt(ctx, 'AL VE CAPITAL', 540, 1000, 110, env.F.display, env.accent); ctx.restore();
  }
}

export async function drawBroadcast(ctx, env, sc, t) {
  const lt = t - sc.start;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#050A18'; ctx.fillRect(0, 0, W, H);
  const fr = await bgFrame(env, sc, t);
  if (fr) { const z = 1.04 + 0.06 * clamp(lt / sc.dur, 0, 1); ctx.drawImage(fr, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z); }
  const data = SUBS.has(sc.kind);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(5,10,24,0.78)'); g.addColorStop(0.5, data ? 'rgba(5,10,24,0.55)' : 'rgba(5,10,24,0.35)'); g.addColorStop(1, 'rgba(5,10,24,0.92)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const [sp, off] of [[0.09, 0], [0.06, 0.55]]) {
    const x = ((t * sp + off) % 1) * 2000 - 500, b = ctx.createLinearGradient(x - 160, 0, x + 160, 0);
    b.addColorStop(0, 'rgba(255,255,255,0)'); b.addColorStop(0.5, 'rgba(255,255,255,0.06)'); b.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = b; skew(ctx, x - 160, 0, 320, H, 400); ctx.fill();
  }
  ctx.save();
  const push = 1 + 0.025 * easeOut(clamp(lt / sc.dur, 0, 1));
  ctx.translate(540, 960); ctx.scale(push, push); ctx.translate(-540, -960);
  (SCENES[sc.kind] || kin)(ctx, env, sc, t, lt);
  ctx.restore();
  if (data) subs(ctx, env, sc, t, 1510, 'box');
  chrome(ctx, env, t);
  stinger(ctx, env, t);
}
