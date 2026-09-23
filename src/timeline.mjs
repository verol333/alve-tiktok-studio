// Minutage : chaque scène dure exactement le temps de sa voix (+ respiration).
export function buildTimeline(scenes, durs) {
  let t = 0; const out = [];
  scenes.forEach((s, i) => {
    const lead = i === 0 ? 0.12 : 0.18;
    const tail = s.kind === 'outro' ? 1.6 : 0.28;
    const dur = lead + durs[i] + tail;
    const words = String(s.text || '').split(/\s+/).filter(Boolean);
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
