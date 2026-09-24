import { clamp, prog, easeOut, easeBack, rr, font, fitSingle, tc } from './draw.mjs';
import { V, fmt, raised, inset, t, fitT, bookLogo, arrowsIcon, check, calcIcon, calcButton, lin } from './siteKit.mjs';
import { arbCard, cardHeight } from './siteCard.mjs';

// Scènes de la vidéo « section du site » : mêmes écrans que l'appli.
const S = 2.6, X0 = 72;

function header(ctx, env, a) {
  const F = env.F;
  ctx.save(); ctx.globalAlpha = a;
  t(ctx, 'Arbitrage', X0, 330, 66, F.black, V.ink);
  t(ctx, 'Opportunités repérées en continu', X0, 380, 30, F.sb, V.muted2);
  ctx.translate(X0, 420); ctx.scale(S, S);
  raised(ctx, 0, 0, 104, 32, 12, S); t(ctx, 'Pré-match', 52, 21, 12, F.xb, V.ink, 'center');
  ctx.fillStyle = V.emerald; ctx.fillRect(40, 28, 24, 2.5);
  inset(ctx, 114, 0, 76, 32, 12, S);
  ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(132, 16, 3.2, 0, Math.PI * 2); ctx.fill();
  t(ctx, 'Live', 142, 21, 12, F.sb, V.muted2);
  ctx.restore();
}

function placeCard(ctx, env, y, o, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(X0, y); ctx.scale(S, S);
  arbCard(ctx, env, Object.assign({ k: S }, o)); ctx.restore();
}

function shine(ctx, env, y, p) {
  if (p <= 0 || p >= 1) return;
  const h = cardHeight(ctx, env) * S; ctx.save(); rr(ctx, X0, y, 360 * S, h, 18 * S); ctx.clip();
  const x = X0 + p * 1300 - 200, g = ctx.createLinearGradient(x - 120, 0, x + 120, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(X0, y, 360 * S, h); ctx.restore();
}

function card(ctx, env, sc, lt) {
  header(ctx, env, easeOut(prog(lt, 0, 0.35)));
  const e = easeBack(prog(lt, 0.15, 0.55));
  placeCard(ctx, env, 560 + (1 - e) * 260, { badgePulse: Math.sin(Math.PI * prog(lt, 0.9, 0.6)) }, clamp(e, 0, 1));
  shine(ctx, env, 560, prog(lt, 1.5, 0.7));
}

function legs(ctx, env, sc, lt) {
  const half = sc.dur * 0.45;
  const gA = prog(lt, 0.2, 0.3) * (1 - prog(lt, half, 0.3)), gB = prog(lt, half, 0.3);
  header(ctx, env, 1);
  placeCard(ctx, env, 560, { glow: [gA, gB] }, 1);
  const yb = 560 + cardHeight(ctx, env) * S + 70;
  env.show.legs.forEach((l, i) => {
    const a = i === 0 ? easeOut(prog(lt, 0.2, 0.3)) : easeOut(prog(lt, half, 0.3));
    if (a <= 0) return;
    const cx = X0 + (14 + i * 170 + 81) * S, s = 'OPÉRATEUR ' + (i + 1) + ' · ' + Number(l.odd).toFixed(2);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, yb); ctx.scale(0.8 + 0.2 * easeBack(a), 0.8 + 0.2 * easeBack(a));
    font(ctx, 34, env.F.xb); const w = ctx.measureText(s).width + 50;
    rr(ctx, -w / 2, -40, w, 80, 40); ctx.fillStyle = 'rgba(51,217,142,0.14)'; ctx.fill(); ctx.strokeStyle = V.emerald; ctx.lineWidth = 3; ctx.stroke();
    tc(ctx, s, 0, 12, 34, env.F.xb, V.emerald); ctx.restore();
  });
}

function stakeLeg(ctx, env, l, i, y, a, k) {
  const F = env.F; ctx.save(); ctx.globalAlpha = a;
  raised(ctx, 16, y, 328, 88, 16, k);
  rr(ctx, 28, y + 13, 18, 18, 5); ctx.fillStyle = 'rgba(51,217,142,0.14)'; ctx.fill();
  t(ctx, String(i + 1), 37, y + 26, 10, F.black, V.emerald, 'center');
  fitT(ctx, (l.top ? l.top + ' ' : '') + l.main, 56, y + 27, 13, 8, 170, F.xb, V.ink);
  bookLogo(ctx, env.bookLogos[i], 56, y + 42, 14, 70, l.book_name, F);
  t(ctx, 'Cote ' + Number(l.odd).toFixed(2), 134, y + 46, 11, F.sb, V.muted2);
  const n = Math.round(l.stake * easeOut(clamp(a * 1.4 - 0.4, 0, 1)));
  t(ctx, fmt(n), 332, y + 30, 16, F.black, V.ink, 'right');
  t(ctx, 'FCFA à miser', 332, y + 44, 10, F.sb, V.muted2, 'right');
  rr(ctx, 28, y + 54, 304, 24, 10); ctx.fillStyle = 'rgba(51,217,142,0.08)'; ctx.fill();
  t(ctx, 'Si cette issue gagne', 38, y + 70, 10, F.sb, V.muted);
  t(ctx, fmt(l.retour) + ' FCFA', 322, y + 70, 12, F.black, V.emerald, 'right');
  ctx.restore();
}

