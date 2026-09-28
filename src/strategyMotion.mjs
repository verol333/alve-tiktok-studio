// A full-frame, audio-paced editorial graphic for the 2-2 strategy.
import { prog, easeOut, rr, font } from './draw.mjs';
const W = 1920, H = 1080, WHITE = '#F6FAFF', MUTED = '#A4B4CC', GREEN = '#3DE1AB', AMBER = '#FFC174', RED = '#FF8394';
function label(ctx, text, x, y, size, family, color = WHITE) {
  font(ctx, size, family); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
function panel(ctx, x, y, w, h, border) {
  ctx.fillStyle = '#1A2940'; rr(ctx, x, y, w, h, 30); ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 4; ctx.stroke();
}
export function drawStrategy(ctx, env, s, lt) {
  const L = s.look, mode = L.mode || 'score';
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#070D1A'); g.addColorStop(1, '#132D3D'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const x = 1300 + Math.sin(lt * .7) * 90;
  const a = ctx.createRadialGradient(x, 510, 0, x, 510, 650);
  a.addColorStop(0, 'rgba(61,225,171,.2)'); a.addColorStop(1, 'rgba(61,225,171,0)');
  ctx.fillStyle = a; ctx.fillRect(600, 0, 1300, H);
  const p = easeOut(prog(lt, 0, .32));
  label(ctx, L.kicker || 'LA MÉTHODE', 960, 122, 29, env.F.xb, GREEN);
  label(ctx, L.headline || 'Décoder le score exact', 960, 215, 68, env.F.display);
  ctx.fillStyle = GREEN; ctx.fillRect(870, 263, 180 * p, 6);
  if (mode === 'score') {
    panel(ctx, 200, 360, 560, 390, AMBER); panel(ctx, 1160, 360, 560, 390, GREEN);
    label(ctx, 'SCORE EXACT', 480, 425, 32, env.F.xb, AMBER);
    label(ctx, '2 : 2', 480, 575, 168, env.F.display);
    label(ctx, '4 buts précis', 480, 685, 36, env.F.sb, MUTED);
    label(ctx, 'LES DEUX MARQUENT', 1440, 425, 31, env.F.xb, GREEN);
    label(ctx, 'OUI', 1440, 575, 132, env.F.display);
    label(ctx, '1-1 fonctionne aussi', 1440, 685, 34, env.F.sb, MUTED);
    const q = easeOut(prog(lt, .5, .75)); ctx.fillStyle = GREEN;
    ctx.fillRect(780, 540, 310 * q, 12);
    if (q > .05) { ctx.beginPath(); ctx.moveTo(1100, 546); ctx.lineTo(1052, 516); ctx.lineTo(1052, 576); ctx.fill(); }
    label(ctx, 'Un indice, pas une certitude', 960, 846, 46, env.F.xb, AMBER);
  } else if (mode === 'compare') {
    [['0-0', 'NON', RED], ['1-0', 'NON', RED], ['1-1', 'OUI', GREEN], ['2-2', 'OUI', GREEN]].forEach(([sc, result, color], i) => {
      const q = easeOut(prog(lt, .1 + i * .25, .36));
      ctx.save(); ctx.globalAlpha = Math.max(.1, q); ctx.translate(0, (1 - q) * 30);
      const cx = 364 + i * 394; panel(ctx, cx - 172, 360, 344, 375, color);
      label(ctx, sc, cx, 490, 95, env.F.display);
      label(ctx, result, cx, 636, 62, env.F.xb, color); ctx.restore();
    });
    label(ctx, 'Différents scores · un seul marché à vérifier', 960, 840, 46, env.F.xb, AMBER);
  } else if (mode === 'verify') {
    const first = easeOut(prog(lt, .2, .6)), second = easeOut(prog(lt, Math.max(1.1, s.voiceDur * .42), .65));
    panel(ctx, 150, 345, 710, 430, AMBER); panel(ctx, 1060, 345, 710, 430, GREEN);
    ctx.save(); ctx.globalAlpha = Math.max(.05, first);
    label(ctx, 'SCORE EXACT 2-2', 505, 420, 32, env.F.xb, AMBER);
    label(ctx, '≤ 10,00', 505, 570, 126, env.F.display);
    label(ctx, 'Premier filtre', 505, 685, 38, env.F.sb, MUTED); ctx.restore();
    ctx.save(); ctx.globalAlpha = Math.max(.05, second);
    label(ctx, 'LES DEUX MARQUENT · OUI', 1415, 420, 30, env.F.xb, GREEN);
    label(ctx, '≤ 1,60', 1415, 570, 126, env.F.display);
    label(ctx, 'Vérification obligatoire', 1415, 685, 35, env.F.sb, MUTED); ctx.restore();
    const q = easeOut(prog(lt, Math.max(1.4, s.voiceDur * .56), .65));
    ctx.strokeStyle = GREEN; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(960, 565, 63, -Math.PI/2, -Math.PI/2 + q*Math.PI*2); ctx.stroke();
    if (q > .95) label(ctx, '+', 960, 564, 81, env.F.display, WHITE);
    label(ctx, 'Deux conditions ensemble · aucune garantie', 960, 865, 43, env.F.xb, AMBER);
  } else if (mode === 'decision') {
    const q = easeOut(prog(lt, .2, .55));
    panel(ctx, 245, 337, 1430, 495, GREEN);
    label(ctx, '2-2 ≤ 10,00', 545, 464, 77, env.F.display, AMBER);
    label(ctx, 'ET', 960, 465, 58, env.F.display, WHITE);
    label(ctx, 'OUI ≤ 1,60', 1380, 465, 77, env.F.display, GREEN);
    ctx.fillStyle = GREEN; ctx.fillRect(510, 542, 900 * q, 9);
    if(q > .05){ctx.beginPath();ctx.moveTo(1450,547);ctx.lineTo(1405,520);ctx.lineTo(1405,574);ctx.fill();}
    ctx.save();ctx.globalAlpha = q;label(ctx, 'Les deux équipes marquent : OUI', 960, 690, 66, env.F.xb);ctx.restore();
    label(ctx, 'La méthode sélectionne, elle ne garantit pas', 960, 880, 39, env.F.sb, MUTED);
  } else {
    panel(ctx, 170, 335, 1580, 460, GREEN);
    label(ctx, 'COTE DU SCORE EXACT 2-2', 960, 412, 42, env.F.xb, MUTED);
    [['7,00', GREEN], ['10,00', GREEN], ['14,00', RED]].forEach(([v, color], i) => {
      const q = easeOut(prog(lt, .15 + i * .33, .36)), cx = 470 + i * 490;
      ctx.save(); ctx.globalAlpha = Math.max(.12, q);
      label(ctx, v, cx, 565, 120, env.F.display, color);
      label(ctx, i < 2 ? 'À examiner' : 'Hors filtre', cx, 695, 37, env.F.xb, color);
      ctx.restore();
    });
    label(ctx, '≤ 10 : analyser, jamais promettre', 960, 880, 46, env.F.xb, AMBER);
  }
  return { subs: true, light: false };
}
