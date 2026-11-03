#!/bin/bash
# Szachy: nagrywa kwestie komentatorów głosami Piper (CC0) do chess/voices/. Potrzebny Python 3 i macOS (afconvert).
# Uruchom z katalogu repozytorium: bash tools/sz_voices.sh
set -euo pipefail
cd "$(dirname "$0")/.."
VENV="$HOME/.cache/henriksen-piper/venv"
[ -x "$VENV/bin/python" ] || { python3 -m venv "$VENV"; "$VENV/bin/pip" install -q piper-tts; }
"$VENV/bin/python" tools/sz_voices.py
du -sh chess/voices
