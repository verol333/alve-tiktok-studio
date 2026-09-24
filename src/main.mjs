import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { api, download } from './api.mjs';
import { run, duration } from './sh.mjs';
import { loadFonts, loadImg, loadEmoji } from './assets.mjs';
import { buildTimeline } from './timeline.mjs';
import { PALETTES, makeParticles } from './hud.mjs';
import { renderVideo } from './render.mjs';
import { makeSfx, mixAudio, sfxEvents } from './audio.mjs';

const DIR = '/tmp/studio';
mkdirSync(DIR, { recursive: true });

// Garde-fou technique : format, son, durée, taille — sinon rien n'est envoyé.
async function checks(file, tl, audio) {
  const { out } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration,size', '-of', 'json', file]);
  const info = JSON.parse(out);
  const v = info.streams.find((s) => s.codec_type === 'video'), a = info.streams.find((s) => s.codec_type === 'audio');
  const dur = parseFloat(info.format.duration), size = parseInt(info.format.size, 10);
  const vd = await run('ffmpeg', ['-i', audio, '-af', 'volumedetect', '-f', 'null', '-']);
  const m = /mean_volume:\s*(-?[\d.]+)/.exec(vd.err), mean = m ? parseFloat(m[1]) : -99;
  const problems = [];
  if (!v || v.width !== 1080 || v.height !== 1920) problems.push('format image incorrect');
  if (!a) problems.push('pas de son');
  if (!(Math.abs(dur - tl.total) <= 1)) problems.push('durée incohérente');
  if (size < 300000 || size > 60000000) problems.push('taille de fichier anormale');
  if (mean < -40) problems.push('son trop faible');
  if (problems.length) throw new Error('Contrôle technique : ' + problems.join(', '));
  return { duration: Math.round(dur * 10) / 10, size, mean_volume: mean, scenes: tl.scenes.length };
}

// Images clés envoyées à la relecture visuelle.
async function keyFrames(file, tl, type) {
  const by = (k) => tl.scenes.find((s) => s.kind === k), times = [];
  const add = (s, off) => { if (s) times.push(off < 0 ? s.start + s.dur + off : Math.min(s.start + off, s.start + s.dur - 0.2)); };
  const plan = type === 'site'
    ? [['hook', 0.8], ['card', 1.8], ['calc', 2.6], ['outcomes', -0.3], ['outro', 1.5]]
    : [['hook', 0.8], ['match', 1.6], ['pick', 2.0], ['combo', -0.3], ['outro', 1.5]];
  for (const [k, off] of plan) add(by(k), off);
  const out = [];
  for (const [i, t] of times.entries()) {
    const f = join(DIR, 'k' + i + '.jpg');
    await run('ffmpeg', ['-y', '-ss', t.toFixed(2), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '5', f]);
    out.push(readFileSync(f).toString('base64'));
  }
  return out;
}

