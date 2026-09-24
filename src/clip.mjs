// Extrait de l'enregistrement du vrai site, lu image par image au rythme du
// montage (vitesse réglable). À la fin de l'extrait, la dernière image reste.
import { spawn } from 'node:child_process';
import { createCanvas } from '@napi-rs/canvas';

export class Clip {
  constructor(file, start, len, rate, w, h) {
    this.fs = w * h * 4;
    this.canvas = createCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(w, h);
    this.chunks = []; this.len = 0; this.ended = false; this.waiters = []; this.has = false;
    this.p = spawn('ffmpeg', ['-v', 'error', '-ss', Math.max(0, start).toFixed(3), '-t', Math.max(0.3, len).toFixed(3), '-i', file,
      '-vf', 'setpts=(PTS-STARTPTS)/' + Math.max(1, rate).toFixed(3) + ',fps=30,scale=' + w + ':' + h,
      '-an', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { stdio: ['ignore', 'pipe', 'ignore'] });
    this.p.stdout.on('data', (d) => { this.chunks.push(d); this.len += d.length; if (this.len > this.fs * 3) this.p.stdout.pause(); this.wake(); });
    this.p.on('close', () => { this.ended = true; this.wake(); });
    this.p.on('error', () => { this.ended = true; this.wake(); });
  }
  wake() { const w = this.waiters; this.waiters = []; w.forEach((f) => f()); }
  async next() {
    const FS = this.fs;
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
