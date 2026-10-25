#!/usr/bin/env bash
# Production build into dist/. Config comes from .env.local / the environment.
source "$(dirname "$0")/lib/common.sh"
[[ -n "${CLOUDKIT_API_TOKEN:-}" ]] || warn "CLOUDKIT_API_TOKEN unset; the build will run but cannot reach CloudKit."
[[ -n "${EXTENSION_PUBLIC_KEY:-}" ]] || warn "EXTENSION_PUBLIC_KEY unset; the extension ID will not be stable (mise run ext:key)."
pnpm exec tsc --noEmit
pnpm exec vite build --mode production
info "Built dist/. Load it unpacked at chrome://extensions or edge://extensions."
