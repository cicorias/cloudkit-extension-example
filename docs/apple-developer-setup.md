# Apple Developer setup

This guide takes you from nothing to a signed-in extension that reads and writes your iCloud
private database. Allow about 20 minutes.

> Apple's portal and CloudKit Console labels change from time to time. If a menu name below
> doesn't match what you see, look for the closest equivalent, and send a PR to fix the doc.

## What you'll create

| Thing | Where | Ends up in | Secret? |
|---|---|---|---|
| iCloud container `iCloud.<reverse-dns>` | Developer portal | `.env.local` → `CLOUDKIT_CONTAINER_ID` | No |
| Team ID | Developer portal | `.env.local` → `APPLE_TEAM_ID` | No (but keep it local) |
| Extension signing key | `mise run ext:key` | `.keys/extension-key.pem` (private) and `.env.local` → `EXTENSION_PUBLIC_KEY` | **Private key: yes** |
| CloudKit **API token** | CloudKit Console | `.env.local` → `CLOUDKIT_API_TOKEN` | Semi. It ships inside the extension, so don't commit it. |
| CloudKit **management token** | CloudKit Console | `.env.local` → `CLOUDKIT_MANAGEMENT_TOKEN` (via `mise run ck:token`) or your `.envrc` | **Yes** |

None of these values belong in git. `.env.local`, `.envrc`, `mise.local.toml` and `.keys/` are
all gitignored, and the pre-commit hook rejects them along with anything gitleaks flags.

---

## 0. Prerequisites

- A paid **Apple Developer Program** membership. CloudKit isn't available on a free account.
- Linux, macOS, Windows or WSL. Schema automation uses Apple's **CKTool JS** npm packages, which
  `mise run setup` installs, so you don't need Xcode.
- `mise`, plus optionally `direnv`. Run `mise install && mise run setup`.
- Chrome 116+ or Edge 116+.

## 1. Create the iCloud container

1. Go to <https://developer.apple.com/account>, then **Certificates, Identifiers & Profiles**, then **Identifiers**.
2. Click **+**, choose **iCloud Containers**, then **Continue**.
3. Enter a description (for example "CloudKit TODO Example") and an identifier such as
   `iCloud.com.yourname.cloudkit-todo`. The identifier must start with `iCloud.`.
4. Click **Register**.

> ⚠️ You can't delete or rename an iCloud container. Choose the identifier carefully.

You don't need an App ID, a Services ID or a provisioning profile. A web-services-only client
needs just the container and an API token.

Put the identifier in `.env.local`:

```sh
CLOUDKIT_CONTAINER_ID=iCloud.com.yourname.cloudkit-todo
CLOUDKIT_ENVIRONMENT=development
```

## 2. Find your Team ID

The **Membership details** page of your developer account shows your Team ID. You can also
look it up after step 4 with `mise run ck:teams`.

```sh
APPLE_TEAM_ID=ABCDE12345
```

## 3. Pin the extension ID

Apple redirects back to a fixed URL after sign-in. The browser builds that URL from the
extension ID, so the ID has to stay the same on every machine and in both browsers.

```sh
mise run ext:key
```

This creates `.keys/extension-key.pem` (private, gitignored), writes `EXTENSION_PUBLIC_KEY` to
`.env.local`, and prints:

```
Extension ID:            abcdefghijklmnopabcdefghijklmnop
Sign In Callback (URL):  https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/
```

Copy the **Sign In Callback** URL for step 5. You can print it again at any time with
`mise run ext:info`. Teammates who need the same ID should get the `.pem` through a password
manager, never through git.

## 4. Management token (schema automation)

1. Open CloudKit Console at <https://icloud.developer.apple.com/>.
2. From the account menu (top right), open **Settings**, then **Tokens**, then **Management Tokens**, and click **+**.
3. Name the token (for example "cktool – laptop") and copy its value.
4. Run the following and paste the value when prompted. The input is hidden. The token is written
   to `.env.local` as `CLOUDKIT_MANAGEMENT_TOKEN` (gitignored, mode 600):

   ```sh
   mise run ck:token
   mise run ck:teams      # sanity check: lists your team(s) and their IDs
   ```

   If you use direnv, you can `export CLOUDKIT_MANAGEMENT_TOKEN=…` in your gitignored `.envrc`
   instead. If the token isn't set anywhere, each `ck:*` task prompts for it.

