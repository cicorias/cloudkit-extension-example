/** Tiny DOM helpers. Text is always set via textContent, never innerHTML. */
import { AuthRequiredError, CloudKitError } from './cloudkit/client';

type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

export function errorMessage(e: unknown): string {
  if (e instanceof AuthRequiredError) return 'Your iCloud session expired. Please sign in again.';
  if (e instanceof CloudKitError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

/** Shows a transient status line. kind: info | error | ok */
export function status(el: HTMLElement, text: string, kind: 'info' | 'error' | 'ok' = 'info'): void {
  el.textContent = text;
  el.dataset.kind = kind;
  el.hidden = !text;
}

export function formatDate(ms?: number): string {
  return ms === undefined ? '' : new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** yyyy-mm-dd for <input type=date>, in local time. */
export function toDateInput(ms?: number): string {
  if (ms === undefined) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromDateInput(v: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : undefined;
}
