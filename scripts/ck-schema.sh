#!/usr/bin/env bash
# CloudKit schema-as-code via Apple's cktool.
#   ck-schema.sh validate|import|export|reset
#
# cktool can only write to the *development* environment. Promote to production
# with CloudKit Console > Schema > "Deploy Schema Changes…" (see docs).
source "$(dirname "$0")/lib/common.sh"

xcrun --find cktool >/dev/null 2>&1 || die "cktool not found. Install Xcode (cktool ships with Xcode 13+)."
require_var APPLE_TEAM_ID "your 10-character Apple Developer Team ID"
require_var CLOUDKIT_CONTAINER_ID

SCHEMA_FILE="$REPO_ROOT/cloudkit/schema.ckdb"
common=(--team-id "$APPLE_TEAM_ID" --container-id "$CLOUDKIT_CONTAINER_ID" --environment development)

case "${1:-}" in
  validate)
    info "Validating $SCHEMA_FILE against $CLOUDKIT_CONTAINER_ID (development)"
    xcrun cktool validate-schema "${common[@]}" --file "$SCHEMA_FILE"
    ;;
  import)
    info "Importing $SCHEMA_FILE into $CLOUDKIT_CONTAINER_ID (development)"
    xcrun cktool import-schema "${common[@]}" --validate --file "$SCHEMA_FILE"
    info "Imported. Deploy to production from CloudKit Console when ready."
    ;;
  export)
    out="$REPO_ROOT/cloudkit/schema.exported.ckdb"
    info "Exporting development schema to $out"
    xcrun cktool export-schema "${common[@]}" --output-file "$out"
    info "Compare with: diff cloudkit/schema.ckdb cloudkit/schema.exported.ckdb"
    ;;
  reset)
    warn "This resets the DEVELOPMENT schema and deletes ALL development data in $CLOUDKIT_CONTAINER_ID."
    read -r -p "Type the container ID to confirm: " confirm
    [[ "$confirm" == "$CLOUDKIT_CONTAINER_ID" ]] || die "Confirmation did not match; nothing changed."
    xcrun cktool reset-schema --team-id "$APPLE_TEAM_ID" --container-id "$CLOUDKIT_CONTAINER_ID"
    ;;
  *)
    die "usage: $0 validate|import|export|reset"
    ;;
esac
