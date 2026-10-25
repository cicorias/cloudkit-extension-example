#!/usr/bin/env bash
# Build and zip dist/ for upload to the Chrome Web Store / Edge Add-ons.
source "$(dirname "$0")/lib/common.sh"
require_cmd zip
"$REPO_ROOT/scripts/build.sh"
version="$(node -p "require('./package.json').version")"
mkdir -p artifacts
out="artifacts/cloudkit-todo-${version}-${CLOUDKIT_ENVIRONMENT:-development}.zip"
rm -f "$out"
(cd dist && zip -qr "../$out" .)
info "Wrote $out"
warn "The zip contains CLOUDKIT_API_TOKEN (a client-side token). Use a production token for store builds."
