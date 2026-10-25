/**
 * Apple sign-in for CloudKit inside an extension (ADR-0004).
 *
 * Flow: CloudKit returns a sign-in URL -> chrome.identity.launchWebAuthFlow opens
 * it -> Apple redirects to https://<extension-id>.chromiumapp.org/?ckWebAuthToken=…
 * -> the browser hands that URL back to us without loading it.
 */
import type { TokenStore } from './client';

const TOKEN_KEY = 'ck.webAuthToken';

/**
 * Pulls the web auth token out of the callback URL. Parses the raw query by hand
 * because URLSearchParams turns '+' into a space, which corrupts the token.
 */
export function extractWebAuthToken(callbackUrl: string): string | undefined {
  const start = callbackUrl.search(/[?#]/);
  if (start < 0) return undefined;
  const params = callbackUrl.slice(start + 1).split(/[&#?]/);
  for (const name of ['ckWebAuthToken', 'ckSession']) {
    const hit = params.find((p) => p.startsWith(`${name}=`));
    if (hit) {
      const value = decodeURIComponent(hit.slice(name.length + 1));
      if (value) return value;
    }
  }
  return undefined;
}

/** Persists the token in chrome.storage.local so sign-in survives browser restarts. */
export const chromeTokenStore: TokenStore = {
  async get() {
    const v = await chrome.storage.local.get(TOKEN_KEY);
    return typeof v[TOKEN_KEY] === 'string' ? (v[TOKEN_KEY] as string) : undefined;
  },
  async set(token) {
    if (token) await chrome.storage.local.set({ [TOKEN_KEY]: token });
    else await chrome.storage.local.remove(TOKEN_KEY);
  },
};

export const AUTH_STORAGE_KEYS = { token: TOKEN_KEY, user: 'ck.user' } as const;

/** Runs the interactive Apple sign-in and returns the web auth token. */
export async function runWebAuthFlow(signInUrl: string): Promise<string> {
  const callback = await chrome.identity.launchWebAuthFlow({ url: signInUrl, interactive: true });
  if (!callback) throw new Error('Sign-in was cancelled');
  const token = extractWebAuthToken(callback);
  if (!token) {
    throw new Error(
      `Sign-in finished but no ckWebAuthToken was returned. Check that the API token's Sign In Callback is ${chrome.identity.getRedirectURL()}`,
    );
  }
  return token;
}
