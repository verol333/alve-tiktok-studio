// Schémas animés de la vidéo longue (panneau de droite) : ils expliquent
// ce que les écrans seuls ne disent pas (principe de l'arbitrage, mises
// discrètes, vitesse du robot, levier des comptes, protections, coupon).
// Chaque schéma suit la voix : T(f) = instant où la voix a lu la fraction f.
import { prog, easeOut, easeBack, rgba, rr, font } from './draw.mjs';

const X0 = 1130, PW = 640, CXP = X0 + PW / 2;
const INK = '#E7ECFB', MUTE = '#9AA4C6', G = '#33D98E', R = '#F87171', B = '#818CF8', GOLD = '#F3C969';
const ap = (lt, at, d) => easeOut(prog(lt, at, d || 0.5));
const fr = (n) => Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
const dec = (n) => n.toFixed(2).replace('.', ',');

function card(ctx, x, y, w, h, edge) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#26304B'); g.addColorStop(1, '#19213A');
  ctx.fillStyle = g; rr(ctx, x, y, w, h, 26); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = edge ? rgba(edge, 0.45) : 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 26); ctx.stroke();
}
function tx(ctx, s, x, y, size, fam, color, align) {
  font(ctx, size, fam); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(s), x, y);
}
function mark(ctx, x, y, r, color, p, ok) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); const z = easeBack(p); ctx.scale(z, z);
  ctx.fillStyle = rgba(color, 0.2); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  if (ok) { ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.1, r * 0.35); ctx.lineTo(r * 0.5, -r * 0.35); }
  else { ctx.moveTo(-r * 0.38, -r * 0.38); ctx.lineTo(r * 0.38, r * 0.38); ctx.moveTo(r * 0.38, -r * 0.38); ctx.lineTo(-r * 0.38, r * 0.38); }
  ctx.stroke(); ctx.restore();
}
function ripple(ctx, x, y, k) {
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.globalAlpha *= 1 - k; ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(x, y, 20 + 70 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function enter(ctx, p, dx, dy) { ctx.globalAlpha *= p; ctx.translate((dx || 0) * (1 - p), (dy == null ? 30 : dy) * (1 - p)); }
function sw(ctx, x, y, on) {
  ctx.fillStyle = on > 0.5 ? G : 'rgba(255,255,255,0.14)'; rr(ctx, x, y, 96, 54, 27); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + 27 + 42 * on, y + 27, 21, 0, Math.PI * 2); ctx.fill();
}

// ── Principe de l'arbitrage ──
function odds(ctx, F, lt, T, v) {
  const a = v.a || { book: 'Bookmaker A', pick: 'Victoire domicile', odd: 2.1 };
  const b = v.b || { book: 'Bookmaker B', pick: 'Nul ou victoire extérieur', odd: 2.05 };
  tx(ctx, 'MÊME MATCH · DEUX BOOKMAKERS', CXP, 205, 26, F.xb, MUTE, 'center');
  [[a, G, 240, T(0.06)], [b, B, 425, T(0.24)]].forEach(([l, c, y, at]) => {
    const p = ap(lt, at, 0.6); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 90, 0);
    card(ctx, X0, y, PW, 160, c);
    ctx.fillStyle = c; rr(ctx, X0, y, 10, 160, 5); ctx.fill();
    tx(ctx, l.book.toUpperCase(), X0 + 44, y + 54, 24, F.xb, c);
    tx(ctx, l.pick, X0 + 44, y + 112, 34, F.sb, INK);
    tx(ctx, dec(l.odd), X0 + PW - 40, y + 112, 76, F.display, c, 'right');
    ctx.restore();
  });
  const p3 = ap(lt, T(0.46), 0.5);
  if (p3 > 0) {
    ctx.save(); enter(ctx, p3);
    ctx.fillStyle = rgba(G, 0.14); rr(ctx, X0 + 40, 612, PW - 80, 76, 38); ctx.fill();
    mark(ctx, X0 + 90, 650, 22, G, p3, true);
    tx(ctx, 'Tous les résultats sont couverts', X0 + 128, 662, 32, F.xb, INK);
    ctx.restore();
  }
  const p4 = ap(lt, T(0.7), 0.6);
  if (p4 > 0) {
    const inv = 1 / a.odd + 1 / b.odd, pct = (1 / inv - 1) * 100;
    ctx.save(); enter(ctx, p4);
    card(ctx, X0, 720, PW, 200, G);
    tx(ctx, '1/' + dec(a.odd) + ' + 1/' + dec(b.odd) + ' = ' + inv.toFixed(3).replace('.', ',') + '  < 1', CXP, 782, 34, F.sb, MUTE, 'center');
    const k = easeOut(prog(lt, T(0.72), 1.2));
    tx(ctx, '+' + (pct * k).toFixed(1).replace('.', ',') + ' %', CXP, 880, 92, F.display, G, 'center');
    ctx.restore();
  }
}

