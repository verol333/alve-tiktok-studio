// Plans vidéo de fond (stade, supporters, action) lus image par image.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { download } from '../api.mjs';
import { duration } from '../sh.mjs';

const B = 'https://base44.app/api/apps/698a58b8d266d256a5b8a1fb/files/mp/public/698a58b8d266d256a5b8a1fb/';
export const CLIPS = {
  night: '6fdeb841f_mixkit-28606.mp4', aerial: '16709a0ef_mixkit-4262.mp4', inside: 'fc78ba563_mixkit-43619.mp4',
  grass: 'aff155949_mixkit-14190.mp4', lowpitch: 'eeba9a901_mixkit-30601.mp4', duel: '3ceb4a5eb_mixkit-43483.mp4',
  play: '85b1336c9_mixkit-43481.mp4', goal: '4627e3857_mixkit-43499.mp4', penalty: '89a84b28f_mixkit-43494.mp4',
  dribble: '2281357fb_mixkit-42530.mp4', fans: 'bbbffe8c4_mixkit-18781.mp4', yellow: '25ff50d26_mixkit-30326.mp4',
  crowd: 'a5fd76ce0_mixkit-9585.mp4', friends: 'ec4009989_mixkit-44602.mp4',
};
const BY_KIND = {
  hook: ['night', 'lowpitch', 'inside'], results: ['friends', 'crowd'], match: ['duel', 'play', 'dribble', 'goal'],
  pick: ['penalty', 'grass', 'lowpitch'], retention: ['night', 'aerial'], combo: ['inside', 'aerial'],
  teaser: ['fans', 'yellow'], site: ['yellow', 'fans'], outro: ['crowd', 'friends'],
};
export function clipKey(sc) {
  const list = BY_KIND[sc.kind] || BY_KIND.hook;
  return list[(sc.index + Math.max(0, Math.round(Number(sc.match_index) || 0))) % list.length];
}
const file = (DIR, k) => join(DIR, 'bg_' + k + '.mp4');

export async function downloadClips(scenes, DIR) {
  const keys = [...new Set(scenes.map((s, i) => clipKey(Object.assign({}, s, { index: i }))))];
  for (const k of keys) {
    if (existsSync(file(DIR, k))) continue;
    try { await download(B + CLIPS[k], file(DIR, k)); } catch (e) { console.error('Plan ' + k + ' indisponible'); }
  }
  console.log('Plans de fond : ' + keys.join(', '));
}

export async function clipDurations(DIR) {
  const out = {};
  for (const k of Object.keys(CLIPS)) if (existsSync(file(DIR, k))) out[k] = await duration(file(DIR, k)).catch(() => 0);
  return out;
}

const BW = 540, BH = 960, FS = BW * BH * 4;
class BgStream {
  constructor(path, start, vf) {
    this.canvas = createCanvas(BW, BH); this.ctx = this.canvas.getContext('2d'); this.img = this.ctx.createImageData(BW, BH);
    this.chunks = []; this.len = 0; this.ended = false; this.waiters = []; this.has = false;
    this.p = spawn('ffmpeg', ['-v', 'error', '-stream_loop', '-1', '-ss', start.toFixed(2), '-i', path,
      '-vf', 'scale=' + BW + ':' + BH + ':force_original_aspect_ratio=increase,crop=' + BW + ':' + BH + ',fps=30' + (vf ? ',' + vf : ''),
      '-an', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { stdio: ['ignore', 'pipe', 'ignore'] });
    this.p.stdout.on('data', (d) => { this.chunks.push(d); this.len += d.length; if (this.len > FS * 3) this.p.stdout.pause(); this.wake(); });
    this.p.on('close', () => { this.ended = true; this.wake(); });
    this.p.on('error', () => { this.ended = true; this.wake(); });
  }
  wake() { const w = this.waiters; this.waiters = []; w.forEach((f) => f()); }
  async next() {
    while (this.len < FS && !this.ended) { this.p.stdout.resume(); await new Promise((r) => this.waiters.push(r)); }
    if (this.len < FS) return this.has ? this.canvas : null;
    const dst = this.img.data; let off = 0;
    while (off < FS) {
      const c = this.chunks[0], need = FS - off;
      if (c.length <= need) { dst.set(c, off); off += c.length; this.chunks.shift(); }
      else { dst.set(c.subarray(0, need), off); this.chunks[0] = c.subarray(need); off = FS; }
    }
    this.len -= FS;
    if (this.len < FS * 2) this.p.stdout.resume();
    this.ctx.putImageData(this.img, 0, 0); this.has = true;
    return this.canvas;
  }
  close() { try { this.p.kill('SIGKILL'); } catch (e) { /* rien */ } }
}

// Image de fond de la scène à l'instant t (un plan différent par scène).
export async function bgFrame(env, sc, t) {
  const k = clipKey(sc), dur = env.clipDur[k];
  if (!dur) return null;
  const st = env.bgs || (env.bgs = {});
  if (st.idx !== sc.index) {
    if (st.s) st.s.close();
    st.idx = sc.index;
    const start = (1 + ((sc.index * 2.3) % 4) + (t - sc.start)) % Math.max(1, dur - 0.5);
    st.s = new BgStream(file(env.DIR, k), start, env.bgVf);
  }
  return st.s.next();
}
export function closeBg(env) { if (env.bgs && env.bgs.s) env.bgs.s.close(); }
