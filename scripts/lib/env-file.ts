// Pure helpers for the dotenv-style .env.local file. No I/O, so tests can use them.

const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

/** Parses KEY=VALUE lines. Skips blanks and comments and strips one pair of surrounding quotes. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(#|$)/.test(line)) continue;
    const m = LINE.exec(line);
    if (!m) continue;
    let val = m[2]!.trim();
    if (val.length >= 2 && (val[0] === '"' || val[0] === "'") && val.at(-1) === val[0]) {
      val = val.slice(1, -1);
    }
    out[m[1]!] = val;
  }
  return out;
}

/** Returns the file text with KEY set to VALUE: replaces existing lines for KEY or appends one. */
export function setEnvLine(text: string, key: string, value: string): string {
  const lines = text.split(/\r?\n/).filter((l) => LINE.exec(l)?.[1] !== key);
  while (lines.length && lines.at(-1) === '') lines.pop();
  lines.push(`${key}=${value}`);
  return `${lines.join('\n')}\n`;
}
