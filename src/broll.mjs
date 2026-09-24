// Plans d'illustration (bibliothèque AL VE CAPITAL) lus image par image,
// au rythme du montage, pour servir de fond animé aux scènes.
import { spawn } from 'node:child_process';
import { createCanvas } from '@napi-rs/canvas';

const BW = 1280, BH = 720, FS = BW * BH * 4;

export class Broll {
  constructor(file, start) {
    this.canvas = createCanvas(BW, BH);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(BW, BH);
    this.chunks = []; this.len = 0; this.ended = false; this.waiters = []; this.has = false;
    this.p = spawn('ffmpeg', ['-v', 'error', '-stream_loop', '-1', '-ss', String(start || 1), '-i', file,
      '-vf', 'scale=' + BW + ':' + BH + ':force_original_aspect_ratio=increase,crop=' + BW + ':' + BH + ',fps=30',
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
    this.ctx.putImageData(this.img, 0, 0);
    this.has = true;
    return this.canvas;
  }
  close() { try { this.p.kill('SIGKILL'); } catch (e) { /* rien */ } }
}