function calc(ctx, env, sc, lt) {
  const F = env.F, s = env.show, k = 2.4;
  header(ctx, env, 0.35); placeCard(ctx, env, 560, { press: prog(lt, 0, 0.3) }, 0.35);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, 1080, 1920);
  const e = easeOut(prog(lt, 0.1, 0.45));
  ctx.save(); ctx.translate(108, 270 + (1 - e) * 1100); ctx.scale(k, k);
  raised(ctx, 0, 0, 360, 400, 24, k, V.base);
  rr(ctx, 156, 10, 48, 5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  const g = lin(ctx, 16, 28, 38, 38, V.emerald, V.emeraldDeep); rr(ctx, 16, 28, 38, 38, 12); ctx.fillStyle = g; ctx.fill();
  calcIcon(ctx, 29, 38, 16, '#FFFFFF');
  t(ctx, 'Calculateur de mise', 64, 44, 14, F.xb, V.ink);
  fitT(ctx, s.home + ' vs ' + s.away, 64, 60, 11, 7, 280, F.sb, V.muted2);
  t(ctx, 'VOTRE CAPITAL TOTAL', 16, 94, 11, F.xb, V.muted);
  inset(ctx, 16, 102, 328, 50, 16, k);
  const digits = String(s.capital), nd = Math.round(digits.length * prog(lt, 0.5, 0.7));
  if (nd === 0) t(ctx, 'Montant à investir', 32, 136, 20, F.sb, V.muted2);
  else t(ctx, fmt(digits.slice(0, nd)) + (nd < digits.length && lt % 0.5 < 0.25 ? '|' : ''), 32, 136, 24, F.black, V.ink);
  t(ctx, 'FCFA', 328, 133, 14, F.xb, V.muted2, 'right');
  t(ctx, 'MISEZ EXACTEMENT CECI', 16, 182, 11, F.xb, V.muted);
  s.legs.forEach((l, i) => stakeLeg(ctx, env, l, i, 192 + i * 100, easeOut(prog(lt, 1.3 + 0.35 * i, 0.4)), k));
  ctx.restore();
}

function outcomes(ctx, env, sc, lt) {
  const F = env.F, s = env.show;
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0, 0.3));
  tc(ctx, 'QUEL QUE SOIT LE RÉSULTAT', 540, 380, fitSingle(ctx, 'QUEL QUE SOIT LE RÉSULTAT', F.black, 54, 30, 940), F.black, V.ink); ctx.restore();
  ctx.save(); ctx.translate(X0, 430); ctx.scale(S, S);
  s.legs.forEach((l, i) => {
    const a = easeBack(prog(lt, 0.2 + 0.35 * i, 0.45)); if (a <= 0) return;
    const x = i * 184;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x + 88, 56); ctx.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a); ctx.translate(-x - 88, -56);
    raised(ctx, x, 0, 176, 112, 16, S);
    t(ctx, 'SI CETTE ISSUE GAGNE', x + 12, 20, 7.5, F.xb, V.muted2);
    fitT(ctx, (l.top ? l.top + ' ' : '') + l.main, x + 12, 38, 13, 7, 152, F.black, V.ink);
    bookLogo(ctx, env.bookLogos[i], x + 12, 54, 14, 80, l.book_name, F);
    t(ctx, 'TU RÉCUPÈRES', x + 12, 80, 7.5, F.xb, V.muted2);
    t(ctx, fmt(l.retour), x + 12, 101, 20, F.black, V.emerald);
    font(ctx, 20, F.black); const rw = ctx.measureText(fmt(l.retour)).width; t(ctx, 'FCFA', x + 16 + rw, 101, 9, F.xb, V.muted2);
    check(ctx, x + 158, 18, 9, easeBack(prog(lt, 0.5 + 0.35 * i, 0.35)));
    ctx.restore();
  });
  const b = easeOut(prog(lt, 1.0, 0.45));
  if (b > 0) {
    ctx.save(); ctx.globalAlpha = b; ctx.translate(0, (1 - b) * 30);
    raised(ctx, 0, 128, 360, 98, 18, S);
    rr(ctx, 0, 128, 360, 98, 18); ctx.strokeStyle = 'rgba(51,217,142,' + (0.25 + 0.25 * Math.sin(lt * 4)) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = V.emerald; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(16, 160); ctx.lineTo(22, 154); ctx.lineTo(26, 158); ctx.lineTo(32, 151); ctx.stroke();
    t(ctx, 'Bénéfice net', 40, 160, 12, F.xb, V.muted);
    const p = Math.round(s.profit * easeOut(prog(lt, 1.1, 0.9)));
    ctx.save(); ctx.shadowColor = 'rgba(51,217,142,0.8)'; ctx.shadowBlur = 16 * S; t(ctx, '+' + fmt(p) + ' FCFA', 344, 161, 17, F.black, V.emerald, 'right'); ctx.restore();
    inset(ctx, 16, 174, 158, 40, 12, S); inset(ctx, 186, 174, 158, 40, 12, S);
    t(ctx, 'RETOUR TOTAL', 26, 189, 8, F.xb, V.muted2); t(ctx, fmt(s.retour) + ' FCFA', 26, 205, 12, F.xb, V.ink);
    t(ctx, 'RENDEMENT', 334, 189, 8, F.xb, V.muted2, 'right'); t(ctx, '+' + Number(s.profit_pct).toFixed(2) + '%', 334, 205, 12, F.xb, V.emerald, 'right');
    ctx.restore();
  }
  ctx.restore();
}

