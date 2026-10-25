/**
 * Source of truth for manifest.json. vite.config.ts serializes this at build time.
 * Keep permissions minimal: every one shows up on the install prompt.
 */
export interface ManifestOptions {
  version: string;
  /** Base64 DER public key. Pins the extension ID (see ADR-0004). */
  publicKey?: string;
}

export function buildManifest({ version, publicKey }: ManifestOptions): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: 'CloudKit TODO Example',
    short_name: 'CK TODO',
    description: 'A TODO list stored in your iCloud private database via CloudKit.',
    version,
    ...(publicKey ? { key: publicKey } : {}),
    minimum_chrome_version: '116',
    icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
    action: {
      default_title: 'CloudKit TODO',
      default_popup: 'popup/index.html',
      default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' },
    },
    side_panel: { default_path: 'sidepanel/index.html' },
    options_page: 'options/index.html',
    background: { service_worker: 'background.js', type: 'module' },
    // identity: launchWebAuthFlow for Apple sign-in. storage: tokens + prefs.
    // sidePanel: bulk editor. contextMenus: "Add selection as TODO".
    permissions: ['identity', 'storage', 'sidePanel', 'contextMenus'],
    host_permissions: ['https://api.apple-cloudkit.com/*'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://api.apple-cloudkit.com",
    },
  };
}