// ── Mises discrètes ──
function discret(ctx, F, lt, T, v) {
  const onAt = T(0.12), on = easeOut(prog(lt, onAt, 0.3));
  const p0 = ap(lt, 0.1, 0.6);
  ctx.save(); enter(ctx, p0);
  card(ctx, X0, 180, PW, 140, on > 0.5 ? G : null);
  ctx.fillStyle = on > 0.5 ? G : '#141B2D'; ctx.beginPath(); ctx.arc(X0 + 72, 250, 34, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = on > 0.5 ? '#FFFFFF' : MUTE; ctx.lineWidth = 5; ctx.beginPath();
  ctx.moveTo(X0 + 72, 226); ctx.lineTo(X0 + 92, 234); ctx.lineTo(X0 + 90, 256); ctx.quadraticCurveTo(X0 + 86, 270, X0 + 72, 276);
  ctx.quadraticCurveTo(X0 + 58, 270, X0 + 54, 256); ctx.lineTo(X0 + 52, 234); ctx.closePath(); ctx.stroke();
  tx(ctx, 'Mises discrètes', X0 + 130, 244, 36, F.xb, INK);
  tx(ctx, 'Arrondit à des montants normaux', X0 + 130, 286, 24, F.sb, MUTE);
  sw(ctx, X0 + PW - 136, 223, on);
  ripple(ctx, X0 + PW - 88, 250, prog(lt, onAt - 0.25, 0.7));
  ctx.restore();
  const rows = v.rows || [['Bookmaker A', 4939, 4950], ['Bookmaker B', 5061, 5050]];
  rows.forEach(([book, exact, round], i) => {
    const y = 360 + i * 150, p = ap(lt, 0.3 + i * 0.2, 0.6); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 60, 0);
    card(ctx, X0, y, PW, 120);
    tx(ctx, book, X0 + 40, y + 74, 30, F.sb, MUTE);
    const c = on > 0.5 ? G : R;
    const flip = easeOut(prog(lt, onAt + 0.15 + i * 0.12, 0.35));
    ctx.save(); ctx.globalAlpha *= 1 - flip;
    tx(ctx, fr(exact) + ' F', X0 + PW - 40, y + 82, 60, F.display, R, 'right'); ctx.restore();
    ctx.save(); ctx.globalAlpha *= flip; ctx.translate(0, 20 * (1 - flip));
    tx(ctx, fr(round) + ' F', X0 + PW - 40, y + 82, 60, F.display, c, 'right'); ctx.restore();
    ctx.restore();
  });
  const p3 = ap(lt, 0.5, 0.5);
  if (p3 > 0) {
    ctx.save(); enter(ctx, p3);
    const ok = on > 0.5;
    ctx.fillStyle = rgba(ok ? G : R, 0.14); rr(ctx, X0, 680, PW, 84, 42); ctx.fill();
    mark(ctx, X0 + 52, 722, 22, ok ? G : R, 1, ok);
    tx(ctx, ok ? 'Des mises de parieur normal' : 'Montants au franc près : repéré', X0 + 92, 734, 30, F.xb, INK);
    ctx.restore();
  }
  const p4 = ap(lt, T(0.7), 0.6);
  if (p4 > 0) {
    ctx.save(); enter(ctx, p4);
    tx(ctx, 'Bénéfice toujours garanti', CXP, 850, 44, F.black, G, 'center');
    tx(ctx, 'Le total misé ne dépasse jamais votre capital', CXP, 900, 26, F.sb, MUTE, 'center');
    ctx.restore();
  }
}

