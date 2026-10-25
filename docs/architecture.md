# Architecture

```
┌──────────────── Browser extension (MV3) ────────────────┐
│ popup/      quick add, check off, delete                │
│ sidepanel/  filter, multi-select, bulk edit, import     │──┐ fetch (ckAPIToken + ckWebAuthToken)
│ options/    synced settings, device prefs, dev info     │  │
│                                                         │  ▼
│ background/service-worker.ts                            │  https://api.apple-cloudkit.com
│   • Apple sign-in (chrome.identity.launchWebAuthFlow)   │  /database/1/{container}/{env}/private/…
│   • context menu "Add selection as TODO"                │      records/query | lookup | modify
│   • toolbar behavior from device prefs                  │      users/caller
│                                                         │
│ lib/cloudkit/  REST client, auth, wire types            │
│ lib/todos.ts   Todo model ⇄ CloudKit record, repository │
│ lib/settings.ts synced (CloudKit) + device (storage)    │
└─────────────────────────────────────────────────────────┘
          │ chrome.storage.local: ck.webAuthToken, ck.user, prefs
```

## Sign-in sequence

1. A page sends `{type: 'auth/signIn'}` to the service worker. The worker handles it because the popup closes when focus moves to the sign-in window.
2. The worker calls `GET …/public/users/caller?ckAPIToken=…` without a user token. CloudKit replies `421 AUTHENTICATION_REQUIRED` with a `redirectURL`.
3. `chrome.identity.launchWebAuthFlow({url: redirectURL, interactive: true})` opens Apple's sign-in page.
4. Apple redirects to `https://<extension-id>.chromiumapp.org/?ckWebAuthToken=…`. The browser intercepts the redirect and hands the URL to the worker without loading it.
5. The worker stores the token in `chrome.storage.local` and fetches the user identity. Every open page sees the change through `chrome.storage.onChanged` and re-renders.
6. Later calls append `&ckWebAuthToken=…`. A `421` on any call clears the token, and the UI switches back to "Sign in".

## Data model

See [`cloudkit/README.md`](../cloudkit/README.md). All records live in the **private** database
in `_defaultZone` ([ADR-0005](adr/0005-private-database-default-zone.md)).

## Bulk edits

`TodoRepository.update/create/remove` take arrays and become one `records/modify` call per 200
operations, the CloudKit limit. The default zone ignores `atomic`, so each record succeeds or
fails on its own. The side panel reports partial failures, for example a `CONFLICT` when the
change tag is stale, and then reloads.

## Configuration flow

`.env.local` (or direnv / `mise.local.toml`) is read at **build time** by `vite.config.ts`.
Only `CLOUDKIT_CONTAINER_ID`, `CLOUDKIT_ENVIRONMENT` and `CLOUDKIT_API_TOKEN` are embedded
(the `EMBEDDED_KEYS` allowlist). `EXTENSION_PUBLIC_KEY` goes into `manifest.json` as `key`.
Nothing else in `.env.local` reaches `dist/`.
