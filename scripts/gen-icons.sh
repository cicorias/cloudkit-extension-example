#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"
node "$REPO_ROOT/scripts/gen-icons.mjs" "$REPO_ROOT/public/icons"
