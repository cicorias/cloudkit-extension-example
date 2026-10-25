#!/usr/bin/env bash
# Report toolchain and configuration status. Never prints secret values.
source "$(dirname "$0")/lib/common.sh"

ok=0
check() { # name, condition-result(0/1), detail
  if [[ "$2" == 0 ]]; then printf '  \033[32m✔\033[0m %-24s %s\n' "$1" "$3"
  else printf '  \033[31m✘\033[0m %-24s %s\n' "$1" "$3"; ok=1; fi
}
has() { command -v "$1" >/dev/null 2>&1 && echo 0 || echo 1; }

echo "Toolchain"
check node     "$(has node)"     "$(node -v 2>/dev/null || echo missing)"
check pnpm     "$(has pnpm)"     "$(pnpm -v 2>/dev/null || echo missing)"
check gitleaks "$(has gitleaks)" "$(gitleaks version 2>/dev/null || echo 'missing (mise install)')"
check cktool   "$(xcrun --find cktool >/dev/null 2>&1 && echo 0 || echo 1)" "requires Xcode (schema tasks only)"
check openssl  "$(has openssl)"  "$(openssl version 2>/dev/null || echo missing)"

echo
echo "Configuration (.env.local)"
check ".env.local"            "$([[ -f .env.local ]] && echo 0 || echo 1)" "$([[ -f .env.local ]] && echo present || echo 'missing: mise run setup')"
check CLOUDKIT_CONTAINER_ID   "$([[ -n "${CLOUDKIT_CONTAINER_ID:-}" ]] && echo 0 || echo 1)" "${CLOUDKIT_CONTAINER_ID:-(unset)}"
check CLOUDKIT_ENVIRONMENT    "$([[ "${CLOUDKIT_ENVIRONMENT:-}" =~ ^(development|production)$ ]] && echo 0 || echo 1)" "${CLOUDKIT_ENVIRONMENT:-(unset)}"
check CLOUDKIT_API_TOKEN      "$([[ -n "${CLOUDKIT_API_TOKEN:-}" ]] && echo 0 || echo 1)" "$(mask "${CLOUDKIT_API_TOKEN:-}")"
check EXTENSION_PUBLIC_KEY    "$([[ -n "${EXTENSION_PUBLIC_KEY:-}" ]] && echo 0 || echo 1)" "$([[ -n "${EXTENSION_PUBLIC_KEY:-}" ]] && echo set || echo 'unset: mise run ext:key')"
check APPLE_TEAM_ID           "$([[ -n "${APPLE_TEAM_ID:-}" ]] && echo 0 || echo 1)" "${APPLE_TEAM_ID:-(unset; needed for ck:* tasks)}"

if [[ -n "${EXTENSION_PUBLIC_KEY:-}" ]]; then
  echo
  "$REPO_ROOT/scripts/ext-info.sh"
fi

exit $ok
