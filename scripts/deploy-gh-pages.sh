#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

copy() {
  mkdir -p "$TMP/$(dirname "$1")"
  cp "$ROOT/$1" "$TMP/$1"
}

for file in index.html app.js styles.css scheme-standalone.html .nojekyll; do
  copy "$file"
done

cp -R "$ROOT/canva" "$TMP/canva"

cd "$TMP"
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Publish CPO scheme site"
git push -f "https://github.com/bbenicore-web/bencode.git" HEAD:gh-pages

echo "Published to gh-pages branch"
