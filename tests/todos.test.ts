import { describe, expect, it } from 'vitest';
import { parseBulkAdd, parseQuickAdd } from '../src/lib/quickadd';
import { recordToSettings } from '../src/lib/settings';
import { normalizeTags, recordToTodo, sortTodos, todoToFields, type Todo } from '../src/lib/todos';

describe('record mapping', () => {
  it('maps a CloudKit record to a Todo', () => {
    const t = recordToTodo({
      recordName: 'id1',
      recordType: 'Todo',
      recordChangeTag: 'tag1',
      fields: {
        title: { type: 'STRING', value: 'Buy milk' },
        done: { type: 'INT64', value: 1 },
        priority: { type: 'INT64', value: 9 },
        tags: { type: 'STRING_LIST', value: ['errands'] },
        dueDate: { type: 'TIMESTAMP', value: 1000 },
      },
      created: { timestamp: 5 },
    });
    expect(t).toMatchObject({ id: 'id1', title: 'Buy milk', done: true, priority: 3, tags: ['errands'], dueDate: 1000, changeTag: 'tag1', createdAt: 5 });
  });

  it('defaults missing fields', () => {
    const t = recordToTodo({ recordName: 'x', recordType: 'Todo', fields: {} });
    expect(t).toMatchObject({ title: '', notes: '', done: false, priority: 0, tags: [] });
    expect('dueDate' in t).toBe(false);
  });

  it('only emits the fields that changed', () => {
    expect(todoToFields({ done: true })).toEqual({ done: { type: 'INT64', value: 1 } });
  });

  it('clears dueDate with null', () => {
    expect(todoToFields({ dueDate: undefined })).toEqual({ dueDate: { type: 'TIMESTAMP', value: null } });
  });

  it('normalizes tags', () => {
    expect(normalizeTags([' #Work', 'work', '', 'Home '])).toEqual(['work', 'home']);
  });
});

describe('sortTodos', () => {
  const mk = (id: string, p: Partial<Todo>): Todo => ({ id, title: id, notes: '', done: false, priority: 0, tags: [], ...p });
  it('puts open items first, then by priority', () => {
    const out = sortTodos([mk('a', { priority: 1 }), mk('b', { done: true, priority: 3 }), mk('c', { priority: 3 })], 'priority');
    expect(out.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });
  it('sorts undated items last by due date', () => {
    const out = sortTodos([mk('a', {}), mk('b', { dueDate: 2 }), mk('c', { dueDate: 1 })], 'dueDate');
    expect(out.map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('quick add', () => {
  it('parses tags, priority and due date', () => {
    const t = parseQuickAdd('Book flights #Travel !high due:2026-12-01 #work');
    expect(t).toMatchObject({ title: 'Book flights', tags: ['travel', 'work'], priority: 3 });
    expect(new Date(t!.dueDate!).getDate()).toBe(1);
  });
  it('uses the default priority and keeps unknown tokens in the title', () => {
    expect(parseQuickAdd('Fix #1 bug !urgent', 2)).toMatchObject({ title: 'Fix bug !urgent', tags: ['1'], priority: 2 });
  });
  it('ignores empty lines in bulk add', () => {
    expect(parseBulkAdd('a\n\n  \nb #x').map((t) => t.title)).toEqual(['a', 'b']);
  });
  it('rejects lines that are only metadata', () => {
    expect(parseQuickAdd('#tag !high')).toBeUndefined();
  });
});

describe('settings mapping', () => {
  it('falls back to defaults for bad values', () => {
    expect(
      recordToSettings({ recordName: 'user-settings', recordType: 'Settings', fields: { sortBy: { type: 'STRING', value: 'bogus' }, defaultPriority: { type: 'INT64', value: 7 } } }),
    ).toEqual({ defaultPriority: 0, showCompleted: true, sortBy: 'created' });
  });
});
