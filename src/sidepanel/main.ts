/**
 * Side panel bulk editor: filter, multi-select, apply one change to many
 * records in a single records/modify call (chunked at 200), plus bulk add and
 * JSON import/export.
 */
import '../styles/common.css';
import './sidepanel.css';
import { $, errorMessage, formatDate, fromDateInput, h, status } from '../lib/dom';
import { send } from '../lib/messages';
import { parseBulkAdd } from '../lib/quickadd';
import { displayName, getAuthState, missingConfig, onAuthChanged, settings, todos, type AuthState } from '../lib/session';
import { applyTheme, DEFAULT_SYNCED_SETTINGS, loadDevicePrefs, onDevicePrefsChanged, type DevicePrefs, type SyncedSettings } from '../lib/settings';
import { normalizeTags, PRIORITY_LABELS, sortTodos, type BulkResult, type Priority, type Todo, type TodoChanges, type TodoInput } from '../lib/todos';

const statusEl = $('#status');
let items: Todo[] = [];
let synced: SyncedSettings = { ...DEFAULT_SYNCED_SETTINGS };
let prefs: DevicePrefs | undefined;
const selected = new Set<string>();

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function filtered(): Todo[] {
  const q = $<HTMLInputElement>('#search').value.trim().toLowerCase();
  const s = $<HTMLSelectElement>('#status-filter').value;
  return sortTodos(items, synced.sortBy).filter((t) => {
    if (s === 'open' && t.done) return false;
    if (s === 'done' && !t.done) return false;
    if (!q) return true;
    if (q.startsWith('#')) return t.tags.includes(q.slice(1));
    return t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.tags.some((g) => g.includes(q));
  });
}

function render(): void {
  const visible = filtered();
  const visibleIds = new Set(visible.map((t) => t.id));
  for (const id of selected) if (!visibleIds.has(id)) selected.delete(id); // never act on hidden rows

  $('#list').replaceChildren(...visible.map(renderRow));
  $('#empty').hidden = visible.length > 0;

  const all = $<HTMLInputElement>('#select-all');
  all.checked = visible.length > 0 && selected.size === visible.length;
  all.indeterminate = selected.size > 0 && selected.size < visible.length;
  $('#sel-count').textContent = `${selected.size} selected`;
  document.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('.bulk-bar [data-action], #bulk-priority, #bulk-due')
    .forEach((el) => (el.disabled = selected.size === 0));
}

function renderRow(t: Todo): HTMLLIElement {
  const titleInput = h('input', { class: 'title', type: 'text', value: t.title, maxlength: 500, title: 'Edit and press Enter' });
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') titleInput.blur();
    if (e.key === 'Escape') { titleInput.value = t.title; titleInput.blur(); }
  });
  titleInput.addEventListener('change', () => {
    const title = titleInput.value.trim();
    if (title && title !== t.title) void apply([t], { title }, 'Renamed');
  });

  return h(
    'li',
    { class: selected.has(t.id) ? 'selected' : '' },
    h('input', {
      type: 'checkbox',
      checked: selected.has(t.id),
      title: 'Select',
      onchange: (e: Event) => {
        if ((e.target as HTMLInputElement).checked) selected.add(t.id);
        else selected.delete(t.id);
        render();
      },
    }),
    h('span', { class: 'prio', 'data-p': t.priority, title: PRIORITY_LABELS[t.priority] }),
    titleInput,
    h('span', { class: t.done ? 'small ok' : 'small muted' }, t.done ? '✓ done' : ''),
    h(
      'div',
      { class: 'meta small muted' },
      t.dueDate !== undefined && h('span', {}, `due ${formatDate(t.dueDate)}`),
      ...t.tags.map((g) => h('span', { class: 'tag' }, `#${g}`)),
    ),
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function refresh(): Promise<void> {
  try {
    status(statusEl, 'Loading…');
    [items, synced] = await Promise.all([todos.list(), settings.load()]);
    render();
    status(statusEl, `${items.length} TODOs`, 'info');
  } catch (e) {
    status(statusEl, errorMessage(e), 'error');
  }
}

function report(verb: string, r: BulkResult): void {
  if (r.failed.length === 0) {
    status(statusEl, `${verb} ${r.ok.length} item(s).`, 'ok');
    return;
  }
  const codes = [...new Set(r.failed.map((f) => f.code))].join(', ');
  const hint = codes.includes('CONFLICT') ? ' Someone changed these elsewhere; reloaded the latest.' : '';
  status(statusEl, `${verb} ${r.ok.length}, failed ${r.failed.length} (${codes}).${hint}`, 'error');
}

async function run(verb: string, op: () => Promise<BulkResult>): Promise<void> {
  status(statusEl, `${verb}…`);
  try {
    const r = await op();
    selected.clear();
    await refresh();
    report(verb, r);
  } catch (e) {
    status(statusEl, errorMessage(e), 'error');
  }
}

function apply(targets: Todo[], changes: TodoChanges | ((t: Todo) => TodoChanges), verb: string): Promise<void> {
  return run(verb, () =>
    todos.update(targets.map((todo) => ({ todo, changes: typeof changes === 'function' ? changes(todo) : changes }))),
  );
}

function selectedTodos(): Todo[] {
  return items.filter((t) => selected.has(t.id));
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

document.querySelector('.bulk-bar')!.addEventListener('click', (e) => {
  const action = (e.target as HTMLElement).closest<HTMLElement>('[data-action]')?.dataset.action;
  const targets = selectedTodos();
  if (!action || targets.length === 0) return;
  const tag = normalizeTags([$<HTMLInputElement>('#bulk-tag').value])[0];

  switch (action) {
    case 'done':
      return void apply(targets.filter((t) => !t.done), { done: true }, 'Completed');
    case 'open':
      return void apply(targets.filter((t) => t.done), { done: false }, 'Reopened');
    case 'clear-due':
      return void apply(targets.filter((t) => t.dueDate !== undefined), { dueDate: undefined }, 'Cleared due date on');
    case 'add-tag':
      if (!tag) return status(statusEl, 'Type a tag first.', 'error');
      return void apply(targets.filter((t) => !t.tags.includes(tag)), (t) => ({ tags: [...t.tags, tag] }), `Tagged #${tag}`);
    case 'remove-tag':
      if (!tag) return status(statusEl, 'Type a tag first.', 'error');
      return void apply(targets.filter((t) => t.tags.includes(tag)), (t) => ({ tags: t.tags.filter((g) => g !== tag) }), `Untagged #${tag}`);
    case 'delete':
      if (prefs?.confirmBulkDelete !== false && !confirm(`Delete ${targets.length} TODO(s) from iCloud? This cannot be undone.`)) return;
      return void run('Deleted', () => todos.remove(targets));
  }
});

$<HTMLSelectElement>('#bulk-priority').addEventListener('change', (e) => {
  const sel = e.target as HTMLSelectElement;
  if (sel.value === '') return;
  const priority = Number(sel.value) as Priority;
  sel.value = '';
  void apply(selectedTodos().filter((t) => t.priority !== priority), { priority }, `Set ${PRIORITY_LABELS[priority]} priority on`);
});

$<HTMLInputElement>('#bulk-due').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const dueDate = fromDateInput(input.value);
  input.value = '';
  if (dueDate !== undefined) void apply(selectedTodos(), { dueDate }, `Set due ${formatDate(dueDate)} on`);
});

