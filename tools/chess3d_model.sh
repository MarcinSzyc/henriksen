#!/bin/bash
# Szachy 3D: pobiera model „A Beautiful Game” (Khronos glTF Sample Assets, CC BY 4.0) i zmniejsza go dla telefonu
# narzędziem gltf-transform (Khronos): uproszczone siatki, tekstury 512 px w WebP, kompresja meshopt.
# Wynik: chess/3d/chess3d.glb (kilka MB). Uruchom z katalogu repozytorium: bash tools/chess3d_model.sh
set -euo pipefail
cd "$(dirname "$0")/.."
T=$(mktemp -d)
curl -sL -o "$T/game.glb" https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ABeautifulGame/glTF-Binary/ABeautifulGame.glb
GT="npx -y @gltf-transform/cli@4"
$GT weld "$T/game.glb" "$T/1.glb"
$GT simplify "$T/1.glb" "$T/2.glb" --ratio 0.12 --error 0.0015
$GT resize "$T/2.glb" "$T/3.glb" --width 512 --height 512
$GT webp "$T/3.glb" "$T/4.glb" --quality 82
$GT meshopt "$T/4.glb" chess/3d/chess3d.glb
ls -la chess/3d/chess3d.glb
rm -rf "$T"
