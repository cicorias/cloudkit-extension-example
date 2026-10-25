#!/usr/bin/env bash
# Store a CloudKit *management token* in the macOS keychain for cktool.
# Create it at https://icloud.developer.apple.com/ > (account menu) > Settings >
# Tokens. cktool prompts for it, so it never touches a file or shell history.
source "$(dirname "$0")/lib/common.sh"
xcrun --find cktool >/dev/null 2>&1 || die "cktool not found. Install Xcode (cktool ships with Xcode 13+)."
info "Paste the management token when cktool prompts for it."
exec xcrun cktool save-token --type management
