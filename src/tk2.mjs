// Modèles motion design sans image : conversation WhatsApp, recherche Google,
// notifications écran verrouillé, commentaire TikTok, coupon + « code copié ».
import { clamp, prog, easeOut, easeBack, rgba, rr, font } from './draw.mjs';
const W = 1080;
const AT = (s, f) => (s.voiceAt - s.start) + s.voiceDur * f;
function tx(ctx, s, x, y, size, fam, color, align) { font(ctx, size, fam); ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(String(s), x, y); }
function wrapL(ctx, s, maxW) { const out = []; let cur = ''; for (const w of String(s).split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
function pop(ctx, a, cx, cy, fn) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(cx, cy); ctx.scale(a, a); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
const times = (s, list) => list.map((m, k) => AT(s, m.at != null ? m.at : k / Math.max(1, list.length)));

export const TK2 = {
  chat(ctx, env, s, lt) {
    const L = s.look, msgs = L.msgs || [], ts = times(s, msgs), x0 = 70, w0 = W - 140, top = 250, bot = 1440;
    const a = easeOut(prog(lt, 0, 0.4)); ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 80);
    ctx.fillStyle = '#0B141A'; rr(ctx, x0, top, w0, bot - top, 44); ctx.fill();
    ctx.save(); rr(ctx, x0, top, w0, 150, 44); ctx.clip(); ctx.fillStyle = '#1F2C34'; ctx.fillRect(x0, top, w0, 150); ctx.restore();
    ctx.fillStyle = L.color || '#25D366'; ctx.beginPath(); ctx.arc(x0 + 90, top + 75, 44, 0, Math.PI * 2); ctx.fill();
    tx(ctx, (L.name || '?')[0], x0 + 90, top + 92, 48, env.F.xb, '#0B141A', 'center');
    tx(ctx, L.name || 'Contact', x0 + 160, top + 70, 44, env.F.xb, '#FFFFFF'); tx(ctx, 'en ligne', x0 + 160, top + 115, 32, env.F.xb, '#8696A0');
    let y = top + 200;
    msgs.forEach((m, k) => {
      const me = m.from === 'me', t0 = ts[k];
      font(ctx, 42, env.F.xb); const lines = wrapL(ctx, m.text, 640), bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 70, bh = lines.length * 56 + 60;
      const bx = me ? x0 + w0 - 40 - bw : x0 + 40;
      if (!me && lt > t0 - 0.7 && lt < t0) { ctx.fillStyle = '#202C33'; rr(ctx, bx, y, 170, 90, 30); ctx.fill(); for (let d = 0; d < 3; d++) { ctx.fillStyle = rgba('#FFFFFF', 0.35 + 0.5 * Math.max(0, Math.sin(lt * 9 - d))); ctx.beginPath(); ctx.arc(bx + 50 + d * 36, y + 45, 11, 0, Math.PI * 2); ctx.fill(); } }
      if (me && lt > t0 - 1.1 && lt < t0) { const n = Math.ceil(m.text.length * prog(lt, t0 - 1.1, 1.0)); ctx.fillStyle = '#1F2C34'; rr(ctx, x0 + 30, bot - 140, w0 - 60, 100, 50); ctx.fill(); tx(ctx, m.text.slice(Math.max(0, n - 28), n) + (Math.floor(lt * 4) % 2 ? '|' : ''), x0 + 80, bot - 75, 38, env.F.xb, '#E9EDEF'); }
      const p = easeBack(prog(lt, t0, 0.35)); if (p <= 0) return;
      pop(ctx, p, me ? bx + bw : bx, y + bh / 2, () => {
        ctx.fillStyle = me ? '#005C4B' : '#202C33'; rr(ctx, bx, y, bw, bh, 30); ctx.fill();
        lines.forEach((l, i) => tx(ctx, l, bx + 35, y + 68 + i * 56, 42, env.F.xb, m.hot ? '#FFD23F' : '#E9EDEF'));
        tx(ctx, (L.time || '19:42') + '', bx + bw - 25, y + bh - 16, 24, env.F.xb, me ? '#53BDEB' : '#8696A0', 'right');
      });
      y += bh + 26;
    });
    ctx.restore(); return { capY: 1640 };
  },
  search(ctx, env, s, lt) {
    const L = s.look, q = L.query || '', t1 = AT(s, 0.05), t2 = AT(s, L.typed_at || 0.45);
    const G = [['G', '#4285F4'], ['o', '#EA4335'], ['o', '#FBBC05'], ['g', '#4285F4'], ['l', '#34A853'], ['e', '#EA4335']];
    const ga = easeOut(prog(lt, 0, 0.4)); ctx.save(); ctx.globalAlpha = ga; font(ctx, 150, env.F.display); let gx = W / 2 - G.reduce((w, [c]) => w + ctx.measureText(c).width, 0) / 2;
    for (const [c, col] of G) { tx(ctx, c, gx, 470, 150, env.F.display, col); gx += ctx.measureText(c).width; } ctx.restore();
    const n = Math.floor(q.length * prog(lt, t1, Math.max(0.3, t2 - t1))), sb = easeBack(prog(lt, 0.1, 0.4));
    pop(ctx, sb, W / 2, 600, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, 70, 540, W - 140, 130, 65); ctx.fill();
      ctx.strokeStyle = '#9AA0A6'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(150, 598, 22, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(166, 614); ctx.lineTo(186, 634); ctx.stroke();
      font(ctx, 40, env.F.xb); const lines = wrapL(ctx, q.slice(0, n), W - 330); const last = lines[lines.length - 1] || '';
      tx(ctx, last, 215, 620, 40, env.F.xb, '#202124'); if (Math.floor(lt * 2.5) % 2 === 0 && n < q.length + 1) { ctx.fillStyle = '#4285F4'; ctx.fillRect(220 + ctx.measureText(last).width, 585, 4, 50); } });
    (L.results || []).forEach((r, i) => { const p = easeOut(prog(lt, t2 + 0.15 + i * 0.25, 0.35)); if (p <= 0) return; const y = 740 + i * 175;
      ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * 120, 0); ctx.fillStyle = 'rgba(32,33,36,0.92)'; rr(ctx, 70, y, W - 140, 150, 24); ctx.fill();
      tx(ctx, r.title, 110, y + 62, 40, env.F.xb, '#8AB4F8'); tx(ctx, r.sub || '', 110, y + 115, 32, env.F.xb, '#BDC1C6');
      if (L.strike_at != null) { const sp = prog(lt, AT(s, L.strike_at) + i * 0.15, 0.25); ctx.strokeStyle = '#FF4D5E'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(100, y + 75); ctx.lineTo(100 + (W - 200) * sp, y + 75); ctx.stroke(); }
      ctx.restore(); });
    if (L.badge) { const b = easeBack(prog(lt, AT(s, L.badge_at || 0.85), 0.4)); pop(ctx, b, W / 2, 1400, () => { ctx.fillStyle = '#3DFFB5'; rr(ctx, W / 2 - 380, 1340, 760, 120, 60); ctx.fill(); tx(ctx, L.badge, W / 2, 1422, 58, env.F.display, '#04110B', 'center'); }); }
    return { capY: 1640 };
  },
  notif(ctx, env, s, lt) {
    const L = s.look, list = L.notifs || [], ts = times(s, list);
    ctx.fillStyle = 'rgba(2,4,10,0.35)'; ctx.fillRect(0, 0, W, 1920);
    const a = easeOut(prog(lt, 0, 0.5)); ctx.save(); ctx.globalAlpha = a;
    tx(ctx, L.date || 'dimanche 27 septembre', W / 2, 300, 40, env.F.xb, 'rgba(255,255,255,0.85)', 'center');
    tx(ctx, L.time || '21:47', W / 2, 520, 230, env.F.display, '#FFFFFF', 'center'); ctx.restore();
    list.forEach((n, k) => { const p = easeBack(prog(lt, ts[k], 0.45)); if (p <= 0) return; const y = 640 + k * 230 + (1 - p) * -200;
      ctx.save(); ctx.globalAlpha = clamp(p, 0, 1); ctx.fillStyle = 'rgba(40,44,56,0.88)'; rr(ctx, 60, y, W - 120, 200, 44); ctx.fill();
      ctx.fillStyle = n.color || '#3DFFB5'; rr(ctx, 95, y + 45, 90, 90, 22); ctx.fill(); tx(ctx, n.icon || (n.app || 'A')[0], 140, y + 107, 50, env.F.display, '#04110B', 'center');
      tx(ctx, (n.app || 'AL VE CAPITAL').toUpperCase(), 215, y + 70, 28, env.F.xb, 'rgba(255,255,255,0.6)'); tx(ctx, 'maintenant', W - 100, y + 70, 28, env.F.xb, 'rgba(255,255,255,0.5)', 'right');
      tx(ctx, n.title, 215, y + 122, 42, env.F.xb, n.hot ? '#3DFFB5' : '#FFFFFF'); tx(ctx, n.body || '', 215, y + 170, 34, env.F.xb, 'rgba(255,255,255,0.8)'); ctx.restore(); });
    return { capY: 1640 };
  },
  comment(ctx, env, s, lt) {
    const L = s.look, p = easeBack(prog(lt, 0.05, 0.45)), y = 560;
    pop(ctx, p, W / 2, y + 150, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, 60, y, W - 120, 330, 40); ctx.fill();
      ctx.fillStyle = L.color || '#FF4D5E'; ctx.beginPath(); ctx.arc(150, y + 95, 50, 0, Math.PI * 2); ctx.fill(); tx(ctx, (L.user || 'u')[0].toUpperCase(), 150, y + 113, 50, env.F.display, '#FFFFFF', 'center');
      tx(ctx, L.user || 'utilisateur', 225, y + 80, 34, env.F.xb, '#8A8B91'); font(ctx, 44, env.F.xb); wrapL(ctx, L.text || '', 720).slice(0, 3).forEach((l, i) => tx(ctx, l, 225, y + 140 + i * 56, 44, env.F.xb, '#161823'));
      tx(ctx, 'Répondre', 225, y + 300, 30, env.F.xb, '#8A8B91'); tx(ctx, '♥ ' + (L.likes || '2 841'), W - 110, y + 300, 32, env.F.xb, '#FE2C55', 'right'); });
    const r = easeBack(prog(lt, AT(s, L.reply_at || 0.55), 0.4));
    pop(ctx, r, W / 2, 1050, () => { ctx.fillStyle = '#3DFFB5'; rr(ctx, 170, 980, W - 240, 150, 36); ctx.fill(); tx(ctx, 'alvecapital · a répondu', 210, 1040, 30, env.F.xb, '#04110B'); tx(ctx, L.reply || 'Réponse dans cette vidéo', 210, 1095, 42, env.F.display, '#04110B'); });
    return { capY: 1640 };
  },
  ticket(ctx, env, s, lt) {
    const L = s.look, a = easeBack(prog(lt, 0, 0.45)), y = 420;
    const im = (u) => (u && env.imgs && env.imgs[u]) || null;
    pop(ctx, a, W / 2, y + 380, () => { ctx.fillStyle = '#FFFFFF'; rr(ctx, 90, y, W - 180, 760, 40); ctx.fill();
      ctx.save(); rr(ctx, 90, y, W - 180, 120, 40); ctx.clip(); ctx.fillStyle = '#0E1A2E'; ctx.fillRect(90, y, W - 180, 120); ctx.restore();
      tx(ctx, 'COUPON', 140, y + 78, 44, env.F.display, '#FFFFFF'); tx(ctx, '1 sélection', W - 140, y + 78, 32, env.F.xb, '#9AA4C6', 'right');
      [[L.home_logo, L.home, 270], [L.away_logo, L.away, W - 270]].forEach(([lg, nm, cx]) => { const i2 = im(lg); if (i2) ctx.drawImage(i2, cx - 70, y + 170, 140, 140); else { ctx.fillStyle = '#E6E9F2'; ctx.beginPath(); ctx.arc(cx, y + 240, 70, 0, Math.PI * 2); ctx.fill(); } tx(ctx, nm || '', cx, y + 370, 38, env.F.xb, '#0E1A2E', 'center'); });
      tx(ctx, 'VS', W / 2, y + 260, 50, env.F.display, '#9AA4C6', 'center');
      ctx.fillStyle = '#EEF1F7'; rr(ctx, 130, y + 430, W - 260, 150, 24); ctx.fill(); tx(ctx, L.market || '', 170, y + 490, 34, env.F.xb, '#5B6478'); tx(ctx, L.pick || '', 170, y + 548, 44, env.F.display, '#0E1A2E');
      tx(ctx, String(L.odd || ''), W - 170, y + 540, 70, env.F.display, '#0A9A64', 'right');
      tx(ctx, 'Code coupon', 140, y + 660, 32, env.F.xb, '#5B6478'); tx(ctx, L.code || 'ALVE25', W - 140, y + 665, 48, env.F.display, '#0E1A2E', 'right'); });
    const tp = easeBack(prog(lt, AT(s, L.toast_at || 0.7), 0.4));
    pop(ctx, tp, W / 2, 1310, () => { ctx.fillStyle = '#1F2330'; rr(ctx, W / 2 - 300, 1260, 600, 100, 50); ctx.fill(); tx(ctx, (L.toast || 'Code copié'), W / 2, 1325, 40, env.F.xb, '#3DFFB5', 'center'); });
    return { capY: 1640 };
  },
};

export function tk2Sfx(s) {
  const L = s.look || {}, out = [];
  if (L.type === 'chat') times(s, L.msgs || []).forEach((t, k) => { const me = (L.msgs[k] || {}).from === 'me'; out.push(me ? ['keys', t - 1.1, 0.5] : ['keys_s', t - 0.7, 0.3], ['pop', t, 0.55]); });
  if (L.type === 'search') { const t1 = AT(s, 0.05), t2 = AT(s, L.typed_at || 0.45); out.push(['keys_s', t1, 0.4]); (L.results || []).forEach((r, i) => out.push(['whoosh', t2 + 0.15 + i * 0.25, 0.3])); if (L.badge) out.push(['impact', AT(s, L.badge_at || 0.85), 0.8]); }
  if (L.type === 'notif') times(s, L.notifs || []).forEach((t) => out.push(['ding', t, 0.55]));
  if (L.type === 'comment') out.push(['pop', 0.05, 0.5], ['ding', AT(s, L.reply_at || 0.55), 0.55]);
  if (L.type === 'ticket') out.push(['whoosh', 0, 0.4], ['pop', AT(s, L.toast_at || 0.7), 0.6]);
  return out;
}
