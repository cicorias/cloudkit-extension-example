// Production build into dist/. Config comes from .env.local / the environment.
import { info, run, warn } from './lib/common.ts';

if (!process.env.CLOUDKIT_API_TOKEN) warn('CLOUDKIT_API_TOKEN unset; the build will run but cannot reach CloudKit.');
if (!process.env.EXTENSION_PUBLIC_KEY) warn('EXTENSION_PUBLIC_KEY unset; the extension ID will not be stable (mise run ext:key).');
run('pnpm', ['exec', 'tsc', '--noEmit']);
run('pnpm', ['exec', 'vite', 'build', '--mode', 'production']);
info('Built dist/. Load it unpacked at chrome://extensions or edge://extensions.');
