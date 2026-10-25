# CloudKit TODO: a Chrome/Edge extension example

[![CI](https://github.com/cicorias/cloudkit-extension-example/actions/workflows/ci.yml/badge.svg)](https://github.com/cicorias/cloudkit-extension-example/actions/workflows/ci.yml)

A small, readable **Manifest V3 browser extension** for Chrome and Edge. It keeps a TODO list in
the signed-in user's **iCloud private database** through **CloudKit Web Services**, with
**Apple ID sign-in**. There's no backend server, and no Apple JavaScript is shipped.

It's meant as a starting point you can copy. It shows how to:

- sign in with an Apple ID from an extension (`chrome.identity.launchWebAuthFlow` plus a pinned extension ID)
- call CloudKit Web Services directly from MV3 (no remote code)
- read and write records in the **private** database, including **bulk** edits in a side panel
- keep **synced settings** in CloudKit and **per-browser settings** in `chrome.storage`
- manage the CloudKit **schema as code** with `cktool`
- keep a public repo free of secrets (env files, a pre-commit hook, gitleaks in CI)

## Features

| Surface | What it does |
|---|---|
| **Popup** | Quick add (`Buy milk #errands !high due:2026-11-01`), check off, delete |
| **Side panel** | Filter, select all, bulk mark done or open, set priority or due date, add or remove tags, delete, bulk add from text, JSON import/export, inline rename |
| **Options** | Account; *synced* settings (default priority, sort, show completed); *device* settings (theme, toolbar opens side panel, confirm deletes); developer info including the exact redirect URL |
| **Context menu** | Select text on a page, right-click, and choose "Add as TODO" |

## Quick start

Prerequisites: a paid Apple Developer account, macOS with Xcode (for `cktool`), and
[mise](https://mise.jdx.dev). [direnv](https://direnv.net) is optional.

```sh
git clone https://github.com/cicorias/cloudkit-extension-example.git
cd cloudkit-extension-example
mise install          # node, pnpm, gitleaks
mise run setup        # deps, .env.local + .envrc from templates, git hooks
mise run ext:key      # pins the extension ID; prints the CloudKit callback URL
```

Then follow **[docs/apple-developer-setup.md](docs/apple-developer-setup.md)** to create the
iCloud container and tokens, and fill in `.env.local`. After that:

```sh
mise run ck:token     # store a CloudKit management token in the keychain (once)
mise run ck:import    # create the schema in the development environment
mise run doctor       # confirm everything is configured
mise run build        # or: mise run dev  (watch mode)
```

Load `dist/` unpacked in Chrome (`chrome://extensions`) or Edge (`edge://extensions`) with
Developer mode on, then click **Sign in with Apple** in the popup.

## Configuration

All local values live in **`.env.local`**, which is gitignored. [`.env.example`](.env.example)
documents each key. They're loaded by:

- **direnv:** `.envrc` (copied from `.envrc.example`, **not committed**) runs `dotenv_if_exists .env.local`
- **mise:** you can instead put the keys under `[env]` in a gitignored `mise.local.toml`
- **every script in `scripts/`**, which loads `.env.local` itself, so direnv is optional

| Key | Embedded in build? | Notes |
|---|---|---|
| `CLOUDKIT_CONTAINER_ID` | yes | `iCloud.…` |
| `CLOUDKIT_ENVIRONMENT` | yes | `development` / `production` |
| `CLOUDKIT_API_TOKEN` | yes | A client token, so it's visible in the built extension; the private DB still needs the user's sign-in |
| `EXTENSION_PUBLIC_KEY` | as manifest `key` | Public. The private key stays in `.keys/` |
| `APPLE_TEAM_ID` | no | Used by cktool only |
| management token | no | Kept in the macOS keychain by `cktool save-token` |

## Tasks

`mise tasks` lists them all. Each one runs a script in [`scripts/`](scripts).

| Task | Purpose |
|---|---|
| `setup` / `doctor` | First-time setup / config check (never prints secrets) |
| `dev` / `build` / `package` | Watch build / production build / zip for the stores |
| `test` / `check` | Unit tests / typecheck, tests, build and secret scan (what CI runs) |
| `ext:key` / `ext:info` | Generate the signing key / show the extension ID and callback URL |
| `ck:token` / `ck:teams` | Save the cktool management token / list teams |
| `ck:validate` / `ck:import` / `ck:export` / `ck:reset` | Schema as code against development |
| `secrets:scan` / `icons` | gitleaks scan / regenerate icons |

## Project docs

- [Architecture](docs/architecture.md): components, sign-in sequence, bulk edit semantics
- [Apple Developer setup](docs/apple-developer-setup.md): portal, CloudKit Console, tokens, troubleshooting
- [Schema](cloudkit/README.md): record types and fields
- [ADRs](docs/adr/README.md): why things are the way they are
- [Backlog](docs/backlog.md): what's next
- [CLAUDE.md](CLAUDE.md): instructions for AI coding agents (and a handy summary for humans)

## Security notes

- The repository contains **no secrets**. `.env.local`, `.envrc`, `mise.local.toml`, `.keys/`
  and `*.pem` are gitignored. A pre-commit hook blocks them and runs gitleaks, and CI runs
  gitleaks over the full history.
- The CloudKit **API token** is compiled into the extension, as with any client-side CloudKit
  app. It identifies the app, not a user, and grants no access to anyone's private data on its
  own. Rotate it in CloudKit Console if needed.
- The user's `ckWebAuthToken` is stored in `chrome.storage.local` and cleared on sign-out or on
  any `421` response.
- Permissions: `identity`, `storage`, `sidePanel`, `contextMenus`, and host access to
  `https://api.apple-cloudkit.com/*` only.

## License

[MIT](LICENSE)
