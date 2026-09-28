// Motion-design editorial graphics for the Lecture de Cotes strategy videos.
import { easeOut, rr } from './draw.mjs';
import { W, H, WHITE, MUTED, GREEN, AMBER, RED, INK, clamp, spring, smooth, label, pop, kinetic, counter, panel, arrow, check, camera, backdrop, brandTag } from './motionKit.mjs';
const SHOT_W = 1290, SHOT_H = 2796;
function header(ctx, env, L, lt) {
  kinetic(ctx, L.kicker || 'LA MÉTHODE', 960, 122, 29, env.F.xb, L.accent || GREEN, lt, 0, .02);
  kinetic(ctx, L.headline || 'Décoder le score exact', 960, 215, 68, env.F.display, WHITE, lt, .12, .028);
  const p = spring((lt - .5) * 1.4); ctx.fillStyle = L.accent || GREEN; ctx.fillRect(960 - 110 * p, 263, 220 * p, 6);
}
function flag(ctx, env, url, x, y, lt, t0) {
  const im = env.imgs?.[url];
  pop(ctx, lt, t0, x, y, () => {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 105, 0, Math.PI * 2); ctx.clip();
    if (im) { const k = 210 / Math.min(im.width, im.height); ctx.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k); }
    else { ctx.fillStyle = '#1A2940'; ctx.fillRect(-105, -105, 210, 210); }
    ctx.restore(); ctx.strokeStyle = WHITE; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 105, 0, Math.PI * 2); ctx.stroke();
  });
}
// Your real screenshot in a phone; the camera pushes in and the 2-2 cell is circled ON the capture.
function drawEvidence(ctx, env, s, lt) {
  const L = s.look, shot = env.imgs?.[L.shot];
  if (!shot) throw new Error('Capture introuvable');
  const ph = 970, pw = ph * SHOT_W / SHOT_H, sc = ph / SHOT_H, bx = 960 - pw / 2, by = 55;
  const box = L.box || [444, 1448, 841, 1672], fx = bx + (box[0] + box[2]) / 2 * sc, fy = by + (box[1] + box[3]) / 2 * sc;
  const z = smooth(clamp((lt - 1.2) / 1.3)), k = 1 + 2.1 * z;
  ctx.save();
  ctx.translate(fx + (560 - fx) * z, fy + (560 - fy) * z); ctx.scale(k, k); ctx.translate(-fx, -fy);
  pop(ctx, lt, 0, 960, 540, () => {
    ctx.translate(-960, -540);
    ctx.fillStyle = '#050A13'; rr(ctx, bx - 16, by - 16, pw + 32, ph + 32, 50); ctx.fill();
    ctx.save(); rr(ctx, bx, by, pw, ph, 34); ctx.clip(); ctx.drawImage(shot, bx, by, pw, ph); ctx.restore();
    ctx.strokeStyle = '#697B90'; ctx.lineWidth = 4; rr(ctx, bx - 16, by - 16, pw + 32, ph + 32, 50); ctx.stroke();
    // dim everything except the 2-2 cell once zoomed
    const d = clamp((lt - 2.4) / .5) * .55;
    if (d > 0) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,' + d + ')'; ctx.beginPath(); ctx.rect(bx, by, pw, ph); ctx.rect(bx + box[2] * sc, by + box[1] * sc, -(box[2] - box[0]) * sc, (box[3] - box[1]) * sc); ctx.fill('evenodd'); ctx.restore(); }
    const ring = easeOut(clamp((lt - 2.5) / .8)), pl = 1 + (lt > 3.3 ? Math.abs(Math.sin((lt - 3.3) * 3)) * .06 : 0);
    ctx.strokeStyle = AMBER; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(fx, fy, (box[2] - box[0]) * sc * .62 * pl, (box[3] - box[1]) * sc * .72 * pl, -.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke();
  }, 'up', 300);
  ctx.restore();
  pop(ctx, lt, 3.2, 1450, 420, () => { panel(ctx, 700, 190, AMBER, lt, 3.2); label(ctx, 'SCORE EXACT 2-2', 0, -40, 34, env.F.xb, AMBER); counter(ctx, 'COTE 10', 0, 35, 70, env.F.display, WHITE, lt, 3.3); }, 'right', 400);
  pop(ctx, lt, 4, 1450, 640, () => { check(ctx, -250, 0, 44, clamp((lt - 4) * 2)); label(ctx, 'Premier filtre validé', 40, 0, 44, env.F.xb, GREEN); }, 'right', 300);
  kinetic(ctx, L.headline || 'LA VRAIE CAPTURE', 1450, 150, 46, env.F.display, WHITE, lt, .2, .02);
}
function drawMatch(ctx, env, L, lt, vd) {
  const t1 = .9, t2 = Math.max(2, vd * .35), t3 = Math.max(3, vd * .6);
  flag(ctx, env, L.home_logo, 560, 400, lt, .15); flag(ctx, env, L.away_logo, 1360, 400, lt, .3);
  label(ctx, L.home || 'NORVÈGE', 560, 555, 44, env.F.xb); label(ctx, L.away || 'PORTUGAL', 1360, 555, 44, env.F.xb);
  const sc = lt < t3 ? 'VS' : (L.final || '1 – 2');
  pop(ctx, lt, lt < t3 ? .5 : t3, 960, 400, () => label(ctx, sc, 0, 0, lt < t3 ? 90 : 150, env.F.display, lt < t3 ? MUTED : WHITE));
  if (lt > t3) label(ctx, 'SCORE FINAL', 960, 505, 30, env.F.xb, AMBER);
  pop(ctx, lt, t1, 620, 740, () => { panel(ctx, 620, 150, AMBER, lt, t1); label(ctx, 'Score exact 2-2', -100, 0, 38, env.F.sb, MUTED); counter(ctx, '10', 170, 0, 70, env.F.display, WHITE, lt, t1); check(ctx, 250, 0, 32, clamp((lt - t1 - .9) * 2)); }, 'left', 380);
  pop(ctx, lt, t2, 1300, 740, () => { panel(ctx, 620, 150, GREEN, lt, t2); label(ctx, '2 équipes marquent', -90, 0, 38, env.F.sb, MUTED); counter(ctx, '1,49', 170, 0, 70, env.F.display, WHITE, lt, t2); check(ctx, 262, 0, 32, clamp((lt - t2 - .9) * 2)); }, 'right', 380);
  if (lt > t3 + .5) {
    const q = spring((lt - t3 - .5) * 1.6);
    ctx.save(); ctx.translate(960, 930); ctx.rotate(-.05); ctx.scale(q * 1.0, q * 1.0);
    ctx.fillStyle = GREEN; rr(ctx, -380, -55, 760, 110, 22); ctx.fill();
    label(ctx, 'LES DEUX ONT MARQUÉ · GAGNÉ', 0, 2, 46, env.F.display, INK); ctx.restore();
  }
}
function drawOptions(ctx, env, L, lt, vd) {
  const items = L.items || [], n = items.length, cw = n > 3 ? 400 : 520, gap = 30, x0 = 960 - ((cw + gap) * n - gap) / 2 + cw / 2;
  const focus = Math.min(n - 1, Math.floor(clamp((lt - .8) / Math.max(1, vd - .8)) * n));
  items.forEach((it, i) => {
    const t0 = .25 + i * .18, on = i === focus && lt > .8, col = it.color || GREEN;
    pop(ctx, lt, t0, x0 + i * (cw + gap), 590 - (on ? 22 : 0), () => {
      if (on) ctx.scale(1.06, 1.06); ctx.globalAlpha *= on || lt < .8 ? 1 : .5;
      panel(ctx, cw, 480, on ? col : '#33445E', lt, t0);
      label(ctx, it.tag || '', 0, -185, 24, env.F.xb, col);
      label(ctx, it.name, 0, -125, n > 3 ? 36 : 42, env.F.display, WHITE);
      ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(ctx, -cw / 2 + 30, -70, cw - 60, 150, 20); ctx.fill();
      label(ctx, 'SIGNAL', 0, -40, 22, env.F.xb, MUTED); label(ctx, it.rule, 0, 20, n > 3 ? 36 : 42, env.F.xb, AMBER);
      label(ctx, 'ON JOUE', 0, 125, 22, env.F.xb, MUTED); label(ctx, it.pick, 0, 175, n > 3 ? 32 : 38, env.F.xb, col);
    }, 'up', 300);
  });
}
function drawBrand(ctx, env, L, lt) {
  const q = spring(lt * 1.2);
  ctx.save(); ctx.translate(960, 420); ctx.scale(q, q); ctx.rotate((1 - q) * .2);
  ctx.fillStyle = GREEN; rr(ctx, -80, -80, 160, 160, 40); ctx.fill(); label(ctx, 'AV', 0, 4, 78, env.F.display, INK); ctx.restore();
  kinetic(ctx, 'AL VE CAPITAL', 960, 590, 120, env.F.display, WHITE, lt, .4, .05);
  kinetic(ctx, L.kicker || 'LECTURE DE COTES', 960, 690, 40, env.F.xb, AMBER, lt, 1.1, .03);
  if (L.url) pop(ctx, lt, 1.8, 960, 830, () => { ctx.fillStyle = WHITE; rr(ctx, -440, -52, 880, 104, 52); ctx.fill(); label(ctx, L.url, 0, 2, 46, env.F.xb, INK); }, 'up', 120);
}
function drawHook(ctx, env, L, lt) {
  const spin = lt < 1.4 ? String(1 + Math.floor(lt * 37) % 9) + ' - ' + String(Math.floor(lt * 23) % 5) : '2 - 2';
  pop(ctx, lt, 0, 960, 430, () => { panel(ctx, 620, 330, AMBER, lt, 0); label(ctx, spin, 0, -20, 170, env.F.display, WHITE); if (lt > 1.4) counter(ctx, 'COTE 10', 0, 110, 56, env.F.xb, AMBER, lt, 1.4, .5); });
  kinetic(ctx, L.headline || '', 960, 760, 64, env.F.display, WHITE, lt, 1.7, .025);
  if (L.sub) kinetic(ctx, L.sub, 960, 860, 40, env.F.xb, GREEN, lt, 2.6, .02);
}
export function drawStrategy(ctx, env, s, lt) {
  const L = s.look, mode = L.mode || 'score', vd = s.voiceDur || 6;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  backdrop(ctx, env, L, lt);
  const hits = { evidence: [2.5, 3.2], score: [.35, .6, 1.4], compare: [.1, .35, .6, .85], verify: [.2, vd * .42, vd * .56], decision: [.2, .9], match: [.9, vd * .35, vd * .6], hook: [1.4], brand: [.4, 1.8] }[mode] || [.15, .48, .81];
  ctx.save(); camera(ctx, s, lt, hits);
  let subs = true;
  if (mode === 'evidence') { drawEvidence(ctx, env, s, lt); subs = false; }
  else if (mode === 'match') drawMatch(ctx, env, L, lt, vd);
  else if (mode === 'hook') drawHook(ctx, env, L, lt);
  else if (mode === 'brand') drawBrand(ctx, env, L, lt);
  else {
    header(ctx, env, L, lt);
    if (mode === 'options') drawOptions(ctx, env, L, lt, vd);
    else if (mode === 'score') {
      pop(ctx, lt, .35, 480, 555, () => { panel(ctx, 560, 390, AMBER, lt, .35); label(ctx, 'SCORE EXACT', 0, -130, 32, env.F.xb, AMBER); kinetic(ctx, '2 : 2', 0, 20, 168, env.F.display, WHITE, lt, .55, .08); label(ctx, '4 buts, 2 de chaque côté', 0, 130, 34, env.F.sb, MUTED); }, 'left', 420);
      pop(ctx, lt, .6, 1440, 555, () => { panel(ctx, 560, 390, GREEN, lt, .6); label(ctx, 'LES DEUX MARQUENT', 0, -130, 31, env.F.xb, GREEN); kinetic(ctx, 'OUI', 0, 20, 132, env.F.display, WHITE, lt, .8, .08); label(ctx, '1-1, 2-1, 2-2… tout passe', 0, 130, 34, env.F.sb, MUTED); }, 'right', 420);
      arrow(ctx, 780, 546, 300, easeOut(clamp((lt - 1.1) / .6)), GREEN);
      pop(ctx, lt, 1.4, 960, 846, () => label(ctx, 'On lit le 2-2… mais on joue le OUI', 0, 0, 46, env.F.xb, AMBER), 'up', 100);
    } else if (mode === 'compare') {
      [['1-1', 'OUI', GREEN], ['2-1', 'OUI', GREEN], ['2-2', 'OUI', GREEN], ['1-0', 'NON', RED]].forEach(([sc, result, color], i) => {
        const t0 = .1 + i * .25;
        pop(ctx, lt, t0, 364 + i * 394, 548, () => { panel(ctx, 344, 375, color, lt, t0); kinetic(ctx, sc, 0, -58, 95, env.F.display, WHITE, lt, t0 + .1, .07); pop(ctx, lt, t0 + .45, 0, 88, () => label(ctx, result, 0, 0, 62, env.F.xb, color)); }, 'up', 260);
      });
      pop(ctx, lt, 1.3, 960, 840, () => label(ctx, 'Pas besoin du score exact pour gagner', 0, 0, 46, env.F.xb, AMBER), 'up', 100);
    } else if (mode === 'verify') {
      const t1 = .2, t2 = Math.max(1.1, vd * .42), t3 = Math.max(1.4, vd * .56);
      pop(ctx, lt, t1, 505, 560, () => { panel(ctx, 710, 430, AMBER, lt, t1); label(ctx, 'SCORE EXACT 2-2', 0, -140, 32, env.F.xb, AMBER); counter(ctx, '≤ 10,00', 0, 10, 126, env.F.display, WHITE, lt, t1 + .2); label(ctx, 'Premier filtre', 0, 125, 38, env.F.sb, MUTED); }, 'left', 460);
      pop(ctx, lt, t2, 1415, 560, () => { panel(ctx, 710, 430, GREEN, lt, t2); label(ctx, 'LES DEUX MARQUENT · OUI', 0, -140, 30, env.F.xb, GREEN); counter(ctx, '≤ 1,60', 0, 10, 126, env.F.display, WHITE, lt, t2 + .2); label(ctx, 'Vérification obligatoire', 0, 125, 35, env.F.sb, MUTED); }, 'right', 460);
      const q = easeOut(clamp((lt - t3) / .65));
      ctx.strokeStyle = GREEN; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(960, 565, 63, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); ctx.stroke();
      pop(ctx, lt, t3 + .6, 960, 564, () => label(ctx, '+', 0, 0, 81, env.F.display, WHITE));
      pop(ctx, lt, t3 + .8, 960, 865, () => label(ctx, 'Les deux conditions, sinon on passe', 0, 0, 43, env.F.xb, AMBER), 'up', 100);
    } else if (mode === 'decision') {
      pop(ctx, lt, .2, 960, 584, () => {
        panel(ctx, 1430, 495, GREEN, lt, .2);
        pop(ctx, lt, .35, -415, -120, () => counter(ctx, '2-2 ≤ 10,00', 0, 0, 77, env.F.display, AMBER, lt, .35), 'left', 200);
        pop(ctx, lt, .6, 0, -119, () => label(ctx, 'ET', 0, 0, 58, env.F.display, WHITE));
        pop(ctx, lt, .8, 420, -120, () => counter(ctx, 'OUI ≤ 1,60', 0, 0, 77, env.F.display, GREEN, lt, .8), 'right', 200);
        arrow(ctx, -450, -42, 870, easeOut(clamp((lt - 1) / .6)), GREEN);
        kinetic(ctx, 'Les deux équipes marquent : OUI', 0, 106, 66, env.F.xb, WHITE, lt, 1.3, .025);
      });
      pop(ctx, lt, 2, 960, 880, () => label(ctx, 'Une piste solide, jamais une garantie', 0, 0, 39, env.F.sb, MUTED), 'up', 80);
    } else if (mode === 'counter') {
      pop(ctx, lt, .2, 560, 560, () => { panel(ctx, 640, 360, GREEN, lt, .2); label(ctx, 'SCORE EXACT 2-2', 0, -110, 30, env.F.xb, GREEN); counter(ctx, '9,50', 0, 10, 120, env.F.display, WHITE, lt, .3); check(ctx, 0, 130, 36, clamp((lt - 1) * 2)); }, 'left', 400);
      pop(ctx, lt, 1.3, 1360, 560, () => { panel(ctx, 640, 360, RED, lt, 1.3); label(ctx, 'LES DEUX MARQUENT', 0, -110, 30, env.F.xb, RED); counter(ctx, '1,80', 0, 10, 120, env.F.display, WHITE, lt, 1.4); if (lt > 2.2) { ctx.strokeStyle = RED; ctx.lineWidth = 12; const q = clamp((lt - 2.2) * 3); ctx.beginPath(); ctx.moveTo(-200, -80); ctx.lineTo(-200 + 400 * q, -80 + 180 * q); ctx.stroke(); } }, 'right', 400);
      pop(ctx, lt, 2.6, 960, 880, () => { ctx.rotate(-.04); ctx.fillStyle = RED; rr(ctx, -300, -50, 600, 100, 20); ctx.fill(); label(ctx, 'MATCH ÉCARTÉ', 0, 2, 52, env.F.display, INK); }, 'scale');
    } else {
      pop(ctx, lt, .05, 960, 565, () => {
        panel(ctx, 1580, 460, GREEN, lt, .05); label(ctx, 'COTE DU SCORE EXACT 2-2', 0, -153, 42, env.F.xb, MUTED);
        [['7,00', GREEN], ['10,00', GREEN], ['14,00', RED]].forEach(([v, color], i) => {
          const t0 = .15 + i * .33;
          pop(ctx, lt, t0, -490 + i * 490, 0, () => { counter(ctx, v, 0, 0, 120, env.F.display, color, lt, t0); pop(ctx, lt, t0 + .4, 0, 130, () => label(ctx, i < 2 ? 'On garde' : 'On passe', 0, 0, 37, env.F.xb, color)); }, 'up', 200);
        });
      }, 'scale');
      pop(ctx, lt, 1.4, 960, 880, () => label(ctx, '10 ou moins : le match passe le premier test', 0, 0, 46, env.F.xb, AMBER), 'up', 100);
    }
  }
  ctx.restore();
  if (mode !== 'brand') brandTag(ctx, env, lt);
  return { subs, light: false };
}
