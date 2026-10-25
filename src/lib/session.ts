/** Shared wiring for every extension page and the service worker. */
import { AUTH_STORAGE_KEYS, chromeTokenStore } from './cloudkit/auth';
import { CloudKitClient } from './cloudkit/client';
import type { UserIdentity } from './cloudkit/types';
import { config, missingConfig } from './config';
import { SettingsRepository } from './settings';
import { TodoRepository } from './todos';

export const client = new CloudKitClient(config, chromeTokenStore);
export const todos = new TodoRepository(client);
export const settings = new SettingsRepository(client);
export { config, missingConfig };

export interface AuthState {
  signedIn: boolean;
  user?: UserIdentity;
}

export async function getAuthState(): Promise<AuthState> {
  const v = await chrome.storage.local.get([AUTH_STORAGE_KEYS.token, AUTH_STORAGE_KEYS.user]);
  return { signedIn: typeof v[AUTH_STORAGE_KEYS.token] === 'string', user: v[AUTH_STORAGE_KEYS.user] as UserIdentity | undefined };
}

/** Fires when the user signs in or out from any page (or the token is rejected). */
export function onAuthChanged(cb: (s: AuthState) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (AUTH_STORAGE_KEYS.token in changes || AUTH_STORAGE_KEYS.user in changes)) {
      void getAuthState().then(cb);
    }
  });
}

export function displayName(user?: UserIdentity): string {
  const n = user?.nameComponents;
  const full = [n?.givenName, n?.familyName].filter(Boolean).join(' ');
  return full || user?.lookupInfo?.emailAddress || 'iCloud user';
}
