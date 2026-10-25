/**
 * Messages from extension pages to the service worker. Sign-in runs in the
 * worker because the popup closes as soon as the Apple sign-in window opens.
 */
export type Request = { type: 'auth/signIn' } | { type: 'auth/signOut' } | { type: 'ui/openSidePanel'; windowId?: number };

export type Response = { ok: true } | { ok: false; error: string };

export async function send(req: Request): Promise<Response> {
  return (await chrome.runtime.sendMessage(req)) as Response;
}
