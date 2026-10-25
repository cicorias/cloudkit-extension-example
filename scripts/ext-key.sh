#!/usr/bin/env bash
# Generate an RSA key whose public half goes into manifest.json "key".
# That pins the extension ID, so the CloudKit Sign In Callback
# (https://<id>.chromiumapp.org/) works the same in Chrome and Edge and on
# every developer machine that shares the key.
#
# The private key (.keys/extension-key.pem) is gitignored. Share it out of
# band (e.g. a password manager) if teammates need the same extension ID.
source "$(dirname "$0")/lib/common.sh"
require_cmd openssl

KEY_DIR="$REPO_ROOT/.keys"
KEY_FILE="$KEY_DIR/extension-key.pem"

if [[ -f "$KEY_FILE" ]]; then
  info "Reusing existing $KEY_FILE"
else
  info "Generating $KEY_FILE"
  mkdir -p "$KEY_DIR"
  chmod 700 "$KEY_DIR"
  openssl genrsa -out "$KEY_FILE" 2048 2>/dev/null
  chmod 600 "$KEY_FILE"
fi

pub="$(openssl rsa -in "$KEY_FILE" -pubout -outform DER 2>/dev/null | openssl base64 -A)"
set_env_var EXTENSION_PUBLIC_KEY "$pub"
export EXTENSION_PUBLIC_KEY="$pub"
info "Recorded EXTENSION_PUBLIC_KEY in .env.local"
"$REPO_ROOT/scripts/ext-info.sh"
