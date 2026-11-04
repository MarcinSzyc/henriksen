"""Nagrania komentatorów szachów (Zbyszek, Janusz, Grażyna) – głosy Piper (rhasspy/piper-voices, CC0).
Kwestie czyta z index.html (JSON między /*LINES*/ i /*END*/), zapisuje chess/voices/<kto>/<kategoria>-<nr>.m4a.
Uruchamiaj przez tools/sz_voices.sh (tworzy środowisko z piper-tts i pobiera modele)."""
import json, os, re, subprocess, sys, tempfile, urllib.request, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.expanduser("~/.cache/henriksen-piper")
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main/pl/pl_PL"
# kto: (głos, kolejne zapasowe głosy, tempo: >1 wolniej, <1 szybciej)
# Wszyscy komentatorzy mają już nagrania z ElevenLabs – skrypt nic nie nadpisuje (dawniej: zbyszek bass 1.08, janusz darkman 0.9, grazyna gosia 1.0)
WHO = {}

def model(names):
    for v in names:
        for q in ("medium", "high", "low", "x_low"):
            base = f"pl_PL-{v}-{q}"
            onnx = os.path.join(CACHE, base + ".onnx")
            if os.path.exists(onnx) and os.path.exists(onnx + ".json"):
                return onnx, base
            try:
                os.makedirs(CACHE, exist_ok=True)
                for ext in (".onnx", ".onnx.json"):
                    urllib.request.urlretrieve(f"{HF}/{v}/{q}/{base}{ext}", os.path.join(CACHE, base + ext))
                return onnx, base
            except Exception:
                for ext in (".onnx", ".onnx.json"):
                    try: os.remove(os.path.join(CACHE, base + ext))
                    except OSError: pass
    sys.exit(f"Brak modelu dla {names}")

def say(voice, text, path, scale):
    with wave.open(path, "wb") as w:
        try:  # piper-tts 1.3+
            from piper import SynthesisConfig
            voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=scale))
        except ImportError:  # starsze piper-tts
            voice.synthesize(text, w, length_scale=scale)

def main():
    from piper import PiperVoice
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    lines = json.loads(re.search(r"/\*LINES\*/(.*?)/\*END\*/", html, re.S).group(1))
    tmp = tempfile.mkdtemp()
    for who, (names, scale) in WHO.items():
        onnx, base = model(names)
        print(f"{who}: {base}")
        voice = PiperVoice.load(onnx)
        out = os.path.join(ROOT, "chess", "voices", who)
        os.makedirs(out, exist_ok=True)
        for cat, texts in lines[who].items():
            for n, text in enumerate(texts):
                wav = os.path.join(tmp, f"{who}-{cat}-{n}.wav")
                say(voice, text, wav, scale)
                subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", wav, os.path.join(out, f"{cat}-{n}.m4a")], check=True)
                print(f"  {cat}-{n}: {text}")

if __name__ == "__main__":
    main()
