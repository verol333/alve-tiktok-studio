// Styles de montage « v2 » : Télé (broadcast) et Face-à-face (arena).
import { W, H, seeded, teamColors } from './kit.mjs';
import { loadImg } from '../assets.mjs';
import { downloadClips, clipDurations, closeBg } from './bg.mjs';
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
  env.proofLogos = [];
  for (const w of ((env.proof && env.proof.wins) || []).slice(0, 3)) env.proofLogos.push({ home: await loadImg(w.logo_home), away: await loadImg(w.logo_away) });
  const r = seeded(77);
  env.embers = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, v: 60 + r() * 150, s: 1.5 + r() * 3.5, a: 0.35 + r() * 0.5, ph: r() * 6, c: r() < 0.5 ? '#FFB020' : '#FF6A00' }));
  env.sparks = Array.from({ length: 46 }, () => ({ ang: r() * Math.PI * 2, sp: 500 + r() * 1300, len: 20 + r() * 60, c: r() < 0.5 ? '#FFFFFF' : '#FFC04D' }));
}

export function drawV2(ctx, env, sc, t) {
  return env.style.theme === 'arena' ? drawArena(ctx, env, sc, t) : drawBroadcast(ctx, env, sc, t);
}
