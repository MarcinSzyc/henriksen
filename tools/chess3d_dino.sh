#!/bin/bash
# Szachy 3D, skórka „Dinozaury”: pobiera modele z „Animated Dinosaur Pack” (Quaternius, CC0) z Poly Pizza
# i zmniejsza je gltf-transform (resample animacji + meshopt). Wynik: chess/3d/skins/dino/*.glb (ok. 120 KB każdy).
# Uruchom z katalogu repozytorium: bash tools/chess3d_dino.sh
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d); GT="npx -y @gltf-transform/cli@4"; mkdir -p chess/3d/skins/dino
for p in trex:UYtneO5FpF apato:fvo0x8Zk3z trice:IGvrUqGrRM para:KeeQrrouRK raptor:cnlGH2UcDd stego:eFcNbOlpvl; do
  n=${p%%:*}; m=${p#*:}
  u=$(curl -sL "https://poly.pizza/m/$m" | grep -o 'https://static.poly.pizza/[^"]*\.glb' | head -1)
  curl -sL -o "$T/$n.glb" "$u"
  $GT resample "$T/$n.glb" "$T/$n-1.glb"
  $GT meshopt "$T/$n-1.glb" "chess/3d/skins/dino/$n.glb"
done
ls -la chess/3d/skins/dino; rm -rf "$T"
