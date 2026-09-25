import { writeFileSync, existsSync, copyFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { download } from './api.mjs';
import { run } from './sh.mjs';

// Voix déjà fabriquées en parallèle par les machines « voix » (voir render.yml).
export const PRE_DIR = '/tmp/prevoice';

// Texte dit comme on parle : adresse du site d'un souffle, « francs » sans « CFA ».
const sayable = (s) => String(s.voice || s.text || '')
  .replace(/alvecapital\.fr/gi, 'Alvé capital point èfère')
  .replace(/\bal\s*v[eé]\s*capital\b/gi, 'Alvé capital')
  .replace(/\bpoint\s+F\s*R\b/gi, 'point èfère')
  .replace(/\bfrancs?\s+CFA\b/gi, 'francs').replace(/\bF\s?CFA\b/g, 'francs').replace(/\s*\bCFA\b/g, '');
export const voiceKey = (text) => createHash('sha1').update(text).digest('hex').slice(0, 16);

// Référence propre : silence de début retiré, volume normalisé, mono 24 kHz.
export async function prepRef(dir, refUrl) {
  mkdirSync(dir, { recursive: true });
  const raw = join(dir, 'ref_raw'), ref = join(dir, 'ref.wav');
  await download(refUrl, raw);
  await run('ffmpeg', ['-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=0.4:stop_threshold=-45dB:stop_silence=0.15,afftdn=nf=-25,highpass=f=70,loudnorm=I=-18:TP=-2', '-t', '20', '-ac', '1', '-ar', '24000', ref]);
  return ref;
}

export async function cloneModel(ref, jobs, dir) {
  if (!jobs.length) return;
  const list = join(dir, 'clone-' + Date.now() + '.json');
  writeFileSync(list, JSON.stringify(jobs));
  await run('python', ['src/clone.py', ref, list]);
  // Nettoyage : souffle retiré, sifflantes adoucies, débit un peu plus posé,
  // longs blancs raccourcis — chaque mot reste bien audible.
  for (const j of jobs) {
    if (!existsSync(j.out)) continue;
    const raw = j.out.replace(/\.wav$/, '.raw.wav');
    renameSync(j.out, raw);
    await run('ffmpeg', ['-y', '-i', raw, '-af', 'afftdn=nf=-28,deesser=i=0.35,atempo=0.96,silenceremove=stop_periods=-1:stop_duration=0.7:stop_threshold=-48dB:stop_silence=0.35', j.out])
      .catch(() => copyFileSync(raw, j.out));
  }
}

// Découpe en morceaux courts (mêmes règles que clone.py) : chaque phrase est
// fabriquée à part, sur n'importe quelle machine, puis les morceaux sont recollés.
export function pieces(text) {
  const out = [];
  for (const sn of String(text).trim().split(/(?<=[.!?…])\s+/).filter((x) => x.trim())) {
    if (sn.length <= 120) { out.push([sn, 0.3]); continue; }
    let cur = '';
    for (const part of sn.split(/(?<=[,:;])\s+/)) {
      if (cur && cur.length + part.length > 110) { out.push([cur, 0.16]); cur = part; }
      else cur = (cur + ' ' + part).trim();
    }
    if (cur) out.push([cur, 0.3]);
  }
  return out;
}

async function joinPieces(files, pauses, out) {
  if (files.length === 1) { copyFileSync(files[0], out); return; }
  const args = ['-y'], f = [];
  files.forEach((p, i) => { args.push('-i', p); f.push('[' + i + ':a]' + (i < files.length - 1 ? 'apad=pad_dur=' + pauses[i] : 'anull') + '[p' + i + ']'); });
  f.push(files.map((_, i) => '[p' + i + ']').join('') + 'concat=n=' + files.length + ':v=0:a=1[o]');
  await run('ffmpeg', [...args, '-filter_complex', f.join(';'), '-map', '[o]', out]);
}

// Voix off de chaque scène avec la voix clonée : on reprend les morceaux déjà
// prêts (machines « voix »), on ne fabrique ici que les manquants.
export async function cloneVoices(dir, refUrl, scenes) {
  const plan = [], todo = new Map();
  for (const [i, s] of scenes.entries()) {
    const ps = pieces(sayable(s)).map(([text, pause]) => {
      const key = voiceKey(text), pre = join(PRE_DIR, key + '.wav'), own = join(dir, 'p' + key + '.wav');
      const file = existsSync(pre) ? pre : own;
      if (file === own && !todo.has(key)) todo.set(key, { text, out: own });
      return { file, pause };
    });
    plan.push({ ps, out: join(dir, 'c' + i + '.wav') });
  }
  console.log('Voix clonée : ' + todo.size + ' morceaux à fabriquer ici');
  if (todo.size) await cloneModel(await prepRef(dir, refUrl), [...todo.values()], dir);
  const outs = [];
  for (const p of plan) {
    const ok = p.ps.filter((x) => existsSync(x.file));
    if (ok.length === p.ps.length && ok.length) await joinPieces(ok.map((x) => x.file), ok.map((x) => x.pause), p.out);
    outs.push(p.out);
  }
  return outs;
}

// Répartit les morceaux entre les machines : les plus longs d'abord, chacun
// vers la machine la moins chargée.
export function shardJobs(scenes, shard, shards, outDir) {
  const uniq = new Map();
  for (const s of scenes) for (const [text] of pieces(sayable(s))) uniq.set(voiceKey(text), text);
  const load = Array(shards).fill(0), mine = [];
  for (const [key, text] of [...uniq].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
    const k = load.indexOf(Math.min(...load));
    load[k] += text.length + 40;
    if (k === shard) mine.push({ text, out: join(outDir, key + '.wav') });
  }
  return mine;
}