$<HTMLInputElement>('#select-all').addEventListener('change', (e) => {
  selected.clear();
  if ((e.target as HTMLInputElement).checked) for (const t of filtered()) selected.add(t.id);
  render();
});

$('#search').addEventListener('input', render);
$('#status-filter').addEventListener('change', render);
$('#reload').addEventListener('click', () => void refresh());

$('#bulk-add-btn').addEventListener('click', () => {
  const area = $<HTMLTextAreaElement>('#bulk-add');
  const inputs = parseBulkAdd(area.value, synced.defaultPriority);
  if (inputs.length === 0) return status(statusEl, 'Nothing to add.', 'error');
  area.value = '';
  void run('Added', () => todos.create(inputs));
});

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

$('#export').addEventListener('click', () => {
  const data = items.map(({ title, notes, done, priority, dueDate, tags }) => ({ title, notes, done, priority, dueDate, tags }));
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  h('a', { href: url, download: `todos-${new Date().toISOString().slice(0, 10)}.json` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$<HTMLInputElement>('#import').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    const raw: unknown = JSON.parse(await file.text());
    if (!Array.isArray(raw)) throw new Error('Expected a JSON array of TODOs');
    const inputs: TodoInput[] = raw
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null && typeof r.title === 'string' && r.title.trim() !== '')
      .map((r) => ({
        title: String(r.title).slice(0, 500),
        notes: typeof r.notes === 'string' ? r.notes : '',
        done: r.done === true,
        priority: ([0, 1, 2, 3].includes(Number(r.priority)) ? Number(r.priority) : 0) as Priority,
        ...(typeof r.dueDate === 'number' ? { dueDate: r.dueDate } : {}),
        tags: Array.isArray(r.tags) ? normalizeTags(r.tags.filter((g): g is string => typeof g === 'string')) : [],
      }));
    if (inputs.length === 0) throw new Error('No valid TODOs in file');
    await run('Imported', () => todos.create(inputs));
  } catch (err) {
    status(statusEl, errorMessage(err), 'error');
  }
});

// ---------------------------------------------------------------------------
// Auth / startup
// ---------------------------------------------------------------------------

$('#sign-in').addEventListener('click', () => {
  status(statusEl, 'Opening Apple sign-in…');
  void send({ type: 'auth/signIn' }).then((r) => {
    if (!r.ok) status(statusEl, r.error, 'error');
  });
});

async function showAuth(s: AuthState): Promise<void> {
  const missing = missingConfig();
  if (missing.length) {
    const notice = $('#config-missing');
    notice.hidden = false;
    notice.textContent = `This build is not configured. Set ${missing.join(', ')} in .env.local and rebuild.`;
    return;
  }
  $('#sign-in').hidden = s.signedIn;
  $('#signed-out').hidden = s.signedIn;
  $('#main').hidden = !s.signedIn;
  $('#who').textContent = s.signedIn ? displayName(s.user) : '';
  if (s.signedIn) await refresh();
}

void loadDevicePrefs().then((p) => {
  prefs = p;
  applyTheme(p.theme);
});
onDevicePrefsChanged((p) => {
  prefs = p;
  applyTheme(p.theme);
});
void getAuthState().then(showAuth);
onAuthChanged((s) => void showAuth(s));