function stepRow(ctx, env, i, y, a, tap, draw) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate((1 - a) * 60, 0);
  t(ctx, 'ÉTAPE ' + (i + 1), 4, y - 8, 9, env.F.xb, V.emerald);
  draw(y);
  if (tap > 0 && tap < 1) { ctx.globalAlpha = 0.35 * (1 - tap); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(300, y + 28, 10 + 40 * tap, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function steps(ctx, env, sc, lt) {
  const F = env.F, s = env.show;
  const at = (i) => 0.15 + (sc.dur * 0.25) * i;
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0, 0.3));
  tc(ctx, 'À TOI DE JOUER', 540, 360, 58, F.black, V.ink); ctx.restore();
  ctx.save(); ctx.translate(X0, 440); ctx.scale(S, S);
  stepRow(ctx, env, 0, 16, easeOut(prog(lt, at(0), 0.4)), prog(lt, at(0) + 0.5, 0.5), (y) => {
    raised(ctx, 0, y, 360, 58, 18, S);
    inset(ctx, 12, y + 9, 40, 40, 13, S); arrowsIcon(ctx, 32, y + 29, 17, V.muted);
    t(ctx, 'Arbitrage', 64, y + 26, 13.5, F.xb, V.ink);
    font(ctx, 13.5, F.xb); const bx = 64 + ctx.measureText('Arbitrage').width + 8;
    font(ctx, 8.5, F.xb); const bw = ctx.measureText('PRÉ-MATCH').width + 14;
    rr(ctx, bx, y + 15, bw, 14, 7); ctx.fillStyle = 'rgba(129,140,248,.15)'; ctx.fill(); t(ctx, 'PRÉ-MATCH', bx + 7, y + 25, 8.5, F.xb, V.indigo);
    t(ctx, 'Surebets repérés en continu', 64, y + 43, 11, F.sb, V.muted2);
    ctx.strokeStyle = V.muted2; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(338, y + 23); ctx.lineTo(344, y + 29); ctx.lineTo(338, y + 35); ctx.stroke();
  });
  stepRow(ctx, env, 1, 100, easeOut(prog(lt, at(1), 0.4)), prog(lt, at(1) + 0.5, 0.5), (y) => {
    raised(ctx, 0, y, 360, 58, 18, S);
    fitT(ctx, s.home + ' vs ' + s.away, 14, y + 25, 12.5, 8, 250, F.black, V.ink);
    fitT(ctx, String(s.market_label) + ' · ' + s.kickoff_label, 14, y + 43, 10, 7, 250, F.sb, V.muted2);
    inset(ctx, 282, y + 11, 66, 36, 12, S, 'rgba(20,27,45,1)');
    t(ctx, '+' + Number(s.profit_pct).toFixed(2) + '%', 315, y + 34, 12.5, F.black, V.emerald, 'center');
  });
  stepRow(ctx, env, 2, 184, easeOut(prog(lt, at(2), 0.4)), prog(lt, at(2) + 0.5, 0.5), (y) => {
    ctx.save(); ctx.shadowColor = 'rgba(51,217,142,0.45)'; ctx.shadowBlur = 20 * S; calcButton(ctx, 0, y, 360, 48, 14, F, 0); ctx.restore();
    calcButton(ctx, 0, y, 360, 48, 14, F, prog(lt, at(2) + 0.5, 0.5));
  });
  ctx.restore();
}

