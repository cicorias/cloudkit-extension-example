#!/usr/bin/env bash
# Shared helpers for scripts/*. Source it, don't run it:
#   source "$(dirname "$0")/lib/common.sh"
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
export REPO_ROOT ENV_FILE

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarn:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# Load .env.local without clobbering values already in the environment
# (direnv or mise.local.toml may have set them).
load_env() {
  [[ -f "$ENV_FILE" ]] || return 0
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
    [[ "$line" =~ ^[[:space:]]*(export[[:space:]]+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key="${BASH_REMATCH[2]}"
    val="${BASH_REMATCH[3]}"
    val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
    if [[ -z "${!key:-}" ]]; then export "$key=$val"; fi
  done < "$ENV_FILE"
}

# Set KEY=VALUE in .env.local, replacing an existing line or appending.
set_env_var() {
  local key="$1" val="$2" tmp
  touch "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  tmp="$(mktemp)"
  grep -v -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$val" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
}

require_var() {
  local key="$1" hint="${2:-}"
  [[ -n "${!key:-}" ]] || die "$key is not set. Add it to .env.local${hint:+ ($hint)}."
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' not found. ${2:-Run: mise install}"
}

# Show that a secret is set without revealing it.
mask() {
  local v="${1:-}"
  if [[ -z "$v" ]]; then echo "(unset)"; else echo "set (${#v} chars)"; fi
}

load_env
cd "$REPO_ROOT"