// ── Les trois résultats ──
function outcomes(ctx, F, lt, T, v) {
  const total = v.total || 10000;
  const rows = v.rows || [['Domicile gagne', 10395], ['Match nul', 10353], ['Extérieur gagne', 10353]];
  tx(ctx, 'POUR ' + fr(total) + ' F MISÉS AU TOTAL', CXP, 210, 28, F.xb, MUTE, 'center');
  const at = [T(0.08), T(0.36), T(0.52)];
  rows.forEach(([lab, amt], i) => {
    const y = 250 + i * 140, p = ap(lt, at[i], 0.6); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 70, 0);
    card(ctx, X0, y, PW, 112, G);
    tx(ctx, lab, X0 + 40, y + 70, 34, F.sb, INK);
    const k = easeOut(prog(lt, at[i], 0.9));
    tx(ctx, fr(total + (amt - total) * k) + ' F', X0 + PW - 40, y + 76, 58, F.display, G, 'right');
    ctx.restore();
  });
  const pf = prog(lt, T(0.76), 0.7);
  if (pf > 0) {
    const min = Math.min(...rows.map((r) => r[1])) - total;
    ctx.save(); ctx.translate(CXP, 800); const z = easeBack(pf); ctx.scale(z, z);
    ctx.shadowColor = rgba(G, 0.6); ctx.shadowBlur = 50;
    ctx.fillStyle = G; rr(ctx, -250, -95, 500, 190, 40); ctx.fill(); ctx.shadowBlur = 0;
    tx(ctx, '+' + fr(min) + ' F', 0, 20, 110, F.display, '#0A0F1E', 'center');
    tx(ctx, (v.min_label || 'MINIMUM GARANTI'), 0, 70, 30, F.xb, '#0A0F1E', 'center');
    ctx.restore();
  }
}

// ── Vitesse : à la main contre le robot ──
function speed(ctx, F, lt, T) {
  const lanes = [
    { y: 200, title: 'À la main', color: R, at: T(0.05), len: 3.2, secs: 45, end: 'Cote disparue', ok: false },
    { y: 480, title: 'Robot AL VE CAPITAL', color: G, at: T(0.55), len: 0.8, secs: 2, end: '2 paris placés', ok: true },
  ];
  for (const l of lanes) {
    const p = ap(lt, l.at - 0.4, 0.5); if (p <= 0) continue;
    ctx.save(); enter(ctx, p, 60, 0);
    card(ctx, X0, l.y, PW, 230, l.color);
    tx(ctx, l.title, X0 + 40, l.y + 64, 36, F.xb, INK);
    const k = prog(lt, l.at, l.len);
    tx(ctx, Math.max(0, Math.round(l.secs * k)) + ' s', X0 + PW - 40, l.y + 66, 54, F.display, l.color, 'right');
    ctx.fillStyle = 'rgba(10,15,30,0.9)'; rr(ctx, X0 + 40, l.y + 104, PW - 80, 26, 13); ctx.fill();
    ctx.fillStyle = l.color; rr(ctx, X0 + 40, l.y + 104, Math.max(26, (PW - 80) * k), 26, 13); ctx.fill();
    const e = prog(lt, l.at + l.len, 0.4);
    if (e > 0) { mark(ctx, X0 + 64, l.y + 180, 22, l.color, e, l.ok); ctx.save(); ctx.globalAlpha *= e; tx(ctx, l.end, X0 + 102, l.y + 192, 32, F.xb, l.color); ctx.restore(); }
    ctx.restore();
  }
  const p3 = ap(lt, T(0.8), 0.6);
  if (p3 > 0) { ctx.save(); enter(ctx, p3); tx(ctx, 'Jour et nuit · même téléphone fermé', CXP, 800, 34, F.xb, INK, 'center'); ctx.restore(); }
}

// ── Le levier : plus de comptes ──
function leverage(ctx, F, lt, T) {
  const L = [
    { n: 1, label: '1 compte', note: 'Aucun pari possible', w: 0.08, c: R, at: T(0.02) },
    { n: 2, label: '2 comptes', note: 'Le minimum — déjà des gains', w: 0.42, c: GOLD, at: T(0.14) },
    { n: 4, label: '4 comptes et plus', note: "Beaucoup plus d'occasions", w: 1, c: G, at: T(0.3) },
  ];
  L.forEach((l, i) => {
    const y = 170 + i * 165, p = ap(lt, l.at, 0.5); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 60, 0);
    card(ctx, X0, y, PW, 145);
    for (let d = 0; d < l.n; d++) { ctx.fillStyle = rgba(l.c, 0.85); ctx.beginPath(); ctx.arc(X0 + 50 + d * 40, y + 46, 14, 0, Math.PI * 2); ctx.fill(); }
    tx(ctx, l.label, X0 + PW - 36, y + 56, 32, F.xb, l.c, 'right');
    ctx.fillStyle = 'rgba(10,15,30,0.9)'; rr(ctx, X0 + 36, y + 78, PW - 72, 18, 9); ctx.fill();
    const k = easeOut(prog(lt, l.at + 0.2, 1.1));
    ctx.fillStyle = l.c; rr(ctx, X0 + 36, y + 78, Math.max(18, (PW - 72) * l.w * k), 18, 9); ctx.fill();
    tx(ctx, l.note, X0 + 36, y + 128, 24, F.sb, MUTE);
    ctx.restore();
  });
  const p4 = ap(lt, T(0.62), 0.6);
  if (p4 > 0) {
    ctx.save(); enter(ctx, p4);
    card(ctx, X0, 680, PW, 250, G);
    tx(ctx, '10 000 F SUR 4 BOOKMAKERS', CXP, 736, 28, F.xb, MUTE, 'center');
    const k = easeOut(prog(lt, T(0.64), 1.4));
    tx(ctx, fr(1000 * k) + ' à ' + fr(1800 * k) + ' F', CXP, 832, 76, F.display, G, 'center');
    tx(ctx, 'par jour · estimation, davantage le week-end', CXP, 890, 24, F.sb, MUTE, 'center');
    ctx.restore();
  }
}

