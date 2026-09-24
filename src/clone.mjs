import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { download } from './api.mjs';
import { run } from './sh.mjs';

// Fabrique la voix off de chaque scène avec la voix clonée (src/clone.py).
export async function cloneVoices(dir, refUrl, scenes) {
  const raw = join(dir, 'ref_raw'), ref = join(dir, 'ref.wav');
  await download(refUrl, raw);
  // Référence propre : silence de début retiré, volume normalisé, mono 24 kHz.
  await run('ffmpeg', ['-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,highpass=f=70,loudnorm=I=-18:TP=-2', '-t', '20', '-ac', '1', '-ar', '24000', ref]);
  const jobs = scenes.map((s, i) => ({
    text: String(s.voice || s.text || '').replace(/\bal\s*v[eé]\s*capital\b/gi, 'Alvé Capital'),
    out: join(dir, 'c' + i + '.wav'),
  }));
  const list = join(dir, 'clone.json');
  writeFileSync(list, JSON.stringify(jobs));
  await run('python', ['src/clone.py', ref, list]);
  return jobs.map((j) => j.out);
}
