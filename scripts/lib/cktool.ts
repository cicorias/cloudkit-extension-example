// CloudKit management API via Apple's CKTool JS (@apple/cktool.*), which runs anywhere Node
// does. It replaces `xcrun cktool`, so schema work no longer needs macOS or Xcode (ADR-0012).
//
// The management token is CLOUDKIT_MANAGEMENT_TOKEN, kept with the other local values: in
// .env.local (gitignored, mode 600; `mise run ck:token` writes it there), or exported by a
// gitignored .envrc (direnv) or mise.local.toml. Without it, ck:* prompts when in a terminal.
// It is never embedded in the extension (it isn't in EMBEDDED_KEYS).
import ckdb from '@apple/cktool.database';
import cktarget from '@apple/cktool.target.nodejs';
import { die } from './common.ts';
import { askSecret } from './prompt.ts';

export const { CKEnvironment } = ckdb;
export const { File } = cktarget;
export const TOKEN_VAR = 'CLOUDKIT_MANAGEMENT_TOKEN';

async function managementToken(): Promise<string> {
  const token = process.env[TOKEN_VAR];
  if (token) return token;
  if (process.stdin.isTTY) return askSecret('CloudKit management token: ');
  die(`${TOKEN_VAR} is not set. Run 'mise run ck:token' to save it in .env.local, or export it via .envrc.`);
}

export async function managementApi() {
  return new ckdb.PromisesApi({
    configuration: cktarget.createConfiguration(),
    security: { ManagementTokenAuth: await managementToken() },
  });
}

/** Turns a CKTool JS rejection into one readable line. */
export function describeError(e: unknown): string {
  const err = e as { statusCode?: number; message?: string; result?: { message?: string; reason?: string } };
  if (typeof err?.statusCode === 'number') {
    const { message = '', reason } = err.result ?? {};
    const hint = err.statusCode === 401 ? ` Check ${TOKEN_VAR} (mise run ck:token) and APPLE_TEAM_ID.` : '';
    return `CloudKit ${err.statusCode}: ${message}${reason ? ` (${reason})` : ''}.${hint}`;
  }
  return err?.message ?? String(e);
}
