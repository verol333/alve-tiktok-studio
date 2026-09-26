// Instants clés de chaque scène (communs à l'image et aux bruitages).
export const COLLIDE = 0.55;
const num = (s) => String(s).replace(',', '.');
export function wordT(sc, test, fb) {
  const w = (sc.words || []).find((x) => test(x.text));
  return w ? sc.voiceAt - sc.start + w.start * sc.voiceDur : fb;
}
export const coteT = (sc, p) => wordT(sc, (x) => num(x).includes(Number(p.cote).toFixed(2)), 1.0);
export const confT = (sc, p) => wordT(sc, (x) => x.replace('%', '') === String(Math.round(Number(p.confidence) || 0)), coteT(sc, p) + 0.6);
export const scoreT = (sc) => wordT(sc, (x) => /\d+-\d+/.test(x), 1.3);
export const rowT = (k) => 0.55 + 0.42 * k;
export const totalT = (sc, env) => Math.max(rowT(env.picks.length) + 0.25, wordT(sc, (x) => num(x).includes(env.totalOdds.toFixed(2)), 0) - 0.1);
export const subT = (sc) => wordT(sc, (x) => /abonne/i.test(x), Math.max(0.6, sc.dur - 2));
export const resultT = (sc, k, n) => 0.45 + k * Math.max(0.55, (sc.voiceDur * 0.7) / Math.max(1, n));
