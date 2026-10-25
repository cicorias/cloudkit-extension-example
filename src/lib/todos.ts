/**
 * TODO domain model and its mapping to the CloudKit `Todo` record type.
 * Keep in sync with cloudkit/schema.ckdb.
 */
import type { CloudKitClient } from './cloudkit/client';
import type { CKRecord, Fields, RecordOperation, RecordResult } from './cloudkit/types';
import { isRecordError } from './cloudkit/types';

export const TODO_RECORD_TYPE = 'Todo';

export type Priority = 0 | 1 | 2 | 3;
export const PRIORITY_LABELS: Record<Priority, string> = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' };

export interface Todo {
  id: string;
  title: string;
  notes: string;
  done: boolean;
  priority: Priority;
  dueDate?: number;
  tags: string[];
  changeTag?: string;
  createdAt?: number;
  modifiedAt?: number;
}

export type TodoInput = Pick<Todo, 'title'> & Partial<Omit<Todo, 'id' | 'changeTag' | 'createdAt' | 'modifiedAt'>>;
export type TodoChanges = Partial<Pick<Todo, 'title' | 'notes' | 'done' | 'priority' | 'dueDate' | 'tags'>>;

export type SortBy = 'created' | 'priority' | 'dueDate' | 'title';

export interface BulkResult {
  ok: Todo[];
  failed: { id?: string; code: string; reason?: string }[];
}

function clampPriority(n: unknown): Priority {
  const v = typeof n === 'number' ? Math.round(n) : 0;
  return (v < 0 ? 0 : v > 3 ? 3 : v) as Priority;
}

export function recordToTodo(r: CKRecord): Todo {
  const f = r.fields;
  const str = (k: string) => (f[k]?.value as string | undefined) ?? '';
  const due = f.dueDate?.value as number | undefined;
  return {
    id: r.recordName,
    title: str('title'),
    notes: str('notes'),
    done: (f.done?.value as number | undefined) === 1,
    priority: clampPriority(f.priority?.value),
    ...(typeof due === 'number' ? { dueDate: due } : {}),
    tags: Array.isArray(f.tags?.value) ? (f.tags.value as string[]) : [],
    changeTag: r.recordChangeTag,
    createdAt: r.created?.timestamp,
    modifiedAt: r.modified?.timestamp,
  };
}

/**
 * Converts changes to CloudKit fields. Only keys present in `changes` are sent,
 * so an `update` touches just those fields. `dueDate: undefined` clears it.
 */
export function todoToFields(changes: TodoChanges): Fields {
  const fields: Fields = {};
  if (changes.title !== undefined) fields.title = { type: 'STRING', value: changes.title.trim() };
  if (changes.notes !== undefined) fields.notes = { type: 'STRING', value: changes.notes };
  if (changes.done !== undefined) fields.done = { type: 'INT64', value: changes.done ? 1 : 0 };
  if (changes.priority !== undefined) fields.priority = { type: 'INT64', value: changes.priority };
  if ('dueDate' in changes) {
    // A null value removes the field on the server.
    fields.dueDate = { type: 'TIMESTAMP', value: changes.dueDate ?? null };
  }
  if (changes.tags !== undefined) fields.tags = { type: 'STRING_LIST', value: normalizeTags(changes.tags) };
  return fields;
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
}

export function sortTodos(todos: Todo[], sortBy: SortBy): Todo[] {
  const byCreated = (a: Todo, b: Todo) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
  const cmp: Record<SortBy, (a: Todo, b: Todo) => number> = {
    created: byCreated,
    priority: (a, b) => b.priority - a.priority || byCreated(a, b),
    dueDate: (a, b) => (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) || byCreated(a, b),
    title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  };
  // Open items first, then the chosen order.
  return [...todos].sort((a, b) => Number(a.done) - Number(b.done) || cmp[sortBy](a, b));
}

function collect(results: RecordResult[], ids: (string | undefined)[]): BulkResult {
  const out: BulkResult = { ok: [], failed: [] };
  results.forEach((r, i) => {
    if (isRecordError(r)) out.failed.push({ id: r.recordName ?? ids[i], code: r.serverErrorCode, reason: r.reason });
    else if (!r.deleted && r.recordType === TODO_RECORD_TYPE) out.ok.push(recordToTodo(r));
    else out.ok.push({ id: r.recordName } as Todo);
  });
  return out;
}

/** CRUD over the user's private database. All writes are bulk-capable. */
export class TodoRepository {
  constructor(private readonly client: CloudKitClient) {}

  async list(): Promise<Todo[]> {
    // Server-side sorting needs SORTABLE indexes; sort locally to keep the schema small.
    const records = await this.client.query({ recordType: TODO_RECORD_TYPE });
    return records.map(recordToTodo);
  }

  async create(inputs: TodoInput[]): Promise<BulkResult> {
    const ops: RecordOperation[] = inputs.map((t) => ({
      operationType: 'create',
      record: {
        recordType: TODO_RECORD_TYPE,
        // Client-generated names make retries idempotent (a retry gets a conflict, not a duplicate).
        recordName: crypto.randomUUID(),
        fields: todoToFields({ done: false, priority: 0, tags: [], notes: '', ...t }),
      },
    }));
    return collect(await this.client.modify(ops), ops.map((o) => o.record.recordName));
  }

  /**
   * Updates with optimistic concurrency: the change tag must match the server's,
   * otherwise that record fails with CONFLICT and the caller should reload.
   */
  async update(items: { todo: Todo; changes: TodoChanges }[]): Promise<BulkResult> {
    const ops: RecordOperation[] = items.map(({ todo, changes }) => ({
      operationType: 'update',
      record: {
        recordType: TODO_RECORD_TYPE,
        recordName: todo.id,
        recordChangeTag: todo.changeTag,
        fields: todoToFields(changes),
      },
    }));
    return collect(await this.client.modify(ops), items.map((i) => i.todo.id));
  }

  async remove(todos: Todo[]): Promise<BulkResult> {
    const ops: RecordOperation[] = todos.map((t) => ({
      operationType: 'forceDelete',
      record: { recordName: t.id },
    }));
    return collect(await this.client.modify(ops), todos.map((t) => t.id));
  }
}
