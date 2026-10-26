// Generate an RSA key whose public half goes into manifest.json "key".
// That pins the extension ID, so the CloudKit Sign In Callback
// (https://<id>.chromiumapp.org/) works the same in Chrome and Edge and on
// every developer machine that shares the key.
//
// The private key (.keys/extension-key.pem) is gitignored. Share it out of
// band (e.g. a password manager) if teammates need the same extension ID.
import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { info, REPO_ROOT, setEnvVar } from './lib/common.ts';
import { extInfoText } from './lib/extension-id.ts';

const KEY_DIR = join(REPO_ROOT, '.keys');
const KEY_FILE = join(KEY_DIR, 'extension-key.pem');

if (existsSync(KEY_FILE)) {
  info(`Reusing existing ${KEY_FILE}`);
} else {
  info(`Generating ${KEY_FILE}`);
  mkdirSync(KEY_DIR, { recursive: true, mode: 0o700 });
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
}

// Accepts PKCS#1 or PKCS#8 PEM, so keys made by the old openssl-based script still work.
const pub = createPublicKey(createPrivateKey(readFileSync(KEY_FILE)))
  .export({ type: 'spki', format: 'der' })
  .toString('base64');
setEnvVar('EXTENSION_PUBLIC_KEY', pub);
info('Recorded EXTENSION_PUBLIC_KEY in .env.local');
console.log(extInfoText(pub));
