#!/usr/bin/env bash
# Derive the extension ID from EXTENSION_PUBLIC_KEY (same algorithm Chrome uses:
# first 32 hex chars of SHA-256(DER public key), mapped 0-f -> a-p).
source "$(dirname "$0")/lib/common.sh"
require_var EXTENSION_PUBLIC_KEY "run: mise run ext:key"

id="$(printf '%s' "$EXTENSION_PUBLIC_KEY" | openssl base64 -d -A | openssl dgst -sha256 -binary | xxd -p -c 64 | cut -c1-32 | tr '0-9a-f' 'a-p')"

cat <<EOF
Extension ID:            $id
Sign In Callback (URL):  https://$id.chromiumapp.org/

In CloudKit Console > your container > Tokens & Keys > API Token:
  Sign In Callback = "URL Redirect" -> https://$id.chromiumapp.org/
EOF
