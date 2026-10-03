// Étape 3 : les tranches sont recollées (sans réencodage) et le son exact est posé dessus.
import { readdirSync, writeFileSync } from 'node:fs';
import { api } from './api.mjs';
import { run } from './sh.mjs';
const DIR = '/tmp/bc';
async function main() {
  const parts = readdirSync(DIR + '/parts').filter((f) => f.endsWith('.mp4')).sort();
  if (parts.length !== +process.env.SHARDS) throw new Error('tranches manquantes : ' + parts.length);
  writeFileSync(DIR + '/list.txt', parts.map((f) => "file '" + DIR + '/parts/' + f + "'").join('\n'));
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', DIR + '/list.txt', '-i', DIR + '/mix.wav', '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', DIR + '/apercu.mp4']);
  const tag = 'apercu-' + process.env.RUN_ID;
  await run('gh', ['release', 'create', tag, DIR + '/apercu.mp4', '--repo', process.env.GH_REPO, '--title', 'Broadcast rapide', '--notes', 'Rendu image par image']);
  await api('done', { url: 'https://github.com/' + process.env.GH_REPO + '/releases/download/' + tag + '/apercu.mp4' });
  console.log('vidéo envoyée');
}
main().catch(async (e) => { console.error(e); await api('fail', { error: String(e?.message || e) }).catch(() => {}); process.exit(1); });