// ── Protections ──
function shield(ctx, F, lt, T, v) {
  const items = v.items || ['Mises arrondies comme un humain', 'Cote revérifiée avant chaque pari', 'Couverture si un pari est refusé'];
  tx(ctx, 'PROTECTIONS INTÉGRÉES', CXP, 215, 28, F.xb, MUTE, 'center');
  const at = [T(0.12), T(0.42), T(0.66)];
  items.forEach((it, i) => {
    const y = 260 + i * 190, p = ap(lt, at[i] - 0.3, 0.5); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 60, 0);
    card(ctx, X0, y, PW, 160, G);
    mark(ctx, X0 + 80, y + 80, 36, G, prog(lt, at[i], 0.4), true);
    const words = String(it).split(' '), half = Math.ceil(words.length / 2);
    const two = it.length > 22;
    tx(ctx, two ? words.slice(0, half).join(' ') : it, X0 + 148, y + (two ? 70 : 92), 34, F.xb, INK);
    if (two) tx(ctx, words.slice(half).join(' '), X0 + 148, y + 118, 34, F.xb, INK);
    ctx.restore();
  });
}

// ── Générateur de coupon ──
const CP = { cote: '5.00', code: 'ALV7K2Q' };
function couponTimes(T) {
  const t0 = T(0.06), press = t0 + CP.cote.length * 0.2 + 0.5, load = press + 1.1;
  return { t0, press, load, code: T(0.62), copied: T(0.62) + CP.code.length * 0.09 + 0.5 };
}
function coupon(ctx, F, lt, T) {
  const c = couponTimes(T);
  const p0 = ap(lt, 0.05, 0.5);
  ctx.save(); enter(ctx, p0);
  card(ctx, X0, 160, PW, 130);
  tx(ctx, 'COTE VISÉE', X0 + 40, 206, 24, F.xb, MUTE);
  const n = Math.floor(Math.max(0, lt - c.t0) / 0.2 + (lt >= c.t0 ? 1 : 0));
  const typed = CP.cote.slice(0, Math.min(CP.cote.length, n));
  tx(ctx, typed, X0 + 40, 266, 52, F.display, INK);
  font(ctx, 52, F.display);
  if (Math.floor(lt * 2.4) % 2 === 0 && lt < c.press) { ctx.fillStyle = G; ctx.fillRect(X0 + 46 + ctx.measureText(typed).width, 224, 5, 48); }
  ctx.restore();
  const pb = ap(lt, c.t0 + 0.3, 0.5);
  if (pb > 0) {
    ctx.save(); enter(ctx, pb);
    const down = lt > c.press - 0.08 && lt < c.press + 0.12 ? 0.96 : 1;
    ctx.translate(CXP, 350); ctx.scale(down, down);
    const g = ctx.createLinearGradient(-PW / 2, 0, PW / 2, 0); g.addColorStop(0, '#FB923C'); g.addColorStop(1, '#F97316');
    ctx.fillStyle = g; rr(ctx, -PW / 2, -40, PW, 80, 22); ctx.fill();
    const loading = lt > c.press && lt < c.load;
    tx(ctx, loading ? 'Analyse des matchs' + '.'.repeat(1 + Math.floor(lt * 4) % 3) : 'Générer mon coupon', 0, 12, 32, F.xb, '#FFFFFF', 'center');
    ctx.restore();
    ripple(ctx, CXP + 120, 350, prog(lt, c.press - 0.1, 0.7));
  }
  const sel = [['Match 1 · Plus de 1,5 but', 1.45], ['Match 2 · Double chance', 1.62], ['Match 3 · Les deux marquent', 2.1]];
  sel.forEach(([lab, o], i) => {
    const y = 420 + i * 92, p = ap(lt, c.load + i * 0.25, 0.45); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 50, 0);
    card(ctx, X0, y, PW, 78);
    tx(ctx, lab, X0 + 32, y + 50, 28, F.sb, INK);
    tx(ctx, dec(o), X0 + PW - 32, y + 52, 36, F.display, G, 'right');
    ctx.restore();
  });
  const pt = ap(lt, c.load + 0.85, 0.4);
  if (pt > 0) { ctx.save(); ctx.globalAlpha *= pt; tx(ctx, 'Cote totale ' + dec(1.45 * 1.62 * 2.1), X0 + PW - 20, 725, 30, F.xb, GOLD, 'right'); ctx.restore(); }
  const pc = ap(lt, c.code - 0.4, 0.5);
  if (pc > 0) {
    ctx.save(); enter(ctx, pc);
    card(ctx, X0, 760, PW, 160, G);
    tx(ctx, 'CODE COUPON', X0 + 40, 808, 24, F.xb, MUTE);
    const m = Math.max(0, Math.min(CP.code.length, Math.floor((lt - c.code) / 0.09) + 1));
    tx(ctx, lt >= c.code ? CP.code.slice(0, m) : '', X0 + 40, 884, 64, F.display, G);
    const pk = prog(lt, c.copied, 0.4);
    if (pk > 0) { mark(ctx, X0 + PW - 150, 862, 22, G, pk, true); ctx.save(); ctx.globalAlpha *= pk; tx(ctx, 'Copié', X0 + PW - 40, 874, 30, F.xb, G, 'right'); ctx.restore(); }
    ctx.restore();
  }
}

