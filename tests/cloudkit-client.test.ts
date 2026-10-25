import { describe, expect, it, vi } from 'vitest';
import { extractWebAuthToken } from '../src/lib/cloudkit/auth';
import { AuthRequiredError, chunk, CloudKitClient, type TokenStore } from '../src/lib/cloudkit/client';
import type { CloudKitConfig } from '../src/lib/config';

const cfg: CloudKitConfig = { containerId: 'iCloud.com.example.todo', environment: 'development', apiToken: 'api-token-fake' };

function memoryStore(initial?: string): TokenStore & { value?: string } {
  const s = {
    value: initial,
    get: async () => s.value,
    set: async (t: string | undefined) => void (s.value = t),
  };
  return s;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('extractWebAuthToken', () => {
  it('keeps "+" and "/" intact and decodes %-escapes', () => {
    expect(extractWebAuthToken('https://abc.chromiumapp.org/?ckWebAuthToken=a+b/c%3D%3D')).toBe('a+b/c==');
  });
  it('reads the token from the fragment too', () => {
    expect(extractWebAuthToken('https://abc.chromiumapp.org/#ckWebAuthToken=xyz&other=1')).toBe('xyz');
  });
  it('falls back to ckSession', () => {
    expect(extractWebAuthToken('https://abc.chromiumapp.org/?foo=1&ckSession=sess')).toBe('sess');
  });
  it('returns undefined when absent', () => {
    expect(extractWebAuthToken('https://abc.chromiumapp.org/?error=denied')).toBeUndefined();
  });
});

describe('CloudKitClient', () => {
  it('builds URLs with encoded tokens', () => {
    const c = new CloudKitClient(cfg, memoryStore());
    expect(c.url('private', 'records/query', 'a+b/c')).toBe(
      'https://api.apple-cloudkit.com/database/1/iCloud.com.example.todo/development/private/records/query?ckAPIToken=api-token-fake&ckWebAuthToken=a%2Bb%2Fc',
    );
  });

  it('signInURL returns the redirectURL from a 421', async () => {
    const fetchMock = vi.fn(async (_url: string) => jsonResponse(421, { serverErrorCode: 'AUTHENTICATION_REQUIRED', redirectURL: 'https://idmsa.apple.com/x' }));
    const c = new CloudKitClient(cfg, memoryStore(), fetchMock as unknown as typeof fetch);
    await expect(c.signInURL()).resolves.toBe('https://idmsa.apple.com/x');
    expect(String(fetchMock.mock.calls[0]![0])).not.toContain('ckWebAuthToken');
  });

  it('clears the stored token on 421 and throws AuthRequiredError', async () => {
    const store = memoryStore('stale');
    const c = new CloudKitClient(cfg, store, (async () => jsonResponse(421, { serverErrorCode: 'AUTHENTICATION_REQUIRED', redirectURL: 'u' })) as typeof fetch);
    await expect(c.query({ recordType: 'Todo' })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(store.value).toBeUndefined();
  });

  it('query follows continuation markers', async () => {
    const pages = [
      { records: [{ recordName: 'a', recordType: 'Todo', fields: {} }], continuationMarker: 'm1' },
      { records: [{ recordName: 'b', recordType: 'Todo', fields: {} }] },
    ];
    const bodies: unknown[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return jsonResponse(200, pages.shift());
    });
    const c = new CloudKitClient(cfg, memoryStore('tok'), fetchMock as unknown as typeof fetch);
    const records = await c.query({ recordType: 'Todo' });
    expect(records.map((r) => r.recordName)).toEqual(['a', 'b']);
    expect(bodies[1]).toMatchObject({ continuationMarker: 'm1' });
  });

  it('modify splits into requests of at most 200 operations', async () => {
    const sizes: number[] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { operations: unknown[]; atomic: boolean };
      sizes.push(body.operations.length);
      expect(body.atomic).toBe(false);
      return jsonResponse(200, { records: body.operations.map((_, i) => ({ recordName: `r${i}`, recordType: 'Todo', fields: {} })) });
    });
    const c = new CloudKitClient(cfg, memoryStore('tok'), fetchMock as unknown as typeof fetch);
    const ops = Array.from({ length: 450 }, () => ({ operationType: 'forceDelete' as const, record: { recordName: 'x' } }));
    const results = await c.modify(ops);
    expect(sizes).toEqual([200, 200, 50]);
    expect(results).toHaveLength(450);
  });
});

describe('chunk', () => {
  it('splits evenly and keeps the remainder', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});
