import { writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
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
  await run('ffmpeg', ['-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,highpass=f=70,loudnorm=I=-18:TP=-2', '-t', '20', '-ac', '1', '-ar', '24000', ref]);
  return ref;
}

export async function cloneModel(ref, jobs, dir) {
  if (!jobs.length) return;
  const list = join(dir, 'clone-' + Date.now() + '.json');
  writeFileSync(list, JSON.stringify(jobs));
  await run('python', ['src/clone.py', ref, list]);
}

// Voix off de chaque scène avec la voix clonée : on reprend celles déjà
// prêtes, on ne fabrique ici que les manquantes.
export async function cloneVoices(dir, refUrl, scenes) {
  const outs = [], todo = [];
  for (const [i, s] of scenes.entries()) {
    const text = sayable(s), out = join(dir, 'c' + i + '.wav'), pre = join(PRE_DIR, voiceKey(text) + '.wav');
    if (existsSync(pre)) copyFileSync(pre, out);
    else todo.push({ text, out });
    outs.push(out);
  }
  console.log('Voix clonée : ' + (scenes.length - todo.length) + ' scènes déjà prêtes, ' + todo.length + ' à fabriquer');
  if (todo.length) await cloneModel(await prepRef(dir, refUrl), todo, dir);
  return outs;
}

// Répartit les scènes entre les machines : les plus longues d'abord, chacune
// vers la machine la moins chargée.
export function shardJobs(scenes, shard, shards, outDir) {
  const uniq = new Map();
  for (const s of scenes) { const text = sayable(s); if (text.trim()) uniq.set(voiceKey(text), text); }
  const load = Array(shards).fill(0), mine = [];
  for (const [key, text] of [...uniq].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
    const k = load.indexOf(Math.min(...load));
    load[k] += text.length;
    if (k === shard) mine.push({ text, out: join(outDir, key + '.wav') });
  }
  return mine;
}
