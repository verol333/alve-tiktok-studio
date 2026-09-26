// Bruitages et musique des styles v2 (fabriqués sur place, sans droits).
import { join } from 'node:path';
import { run } from '../sh.mjs';
import { isHi, idx } from './kit.mjs';
import { COLLIDE, coteT, confT, scoreT, rowT, totalT, subT, resultT } from './timing.mjs';

const BC = [
  '0.55*sin(2*PI*(48+110*exp(-35*mod(t,0.5085)))*mod(t,0.5085))*exp(-8*mod(t,0.5085))',
  '0.15*(2*random(0)-1)*exp(-20*mod(t+0.5085,1.017))',
  '0.035*(2*random(1)-1)*exp(-70*mod(t,0.2542))',
  '0.1*sin(2*PI*if(lt(mod(t,4.068),2.034),55,43.65)*t)*(1-exp(-12*mod(t,0.5085)))',
  '0.03*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*(0.7+0.3*sin(2*PI*0.25*t))',
].join('+');
const AR = [
  '0.6*tanh(3*sin(2*PI*(40+70*exp(-22*mod(t,0.857)))*mod(t,0.857)))*exp(-2.4*mod(t,0.857))',
  '0.2*(2*random(0)-1)*exp(-16*mod(t+0.857,1.714))',
  '0.03*(2*random(1)-1)*exp(-90*mod(t,0.1071))',
  '0.03*(sin(2*PI*110*t)+sin(2*PI*130.81*t)+sin(2*PI*164.81*t))*(0.7+0.3*sin(2*PI*0.25*t))',
].join('+');

export async function makeV2Sfx(dir, total, theme) {
  const gen = (name, src, extra) => run('ffmpeg', ['-y', '-f', 'lavfi', '-i', src].concat(extra || []).concat(['-ar', '44100', '-ac', '2', join(dir, name)]));
  await gen('swoosh.wav', 'anoisesrc=d=0.6:c=white:a=0.5', ['-af', 'highpass=f=800,lowpass=f=9000,afade=t=in:st=0:d=0.35,afade=t=out:st=0.35:d=0.25']);
  await gen('boom.wav', "aevalsrc='0.95*tanh(2.2*sin(2*PI*(38+90*exp(-9*t))*t))*exp(-2.6*t)':d=1.6:s=44100");
  await gen('stamp.wav', "aevalsrc='0.8*sin(2*PI*(90+200*exp(-40*t))*t)*exp(-14*t)+0.35*(2*random(0)-1)*exp(-30*t)':d=0.5:s=44100", ['-af', 'lowpass=f=5000']);
  await gen('tick.wav', "aevalsrc='0.4*sin(2*PI*1800*t)*exp(-70*t)+0.2*(2*random(0)-1)*exp(-200*t)':d=0.12:s=44100");
  await gen('riser.wav', "aevalsrc='0.25*(2*random(0)-1)*(t/1.4)':d=1.4:s=44100", ['-af', 'highpass=f=1500,afade=t=out:st=1.3:d=0.1']);
  await gen('spark.wav', "aevalsrc='0.5*(2*random(0)-1)*exp(-9*t)':d=0.5:s=44100", ['-af', 'highpass=f=3000']);
  await gen('music.wav', "aevalsrc='" + (theme === 'arena' ? AR : BC) + "':d=" + (total + 1).toFixed(2) + ':s=44100', ['-af', 'lowpass=f=9000,volume=0.9']);
}

const KIN = new Set(['hook', 'retention', 'teaser', 'outro']);
export function v2Events(tl, env) {
  const A = env.style.theme === 'arena', ev = [];
  const add = (name, at, vol) => ev.push({ name, at: Math.max(0, at), vol });
  tl.scenes.forEach((s) => {
    const o = s.start, p = env.picks[idx(env, s)];
    if (s.index > 0) add(A ? 'boom' : 'swoosh', o - (A ? 0.03 : 0.35), A ? 0.35 : 0.6);
    if (KIN.has(s.kind)) s.words.forEach((w) => { if (isHi(w.text, s.highlight)) add(A ? 'stamp' : 'tick', s.voiceAt + w.start * s.voiceDur, 0.4); });
    if (s.kind === 'hook') add('boom', 0.05, 0.8);
    if (s.kind === 'match') {
      if (A) { add('swoosh', o + 0.1, 0.5); add('boom', o + COLLIDE, 0.9); add('spark', o + COLLIDE, 0.5); }
      else { add('swoosh', o + 0.08, 0.45); add('swoosh', o + 0.22, 0.45); add('stamp', o + COLLIDE, 0.55); }
      if (p && p.probable_score) add(A ? 'stamp' : 'tick', o + scoreT(s), 0.5);
    }
    if (s.kind === 'pick' && p) {
      add(A ? 'spark' : 'tick', o + 0.05, 0.4);
      add(A ? 'stamp' : 'ding', o + coteT(s, p), A ? 0.9 : 0.5);
      if (A) add('boom', o + coteT(s, p), 0.45);
      add('rise', o + confT(s, p) - 0.2, 0.3);
    }
    if (s.kind === 'combo') {
      env.picks.forEach((_, k) => add(A ? 'stamp' : 'keys_s', o + rowT(k), A ? 0.6 : 0.5));
      const T = o + totalT(s, env);
      add('riser', T - 1.4, 0.45); add('boom', T, 0.9); add('ding', T, 0.5);
    }
    if (s.kind === 'results') {
      const n = Math.min(3, ((env.proof && env.proof.wins) || []).length);
      for (let k = 0; k < n; k++) add(A ? 'stamp' : 'ding', o + resultT(s, k, n) + 0.25, 0.45);
    }
    if (s.kind === 'site') add('keys_s', o + 0.45, 0.5);
    if (s.kind === 'outro') add('pop', o + subT(s), 0.6);
  });
  return ev;
}
