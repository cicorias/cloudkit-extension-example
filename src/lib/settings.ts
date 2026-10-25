/**
 * Two kinds of settings (ADR-0008):
 *  - SyncedSettings: stored in CloudKit, follow the user to every browser.
 *  - DevicePrefs:    stored in chrome.storage.local, specific to this browser.
 */
import type { CloudKitClient } from './cloudkit/client';
import { isRecordError, type CKRecord } from './cloudkit/types';
import type { Priority, SortBy } from './todos';

// ---------------------------------------------------------------------------
// Synced (CloudKit `Settings` record)
// ---------------------------------------------------------------------------

export const SETTINGS_RECORD_TYPE = 'Settings';
export const SETTINGS_RECORD_NAME = 'user-settings';

export interface SyncedSettings {
  defaultPriority: Priority;
  showCompleted: boolean;
  sortBy: SortBy;
}

export const DEFAULT_SYNCED_SETTINGS: SyncedSettings = { defaultPriority: 0, showCompleted: true, sortBy: 'created' };

const SORT_VALUES: SortBy[] = ['created', 'priority', 'dueDate', 'title'];

export function recordToSettings(r: CKRecord): SyncedSettings {
  const f = r.fields;
  const p = Number(f.defaultPriority?.value ?? 0);
  const s = String(f.sortBy?.value ?? 'created') as SortBy;
  return {
    defaultPriority: (p >= 0 && p <= 3 ? p : 0) as Priority,
    showCompleted: f.showCompleted === undefined ? true : f.showCompleted.value === 1,
    sortBy: SORT_VALUES.includes(s) ? s : 'created',
  };
}

export class SettingsRepository {
  constructor(private readonly client: CloudKitClient) {}

  async load(): Promise<SyncedSettings> {
    const [r] = await this.client.lookup([SETTINGS_RECORD_NAME]);
    if (!r || isRecordError(r)) return { ...DEFAULT_SYNCED_SETTINGS }; // NOT_FOUND on first run
    return recordToSettings(r);
  }

  /** Last write wins: settings are low-stakes, so skip change-tag conflicts. */
  async save(s: SyncedSettings): Promise<void> {
    const [existing] = await this.client.lookup([SETTINGS_RECORD_NAME]);
    const exists = existing !== undefined && !isRecordError(existing);
    const [result] = await this.client.modify([
      {
        operationType: exists ? 'forceUpdate' : 'create',
        record: {
          recordType: SETTINGS_RECORD_TYPE,
          recordName: SETTINGS_RECORD_NAME,
          fields: {
            defaultPriority: { type: 'INT64', value: s.defaultPriority },
            showCompleted: { type: 'INT64', value: s.showCompleted ? 1 : 0 },
            sortBy: { type: 'STRING', value: s.sortBy },
          },
        },
      },
    ]);
    if (result && isRecordError(result)) throw new Error(`${result.serverErrorCode}: ${result.reason ?? ''}`);
  }
}

// ---------------------------------------------------------------------------
// Device-local (chrome.storage.local)
// ---------------------------------------------------------------------------

export type Theme = 'system' | 'light' | 'dark';

export interface DevicePrefs {
  theme: Theme;
  /** Toolbar click opens the side panel instead of the popup. */
  actionOpensSidePanel: boolean;
  confirmBulkDelete: boolean;
}

export const DEFAULT_DEVICE_PREFS: DevicePrefs = { theme: 'system', actionOpensSidePanel: false, confirmBulkDelete: true };

const PREFS_KEY = 'prefs';

export async function loadDevicePrefs(): Promise<DevicePrefs> {
  const v = await chrome.storage.local.get(PREFS_KEY);
  return { ...DEFAULT_DEVICE_PREFS, ...(v[PREFS_KEY] as Partial<DevicePrefs> | undefined) };
}

export async function saveDevicePrefs(p: DevicePrefs): Promise<void> {
  await chrome.storage.local.set({ [PREFS_KEY]: p });
}

export function onDevicePrefsChanged(cb: (p: DevicePrefs) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[PREFS_KEY]) cb({ ...DEFAULT_DEVICE_PREFS, ...(changes[PREFS_KEY].newValue as Partial<DevicePrefs>) });
  });
}

export function applyTheme(theme: Theme): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}
