/**
 * Minimal CloudKit Web Services client (ADR-0003).
 *
 * Every request carries `ckAPIToken` (identifies the app) and, once the user has
 * signed in, `ckWebAuthToken` (identifies the user; required for the private DB).
 * Endpoint shape: https://api.apple-cloudkit.com/database/1/{container}/{env}/{db}/{subpath}
 */
import type { CloudKitConfig } from '../config';
import type {
  AuthRequiredResponse,
  CKRecord,
  ModifyResponse,
  Query,
  QueryResponse,
  RecordOperation,
  RecordResult,
  UserIdentity,
  ZoneID,
} from './types';
import { isRecordError } from './types';

export const CLOUDKIT_HOST = 'https://api.apple-cloudkit.com';

/** CloudKit limits a records/modify request to 200 operations. */
export const MAX_OPERATIONS_PER_REQUEST = 200;

export const DEFAULT_ZONE: ZoneID = { zoneName: '_defaultZone' };

export type Database = 'public' | 'private';

/** Where the user's web auth token lives. Implemented with chrome.storage in the extension. */
export interface TokenStore {
  get(): Promise<string | undefined>;
  set(token: string | undefined): Promise<void>;
}

export class AuthRequiredError extends Error {
  constructor(readonly redirectURL: string | undefined) {
    super('Sign in to iCloud is required');
    this.name = 'AuthRequiredError';
  }
}

export class CloudKitError extends Error {
  constructor(
    readonly status: number,
    readonly serverErrorCode: string,
    reason?: string,
  ) {
    super(`CloudKit ${status} ${serverErrorCode}${reason ? `: ${reason}` : ''}`);
    this.name = 'CloudKitError';
  }
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export class CloudKitClient {
  constructor(
    private readonly config: CloudKitConfig,
    private readonly tokens: TokenStore,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  /** Builds a request URL. Tokens are encoded; ckWebAuthToken often contains '+' and '/'. */
  url(database: Database, subpath: string, webAuthToken?: string): string {
    const { containerId, environment, apiToken } = this.config;
    const base = `${CLOUDKIT_HOST}/database/1/${encodeURIComponent(containerId)}/${environment}/${database}/${subpath}`;
    let q = `ckAPIToken=${encodeURIComponent(apiToken)}`;
    if (webAuthToken) q += `&ckWebAuthToken=${encodeURIComponent(webAuthToken)}`;
    return `${base}?${q}`;
  }

  private async request<T>(
    database: Database,
    subpath: string,
    init: { method: 'GET' | 'POST'; body?: unknown; authenticated?: boolean },
  ): Promise<T> {
    const token = init.authenticated === false ? undefined : await this.tokens.get();
    const res = await this.fetchImpl(this.url(database, subpath, token), {
      method: init.method,
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};

    if (res.status === 421) {
      // Token missing, expired or revoked. Drop it so the UI shows "Sign in".
      if (token) await this.tokens.set(undefined);
      throw new AuthRequiredError((json as Partial<AuthRequiredResponse>).redirectURL);
    }
    if (!res.ok) {
      throw new CloudKitError(res.status, String(json.serverErrorCode ?? 'UNKNOWN'), json.reason as string | undefined);
    }
    return json as T;
  }

  /**
   * Asks CloudKit for the Apple sign-in URL. Calling users/caller without a
   * web auth token returns 421 with `redirectURL`; that page eventually redirects
   * to the API token's "Sign In Callback" URL with ?ckWebAuthToken=...
   */
  async signInURL(): Promise<string> {
    try {
      await this.request('public', 'users/caller', { method: 'GET', authenticated: false });
    } catch (e) {
      if (e instanceof AuthRequiredError && e.redirectURL) return e.redirectURL;
      throw e;
    }
    throw new CloudKitError(200, 'UNEXPECTED', 'users/caller succeeded without a web auth token');
  }

  currentUser(): Promise<UserIdentity> {
    return this.request<UserIdentity>('public', 'users/caller', { method: 'GET' });
  }

  /** Runs a query and follows continuation markers until all records are read. */
  async query(query: Query, zoneID: ZoneID = DEFAULT_ZONE, pageSize = 200): Promise<CKRecord[]> {
    const records: CKRecord[] = [];
    let continuationMarker: string | undefined;
    do {
      const page: QueryResponse = await this.request('private', 'records/query', {
        method: 'POST',
        body: { zoneID, query, resultsLimit: pageSize, ...(continuationMarker ? { continuationMarker } : {}) },
      });
      for (const r of page.records) {
        if (isRecordError(r)) throw new CloudKitError(200, r.serverErrorCode, r.reason);
        records.push(r);
      }
      continuationMarker = page.continuationMarker;
    } while (continuationMarker);
    return records;
  }

  async lookup(recordNames: string[], zoneID: ZoneID = DEFAULT_ZONE): Promise<RecordResult[]> {
    const res: ModifyResponse = await this.request('private', 'records/lookup', {
      method: 'POST',
      body: { zoneID, records: recordNames.map((recordName) => ({ recordName })) },
    });
    return res.records;
  }

  /**
   * Applies operations in chunks of 200. `atomic` is only honored in custom
   * zones, so with the default zone each record succeeds or fails on its own;
   * callers must inspect each result with isRecordError().
   */
  async modify(operations: RecordOperation[], zoneID: ZoneID = DEFAULT_ZONE): Promise<RecordResult[]> {
    const results: RecordResult[] = [];
    for (const batch of chunk(operations, MAX_OPERATIONS_PER_REQUEST)) {
      const res: ModifyResponse = await this.request('private', 'records/modify', {
        method: 'POST',
        body: { zoneID, operations: batch, atomic: false },
      });
      results.push(...res.records);
    }
    return results;
  }
}
