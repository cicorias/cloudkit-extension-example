import '../styles/common.css';
import './options.css';
import { $, errorMessage, h, status } from '../lib/dom';
import { send } from '../lib/messages';
import { config, displayName, getAuthState, missingConfig, onAuthChanged, settings, type AuthState } from '../lib/session';
import { applyTheme, loadDevicePrefs, saveDevicePrefs, type DevicePrefs, type SyncedSettings, type Theme } from '../lib/settings';
import type { Priority, SortBy } from '../lib/todos';

const statusEl = $('#status');
const syncedForm = $<HTMLFormElement>('#synced-form');
const deviceForm = $<HTMLFormElement>('#device-form');

function field<T extends HTMLInputElement | HTMLSelectElement>(form: HTMLFormElement, name: string): T {
  return form.elements.namedItem(name) as T;
}

// --- Account --------------------------------------------------------------

async function showAuth(s: AuthState): Promise<void> {
  const missing = missingConfig();
  $('#account').textContent = missing.length
    ? `Not configured: ${missing.join(', ')}`
    : s.signedIn
      ? `Signed in as ${displayName(s.user)}`
      : 'Not signed in.';
  $('#sign-in').hidden = s.signedIn || missing.length > 0;
  $('#sign-out').hidden = !s.signedIn;
  syncedForm.querySelectorAll('select, input, button').forEach((el) => ((el as HTMLInputElement).disabled = !s.signedIn));
  if (s.signedIn) await loadSynced();
}

$('#sign-in').addEventListener('click', () => {
  void send({ type: 'auth/signIn' }).then((r) => !r.ok && status(statusEl, r.error, 'error'));
});
$('#sign-out').addEventListener('click', () => void send({ type: 'auth/signOut' }));

// --- Synced settings (CloudKit) ------------------------------------------

async function loadSynced(): Promise<void> {
  try {
    const s = await settings.load();
    field<HTMLSelectElement>(syncedForm, 'defaultPriority').value = String(s.defaultPriority);
    field<HTMLSelectElement>(syncedForm, 'sortBy').value = s.sortBy;
    field<HTMLInputElement>(syncedForm, 'showCompleted').checked = s.showCompleted;
  } catch (e) {
    status(statusEl, errorMessage(e), 'error');
  }
}

syncedForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const s: SyncedSettings = {
    defaultPriority: Number(field<HTMLSelectElement>(syncedForm, 'defaultPriority').value) as Priority,
    sortBy: field<HTMLSelectElement>(syncedForm, 'sortBy').value as SortBy,
    showCompleted: field<HTMLInputElement>(syncedForm, 'showCompleted').checked,
  };
  status(statusEl, 'Saving to iCloud…');
  settings.save(s).then(
    () => status(statusEl, 'Saved to iCloud.', 'ok'),
    (e: unknown) => status(statusEl, errorMessage(e), 'error'),
  );
});

// --- Device prefs (chrome.storage) ----------------------------------------

async function loadDevice(): Promise<void> {
  const p = await loadDevicePrefs();
  applyTheme(p.theme);
  field<HTMLSelectElement>(deviceForm, 'theme').value = p.theme;
  field<HTMLInputElement>(deviceForm, 'actionOpensSidePanel').checked = p.actionOpensSidePanel;
  field<HTMLInputElement>(deviceForm, 'confirmBulkDelete').checked = p.confirmBulkDelete;
}

// Device prefs save immediately; there is no network round trip.
deviceForm.addEventListener('change', () => {
  const p: DevicePrefs = {
    theme: field<HTMLSelectElement>(deviceForm, 'theme').value as Theme,
    actionOpensSidePanel: field<HTMLInputElement>(deviceForm, 'actionOpensSidePanel').checked,
    confirmBulkDelete: field<HTMLInputElement>(deviceForm, 'confirmBulkDelete').checked,
  };
  applyTheme(p.theme);
  void saveDevicePrefs(p).then(() => {
    const saved = $('#device-saved');
    saved.hidden = false;
    setTimeout(() => (saved.hidden = true), 1500);
  });
});

// --- Developer info ---------------------------------------------------------

function showDevInfo(): void {
  const rows: [string, string][] = [
    ['Container', config.containerId || '(unset)'],
    ['Environment', config.environment],
    ['API token', config.apiToken ? `configured (${config.apiToken.length} chars)` : '(unset)'],
    ['Extension ID', chrome.runtime.id],
    ['Redirect URL', chrome.identity.getRedirectURL()],
    ['Version', chrome.runtime.getManifest().version],
  ];
  $('#dev-info').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
}

showDevInfo();
void loadDevice();
void getAuthState().then(showAuth);
onAuthChanged((s) => void showAuth(s));
