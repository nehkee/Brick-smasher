#!/usr/bin/env bash
# Builds the publishable site into dist/ (used by Cloudflare Pages).
# Only the game files are published; docs/ and supabase/ never are.
set -euo pipefail
rm -rf dist
mkdir -p dist
cp index.html og-image.png apple-touch-icon.png _headers dist/
cp -r src dist/src
echo "Built dist/ with: $(cd dist && find . -type f | wc -l) files"