// ── Scan des opérateurs en temps réel (logos) ──
function books(ctx, F, lt, T, v) {
  const L = (v.logos || []).slice(0, 12), hi = v.hi || [], cols = 3, cw = 196, ch = 120, gap = 26;
  const blink = 0.5 + 0.5 * Math.sin(lt * 6);
  ctx.fillStyle = rgba(G, 0.35 + 0.65 * blink); ctx.beginPath(); ctx.arc(CXP - 175, 196, 9, 0, Math.PI * 2); ctx.fill();
  tx(ctx, 'SCAN EN TEMPS RÉEL', CXP + 12, 205, 26, F.xb, MUTE, 'center');
  const found = lt > T(0.62);
  L.forEach((b, i) => {
    const x = X0 + (i % cols) * (cw + gap), y = 240 + Math.floor(i / cols) * (ch + 20);
    const p = ap(lt, T(0.02) + i * 0.07, 0.45); if (p <= 0) return;
    const lit = prog(lt, T(0.25) + i * 0.12, 0.3), on = found && hi.includes(b.name);
    ctx.save(); enter(ctx, p, 0, 24);
    card(ctx, x, y, cw, ch, on ? G : lit > 0 && lit < 1 ? B : null);
    if (found && !on) { ctx.globalAlpha *= 0.45; }
    const img = v._imgs && v._imgs[i];
    if (img && img.width) { const k = Math.min(150 / img.width, 56 / img.height), w = img.width * k, hh = img.height * k; ctx.drawImage(img, x + (cw - w) / 2, y + 20 + (56 - hh) / 2, w, hh); }
    else tx(ctx, b.name, x + cw / 2, y + 60, 26, F.xb, INK, 'center');
    tx(ctx, lit >= 1 ? 'scanné' : lit > 0 ? 'lecture…' : '', x + cw / 2, y + 104, 20, F.sb, lit >= 1 ? (on ? G : MUTE) : B, 'center');
    ctx.restore();
    if (on) mark(ctx, x + cw - 20, y + 20, 16, G, prog(lt, T(0.62), 0.4), true);
  });
  const rows = Math.ceil(L.length / cols), sp = prog(lt, T(0.25), Math.max(0.6, L.length * 0.12 + 0.3));
  if (sp > 0 && sp < 1) {
    const y = 240 + sp * rows * (ch + 20), g = ctx.createLinearGradient(0, y - 34, 0, y + 34);
    g.addColorStop(0, rgba(G, 0)); g.addColorStop(0.5, rgba(G, 0.35)); g.addColorStop(1, rgba(G, 0));
    ctx.fillStyle = g; ctx.fillRect(X0 - 10, y - 34, PW + 20, 68);
  }
  const pb = ap(lt, T(0.62), 0.5);
  if (pb > 0) { ctx.save(); enter(ctx, pb); card(ctx, X0, 820, PW, 100, G); tx(ctx, L.length + ' opérateurs · écart de cote repéré', CXP, 882, 30, F.xb, INK, 'center'); ctx.restore(); }
}

