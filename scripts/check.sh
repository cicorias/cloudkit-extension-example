#!/usr/bin/env bash
# Everything CI runs: typecheck, tests, build, secret scan.
source "$(dirname "$0")/lib/common.sh"
info "Typecheck";   pnpm exec tsc --noEmit
info "Unit tests";  pnpm exec vitest run
info "Build";       pnpm exec vite build --mode production
info "Secret scan"; "$REPO_ROOT/scripts/secrets-scan.sh"
info "All checks passed"
