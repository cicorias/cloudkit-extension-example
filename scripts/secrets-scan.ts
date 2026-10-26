// Scan for leaked secrets. Default: full git history plus the working tree.
//   secrets-scan.ts            # history + working tree
//   secrets-scan.ts --staged   # only staged changes (used by the pre-commit hook)
import { capture, requireCmd, run } from './lib/common.ts';

requireCmd('gitleaks');
const opts = ['--redact', '--no-banner', '--config', '.gitleaks.toml'];

if (process.argv[2] === '--staged') {
  run('gitleaks', ['git', '--pre-commit', '--staged', ...opts]);
} else {
  if (capture('git', ['rev-parse', 'HEAD']) !== undefined) run('gitleaks', ['git', ...opts]);
  run('gitleaks', ['dir', ...opts, '.']);
}
