#!/usr/bin/env bash
source "$(dirname "$0")/lib/common.sh"
exec pnpm exec vitest run "$@"