// ── Code de confirmation reçu par mail ──
const otpPress = (T) => T(0.36) + 6 * 0.22 + 0.4;
function otp(ctx, F, lt, T, v) {
  const code = String(v.code || '482913');
  const pn = ap(lt, T(0.02), 0.6);
  if (pn > 0) {
    ctx.save(); enter(ctx, pn, 0, -60); card(ctx, X0, 190, PW, 150, B);
    ctx.fillStyle = rgba(B, 0.2); rr(ctx, X0 + 30, 225, 80, 80, 22); ctx.fill();
    ctx.strokeStyle = B; ctx.lineWidth = 5; rr(ctx, X0 + 48, 248, 44, 34, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X0 + 49, 252); ctx.lineTo(X0 + 70, 268); ctx.lineTo(X0 + 91, 252); ctx.stroke();
    tx(ctx, 'AL VE CAPITAL · maintenant', X0 + 136, 250, 22, F.sb, MUTE);
    tx(ctx, 'Ton code : ' + code.slice(0, 3) + ' ' + code.slice(3), X0 + 136, 302, 38, F.xb, INK);
    ctx.restore();
  }
  const pb = ap(lt, T(0.3), 0.5), t0 = T(0.36);
  if (pb > 0) {
    ctx.save(); enter(ctx, pb);
    tx(ctx, 'CODE DE CONFIRMATION', CXP, 420, 24, F.xb, MUTE, 'center');
    tx(ctx, v.email || '', CXP, 462, 26, F.sb, MUTE, 'center');
    const bw = 88, g = 22, x0 = CXP - (6 * bw + 5 * g) / 2;
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * (bw + g), on = lt >= t0 + i * 0.22, cur = !on && (i === 0 || lt >= t0 + (i - 1) * 0.22);
      card(ctx, x, 500, bw, 110, on ? G : cur ? B : null);
      if (on) { const k = Math.max(0.01, easeBack(prog(lt, t0 + i * 0.22, 0.25))); ctx.save(); ctx.translate(x + bw / 2, 578); ctx.scale(k, k); tx(ctx, code[i], 0, 0, 60, F.display, INK, 'center'); ctx.restore(); }
    }
    ctx.restore();
  }
  const press = otpPress(T), pc = ap(lt, press - 0.4, 0.4);
  if (pc > 0) {
    ctx.save(); enter(ctx, pc); const done = lt > press + 0.15;
    ctx.fillStyle = G; rr(ctx, X0 + 40, 680, PW - 80, 100, 50); ctx.fill();
    tx(ctx, done ? 'Compte confirmé  ✓' : 'Confirmer', CXP, 745, 38, F.xb, '#0A0F1E', 'center');
    ctx.restore();
    ripple(ctx, CXP + 120, 730, prog(lt, press, 0.6));
  }
  const pd = ap(lt, press + 0.4, 0.5);
  if (pd > 0) { ctx.save(); enter(ctx, pd); mark(ctx, CXP - 190, 862, 24, G, pd, true); tx(ctx, 'Accès à tout le site', CXP - 150, 874, 32, F.xb, INK); ctx.restore(); }
}


function fitTx(ctx, s, x, y, size, min, maxW, fam, color, align) {
  let z = size; font(ctx, z, fam);
  while (z > min && ctx.measureText(String(s)).width > maxW) { z -= 2; font(ctx, z, fam); }
  ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(s), x, y);
}
function logoAt(ctx, img, cx, cy, size) {
  if (!img || !img.width) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(cx, cy, size / 2, 0, Math.PI * 2); ctx.fill(); return; }
  const k = Math.min(size / img.width, size / img.height), w = img.width * k, h = img.height * k;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}
const scoreTxt = (s) => String(s || '').replace(/\s*[-:]\s*/, ' - ');
const proofAt = (T, i, n) => ({ at: T(0.08 + i * (0.8 / n)), ok: T(0.08 + (i + 1) * (0.8 / n)) - 0.35 });

