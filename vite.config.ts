import { resolve } from 'node:path';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { buildManifest } from './src/manifest.ts';

const dirname = import.meta.dirname;
const root = resolve(dirname, 'src');

/** Only these keys reach the bundle. Everything else in .env.local stays local. */
const EMBEDDED_KEYS = ['CLOUDKIT_CONTAINER_ID', 'CLOUDKIT_ENVIRONMENT', 'CLOUDKIT_API_TOKEN'] as const;

/** Emits manifest.json from src/manifest.ts so the key and version come from config. */
function manifestPlugin(env: Record<string, string>, version: string): Plugin {
  return {
    name: 'emit-manifest',
    generateBundle() {
      const manifest = buildManifest({ version, publicKey: env.EXTENSION_PUBLIC_KEY || undefined });
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(manifest, null, 2) });
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' prefix = load all keys; process.env (direnv / mise) wins over the file.
  const env = { ...loadEnv(mode, dirname, ''), ...process.env } as Record<string, string>;
  const version = process.env.npm_package_version ?? '0.1.0';

  return {
    root,
    publicDir: resolve(dirname, 'public'),
    envDir: dirname,
    define: Object.fromEntries(
      EMBEDDED_KEYS.map((k) => [`__${k}__`, JSON.stringify(env[k] ?? '')]),
    ),
    build: {
      outDir: resolve(dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: mode === 'development',
      minify: mode !== 'development',
      target: 'chrome120',
      modulePreload: false,
      rollupOptions: {
        input: {
          popup: resolve(root, 'popup/index.html'),
          sidepanel: resolve(root, 'sidepanel/index.html'),
          options: resolve(root, 'options/index.html'),
          background: resolve(root, 'background/service-worker.ts'),
        },
        output: {
          entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    plugins: [manifestPlugin(env, version)],
    test: {
      root: dirname,
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
