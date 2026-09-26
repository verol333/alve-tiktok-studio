// Minutage : chaque scène dure exactement le temps de sa voix (+ respiration).
export function buildTimeline(scenes, durs) {
  let t = 0; const out = [];
  scenes.forEach((s, i) => {
    // Enchaînement serré : pas de blanc entre deux phrases.
    const lead = i === 0 ? 0.08 : 0.06;
    const tail = s.kind === 'outro' ? 1.2 : 0.1;
    const dur = lead + durs[i] + tail;
    const words = String(s.text || '').split(/[ \t\n\r]+/).filter(Boolean);
    const weights = words.map((w) => w.length + 3);
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const wt = words.map((w, k) => { const st = acc / sum; acc += weights[k]; return { text: w, start: st, end: acc / sum }; });
    const chunks = []; let cur = null;
    wt.forEach((w, k) => {
      if (!cur || k - cur.from >= 3 || cur.len + w.text.length > 18) { cur = { from: k, to: k, len: w.text.length }; chunks.push(cur); }
      else { cur.to = k; cur.len += w.text.length + 1; }
    });
    out.push(Object.assign({}, s, { index: i, start: t, dur, voiceAt: t + lead, voiceDur: durs[i], words: wt, chunks }));
    t += dur;
  });
  return { scenes: out, total: t };
}
