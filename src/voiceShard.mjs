import { mkdirSync } from 'node:fs';
import { api } from './api.mjs';
import { prepRef, cloneModel, shardJobs } from './clone.mjs';

// Machine « voix » : fabrique sa part des voix clonées pendant que les autres
// machines font la leur, en même temps.
const SHARD = Number(process.env.SHARD || 0), SHARDS = Number(process.env.SHARDS || 1);
const OUT = '/tmp/voice-out', DIR = '/tmp/voice-work';
mkdirSync(OUT, { recursive: true });

const { job } = await api('job');
if (!job.clone_voice_url) { console.log('Pas de voix de référence : rien à faire'); process.exit(0); }
const mine = shardJobs(job.scenes || [], SHARD, SHARDS, OUT);
console.log('Machine ' + (SHARD + 1) + '/' + SHARDS + ' : ' + mine.length + ' scènes');
if (mine.length) await cloneModel(await prepRef(DIR, job.clone_voice_url), mine, DIR);
