import { rr, font, fitSingle } from './draw.mjs';
import { V, raised, inset, t, fitT, bookLogo, clock, calcButton } from './siteKit.mjs';

// Carte d'opportunité, copie de ArbitrageCard.jsx — en unités « appli » (360 de large).
export function cardHeight(ctx, env) { return 206 + layout(ctx, env).ex; }

function layout(ctx, env) {
  const s = env.show, F = env.F, maxW = 256;
  font(ctx, 15, F.black); const wh = ctx.measureText(s.home).width, wa = ctx.measureText(s.away).width;
  font(ctx, 12, F.sb); const wv = ctx.measureText('vs').width + 12;
  const one = wh + wa + wv, two = one * (11 / 15) > maxW;
  return { ex: two ? 17 : 0, two, z: Math.min(15, (15 * maxW) / one), wh, maxW };
}

export function arbCard(ctx, env, o) {
  const F = env.F, s = env.show, k = o.k, L = layout(ctx, env), ex = L.ex, H0 = 206 + ex;
  raised(ctx, 0, 0, 360, H0, 18, k);
  ctx.save(); rr(ctx, 0, 0, 360, H0, 18); ctx.clip();
  if (!L.two) {
    const z = L.z; t(ctx, s.home, 14, 26, z, F.black, V.ink);
    const xv = 14 + (L.wh * z) / 15 + 6; t(ctx, 'vs', xv, 26, z * 0.8, F.sb, V.muted2);
    font(ctx, z * 0.8, F.sb); t(ctx, s.away, xv + ctx.measureText('vs').width + 6, 26, z, F.black, V.ink);
  } else {
    fitT(ctx, s.home, 14, 25, 14, 9, L.maxW, F.black, V.ink);
    t(ctx, 'vs', 14, 42, 11, F.sb, V.muted2);
    fitT(ctx, s.away, 32, 42, 14, 9, L.maxW - 18, F.black, V.ink);
  }
  clock(ctx, 19, 39.5 + ex, 3.6, V.muted2);
  fitT(ctx, s.kickoff_label + (s.league ? ' · ' + s.league : ''), 27, 43 + ex, 10.5, 7, 245, F.sb, V.muted2);
  const pulse = o.badgePulse || 0;
  ctx.save(); ctx.translate(313, 29); ctx.scale(1 + 0.12 * pulse, 1 + 0.12 * pulse); ctx.translate(-313, -29);
  inset(ctx, 280, 10, 66, 38, 12, k, 'rgba(20,27,45,1)');
  rr(ctx, 280, 10, 66, 38, 12); ctx.strokeStyle = 'rgba(51,217,142,0.22)'; ctx.lineWidth = 1; ctx.stroke();
  const pct = '+' + Number(s.profit_pct).toFixed(2);
  font(ctx, 13.5, F.black); const pw = ctx.measureText(pct).width; font(ctx, 9, F.xb); const cw = ctx.measureText('%').width;
  ctx.save(); ctx.shadowColor = 'rgba(51,217,142,0.7)'; ctx.shadowBlur = (8 + 20 * pulse) * k;
  t(ctx, pct, 313 - (pw + cw + 1) / 2, 31, 13.5, F.black, V.emerald); ctx.restore();
  t(ctx, '%', 313 + (pw - cw) / 2 + 1, 31, 9, F.xb, 'rgba(51,217,142,0.55)');
  t(ctx, 'PROFIT', 313, 42, 6.5, F.xb, 'rgba(51,217,142,0.5)', 'center');
  ctx.restore();
  const cy = 58 + ex;
  font(ctx, 9.5, F.xb); const sw = ctx.measureText(s.sport_label.toUpperCase()).width + 34;
  inset(ctx, 14, cy, sw, 22, 8, k);
  const em = env.emoji[s.sport_emoji]; if (em) ctx.drawImage(em, 21, cy + 5, 12, 12);
  t(ctx, s.sport_label.toUpperCase(), 37, cy + 15, 9.5, F.xb, V.muted2);
  const mx = 14 + sw + 8, ml = String(s.market_label).toUpperCase();
  const mz = fitSingle(ctx, ml, F.black, 11, 7, 360 - 14 - mx - 20); const mw = ctx.measureText(ml).width + 20;
  rr(ctx, mx, cy, mw, 22, 8); ctx.fillStyle = 'rgba(129,140,248,0.13)'; ctx.fill();
  t(ctx, ml, mx + 10, cy + 15, mz, F.black, '#BFC8F2');
  const ly = 90 + ex;
  s.legs.forEach((l, i) => {
    const x = 14 + i * 170, g = (o.glow || [])[i] || 0;
    inset(ctx, x, ly, 162, 66, 12, k);
    if (g > 0) { ctx.save(); ctx.globalAlpha = g; rr(ctx, x, ly, 162, 66, 12); ctx.strokeStyle = V.emerald; ctx.lineWidth = 2; ctx.shadowColor = V.emerald; ctx.shadowBlur = 18 * k; ctx.stroke(); ctx.stroke(); ctx.restore(); }
    if (l.top) t(ctx, String(l.top).toUpperCase(), x + 10, ly + 17, 8.5, F.xb, V.muted2);
    fitT(ctx, l.main, x + 10, ly + (l.top ? 32 : 26), 13, 8, 142, F.black, V.ink);
    bookLogo(ctx, env.bookLogos[i], x + 10, ly + 48, 17, 86, l.book_name, F);
    t(ctx, 'COTE', x + 152, ly + 43, 7, F.xb, V.muted2, 'right');
    t(ctx, Number(l.odd).toFixed(2), x + 152, ly + 58, 15, F.black, V.ink, 'right');
  });
  calcButton(ctx, 0, 164 + ex, 360, 42, 0, F, o.press || 0);
  ctx.restore();
}
