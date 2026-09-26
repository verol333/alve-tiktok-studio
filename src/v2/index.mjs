// Styles de montage « v2 » : Télé (broadcast) et Face-à-face (arena).
import { W, H, seeded, teamColors } from './kit.mjs';
import { loadImg } from '../assets.mjs';
import { downloadClips, clipDurations, closeBg, setBgSeed } from './bg.mjs';
import { loadLookFont } from '../assets.mjs';
import { prepLook } from './look.mjs';
import { drawBroadcast } from './broadcast.mjs';
import { drawArena } from './arena.mjs';
export { downloadClips, closeBg };

export async function prepV2Env(env, tl, DIR) {
  const arena = env.style.theme === 'arena';
  env.DIR = DIR;
  env.colors = teamColors(env.logos, env.pal);
  env.accent = arena ? '#FFB020' : '#FFD23F';
  env.hot = env.accent;
  env.bounds = tl.scenes.slice(1).map((s) => s.start);
  env.clipDur = await clipDurations(DIR);
  env.bgVf = arena ? 'hue=s=0,eq=contrast=1.3' : 'eq=saturation=0.9:contrast=1.05,gblur=sigma=1.5';
  // Identité visuelle du jour : couleurs, police, étalonnage, plans de fond.
  const L = env.style.look || null;
  env.look = L;
  if (L) {
    env.accent = L.accent; env.hot = L.accent; env.fire = L.fire;
    if (L.grade_vf) env.bgVf = L.grade_vf;
    const fam = await loadLookFont(DIR, L.font).catch(() => null);
    if (fam) env.F.kin = fam;
    setBgSeed(L.seed);
    prepLook(env);
  }
  const EC = env.fire ? [env.fire[1], env.fire[2]] : ['#FFB020', '#FF6A00'];
  env.proofLogos = [];
  for (const w of ((env.proof && env.proof.wins) || []).slice(0, 3)) env.proofLogos.push({ home: await loadImg(w.logo_home), away: await loadImg(w.logo_away) });
  const r = seeded(77);
  env.embers = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, v: 60 + r() * 150, s: 1.5 + r() * 3.5, a: 0.35 + r() * 0.5, ph: r() * 6, c: r() < 0.5 ? EC[0] : EC[1] }));
  env.sparks = Array.from({ length: 46 }, () => ({ ang: r() * Math.PI * 2, sp: 500 + r() * 1300, len: 20 + r() * 60, c: r() < 0.5 ? '#FFFFFF' : (env.fire ? env.fire[0] : '#FFC04D') }));
}

export function drawV2(ctx, env, sc, t) {
  return env.style.theme === 'arena' ? drawArena(ctx, env, sc, t) : drawBroadcast(ctx, env, sc, t);
}
