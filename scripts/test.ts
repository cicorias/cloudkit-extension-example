import { run } from './lib/common.ts';

run('pnpm', ['exec', 'vitest', 'run', ...process.argv.slice(2)]);
