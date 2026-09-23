import { join } from 'node:path';
import { run } from './sh.mjs';
import { comboRevealAt } from './scenes.mjs';

// Bruitages et musique douce fabriqués sur place (aucun fichier sous droits).
export async function makeSfx(dir, total) {
  const gen = (name, src, extra) => run('ffmpeg', ['-y', '-f', 'lavfi', '-i', src].concat(extra || []).concat(['-ar', '44100', '-ac', '2', join(dir, name)]));
  await gen('whoosh.wav', 'anoisesrc=d=0.5:c=pink:a=0.6', ['-af', 'highpass=f=400,lowpass=f=6000,afade=t=in:st=0:d=0.22,afade=t=out:st=0.22:d=0.28']);
  await gen('impact.wav', "aevalsrc='0.9*sin(2*PI*(45+140*exp(-18*t))*t)*exp(-5*t)':d=0.8:s=44100");
  await gen('ding.wav', "aevalsrc='0.3*(sin(2*PI*1318.5*t)+0.5*sin(2*PI*1975.5*t))*exp(-4*t)':d=1:s=44100");
  await gen('rise.wav', "aevalsrc='0.22*sin(2*PI*(200+700*t)*t)*(t/1.2)':d=1.2:s=44100");
  const chord = (a, b) => 'if(lt(mod(t,8),4),' + a + ',' + b + ')';
  const pad = '0.045*(sin(2*PI*' + chord(220, 174.61) + '*t)+sin(2*PI*' + chord(261.63, 220) + '*t)+sin(2*PI*' + chord(329.63, 261.63) + '*t))*(0.75+0.25*sin(2*PI*0.5*t))';
  const soft = '(min(1,mod(t,4)*4)*min(1,(4-mod(t,4))*4))';
  const kick = '0.32*sin(2*PI*52*t)*exp(-9*mod(t,0.6))';
  const hat = '0.025*(2*random(0)-1)*exp(-45*mod(t+0.3,0.6))';
  await gen('music.wav', "aevalsrc='" + pad + '*' + soft + '+' + kick + '+' + hat + "':d=" + (total + 1).toFixed(2) + ':s=44100', ['-af', 'lowpass=f=8000']);
}

export function sfxEvents(tl, env) {
  const ev = [];
  tl.scenes.forEach((s) => {
    if (s.index > 0) ev.push({ name: 'whoosh', at: s.start - 0.08, vol: 0.55 });
    if (s.kind === 'hook') ev.push({ name: 'impact', at: 0.2, vol: 0.8 });
    if (s.kind === 'match') ev.push({ name: 'impact', at: s.start + 0.45, vol: 0.7 });
    if (s.kind === 'pick') ev.push({ name: 'ding', at: s.start + 1.2, vol: 0.45 });
    if (s.kind === 'combo') {
      const at = s.start + comboRevealAt(env);
      ev.push({ name: 'rise', at: at - 0.3, vol: 0.5 }, { name: 'impact', at: at + 0.9, vol: 0.8 }, { name: 'ding', at: at + 0.9, vol: 0.5 });
    }
    if (s.kind === 'teaser') ev.push({ name: 'rise', at: s.start + 0.2, vol: 0.35 });
    if (s.kind === 'outro') ev.push({ name: 'ding', at: s.start + 0.15, vol: 0.4 });
    if (s.kind === 'card') ev.push({ name: 'impact', at: s.start + 0.5, vol: 0.6 });
    if (s.kind === 'legs') ev.push({ name: 'ding', at: s.start + 0.3, vol: 0.4 }, { name: 'ding', at: s.start + s.dur * 0.45, vol: 0.4 });
    if (s.kind === 'calc') ev.push({ name: 'rise', at: s.start + 1.0, vol: 0.35 });
    if (s.kind === 'outcomes') ev.push({ name: 'impact', at: s.start + 1.0, vol: 0.7 }, { name: 'ding', at: s.start + 1.0, vol: 0.5 });
    if (s.kind === 'steps') ev.push({ name: 'ding', at: s.start + 0.3, vol: 0.35 });
  });
  return ev;
}

// Voix calées sur les scènes + musique qui s'efface sous la voix + bruitages.
export async function mixAudio(dir, tl, voiceFiles, events, out) {
  const args = ['-y'], parts = [], vl = [], fx = [];
  const T = tl.total.toFixed(2);
  let idx = 0;
  voiceFiles.forEach((f, i) => {
    args.push('-i', f);
    parts.push('[' + idx + ':a]aresample=44100,aformat=channel_layouts=stereo,adelay=delays=' + Math.round(tl.scenes[i].voiceAt * 1000) + ':all=1[v' + i + ']');
    vl.push('[v' + i + ']'); idx++;
  });
  parts.push(vl.join('') + 'amix=inputs=' + vl.length + ':normalize=0:duration=longest,apad=whole_dur=' + T + ',asplit=2[vmix][vkey]');
  args.push('-i', join(dir, 'music.wav'));
  parts.push('[' + idx + ':a]volume=0.5[mu]'); idx++;
  parts.push('[mu][vkey]sidechaincompress=threshold=0.015:ratio=10:attack=10:release=450[duck]');
  events.forEach((e, j) => {
    args.push('-i', join(dir, e.name + '.wav'));
    parts.push('[' + idx + ':a]adelay=delays=' + Math.max(0, Math.round(e.at * 1000)) + ':all=1,volume=' + e.vol + '[f' + j + ']');
    fx.push('[f' + j + ']'); idx++;
  });
  parts.push('[vmix][duck]' + fx.join('') + 'amix=inputs=' + (2 + fx.length) + ':normalize=0:duration=longest,atrim=0:' + T + ',afade=t=out:st=' + (tl.total - 1.2).toFixed(2) + ':d=1.2,alimiter=limit=0.95[out]');
  args.push('-filter_complex', parts.join(';'), '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', out);
  await run('ffmpeg', args);
}