// ── Nos prédictions d'hier, validées ──
function proof(ctx, F, lt, T, v) {
  const rows = (v.rows || []).slice(0, 3), n = rows.length || 1, hgt = 150, gap = 22, y0 = 200 + (3 - n) * 40;
  rows.forEach((r, i) => {
    const y = y0 + i * (hgt + gap), tm = proofAt(T, i, n), p = ap(lt, tm.at, 0.5);
    if (p <= 0) return;
    const ok = lt > tm.ok;
    ctx.save(); enter(ctx, p, 80, 0);
    card(ctx, X0, y, PW, hgt, ok ? G : null);
    logoAt(ctx, v._imgs && v._imgs[i * 2], X0 + 58, y + 52, 58);
    logoAt(ctx, v._imgs && v._imgs[i * 2 + 1], X0 + 128, y + 52, 58);
    fitTx(ctx, r.home + '  ' + scoreTxt(r.score) + '  ' + r.away, X0 + 176, y + 66, 32, 18, PW - 270, F.xb, INK);
    fitTx(ctx, r.label, X0 + 36, y + 122, 28, 18, PW - 140, F.sb, MUTE);
    ctx.restore();
    mark(ctx, X0 + PW - 56, y + hgt / 2, 34, G, prog(lt, tm.ok, 0.4), true);
  });
  const pb = ap(lt, T(0.9), 0.5);
  if (pb > 0 && v.badge) {
    ctx.save(); enter(ctx, pb);
    ctx.fillStyle = rgba(G, 0.16); rr(ctx, X0 + 40, 790, PW - 80, 90, 45); ctx.fill();
    ctx.strokeStyle = rgba(G, 0.6); ctx.lineWidth = 2; ctx.stroke();
    fitTx(ctx, v.badge, CXP, 848, 38, 22, PW - 120, F.xb, G, 'center');
    ctx.restore();
  }
}

// ── Un match du jour et notre prédiction la plus fiable ──
function pick(ctx, F, lt, T, v) {
  tx(ctx, "AUJOURD'HUI" + (v.time ? ' · ' + v.time : ''), CXP, 205, 26, F.xb, MUTE, 'center');
  const p1 = ap(lt, T(0.02), 0.6);
  if (p1 > 0) {
    ctx.save(); enter(ctx, p1);
    card(ctx, X0, 235, PW, 230, null);
    const z = Math.max(0.01, 0.85 + 0.15 * easeBack(prog(lt, T(0.02), 0.6)));
    [[0, X0 + 150, v.home], [1, X0 + PW - 150, v.away]].forEach(([k, cx, name]) => {
      ctx.save(); ctx.translate(cx, 320); ctx.scale(z, z); logoAt(ctx, v._imgs && v._imgs[k], 0, 0, 104); ctx.restore();
      fitTx(ctx, name, cx, 430, 30, 18, 250, F.xb, INK, 'center');
    });
    tx(ctx, 'VS', CXP, 336, 44, F.display, rgba(INK, 0.5), 'center');
    ctx.restore();
  }
  if (v.score) {
    const ps = ap(lt, T(0.3), 0.5);
    if (ps > 0) { ctx.save(); enter(ctx, ps); ctx.fillStyle = rgba(B, 0.16); rr(ctx, X0 + 80, 490, PW - 160, 64, 32); ctx.fill(); fitTx(ctx, 'Score à fort potentiel : ' + scoreTxt(v.score), CXP, 533, 28, 18, PW - 200, F.sb, INK, 'center'); ctx.restore(); }
  }
  const pp = ap(lt, T(0.48), 0.5);
  if (pp > 0) {
    ctx.save(); enter(ctx, pp, 0, 40);
    card(ctx, X0, 580, PW, 240, G);
    ctx.fillStyle = G; rr(ctx, X0, 580, 10, 240, 5); ctx.fill();
    tx(ctx, 'NOTRE PRÉDICTION LA PLUS FIABLE', X0 + 40, 626, 22, F.xb, G);
    fitTx(ctx, v.label, X0 + 40, 684, 38, 20, PW - 80, F.xb, INK);
    const pc = ap(lt, T(0.72), 0.5);
    if (pc > 0) {
      tx(ctx, 'COTE', X0 + 40, 740, 22, F.sb, MUTE);
      ctx.save(); const k = Math.max(0.01, easeBack(pc)); ctx.translate(X0 + 40, 800); ctx.scale(k, k); tx(ctx, dec(v.cote), 0, 0, 64, F.display, G); ctx.restore();
    }
    const pf = prog(lt, T(0.86), 0.9);
    if (pf > 0) {
      tx(ctx, 'FIABILITÉ', X0 + PW - 40, 740, 22, F.sb, MUTE, 'right');
      tx(ctx, Math.round(v.conf * easeOut(pf)) + ' %', X0 + PW - 40, 798, 52, F.display, INK, 'right');
    }
    ctx.restore();
  }
  const pf = prog(lt, T(0.86), 0.9);
  if (pf > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; rr(ctx, X0 + 40, 852, PW - 80, 22, 11); ctx.fill();
    ctx.fillStyle = G; rr(ctx, X0 + 40, 852, Math.max(22, (PW - 80) * (v.conf / 100) * easeOut(pf)), 22, 11); ctx.fill();
  }
}

