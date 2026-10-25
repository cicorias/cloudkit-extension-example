#!/usr/bin/env bash
# Scan for leaked secrets. Default: full git history plus the working tree.
#   secrets-scan.sh            # history + working tree
#   secrets-scan.sh --staged   # only staged changes (used by the pre-commit hook)
source "$(dirname "$0")/lib/common.sh"
require_cmd gitleaks "Run: mise install"

if [[ "${1:-}" == "--staged" ]]; then
  exec gitleaks git --pre-commit --staged --redact --no-banner --config .gitleaks.toml
fi

if git rev-parse HEAD >/dev/null 2>&1; then
  gitleaks git --redact --no-banner --config .gitleaks.toml
fi
gitleaks dir --redact --no-banner --config .gitleaks.toml .
