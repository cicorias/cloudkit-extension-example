/**
 * Quick-add syntax, shared by the popup input and the side panel's bulk add:
 *   Buy milk #errands !high due:2026-11-01
 *   #tag            add a tag (repeatable)
 *   !low|!med|!high or !1..!3   priority
 *   due:YYYY-MM-DD  due date (local midnight)
 */
import type { Priority, TodoInput } from './todos';
import { normalizeTags } from './todos';

const PRIORITY_WORDS: Record<string, Priority> = { low: 1, med: 2, medium: 2, high: 3, '1': 1, '2': 2, '3': 3 };

export function parseQuickAdd(line: string, defaultPriority: Priority = 0): TodoInput | undefined {
  const tags: string[] = [];
  let priority: Priority = defaultPriority;
  let dueDate: number | undefined;

  const words = line.trim().split(/\s+/).filter((w) => {
    if (/^#[\p{L}\p{N}_-]+$/u.test(w)) {
      tags.push(w.slice(1));
      return false;
    }
    const p = /^!(\w+)$/.exec(w);
    if (p && PRIORITY_WORDS[p[1]!.toLowerCase()] !== undefined) {
      priority = PRIORITY_WORDS[p[1]!.toLowerCase()]!;
      return false;
    }
    const d = /^due:(\d{4})-(\d{2})-(\d{2})$/.exec(w);
    if (d) {
      const date = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]));
      if (!Number.isNaN(date.getTime())) {
        dueDate = date.getTime();
        return false;
      }
    }
    return true;
  });

  const title = words.join(' ').trim();
  if (!title) return undefined;
  return { title, tags: normalizeTags(tags), priority, ...(dueDate !== undefined ? { dueDate } : {}) };
}

/** One TODO per non-empty line. */
export function parseBulkAdd(text: string, defaultPriority: Priority = 0): TodoInput[] {
  return text
    .split(/\r?\n/)
    .map((l) => parseQuickAdd(l, defaultPriority))
    .filter((t): t is TodoInput => t !== undefined);
}
