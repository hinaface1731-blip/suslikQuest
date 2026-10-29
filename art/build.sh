#!/usr/bin/env bash
# Пересобирает спрайты через pxl и кладёт PNG в ../assets/sprites.
# Фоны и карту готовит prep_backgrounds.py.
set -euo pipefail
cd "$(dirname "$0")"
PXL=${PXL:-"npx -y github:uilianks/pxl"}
for f in sprites actors; do $PXL build "$f.px.js" --no-preview; done
mkdir -p ../assets/sprites
cp out/sprites/*.png ../assets/sprites/
