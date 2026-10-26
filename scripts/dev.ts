// Rebuild dist/ on every change. Load dist/ as an unpacked extension, then
// click "reload" on chrome://extensions (or edge://extensions) after rebuilds.
import { info, run } from './lib/common.ts';

info('Watching src/ and building to dist/ (Ctrl-C to stop)');
run('pnpm', ['exec', 'vite', 'build', '--mode', 'development', '--watch']);
