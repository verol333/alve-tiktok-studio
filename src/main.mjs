import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { api, download } from './api.mjs';
import { run, duration } from './sh.mjs';
import { loadFonts, loadImg, loadEmoji } from './assets.mjs';
import { buildTimeline } from './timeline.mjs';
import { PALETTES, makeParticles } from './hud.mjs';
import { renderVideo } from './render.mjs';
import { buildEnv } from './env.mjs';
import { makeSfx, mixAudio, sfxEvents, tightVoice } from './audio.mjs';
import { alignScenes } from './align.mjs';
import { cloneVoices } from './clone.mjs';

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
    : [['hook', 0.8], ['match', 1.6], ['pick', 2.0], ['combo', -1.2], ['outro', 1.5]];
  for (const [k, off] of plan) add(by(k), off);
  if (type === 'reel') { times.length = 0; for (const f of [0.04, 0.28, 0.5, 0.72, 0.93]) times.push(tl.total * f); }
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
  if (job.video_type === 'long') { const { runLong } = await import('./long.mjs'); return runLong(job, DIR); }
  if ((job.style || {}).format === 'reel') {
    const { buildReel } = await import('./reel.mjs');
    const r = await buildReel(job, DIR);
    return deliver(job, r.final, r.tl, r.audio, 'reel', r.voice);
  }
  const style = job.style || {};
  console.log('Script du ' + job.day_date + ' : ' + job.scenes.length + ' scènes, palette ' + style.palette);
  // Voix clonée si un enregistrement de référence existe ; sinon (ou en cas
  // d'échec) la voix Henri déjà préparée pour chaque scène.
  let cloned = null;
  if (false) { // voix Henri uniquement
    try { cloned = await cloneVoices(DIR, job.clone_voice_url, job.scenes); console.log('Voix clonée prête'); }
    catch (e) { console.error('Clonage impossible, voix Henri utilisée : ' + String((e && e.message) || e).slice(-300)); }
  }
  const voiceFiles = [], durs = [];
  for (const [i, s] of job.scenes.entries()) {
    let f = cloned && cloned[i], d = f ? await duration(f).catch(() => 0) : 0;
    if (!(d > 0.4)) {
      const raw = join(DIR, 'v' + i + '.mp3');
      await download(s.audio_url, raw);
      f = await tightVoice(raw, join(DIR, 'vt' + i + '.wav'));
      d = await duration(f);
    }
    if (!(d > 0.4)) throw new Error('Voix de la scène ' + (i + 1) + ' vide');
    voiceFiles.push(f); durs.push(d);
  }
  const tl = buildTimeline(job.scenes, durs);
  await alignScenes(tl, voiceFiles, DIR);
  // YouTube Shorts : jusqu'à 3 min ; Facebook reçoit sa version coupée à 90 s.
  if (tl.total < 12 || tl.total > 180) throw new Error('Durée anormale : ' + tl.total.toFixed(1) + ' s');
  if (style.theme) { const { downloadClips } = await import('./v2/index.mjs'); await downloadClips(job.scenes, DIR); }
  const env = await buildEnv(job, tl, DIR);
  console.log('Logos chargés : ' + env.logos.map((l) => (l.home ? 1 : 0) + (l.away ? 1 : 0)).join(',') + ' — durée ' + tl.total.toFixed(1) + ' s');

  const video = join(DIR, 'video.mp4'), audio = join(DIR, 'audio.m4a'), final = join(DIR, 'final.mp4');
  await renderVideo({ job, particles: env.particles }, tl, video, DIR);
  await makeSfx(DIR, tl.total);
  let events;
  if (style.theme) { const { makeV2Sfx, v2Events } = await import('./v2/sound.mjs'); await makeV2Sfx(DIR, tl.total, style.theme); events = v2Events(tl, env); }
  else events = sfxEvents(tl, env);
  await mixAudio(DIR, tl, voiceFiles, events, audio);
  await run('ffmpeg', ['-y', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-shortest', '-movflags', '+faststart', final]);
  return deliver(job, final, tl, audio, env.type, cloned ? 'clone' : 'henri');
}

// Version Facebook : les Reels publiés par l'API sont limités à 90 s.
// On retire les scènes marquées fb: false (tutoriel d'inscription).
async function facebookCut(final, tl) {
  const keep = tl.scenes.filter((s) => s.fb !== false);
  if (keep.length === tl.scenes.length && tl.total <= 90) return final;
  const out = join(DIR, 'facebook.mp4'), parts = [];
  keep.forEach((s, i) => {
    const a = s.start.toFixed(3), b = (s.start + s.dur).toFixed(3);
    parts.push('[0:v]trim=' + a + ':' + b + ',setpts=PTS-STARTPTS[v' + i + ']');
    parts.push('[0:a]atrim=' + a + ':' + b + ',asetpts=PTS-STARTPTS,afade=t=in:d=0.05,afade=t=out:st=' + Math.max(0, s.dur - 0.08).toFixed(3) + ':d=0.08[a' + i + ']');
  });
  parts.push(keep.map((_, i) => '[v' + i + '][a' + i + ']').join('') + 'concat=n=' + keep.length + ':v=1:a=1[v][a]');
  await run('ffmpeg', ['-y', '-i', final, '-filter_complex', parts.join(';'), '-map', '[v]', '-map', '[a]', '-t', '89.5', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out]);
  console.log('Version Facebook : ' + (await duration(out)).toFixed(1) + ' s');
  return out;
}

// Contrôles, relecture puis envoi (commun à tous les formats verticaux).
async function deliver(job, final, tl, audio, type, voice) {
  const fbFile = await facebookCut(final, tl).catch((e) => { console.error('Version Facebook : ' + e.message); return null; });
  if (job.dry_run) {
    // Montage d'essai : version allégée de la vidéo complète, à regarder dans l'appli.
    const prev = join(DIR, 'preview.mp4');
    const reel = type === 'reel';
    await run('ffmpeg', ['-y', '-i', final, '-vf', 'scale=720:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', reel ? '24' : '30', '-c:a', 'aac', '-b:a', reel ? '128k' : '96k', '-movflags', '+faststart', prev]);
    {
      // Trop lourde pour un envoi direct : déposée sur le dépôt du studio.
      const { publishPreview } = await import('./long.mjs');
      await api('preview', { video_url: await publishPreview(prev), voice });
      if (fbFile && fbFile !== final) {
        const fprev = join(DIR, 'preview-fb.mp4');
        await run('ffmpeg', ['-y', '-i', fbFile, '-vf', 'scale=720:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', fprev]);
        await api('preview', { video_url: await publishPreview(fprev), voice, cut: 'facebook' }).catch((e) => console.error('Aperçu Facebook : ' + e.message));
      }
    }
  }

  const metrics = await checks(final, tl, audio);
  console.log('Contrôle technique OK', JSON.stringify(metrics));
  const { review } = await api('review', { frames: await keyFrames(final, tl, type), metrics });
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
  if (targets.includes('facebook')) {
    try {
      // Facebook va chercher la vidéo : elle est déposée sur le dépôt du studio.
      const { publishPreview } = await import('./long.mjs');
      const fb = await api('facebook_publish', { video_url: await publishPreview(fbFile || final) });
      if (!fb.facebook_id) throw new Error(fb.error || 'aucun identifiant renvoyé');
      res.facebook_id = fb.facebook_id;
      console.log('Reel Facebook publié : ' + fb.facebook_id);
    } catch (e) { res.facebook_error = String((e && e.message) || e); console.error('Facebook : ' + res.facebook_error); }
  }
  if (!res.publish_id && !res.youtube_id && !res.facebook_id) throw new Error([res.tiktok_error && 'TikTok : ' + res.tiktok_error, res.youtube_error && 'YouTube : ' + res.youtube_error, res.facebook_error && 'Facebook : ' + res.facebook_error].filter(Boolean).join(' \u2014 ') || 'Aucune plateforme vis\u00e9e');
  await api('done', res);
}

main().catch(async (e) => {
  console.error(e);
  try { await api('fail', { error: String((e && e.message) || e) }); } catch (x) { /* rien */ }
  process.exit(1);
});
