import '../styles/common.css';
import './popup.css';
import { $, errorMessage, formatDate, h, status } from '../lib/dom';
import { send } from '../lib/messages';
import { parseQuickAdd } from '../lib/quickadd';
import { displayName, getAuthState, missingConfig, onAuthChanged, settings, todos, type AuthState } from '../lib/session';
import { applyTheme, DEFAULT_SYNCED_SETTINGS, loadDevicePrefs, type SyncedSettings } from '../lib/settings';
import { sortTodos, type Todo } from '../lib/todos';

const statusEl = $('#status');
let items: Todo[] = [];
let synced: SyncedSettings = { ...DEFAULT_SYNCED_SETTINGS };

function render(): void {
  const list = $('#list');
  const visible = sortTodos(items, synced.sortBy).filter((t) => synced.showCompleted || !t.done);
  list.replaceChildren(...visible.map(renderItem));
  $('#empty').hidden = visible.length > 0;
}

function renderItem(t: Todo): HTMLLIElement {
  return h(
    'li',
    { class: 'item' },
    h('input', {
      type: 'checkbox',
      checked: t.done,
      title: t.done ? 'Mark as not done' : 'Mark as done',
      onchange: () => void toggle(t),
    }),
    h('span', { class: 'prio', 'data-p': t.priority, title: `Priority ${t.priority}` }),
    h('span', { class: `grow title ${t.done ? 'done-text' : ''}`, title: t.notes || t.title }, t.title),
    t.dueDate !== undefined && h('span', { class: 'muted small' }, formatDate(t.dueDate)),
    ...t.tags.slice(0, 2).map((tag) => h('span', { class: 'tag' }, tag)),
    h('button', { class: 'link danger', type: 'button', title: 'Delete', onclick: () => void remove(t) }, '✕'),
  );
}

async function refresh(): Promise<void> {
  try {
    status(statusEl, 'Loading…');
    [items, synced] = await Promise.all([todos.list(), settings.load()]);
    render();
    status(statusEl, '');
  } catch (e) {
    status(statusEl, errorMessage(e), 'error');
  }
}

async function toggle(t: Todo): Promise<void> {
  const r = await todos.update([{ todo: t, changes: { done: !t.done } }]).catch((e: unknown) => {
    status(statusEl, errorMessage(e), 'error');
    return undefined;
  });
  if (r?.failed.length) status(statusEl, `Could not update: ${r.failed[0]!.code}. Reloading…`, 'error');
  await refresh();
}

async function remove(t: Todo): Promise<void> {
  items = items.filter((x) => x.id !== t.id);
  render();
  try {
    await todos.remove([t]);
  } catch (e) {
    status(statusEl, errorMessage(e), 'error');
    await refresh();
  }
}

$('#add-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const input = $<HTMLInputElement>('#add-input');
  const parsed = parseQuickAdd(input.value, synced.defaultPriority);
  if (!parsed) return;
  input.value = '';
  void todos
    .create([parsed])
    .then((r) => {
      if (r.failed.length) status(statusEl, `Could not add: ${r.failed[0]!.code}`, 'error');
      return refresh();
    })
    .catch((e: unknown) => status(statusEl, errorMessage(e), 'error'));
});

$('#sign-in').addEventListener('click', () => {
  status(statusEl, 'Opening Apple sign-in…');
  void send({ type: 'auth/signIn' }).then((r) => {
    if (!r.ok) status(statusEl, r.error, 'error');
  });
});

$('#open-panel').addEventListener('click', async () => {
  const win = await chrome.windows.getCurrent();
  // sidePanel.open() must run inside the user gesture, so call it here directly.
  if (chrome.sidePanel?.open && win.id !== undefined) await chrome.sidePanel.open({ windowId: win.id });
  else await send({ type: 'ui/openSidePanel' });
  window.close();
});

$('#open-options').addEventListener('click', () => void chrome.runtime.openOptionsPage());

async function showAuth(s: AuthState): Promise<void> {
  const missing = missingConfig();
  const notice = $('#config-missing');
  if (missing.length) {
    notice.hidden = false;
    notice.replaceChildren(
      'This build is not configured. Set ',
      ...missing.flatMap((m, i) => [i ? ', ' : '', h('code', {}, m)]),
      ' in .env.local and rebuild (see README).',
    );
    return;
  }
  $('#sign-in').hidden = s.signedIn;
  $('#main').hidden = !s.signedIn;
  $('#who').textContent = s.signedIn ? displayName(s.user) : '';
  if (s.signedIn) await refresh();
  else status(statusEl, '');
}

void loadDevicePrefs().then((p) => applyTheme(p.theme));
void getAuthState().then(showAuth);
onAuthChanged((s) => void showAuth(s));
