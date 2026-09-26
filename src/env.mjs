// Habillage de la vidéo prono (polices, logos, émojis) — reconstruit à
// l'identique dans chaque processus de segment.
import { loadFonts, loadImg, loadEmoji } from './assets.mjs';
import { PALETTES, makeParticles } from './hud.mjs';

export async function buildEnv(job, tl, DIR, particles) {
  const style = job.style || {};
  const env = {
    pal: PALETTES[style.palette] || PALETTES.emerald,
    style: Object.assign({ hook_style: 'slam', subtitle_style: 'pill' }, style),
    F: await loadFonts(DIR), total: tl.total, picks: job.picks, totalOdds: Number(job.total_odds) || 2,
    particles: particles || makeParticles(), emoji: {}, logos: [],
    type: job.video_type || 'prono', show: job.showcase || null, proof: job.proof || null, when: style.when || '', bookLogos: [],
    hudSub: style.hud_sub || 'Analyse foot du jour', bgAlpha: job.video_type === 'site' ? 0.2 : 0.9,
  };
  if (!Array.isArray(env.style.transitions) || !env.style.transitions.length) env.style.transitions = ['zoom', 'slide', 'whip', 'flash'];
  env.logo = job.logo_url ? await loadImg(job.logo_url) : null;
  env.bg = await loadImg(job.backgrounds[(style.background || 0) % job.backgrounds.length]);
  for (const p of job.picks) env.logos.push({ home: await loadImg(p.logo_home), away: await loadImg(p.logo_away) });
  if (env.show) {
    for (const l of env.show.legs) env.bookLogos.push(await loadImg(l.logo));
    env.opLogos = [];
    for (const o of env.show.operators || []) env.opLogos.push({ name: o.name, img: await loadImg(o.logo) });
    if (env.show.sport_emoji) env.emoji[env.show.sport_emoji] = await loadEmoji(env.show.sport_emoji);
  }
  for (const s of job.scenes) if (s.emoji && !(s.emoji in env.emoji)) env.emoji[s.emoji] = await loadEmoji(s.emoji);
  // Styles v2 (Télé / Face-à-face) : couleurs des clubs, plans de fond, particules.
  if (env.style.theme) { const { prepV2Env } = await import('./v2/index.mjs'); await prepV2Env(env, tl, DIR); }
  return env;
}
