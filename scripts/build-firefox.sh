#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/firefox"

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$ROOT/extension/." "$OUT/"
mv "$OUT/manifest.firefox.json" "$OUT/manifest.json"
rm -f "$OUT/background.js"

echo "Firefox build ready: $OUT"
