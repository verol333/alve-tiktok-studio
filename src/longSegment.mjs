// Un segment de la vidéo longue, monté dans son propre processus.
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildEnv, renderSegment } from './long.mjs';

const [specFile, f0, f1, out] = process.argv.slice(2);
const { spec, tl } = JSON.parse(readFileSync(specFile, 'utf8'));
const env = await buildEnv(spec, dirname(specFile));
await renderSegment(env, tl, Number(f0), Number(f1), out);
