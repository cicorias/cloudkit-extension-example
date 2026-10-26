// Build and zip dist/ for upload to the Chrome Web Store / Edge Add-ons.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { info, REPO_ROOT, runScript, warn } from './lib/common.ts';
import { createZip } from './lib/zip.ts';

runScript('build.ts');

const dist = join(REPO_ROOT, 'dist');
const files = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => join(d.parentPath, d.name))
  .sort();
const entries = files.map((f) => ({ name: f.slice(dist.length + 1).replaceAll('\\', '/'), data: readFileSync(f) }));

const { version } = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as { version: string };
mkdirSync(join(REPO_ROOT, 'artifacts'), { recursive: true });
const out = `artifacts/cloudkit-todo-${version}-${process.env.CLOUDKIT_ENVIRONMENT || 'development'}.zip`;
writeFileSync(join(REPO_ROOT, out), createZip(entries));
info(`Wrote ${out} (${entries.length} files)`);
warn('The zip contains CLOUDKIT_API_TOKEN (a client-side token). Use a production token for store builds.');