## 5. API token (what the extension uses)

1. In CloudKit Console, open your container and select the **Development** environment.
2. Go to **Tokens & Keys** (sometimes listed under container **Settings**), then **API Tokens**, and click **+**.
3. Configure the token:
   - **Name:** `extension-dev`
   - **Sign In Callback:** **URL Redirect**, using the URL from step 3:
     `https://<EXTENSION_ID>.chromiumapp.org/`
   - **Allowed Origins:** *Any domain*. Requests from an extension come from a
     `chrome-extension://` origin, so a web-domain restriction doesn't apply.
4. Save, copy the token, and add it to `.env.local`:

   ```sh
   CLOUDKIT_API_TOKEN=…
   ```

> The API token identifies the app, not the user, and it's compiled into the extension. Anyone
> who unpacks the extension can read it. That's expected: the private database still needs each
> user's own Apple sign-in, so the token alone exposes no user data. It's kept out of git anyway
> so it can be rotated without a commit, and so forks use their own container.

## 6. Create the schema

```sh
mise run ck:validate   # dry run
mise run ck:import     # creates Todo + Settings record types and indexes in Development
```

To check, open CloudKit Console, go to **Schema**, then **Record Types**. You should see `Todo`
and `Settings`. See [`cloudkit/README.md`](../cloudkit/README.md) for the field list.

## 7. Build, load, sign in

```sh
mise run doctor        # every row should be ✔
mise run build         # or: mise run dev (watch mode)
```

- **Chrome:** open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `dist/`.
- **Edge:** open `edge://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose `dist/`.

Check that the ID shown on the extensions page matches `mise run ext:info`. Then open the popup,
click **Sign in with Apple**, and complete the Apple ID sign-in. The first time, Apple asks you
to allow the app to use iCloud.

To check, open CloudKit Console, go to **Records**, then **Private Database**, and use
**Act as iCloud account** to sign in as the same Apple ID. Query `Todo` records in
`_defaultZone`.

## 8. Going to production

1. In CloudKit Console, go to **Schema** and choose **Deploy Schema Changes…**. Production
   schema changes are additive only: you can't delete or rename a field after deploying it.
2. Switch to the **Production** environment and create a new API token with the same callback URL.
3. Set `CLOUDKIT_ENVIRONMENT=production` and the production `CLOUDKIT_API_TOKEN`, then
   `mise run package`.
4. Store builds: the Chrome Web Store and Edge Add-ons assign their own extension ID unless you
   upload with the same key. See backlog item B-030.

---

## "Apple login": which Apple sign-in is this?

There are two different Apple sign-in systems, and this project uses the first:

| | **CloudKit web auth** (used here) | **Sign in with Apple** (Services ID) |
|---|---|---|
| Gives you | `ckWebAuthToken` scoped to *your container* | An identity JWT (`id_token`) |
| Can read/write the user's **private database** | ✅ | ❌ |
| Portal setup | iCloud container + API token callback | Services ID, return URLs, private key |
| Needs a server | No | Yes, to validate tokens and exchange codes |

Sign in with Apple only proves who the user is. It doesn't grant CloudKit access, so this
project doesn't use it. See [ADR-0004](adr/0004-apple-sign-in-via-launchwebauthflow.md).

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Sign-in window says *Authorization page could not be loaded*, or never closes | The API token's Sign In Callback doesn't exactly match `chrome.identity.getRedirectURL()`. Compare it with the Options page → Developer info, including the trailing `/`. |
| Extension ID changes between machines or browsers | `EXTENSION_PUBLIC_KEY` was missing at build time. Run `mise run doctor`, then rebuild. |
| `BAD_REQUEST … not marked queryable` | The schema wasn't imported into this environment. Run `mise run ck:import`. |
| Sign-in loop / 421 on every call | The token was revoked or expired, or it came from the other environment (dev vs prod). Sign out, then sign in again. |
| `AUTHENTICATION_FAILED` | Wrong `CLOUDKIT_API_TOKEN` for this container or environment. |
| `CloudKit 401: invalid-or-expired-session` from a `ck:*` task | `CLOUDKIT_MANAGEMENT_TOKEN` is missing, revoked or expired, or belongs to another team than `APPLE_TEAM_ID`. Run `mise run ck:token`. |
| Popup closes during sign-in | Expected. Sign-in runs in the service worker, so reopen the popup afterwards. |
