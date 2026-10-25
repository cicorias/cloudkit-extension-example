/**
 * Service worker: owns Apple sign-in (survives the popup closing), the context
 * menu, and toolbar-button behavior driven by device prefs.
 */
import { AUTH_STORAGE_KEYS, chromeTokenStore, runWebAuthFlow } from '../lib/cloudkit/auth';
import type { Request, Response } from '../lib/messages';
import { client, missingConfig, todos } from '../lib/session';
import { loadDevicePrefs, onDevicePrefsChanged, type DevicePrefs } from '../lib/settings';

const MENU_ADD_SELECTION = 'add-selection-as-todo';

async function signIn(): Promise<void> {
  const missing = missingConfig();
  if (missing.length) throw new Error(`Extension is not configured: ${missing.join(', ')} (see README)`);
  const url = await client.signInURL();
  const token = await runWebAuthFlow(url);
  await chromeTokenStore.set(token);
  const user = await client.currentUser();
  await chrome.storage.local.set({ [AUTH_STORAGE_KEYS.user]: user });
}

async function signOut(): Promise<void> {
  await chrome.storage.local.remove([AUTH_STORAGE_KEYS.token, AUTH_STORAGE_KEYS.user]);
}

/** Side panel API is Chrome 114+ / Edge 114+. Fall back to a tab elsewhere. */
async function openSidePanel(windowId?: number): Promise<void> {
  if (chrome.sidePanel?.open && windowId !== undefined) {
    await chrome.sidePanel.open({ windowId });
  } else {
    await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/index.html') });
  }
}

async function applyActionBehavior(prefs: DevicePrefs): Promise<void> {
  // With a popup set, the toolbar click always opens the popup, so clear it to
  // let the side panel take over.
  await chrome.action.setPopup({ popup: prefs.actionOpensSidePanel ? '' : 'popup/index.html' });
  await chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: prefs.actionOpensSidePanel });
}

chrome.runtime.onMessage.addListener((req: Request, _sender, sendResponse: (r: Response) => void) => {
  const run = async () => {
    switch (req.type) {
      case 'auth/signIn':
        return signIn();
      case 'auth/signOut':
        return signOut();
      case 'ui/openSidePanel':
        return openSidePanel(req.windowId);
    }
  };
  run().then(
    () => sendResponse({ ok: true }),
    (e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
  );
  return true; // keep the channel open for the async response
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ADD_SELECTION, title: 'Add “%s” as TODO', contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ADD_SELECTION || !info.selectionText) return;
  const title = info.selectionText.trim().slice(0, 500);
  void todos.create([{ title }]).then(
    (r) => flashBadge(r.failed.length ? '!' : '+1', r.failed.length ? '#c62828' : '#2e7d32'),
    () => flashBadge('!', '#c62828'), // most likely not signed in
  );
});

function flashBadge(text: string, color: string): void {
  void chrome.action.setBadgeBackgroundColor({ color });
  void chrome.action.setBadgeText({ text });
  setTimeout(() => void chrome.action.setBadgeText({ text: '' }), 2500);
}

void loadDevicePrefs().then(applyActionBehavior);
onDevicePrefsChanged((p) => void applyActionBehavior(p));
