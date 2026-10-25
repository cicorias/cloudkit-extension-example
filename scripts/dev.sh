#!/usr/bin/env bash
# Rebuild dist/ on every change. Load dist/ as an unpacked extension, then
# click "reload" on chrome://extensions (or edge://extensions) after rebuilds.
source "$(dirname "$0")/lib/common.sh"
info "Watching src/ and building to dist/ (Ctrl-C to stop)"
exec pnpm exec vite build --mode development --watch
