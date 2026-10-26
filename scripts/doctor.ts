// Report toolchain and configuration status. Never prints secret values.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { capture, green, mask, red } from './lib/common.ts';
import { TOKEN_VAR } from './lib/cktool.ts';
import { extInfoText } from './lib/extension-id.ts';

let ok = true;
function check(name: string, pass: boolean, detail: string, required = true) {
  const mark = pass ? green('✔') : required ? red('✘') : '·';
  console.log(`  ${mark} ${name.padEnd(27)} ${detail}`);
  if (!pass && required) ok = false;
}

const require = createRequire(import.meta.url);
const ckjs = (() => {
  try {
    return (require('@apple/cktool.database/package.json') as { version: string }).version;
  } catch {
    return undefined;
  }
})();

const env = process.env;
const pnpm = capture('pnpm', ['-v']);
const gitleaks = capture('gitleaks', ['version']);

console.log('Toolchain');
check('node', true, process.version);
check('pnpm', !!pnpm, pnpm ?? 'missing (mise install)');
check('gitleaks', !!gitleaks, gitleaks ?? 'missing (mise install)');
check('cktool JS', !!ckjs, ckjs ? `@apple/cktool.database ${ckjs}` : 'missing (pnpm install)');

console.log('');
console.log('Configuration (.env.local)');
check('.env.local', existsSync('.env.local'), existsSync('.env.local') ? 'present' : 'missing: mise run setup');
check('CLOUDKIT_CONTAINER_ID', !!env.CLOUDKIT_CONTAINER_ID, env.CLOUDKIT_CONTAINER_ID || '(unset)');
check('CLOUDKIT_ENVIRONMENT', /^(development|production)$/.test(env.CLOUDKIT_ENVIRONMENT ?? ''), env.CLOUDKIT_ENVIRONMENT || '(unset)');
check('CLOUDKIT_API_TOKEN', !!env.CLOUDKIT_API_TOKEN, mask(env.CLOUDKIT_API_TOKEN));
check('EXTENSION_PUBLIC_KEY', !!env.EXTENSION_PUBLIC_KEY, env.EXTENSION_PUBLIC_KEY ? 'set' : 'unset: mise run ext:key');
check('APPLE_TEAM_ID', !!env.APPLE_TEAM_ID, env.APPLE_TEAM_ID || '(unset; needed for ck:* tasks)');
check(TOKEN_VAR, !!env[TOKEN_VAR], env[TOKEN_VAR] ? mask(env[TOKEN_VAR]) : '(unset; ck:* will prompt, or: mise run ck:token)', false);

if (env.EXTENSION_PUBLIC_KEY) {
  console.log('');
  console.log(extInfoText(env.EXTENSION_PUBLIC_KEY));
}

process.exit(ok ? 0 : 1);
