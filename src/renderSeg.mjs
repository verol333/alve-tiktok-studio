// Un segment de la vidéo prono, monté dans son propre processus : la mémoire
// réservée par chaque image est rendue au système à la fin du segment.
import { readFileSync } from 'node:fs';
import { buildEnv } from './env.mjs';
import { renderFrames } from './render.mjs';

const [specFile, f0, f1, out] = process.argv.slice(2);
const { spec, tl, DIR } = JSON.parse(readFileSync(specFile, 'utf8'));
const env = await buildEnv(spec.job, tl, DIR, spec.particles);
await renderFrames(env, tl, Number(f0), Number(f1), out);
