// First-time developer setup. Safe to re-run.
import { chmodSync, copyFileSync, existsSync } from 'node:fs';
import { capture, hasCmd, info, requireCmd, run, warn } from './lib/common.ts';

requireCmd('pnpm');

if (!existsSync('.env.local')) {
  info('Creating .env.local from .env.example (gitignored)');
  copyFileSync('.env.example', '.env.local');
  chmodSync('.env.local', 0o600);
} else {
  info('.env.local already exists, leaving it alone');
}

if (!existsSync('.envrc')) {
  info('Creating .envrc from .envrc.example (gitignored)');
  copyFileSync('.envrc.example', '.envrc');
  if (hasCmd('direnv')) warn("Run 'direnv allow' to activate it.");
}

info('Installing node dependencies');
run('pnpm', ['install']);

if (capture('git', ['rev-parse', '--git-dir']) !== undefined) {
  info('Installing git hooks (.githooks)');
  run('git', ['config', 'core.hooksPath', '.githooks']);
}

if (!process.env.EXTENSION_PUBLIC_KEY) warn('No extension key yet. Run: mise run ext:key');

info("Done. Next: follow docs/apple-developer-setup.md, then 'mise run doctor'.");
