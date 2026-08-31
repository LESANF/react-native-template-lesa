#!/usr/bin/env sh
# 탭 아이콘 PNG 생성 — assets/icons/tabs/<name>.svg 한 장에서
#   <name>.png / @2x / @3x            (기본,  DEFAULT_COLOR)
#   <name>-selected.png / @2x / @3x   (선택,  SELECTED_COLOR)
# 여섯 장을 만든다. NativeTabs(iOS 26·Android)가 이 PNG 쌍을 쓴다.
# 요구: ImageMagick 7 (`brew install imagemagick`). 손으로 PNG를 만들지 말고 이 스크립트만 돌린다.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/assets/icons/tabs"
OUT_DIR="${OUT_DIR:-$SRC_DIR}"
DEFAULT_COLOR='#B1B1B1'
SELECTED_COLOR='#333333'
BASE_SIZE=28

render() { # $1 svg  $2 out.png  $3 size  $4 color
  magick -background none -density 384 "$1" -resize "${3}x${3}" -fill "$4" -colorize 100 "$2"
}

mkdir -p "$OUT_DIR"
count=0
for svg in "$SRC_DIR"/*.svg; do
  name="$(basename "$svg" .svg)"
  for scale in 1 2 3; do
    size=$((BASE_SIZE * scale))
    suffix=""; [ "$scale" -gt 1 ] && suffix="@${scale}x"
    render "$svg" "$OUT_DIR/${name}${suffix}.png" "$size" "$DEFAULT_COLOR"
    render "$svg" "$OUT_DIR/${name}-selected${suffix}.png" "$size" "$SELECTED_COLOR"
    count=$((count + 2))
  done
done
echo "generated $count png → $OUT_DIR"
