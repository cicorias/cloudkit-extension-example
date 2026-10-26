import { createHash } from 'node:crypto';

/**
 * Derives the extension ID from EXTENSION_PUBLIC_KEY with the same algorithm Chrome uses:
 * the first 32 hex chars of SHA-256(DER public key), mapped 0-f to a-p.
 */
export function extensionIdFromPublicKey(publicKeyBase64: string): string {
  const hex = createHash('sha256').update(Buffer.from(publicKeyBase64, 'base64')).digest('hex');
  return [...hex.slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
}

/** The text `mise run ext:info` prints. */
export function extInfoText(publicKeyBase64: string): string {
  const id = extensionIdFromPublicKey(publicKeyBase64);
  return `Extension ID:            ${id}
Sign In Callback (URL):  https://${id}.chromiumapp.org/

In CloudKit Console > your container > Tokens & Keys > API Token:
  Sign In Callback = "URL Redirect" -> https://${id}.chromiumapp.org/`;
}
