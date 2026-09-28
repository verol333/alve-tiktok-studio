// Motion-design editorial graphics for the 2-2 strategy (springs, kinetic type, draw-on frames, camera punch).
import { prog, easeOut, rr, font } from './draw.mjs';
const W = 1920, H = 1080, WHITE = '#F6FAFF', MUTED = '#A4B4CC', GREEN = '#3DE1AB', AMBER = '#FFC174', RED = '#FF8394';
const clamp = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const spring = (t) => t <= 0 ? 0 : t >= 2.2 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(11 * t);
function label(ctx, text, x, y, size, family, color = WHITE) {
  font(ctx, size, family); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
// Element enters with a spring (scale / slide), then floats gently.
function pop(ctx, lt, t0, cx, cy, draw, from = 'scale', dist = 180) {
  const t = lt - t0; if (t < 0) return;
  const k = spring(t * 1.5);
  ctx.save(); ctx.globalAlpha *= clamp(t * 5); ctx.translate(cx, cy + Math.sin(lt * 1.7 + cx * .013) * 7);
  if (from === 'scale') { ctx.scale(k, k); ctx.rotate((1 - k) * -.12); }
  else if (from === 'left') { ctx.translate(-(1 - k) * dist, 0); ctx.rotate((1 - k) * -.05); }
  else if (from === 'right') { ctx.translate((1 - k) * dist, 0); ctx.rotate((1 - k) * .05); }
  else ctx.translate(0, (1 - k) * dist);
  draw(); ctx.restore();
}
// Letters drop in one by one with overshoot.
function kinetic(ctx, text, x, y, size, family, color, lt, t0, gap = .035) {
  font(ctx, size, family); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const chars = [...text], ws = chars.map((c) => ctx.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0);
  let cx = x - tot / 2; ctx.fillStyle = color;
  chars.forEach((c, i) => {
    const t = lt - t0 - i * gap; if (t > 0 && c !== ' ') {
      const k = spring(t * 2);
      ctx.save(); ctx.globalAlpha *= clamp(t * 7); ctx.translate(cx + ws[i] / 2, y - (1 - k) * size * .9);
      ctx.scale(1, .6 + .4 * k); ctx.fillText(c, -ws[i] / 2, 0); ctx.restore();
    }
    cx += ws[i];
  });
}
// Numbers roll up to their value.
function counter(ctx, text, x, y, size, family, color, lt, t0, d = .9) {
  const m = text.match(/(\d+)(?:,(\d+))?/); if (!m) return label(ctx, text, x, y, size, family, color);
  const dec = m[2] ? m[2].length : 0, v = parseFloat(m[1] + '.' + (m[2] || 0)) * easeOut(clamp((lt - t0) / d));
  label(ctx, text.replace(m[0], v.toFixed(dec).replace('.', ',')), x, y, size, family, color);
}
// Panel centred on the origin: frame draws itself, light sweep passes across.
function panel(ctx, w, h, border, lt, t0) {
  const x = -w / 2, y = -h / 2, p = clamp((lt - t0) / .7), per = 2 * (w + h);
  ctx.fillStyle = '#1A2940'; rr(ctx, x, y, w, h, 30); ctx.fill();
  const ph = ((lt - t0) * .45) % 1.6;
  if (ph < 1) {
    ctx.save(); rr(ctx, x, y, w, h, 30); ctx.clip();
    const sx = x - 300 + (w + 600) * ph, g = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.09)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - 160, y, 320, h); ctx.restore();
  }
  ctx.save(); ctx.strokeStyle = border; ctx.lineWidth = 5; ctx.setLineDash([per * p, per]); rr(ctx, x, y, w, h, 30); ctx.stroke(); ctx.restore();
}
function particles(ctx, lt) {
  for (let i = 0; i < 46; i++) {
    const sx = (i * 397) % W, sp = 18 + (i * 53) % 40, y = (H + 40) - ((lt * sp + i * 131) % (H + 80));
    ctx.globalAlpha = .08 + (i % 5) * .03; ctx.fillStyle = i % 3 ? GREEN : AMBER;
    ctx.fillRect(sx + Math.sin(lt + i) * 22, y, 3 + (i % 3), 3 + (i % 3));
  }
  ctx.globalAlpha = 1;
}
function arrow(ctx, x0, y, len, q, color) {
  if (q <= .02) return; ctx.fillStyle = color; ctx.fillRect(x0, y - 6, len * q, 12);
  const hx = x0 + len * q; ctx.beginPath(); ctx.moveTo(hx + 26, y); ctx.lineTo(hx - 20, y - 30); ctx.lineTo(hx - 20, y + 30); ctx.fill();
}
function camera(ctx, s, lt, hits) {
  const dur = s.voiceDur || 6; let punch = 0;
  for (const h of hits) if (lt > h) punch += Math.exp(-(lt - h) * 7) * Math.sin((lt - h) * 20) * .5 + Math.exp(-(lt - h) * 5) * .5;
  const k = 1 + .045 * clamp(lt / dur) + .03 * punch;
  ctx.translate(W / 2 + Math.sin(lt * .6) * 10, H / 2 + Math.cos(lt * .5) * 6); ctx.scale(k, k); ctx.rotate(Math.sin(lt * .4) * .004); ctx.translate(-W / 2, -H / 2);
}
function header(ctx, env, L, lt) {
  kinetic(ctx, L.kicker || 'LA MÉTHODE', 960, 122, 29, env.F.xb, GREEN, lt, 0, .02);
  kinetic(ctx, L.headline || 'Décoder le score exact', 960, 215, 68, env.F.display, WHITE, lt, .12, .028);
  const p = spring((lt - .5) * 1.4); ctx.fillStyle = GREEN; ctx.fillRect(960 - 110 * p, 263, 220 * p, 6);
}
function drawEvidence(ctx, env, s, lt) {
  const shot = env.imgs?.[s.look.shot];
  if (!shot) throw new Error('Capture Norvège–Portugal introuvable');
  kinetic(ctx, 'NORVÈGE  ·  PORTUGAL', 1320, 137, 42, env.F.xb, WHITE, lt, .1, .025);
  kinetic(ctx, 'LA COTE DU 2-2 SUR LA VRAIE CAPTURE', 1320, 202, 43, env.F.display, AMBER, lt, .35, .02);
  pop(ctx, lt, .1, 396, 539, () => {
    ctx.fillStyle = '#050A13'; rr(ctx, -231, -501, 462, 1002, 54); ctx.fill();
    ctx.save(); rr(ctx, -215, -485, 430, 970, 35); ctx.clip();
    const zz = 1 + .06 * easeOut(clamp(lt / 6)); ctx.scale(zz, zz); ctx.drawImage(shot, -215, -485, 430, 970); ctx.restore();
    ctx.strokeStyle = '#697B90'; ctx.lineWidth = 5; rr(ctx, -231, -501, 462, 1002, 54); ctx.stroke();
  }, 'left', 520);
  pop(ctx, lt, .8, 1297, 602, () => {
    panel(ctx, 1050, 548, GREEN, lt, .8);
    ctx.save(); rr(ctx, -502, -251, 1004, 502, 22); ctx.clip(); ctx.drawImage(shot, 420, 1435, 440, 220, -502, -251, 1004, 502); ctx.restore();
    const ring = easeOut(clamp((lt - 1.6) / .7)), pulse = 1 + Math.max(0, Math.sin((lt - 2.3) * 4)) * .08 * (lt > 2.3);
    ctx.strokeStyle = AMBER; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(305, -2, 97 * pulse, 68 * pulse, -.13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke();
  }, 'right', 400);
  pop(ctx, lt, 2.1, 1285, 947, () => counter(ctx, '2-2  ·  COTE 10', 0, 0, 54, env.F.xb, GREEN, lt, 2.1), 'up', 90);
  pop(ctx, lt, 2.5, 1290, 1004, () => label(ctx, 'Cote du OUI absente de cette image', 0, 0, 32, env.F.sb, MUTED), 'up', 60);
}

export function drawStrategy(ctx, env, s, lt) {
  const L = s.look, mode = L.mode || 'score', vd = s.voiceDur || 6;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#070D1A'); g.addColorStop(1, '#132D3D'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const x = 1100 + Math.sin(lt * .7) * 420, a = ctx.createRadialGradient(x, 510, 0, x, 510, 700);
  a.addColorStop(0, 'rgba(61,225,171,.2)'); a.addColorStop(1, 'rgba(61,225,171,0)');
  ctx.fillStyle = a; ctx.fillRect(0, 0, W, H);
  particles(ctx, lt);
  const hits = { evidence: [.8, 2.1], score: [.35, .6, 1.4], compare: [.1, .35, .6, .85], verify: [.2, vd * .42, vd * .56], decision: [.2, .9] }[mode] || [.15, .48, .81];
  ctx.save(); camera(ctx, s, lt, hits);
  if (mode === 'evidence') { drawEvidence(ctx, env, s, lt); ctx.restore(); return { subs: false, light: false }; }
  header(ctx, env, L, lt);
  if (mode === 'score') {
    pop(ctx, lt, .35, 480, 555, () => { panel(ctx, 560, 390, AMBER, lt, .35); label(ctx, 'SCORE EXACT', 0, -130, 32, env.F.xb, AMBER); kinetic(ctx, '2 : 2', 0, 20, 168, env.F.display, WHITE, lt, .55, .08); label(ctx, '4 buts précis', 0, 130, 36, env.F.sb, MUTED); }, 'left', 420);
    pop(ctx, lt, .6, 1440, 555, () => { panel(ctx, 560, 390, GREEN, lt, .6); label(ctx, 'LES DEUX MARQUENT', 0, -130, 31, env.F.xb, GREEN); kinetic(ctx, 'OUI', 0, 20, 132, env.F.display, WHITE, lt, .8, .08); label(ctx, '1-1 fonctionne aussi', 0, 130, 34, env.F.sb, MUTED); }, 'right', 420);
    arrow(ctx, 780, 546, 300, easeOut(clamp((lt - 1.1) / .6)), GREEN);
    pop(ctx, lt, 1.4, 960, 846, () => label(ctx, 'Un indice, pas une certitude', 0, 0, 46, env.F.xb, AMBER), 'up', 100);
  } else if (mode === 'compare') {
    [['0-0', 'NON', RED], ['1-0', 'NON', RED], ['1-1', 'OUI', GREEN], ['2-2', 'OUI', GREEN]].forEach(([sc, result, color], i) => {
      const t0 = .1 + i * .25;
      pop(ctx, lt, t0, 364 + i * 394, 548, () => {
        panel(ctx, 344, 375, color, lt, t0); kinetic(ctx, sc, 0, -58, 95, env.F.display, WHITE, lt, t0 + .1, .07);
        pop(ctx, lt, t0 + .45, 0, 88, () => label(ctx, result, 0, 0, 62, env.F.xb, color));
      }, 'up', 260);
    });
    pop(ctx, lt, 1.3, 960, 840, () => label(ctx, 'Différents scores · un seul marché à vérifier', 0, 0, 46, env.F.xb, AMBER), 'up', 100);
  } else if (mode === 'verify') {
    const t1 = .2, t2 = Math.max(1.1, vd * .42), t3 = Math.max(1.4, vd * .56);
    pop(ctx, lt, t1, 505, 560, () => { panel(ctx, 710, 430, AMBER, lt, t1); label(ctx, 'SCORE EXACT 2-2', 0, -140, 32, env.F.xb, AMBER); counter(ctx, '≤ 10,00', 0, 10, 126, env.F.display, WHITE, lt, t1 + .2); label(ctx, 'Premier filtre', 0, 125, 38, env.F.sb, MUTED); }, 'left', 460);
    pop(ctx, lt, t2, 1415, 560, () => { panel(ctx, 710, 430, GREEN, lt, t2); label(ctx, 'LES DEUX MARQUENT · OUI', 0, -140, 30, env.F.xb, GREEN); counter(ctx, '≤ 1,60', 0, 10, 126, env.F.display, WHITE, lt, t2 + .2); label(ctx, 'Vérification obligatoire', 0, 125, 35, env.F.sb, MUTED); }, 'right', 460);
    const q = easeOut(clamp((lt - t3) / .65));
    ctx.strokeStyle = GREEN; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(960, 565, 63, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); ctx.stroke();
    pop(ctx, lt, t3 + .6, 960, 564, () => label(ctx, '+', 0, 0, 81, env.F.display, WHITE));
    pop(ctx, lt, t3 + .8, 960, 865, () => label(ctx, 'Deux conditions ensemble · aucune garantie', 0, 0, 43, env.F.xb, AMBER), 'up', 100);
  } else if (mode === 'decision') {
    pop(ctx, lt, .2, 960, 584, () => {
      panel(ctx, 1430, 495, GREEN, lt, .2);
      pop(ctx, lt, .35, -415, -120, () => counter(ctx, '2-2 ≤ 10,00', 0, 0, 77, env.F.display, AMBER, lt, .35), 'left', 200);
      pop(ctx, lt, .6, 0, -119, () => label(ctx, 'ET', 0, 0, 58, env.F.display, WHITE));
      pop(ctx, lt, .8, 420, -120, () => counter(ctx, 'OUI ≤ 1,60', 0, 0, 77, env.F.display, GREEN, lt, .8), 'right', 200);
      arrow(ctx, -450, -42, 870, easeOut(clamp((lt - 1) / .6)), GREEN);
      kinetic(ctx, 'Les deux équipes marquent : OUI', 0, 106, 66, env.F.xb, WHITE, lt, 1.3, .025);
    });
    pop(ctx, lt, 2, 960, 880, () => label(ctx, 'La méthode sélectionne, elle ne garantit pas', 0, 0, 39, env.F.sb, MUTED), 'up', 80);
  } else {
    pop(ctx, lt, .05, 960, 565, () => {
      panel(ctx, 1580, 460, GREEN, lt, .05); label(ctx, 'COTE DU SCORE EXACT 2-2', 0, -153, 42, env.F.xb, MUTED);
      [['7,00', GREEN], ['10,00', GREEN], ['14,00', RED]].forEach(([v, color], i) => {
        const t0 = .15 + i * .33;
        pop(ctx, lt, t0, -490 + i * 490, 0, () => { counter(ctx, v, 0, 0, 120, env.F.display, color, lt, t0); pop(ctx, lt, t0 + .4, 0, 130, () => label(ctx, i < 2 ? 'À examiner' : 'Hors filtre', 0, 0, 37, env.F.xb, color)); }, 'up', 200);
      });
    }, 'scale');
    pop(ctx, lt, 1.4, 960, 880, () => label(ctx, '≤ 10 : analyser, jamais promettre', 0, 0, 46, env.F.xb, AMBER), 'up', 100);
  }
  ctx.restore();
  return { subs: true, light: false };
}