// « Opérateurs africains » : les logos défilent sur trois rangées, un faisceau de scan les balaie.
function brand(ctx, env, sc, lt) {
  const F = env.F, ops = env.opLogos || [];
  ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0, 0.35));
  tc(ctx, 'AL VE CAPITAL', 540, 400, 110, F.display, V.emerald);
  const sub = 'SCANNE LES OPÉRATEURS AFRICAINS';
  tc(ctx, sub, 540, 480, fitSingle(ctx, sub, F.black, 50, 28, 960), F.black, V.ink);
  ctx.restore();
  const TW = 300, TH = 150, step = TW + 40;
  [0, 1, 2].forEach((row) => {
    const list = ops.filter((_, i) => i % 3 === row); if (!list.length) return;
    const n = Math.max(list.length, Math.ceil((1080 + step) / step) + 1), total = n * step;
    const dir = row % 2 ? 1 : -1, y = 590 + row * 190;
    ctx.save(); ctx.globalAlpha = easeOut(prog(lt, 0.15 + 0.12 * row, 0.4));
    for (let i = 0; i < n; i++) {
      const o = list[i % list.length], x = (((i * step + dir * lt * 220) % total) + total) % total - step;
      if (x < -TW || x > 1080) continue;
      rr(ctx, x, y, TW, TH, 28); ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0;
      if (o.img) { const k = Math.min((TW - 60) / o.img.width, (TH - 50) / o.img.height); ctx.drawImage(o.img, x + (TW - o.img.width * k) / 2, y + (TH - o.img.height * k) / 2, o.img.width * k, o.img.height * k); }
      else tc(ctx, o.name, x + TW / 2, y + TH / 2 + 14, fitSingle(ctx, o.name, F.black, 40, 18, TW - 40), F.black, '#0B1020');
    }
    ctx.restore();
  });
  const bx = ((lt * 700) % 1500) - 200, g = ctx.createLinearGradient(bx - 90, 0, bx + 90, 0);
  g.addColorStop(0, 'rgba(51,217,142,0)'); g.addColorStop(0.5, 'rgba(51,217,142,0.35)'); g.addColorStop(1, 'rgba(51,217,142,0)');
  ctx.fillStyle = g; ctx.fillRect(bx - 90, 570, 180, 610);
  ctx.fillStyle = V.emerald; ctx.fillRect(bx - 2, 570, 4, 610);
}

// Appel à l'action : l'adresse du site se tape dans une barre de navigateur, puis « COMPTE GRATUIT ».
function site(ctx, env, sc, lt) {
  const F = env.F, e = easeBack(prog(lt, 0, 0.45));
  ctx.save(); ctx.globalAlpha = clamp(e, 0, 1); ctx.translate(540, 640); ctx.scale(0.8 + 0.2 * e, 0.8 + 0.2 * e); ctx.translate(-540, -640);
  raised(ctx, 90, 540, 900, 200, 60, 3);
  ctx.fillStyle = V.emerald; ctx.beginPath(); ctx.arc(190, 640, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#06101F'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(178, 640); ctx.lineTo(188, 650); ctx.lineTo(204, 630); ctx.stroke();
  const url = 'alvecapital.fr', nd = Math.round(url.length * prog(lt, 0.3, 0.9));
  t(ctx, url.slice(0, nd) + (lt % 0.8 < 0.4 ? '|' : ''), 250, 668, fitSingle(ctx, url + '|', F.black, 84, 40, 700), F.black, V.ink);
  ctx.restore();
  const b = easeBack(prog(lt, 1.1, 0.4));
  if (b > 0) {
    const pulse = 1 + 0.05 * Math.sin(lt * 6);
    ctx.save(); ctx.globalAlpha = clamp(b, 0, 1); ctx.translate(540, 900); ctx.scale(b * pulse, b * pulse);
    rr(ctx, -330, -75, 660, 150, 75); ctx.fillStyle = V.emerald; ctx.shadowColor = V.emerald; ctx.shadowBlur = 50; ctx.fill(); ctx.shadowBlur = 0;
    tc(ctx, 'COMPTE GRATUIT', 0, 24, 68, F.black, '#06101F');
    ctx.restore();
    const tap = prog(lt, 1.8, 0.6);
    if (tap > 0 && tap < 1) { ctx.save(); ctx.globalAlpha = 0.4 * (1 - tap); ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(700, 920, 20 + 90 * tap, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
}

export const SITE_DRAW = { card, legs, calc, outcomes, steps, brand, site };
