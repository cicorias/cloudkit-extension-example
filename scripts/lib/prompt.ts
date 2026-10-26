import { createInterface } from 'node:readline/promises';

/** Asks a question on the terminal and returns the trimmed answer. */
export async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Reads a line from the terminal without echoing it (for tokens). Requires a TTY. */
export function askSecret(question: string): Promise<string> {
  const { stdin, stderr } = process;
  stderr.write(question);
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  return new Promise((resolve) => {
    let value = '';
    const finish = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stderr.write('\n');
    };
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          finish();
          resolve(value.trim());
          return;
        }
        if (ch === '\u0003') {
          finish();
          process.exit(130); // Ctrl-C
        }
        value = ch === '\u007f' || ch === '\b' ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.on('data', onData);
  });
}
