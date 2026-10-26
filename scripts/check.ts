// Everything CI runs: typecheck (extension and scripts), tests, build, secret scan.
import { info, run, runScript } from './lib/common.ts';

info('Typecheck');           run('pnpm', ['exec', 'tsc', '--noEmit']);
info('Typecheck scripts/');  run('pnpm', ['exec', 'tsc', '-p', 'scripts']);
info('Unit tests');          run('pnpm', ['exec', 'vitest', 'run']);
info('Build');               run('pnpm', ['exec', 'vite', 'build', '--mode', 'production']);
info('Secret scan');         runScript('secrets-scan.ts');
info('All checks passed');