async function main() {
  const { job } = await api('job');
  const style = job.style || {};
  console.log('Script du ' + job.day_date + ' : ' + job.scenes.length + ' scènes, palette ' + style.palette);
  const voiceFiles = [], durs = [];
  for (const [i, s] of job.scenes.entries()) {
    const f = join(DIR, 'v' + i + '.mp3');
    await download(s.audio_url, f);
    const d = await duration(f);
    if (!(d > 0.4)) throw new Error('Voix de la scène ' + (i + 1) + ' vide');
    voiceFiles.push(f); durs.push(d);
  }
  const tl = buildTimeline(job.scenes, durs);
  if (tl.total < 12 || tl.total > 90) throw new Error('Durée anormale : ' + tl.total.toFixed(1) + ' s');
  const env = {
    pal: PALETTES[style.palette] || PALETTES.emerald,
    style: Object.assign({ hook_style: 'slam', subtitle_style: 'pill' }, style),
    F: await loadFonts(DIR), total: tl.total, picks: job.picks, totalOdds: Number(job.total_odds) || 2,
    particles: makeParticles(), emoji: {}, logos: [],
    type: job.video_type || 'prono', show: job.showcase || null, proof: job.proof || null, when: style.when || '', bookLogos: [],
    hudSub: style.hud_sub || 'Analyse foot du jour', bgAlpha: job.video_type === 'site' ? 0.2 : 0.9,
  };
  if (!Array.isArray(env.style.transitions) || !env.style.transitions.length) env.style.transitions = ['zoom', 'slide', 'whip', 'flash'];
  env.bg = await loadImg(job.backgrounds[(style.background || 0) % job.backgrounds.length]);
  for (const p of job.picks) env.logos.push({ home: await loadImg(p.logo_home), away: await loadImg(p.logo_away) });
  if (env.show) {
    for (const l of env.show.legs) env.bookLogos.push(await loadImg(l.logo));
    env.opLogos = [];
    for (const o of env.show.operators || []) env.opLogos.push({ name: o.name, img: await loadImg(o.logo) });
    if (env.show.sport_emoji) env.emoji[env.show.sport_emoji] = await loadEmoji(env.show.sport_emoji);
  }
  for (const s of job.scenes) if (s.emoji && !(s.emoji in env.emoji)) env.emoji[s.emoji] = await loadEmoji(s.emoji);
  console.log('Logos chargés : ' + env.logos.map((l) => (l.home ? 1 : 0) + (l.away ? 1 : 0)).join(',') + ' — durée ' + tl.total.toFixed(1) + ' s');

  const video = join(DIR, 'video.mp4'), audio = join(DIR, 'audio.m4a'), final = join(DIR, 'final.mp4');
  await renderVideo(env, tl, video);
  await makeSfx(DIR, tl.total);
  await mixAudio(DIR, tl, voiceFiles, sfxEvents(tl, env), audio);
  await run('ffmpeg', ['-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);

  const metrics = await checks(final, tl, audio);
  console.log('Contrôle technique OK', JSON.stringify(metrics));
  const { review } = await api('review', { frames: await keyFrames(final, tl, env.type), metrics });
  if (!review.ok) throw new Error('Relecture : ' + review.issues.join(' ; '));
  console.log('Relecture visuelle OK');

  const size = statSync(final).size, file = readFileSync(final);
  const targets = job.targets || ['tiktok', 'youtube'];
  const res = {};
  if (targets.includes('tiktok')) {
    try {
      const init = await api('upload_init', { video_size: size });
      if (init.dry_run) { console.log('Montage d\u2019essai : aucun envoi'); await api('done'); return; }
      const put = await fetch(init.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size), 'Content-Range': 'bytes 0-' + (size - 1) + '/' + size },
        body: file,
      });
      if (!put.ok) throw new Error('TikTok a refus\u00e9 le fichier (' + put.status + ') ' + (await put.text()).slice(0, 200));
      res.publish_id = init.publish_id;
      console.log('Vid\u00e9o envoy\u00e9e dans les brouillons TikTok');
    } catch (e) { res.tiktok_error = String((e && e.message) || e); console.error('TikTok : ' + res.tiktok_error); }
  }
  if (targets.includes('youtube')) {
    try {
      const yt = await api('youtube_init', { video_size: size });
      if (yt.dry_run) { console.log('Montage d\u2019essai : aucun envoi'); await api('done'); return; }
      const put = await fetch(yt.upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) }, body: file });
      const j = await put.json().catch(() => ({}));
      if (!put.ok || !j.id) throw new Error('YouTube a refus\u00e9 le fichier (' + put.status + ') ' + JSON.stringify(j).slice(0, 200));
      res.youtube_id = j.id;
      console.log('Short YouTube en ligne : https://youtube.com/shorts/' + j.id + ' (' + (j.status && j.status.privacyStatus) + ')');
    } catch (e) { res.youtube_error = String((e && e.message) || e); console.error('YouTube : ' + res.youtube_error); }
  }
  if (!res.publish_id && !res.youtube_id) throw new Error([res.tiktok_error && 'TikTok : ' + res.tiktok_error, res.youtube_error && 'YouTube : ' + res.youtube_error].filter(Boolean).join(' \u2014 ') || 'Aucune plateforme vis\u00e9e');
  await api('done', res);
}

main().catch(async (e) => {
  console.error(e);
  try { await api('fail', { error: String((e && e.message) || e) }); } catch (x) { /* rien */ }
  process.exit(1);
});
