# Horodatage mot à mot de chaque voix (reconnaissance vocale locale, gratuite).
import sys, json
from faster_whisper import WhisperModel

spec = json.load(open(sys.argv[1]))
model = WhisperModel("small", device="cpu", compute_type="int8")
out = []
for it in spec:
    words = []
    try:
        segs, _ = model.transcribe(it["file"], language="fr", word_timestamps=True, beam_size=5,
                                   condition_on_previous_text=False, initial_prompt=(it.get("prompt") or None))
        for s in segs:
            for w in (s.words or []):
                words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
    except Exception as e:
        print("scene ignoree:", e, file=sys.stderr)
    out.append(words)
json.dump(out, open(sys.argv[2], "w"))
