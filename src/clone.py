# Voix clonée : lit chaque scène avec la voix de l'enregistrement de référence.
# Modèle libre Chatterbox Multilingual (Resemble AI, licence MIT), sur processeur.
# Diction : phrases courtes (les longues sont coupées aux virgules), aléa réduit
# pour une articulation nette, mots clés dits avec plus d'intensité, et chaque
# morceau est refait s'il est anormalement court (mots avalés) ou long.
import json, os, re, sys
import torch, torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

ref, jobs = sys.argv[1], json.load(open(sys.argv[2]))
torch.set_num_threads(os.cpu_count() or 4)
try:
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")
except TypeError:
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
model.prepare_conditionals(ref, exaggeration=0.5)
sr = model.sr
STRONG = re.compile(r"valid|fiable|fiabilit|cote|bravo|gratuit|score final|tout est|félicit|pour cent", re.I)

def gen(p, ex, cfg, temp):
    try:
        return model.generate(p, language_id="fr", exaggeration=ex, cfg_weight=cfg, temperature=temp)
    except TypeError:
        return model.generate(p, language_id="fr", exaggeration=ex, cfg_weight=cfg)

def say(p):
    ex, cfg = (0.68, 0.38) if STRONG.search(p) else (0.5, 0.5)
    want = max(0.6, len(p) / 15.0)
    best = None
    for attempt in range(3):
        w = gen(p, ex, cfg, 0.62 if attempt == 0 else 0.5)
        d = w.shape[-1] / sr
        if 0.55 * want <= d <= 1.9 * want:
            return w
        print("morceau refait (%.1fs pour %.1fs attendues) : %s" % (d, want, p[:60]), flush=True)
        if best is None or abs(d - want) < abs(best[1] - want):
            best = (w, d)
    return best[0]

def pieces(text):
    out = []
    for s in [x for x in re.split(r"(?<=[.!?…])\s+", text.strip()) if x.strip()]:
        if len(s) <= 120:
            out.append((s, 0.3)); continue
        cur = ""
        for part in re.split(r"(?<=[,:;])\s+", s):
            if cur and len(cur) + len(part) > 110:
                out.append((cur, 0.16)); cur = part
            else:
                cur = (cur + " " + part).strip()
        if cur: out.append((cur, 0.3))
    return out

for j in jobs:
    wavs = []
    for p, pause in pieces(j["text"]):
        wavs += [say(p), torch.zeros(1, int(sr * pause))]
    ta.save(j["out"], torch.cat(wavs[:-1], dim=1), sr)
    print("scène prête :", j["out"], flush=True)
