#!/usr/bin/env bash
# First-time developer setup. Safe to re-run.
source "$(dirname "$0")/lib/common.sh"

require_cmd node
require_cmd pnpm

if [[ ! -f .env.local ]]; then
  info "Creating .env.local from .env.example (gitignored)"
  cp .env.example .env.local
  chmod 600 .env.local
else
  info ".env.local already exists, leaving it alone"
fi

if [[ ! -f .envrc ]]; then
  info "Creating .envrc from .envrc.example (gitignored)"
  cp .envrc.example .envrc
  command -v direnv >/dev/null 2>&1 && warn "Run 'direnv allow' to activate it."
fi

info "Installing node dependencies"
pnpm install

if git rev-parse --git-dir >/dev/null 2>&1; then
  info "Installing git hooks (.githooks)"
  git config core.hooksPath .githooks
fi

if [[ -z "${EXTENSION_PUBLIC_KEY:-}" ]]; then
  warn "No extension key yet. Run: mise run ext:key"
fi

info "Done. Next: follow docs/apple-developer-setup.md, then 'mise run doctor'."
