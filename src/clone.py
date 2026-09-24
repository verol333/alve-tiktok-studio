# Voix clonée : lit chaque scène avec la voix de l'enregistrement de référence.
# Modèle libre Chatterbox Multilingual (Resemble AI, licence MIT), sur processeur.
# Réglages « diction » : débit un peu plus posé (cfg_weight bas) et une vraie
# respiration entre les phrases, pour que chaque mot soit bien compris.
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
gap = torch.zeros(1, int(model.sr * 0.28))

for j in jobs:
    # Phrase par phrase : le modèle est plus stable sur des textes courts.
    parts = [p for p in re.split(r"(?<=[.!?…])\s+", j["text"].strip()) if p.strip()]
    wavs = []
    for p in parts:
        wavs += [model.generate(p, language_id="fr", exaggeration=0.5, cfg_weight=0.4), gap]
    ta.save(j["out"], torch.cat(wavs[:-1], dim=1), model.sr)
    print("scène prête :", j["out"], flush=True)
