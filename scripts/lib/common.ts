// Shared helpers for scripts/*. Importing this module loads .env.local and cd's to the repo
// root, the same way every script expects:
//   import { info, run } from './lib/common.ts';
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { parseEnvFile, setEnvLine } from './env-file.ts';

export const REPO_ROOT = resolve(import.meta.dirname, '../..');
export const ENV_FILE = join(REPO_ROOT, '.env.local');
const isWindows = process.platform === 'win32';

const paint = (code: number, s: string) => (process.stderr.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
export const green = (s: string) => paint(32, s);
export const red = (s: string) => paint(31, s);

export const info = (msg: string) => console.log(`${paint(34, '==>')} ${msg}`);
export const warn = (msg: string) => console.error(`${paint(33, 'warn:')} ${msg}`);
export function die(msg: string): never {
  console.error(`${paint(31, 'error:')} ${msg}`);
  process.exit(1);
}

/** Reads .env.local (or an empty object if it doesn't exist). */
const readEnvFile = (): Record<string, string> =>
  existsSync(ENV_FILE) ? parseEnvFile(readFileSync(ENV_FILE, 'utf8')) : {};

/**
 * Loads .env.local into process.env without clobbering values that are already set
 * (direnv or mise.local.toml may have set them).
 */
export function loadEnv(): void {
  for (const [key, val] of Object.entries(readEnvFile())) {
    if (!process.env[key]) process.env[key] = val;
  }
}

/** Sets KEY=VALUE in .env.local (mode 600), replacing an existing line or appending. */
export function setEnvVar(key: string, value: string): void {
  const text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
  writeFileSync(ENV_FILE, setEnvLine(text, key, value), { mode: 0o600 });
  chmodSync(ENV_FILE, 0o600);
  process.env[key] = value;
}

export function requireVar(key: string, hint?: string): string {
  return process.env[key] || die(`${key} is not set. Add it to .env.local${hint ? ` (${hint})` : ''}.`);
}

/** True if `cmd` is an executable on PATH (honours PATHEXT on Windows). */
export function hasCmd(cmd: string): boolean {
  const exts = isWindows ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  return (process.env.PATH ?? '').split(delimiter).some((dir) => dir && exts.some((ext) => existsSync(join(dir, cmd + ext))));
}

export function requireCmd(cmd: string, hint = 'Run: mise install'): void {
  if (!hasCmd(cmd)) die(`'${cmd}' not found. ${hint}`);
}

// pnpm and friends are .cmd shims on Windows, which Node only spawns through a shell.
const spawnOpts = (opts: SpawnSyncOptions): SpawnSyncOptions => ({ cwd: REPO_ROOT, shell: isWindows, ...opts });

/** Runs a command with inherited stdio. Exits with its status if it fails. */
export function run(cmd: string, args: string[] = [], opts: SpawnSyncOptions = {}): void {
  const r = spawnSync(cmd, args, spawnOpts({ stdio: 'inherit', ...opts }));
  if (r.error) die(`${cmd}: ${r.error.message}`);
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Runs a Node script in scripts/ (e.g. 'build.ts') with the same Node binary. */
export const runScript = (name: string, args: string[] = []) =>
  run(process.execPath, [join(REPO_ROOT, 'scripts', name), ...args], { shell: false });

/** Runs a command quietly and returns trimmed stdout, or undefined if it fails. */
export function capture(cmd: string, args: string[] = [], opts: SpawnSyncOptions = {}): string | undefined {
  const r = spawnSync(cmd, args, spawnOpts({ encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts }));
  return r.status === 0 ? String(r.stdout).trim() : undefined;
}

/** Shows that a secret is set without revealing it. */
export const mask = (v: string | undefined) => (v ? `set (${v.length} chars)` : '(unset)');

loadEnv();
process.chdir(REPO_ROOT);
