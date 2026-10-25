# ADR-0004: Apple sign-in through chrome.identity.launchWebAuthFlow and a pinned extension ID

- **Status:** Accepted
- **Date:** 2026-10-25

## Context
The private database requires a per-user `ckWebAuthToken`. CloudKit issues one after the user
signs in to their Apple ID on Apple's page, then redirects to the API token's configured
**Sign In Callback**. "Sign in with Apple" (Services ID / JWT) is a different system and does
**not** grant CloudKit access.

## Decision
- Get the sign-in URL from the `421` response of an unauthenticated `users/caller` call.
- Open it with `chrome.identity.launchWebAuthFlow`. Configure the API token callback as a URL
  redirect to `https://<extension-id>.chromiumapp.org/`, which both Chrome and Edge intercept.
- Pin the extension ID with a manifest `key`. `mise run ext:key` generates the RSA key, the
  private half stays in gitignored `.keys/`, and the public half goes into `.env.local`.
- Run sign-in in the **service worker**, because the popup closes when the auth window takes focus.
- Parse the token from the raw callback URL. `URLSearchParams` would turn `+` into spaces.
- Store the token in `chrome.storage.local` so sign-in survives restarts. Clear it on any `421`.

## Consequences
- One callback URL works for every developer and for both browsers, as long as they share the key.
- The token in `chrome.storage.local` can be read by anyone with access to the browser profile.
  That's acceptable for an example. A "session only" option is in the backlog (B-012).
- Store-published IDs differ from the dev key unless managed (B-030).
