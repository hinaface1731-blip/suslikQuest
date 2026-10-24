#!/usr/bin/env bash
# Пересобирает пиксель-арт через pxl и кладёт PNG в ../assets.
set -euo pipefail
cd "$(dirname "$0")"
PXL=${PXL:-"npx -y github:uilianks/pxl"}
for f in sprites actors scenes; do $PXL build "$f.px.js" --no-preview; done
mkdir -p ../assets/sprites ../assets/scenes
cp out/sprites/*.png ../assets/sprites/
cp out/scenes/*.png ../assets/scenes/
