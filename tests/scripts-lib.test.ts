import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parseEnvFile, setEnvLine } from '../scripts/lib/env-file.ts';
import { extensionIdFromPublicKey } from '../scripts/lib/extension-id.ts';
import { createZip } from '../scripts/lib/zip.ts';

describe('env file', () => {
  it('parses keys, skipping comments and stripping quotes', () => {
    const text = '# comment\n\nA=1\nexport B="two words"\nC=\'x\'\nD=\nnot a line\nE=a=b\n';
    expect(parseEnvFile(text)).toEqual({ A: '1', B: 'two words', C: 'x', D: '', E: 'a=b' });
  });

  it('replaces an existing key and keeps other lines', () => {
    expect(setEnvLine('# c\nA=1\nB=2\n', 'A', '3')).toBe('# c\nB=2\nA=3\n');
    expect(setEnvLine('', 'A', '1')).toBe('A=1\n');
    expect(setEnvLine('export A=1\nAA=2', 'A', '9')).toBe('AA=2\nA=9\n');
  });
});

describe('extension id', () => {
  it('matches the openssl/xxd derivation Chrome uses', () => {
    // printf 'not-a-real-key' | base64, hashed with: openssl dgst -sha256 | xxd -p | cut -c1-32 | tr 0-9a-f a-p
    expect(extensionIdFromPublicKey('bm90LWEtcmVhbC1rZXk=')).toBe('pkhhnhlnlckogeplnciknoepehfofmhh');
  });
});

/** Reads entries back through the central directory, as unzip would. */
function readZip(zip: Buffer): Record<string, string> {
  const end = zip.length - 22;
  expect(zip.readUInt32LE(end)).toBe(0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let p = zip.readUInt32LE(end + 16);
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(p)).toBe(0x02014b50);
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const start = local + 30 + zip.readUInt16LE(local + 26);
    const body = zip.subarray(start, start + size);
    out[name] = (method === 8 ? inflateRawSync(body) : body).toString('utf8');
    p += 46 + nameLen;
  }
  return out;
}

describe('zip', () => {
  it('round-trips deflated and stored entries', () => {
    const files = { 'manifest.json': '{"a":1}'.repeat(50), 'assets/é.js': 'x' };
    const zip = createZip(Object.entries(files).map(([name, s]) => ({ name, data: Buffer.from(s) })));
    expect(readZip(zip)).toEqual(files);
  });

  it('is deterministic', () => {
    const entries = [{ name: 'a.txt', data: Buffer.from('hello') }];
    expect(createZip(entries).equals(createZip(entries))).toBe(true);
  });
});