// ── Le combiné du jour ──
function combo(ctx, F, lt, T, v) {
  const rows = v.rows || [], p0 = ap(lt, T(0.02), 0.5);
  if (p0 <= 0) return;
  ctx.save(); enter(ctx, p0);
  card(ctx, X0, 200, PW, 350 + rows.length * 110, GOLD);
  tx(ctx, 'COMBINÉ DU JOUR', X0 + 40, 252, 24, F.xb, GOLD);
  tx(ctx, rows.length + ' sélections', X0 + PW - 40, 252, 24, F.sb, MUTE, 'right');
  rows.forEach((r, i) => {
    const y = 285 + i * 110, p = ap(lt, T(0.05 + i * 0.12), 0.4); if (p <= 0) return;
    ctx.save(); enter(ctx, p, 60, 0);
    fitTx(ctx, r.match, X0 + 40, y + 34, 26, 16, PW - 200, F.sb, MUTE);
    fitTx(ctx, r.label, X0 + 40, y + 78, 32, 18, PW - 200, F.xb, INK);
    tx(ctx, dec(r.cote), X0 + PW - 40, y + 72, 44, F.display, G, 'right');
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(X0 + 40, y + 102, PW - 80, 2);
  });
  const yT = 285 + rows.length * 110 + 40, pt = prog(lt, T(0.5), 1.1);
  if (pt > 0) {
    tx(ctx, 'COTE TOTALE', CXP, yT + 30, 26, F.xb, MUTE, 'center');
    tx(ctx, dec(1 + (v.total - 1) * easeOut(pt)), CXP, yT + 140, 110, F.display, GOLD, 'center');
  }
  ctx.restore();
}

export const VISUALS = { odds, discret, outcomes, speed, leverage, shield, coupon, books, otp, proof, pick, combo };

// Bruitages propres à chaque schéma (instants relatifs au début de la scène).
export function visualSfx(type, T) {
  const ev = [];
  if (type === 'odds') ev.push(['pop', T(0.06)], ['pop', T(0.24)], ['ding', T(0.46)], ['rise', T(0.62)], ['impact', T(0.72)]);
  if (type === 'discret') { ev.push(['tap', T(0.12) - 0.05], ['pop', T(0.12) + 0.2], ['pop', T(0.12) + 0.32], ['ding', T(0.7)]); }
  if (type === 'outcomes') ev.push(['pop', T(0.08)], ['pop', T(0.36)], ['pop', T(0.52)], ['impact', T(0.78)], ['ding', T(0.78)]);
  if (type === 'speed') ev.push(['whoosh', T(0.55)], ['tap', T(0.55) + 0.8], ['ding', T(0.55) + 0.85]);
  if (type === 'leverage') ev.push(['pop', T(0.02)], ['pop', T(0.14)], ['pop', T(0.3)], ['rise', T(0.58)], ['ding', T(0.66)]);
  if (type === 'shield') ev.push(['ding', T(0.12)], ['ding', T(0.42)], ['ding', T(0.66)]);
  if (type === 'coupon') {
    const c = couponTimes(T);
    for (let i = 0; i < CP.cote.length; i++) ev.push(['key', c.t0 + i * 0.2]);
    ev.push(['tap', c.press - 0.05], ['pop', c.load], ['pop', c.load + 0.25], ['pop', c.load + 0.5]);
    for (let i = 0; i < CP.code.length; i++) ev.push(['key', c.code + i * 0.09]);
    ev.push(['ding', c.copied]);
  }
  if (type === 'proof') for (let i = 0; i < 3; i++) { const tm = proofAt(T, i, 3); ev.push(['pop', tm.at], ['ding', tm.ok]); }
  if (type === 'pick') ev.push(['pop', T(0.02)], ['pop', T(0.3)], ['pop', T(0.48)], ['impact', T(0.72)], ['rise', T(0.86)]);
  if (type === 'combo') ev.push(['pop', T(0.05)], ['pop', T(0.17)], ['rise', T(0.5)], ['ding', T(0.5) + 1.1]);
  if (type === 'books') ev.push(['pop', T(0.02)], ['rise', T(0.25)], ['ding', T(0.62)]);
  if (type === 'otp') { ev.push(['pop', T(0.02)]); for (let i = 0; i < 6; i++) ev.push(['key', T(0.36) + i * 0.22]); ev.push(['tap', otpPress(T) - 0.05], ['ding', otpPress(T) + 0.15]); }
  return ev;
}
