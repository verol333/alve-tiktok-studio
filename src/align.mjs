// Calage des sous-titres : chaque mot affiché apparaît quand Henri le dit
// vraiment (reconnaissance vocale), au lieu d'une estimation à la longueur.
// Les mots écrits autrement qu'ils sont dits (chiffres, « FCFA ») sont placés
// entre les mots reconnus qui les entourent.
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './sh.mjs';

const norm = (w) => String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const same = (a, b) => !!a && !!b && (a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))));

export function alignWords(text, ws, dur) {
  const D = String(text || '').split(/[ \t\n\r]+/).filter(Boolean);
  const S = ws.map((w) => ({ n: norm(w.w), s: w.s, e: Math.max(w.e, w.s + 0.05) })).filter((w) => w.n);
  if (!D.length || !S.length || !(dur > 0)) return null;
  const dn = D.map(norm), n = D.length, m = S.length;
  const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = same(dn[i], S[j].n) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const match = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (same(dn[i], S[j].n) && L[i][j] === L[i + 1][j + 1] + 1) { match[i] = j; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  if (match.filter((x) => x >= 0).length < Math.max(1, Math.floor(n * 0.3))) return null;
  const st = new Array(n).fill(null), en = new Array(n).fill(null);
  match.forEach((j, i) => { if (j >= 0) { st[i] = S[j].s; en[i] = S[j].e; } });
  for (let k = 0; k < n;) {
    if (st[k] != null) { k++; continue; }
    let e = k; while (e < n && st[e] == null) e++;
    const pj = k > 0 ? match[k - 1] : -1, nj = e < n ? match[e] : m;
    const inner = S.slice(pj + 1, nj);
    let w0 = inner.length ? inner[0].s : (k > 0 ? en[k - 1] : 0);
    let w1 = inner.length ? inner[inner.length - 1].e : (e < n ? st[e] : S[m - 1].e);
    if (k > 0) w0 = Math.max(w0, en[k - 1]);
    if (e < n) w1 = Math.min(w1, st[e]);
    if (w1 - w0 < 0.08 * (e - k)) w1 = w0 + 0.08 * (e - k);
    const wt = D.slice(k, e).map((x) => x.length + 2), sum = wt.reduce((p, q) => p + q, 0);
    let acc = w0;
    for (let q = k; q < e; q++) { const d = ((w1 - w0) * wt[q - k]) / sum; st[q] = acc; en[q] = acc + d; acc += d; }
    k = e;
  }
  let last = 0;
  return D.map((t, q) => {
    const s0 = Math.max(last, Math.min(1, st[q] / dur)), e0 = Math.max(s0 + 0.005, Math.min(1, en[q] / dur));
    last = s0;
    return { text: t, start: s0, end: e0 };
  });
}

export async function alignScenes(tl, files, DIR) {
  const inF = join(DIR, 'align-in.json'), outF = join(DIR, 'align-out.json');
  writeFileSync(inF, JSON.stringify(files.map((f, i) => ({ file: f, prompt: String(tl.scenes[i].voice || '').slice(0, 400) }))));
  try { await run('python', [fileURLToPath(new URL('./align.py', import.meta.url)), inF, outF]); }
  catch (e) { console.error('Calage des sous-titres indisponible (estimation gardée) : ' + String(e.message || e).slice(-300)); return; }
  const res = JSON.parse(readFileSync(outF, 'utf8'));
  let ok = 0;
  tl.scenes.forEach((s, i) => {
    const w = alignWords(s.text, res[i] || [], s.voiceDur);
    if (w) { s.words = w; s.aligned = true; ok++; }
  });
  console.log('Sous-titres calés sur la voix : ' + ok + ' / ' + tl.scenes.length + ' scènes');
}
